## What changed

<!-- One or two sentences. What behaviour is different for a user? -->

## Why

<!-- The problem this solves. Link the issue if there is one. -->

## How it was verified

<!-- Not "it should work". What did you actually run or look at? -->

- [ ] `npm run verify` (lint + typecheck) passes
- [ ] Checked on a real device (camera/barcode flows cannot be tested in a simulator)

## Checklist

- [ ] **Schema change?** Added a migration (never edited an existing one) and ran `npm run db:types`
- [ ] **RLS/policy/grant change?** Added or updated a case in `supabase/tests/security.sql`
- [ ] **New third-party component styled with `className`?** Registered it in `lib/nativewind-interop.ts`
      — NativeWind silently drops `className` on unregistered components, which is
      what caused the blank-list bug
- [ ] **Touched a write path?** Confirmed a blocked write surfaces an error rather than
      reporting success (RLS narrows UPDATE/DELETE to zero rows instead of raising)
- [ ] No secrets added under an `EXPO_PUBLIC_*` name — those are inlined into the shipped bundle

## Screenshots

<!-- For any UI change. Before/after if it's a fix. -->
