# What you need to do

Written 2026-08-10. Everything here needs *your* hands — credentials, an
account, or a decision. Nothing below is blocked on me.

**Right now, in order:**

1. `git push` — only this doc's edits are unpushed. All code fixes are on `main`.
2. **Merge all four open Dependabot PRs** — #16 supabase 2.112.0, #14 typescript
   5.9.3, #13 tailwindcss 3.4.19, #12 github-actions group. All green.
   - #12 bumps `supabase/setup-cli` v1 → v3, the action pinned in §4d. CI #21
     passed on that PR *including* the database job, so the v3 action with
     `version: 2.111.0` is already proven. Safe.
   - #14 was the flaky one; it's green now that the CLI is pinned.
3. Protect `main` so the checks can't be bypassed. See §2.
4. Then the real decisions: §4a tenancy, §4b photo privacy, §4d test coverage.

Resolved on their own, no action needed:

- **eslint-config-expo 57.0.1** — auto-closed once the ignore rule landed.
- **zustand 5.0.14** — closed without merging. `main` is still on `^4.5.5`, so
  the untested runtime major did *not* land. If Dependabot reopens it, the
  advice in §4d still stands: test the three roles by hand first.

---

## 1. ~~Push the code~~ ✅ DONE — but there are unpushed commits

You pushed, CI ran, and `main` is green. `.env` stayed untracked; no credentials
are in any commit.

**Still outstanding:** commits made after that push are sitting locally. There's
no `gh` CLI or stored credentials on this machine, so pushing is always yours:

```bash
cd "C:\Users\manun\Projects\solaris-fsm"
git push
```

Check what's pending at any time with:

```bash
git log --oneline origin/main..HEAD
```

That should be empty. If it isn't, those commits haven't reached CI yet.

---

## 2. Protect `main` (2 min, GitHub web UI)

CI is pointless if it can be bypassed. On GitHub:

**Settings → Branches → Add branch ruleset** (or "Add rule" on older UI) for `main`:

- ☑ Require a pull request before merging
- ☑ Require status checks to pass → select **Lint & Types**, **Migrations & Security Tests**, **Bundle (Android + iOS)**
- ☑ Require branches to be up to date before merging

Leave the `Dependency Audit` check unselected — it's deliberately non-blocking.

---

## 3. Decide: is this app going to production for real?

If yes, these are the blockers. None are things I should decide for you.

### 3a. A hosted Supabase project

Right now everything points at a local Supabase on your LAN IP, which has
changed three times. Production needs a hosted project:

