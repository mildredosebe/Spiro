# Ozzie Backend (Django + DRF)

Backend API for authentication, catalog, cart, and orders.

## Stack
- Django 4.2
- Django REST Framework
- Simple JWT
- django-cors-headers
- PostgreSQL (via Docker)

## Setup
1. Make sure you have a `.env` file in `./backend` (see `.env.example` if available) with at least `DATABASE_URL`, `REDIS_URL`, and `SECRET_KEY` set.

2. Build and start all services:

   docker compose up -d --build

3. Migrations run automatically on container start (`RUN_MIGRATIONS=true`), but you can also run them manually:

   docker compose exec backend python manage.py makemigrations
   docker compose exec backend python manage.py migrate

4. View logs:

   docker compose logs -f backend

5. Stop services:

   docker compose down

## API Base URL
- https://api.mildred.co.ke/api/

## API Documentation
Once the server is running, you can access the interactive API documentation at:
- **Scalar UI:** https://api.mildred.co.ke/api/docs/
- **Redoc:** https://api.mildred.co.ke/api/redoc/
- **Raw OpenAPI Schema:** https://api.mildred.co.ke/api/schema/

## Auth Endpoints
- POST auth/register/
- POST auth/login/
- POST auth/google/
- POST auth/token/refresh/
- GET auth/me/ (Bearer token required)

## Google Auth Setup
Set this environment variable in `./backend/.env` before starting the containers:

`GOOGLE_OAUTH_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`

The frontend `VITE_GOOGLE_CLIENT_ID` and backend `GOOGLE_OAUTH_CLIENT_ID` should be the same Google OAuth Web Client ID.

## Catalog Endpoints
- GET catalog/categories/
- GET catalog/products/
- GET catalog/products/?category=vehicle
- GET catalog/products/?search=m1v1

Admin users can also POST/PATCH/DELETE categories and products.

## Cart Endpoints (Authenticated)
- GET cart/
- POST cart/items/
  - body: { "product_id": 1, "quantity": 2 }
- DELETE cart/items/{item_id}/

## Orders Endpoints (Authenticated)
- GET orders/
- GET orders/{id}/
- POST orders/
- POST orders/{id}/process-payment/

Example create order body:
{
  "payment_method": "card",
  "shipping_full_name": "Jane Doe",
  "shipping_phone": "+254700000000",
  "shipping_address": "123 Moi Avenue",
  "shipping_city": "Nairobi",
  "shipping_postal_code": "00100",
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 2, "quantity": 1 }
  ]
}

## Notes
- Current auth uses JWT, including Google sign-in through `auth/google/`.
- All secrets and DB credentials are managed via `./backend/.env` — never commit this file.