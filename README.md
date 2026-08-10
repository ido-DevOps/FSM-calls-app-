# Solaris FSM

Field Service Management & Inventory app for solar installation/maintenance teams.

## Stack

- **Expo (React Native) + Expo Router** — file-based navigation
- **TypeScript**
- **NativeWind (Tailwind CSS)** — styling
- **Supabase** — Postgres, Auth, Storage, Realtime
- **TanStack Query + Zustand** — server/client state

## Project structure

```
app/
  _layout.tsx              Root layout — QueryClientProvider, auth bootstrap
  (auth)/                  Login, gated to signed-out users
  (tabs)/                  Technician — My Calls, Profile
  warehouse/               Warehouse manager (+ admin) — Inventory, Dispatch, Profile
  admin/                   Admin — Dispatch Overview, New Call, Profile
  calls/[id].tsx            Call details — status actions (assigned technician),
                             read-only photos/replacement history (everyone)
  calls/[id]/scan.tsx       Component swap: select/scan new part, log old part's serial
  calls/[id]/photos.tsx     Mandatory categorized photo upload, with compression
components/                Shared UI (StatusBadge, FilterTabs, ScannerPanel, …)
hooks/                     Auth bootstrap + React Query hooks
lib/supabase.ts            Supabase client
types/database.types.ts    Types mirroring the DB schema
store/                     Zustand stores
supabase/migrations/       SQL migrations
supabase/seed.sql          Sample users, inventory, and calls for local testing
```

### Auth & routing

`app/_layout.tsx` loads the Supabase session and matching `profiles` row once
(`hooks/useAuthListener.ts`) into a Zustand store, then gates rendering until
that resolves. Every route group re-reads that store and redirects — sign-in
itself never navigates, the guards react to the session/role and route
automatically:

| Route group | Signed out | `technician` | `warehouse_manager` | `admin` |
|---|---|---|---|---|
| `(auth)/login` | stays | → `/` | → `/` | → `/` |
| `(tabs)` (`/`) | → `/login` | stays | → `/warehouse` | → `/admin` |
| `warehouse/*` | → `/login` | → `/` | stays | stays |
| `admin/*` | → `/login` | → `/` | → `/warehouse` | stays |
| `calls/*` | → `/login` | stays (if assigned) | stays (read-only) | stays (read-only) |

`calls/[id]/scan` and `calls/[id]/photos` are field-work screens: they're
only linked from the call detail screen when you're the technician the call
is assigned to, and render a "Technician-only" notice if reached directly by
another role.

### Warehouse: inventory & dispatch

- **Inventory** (`warehouse/index.tsx`) lists every component with a status
  filter and serial/model search; `in_warehouse` rows get a one-tap
  **Dispatch** action, `defective_returned` rows get **Receive**.
- **Dispatch** (`warehouse/transfer.tsx`) is a mode-toggle flow (reusing the
  same `ScannerPanel`/`StepDots` components as the technician swap screen):
  - *Dispatch*: pick/scan an `in_warehouse` item → pick a technician → confirm.
    Sets `status = with_technician`, `current_owner_id = <technician>`.
  - *Receive Return*: pick/scan a `defective_returned` item → confirm. Sets
    `status = in_warehouse`, clears `current_owner_id` — closing the loop
    started when a technician logs a swap in `calls/[id]/scan.tsx`.
  - Each confirm resets back to step one instead of navigating away, so a
    warehouse worker can scan through a stack of parts quickly.

### Admin: dispatch dashboard

- **Overview** (`admin/index.tsx`) lists every service call — not just one
  technician's — with status filter tabs and each assigned technician's
  name. It subscribes to Supabase Realtime on `service_calls`
  (`supabase/migrations/20260101030000_*.sql`) so status changes made by
  technicians in the field appear without a manual refresh.
- **New Call** (`admin/new-call.tsx`) creates a `service_calls` row — customer
  name, address, work description, and an optional technician assignment
  (there's no separate customers table yet, so customer details are entered
  directly). Leaving it unassigned is valid; dispatch can happen later from
  the Overview tab.
