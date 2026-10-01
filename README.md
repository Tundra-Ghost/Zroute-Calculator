# Z Route Command Center

A responsive, browser-based progress tracker and planning dashboard for **Z Route: Redemption** players. Create a local commander profile, record building levels, track personal and alliance research, and manage detailed hero and survivor progression from one fully navigable interface.

The hero directory is grouped into Warrior, Assault, and Tactical classes and records rarity, formation type, ownership, HQ-based level caps, five-star shard progress, and the quality of all four equipment pieces. The survivor directory supports custom Other, SSR, and Mythic survivors, building assignments, recorded benefits, and the same five-part star system.

Every tracked upgrade can have a target. The planner totals resources and time from verified per-level records and clearly identifies incomplete data instead of guessing. Upgrade records live in browser storage and can be created, updated, exported, or imported from the **Upgrade data** tab. `data/upgrade-costs.json` documents the portable database schema and is intentionally empty until community values are verified.

## Run locally

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Progress is stored in the browser's `localStorage`.

## Upgrade data format

Each record identifies a category, exact item name or ID, destination level, resource costs, duration in minutes, and an optional verification source. Re-saving the same category, item, and destination level updates that record. Import/export uses the following envelope:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-10-01T00:00:00.000Z",
  "records": []
}
```

The tracker deliberately does not estimate power, costs, times, requirements, or bonuses. All progress and upgrade data is stored only in the player's browser unless they explicitly export it.
