# Verifier App

A Next.js single-page application with authentication, an address verifier form (postcode/suburb/state), and Elasticsearch logging.  
Includes a bonus feature: Google Maps integration to display verified addresses.

---

## 🚀 Features Implemented

### Requirement 1 – Authentication
- User registration and login with password hashing (**bcrypt**).
- Session management using **JWT** stored in HTTP-only cookies.
- Credentials stored in **Elasticsearch** (`users` index).
- Middleware-protected routes → must log in before accessing `/verifier`.
- Logout endpoint + UI integration.

### Requirement 2 – Verification Form
- Next.js App Router form for **postcode, suburb, and state**.
- Client-side validation using **Zod**.
- Server-side validation via **GraphQL proxy** (`/api/graphql`) that calls the **Australia Post API**.
- Displays success/failure result to user.

### Requirement 3 – State Persistence
- Form state persisted with **Zustand + localStorage**.
- Data restored even after browser reload or reopen.

### Requirement 4 – GraphQL Proxy
- Apollo Server (`@apollo/server` + `@as-integrations/next`) running in `/api/graphql`.
- Queries Australia Post API (`/postcode/search.json`) with API key.
- Normalizes inconsistent API response (array vs object).

### Requirement 5 – Session-aware Validation
- GraphQL resolver requires a logged-in user session.
- If no session → returns 401 Unauthorized.
- Every validation attempt is tied to the logged-in username.

### Requirement 6 – Logging Verification Attempts
Every attempt is stored into Elasticsearch (`verifications` index) with:
- `username`
- `postcode`, `suburb`, `state`
- `success/failure`
- `message` or `error`
- `lat/lng` (if available)
- `createdAt` timestamp

### Bonus – Google Maps Integration
- When validation is successful, the app displays a Google Map centered on the verified location.
- Implemented with [`@react-google-maps/api`](https://github.com/JustFly1984/react-google-maps-api).
- Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## 🛠 Tech Stack

- **Next.js 15 (App Router)**
- **React 19**
- **TypeScript**
- **Apollo Server** & **Apollo Client v3**
- **Elasticsearch 8.x**
- **Zustand** (state persistence)
- **Zod** (form validation)
- **Docker Compose** (development environment)
- **Google Maps JavaScript API** (`@react-google-maps/api`)

## ⚙️ Environment Variables

`.env` (for development):

```ini
# Server
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Verifier

# JWT / Session
JWT_SECRET=super-long-random-string
SESSION_COOKIE_NAME=verifier_session

# Elasticsearch
ELASTICSEARCH_NODE=https://your-elastic-cloud.es.ap-southeast-1.aws.elastic.cloud:443
ELASTICSEARCH_API_KEY=your_api_key
ELASTICSEARCH_USERS_INDEX=firstname-lastname-users
ELASTICSEARCH_VERIF_INDEX=firstname-lastname-logs

# Australia Post API
AUSPOST_BASE_URL=https://.../postcode/search.json
AUSPOST_BEARER=your-auspost-token

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
````

---

## Running with Docker

### Build & Run (Dev)

```bash
docker compose -f docker-compose.dev.yml up --build
```

* Next.js app → [http://localhost:3000](http://localhost:3000)
* Elasticsearch → [http://localhost:9200](http://localhost:9200)

---


## 🌐 Testing on UI

1. Open [http://localhost:3000](http://localhost:3000).
2. Register a new user, then log in.
3. Navigate to `/verifier`.
4. Enter a valid address (postcode, suburb, state).

   * Example: `3004 / MELBOURNE / VIC`
   * If valid → success message + Google Map with marker.
   * If invalid → error message.
5. Logs automatically stored in Elasticsearch.