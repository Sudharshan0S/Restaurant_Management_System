# Indian Restaurant Management System

React + Vite website, Express API, MongoDB. Customers browse a page-turning menu book, order from a cart under the book and reserve tables.
The **admin** has a separate login and a dashboard to see reservations (with customer emails) and manage orders.

**The menu lives in the website, not the database.** It is read from `frontend/src/data/menu.js`, so it displays even when the backend or MongoDB is switched off.
MongoDB stores only: **accounts** (register / sign in / sign out), **orders** and **reservations**.

- [Run it on your laptop](#1-run-on-your-laptop-works-offline)
- [Logins](#2-logins)
- [Using the admin dashboard](#3-admin-dashboard)
- [Menu book controls](#4-menu-book)
- [Deploy to Vercel / Render / GitHub](#5-deploy)
- [Environment variables](#6-environment-variables)
- [Tests](#7-tests) · [How it is built](#8-how-it-works) · [Troubleshooting](#9-troubleshooting)

---

## 1. Run on your laptop (works offline)

You need **Node.js 22 LTS** (https://nodejs.org) and **MongoDB Community** running locally (default `mongodb://127.0.0.1:27017`).
The first `npm install` needs internet. After that everything runs **without internet**: fonts and icons are bundled, the database is local.
(Only email/SMS confirmations need internet, and only if you configure them.)

```bash
# terminal 1 - API
cd backend
npm install
npm start                     # http://localhost:5000  (creates the menu and the admin account on first start)

# terminal 2 - website
cd frontend
npm install
npm run dev                   # http://localhost:5173
```
Open **http://localhost:5173**. `backend/config.env` is included with local defaults, so nothing else is needed.

## 2. Logins

| | Page | Credentials |
|---|---|---|
| **Customer** | `/login` (register at `/register`) | create your own account |
| **Admin** | `/admin/login` | **email `admin@gmail.com`, password `admin123`** (local default) |

The two logins are separate: the admin account is refused on the customer page and customer accounts are refused on the admin page.
Customers can never open the dashboard, and the server checks the role on every admin request.

> **Before you put the site online:** `admin123` is a weak password. On a public deployment set `ADMIN_EMAIL` and `ADMIN_PASSWORD`
> yourself (you can use the same values, but a strong password is strongly recommended). In production there is **no default admin**:
> if those two variables are missing, no admin account is created. Changing `ADMIN_PASSWORD` later and restarting updates the password.

## 3. Admin dashboard

`/admin/login` → **Dashboard**.

- **Reservations** - every booking with date, time, table, guests, **name, email, phone**, special request and status; search and cancel. Only the admin can see this; customers see only their own bookings.
- **Orders** - every order with customer details; change the status (PLACED → CONFIRMED → PREPARING → READY → COMPLETED / CANCELLED).

There is no menu editor: the menu is a file in the website (see next section). Admin pages need the backend; the public menu does not.

## 3b. Changing the menu

1. Edit **`frontend/src/data/menu.js`** (`CATEGORIES`, `DISHES`, `COMBOS`). Put photos in `frontend/public/` and set `image` to the **exact** file name (spaces, capitals, underscores and brackets all work).
   Pages, category titles, counts and the cart update automatically. Keep existing dish `id`s unchanged.
2. Run **`npm run sync-menu`** in the project root. This copies the file to `backend/data/menu.js`, which the server uses **only to re-check prices when an order is placed** (prices sent by the browser are never trusted).
   `npm test` in the backend fails if the two files ever differ, so they cannot silently drift apart.
3. Redeploy the website (and the API, if you changed prices).

## 4. Menu book

- Every page is fixed (no scrolling inside a page). The number of dishes per page is calculated from the page height, so pages are filled;
  extra dishes continue on the next page, which repeats the category title (e.g. *Desserts 2/2*).
- **Turn pages with:** mouse wheel up/down, touchpad scroll (vertical or two-finger horizontal), dragging the book with the mouse, swiping on a phone/tablet
  (right-to-left = next, left-to-right = back), or the **← / →** keys.
- The wheel only turns pages while the book is on screen, and at the first/last page it hands scrolling back to the website. Move the pointer off the book to scroll the site.
- Under the book is the **cart**: change quantities and combos, then **Confirm order** right there (no need to go to a last page).
- "Pairs well with…" hints come from the combo definitions in the menu file. They are not based on order history.

## 5. Deploy

You need a free **MongoDB Atlas** database first (Vercel and Render cannot reach the MongoDB on your laptop):
1. https://www.mongodb.com/atlas → create a free cluster.
2. *Database Access* → add a user (username + password).
3. *Network Access* → **Allow access from anywhere** (`0.0.0.0/0`) because Vercel/Render IP addresses change.
4. *Connect → Drivers* → copy the connection string and put the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/Restaurant?retryWrites=true&w=majority`

Push the project to GitHub (`config.env` and `node_modules` are already in `.gitignore`, so no secrets are uploaded).

### Vercel (two projects from the same repo)

**API** - *Add New → Project* → pick the repo → **Root Directory: `backend`** → Framework preset *Other* → add environment variables → Deploy.
`MONGO_URI`, `JWT_SECRET` (long random text), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, optionally `RESTAURANT_NAME`, `EMAIL_*`. Note its address, e.g. `https://my-api.vercel.app`.

**Website** - *Add New → Project* → same repo → **Root Directory: `frontend`** → Framework preset *Vite* → environment variable
`VITE_API_URL = https://my-api.vercel.app` (no trailing slash) → Deploy.

Finally (optional but recommended) add `FRONTEND_URL = https://your-website.vercel.app` to the API project and redeploy it, so only your website can call the API.

### Render

Easiest: **New + → Blueprint** → select the repo. `render.yaml` creates both services; enter `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_URL`
(your static site address) and `VITE_API_URL` (your API address) when asked. The free API instance sleeps after inactivity, so the first request can take ~30-60 seconds.

Manual setup: Web Service → root `backend`, build `npm ci`, start `npm start`. Static Site → root `frontend`, build `npm ci --include=dev && npm run build`, publish `dist`,
add a rewrite `/*` → `/index.html`.

### Notes
- Login uses a token sent in the `Authorization` header (not cookies), so the website and API can live on different domains without browser cookie blocking.
- Photos and built files are cached for fast repeat visits; the API responses are gzip-compressed; admin and rarely used pages are loaded on demand.
- The public menu needs no API at all, so it keeps working even if the API is asleep (Render free) or down.
- This project was verified locally (tests, production build, browser tests against a MongoDB-compatible server). It was not run on the Vercel/Render platforms themselves.

## 6. Environment variables

**Backend** (`backend/config.env` locally, or the host's dashboard):

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string (**required**) |
| `JWT_SECRET` | **Required.** Long random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account. Local fallback `admin@gmail.com` / `admin123`; **required in production** |
| `FRONTEND_URL` | Your website address(es), comma separated. Empty = allow any origin |
| `PORT` | Local port (hosts set it for you) |
| `RESTAURANT_NAME` | Name used in emails/SMS |
| `EMAIL_HOST` `EMAIL_PORT` `EMAIL_USER` `EMAIL_PASSWORD` `EMAIL_FROM` (`EMAIL_SECURE`) | Any SMTP provider (Gmail app password, Brevo, Mailtrap). Blank = email disabled |
| `SMS_PROVIDER=twilio` `TWILIO_ACCOUNT_SID` `TWILIO_AUTH_TOKEN` `TWILIO_FROM` `SMS_DEFAULT_COUNTRY_CODE` | Optional SMS |

**Frontend** (`frontend/.env`, build-time): `VITE_API_URL` (empty locally), `VITE_RESTAURANT_NAME`.

**Email/SMS need an outside provider.** Without one, bookings and orders are still saved and the popup says
*"Email service is not configured on this server, so no email was sent."* It never claims a message was sent unless the provider accepted it.

## 7. Tests

```bash
npm --prefix backend test       # 26 tests (the database tests run if MongoDB is reachable, else they are skipped)
npm --prefix frontend test      # 21 unit tests (menu data, image file names, local recommendations, pagination, utils)
npm --prefix frontend run lint
npm --prefix frontend run build
```
The database tests use a separate database called `Restaurant_test` (dropped before and after), never your real data. Set `TEST_MONGO_URI` to use another server.
They cover both logins and role checks, server-side pricing, idempotent orders, reservations (validation, double-booking, privacy), admin-only access to customer emails,
that the database contains no menu data, and that the server's price list matches the website's menu.

## 8. How it works

- **Menu** is `frontend/src/data/menu.js`, loaded directly by the website (no request). The database has three collections only: `users`, `orders`, `reservations`.
- **Orders**: the browser sends only `{menuId, qty, comboId}`; prices and totals are recomputed on the server. Repeat submits are ignored (idempotent `requestId`).
- **Recommendations**: the website shows the predefined pairings from the menu file ("Pairs well with"). The API still has `GET /api/orders/recommendations`, which counts which items appear together in stored orders; the website does not use it.
- **Reservations**: 20 tables, hourly slots 9:00-21:00 or "reserve now" for one hour; past dates, bad phone/email/guests and overlapping bookings are rejected.
- **Security**: bcrypt password hashes, signed tokens (12 h for admin, 7 days for customers), roles checked from the database, rate-limited logins, server-side price checks on every order,
  no stack traces or database errors shown to users.

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `MongoDB connection failed` | Start MongoDB, or fix `MONGO_URI`. On Atlas check the user/password and Network Access. |
| `JWT_SECRET is missing` | Put a long random value in `backend/config.env` (or the host's variables). |
| Admin login says invalid | Local: `admin@gmail.com` / `admin123`. Production: you must set `ADMIN_EMAIL` and `ADMIN_PASSWORD` and redeploy. |
| Menu shows but login/orders fail after deploy ("Cannot reach the server") | `VITE_API_URL` is missing or wrong (rebuild the website after changing it), or the API has no `MONGO_URI`. |
| Order says an item is "not on the menu" | `backend/data/menu.js` is out of date: run `npm run sync-menu` and redeploy the API. |
| Browser shows a CORS error | Set the API's `FRONTEND_URL` to exactly your website address, or leave it empty. |
| `npm install` complains about the Node version | Install Node 22 LTS (`.nvmrc` says 22). |
