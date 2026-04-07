// ============================================================
// YARD SALE MODEL - Shared Automatic Simulation Engine
// ============================================================
// Configured by each HTML page via window.SIM_CONFIG before load

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var stats_canvas = document.getElementById("stats_canvas");
var stats_ctx = stats_canvas.getContext("2d");

// --- CONFIG (overridden per page) ---
var NUM_PEOPLE = window.SIM_CONFIG ? window.SIM_CONFIG.numPeople : 2;
var START_WEALTH = 100;
var WIN_FRACTION = window.SIM_CONFIG ? (window.SIM_CONFIG.winFraction || 0.20) : 0.20;
var LOSE_FRACTION = window.SIM_CONFIG ? (window.SIM_CONFIG.loseFraction || (1/6)) : (1/6);
var WEALTH_TAX = window.SIM_CONFIG ? (window.SIM_CONFIG.wealthTax || 0) : 0;
var SHOW_BAR_CHART = NUM_PEOPLE > 2;
var SPEED = 1; // flips per frame

// --- COLORS ---
var PERSON_COLORS = [
	"#5dadec", "#e8b84b", "#e86b6b", "#6be88a", "#c76be8",
	"#e8a86b", "#6bcde8", "#b8e86b", "#e86bb8", "#8a6be8"
];
var PERSON_DARK = [
	"#3a7cbf", "#b8892a", "#b84444", "#44b85a", "#9444b8",
	"#b87a44", "#449cb8", "#8ab844", "#b8448a", "#5a44b8"
];

// --- STATE ---
var wealth = [];
var wHistory = [];
var giniHistory = [];
var flipCount = 0;
var START_SIM = false;
var maxWealth = START_WEALTH * 2;

// Display smoothing for 2-person mode
var displayWealth = [];

function reset() {
	wealth = [];
	displayWealth = [];
	for (var i = 0; i < NUM_PEOPLE; i++) {
		wealth.push(START_WEALTH);
		displayWealth.push(START_WEALTH);
	}
	wHistory = [wealth.slice()];
	giniHistory = [0];
	flipCount = 0;
	START_SIM = false;
	maxWealth = START_WEALTH * 2;
	statsX = 0;
	if (stats_ctx) {
		stats_ctx.clearRect(0, 0, stats_canvas.width, stats_canvas.height);
	}
	updateButtons();
	if (window.onSimReset) window.onSimReset();
}

// --- SIMULATION STEP ---
function simStep() {
	// Pick two random different people
	var a = Math.floor(Math.random() * NUM_PEOPLE);
	var b;
	do { b = Math.floor(Math.random() * NUM_PEOPLE); } while (b === a);

	var poorer = Math.min(wealth[a], wealth[b]);
	if (poorer < 0.01) return;

	var stake;
	if (Math.random() < 0.5) {
		// Heads: richer pays poorer
		stake = WIN_FRACTION * poorer;
		if (wealth[a] > wealth[b] || (wealth[a] === wealth[b] && Math.random() < 0.5)) {
			wealth[a] -= stake;
			wealth[b] += stake;
		} else {
			wealth[b] -= stake;
			wealth[a] += stake;
		}
	} else {
		// Tails: poorer pays richer
		stake = LOSE_FRACTION * poorer;
		if (wealth[a] < wealth[b] || (wealth[a] === wealth[b] && Math.random() < 0.5)) {
			wealth[a] -= stake;
			wealth[b] += stake;
		} else {
			wealth[b] -= stake;
			wealth[a] += stake;
		}
	}

	// Wealth tax (redistribution)
	if (WEALTH_TAX > 0) {
		var pool = 0;
		for (var i = 0; i < NUM_PEOPLE; i++) {
			var tax = wealth[i] * WEALTH_TAX;
			wealth[i] -= tax;
			pool += tax;
		}
		var share = pool / NUM_PEOPLE;
		for (var i = 0; i < NUM_PEOPLE; i++) {
			wealth[i] += share;
		}
	}

	flipCount++;
}

// --- GINI COEFFICIENT ---
function calcGini() {
	var n = wealth.length;
	var sum = 0;
	var diffSum = 0;
	for (var i = 0; i < n; i++) {
		sum += wealth[i];
		for (var j = 0; j < n; j++) {
			diffSum += Math.abs(wealth[i] - wealth[j]);
		}
	}
	if (sum === 0) return 0;
	return diffSum / (2 * n * sum);
}

