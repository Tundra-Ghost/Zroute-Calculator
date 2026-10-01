# Z Route Command Center

A responsive, browser-based progress tracker and planning dashboard for **Z Route: Redemption** players. Create a local commander profile, record building levels, track personal and alliance research, and maintain a hero roster from one fully navigable interface.

## Run locally

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Progress is stored in the browser's `localStorage`.

## Data note

The tracker deliberately does not calculate power, costs, times, requirements, or bonuses until those values can be verified. Hero names reference the linked community wiki, while all levels are entered by the user and stored only in their browser.
