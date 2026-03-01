/**
 * UniHeart Load Test — k6 script
 * 
 * Simulates real-world concurrent load:
 *   • 200 concurrent login attempts
 *   • 100 concurrent checkouts
 *   • 50 hero order accepts
 * 
 * Install k6: https://k6.io/docs/get-started/installation/
 * Run: k6 run load-test.js
 * Run with output: k6 run --out json=results.json load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Trend, Rate } from 'k6/metrics';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const loginErrors = new Counter('login_errors');
const checkoutErrors = new Counter('checkout_errors');
const heroAcceptErrors = new Counter('hero_accept_errors');
const checkoutDuration = new Trend('checkout_duration', true);
const loginDuration = new Trend('login_duration', true);
const heroAcceptDuration = new Trend('hero_accept_duration', true);
const successRate = new Rate('request_success_rate');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// ─── Test Stages ──────────────────────────────────────────────────────────────
export const options = {
    scenarios: {
        // Scenario 1: 200 concurrent login attempts (15s ramp-up, 30s sustain)
        concurrent_logins: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '15s', target: 200 },
                { duration: '30s', target: 200 },
                { duration: '10s', target: 0 },
            ],
            gracefulRampDown: '10s',
            tags: { scenario: 'logins' },
        },

        // Scenario 2: 100 concurrent checkouts (start after logins ramp up)
        concurrent_checkouts: {
            executor: 'ramping-vus',
            startVUs: 0,
            startTime: '20s',  // offset so we don't spike everything at once
            stages: [
                { duration: '10s', target: 100 },
                { duration: '30s', target: 100 },
                { duration: '10s', target: 0 },
            ],
            gracefulRampDown: '10s',
            tags: { scenario: 'checkouts' },
        },

        // Scenario 3: 50 hero accepts (start offset)
        hero_accepts: {
            executor: 'ramping-vus',
            startVUs: 0,
            startTime: '25s',
            stages: [
                { duration: '10s', target: 50 },
                { duration: '30s', target: 50 },
                { duration: '10s', target: 0 },
            ],
            gracefulRampDown: '10s',
            tags: { scenario: 'hero_accepts' },
        },
    },

    thresholds: {
        // Overall
        'http_req_duration': ['p(95)<2000', 'p(99)<5000'],    // 95% under 2s, 99% under 5s
        'http_req_failed': ['rate<0.05'],                       // < 5% failure rate
        'request_success_rate': ['rate>0.95'],

        // Per scenario
        'login_duration': ['p(95)<1000'],               // login should be fast
        'checkout_duration': ['p(95)<3000'],             // checkout can take longer
        'hero_accept_duration': ['p(95)<1500'],

        // Error counts — these alert but don't fail the test
        'login_errors': ['count<20'],
        'checkout_errors': ['count<10'],
        'hero_accept_errors': ['count<5'],
    },
};

// ─── Shared Test Data ─────────────────────────────────────────────────────────
// Pre-seeded test accounts for concurrent login simulation
const STUDENT_EMAIL = 'loadtest@test.com';
const STUDENT_PASSWORD = 'TestPass123!';
const HERO_TOKEN = __ENV.HERO_TOKEN || ''; // pre-authenticated hero JWT

// ─── Scenario Functions ───────────────────────────────────────────────────────

export default function () {
    const scenario = __ENV.K6_SCENARIO_NAME || exec.scenario.name;

    switch (scenario) {
        case 'concurrent_logins':
            loginScenario();
            break;
        case 'concurrent_checkouts':
            checkoutScenario();
            break;
        case 'hero_accepts':
            heroAcceptScenario();
            break;
        default:
            loginScenario();
    }
}

function loginScenario() {
    group('Login Flow', () => {
        const start = Date.now();
        const res = http.post(
            `${BASE_URL}/api/auth/login`,
            JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
            { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
        );

        loginDuration.add(Date.now() - start);

        const ok = check(res, {
            'login: status 200': (r) => r.status === 200,
            'login: has token': (r) => {
                try { return !!JSON.parse(r.body as string).accessToken; } catch { return false; }
            },
        });

        successRate.add(ok);
        if (!ok) loginErrors.add(1);

        sleep(Math.random() * 2 + 0.5); // 0.5–2.5s think time
    });
}

function checkoutScenario() {
    group('Checkout Flow', () => {
        // Step 1: Login
        const loginRes = http.post(
            `${BASE_URL}/api/auth/login`,
            JSON.stringify({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD }),
            { headers: { 'Content-Type': 'application/json' }, tags: { name: 'checkout_login' } }
        );

        let token = '';
        try { token = JSON.parse(loginRes.body as string).accessToken; } catch { /* continue */ }
        if (!token) { checkoutErrors.add(1); return; }

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        // Step 2: Browse products
        const productsRes = http.get(`${BASE_URL}/api/products?page=1&limit=12`, { headers: authHeaders });
        check(productsRes, { 'products: status 200': (r) => r.status === 200 });

        let productId = '';
        try {
            const products = JSON.parse(productsRes.body as string).products;
            if (products && products.length > 0) productId = products[0]._id;
        } catch { /* continue */ }

        if (!productId) { checkoutErrors.add(1); return; }

        // Step 3: Add to cart
        const addCartRes = http.post(
            `${BASE_URL}/api/cart/add`,
            JSON.stringify({ productId, quantity: 1 }),
            { headers: authHeaders, tags: { name: 'add_to_cart' } }
        );
        check(addCartRes, { 'add cart: status 200': (r) => r.status === 200 });

        // Step 4: Create checkout session
        const start = Date.now();
        const checkoutRes = http.post(
            `${BASE_URL}/api/payments/create-checkout`,
            JSON.stringify({ deliveryAddress: { street: '123 Campus Rd', city: 'Test City', pinCode: '110001' } }),
            { headers: authHeaders, tags: { name: 'create_checkout' } }
        );
        checkoutDuration.add(Date.now() - start);

        const ok = check(checkoutRes, {
            'checkout: status 200 or 201': (r) => r.status === 200 || r.status === 201,
            'checkout: has session': (r) => {
                try { return !!JSON.parse(r.body as string).sessionId || !!JSON.parse(r.body as string).clientSecret; }
                catch { return false; }
            },
        });

        successRate.add(ok);
        if (!ok) checkoutErrors.add(1);

        sleep(Math.random() * 3 + 1); // 1–4s think time
    });
}

