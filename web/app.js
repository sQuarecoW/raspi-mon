'use strict';

/* ------------------------------------------------------------------ helpers */

const $ = (id) => document.getElementById(id);

const bytes = (n) => {
	if (n == null || isNaN(n)) return '—';
	const u = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;
	while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
	return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
};

// green -> amber -> red as fraction goes 0 -> 1
const heatColor = (frac) => {
	const f = Math.max(0, Math.min(1, frac));
	const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
	const green = [34, 197, 94], amber = [245, 158, 11], red = [239, 68, 68];
	const c = f < 0.5 ? lerp(green, amber, f / 0.5) : lerp(amber, red, (f - 0.5) / 0.5);
	return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

const uptimeStr = (s) => {
	if (s == null) return '—';
	s = Math.floor(s);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const parts = [];
	if (d) parts.push(`${d}d`);
	if (h || d) parts.push(`${h}h`);
	parts.push(`${m}m`);
	return parts.join(' ');
};

/* ---------------------------------------------------------------- uPlot glue */

// Grey that reads on both light and dark themes.
const AXIS = 'rgba(128,138,150,0.9)';
const GRID = 'rgba(128,138,150,0.14)';

function streamChart(el, { color, fill, unit, range, decimals = 1 }) {
	const fmt = (v) => (v == null ? '--' : `${v.toFixed(decimals)}${unit}`);
	const opts = {
		width: el.clientWidth || 300,
		height: el.clientHeight || 180,
		padding: [10, 10, 0, 0],
		legend: { show: false },
		cursor: { points: { size: 6 }, y: false },
		scales: { x: { time: true }, y: range ? { range } : {} },
		axes: [
			{ stroke: AXIS, grid: { stroke: GRID, width: 1 }, ticks: { stroke: GRID }, size: 30 },
			{ stroke: AXIS, grid: { stroke: GRID, width: 1 }, ticks: { stroke: GRID }, size: 44,
			  values: (u, ticks) => ticks.map((v) => v + unit) },
		],
		series: [
			{},
			{ stroke: color, fill, width: 2, points: { show: false }, value: (u, v) => fmt(v) },
		],
	};
	const chart = new uPlot(opts, [[], []], el);

	new ResizeObserver(() => chart.setSize({ width: el.clientWidth, height: el.clientHeight }))
		.observe(el);

	// The server streams deltas: a full history once ("…:init"), then a single
	// new point per tick. We keep our own capped buffer and re-render from it.
	const CAP = 60;
	const xs = [];
	const ys = [];

	chart.init = (rows, pick) => {
		xs.length = 0;
		ys.length = 0;
		for (const r of rows) { xs.push(r.time / 1000); ys.push(pick(r)); } // uPlot wants seconds
		chart.setData([xs, ys]);
	};

	chart.append = (row, pick) => {
		xs.push(row.time / 1000);
		ys.push(pick(row));
		if (xs.length > CAP) { xs.shift(); ys.shift(); }
		chart.setData([xs, ys]);
	};

	return chart;
}

const cpuChart = streamChart($('cpu-chart'), {
	color: '#3b82f6', fill: 'rgba(59,130,246,0.14)', unit: '%', range: [0, 100],
});
const memChart = streamChart($('mem-chart'), {
	color: '#8b5cf6', fill: 'rgba(139,92,246,0.14)', unit: '%', range: [0, 100],
});
const tempChart = streamChart($('temp-chart'), {
	color: '#f59e0b', fill: 'rgba(245,158,11,0.14)', unit: '°', range: [20, 90],
});

/* -------------------------------------------------------------------- socket */

const socket = io(); // same-origin; server auto-serves the client at /socket.io/

socket.on('connect', () => {
	$('conn-dot').classList.add('on');
	$('conn-dot').title = 'connected';
	socket.emit('getSystemInfo');
});

socket.on('disconnect', () => {
	$('conn-dot').classList.remove('on');
	$('conn-dot').title = 'disconnected';
});

// --- CPU load ---------------------------------------------------------------
const cpuPick = (r) => r.currentLoad;
const cpuLabel = (r) => { if (r) $('cpu-val').textContent = `${r.currentLoad.toFixed(1)}%`; };
socket.on('cpu:init', (rows) => { cpuChart.init(rows, cpuPick); cpuLabel(rows[rows.length - 1]); });
socket.on('cpu', (row) => { cpuChart.append(row, cpuPick); cpuLabel(row); });

// --- Memory -----------------------------------------------------------------
// Real usage excludes reclaimable disk cache: total - available (like `free`
// and top's "avail Mem"). Falls back to `used` if the server didn't send it.
const memUsed = (r) => (r.available != null ? r.total - r.available : r.used);
const memPick = (r) => (memUsed(r) / r.total) * 100;
const memLabel = (r) => {
	if (!r) return;
	$('mem-val').textContent = `${memPick(r).toFixed(0)}%`;
	$('mem-detail').textContent = `${bytes(memUsed(r))} / ${bytes(r.total)} used`;
};
socket.on('memory:init', (rows) => { memChart.init(rows, memPick); memLabel(rows[rows.length - 1]); });
socket.on('memory', (row) => { memChart.append(row, memPick); memLabel(row); });

// --- Disk -------------------------------------------------------------------
socket.on('disk', (d) => {
	if (!d || !d.total) return;
	const pct = d.use != null ? d.use : (d.used / d.total) * 100;
	$('disk-val').textContent = `${Math.round(pct)}%`;
	const fill = $('disk-fill');
	fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
	fill.style.background = heatColor(pct / 100);
	const mount = d.mount && d.mount !== '/' ? ` (${d.mount})` : '';
	$('disk-detail').textContent = `${bytes(d.used)} / ${bytes(d.total)} used${mount}`;
});

// --- CPU temperature --------------------------------------------------------
// A host without a sensor reports null/0; keep the axis but show a dash.
const tempPick = (r) => r.main;
const tempLabel = (r) => { if (r) $('temp-val').textContent = r.main ? `${r.main.toFixed(1)}°C` : 'n/a'; };
socket.on('temp:init', (rows) => { tempChart.init(rows, tempPick); tempLabel(rows[rows.length - 1]); });
socket.on('temp', (row) => { tempChart.append(row, tempPick); tempLabel(row); });

socket.on('systemTime', (t) => {
	if (!t) return;
	$('uptime').textContent = uptimeStr(t.uptime);
	if (t.current) $('clock').textContent = new Date(t.current).toLocaleTimeString();
});

socket.on('systemInfo', (info) => {
	if (!info) return;
	const os = info.osInfo || {};
	const sys = info.system || {};
	const net = info.networkInterfaces || {};

	if (os.hostname) $('hostname').textContent = os.hostname;
	const model = [sys.manufacturer, sys.model].filter(Boolean).join(' ');
	$('model').textContent = model;

	const rows = [
		['OS', [os.distro, os.release].filter(Boolean).join(' ')],
		['Codename', os.codename],
		['Interface', net.iface],
		['IP', net.ip4],
	].filter(([, v]) => v);

	$('sysinfo').innerHTML = rows
		.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
		.join('');
});

socket.on('processList', (list) => {
	const body = $('proc-body');
	if (!list || !list.length) return;
	body.innerHTML = list
		.map((p) => `<tr>
			<td>${p.name}</td>
			<td class="num">${p.cpu}</td>
			<td class="num">${p.memory}</td>
			<td class="num muted">${p.pid}</td>
		</tr>`)
		.join('');
});
