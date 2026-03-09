from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

OUTPUT_PATH = "output/pdf/market_x_app_summary.pdf"

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 42
CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

TITLE_SIZE = 20
HEADING_SIZE = 12
BODY_SIZE = 10
LINE_GAP = 2.8
SECTION_GAP = 9


def wrap_text(c, text, font_name, font_size, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if c.stringWidth(trial, font_name, font_size) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, font_name="Helvetica", font_size=BODY_SIZE, max_width=CONTENT_WIDTH):
    c.setFont(font_name, font_size)
    lines = wrap_text(c, text, font_name, font_size, max_width)
    for line in lines:
        c.drawString(x, y, line)
        y -= font_size + LINE_GAP
    return y


def draw_bullets(c, bullets, x, y, bullet_indent=10, max_width=CONTENT_WIDTH):
    for bullet in bullets:
        c.setFont("Helvetica", BODY_SIZE)
        c.drawString(x, y, "-")
        text_x = x + bullet_indent
        text_width = max_width - bullet_indent
        lines = wrap_text(c, bullet, "Helvetica", BODY_SIZE, text_width)
        for i, line in enumerate(lines):
            c.drawString(text_x, y, line)
            if i < len(lines) - 1:
                y -= BODY_SIZE + LINE_GAP
        y -= BODY_SIZE + LINE_GAP
    return y


def draw_heading(c, text, x, y):
    c.setFont("Helvetica-Bold", HEADING_SIZE)
    c.setFillColor(colors.HexColor("#0D2A3A"))
    c.drawString(x, y, text)
    c.setFillColor(colors.black)
    return y - (HEADING_SIZE + 3)


def build_pdf(path):
    c = canvas.Canvas(path, pagesize=letter)

    y = PAGE_HEIGHT - MARGIN

    c.setFont("Helvetica-Bold", TITLE_SIZE)
    c.setFillColor(colors.HexColor("#0B3954"))
    c.drawString(MARGIN, y, "Market_x App Summary")
    c.setFillColor(colors.black)
    y -= TITLE_SIZE + 8

    c.setStrokeColor(colors.HexColor("#D7DEE3"))
    c.setLineWidth(1)
    c.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y -= 12

    y = draw_heading(c, "What It Is", MARGIN, y)
    what_it_is = (
        "Market_x appears to be a campus commerce and delivery platform in a monorepo, with web, "
        "mobile, backend API, and infrastructure code. Evidence comes from role-based app screens, "
        "order/payment models, and deployment assets."
    )
    y = draw_wrapped(c, what_it_is, MARGIN, y)
    y -= SECTION_GAP

    y = draw_heading(c, "Who It Is For", MARGIN, y)
    who_for = (
        "Primary persona: campus students ordering products with live delivery tracking; the repo also "
        "contains dedicated flows for delivery heroes, vendors, and administrators."
    )
    y = draw_wrapped(c, who_for, MARGIN, y)
    y -= SECTION_GAP

    y = draw_heading(c, "What It Does", MARGIN, y)
    feature_bullets = [
        "Student ordering journey: product catalog/detail, cart, checkout, order history, and tracking "
        "(frontend/src/pages/student/*, mobile/lib/screens/student/*).",
        "Delivery hero lifecycle: application/status, available orders, active delivery, and earnings "
        "(HeroApplication*, frontend/src/pages/hero/*, mobile/lib/screens/hero/*).",
        "Vendor operations: product, order, and store management (frontend/src/pages/vendor/*, Store/Product models).",
        "Admin tooling: analytics, audit logs, hero queue, reconciliation, risk dashboards, and campus "
        "configuration (frontend/src/pages/admin/*, backend admin controllers/services).",
        "Payments and wallet capabilities indicated by Razorpay/Stripe integrations and wallet modules "
        "(useRazorpay, paymentController, stripeService, razorpayService, walletService).",
        "Operational safeguards: auth/protected routes, rate limiting, health endpoints, webhook processing, "
        "dispute flows, and backend tests."
    ]
    y = draw_bullets(c, feature_bullets, MARGIN, y)
    y -= 1

    y = draw_heading(c, "How It Works (Repo Evidence)", MARGIN, y)
    architecture_bullets = [
        "Clients: React/Vite web app (frontend/src) and Flutter mobile app (mobile/lib).",
        "API layer: backend/src/server.ts with modular routes -> controllers -> services -> models.",
        "Data/integrations: db and redis config modules plus Stripe, Razorpay, Supabase, and webhook services.",
        "Realtime and jobs: socket server and scripts for analytics worker, migrations, and seeding.",
        "Infrastructure as code: terraform modules for EC2, Redis, CloudWatch, IAM, and S3/CloudFront.",
        "Flow: clients -> backend APIs -> services/models + third-party integrations -> socket/webhook updates.",
        "Database engine, queue technology, and exact auth-token design: Not found in repo."
    ]
    y = draw_bullets(c, architecture_bullets, MARGIN, y)
    y -= 1

    y = draw_heading(c, "How To Run (Minimal)", MARGIN, y)
    run_bullets = [
        "Prerequisites inferred from files: Node.js/npm (backend/frontend/functions), Flutter SDK (mobile), and Terraform CLI (infra).",
        "Install dependencies in backend, frontend, and functions; run Flutter package install in mobile. Exact commands/scripts: Not found in repo.",
        "Configure environment variables. .env files exist, but required key names/values are Not found in repo.",
        "Start backend API, web app, and mobile app using project scripts/tooling. Exact start commands: Not found in repo.",
        "Optional: provision cloud infrastructure from terraform/. Detailed command sequence: Not found in repo."
    ]
    y = draw_bullets(c, run_bullets, MARGIN, y)

    if y < MARGIN:
        raise RuntimeError("Content overflowed the page; adjust layout.")

    c.save()


if __name__ == "__main__":
    build_pdf(OUTPUT_PATH)
    print(OUTPUT_PATH)
