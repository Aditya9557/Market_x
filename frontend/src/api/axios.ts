import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://market-x-2.onrender.com/api',
});

// ── Request interceptor: attach access token ────────────────────────────────
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

// ── Response interceptor: auto-refresh on 401 ──────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token!);
        }
    });
    failedQueue = [];
};

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh for 401 errors, and not on auth endpoints themselves
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/signup') &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            const refreshToken = localStorage.getItem('refreshToken');

            // No refresh token available — just reject (components handle their own auth state)
            if (!refreshToken) {
                return Promise.reject(error);
            }

            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return API(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(
                    `${originalRequest.baseURL || API.defaults.baseURL}/auth/refresh`,
                    { refreshToken }
                );

                const newAccessToken = data.token;
                const newRefreshToken = data.refreshToken;

                // Store updated tokens
                localStorage.setItem('token', newAccessToken);
                if (newRefreshToken) {
                    localStorage.setItem('refreshToken', newRefreshToken);
                }

                // Update user data if returned
                if (data.user) {
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        try {
                            const user = JSON.parse(storedUser);
                            const updatedUser = { ...user, ...data.user, token: newAccessToken };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                        } catch {
                            // ignore parse errors
                        }
                    }
                }

                // Retry original request + queued requests
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                processQueue(null, newAccessToken);
                return API(originalRequest);
            } catch (refreshError) {
                // Refresh failed — force logout
                processQueue(refreshError, null);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default API;