1. Create one at [supabase.com](https://supabase.com/dashboard).
2. Push the schema:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   Do **not** run `supabase db reset` against it — that wipes data. And do not
   run `seed.sql` there; it creates test accounts with a known password.
3. Put the hosted URL + anon key into EAS (step 3b), not into `.env`.

### 3b. EAS build credentials

`eas.json` and `.github/workflows/release.yml` are ready, but the release
workflow needs a token:

1. `npx eas login` then `npx eas init` (links the project, sets an EAS project ID).
2. Create a token at <https://expo.dev/settings/access-tokens>.
3. GitHub → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `EXPO_TOKEN`
   - Value: the token
4. Set the app's runtime env as EAS secrets (these get baked into the build):
   ```bash
   npx eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co
   npx eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key>
   ```

Then builds are Actions → **Release Build** → Run workflow. It's manual on
purpose; producing an installable artifact shouldn't happen on every push.

> ⚠️ `EXPO_PUBLIC_*` values are inlined into the shipped JS bundle. The anon key
> is designed to be public so that's fine — but never put a service-role key or
> any real secret behind that prefix.

---

## 4. Two security decisions only you can make

These are real exposures I deliberately did **not** change, because each one
alters app behaviour and I couldn't test the result with you gone.

### 4a. Tenancy is UI-only

Every signed-in user can `SELECT` **all** service calls — every customer's name,
street address, GPS coordinates and work notes — plus all inventory, all photos,
and all replacement history. The screens filter to "my calls" client-side; the
database does not.

For a field-service app with real customer addresses this is likely a privacy
problem (and plausibly a GDPR one). The fix is scoped policies, but it must be
done carefully: `useAllServiceCalls`, `useWarehouseInventory` and
`useComponentReplacements` all embed `profiles`, so restricting `profiles`
SELECT is exactly what would introduce a null-embed bug that doesn't exist
today. Say the word and I'll do it properly with tests.

### 4b. Job-site photos are world-readable

The `call-photos` bucket is public, so anyone with the URL can view them, signed
in or not. Uploads also aren't path-scoped. If photos can show customer property,
this should become a private bucket with signed URLs.

---

## 4c. ✅ RESOLVED — Dependabot was proposing SDK-breaking upgrades

**This is already fixed and pushed.** Kept for the record, because the reasoning
matters if Dependabot ever starts opening unmergeable PRs again.

After the first push, Dependabot opened five PRs proposing upgrades that are
wrong for Expo SDK 51, and CI correctly failed every one:

| PR | Proposed | Why CI rejected it |
|---|---|---|
| #10 | nativewind 4.0.36 → 4.2.6 | Rewrites the `className` interop the blank-list fix depends on |
| #9 | tailwindcss 3.4.1 → 4.3.3 | Tailwind 4 is a rewrite; nativewind 4 requires Tailwind 3 |
| #8 | react 18.2.0 → 18.3.1 | SDK 51 pins 18.2.0 |
| #7 | expo-sdk group (14) | async-storage 1 → 3, reanimated 3 → 4 |
| #6 | dev-tooling group | `npm ci` peer conflict: eslint 9 vs eslint-config-expo's eslint ^8 |

That was my config being too permissive — Expo SDK owns those versions and they
must only move via `npx expo install --fix` during a deliberate SDK upgrade.
`.github/dependabot.yml` now excludes the SDK-managed set, and drift is caught
instead by `npx expo install --check` in the CI audit job.

Dependabot closed those five itself once the config landed (it auto-closes PRs
for newly-ignored dependencies). Nothing left to do here.

Also fixed: the **Dependency Audit** job showed a red X on your otherwise-green
run. It's informational by design, but a failed step next to passing jobs makes
real failures indistinguishable from noise. It now writes findings to the job
summary and stays green.

> On the audit itself: 24 high + 1 critical (`tar`), but every one is in
> **build-time tooling** — `@expo/cli`, `@expo/metro-config`, `cacache`,
> `@react-native/community-cli-plugin`. None of it ships in the app bundle.
> `npm audit fix --force` would break the SDK pinning; the real remedy is an
> Expo SDK upgrade (51 is well behind current), which is a planned piece of
> work, not a quick fix.

---

## 4d. The biggest remaining gap: nothing tests that the app *works*

After the second push, `main` is green and the SDK-breaking PRs are gone. Two
new ones failed, and they failed for very different reasons — worth knowing,
because the distinction is the whole point of having a pipeline:

- **eslint-config-expo 7.1.2 → 57.0.1** — a *real* incompatibility. They
  switched to a year-based version scheme; 57 is the flat-config generation and
  needs eslint 9 plus an `eslint.config.js`. Now ignored for majors. Migrating
  is deliberate work, not a bump.
- **typescript 5.6.3 → 5.9.3** — **not a real failure.** Lint, typecheck and
  both bundles passed; the job died on "Set up Supabase CLI". That step used
  `version: latest`, resolving over the network every run. Now pinned to
  `2.111.0`. A flake that looks like a failure is expensive — it sends you
  debugging the wrong change. **That PR is probably safe to merge once CI
  re-runs.**

But the one that should get your attention is the one that **passed**:

> **zustand 4.5.7 → 5.0.14 went green.** That's a major version of a runtime
> dependency.

CI proved it compiles, type-checks and bundles. It did **not** prove the app
still works, because there are no tests of app behaviour — no unit tests, no
component tests, nothing that renders a screen or exercises a flow. For a major
bump of the library holding your auth session, that gap is the difference
between "green" and "safe".

Concretely: zustand 5 changes store/selector semantics. This app's usage looks
compatible (named `create`, individual selectors, `getState()` in the auth
listener), but "looks compatible" is exactly the standard that produced the
blank-list bug.

**Recommendation:** before merging that PR, sign in as each of the three roles
and confirm sessions and redirects still behave. Longer term, the highest-value
addition to this pipeline is a test layer — Jest + React Native Testing Library
for the auth guards, role routing, and the dispatch/receive state machine. Say
the word and I'll build it; it's a real piece of work, not a config tweak, which
is why I haven't done it unprompted.

---

## 5. Smaller decisions

- **Move vs Dispatch.** You asked for in-warehouse items to lose the free-form
  Move, and that's done — they can now only leave via Dispatch with serial
  confirmation. Note the adjacent case I left alone: an item that's
  `defective_returned` or `installed` can still be Moved straight to
  "with technician" without a serial check. Tell me if that should be closed too.
- **The old duplicate folder** `C:\Users\manun\Projects\fsm softwear` is now
  ~4 days stale and missing everything. Safe to delete whenever.
- **`supabase/seed.sql` creates four accounts with the password `Password123!`.**
  Fine locally, dangerous if it ever runs against a hosted database.

---

## Quick reference

```bash
npm run verify      # lint + typecheck — same gate CI runs
npm run db:reset    # replay migrations + seed
npm run test:db     # security regression suite (needs psql on PATH)
npm run db:types    # regenerate DB types after a migration
```

On Windows without `psql` installed, run the suite through Docker instead:

```bash
docker exec -i supabase_db_fsm_softwear psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/security.sql
```

**After any migration**, run `npm run db:types` and commit the result — CI diffs
the committed types against a fresh generation and fails if they drift.