// --- DRAWING: 2-PERSON MODE ---
function drawRoundedRect(cx, x, y, w, h, r) {
	cx.beginPath();
	cx.moveTo(x + r, y);
	cx.lineTo(x + w - r, y);
	cx.quadraticCurveTo(x + w, y, x + w, y + r);
	cx.lineTo(x + w, y + h - r);
	cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	cx.lineTo(x + r, y + h);
	cx.quadraticCurveTo(x, y + h, x, y + h - r);
	cx.lineTo(x, y + r);
	cx.quadraticCurveTo(x, y, x + r, y);
	cx.closePath();
}

function drawPerson2(x, y, color, w, label) {
	// Head
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y - 20, 20, 0, Math.PI * 2);
	ctx.fill();
	// Body
	drawRoundedRect(ctx, x - 15, y + 2, 30, 35, 8);
	ctx.fill();
	// Eyes
	ctx.fillStyle = "#fff";
	ctx.beginPath(); ctx.arc(x - 6, y - 23, 4.5, 0, Math.PI * 2); ctx.fill();
	ctx.beginPath(); ctx.arc(x + 6, y - 23, 4.5, 0, Math.PI * 2); ctx.fill();
	ctx.fillStyle = "#333";
	ctx.beginPath(); ctx.arc(x - 5, y - 22, 2, 0, Math.PI * 2); ctx.fill();
	ctx.beginPath(); ctx.arc(x + 7, y - 22, 2, 0, Math.PI * 2); ctx.fill();
	// Mouth
	ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.beginPath();
	var ratio = w / START_WEALTH;
	if (ratio > 0.5) ctx.arc(x, y - 12, 7, 0.3, Math.PI - 0.3);
	else if (ratio > 0.2) { ctx.moveTo(x - 5, y - 10); ctx.lineTo(x + 5, y - 10); }
	else ctx.arc(x, y - 5, 7, Math.PI + 0.3, -0.3);
	ctx.stroke();
	// Label
	ctx.fillStyle = "#999"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
	ctx.fillText(label, x, y - 48);
}

function drawTwoPerson() {
	var W = canvas.width, H = canvas.height;
	var ax = W * 0.25, bx = W * 0.75, py = 80;
	var barW = 100, barH = 150, barTop = 160;

	// Smooth display
	displayWealth[0] += (wealth[0] - displayWealth[0]) * 0.15;
	displayWealth[1] += (wealth[1] - displayWealth[1]) * 0.15;

	drawPerson2(ax, py, PERSON_COLORS[0], wealth[0], "Alice");
	drawPerson2(bx, py, PERSON_COLORS[1], wealth[1], "Bob");

	// Bars
	var total = START_WEALTH * 2;
	for (var p = 0; p < 2; p++) {
		var cx = p === 0 ? ax : bx;
		var col = PERSON_DARK[p];
		var dw = displayWealth[p];
		var bh = (dw / total) * barH;
		if (bh < 1) bh = 1;

		ctx.fillStyle = "#1a1a1a";
		drawRoundedRect(ctx, cx - barW/2, barTop, barW, barH, 4);
		ctx.fill();
		ctx.fillStyle = col;
		ctx.save();
		drawRoundedRect(ctx, cx - barW/2, barTop, barW, barH, 4);
		ctx.clip();
		ctx.fillRect(cx - barW/2, barTop + barH - bh, barW, bh);
		ctx.restore();
		ctx.strokeStyle = "#444"; ctx.lineWidth = 1;
		drawRoundedRect(ctx, cx - barW/2, barTop, barW, barH, 4);
		ctx.stroke();

		ctx.fillStyle = "#ddd"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
		ctx.fillText("$" + dw.toFixed(0), cx, barTop + barH + 25);
	}

	// Flip count
	ctx.fillStyle = "#666"; ctx.font = "14px sans-serif"; ctx.textAlign = "center";
	ctx.fillText("flip #" + flipCount, W/2, barTop + barH + 50);
}

