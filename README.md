# Verifier App

A Next.js single-page application with authentication, an address verifier form (postcode/suburb/state), and Elasticsearch logging.
Includes a bonus feature: Google Maps integration to display verified addresses.

**Live (Vercel):** [https://verifier-app-project.vercel.app/](https://verifier-app-project.vercel.app/)

---

## 🚀 Features

### 1) Authentication

* User registration and login with password hashing (**bcrypt**).
* Session management using **JWT** stored in HTTP-only cookies.
* Credentials stored in **Elasticsearch** (`users` index).
* Middleware-protected routes → must log in before accessing `/verifier`.
* Logout endpoint + UI integration.

### 2) Verification Form

* Next.js App Router form for **postcode, suburb, and state**.
* Client-side validation using **Zod**.
* Server-side validation via a **GraphQL proxy** (`/api/graphql`) that calls the **Australia Post API**.
* Displays success/failure result to user.

### 3) State Persistence

* Form state persisted with **Zustand + localStorage**.
* Data restored even after browser reload or reopen.

### 4) GraphQL Proxy

* Apollo Server (`@apollo/server` + `@as-integrations/next`) running in `/api/graphql`.
* Queries Australia Post API (`/postcode/search.json`) with API key.
* Normalizes inconsistent API responses (array vs object).

### 5) Session-aware Validation

* GraphQL resolver requires a logged-in user session.
* If no session → returns **401 Unauthorized**.
* Every validation attempt is tied to the logged-in username.

### 6) Logging Verification Attempts

Every attempt is stored into Elasticsearch (`verifications` index) with:

* `username`
* `postcode`, `suburb`, `state`
* `success/failure`
* `message` or `error`
* `lat/lng` (if available)
* `createdAt` timestamp

### Bonus – Google Maps Integration

* When validation succeeds, the app displays a Google Map centered on the verified location.
* Implemented with [`@react-google-maps/api`](https://github.com/JustFly1984/react-google-maps-api).
* Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## 🛠 Tech Stack

* **Next.js 15 (App Router)**
* **React 19**
* **TypeScript**
* **Apollo Server** & **Apollo Client v3**
* **Elasticsearch 8.x**
* **Zustand** (state persistence)
* **Zod** (form validation)
* **Docker Compose** (development environment)
* **Google Maps JavaScript API** (`@react-google-maps/api`)
* **jose** (JWT verification in middleware)

---

## 🔐 Auth & Middleware Notes

* Middleware uses **`jose`** to verify JWT (HS256) and enforces:

  * `/verifier/*` requires a valid session.
  * Visiting `/login` while already authenticated redirects to `/verifier`.
* Make sure your middleware matcher catches **both** `/login` and `/login/`:

  ```ts
  export const config = { matcher: ['/verifier/:path*', '/login/:path*'] };
  ```
* Ensure the login API sets the cookie with proper flags so middleware can see it on all routes:

  ```ts
  res.cookies.set({
    name: process.env.SESSION_COOKIE_NAME!,
    value: jwtToken,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // e.g., 7 days
  });
  ```

---

## ⚙️ Environment Variables

Create `.env.local` for local development (or `.env` for Docker):

```ini
# Server
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Verifier

# JWT / Session
JWT_SECRET=super-long-random-string
SESSION_COOKIE_NAME=verifier_session

# Elasticsearch (Elastic Cloud recommended)
ELASTICSEARCH_NODE=https://your-elastic-cloud.es.ap-southeast-1.aws.elastic.cloud:443
ELASTICSEARCH_API_KEY=your_api_key
ELASTICSEARCH_USERS_INDEX=firstname-lastname-users
ELASTICSEARCH_VERIF_INDEX=firstname-lastname-logs

# Australia Post API
AUSPOST_BASE_URL=https://.../postcode/search.json
AUSPOST_BEARER=your-auspost-token

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

> Notes
> • `JWT_SECRET` must be the same for both API signing and middleware verification.
> • `SESSION_COOKIE_NAME` must match on both client-facing API and middleware.
> • For Elastic Cloud, `ELASTICSEARCH_NODE` + `ELASTICSEARCH_API_KEY` are sufficient.

---

## 🧭 Getting Started

### 1) Prerequisites

* **Node.js 20+** (LTS recommended)
* **pnpm** (recommended) or **npm**
* **Elasticsearch 8.x** (Elastic Cloud or Docker)
* **Australia Post API** credentials
* (Optional) **Google Maps** API key for the bonus feature

### 2) Clone & Install

```bash
# Clone
git clone https://github.com/Thomas-trinh/Verifier-App-Project.git
cd <your-repo>

# Install dependencies (choose one)
pnpm install
# or
npm ci
```

### 3) Configure Environment

Create `.env.local` and fill in all variables (see **Environment Variables**).

### 4) Run (Local Dev)

```bash
# Start Next.js dev server
pnpm dev
# or
npm run dev
```

* App: [http://localhost:3000](http://localhost:3000)
* Register at **/register**, then login at **/login**.
* The app will **auto-create indices** on first use if they don’t exist.

### 5) Production Build (Local)

```bash
pnpm build && pnpm start
# or
npm run build && npm start
```

---

## 🐳 Running with Docker

### Build & Run (Dev)

```bash
docker compose -f docker-compose.dev.yml up --build
```

* Next.js app → [http://localhost:3000](http://localhost:3000)
* Elasticsearch → [http://localhost:9200](http://localhost:9200)

> Alternatively, to run a local single-node Elasticsearch quickly:
>
> ```bash
> docker run -p 9200:9200 -e "discovery.type=single-node" \
>   -e "xpack.security.enabled=false" \
>   -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
>   docker.elastic.co/elasticsearch/elasticsearch:8.14.0
> ```
>
> Then set:
>
> ```
> ELASTICSEARCH_NODE=http://localhost:9200
> # ELASTICSEARCH_API_KEY not required if security is disabled
> ```

---

## 🌐 UI Walkthrough

1. Open [http://localhost:3000](http://localhost:3000)
2. Register a new user, then log in.
3. Navigate to `/verifier`.
4. Enter a valid address (postcode, suburb, state).

   * Example: `3004 / MELBOURNE / VIC`
   * If valid → success message + Google Map with marker.
   * If invalid → error message.
5. All attempts are logged into Elasticsearch.

---

## 🧪 Testing & Quality

```bash
# Unit/Integration tests (Vitest)
pnpm test
# or
npm test

# Lint
pnpm lint
# or
npm run lint
```

---

## 🚢 Deploy (Vercel)

1. Push your repo to GitHub/GitLab/Bitbucket.
2. Import the project into **Vercel**.
3. Add all **Environment Variables** under the **Production** environment.
4. Default Next.js settings are fine:

   * Build Command: `next build`
   * Output Directory: (managed by Vercel)
5. Deploy. Verify:

   * `/register` → can create users
   * `/login` → sets session cookie
   * `/verifier` → accessible only when logged in
   * `/api/graphql` → returns 401 when not logged in

---

## 🧯 Troubleshooting

* **503 from `/api/auth/*` or `/api/logs`**
  Misconfigured `ELASTICSEARCH_NODE` / `ELASTICSEARCH_API_KEY`, cluster not reachable, or IP not allowed.

* **401 from `/api/graphql`**
  Not logged in. Login first (HTTP-only cookie must be present).

* **Login page doesn’t redirect when already logged in**
  Ensure middleware matcher:

  ```ts
  export const config = { matcher: ['/verifier/:path*', '/login/:path*'] };
  ```

  Also confirm cookie flags: `path:'/'`, `sameSite:'lax'`, `secure:true` (on prod).

* **Navbar shows wrong state on `/login`**
  Treat `/login` as a logged-out view and avoid fetching `/api/auth/me` on that route to prevent UI flash.

* **Google Map not showing**
  Missing or invalid `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or billing not enabled.

* **ESLint errors on Vercel build**
  Fix the reported lint errors locally, or adjust lint config if necessary.

---

## 📚 API Overview (quick)

* `POST /api/auth/register` – create a user (`bcrypt` hash → `users` index)
* `POST /api/auth/login` – returns a JWT via HTTP-only cookie
* `POST /api/auth/logout` – clears the session cookie
* `GET  /api/auth/me` – returns current username (if logged in)
* `POST /api/graphql` – `validateAddress` resolver; logs attempts into `verifications`
* `GET  /api/logs` – (optional) fetch verification logs for the logged-in user