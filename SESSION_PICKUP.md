# Solaris FSM — Session Pickup

Last session ended: 2026-08-10 (audit + fix session).

**The project is now a git repo.** Every fix below is a separate commit, so
anything can be reverted individually:

```bash
git -C "C:\Users\manun\Projects\solaris-fsm" log --oneline
```

| Commit | What |
|---|---|
| `40273ad` | Baseline — the exact state before any fix |
| `8b57d6c` | Blank-list root cause + auth guard/session hardening |
| `11d290b` | Security hardening migration + seed fixes |
| `b0ed02b` | Regenerated DB types + TypeScript 5.6 |
| `a69c0b5` | Silent write failures + StatusBadge fallback |

Full file-level backup (excludes node_modules):
`C:\Users\manun\Projects\_backups\solaris-fsm_2026-08-10_1602`

---

## ⚠️ First thing to check: did the blank list actually fix?

**Sign in as admin and look at Dispatch Overview.** Expected: the 9 calls now
render.

**The tell-tale that the fix took effect**: the screen background should be
light grey (`bg-slate-50`), not white. That same `className` was being dropped,
so if the background is grey, `className` is now reaching `SafeAreaView` and
the layout fix is live. Same check applies to My Calls and Warehouse Inventory.

### What was actually wrong (the previous diagnosis was off)

The last session concluded `className` doesn't work on `FlatList` and switched
all five lists to `style={{ flex: 1 }}`. **That premise was wrong.** `FlatList`
*is* registered — via `remapProps` in
`node_modules/react-native-css-interop/dist/runtime/components.js:28`. The
earlier check grepped `node_modules/nativewind/dist/`, but the registry lives
in `react-native-css-interop`, a different package.

The real cause was one line above every `FlatList`: **`SafeAreaView` imported
from `react-native-safe-area-context` is a third-party component and was never
registered for `className` interop.** The interop JSX wrapper resolves
`interopComponents.get(type) ?? type`, so an unregistered component renders
as-is and `className` is passed down as an unknown prop and silently dropped.
That component has no default `flex: 1`.

So `className="flex-1 bg-slate-50"` on each screen root did nothing → the root
sized to its content instead of filling the screen → the `FlatList`'s `flex: 1`
resolved against an indefinite height and collapsed to **zero height**. The
header had intrinsic height so it rendered fine ("9 of 9"), the list didn't,
and `ListEmptyComponent` never appeared **because the data was never empty**.

Fixed centrally in `lib/nativewind-interop.ts` (imported once from
`app/_layout.tsx`), which repairs all 11 `SafeAreaView` call sites at once.

**If you add another third-party component and `className` seems ignored, this
is why** — register it in that file.

---

## What else was fixed

### Security (all verified against a clean local DB)

Migration `20260101060000_security_hardening.sql`. Three real
privilege-escalation holes, each tested by actually attempting the attack:

1. **Anyone with the public anon key could run the swap RPC.** Postgres grants
   `EXECUTE` to `PUBLIC` by default, so the grant to `authenticated` didn't
   exclude `anon`. Worse, the guard `if p_technician_id <> auth.uid()` **never
   fired for an unauthenticated caller** — `auth.uid()` is NULL, `x <> NULL` is
   NULL, and PL/pgSQL treats NULL as false. With `SECURITY DEFINER` that meant
   inventory writes with RLS fully bypassed. (`is distinct from` is the
   NULL-safe operator; `<>` must never be used in a security guard.)
2. **Any technician could make themselves admin** — `profiles.role` was
   self-updatable. Fixed with a column-level grant (`full_name`, `phone` only);
   RLS `WITH CHECK` cannot express "this column didn't change".
3. **Self-signup could pick its own role** — the trigger read the role from
   client-writable `raw_user_meta_data`. Now reads `raw_app_meta_data`, which
   the client SDK cannot set. **`seed.sql` was updated to match** — the role now
   lives in `raw_app_meta_data` there.

Also: the RPC now verifies the call is an active call assigned to the caller,
and the old-item update is scoped so a **mistyped serial can't seize unrelated
warehouse stock** (previously a typo could flip a Powerwall sitting in the
warehouse to `defective_returned` and reassign ownership).

### Type safety — it was completely inert

`tsc` went 38 errors → **0**, but the real finding is that type checking wasn't
working at all. Two independent causes:

1. `types/database.types.ts` was hand-written and malformed (postgrest-js needs
   `Relationships` per table and `Views`/`Functions` on the schema), so
   `.insert()` was `never[]`, `.update()` was `never`, and every row type was
   `never`. Regenerated from the live schema — it now includes
   `component_models` and the RPC signature, both previously missing entirely.
