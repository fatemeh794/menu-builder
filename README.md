# Digital Restaurant Menu & Online Ordering

A multi-tenant digital menu, QR table ordering, and online payment (Zarinpal) platform.
Each restaurant manages its own menu, tables, and orders; customers order by scanning a
table's QR code — no account, no login. Built as a demo-ready, presentation-quality
full-stack project.

**Stack**: Django + DRF + PostgreSQL (backend) · Angular + Material (frontend) · Zarinpal
(payments) · Docker Compose · GitHub Actions.

## Customer flow

```
Scan table QR
  → Browse restaurant's menu (search, categories)
  → Pick a dish → customize options (bread, sauce, size, ...) → add to cart
  → Checkout (name, phone, note) — no account needed
  → Pay via Zarinpal
  → Track order status live
```

## Architecture

**Multi-tenancy**: shared database / shared schema. Every tenant-scoped model carries a
`restaurant` foreign key, and a `TenantScopedViewSet` mixin + `IsRestaurantMember` /
`IsRestaurantOwnerOrManager` DRF permission classes resolve the restaurant from the URL
and scope every query to it — a staff member can never see or write another restaurant's
data. This boundary has explicit pytest coverage (`apps/restaurants/tests/test_tenant_isolation.py`
and equivalents in `menu`, `tables`, `orders`).

**Auth**: staff/owners authenticate with JWT (`djangorestframework-simplejwt`), tied to a
`RestaurantMembership` with a role (`OWNER` / `MANAGER` / `STAFF`). Customers are always
guests — no account, ever. Each `Order` gets an unguessable `secure_order_token`
(`secrets.token_urlsafe(32)`) so a guest can track their own order without logging in, and
each `Table` gets its own `secure_token` used in the QR-code URL
(`/menu/{restaurant-slug}/table/{secure-token}`).

**Money**: every price is an integer Toman, computed and stored server-side. The API
never trusts a client-supplied amount — `Order.total_amount` and `Payment.amount` are
always recomputed from the DB (`apps/orders/services.py`, `apps/payments/services.py`),
so a tampered request can't change what gets charged.

