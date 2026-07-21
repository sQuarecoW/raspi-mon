# raspi-mon — Stream Deck plugin

Shows live [raspi-mon](../) metrics on Stream Deck keys: CPU load, memory,
CPU temperature and uptime/host. Each key is one configurable action — pick the
Raspberry Pi host and which metric to show. Pressing a key opens the full
dashboard in your browser.

The plugin runs on the **desktop** where the Stream Deck software runs
(macOS/Windows) and connects to your Pi over the network via the same Socket.io
stream the dashboard uses. No changes to the Pi are needed.

## Requirements

- [Stream Deck software](https://www.elgato.com/downloads) 6.5+
- Node.js 20+ on your desktop (for building)
- The Elgato CLI (installed as a dev dependency below)

## Build & install

```sh
cd streamdeck-plugin
npm install
npm run build        # bundles src/ -> com.squarecow.raspi-mon.sdPlugin/bin/plugin.js
npm run validate     # sanity-check the plugin against the SDK schema
npm run pack         # produces dist/com.squarecow.raspi-mon.streamDeckPlugin
```

Double-click the generated `.streamDeckPlugin` file to install it into Stream
Deck. For development you can instead link it live:

```sh
streamdeck link com.squarecow.raspi-mon.sdPlugin
streamdeck restart com.squarecow.raspi-mon
```

## Use

1. Drag the **raspi-mon → Metric** action onto a key.
2. In the Property Inspector set the **host** (e.g. `raspberrypi.local`),
   **port** (default `1608`) and pick a **metric**.
3. Repeat for as many keys as you like — CPU on one, temp on another, etc.

## Layout

```
src/
  plugin.ts          registers the action and connects to Stream Deck
  actions/metric.ts  the configurable button (subscribe + repaint)
  pi-connection.ts   one shared Socket.io connection per Pi host
  render.ts          draws the button face (SVG) for each metric
com.squarecow.raspi-mon.sdPlugin/
  manifest.json      plugin + action definition
  ui/metric.html     Property Inspector (host / port / metric)
  imgs/              icons
  bin/plugin.js      build output (generated)
```

## Notes

- The Property Inspector loads `sdpi-components` from a CDN, so the desktop needs
  internet the first time you open it.
- Icons are SVG. That is fine for personal use; the Elgato Marketplace expects
  PNG, so swap `imgs/**` if you ever publish.
- If `npm install` complains about a package version, install the latest of the
  Elgato packages explicitly:
  `npm i @elgato/streamdeck@latest && npm i -D @elgato/cli@latest`.
