# Solaris FSM — Session Pickup

Last session ended: 2026-08-08 (afternoon session, continuation of the 08-06/08-07 work).

## ⚠️ Start here: unresolved bug, unconfirmed fix

**Admin → Dispatch Overview shows a completely blank list** (not even the "No matching calls" empty state), despite the header correctly reporting "9 of 9 service calls" — meaning the data fetch and filtering both work, only the actual list rendering fails.

What's been tried, in order:
1. Fixed a real Realtime crash (`cannot add postgres_changes callbacks... after subscribe()`) — a fixed channel name (`"service_calls_overview"`) collided across remounts. Fixed with a unique name per mount in `hooks/useAllServiceCalls.ts`. **This fix is solid, keep it.**
2. Fixed a real layout bug — horizontal `ScrollView`s (used by `FilterTabs`) default their content container's `alignItems` to `stretch`, producing the tall elongated pill buttons you'd have seen on the Dispatch screen. Fixed in `components/FilterTabs.tsx`. **This fix is solid, keep it.**
3. Suspected `FlatList` height wasn't bounded (missing `flex-1`) causing the blank list. Added `className="flex-1"` to every `FlatList` in the app.
4. Discovered `FlatList` isn't in NativeWind's component interop registry (confirmed by grepping `node_modules/nativewind/dist/` — no match), meaning `className` on it may silently do nothing. Switched all five `FlatList`s (Admin Overview, My Calls, both Warehouse Inventory views, `OptionPicker`'s dropdown list) from `className="flex-1"` to the native `style={{ flex: 1 }}` prop instead.

**Step 4 was the last action taken — it was never confirmed working.** The user was moving to a new session right after. **Next session: get a screenshot of Admin Overview after a fresh reload before doing anything else.** If it's still blank, the next things to check, in order of suspicion:
- Is this specific to Admin Overview, or does My Calls / Warehouse Inventory *also* fail to show items now? (Would indicate a shared root cause, e.g. something wrong with how these screens consume `useQuery` data, rather than a FlatList-specific issue.)
- Add a temporary `console.log(filtered.length, filtered[0])` right before the `<FlatList>` in `app/admin/index.tsx` and check Metro's terminal output (not just the phone) — confirms the JS-side data is actually what's expected at render time.
- Check whether `renderItem` is throwing silently — wrap the row content in a try/catch or temporarily replace it with a bare `<Text>{item.call_number}</Text>` to isolate whether the row's own JSX (StatusBadge, date formatting, etc.) is the problem, not the FlatList container.
- The service_calls data itself was checked directly against Postgres and is completely clean (all 9 rows have valid statuses, valid technician IDs, valid timestamps) — the bug is very unlikely to be data-shaped.

## Where things live

- **Project folder**: `C:\Users\manun\Projects\solaris-fsm`
- The old `C:\Users\manun\Projects\fsm softwear` duplicate (see previous handoff) — check if it's still around and worth deleting.

## What's built (cumulative, all turns)

Everything from the previous handoff, plus this session's additions:

- **Model catalog** (`component_models` table — category + model name, migration `20260101050000`). Add Item now uses **Model Type → Model** dependent dropdowns instead of free text, with a **+ Add Model** button to register new (category, model) pairs on the fly. (Auto-recognition-from-barcode was built, tested against real SolarEdge Data Matrix labels, found to need a genuinely more complex `BATCHCODE-MODELCODE-SUFFIX` parsing scheme — then the user decided it was too complicated and asked to drop it entirely. It was fully removed, not just hidden — no dead code/tables left behind.)
- **Duplicate serial detection** — adding an item with an existing serial now says exactly where that item currently is (`"...already registered — currently with Alex Rivera"` etc.), checked proactively before insert, not just relying on the DB's unique-constraint error.
- **Delete & Move for inventory items** — every item row in Warehouse Inventory now has Delete (confirms first) and Move (free-form status/owner change, no guided steps — the escape hatch for arbitrary corrections, as opposed to the guided Dispatch/Receive flows).
- **Call reassignment restricted** to `open`/`pending_parts` only — locked read-only (with an explanation) for `in_progress`/`completed`/`cancelled`. Technician name also moved to the top of the call detail screen instead of buried after the description.
- **Fixed a real Dispatch bug**: tab screens stay mounted in React Navigation, so a one-shot "already preselected" ref never reset on a second tap of a different item — also fixed a related bug where switching Dispatch↔Receive via Inventory's buttons could leave the transfer screen's internal `mode` state stale.
- **Dispatch now requires scan-or-type serial verification** before confirming, same as Receive (previously Receive-only).
- **`ScannerPanel` recognizes `datamatrix`** codes, not just QR — real component labels (SolarEdge optimizers specifically) use Data Matrix, which was silently undetectable before.

## Known-good vs. known-risky patterns (learned the hard way this session)

- **`className` on `FlatList` may not work** — NativeWind 4.0.36 doesn't have it in its interop registry. Use `style={{ flex: 1 }}` (or any other style) on `FlatList` directly, not `className`.
- **Fixed Supabase Realtime channel names are dangerous** if the hook can remount while a previous instance's channel hasn't finished cleanup (navigation, Fast Refresh). Always suffix with something unique per mount.
- **Horizontal `ScrollView`s need explicit `alignItems`** in `contentContainerStyle` — the RN default (`stretch`) will visibly deform children with intrinsic sizing (like pill buttons) into elongated shapes.
- **Tab screens persist mounted** across navigation in this app's structure — any "have I already done X" one-shot ref/flag logic needs to compare against a specific identity (e.g. an item id), not just a boolean, or it'll never re-trigger on a second, different navigation into the same still-mounted screen.

## How to resume next time

```bash
cd "C:\Users\manun\Projects\solaris-fsm"
npx supabase start
```

Then check the LAN IP hasn't changed (**it changed at least twice already across sessions** — `.138` → `.139`, and may change again):

```bash
ipconfig
```

If it changed, update `EXPO_PUBLIC_SUPABASE_URL` in `.env` to the new IP before starting Metro (env vars are baked in at bundle start, so update `.env` *before* `npx expo start`, or restart Metro after editing it).

```bash
npx expo start
```

On the phone, Expo Go → **Enter URL manually** → `exp://<current-LAN-IP>:8081`.

**Reminder**: if Expo Go on the phone ever shows an SDK mismatch error again, it's because Play Store auto-updated it back to the latest SDK — the phone should have auto-update disabled for Expo Go specifically (Play Store → Expo Go → ⋮ menu → turn off auto-update). If it happened anyway, re-sideload from `expo.dev/go?sdkVersion=51&platform=android&device=true`.

### Test accounts (all password `Password123!`)

| Email | Role |
|---|---|
| `admin@solarisfsm.test` | admin |
| `warehouse@solarisfsm.test` | warehouse_manager |
| `technician@solarisfsm.test` | technician — Alex Rivera |
| `technician2@solarisfsm.test` | technician — Jordan Lee |

## Checklist for next session

1. **First priority**: confirm/fix the Admin Overview blank list bug (see top of this doc).
2. Once that's resolved, re-verify My Calls and Warehouse Inventory lists still render items correctly too (they share the same FlatList pattern that was just changed).
3. Add Item: Model Type/Model dropdowns, **+ Add Model** flow, duplicate-serial rejection message.
4. Warehouse Inventory: Delete and Move actions on an item.
5. Dispatch: pre-selection on two different items back-to-back, verification step before confirming (both Dispatch and Receive).
6. Receive: Data Matrix scan on a real optimizer label, rapid-scan counter.
7. Call detail: reassignment locked for `in_progress`/`completed`, editable for `open`/`pending_parts`, technician name shown at top for everyone.