2. `@tanstack/react-query` 5.101.4 uses TypeScript's built-in `NoInfer`, added
   in **TS 5.4** — but the project pinned `typescript ~5.3.3`. Every
   `useQuery`/`useMutation` returned an unresolved generic behaving as `any`.
   **No query result anywhere in the app was ever type-checked.** Upgraded to
   TS 5.6.3.

> `npx expo start` will warn that TS 5.6.3 ≠ expected `~5.3.3`. That's a
> compatibility advisory only — TypeScript isn't in the runtime bundle, and the
> Android bundle builds fine (verified). Downgrading re-breaks all type safety.

### Correctness / UX

- **Sign-out didn't clear the React Query cache.** The `QueryClient` lives for
  the whole process and most query keys aren't namespaced by user, so on a
  shared tablet the next person to sign in could render the previous user's
  data. Now cleared, with a pending state and a real error path (and
  `scope: "local"` so it works offline).
- **Role guards were deny-lists** (`profile?.role === "technician"` …), so a
  `null` profile — failed fetch, or a user with no profile row — fell through
  and rendered the admin/warehouse UI. Replaced with a deny-by-default
  `RoleGate`. This also removes the flash of "My Calls" every admin saw on
  sign-in.
- **The app could hang on a permanent spinner**: `setLoading(false)` sat behind
  `await loadProfile(...)` with no `.catch()`. Offline cold start = infinite
  spinner. Now settles independently.
- **Stale profile responses** could overwrite a newer user's profile (session B
  + role A). Added an epoch guard.
- **`component_models` was never seeded**, so Add Item's dropdowns were empty on
  any fresh `supabase db reset` and the flow was unusable. Seeded.
- **Move/Delete inventory reported success on a blocked write** — RLS narrows
  UPDATE/DELETE to zero rows rather than raising, so PostgREST returns 204 with
  `error === null`. Added `.select()` so failures surface.

---

## Not done — deliberately left for you to decide

- **Tenancy is UI-only.** Every authenticated user can still `SELECT` *all*
  service calls (customer names, addresses, GPS), all inventory, all photos.
  The screens filter client-side; the server does not. Tightening this is the
  single biggest remaining security item, but it's a real behavioral change and
  it must be done carefully: `useAllServiceCalls`, `useWarehouseInventory` and
  `useComponentReplacements` all embed `profiles`, so restricting `profiles`
  SELECT is exactly what would introduce a null-embed bug that does **not**
  exist today.
- **Storage**: the `call-photos` bucket is public, so anyone with a URL can view
  job-site photos. Uploads aren't path-scoped either.
- `max_rows = 1000` — the admin overview and inventory list fetch unbounded and
  will silently truncate past 1000 rows.
- Serial uniqueness is case-sensitive, so `INV-001` and `inv-001` are two rows
  and the friendly duplicate message is bypassed.
- **4 of the 6 planned audits never finished** (hit a usage limit): the deep
  passes over `warehouse/*` screens, `calls/[id]*` screens, the full hook
  query-key/invalidation cross-check, and the NativeWind `className`-on-
  third-party-component sweep. The last one matters most — `SafeAreaView` is
  fixed, but **other third-party components may have the same silent-drop
  problem**.

---

## How to resume

```bash
cd "C:\Users\manun\Projects\solaris-fsm"
npx supabase start
```

**The LAN IP changed again this session** (`.139` → `.143`) — third time. `.env`
is updated to `192.168.1.143`. Always re-check before starting Metro, because
env vars are baked in at bundle start:

```bash
ipconfig
```

```bash
npx expo start
```

Phone: Expo Go → **Enter URL manually** → `exp://<current-LAN-IP>:8081`.

### Test accounts (all password `Password123!`)

| Email | Role |
|---|---|
| `admin@solarisfsm.test` | admin |
| `warehouse@solarisfsm.test` | warehouse_manager |
| `technician@solarisfsm.test` | technician — Alex Rivera |
| `technician2@solarisfsm.test` | technician — Jordan Lee |

### Checklist for next session

1. **Admin Overview renders 9 calls** (and background is grey, not white).
2. My Calls + Warehouse Inventory lists render — same root cause, same fix.
3. Sign in as each role: no "My Calls" flash for admin/warehouse.
4. Sign out → sign in as a different role: no stale data from the previous user.
5. Add Item: Model Type / Model dropdowns are populated now.
6. Technician swap flow end-to-end (the RPC changed — it now rejects calls not
   assigned to you, and clears the owner on install).
7. Warehouse Delete + Move still work (they now surface failures instead of
   silently no-op'ing).

## Housekeeping

`C:\Users\manun\Projects\fsm softwear` is the **stale duplicate** — 4 days
behind and missing everything above. Safe to delete once you're happy.
