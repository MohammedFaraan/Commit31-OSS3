# UniFind — Frontend

UniFind is a university-focused lost & found platform. This is the **frontend** application built with **React 19**, **Vite**, and **Tailwind CSS v4**, featuring a bold neobrutalist design aesthetic.

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | UI library |
| Vite | 7.3 | Build tool & dev server |
| Tailwind CSS | 4.2 (via `@tailwindcss/vite`) | Utility-first styling |
| React Router | 7.13 | Client-side routing |
| Axios | 1.13 | HTTP client (centralized API layer) |
| Space Mono | — | Primary font (Google Fonts) |

## Project Structure

```
frontend/
├── public/                  # Static assets
├── src/
│   ├── api/
│   │   └── client.js        # Centralized Axios API client
│   ├── assets/              # Images & media
│   ├── components/
│   │   ├── AppLayout.jsx    # Layout wrapper (Navbar + Outlet + Footer)
│   │   ├── Navbar.jsx       # Nav with auth-aware conditional rendering
│   │   ├── Hero.jsx         # Landing hero section
│   │   ├── About.jsx        # About section
│   │   ├── Works.jsx        # "How It Works" section
│   │   ├── CTA.jsx          # Call-to-action section
│   │   └── Footer.jsx       # Footer
│   ├── context/
│   │   ├── AuthContext.jsx  # Auth provider (user, token, login, logout)
│   │   └── useAuth.jsx      # Custom hook to consume AuthContext
│   ├── pages/
│   │   ├── Home.jsx         # Landing page (Hero + About + Works + CTA)
│   │   ├── Login.jsx        # Login form
│   │   └── Register.jsx     # Registration form
│   ├── App.jsx              # Route definitions
│   ├── main.jsx             # Entry point (AuthProvider wraps App)
│   └── index.css            # Global styles & custom cursor
├── .env                     # Environment variables (not committed)
├── Dockerfile               # Docker containerization
├── vite.config.js           # Vite + React SWC + Tailwind plugin config
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** (comes with Node.js)
- Backend server running (see backend README)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
```

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ Yes | Base URL of the backend API server. The app will throw an error on startup if this is missing. |

> **Note:** Since this is a Vite project, all environment variables must be prefixed with `VITE_` to be accessible in the browser via `import.meta.env`.

### 3. Start the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

### 4. Build for Production

```bash
npm run build
```

Output will be generated in the `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

### 6. Lint the Code

```bash
npm run lint
```

## Docker

A `Dockerfile` is included for containerized deployment:

```bash
docker build -t unifind-frontend .
docker run -p 5173:5173 unifind-frontend
```

> **Note:** When running in Docker, use the `--host` flag (already configured in the Dockerfile) to expose the dev server outside the container.

## Routes

| Path | Page | Description |
|---|---|---|
| `/` | Home | Landing page with Hero, About, How It Works, and CTA sections |
| `/login` | Login | User login form |
| `/register` | Register | User registration form |

All routes are wrapped in `AppLayout`, which provides the shared Navbar and Footer.

## API Client

The centralized API client (`src/api/client.js`) provides:

- **Automatic token attachment** — reads the JWT from `AuthContext` (or falls back to `localStorage`) and adds `Authorization: Bearer <token>` to every request.
- **Response unwrapping** — returns `response.data` directly so callers get parsed JSON without extra `.data` access.
- **Error normalization** — extracts `error.response.data.message` into a clean `Error` object for consistent error handling.
- **Convenience methods** — `api.get()`, `api.post()`, `api.put()`, `api.delete()`.

### Usage

```js
import api from "../api/client";

// POST request
const result = await api.post("/api/auth/login", { email, password });

// GET request (token attached automatically)
const profile = await api.get("/api/users/profile");
```

## Authentication Flow

1. `AuthProvider` wraps the entire app and manages `user`, `token`, and `isAuthenticated` state.
2. On app load, it restores auth state from `localStorage`.
3. On login/register, the auth state is updated and persisted to `localStorage`.
4. The Navbar conditionally renders Login/Register buttons or the user's name + Logout button based on `isAuthenticated`.
5. On logout, auth state and `localStorage` are cleared.
