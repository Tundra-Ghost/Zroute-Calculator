# Plans

The in-site **Roadmap** page (`roadmap` array in `app.js`) is the short version. This file keeps the detail and the decisions behind it.

## Next

### Screenshot import
Upload game screenshots (building list, research tree, hero screen, resource totals) and fill in levels from the "Lv.X" text.
- Runs in the browser with an OCR library, so images never leave the device.
- Show what was read and let the user confirm before saving.
- Needs sample screenshots from Tanner to tune it.

## Planned

- **Server tracker.** Player counts, top power, arrivals and the event schedule. Needs a shared database.
- **Alliance tracker.** Power and membership over time. Members sync base stats. Needs a shared database.
- **VS tracker.** Daily VS scores per member and participation history. Model it on the P1MP VS dashboard (github.com/JeffxLabs/P1MP-VS): quota check, week-by-week grid, player profile, opponent scouting, trends.
- **Capitol war rankings.** Player and alliance rankings per Capitol event, like github.com/JeffxLabs/ZR-S117-Capitol. Could read Jeff's published JSON for S117 instead of capturing our own.

## Ideas

- Inventory and "can I afford it".
- Event calendar with reminders.
- Compare members' share links side by side for alliance leaders.
- VS point values for actions other than Hero EXP (not in the data yet).
- Translations.

## Decisions

- VS stage rules come from github.com/JeffxLabs/P1MP-VS (`data/source/vs_stages.json`). Hero EXP chests and the VS EXP rule come from zrouteredemption `data/hero_exp.json`. Squad rules and tips come from its `data/heroes_meta.json` (`data/source/squad.json`).
- Server time is taken as UTC−2, from the P1MP capture times. It is inferred.
- New pages live in `features.js`. Its data (EXP items, squads, used codes) is saved under its own browser key and is included in backups.

- Data comes from the game data export in `data/source/` and from github.com/JeffxLabs/zrouteredemption (gear, fighter, hero skills). We do not decrypt or modify the game.
- We do not read data from game accounts or network traffic. It breaks the game's terms and risks bans.
- Work goes straight to `main`. Bump the `?v=` version in `index.html` on every release.
- Buildings default to level 1.
- Auto-fill only raises levels. It picks the first building when a requirement allows "A or B".

## Open questions and data gaps

- Minister (capitol appointment) speed bonus values. Users type them in for now.
- Survivor data. None in any source yet.
- Alliance research costs.
- Hero level cap per HQ is inferred.
- Flat cost cut units (treated as a fixed amount per level) and the research "Barracks" copy (mapped to Soldier Training Camp) are inferred.
- Uranium and antibody have no icons.
- Gear icons: UR art is cropped from Tanner's screenshot. SR and SSR reuse it, recolored. Need SR/SSR gear screenshots for the real art.