// --- DRAWING: BAR CHART MODE ---
function drawBarChart() {
	var W = canvas.width, H = canvas.height;
	var pad = 20;
	var barAreaW = W - pad * 2;
	var barAreaH = H - 60;
	var barTop = 40;

	// Sort indices by wealth descending
	var indices = [];
	for (var i = 0; i < NUM_PEOPLE; i++) indices.push(i);
	indices.sort(function (a, b) { return wealth[b] - wealth[a]; });

	// Find max for scaling
	var curMax = 0;
	for (var i = 0; i < NUM_PEOPLE; i++) {
		if (wealth[i] > curMax) curMax = wealth[i];
	}
	maxWealth += (Math.max(curMax * 1.2, START_WEALTH * 2) - maxWealth) * 0.05;

	var gap = 1;
	var barW = (barAreaW - gap * (NUM_PEOPLE - 1)) / NUM_PEOPLE;
	if (barW < 2) { barW = 2; gap = 0; }

	for (var k = 0; k < NUM_PEOPLE; k++) {
		var idx = indices[k];
		var x = pad + k * (barW + gap);
		var bh = (wealth[idx] / maxWealth) * barAreaH;
		if (bh < 1) bh = 1;

		var ci = idx % PERSON_COLORS.length;
		ctx.fillStyle = PERSON_DARK[ci];
		ctx.fillRect(x, barTop + barAreaH - bh, barW, bh);
	}

	// Axis line
	ctx.strokeStyle = "#555"; ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(pad, barTop + barAreaH);
	ctx.lineTo(pad + barAreaW, barTop + barAreaH);
	ctx.stroke();

	// Labels
	ctx.fillStyle = "#888"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
	ctx.fillText("Wealth Distribution (sorted richest \u2192 poorest)", W/2, 20);
	ctx.fillStyle = "#666"; ctx.font = "12px sans-serif";
	ctx.textAlign = "left";
	ctx.fillText("$" + maxWealth.toFixed(0), pad + 2, barTop + 10);
	ctx.fillText("$0", pad + 2, barTop + barAreaH - 3);
	ctx.textAlign = "right";
	ctx.fillText("flip #" + flipCount, pad + barAreaW - 2, barTop + 10);
}

// --- STATS GRAPH ---
var statsX = 0;
var STATS_W, STATS_H;
function initStats() {
	if (!stats_canvas) return;
	STATS_W = stats_canvas.width;
	STATS_H = stats_canvas.height;
}
initStats();

function drawStats() {
	if (!stats_canvas) return;

	if (SHOW_BAR_CHART) {
		// Gini over time
		drawGiniGraph();
	} else {
		// Wealth over time for 2 people
		drawWealthGraph();
	}
}

function drawWealthGraph() {
	stats_ctx.clearRect(0, 0, STATS_W, STATS_H);

	// Background
	stats_ctx.fillStyle = "#151515";
	drawRoundedRect(stats_ctx, 0, 0, STATS_W, STATS_H, 6);
	stats_ctx.fill();
	stats_ctx.strokeStyle = "#333"; stats_ctx.lineWidth = 1;
	drawRoundedRect(stats_ctx, 0, 0, STATS_W, STATS_H, 6);
	stats_ctx.stroke();

	// Center line
	stats_ctx.strokeStyle = "#333";
	stats_ctx.setLineDash([3, 3]);
	stats_ctx.beginPath();
	stats_ctx.moveTo(5, STATS_H / 2);
	stats_ctx.lineTo(STATS_W - 5, STATS_H / 2);
	stats_ctx.stroke();
	stats_ctx.setLineDash([]);

	if (wHistory.length < 2) {
		stats_ctx.fillStyle = "#555"; stats_ctx.font = "13px sans-serif"; stats_ctx.textAlign = "center";
		stats_ctx.fillText("wealth over time", STATS_W / 2, STATS_H / 2 + 5);
		return;
	}

	var pad = 10;
	var maxPts = STATS_W - pad * 2;
	var startIdx = Math.max(0, wHistory.length - maxPts);
	var numPts = wHistory.length - startIdx;
	var total = START_WEALTH * NUM_PEOPLE;

	for (var p = 0; p < 2; p++) {
		stats_ctx.strokeStyle = PERSON_COLORS[p];
		stats_ctx.lineWidth = 2;
		stats_ctx.beginPath();
		for (var i = startIdx; i < wHistory.length; i++) {
			var px = pad + ((i - startIdx) / Math.max(1, numPts - 1)) * (STATS_W - pad * 2);
			var py = STATS_H - pad - (wHistory[i][p] / total) * (STATS_H - pad * 2);
			if (i === startIdx) stats_ctx.moveTo(px, py); else stats_ctx.lineTo(px, py);
		}
		stats_ctx.stroke();
	}

	stats_ctx.fillStyle = "#555"; stats_ctx.font = "11px sans-serif";
	stats_ctx.textAlign = "left";
	stats_ctx.fillText("$" + total, 5, 13);
	stats_ctx.fillText("$0", 5, STATS_H - 4);
	stats_ctx.textAlign = "right";
	stats_ctx.fillText("flip #" + flipCount, STATS_W - 5, 13);
}

