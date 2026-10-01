# Z Route Command Center

A responsive, browser-based progress tracker and planning dashboard for **Z Route: Redemption** players. Create a local commander profile, record building levels, track personal and alliance research, and manage detailed hero progression from one fully navigable interface.

The hero directory is grouped into Warrior, Assault, and Tactical classes and records rarity, formation type, ownership, HQ-based level caps, five-star shard progress, and the quality of all four equipment pieces. Skill slots are shown as placeholders until their individual level limits are available.

## Run locally

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Progress is stored in the browser's `localStorage`.

## Data note

The tracker deliberately does not calculate power, upgrade resource costs, times, requirements, or bonuses until those values can be verified. All levels and equipment selections are entered by the user and stored only in their browser.
