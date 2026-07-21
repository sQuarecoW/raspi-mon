#!/usr/bin/env bash
#
# raspi-mon updater.
#
# Pulls the latest code, refreshes production dependencies and restarts the
# service. Run it from anywhere inside the checkout:
#
#     ./scripts/update.sh
#
set -euo pipefail

SERVICE_NAME="raspi-mon"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "Updating raspi-mon in $REPO_DIR"

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm is not installed. On Debian / Raspberry Pi OS: 'sudo apt install npm'" >&2
	echo "(or install node + npm together via NodeSource)." >&2
	exit 1
fi

echo "==> git pull"
git pull --ff-only

echo "==> installing production dependencies"
if [ -f package-lock.json ]; then
	npm ci --omit=dev
else
	npm install --omit=dev
fi

echo "==> restarting service"
sudo systemctl restart "$SERVICE_NAME"

echo "Done. Current status:"
sudo systemctl --no-pager --lines=0 status "$SERVICE_NAME" || true