function drawGiniGraph() {
	stats_ctx.clearRect(0, 0, STATS_W, STATS_H);

	stats_ctx.fillStyle = "#151515";
	drawRoundedRect(stats_ctx, 0, 0, STATS_W, STATS_H, 6);
	stats_ctx.fill();
	stats_ctx.strokeStyle = "#333"; stats_ctx.lineWidth = 1;
	drawRoundedRect(stats_ctx, 0, 0, STATS_W, STATS_H, 6);
	stats_ctx.stroke();

	if (giniHistory.length < 2) {
		stats_ctx.fillStyle = "#555"; stats_ctx.font = "13px sans-serif"; stats_ctx.textAlign = "center";
		stats_ctx.fillText("inequality (Gini) over time", STATS_W / 2, STATS_H / 2 + 5);
		return;
	}

	var pad = 10;
	var maxPts = STATS_W - pad * 2;
	var startIdx = Math.max(0, giniHistory.length - maxPts);
	var numPts = giniHistory.length - startIdx;

	stats_ctx.strokeStyle = "#cc2727";
	stats_ctx.lineWidth = 2;
	stats_ctx.beginPath();
	for (var i = startIdx; i < giniHistory.length; i++) {
		var px = pad + ((i - startIdx) / Math.max(1, numPts - 1)) * (STATS_W - pad * 2);
		var py = STATS_H - pad - giniHistory[i] * (STATS_H - pad * 2);
		if (i === startIdx) stats_ctx.moveTo(px, py); else stats_ctx.lineTo(px, py);
	}
	stats_ctx.stroke();

	// "Perfect equality" line at 0
	stats_ctx.strokeStyle = "#444";
	stats_ctx.setLineDash([3, 3]);
	stats_ctx.beginPath();
	stats_ctx.moveTo(pad, STATS_H - pad);
	stats_ctx.lineTo(STATS_W - pad, STATS_H - pad);
	stats_ctx.stroke();
	stats_ctx.setLineDash([]);

	stats_ctx.fillStyle = "#555"; stats_ctx.font = "11px sans-serif";
	stats_ctx.textAlign = "left";
	stats_ctx.fillText("1.0 (max)", 5, 13);
	stats_ctx.fillText("0 (equal)", 5, STATS_H - 4);
	stats_ctx.textAlign = "right";
	stats_ctx.fillText("flip #" + flipCount, STATS_W - 5, 13);
}

// --- BUTTONS ---
function updateButtons() {
	var btn = document.getElementById("moving");
	if (btn) {
		btn.textContent = START_SIM ? "\u23F8 pause" : "\u25B6 play";
		btn.className = START_SIM ? "btn active" : "btn";
	}
}

window.writeStats = function () {
	var statsText = document.getElementById("stats_text");
	if (!statsText) return;
	if (SHOW_BAR_CHART) {
		var g = calcGini();
		statsText.innerHTML = "Gini: <b>" + g.toFixed(3) + "</b>";
	} else {
		statsText.innerHTML = "Alice: <b>$" + wealth[0].toFixed(1) + "</b> &nbsp; Bob: <b>$" + wealth[1].toFixed(1) + "</b>";
	}
};

// --- MAIN RENDER ---
var recordInterval = 0;
function render() {
	// Run simulation steps
	if (START_SIM) {
		for (var s = 0; s < SPEED; s++) {
			simStep();
		}
		recordInterval++;
		// Record history periodically
		var recordRate = NUM_PEOPLE > 10 ? 5 : 1;
		if (recordInterval >= recordRate) {
			recordInterval = 0;
			wHistory.push(wealth.slice());
			giniHistory.push(calcGini());
		}
		window.writeStats();
	}

	// Smooth display
	for (var i = 0; i < NUM_PEOPLE; i++) {
		displayWealth[i] += (wealth[i] - displayWealth[i]) * 0.15;
	}

	// Draw main canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (SHOW_BAR_CHART) {
		drawBarChart();
	} else {
		drawTwoPerson();
	}

	// Draw stats
	drawStats();
}

// --- INIT ---
reset();

window.requestAnimFrame = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function (cb) { window.setTimeout(cb, 1000 / 60); };
(function animloop() {
	requestAnimFrame(animloop);
	if (window.IS_IN_SIGHT) render();
})();
setInterval(function () {
	if (window.IS_IN_SIGHT) render();
}, 1000 / 60);
window.IS_IN_SIGHT = true;