- Tapping any call opens the shared `calls/[id]` screen, which for
  admin/warehouse shows the full read-only history — every uploaded photo
  (tap to view full-screen) and the component replacement log — instead of
  the technician's action buttons.

### Component swap & photo upload (technician)

- **Scan** (`calls/[id]/scan.tsx`) picks the new part either from the
  technician's own `with_technician` inventory or by scanning its barcode
  (`expo-camera`), then captures the defective part's serial by typing or
  scanning it. Submitting calls the `log_component_replacement` Postgres
  function (`supabase/migrations/20260101010000_*.sql`), which sets the new
  item to `installed`, the old item (if it's a tracked serial) to
  `defective_returned` owned by the technician, and inserts the
  `component_replacements` row — all in one transaction, so a dropped
  connection mid-flow can't leave inventory half-updated.
- **Photos** (`calls/[id]/photos.tsx`) requires a photo in each of the four
  categories. Each capture is resized/compressed client-side
  (`expo-image-manipulator`) before uploading to the `call-photos` Storage
  bucket (`supabase/migrations/20260101020000_*.sql`); in-flight tiles show a
  compressing/uploading state and failed uploads can be retried in place.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project's URL and anon key:
   ```bash
   cp .env.example .env
   ```
3. Apply the database migrations. Against a hosted Supabase project:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   Or, for a fully local stack (requires Docker):
   ```bash
   supabase start
   ```
   which runs every file in `supabase/migrations/` against a local Postgres instance. Either way, migrations must run in filename order (they already sort correctly).
4. Load sample data — 4 test users, inventory, and service calls:
   ```bash
   supabase db reset
   ```
   This re-applies the migrations and then `supabase/seed.sql`. Against a database you don't want reset, run
   `psql "$DATABASE_URL" -f supabase/seed.sql` instead. Test accounts (all share the password `Password123!`):

   | Email | Role |
   |---|---|
   | `technician@solarisfsm.test` | technician — Alex Rivera, 5 calls across every status, 2 components checked out |
   | `technician2@solarisfsm.test` | technician — Jordan Lee, 1 call |
   | `warehouse@solarisfsm.test` | warehouse_manager |
   | `admin@solarisfsm.test` | admin |
5. Start the app:
   ```bash
   npm start
   ```

### Suggested test pass

1. Sign in as `admin@solarisfsm.test` → **New Call**, assign it to Alex Rivera → back on **Overview**, confirm it appears (Realtime picks up the insert without a refresh).
2. Sign in as `technician@solarisfsm.test` → **My Calls** → open the call just created → **Start Repair** → **Scan Serial Number**, swap in one of Alex's checked-out components against a made-up old serial → **Upload Photos**, add one photo per category → back on the call, **Complete Call**.
3. Sign in as `admin@solarisfsm.test` again → open that call from **Overview** → confirm the photos and the replacement record are visible, read-only.
4. Sign in as `warehouse@solarisfsm.test` → **Inventory**, filter to *Defective*, **Receive** the part the technician just swapped out → filter to *In Warehouse*, **Dispatch** it to a technician to see it round-trip.

Camera/barcode scanning needs a physical device — simulators don't expose a camera.

## Database schema

Defined in [`supabase/migrations/`](supabase/migrations/), applied in order:

- `20260101000000_init_schema.sql` — tables, enums, indexes, RLS
  - **profiles** — extends `auth.users` with `role` (`admin` / `warehouse_manager` / `technician`)
  - **inventory_items** — solar components tracked by unique serial number
  - **service_calls** — technician work orders with GPS + status
  - **call_photos** — photo evidence per call (before/defective/new/production/general)
  - **component_replacements** — audit trail of parts swapped during a call
- `20260101010000_component_replacement_rpc.sql` — `log_component_replacement()`, the transactional swap function
- `20260101020000_storage_call_photos.sql` — the `call-photos` Storage bucket + policies
- `20260101030000_realtime_service_calls.sql` — adds `service_calls` to the Realtime publication

All tables have Row Level Security enabled with baseline policies (read for authenticated users, writes scoped by role). Tighten these as real business rules are defined.
