# Z Route Command Center

A responsive, browser-based progress tracker and planning dashboard for **Z Route: Redemption** players. It provides HQ-level-aware estimates, upgrade tracking, research summaries, hero formation details, and squad analytics.

## Run locally

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`. Progress is stored in the browser's `localStorage`.

## Data note

The linked community wiki is currently incomplete. Values in this first version are clearly presented as planning estimates and sample profile data; the data model is isolated in `app.js` so verified game values can be substituted as community research becomes available.
