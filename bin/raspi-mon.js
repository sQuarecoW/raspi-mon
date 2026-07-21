#!/usr/bin/env node

process.title = 'raspi-mon'

import Monitor from '../src/index.js'

// A single process is plenty for a monitor; systemd's `Restart=always`
// (see README) handles restarts, so there's no need for a cluster.
new Monitor()

