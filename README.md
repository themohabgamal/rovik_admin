# Rovik Admin

Next.js admin dashboard for the Rovik monitor light-bar storefront (Supabase-backed).

## Setup

1. Copy env vars:

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in this app. Admin writes use the anon key + authenticated session (RLS must allow authenticated users).

2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

## Create an admin user

1. In the [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter email + password (enable "Auto Confirm User" if available).
4. Sign in at `/admin/login` with that email and password.

Only authenticated users can access `/admin/*` (middleware + layout checks).

## Storage

Product images upload to the public `product-images` bucket at:

`product-images/{product-slug}/{filename}`

Ensure the bucket exists and authenticated users can upload; public read is fine for storefront URLs.

## Routes

| Path | Purpose |
|------|---------|
| `/admin` | Dashboard counts + recent waitlist |
| `/admin/categories` | Categories CRUD |
| `/admin/products` | Products list / filters |
| `/admin/products/new` | Create product |
| `/admin/products/[id]` | Edit product |
| `/admin/waitlist` | Waitlist + CSV export |
| `/admin/settings` | `site_settings` id=`main` |
| `/admin/login` | Email/password auth |

## Storefront mapping

`src/lib/mappers/product.ts` maps DB snake_case rows to the storefront `Product` shape (`ratingDisplay`, `colorOptions`, `inTheBox`, `story`, etc.).
