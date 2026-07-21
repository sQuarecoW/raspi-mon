# raspi-mon

A lightweight Raspberry Pi monitor. A small Node.js service reads CPU, memory,
temperature, processes and system info via
[`systeminformation`](https://systeminformation.io/) and streams it over
Socket.io to a build-less dashboard (vanilla JS + [uPlot](https://github.com/leeoniya/uPlot)).

The dashboard is served on **port 1608**: `http://<pi-ip>:1608/`

## Requirements

- Node.js 18 or newer. On Raspberry Pi OS / Debian, install a current version
  via [NodeSource](https://github.com/nodesource/distributions):
  ```sh
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

## Install (as a systemd service)

```sh
git clone https://github.com/sQuarecoW/raspi-mon.git
cd raspi-mon
./scripts/install.sh
```

`install.sh` installs production dependencies, writes a systemd unit (using the
current user and checkout path — no hand-editing), and enables + starts the
service so it comes back on boot. It is safe to re-run.

When it finishes it prints the dashboard URL and the handy commands:

```sh
sudo systemctl status raspi-mon     # is it running?
sudo journalctl -f -u raspi-mon     # follow the logs
```

## Update

```sh
./scripts/update.sh
```

Pulls the latest code, refreshes dependencies and restarts the service.

## Development

Run the server directly (serves the dashboard from `web/`):

```sh
npm install
npm start          # http://localhost:1608/
```

## Project layout

```
bin/     service entry point
src/     Node backend (Express server + Socket.io monitor loop)
web/     dashboard (static: index.html, app.js, styles.css, vendored uPlot)
scripts/ install.sh / update.sh
```
