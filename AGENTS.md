# AGENTS.md — Estación Café

## Arquitectura
- **Frontend**: React + Vite SPA (`index.html`, `src/`). No router: `App.tsx` renders the customer menu; `Admin.tsx` is shown when the footer "Admin" button is clicked or the URL hash is `#admin`.
- **Backend**: a single Netlify Server (`netlify/server/index.ts`, Hono) scoped to `/api/*` via `export const config`. Don't add a full-stack framework or a catch-all `/*` rewrite — it would shadow the server.
- **Data**: Netlify Database (Postgres) via Drizzle (`db/schema.ts`, `db/index.ts`). Migrations live in `netlify/database/migrations/` and are generated with `npx drizzle-kit generate --name <snake_case>`; never apply them manually and never edit applied ones.

## Key files
- `src/menu.ts` — official menu, sizes, extras, prices in **céntimos**. Shared by client and server; the server recalculates every total from it (never trust client prices).
- `src/Admin.tsx` — login, live queue (polls every 5 s, rings `src/chime.ts` Web Audio doorbell on new IDs), calendar/report.
- `src/time.ts` — Peru is fixed UTC−5; day/month grouping uses these helpers, not the browser's timezone.
- `src/config.ts` — Yape/Plin phone shown on confirmation (empty by default) and the logo URL.
- `public/img/logo-estacion.png` — transparent black line-art extracted from the client's logo; used as the tilted 7 % collage watermark (`body::before` in `src/styles.css`).

## API
- `POST /api/orders` — public; body `{ customerName, paymentMethod: "yape"|"plin", items: [{ id, size, extras: [extraId], qty }] }`.
- `GET /api/admin/session`, `GET /api/admin/orders?status=&from=&to=`, `PATCH /api/admin/orders/:id { status }` — require header `x-admin-password` (env `ADMIN_PASSWORD`, fallback `admin123`).

## Conventions
- UI copy in Spanish (es-PE). Prices formatted with `soles()`.
- Images: Unsplash photos go through `/.netlify/images` (`photoUrl()`); `images.unsplash.com` is allow-listed in `netlify.toml`.
- Order status values: `pendiente` | `pagado` (shown as "Pagado / Entregado"). Revenue sums only `pagado`.
