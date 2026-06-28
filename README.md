# E-commerce platform UI design

This is a code bundle for E-commerce platform UI design. The original project is available at https://www.figma.com/design/ixtgylYyuKl0LTt4W2FgLF/E-commerce-platform-UI-design.

The project is split into two directories: `frontend` and `backend`.

## Running the frontend

The frontend runs as part of the Docker Compose stack alongside the backend, database, and Redis.

1. Create a `.env` file in the `frontend` directory and set:

   `VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com`

2. From the project root, build and start everything:

   docker compose up -d --build

3. The frontend will be available at http://localhost (port 80), and the backend API at http://localhost:8002.

## Admin Access

Local development superadmin credentials:
- **Email:** `admin@spironet.com`
- **Password:** `pass@spironet`

> Change these before deploying anywhere beyond local development.

## Rebuild Frontend

If the frontend container is serving a stale build (e.g. after dependency or code changes that aren't being picked up), rebuild it from scratch: