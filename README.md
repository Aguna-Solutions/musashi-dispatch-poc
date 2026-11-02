# Musashi Dispatch — POC

A front-end proof of concept for Musashi's product dispatch workflow: carriers send a
vehicle to the plant, Musashi Dispatch verifies it at the gate, captures the load
details, and the app issues a transporter-wise GRN. The Admin Dashboard keeps the
completed-trip ledger.

Built with plain **HTML, CSS and Vanilla JavaScript** — no build step, no dependencies.

## Run it

Open `index.html` directly in a browser, or serve the folder locally:

```bash
cd dispatch-system-musashi
python -m http.server 8123
```

Then visit `http://localhost:8123`.

## Demo logins (RBAC)

The login screen is account-based. Each account can only open its own workspace.
Transporters are fixed to their own carrier — they cannot pick or see another company.

| Workspace | Username | Password | Carrier |
| --- | --- | --- | --- |
| Transporter Portal | `stc` | `demo1234` | STC Services |
| Transporter Portal | `dlv` | `demo1234` | Delhivery Freight |
| Musashi Dispatch | `dispatch` | `demo1234` | — |
| Admin Dashboard | `admin` | `demo1234` | — |

Clicking an account card fills its demo credentials. Sessions live in `sessionStorage`
for the current tab, and **Sign out** ends the session.

## The flow

1. **Musashi asks the carrier for a vehicle.**
2. **Transporter** signs in with its own account and sends only the **vehicle number**
   and **driver name** to dispatch. There is no destination, DL, customer or
   pre-registration step on this screen.
3. **Musashi Dispatch** sees the vehicle under *Waiting vehicles*, verifies the truck
   and driver at Gate 02, and opens **Verify & dispatch**.
4. Dispatch captures:
   - **Destination customer** & auto-populated **location** (e.g. Hero Honda in Gurgaon, Tata Motors in Gujarat).
   - **Route kilometres**: fixed routes (e.g. Gurgaon = 90 km, Manesar = 45 km, Tapukara = 70 km) lock automatically; variable routes (e.g. Sanand/Gujarat) allow entering kilometres now or leaving them to be recorded upon truck arrival.
   - **Driver DL / ID** and **external tax invoice number**.
   - **Total bins loaded** vs. **Bins delivered to customer**: returning bins (e.g. 100 loaded − 80 delivered = 20 returning with truck) are auto-calculated and tracked.
   - Dispatch issues the transporter GRN; truck status advances to **In Transit**.
5. **Truck Arrival & Returns Workspace**:
   - When the truck returns to Musashi Gate 02 (even if 0 bins return), the dispatch gate conducts final gate-in verification.
   - Gate records actual returned bins (empty / rejected parts) and enters/confirms actual trip kilometres for variable routes.
   - Completing return verification marks the trip **Completed** and commits it to the billing ledger.
6. The trip moves to the **Admin Dashboard** ledger with full bin audit and distance reconciliation.

Transporters only see their own vehicles and completed trips. Dispatch and Admin see
the plant-wide queue, arrival verification, and ledger.

## GRN logic

Each transporter owns its own sequence counter:

```text
GRN = TRANSPORTER_CODE + "-" + zero-padded(sequence + 1, 4)
```

Example: STC Services (`STC`) at sequence `24` produces `STC-0025`; Delhivery Freight
(`DLV`) at sequence `18` produces `DLV-0019`. The sequence is advanced permanently when
the dispatch is completed, so a number can never be reused across that carrier's trips.

## Demo data and persistence

- Seeded with 5 customers (Hero Honda Gurgaon [90 km fixed], Maruti Suzuki Manesar [45 km fixed], FCC Clutch Tapukara [70 km fixed], Tata Motors Sanand Gujarat [variable km], JCB India Vadodara Gujarat [variable km]), 2 transporters, 9 completed trips, 1 in-transit trip (DLV-0019: 100 loaded, 80 delivered, 20 returning) and 4 waiting vehicles.
- Waiting seed vehicles are `Awaiting Dispatch` with no destination or DL yet, because
  dispatch captures those at the gate.
- Seeded transporter counters: STC `24`, DLV `19` (completed samples use `STC-0020`–`STC-0024`
  and `DLV-0015`–`DLV-0018`).
- State is stored in `localStorage` under the key `musashi-dispatch-poc-v1`
  (schema version `5`; older local data is reseeded automatically).
- Use **Reset demo** on the Admin Dashboard to restore the seed data.
- Data stays in the browser; there is no backend in this POC.

## Workspaces & Views

- **Transporter Portal**: Request submission and carrier-specific vehicle tracking.
- **Musashi Dispatch**: Gate 02 departure verification, route assignment (fixed/variable km), bin split, and GRN generation.
- **Truck Arrival & Returns**: Gate 02 return verification, physical bin count reconciliation, actual kilometre recording, and trip completion.
- **Admin Dashboard**: Live reconciliation ledger (14 columns including route, distance, bins loaded/delivered/returned, status), locked carrier sequence counters, and CSV export.

## Files

```text
index.html   Login screen, role-based shell, four views, departure & return modals, notifications
styles.css   Light operations theme, responsive layout, red DHL accent, return cards & bin splits
app.js       Auth/RBAC, carrier scoping, state, gate departure & arrival, GRN logic, CSV export
assets/      Recreated DHL Supply Chain logo and favicon (SVG)
```

## Notes

- Includes inline validation, duplicate-vehicle blocking, live counters, keyboard
  accessible modal (Escape to close, focus trap) and responsive mobile navigation.
- Google Fonts are loaded for the intended typography; system fonts are used as a
  fallback when offline.
