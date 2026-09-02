# Digital Restaurant Menu & Online Ordering

Multi-tenant digital menu, QR table ordering, and online payment (Zarinpal) platform.

> This README is filled in progressively as the project is built. See `docker-compose.yml` for the full stack (Postgres + Django/DRF backend + Angular frontend).

## Stack

- **Backend**: Python, Django, Django REST Framework, PostgreSQL, SimpleJWT, drf-spectacular, pytest
- **Frontend**: Angular, TypeScript, Angular Material, SCSS, RxJS, PWA
- **Payments**: Zarinpal
- **Infra**: Docker, Docker Compose, GitHub Actions

## Project layout

```
restaurant-menu/
├── backend/          # Django project (DRF API)
├── frontend/          # Angular app (customer menu + restaurant dashboard)
├── docker-compose.yml
├── .env.example
└── README.md
```

Full installation, environment variable reference, API docs, and Zarinpal setup instructions are added at the end of the build — see the final section of this README once the project is complete.
