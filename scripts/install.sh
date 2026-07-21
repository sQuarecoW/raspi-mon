#!/usr/bin/env bash
#
# raspi-mon installer.
#
# Installs production dependencies and registers raspi-mon as a systemd
# service that starts on boot. Safe to re-run: it just refreshes everything.
#
# Usage (from a checkout of the repo):
#     git clone https://github.com/sQuarecoW/raspi-mon.git
#     cd raspi-mon
#     ./scripts/install.sh
#
set -euo pipefail

SERVICE_NAME="raspi-mon"
PORT=1608

# --- locate the repo (this script lives in <repo>/scripts) --------------------
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The user the service should run as: the human invoking the script, even when
# it is run via sudo.
RUN_USER="${SUDO_USER:-$(id -un)}"

echo "raspi-mon installer"
echo "  repo : $REPO_DIR"
echo "  user : $RUN_USER"
echo

# --- prerequisites ------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
	echo "ERROR: node is not installed." >&2
	echo "Install a current Node.js (18+) first, e.g. via NodeSource:" >&2
	echo "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2
	exit 1
fi

NODE_BIN="$(command -v node)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
	echo "ERROR: Node.js $NODE_MAJOR is too old; raspi-mon needs 18 or newer." >&2
	exit 1
fi
echo "Using node $($NODE_BIN -v) at $NODE_BIN"

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm is not installed (found node but not npm)." >&2
	echo "On Raspberry Pi OS the 'nodejs' apt package does not bundle npm." >&2
	echo "Install a current Node.js (node + npm together) via NodeSource:" >&2
	echo "  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2
	exit 1
fi

# --- dependencies (production only) -------------------------------------------
echo
echo "Installing production dependencies..."
cd "$REPO_DIR"
if [ -f package-lock.json ]; then
	npm ci --omit=dev
else
	npm install --omit=dev
fi

# --- systemd unit -------------------------------------------------------------
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
echo
echo "Writing systemd unit to $UNIT_PATH (needs sudo)..."

sudo tee "$UNIT_PATH" >/dev/null <<UNIT
[Unit]
Description=raspi-mon (Raspberry Pi monitor)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${REPO_DIR}
ExecStart=${NODE_BIN} ${REPO_DIR}/bin/raspi-mon.js
Restart=always
RestartSec=5
KillMode=process

[Install]
WantedBy=multi-user.target
UNIT

echo "Reloading systemd and (re)starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# --- done ---------------------------------------------------------------------
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
echo "Done. raspi-mon is running."
echo "  Dashboard : http://${IP:-<pi-ip>}:${PORT}/"
echo "  Status    : sudo systemctl status ${SERVICE_NAME}"
echo "  Logs      : sudo journalctl -f -u ${SERVICE_NAME}"
echo "  Update    : ./scripts/update.sh"