**Payments**: a `PaymentGateway` abstract base class (`create_payment`, `verify_payment`)
with a `ZarinpalPaymentGateway` implementation, so a second gateway could be added later
without touching any call site. See [Zarinpal setup](#zarinpal-setup) below.

### Data model

```
User ── RestaurantMembership ── Restaurant ── Category ── MenuItem ── MenuItemOptionGroup ── MenuItemOption
                                     │                         │
                                   Table                   OrderItem ── OrderItemOption
                                     │                         │
                                   Order ─────────────────────┘
                                     │
                                  Payment
```

### API surface (`/api/v1/`, documented live at `/api/docs/`)

| Area | Public (guest) | Staff (JWT) |
|---|---|---|
| Restaurant | `GET menu/{slug}/` | `GET dashboard/restaurants/`, `dashboard/{slug}/settings/` |
| Menu | `GET menu/{slug}/categories/`, `menu/{slug}/items/?search=&category=` | `dashboard/{slug}/categories/`, `.../items/`, `.../items/{id}/option-groups/` |
| Tables | `GET tables/{slug}/{token}/` | `dashboard/{slug}/tables/`, `.../tables/{id}/qr-code/` |
| Orders | `POST orders/`, `GET orders/track/{token}/` | `dashboard/{slug}/orders/` (list/retrieve/status update) |
| Payments | `POST payments/{order_token}/create/`, `GET payments/callback/` | — |
| Staff | — | `dashboard/{slug}/staff/` |
| Auth | — | `auth/token/`, `auth/token/refresh/` |

## Project layout

```
menu-builder/
├── backend/                 Django + DRF API
│   ├── apps/
│   │   ├── core/             tenant-scoping mixin/permissions, pagination, exceptions
│   │   ├── accounts/          JWT auth endpoints
│   │   ├── restaurants/       Restaurant, RestaurantMembership, settings/staff API, demo seed
│   │   ├── menu/               Category, MenuItem, MenuItemOptionGroup/Option
│   │   ├── tables/             Table, QR code generation
│   │   ├── orders/             Order, OrderItem, server-side pricing service
│   │   └── payments/           Payment, PaymentGateway + ZarinpalPaymentGateway
│   └── config/settings/       base / dev / prod / test
├── frontend/                 Angular app
│   └── src/app/
│       ├── core/               interceptors, guards, auth/theme/translation services
│       ├── shared/              pipes, skeleton/empty/error-state components
│       └── features/
│           ├── customer-menu/   the premium guest ordering UI (menu, cart, checkout, tracking)
│           ├── dashboard/       staff admin panel
│           └── auth/            staff login
├── .github/workflows/        CI (backend, frontend)
├── docker-compose.yml
└── .env.example
```

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

That's it — this brings up Postgres, the Django API, and the Angular app, and the
backend seeds a demo restaurant on first boot (see [Demo data](#demo-data) below).

- Customer menu: http://localhost:8080/menu/golden-fork/table/&lt;see backend logs for the token&gt;
- Staff dashboard: http://localhost:8080/staff/login
- API docs: http://localhost:8000/api/docs/
- Django admin: http://localhost:8000/admin/

The frontend container's nginx proxies `/api/`, `/admin/`, `/static/`, and `/media/` to
the backend, so the browser only ever talks to port 8080.

## Manual setup (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt

cp ../.env.example ../.env    # then point POSTGRES_HOST at your local Postgres
python manage.py migrate
python manage.py seed_demo    # optional, for demo data
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm start                     # serves on http://localhost:4200, talks to :8000
```

## Environment variables

All read from `.env` (see `.env.example` for the full annotated list). Never commit a
real `.env` — it's git-ignored, and CI/Docker only ever see `.env.example`'s placeholders
or CI-injected secrets.

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Django's cryptographic signing key — generate a real one for anything beyond local dev |
| `DJANGO_DEBUG` | `True` locally, always `False` in any shared/production environment |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated hostnames Django will serve |
| `DJANGO_SETTINGS_MODULE` | Which settings module `manage.py` loads locally (Docker always pins `config.settings.prod` itself) |
| `DJANGO_SECURE_SSL_REDIRECT` | Only set `True` once behind real HTTPS termination |
| `POSTGRES_*` | Database connection |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API (the Angular dev server / deployed frontend) |
| `FRONTEND_BASE_URL` | Used to build the QR code's customer URL and the Zarinpal callback redirect target |
| `JWT_ACCESS_TOKEN_LIFETIME_MIN` / `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Staff session lifetime |
| `ZARINPAL_MERCHANT_ID` | Your Zarinpal merchant id (sandbox default works out of the box) |
| `ZARINPAL_SANDBOX` | `True` → `sandbox.zarinpal.com`, `False` → `payment.zarinpal.com` |
| `ZARINPAL_CALLBACK_URL` | Where Zarinpal redirects after payment — must be reachable from Zarinpal's servers in production |
| `SEED_DEMO_DATA` | Backend container seeds the demo restaurant on every start when `true` |

## Zarinpal setup

The integration lives behind a small abstraction so it's provider-agnostic at the call
site:

```python
class PaymentGateway(ABC):
    def create_payment(self, payment) -> str: ...      # returns redirect URL
    def verify_payment(self, authority, status) -> tuple[bool, str, str]: ...
```

`ZarinpalPaymentGateway` (`backend/apps/payments/gateways/zarinpal.py`) implements this
against Zarinpal's REST API v4, with `currency: "IRT"` on every request so the Toman
amounts stored throughout the app never need a Rial conversion anywhere else in the
codebase.

**To test without a real Zarinpal account**: leave `ZARINPAL_SANDBOX=True` and the
placeholder merchant id from `.env.example` — Zarinpal's sandbox accepts requests from
any merchant id shape and lets you drive a full payment through
`sandbox.zarinpal.com` without a real account or real money. This was verified
end-to-end during development (order → payment request → Zarinpal's sandbox payment
page correctly showing the Rial-equivalent of the Toman cart total).

**To go live**: register at zarinpal.com, get a real merchant id, set
`ZARINPAL_MERCHANT_ID` to it, set `ZARINPAL_SANDBOX=False`, and set
`ZARINPAL_CALLBACK_URL` to a URL Zarinpal's servers can reach (your real deployed
domain, not `localhost`).

**Flow**: `POST /api/v1/payments/{order_token}/create/` recomputes the order's total
from its stored line items, creates a `Payment` row, asks Zarinpal for an authority code,
and returns a redirect URL. Zarinpal redirects the customer back to
`GET /api/v1/payments/callback/?Authority=...&Status=OK|NOK`, which verifies the payment,
settles the `Payment` and `Order` (idempotently — replaying the callback for an
already-verified payment is a no-op), and redirects the browser to
`{FRONTEND_BASE_URL}/orders/{token}/result?status=success|failed`.

## Demo data

`python manage.py seed_demo` (run automatically by the backend container on every start,
unless `SEED_DEMO_DATA=false`) creates:

- Restaurant **Golden Fork** (`golden-fork`), themed in red/navy
- 5 categories, 8 menu items — two with option groups (bread type, sauce; pizza size)
- 6 tables, each with a real QR-ready `secure_token`
- An owner login: **`owner` / `DemoPass123!`**

It's idempotent — safe to re-run, it will never duplicate data.

## Testing

```bash
# Backend — 50+ tests, ~96% coverage of apps/
cd backend && pytest --cov=apps --cov-report=term-missing

# Frontend — unit tests
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless

# Frontend — lint / production build
cd frontend && npx ng lint && npx ng build --configuration production
```

Backend coverage includes: multi-tenant isolation (a restaurant's staff can never reach
another restaurant's data), guest ordering and server-side pricing correctness (required/
single/multiple option-group rules, quantity, a tampered client price being ignored),
the Zarinpal gateway with its HTTP calls mocked (success, rejection, network failure,
idempotent callback replay), JWT auth, staff onboarding, and one end-to-end test walking
the full guest journey (QR scan → browse → order → pay → callback → track → staff status
update).

The payment flow was additionally verified by hand against Zarinpal's real sandbox API
(not just mocks) during development — see the [Zarinpal setup](#zarinpal-setup) section.

## CI/CD

Three workflows under `.github/workflows/`, all green on `main`:

- **`backend.yml`** *(path-scoped to `backend/**`)* — ruff + black --check, a Django
  system check / migrate / demo-seed run against a real Postgres service container (not
  just sqlite — this proves migrations apply cleanly to the actual target database
  engine), the pytest suite, and `collectstatic` as a build check.
- **`frontend.yml`** *(path-scoped to `frontend/**`)* — ESLint, Prettier format check,
  unit tests (headless Chrome), and a production build.
- **`docker-build.yml`** *(every push/PR)* — builds both the backend and frontend Docker
  images and validates `docker-compose.yml` with `docker compose config`.

## Security notes

- Secrets live only in `.env` (git-ignored) — nothing real is committed; `.env.example`
  holds placeholders only.
- Every payable amount is recomputed server-side from stored `OrderItem`/`Payment` rows;
  the client can never dictate a price.
- `Order.secure_order_token` and `Table.secure_token` are generated with
  `secrets.token_urlsafe` (not sequential IDs), so guest order-tracking and QR URLs can't
  be guessed or enumerated.
- Every dashboard endpoint is scoped by `IsRestaurantMember`/`IsRestaurantOwnerOrManager`
  — a JWT alone isn't enough to read or write another restaurant's data.
- The Zarinpal QR-code image endpoint requires the same JWT as every other dashboard
  call, so the frontend fetches it as an authenticated blob rather than linking it
  directly (a plain `<img src>` can't carry an `Authorization` header).
