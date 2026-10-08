# Z Route Command Center

A responsive, browser-based progress tracker and planning dashboard for **Z Route: Redemption** players. Create a local commander profile, record building levels, track personal and alliance research, and manage detailed hero and survivor progression from one fully navigable interface.

The local profile is pinned to server 52 and ExpeditionCorps `[ExC]` for this release. It includes a calculated power breakdown for hero, soldier, building, tech, and fighter power. Unknown power and upgrade values remain visibly marked and default to zero rather than being guessed. The Filter tab searches the combined building, hero, survivor, research, and alliance directories, while each upgrade target displays a prominent resource-and-time requirement panel.

The hero directory is grouped into Warrior, Assault, and Tactical classes and records rarity, formation type, ownership, HQ-based level caps, five-star shard progress, and the quality of all four equipment pieces. The survivor directory supports custom Other, SSR, and Mythic survivors, building assignments, recorded benefits, and the same five-part star system.

Building, research, and hero costs come from the game data in `data/source/`. Every building copy and research node has a level, a target, and a cost panel. With no target set, the panel shows the next level. Unmet requirements for the next level are listed on each card. The **Goal planner** takes a building or research goal and adds every missing prerequisite, then totals the resources and time. Build and research times use your VIP level, your saved research speed bonuses, and any extra bonus you enter.

The **Resources** page shows hourly output from your producer buildings and output research. It also takes your speedup items and shows how much of your planned build and research time they cover. Heroes with an exclusive weapon get a weapon level and target.

Each hero gear slot (SR, SSR or UR) has a level and a target. UR gear continues past level 40 into 25 promotion stages. The Resources page also lists crafting and upgrade costs per gear quality.

The **Fighter** page tracks fighter level and stage (Combat Chips and Fighter Parts) and wingman chip stars (chip copies). Components and evolution are not tracked yet.

Alliance research and survivors are not in the game data yet. Those still use observations you record on the **Upgrade data** tab. Records live in browser storage and can be edited, exported, or imported.

## Game data

The raw exports live in `data/source/` (`progression.json`, `heroes.json`, `resources.json`, `equipment.json`, `fighter.json`, about 7.5 MB). The browser does not load them. Instead, a script compacts them into `data/game-data.js` (about 250 KB), which the page loads with a plain script tag:

```bash
python3 tools/build_game_data.py
```

Run it again whenever the source files are replaced, and commit both. The generated file stores each level table as an array (index 0 is level 1), so a cost from level A to level B is a sum of one array slice. Untranslated entries and decorations are skipped.

## Run locally

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Progress is stored in the browser's `localStorage`.

## Observation data format

Each record identifies a category, exact item name or ID, destination level, normalized resource costs, normalized duration in minutes, and an optional verification source. New records also include an `observation` containing the values displayed in game, active reduction percentages, and modifier context. Re-saving the same category, item, and destination level updates that record. Import/export remains compatible with older records that contain only base values:

```json
{
  "schemaVersion": 2,
  "updatedAt": "2026-10-01T00:00:00.000Z",
  "records": []
}
```

Normalization is explicitly labeled as an estimate because the game's rounding rules are not yet known; the original observation is never discarded. The tracker does not invent missing requirements or bonuses. All progress and upgrade data is stored only in the player's browser unless it is explicitly exported.