function heroAcceptScenario() {
    group('Hero Accept Flow', () => {
        if (!HERO_TOKEN) { heroAcceptErrors.add(1); return; }

        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HERO_TOKEN}`,
        };

        // Fetch available orders
        const ordersRes = http.get(`${BASE_URL}/api/hero/available-orders`, { headers: authHeaders });
        const ok1 = check(ordersRes, { 'available orders: 200': (r) => r.status === 200 });
        successRate.add(ok1);

        let orderId = '';
        try {
            const orders = JSON.parse(ordersRes.body as string);
            if (orders && orders.length > 0) orderId = orders[0]._id;
        } catch { /* continue */ }

        if (!orderId) { sleep(2); return; } // No orders available — normal

        // Accept an order
        const start = Date.now();
        const acceptRes = http.post(
            `${BASE_URL}/api/hero/accept/${orderId}`,
            JSON.stringify({}),
            { headers: authHeaders, tags: { name: 'hero_accept' } }
        );
        heroAcceptDuration.add(Date.now() - start);

        const ok2 = check(acceptRes, {
            'hero accept: 200 or 409': (r) => r.status === 200 || r.status === 409, // 409 = someone else got it
        });
        successRate.add(ok2);
        if (!ok2) heroAcceptErrors.add(1);

        sleep(Math.random() * 1.5 + 0.5);
    });
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

export function setup() {
    console.log(`🚀 UniHeart Load Test — Target: ${BASE_URL}`);
    const res = http.get(`${BASE_URL}/api/health`);
    if (res.status !== 200) {
        throw new Error(`Health check failed (${res.status}) — is the server running?`);
    }
    console.log('✅ Health check passed — test starting');
}

export function teardown(data: any) {
    console.log('🏁 Load test complete. Check results above.');
}
