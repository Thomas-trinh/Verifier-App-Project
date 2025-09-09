# Verifier App

A Next.js single-page application with authentication, an address verifier form, and Elasticsearch logging.

## 🚀 Features Implemented

### Requirement 1 – Authentication
- User registration and login (with password hashing via bcrypt).
- Session management using JWT stored in HTTP-only cookies.
- Credentials stored in Elasticsearch (`users` index).
- Middleware-protected routes (users must log in before accessing `/verifier`).
- Logout endpoint and UI integration.

### Requirement 2 – Verification Form
- Next.js App Router form for postcode, suburb, and state.
- Client-side validation using **Zod**.
- Server-side validation via GraphQL API proxy (`/api/graphql`).
- Form result displayed as success/failure.

### Requirement 3 – State Persistence
- Form state persisted with **Zustand + localStorage**.
- Data remains after closing/reopening the browser.
- Verification attempts logged into Elasticsearch (`verifications` index) with:
  - username
  - postcode, suburb, state
  - success/failure
  - error message (if any)
  - timestamp
---

## 🛠 Tech Stack

- **Next.js 15 (App Router)**
- **React 19**
- **TypeScript**
- **Apollo Server** (`@apollo/server` + `@as-integrations/next`) for GraphQL proxy
- **Apollo Client v3** (with legacy peer deps override)
- **Elasticsearch 8.x**
- **Zustand** (state persistence)
- **Zod** (form validation)
- **Docker Compose** (dev environment)

---

## 📂 Project Structure

```

project-root/
│── .env.local
│── docker-compose.dev.yml
│── Dockerfile.dev
│── package.json
│── tsconfig.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verifier/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── register/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── me/route.ts
│   │       ├── verify/route.ts
│   │       └── graphql/route.ts
│   │
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── NavbarWrapper.tsx
│   │   ├── VerifierForm.tsx
│   │   └── QueryProvider.tsx (if using React Query)
│   │
│   ├── lib/
│   │   ├── elasticsearch.ts
│   │   ├── auth.ts
│   │   ├── session.ts
│   │   ├── apollo-client.ts
│   │   └── validation.ts
│   │
│   ├── store/
│   │   ├── formStore.ts
│   │   └── userStore.ts
│   │
│   └── styles/
│       ├── globals.css
│       └── auth.css

````

---

## ⚡ Running the App

### 1. Environment Variables (`.env.local`)
```ini
ELASTICSEARCH_NODE=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
JWT_SECRET=your_secret
SESSION_COOKIE_NAME=verifier_session
````

### 2. Start Dev Environment

```bash
docker compose -f docker-compose.dev.yml up --build
```

* Next.js dev server → [http://localhost:3000](http://localhost:3000)
* Elasticsearch → [http://localhost:9200](http://localhost:9200)

### 3. Verify Elasticsearch

List indices:

```bash
curl "http://localhost:9200/_cat/indices?v"
```

Check users:

```bash
curl "http://localhost:9200/users/_search?pretty"
```

Check verifications:

```bash
curl "http://localhost:9200/verifications/_search?pretty"
```
