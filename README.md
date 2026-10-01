# Z Route Command Center

A responsive, browser-based progress tracker and planning dashboard for **Z Route: Redemption** players. Create a local commander profile, record building levels, track personal and alliance research, and manage detailed hero and survivor progression from one fully navigable interface.

The hero directory is grouped into Warrior, Assault, and Tactical classes and records rarity, formation type, ownership, HQ-based level caps, five-star shard progress, and the quality of all four equipment pieces. The survivor directory supports custom Other, SSR, and Mythic survivors, building assignments, recorded benefits, and the same five-part star system.

Every tracked upgrade can have a target. Missing levels are clickable throughout the trackers. Before opening the observation editor, the app reminds the player to bring the rest of their profile and active bonuses up to date so the submitted values have the right context. The editor then provides a category-specific item list rather than requiring an exact identifier to be typed. Enter the costs and time shown in game plus any active personal, alliance, statue, survivor, or event reductions. The database retains both that raw observation and normalized base estimates, making observations comparable and suitable for later formula analysis. Records live in browser storage and can be edited, exported, or imported from the **Upgrade data** tab. `data/upgrade-costs.json` documents the portable database schema and is intentionally empty until community values are verified.

## Run locally

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Progress is stored in the browser's `localStorage`.

## Upgrade data format

Each record identifies a category, exact item name or ID, destination level, normalized resource costs, normalized duration in minutes, and an optional verification source. New records also include an `observation` containing the values displayed in game, active reduction percentages, and modifier context. Re-saving the same category, item, and destination level updates that record. Import/export remains compatible with older records that contain only base values:

```json
{
  "schemaVersion": 2,
  "updatedAt": "2026-10-01T00:00:00.000Z",
  "records": []
}
```

Normalization is explicitly labeled as an estimate because the game's rounding rules are not yet known; the original observation is never discarded. The tracker does not invent missing requirements or bonuses. All progress and upgrade data is stored only in the player's browser unless it is explicitly exported.
