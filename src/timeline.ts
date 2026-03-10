import type { Batch, TemperatureLog, PHLog, RennetAddition, PressingStage, AgingEntry } from "./types.js";
import { escapeHTML } from "./utils.js";

/** A single event on the batch timeline */
export interface TimelineEvent {
  readonly timestamp: number;
  readonly time: string;
  readonly type: "temperature" | "ph" | "rennet" | "pressing" | "aging" | "culture" | "start";
  readonly label: string;
  readonly value?: number;
  readonly unit?: string;
  readonly note?: string;
}

/** Complete timeline data for a batch */
export interface BatchTimeline {
  readonly batchId: string;
  readonly batchName: string;
  readonly startTime: string;
  readonly events: ReadonlyArray<TimelineEvent>;
  readonly temperatureSeries: ReadonlyArray<{ time: string; value: number }>;
  readonly phSeries: ReadonlyArray<{ time: string; value: number }>;
  readonly durationMinutes: number;
}

/**
 * Build a chronological timeline of all events in a batch.
 * Merges pH, temperature, rennet, pressing, aging, and culture logs
 * into a single sorted list of TimelineEvents.
 * @param batch - The batch to build a timeline for
 * @returns A BatchTimeline with all events sorted chronologically
 */
export function buildBatchTimeline(batch: Batch): BatchTimeline {
  const events: TimelineEvent[] = [];
  const startMs = new Date(batch.startTime).getTime();

  // Start event
  events.push({
    timestamp: startMs,
    time: new Date(batch.startTime).toISOString(),
    type: "start",
    label: `Batch started: ${batch.name} (${batch.milkType}, ${batch.milkAmount} L)`,
  });

  // Cultures (no timestamp on cultures, so pin to start)
  for (const c of batch.cultures) {
    events.push({
      timestamp: startMs,
      time: new Date(batch.startTime).toISOString(),
      type: "culture",
      label: `Culture added: ${c.name} (${c.type})`,
      note: c.description,
    });
  }

  // Temperature logs
  for (const log of batch.temperatureLogs) {
    const ts = new Date(log.timestamp).getTime();
    events.push({
      timestamp: ts,
      time: new Date(log.timestamp).toISOString(),
      type: "temperature",
      label: `Temperature: ${log.value}°C`,
      value: log.value,
      unit: "°C",
      note: log.note,
    });
  }

  // pH logs
  for (const log of batch.phLogs) {
    const ts = new Date(log.timestamp).getTime();
    events.push({
      timestamp: ts,
      time: new Date(log.timestamp).toISOString(),
      type: "ph",
      label: `pH: ${log.value}`,
      value: log.value,
      note: log.note,
    });
  }

  // Rennet additions
  for (const r of batch.rennetAdditions) {
    const ts = new Date(r.timestamp).getTime();
    events.push({
      timestamp: ts,
      time: new Date(r.timestamp).toISOString(),
      type: "rennet",
      label: `Rennet: ${r.amount} mL ${r.type}${r.strength ? ` (${r.strength} IMCU)` : ""}`,
      value: r.amount,
      unit: "mL",
      note: r.note,
    });
  }

  // Pressing stages
  for (const p of batch.pressingStages) {
    const ts = new Date(p.startTime).getTime();
    events.push({
      timestamp: ts,
      time: new Date(p.startTime).toISOString(),
      type: "pressing",
      label: `Pressing: ${p.weight} kg for ${p.duration} min${p.flipped ? " (flipped)" : ""}`,
      value: p.weight,
      unit: "kg",
      note: p.note,
    });
  }

  // Aging entries
  for (const a of batch.agingSchedule) {
    const ts = new Date(a.date).getTime();
    events.push({
      timestamp: ts,
      time: new Date(a.date).toISOString(),
      type: "aging",
      label: `Aging: ${a.temperature}°C${a.humidity != null ? `, ${a.humidity}% RH` : ""}${a.turned ? " (turned)" : ""}`,
      value: a.temperature,
      unit: "°C",
      note: a.note,
    });
  }

  // Sort by timestamp, stable
  events.sort((a, b) => a.timestamp - b.timestamp);

  // Build series
  const temperatureSeries = batch.temperatureLogs.map((log) => ({
    time: new Date(log.timestamp).toISOString(),
    value: log.value,
  }));

  const phSeries = batch.phLogs.map((log) => ({
    time: new Date(log.timestamp).toISOString(),
    value: log.value,
  }));

  // Duration
  const lastTs = events.length > 0 ? events[events.length - 1].timestamp : startMs;
  const durationMinutes = Math.max(0, Math.round((lastTs - startMs) / 60000));

  return {
    batchId: batch.id,
    batchName: batch.name,
    startTime: new Date(batch.startTime).toISOString(),
    events,
    temperatureSeries,
    phSeries,
    durationMinutes,
  };
}

/**
 * Filter timeline events by type.
 * @param timeline - The batch timeline
 * @param types - Event types to include
 * @returns Filtered array of timeline events
 */
export function filterTimelineEvents(
  timeline: BatchTimeline,
  types: ReadonlyArray<TimelineEvent["type"]>
): ReadonlyArray<TimelineEvent> {
  const typeSet = new Set(types);
  return timeline.events.filter((e) => typeSet.has(e.type));
}

/**
 * Generate a self-contained HTML page that visualizes the batch timeline
 * with interactive Chart.js charts for pH and temperature, plus an event log.
 * @param timeline - The batch timeline data
 * @returns A complete HTML string
 */
export function renderTimelineHTML(timeline: BatchTimeline): string {
  const eventsJSON = JSON.stringify(timeline.events);
  const tempJSON = JSON.stringify(timeline.temperatureSeries);
  const phJSON = JSON.stringify(timeline.phSeries);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Batch Timeline: ${escapeHTML(timeline.batchName)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 20px; }
  h1 { text-align: center; margin-bottom: 4px; font-size: 1.6rem; }
  .subtitle { text-align: center; color: #888; margin-bottom: 20px; font-size: 0.9rem; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  @media (max-width: 768px) { .charts { grid-template-columns: 1fr; } }
  .chart-card { background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; }
  .chart-card h2 { font-size: 1rem; margin-bottom: 8px; color: #aaa; }
  canvas { width: 100% !important; max-height: 260px; }
  .filters { text-align: center; margin-bottom: 16px; }
  .filters button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #e0e0e0; padding: 6px 14px; border-radius: 20px; margin: 3px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
  .filters button.active { background: #4361ee; border-color: #4361ee; }
  .filters button:hover { background: rgba(67,97,238,0.4); }
  .timeline { max-width: 700px; margin: 0 auto; position: relative; padding-left: 30px; }
  .timeline::before { content: ''; position: absolute; left: 14px; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.15); }
  .event { position: relative; margin-bottom: 12px; padding: 10px 14px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #4361ee; }
  .event[data-type="temperature"] { border-left-color: #ff6b6b; }
  .event[data-type="ph"] { border-left-color: #51cf66; }
  .event[data-type="rennet"] { border-left-color: #ffd43b; }
  .event[data-type="pressing"] { border-left-color: #cc5de8; }
  .event[data-type="aging"] { border-left-color: #20c997; }
  .event[data-type="culture"] { border-left-color: #ff922b; }
  .event[data-type="start"] { border-left-color: #4361ee; }
  .event .dot { position: absolute; left: -24px; top: 14px; width: 10px; height: 10px; border-radius: 50%; background: #4361ee; }
  .event[data-type="temperature"] .dot { background: #ff6b6b; }
  .event[data-type="ph"] .dot { background: #51cf66; }
  .event[data-type="rennet"] .dot { background: #ffd43b; }
  .event[data-type="pressing"] .dot { background: #cc5de8; }
  .event[data-type="aging"] .dot { background: #20c997; }
  .event[data-type="culture"] .dot { background: #ff922b; }
  .event .time { font-size: 0.75rem; color: #888; }
  .event .label { font-size: 0.9rem; margin-top: 2px; }
  .event .note { font-size: 0.8rem; color: #aaa; margin-top: 2px; font-style: italic; }
  .summary { text-align: center; color: #888; margin-top: 20px; font-size: 0.85rem; }
</style>
</head>
<body>
<h1>🧀 ${escapeHTML(timeline.batchName)}</h1>
<p class="subtitle">Started ${escapeHTML(timeline.startTime)} · Duration: ${timeline.durationMinutes} min · ${timeline.events.length} events</p>

<div class="charts">
  <div class="chart-card"><h2>Temperature (°C)</h2><canvas id="tempChart"></canvas></div>
  <div class="chart-card"><h2>pH</h2><canvas id="phChart"></canvas></div>
</div>

<div class="filters" id="filters"></div>
<div class="timeline" id="timeline"></div>
<p class="summary" id="summary"></p>

<script>
const events = ${eventsJSON};
const tempData = ${tempJSON};
const phData = ${phJSON};
const types = ['start','culture','temperature','ph','rennet','pressing','aging'];
const activeTypes = new Set(types);

function initCharts() {
  const chartOpts = (label, color, data, yLabel) => ({
    type: 'line',
    data: {
      labels: data.map(d => new Date(d.time).toLocaleTimeString()),
      datasets: [{ label, data: data.map(d => d.value), borderColor: color, backgroundColor: color + '33', fill: true, tension: 0.3, pointRadius: 4 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { title: { display: true, text: yLabel, color: '#888' }, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
  if (tempData.length > 0) new Chart(document.getElementById('tempChart'), chartOpts('Temperature', '#ff6b6b', tempData, '°C'));
  else document.getElementById('tempChart').parentElement.innerHTML += '<p style="color:#666;text-align:center">No temperature data</p>';
  if (phData.length > 0) new Chart(document.getElementById('phChart'), chartOpts('pH', '#51cf66', phData, 'pH'));
  else document.getElementById('phChart').parentElement.innerHTML += '<p style="color:#666;text-align:center">No pH data</p>';
}

function renderFilters() {
  const container = document.getElementById('filters');
  container.innerHTML = '';
  types.forEach(t => {
    const btn = document.createElement('button');
    btn.textContent = t;
    btn.className = activeTypes.has(t) ? 'active' : '';
    btn.onclick = () => { activeTypes.has(t) ? activeTypes.delete(t) : activeTypes.add(t); renderFilters(); renderTimeline(); };
    container.appendChild(btn);
  });
}

function renderTimeline() {
  const container = document.getElementById('timeline');
  const filtered = events.filter(e => activeTypes.has(e.type));
  container.innerHTML = filtered.map(e => {
    const time = new Date(e.time).toLocaleString();
    return '<div class="event" data-type="' + e.type + '"><div class="dot"></div><div class="time">' + time + '</div><div class="label">' + escapeHTML(e.label) + '</div>' + (e.note ? '<div class="note">' + escapeHTML(e.note) + '</div>' : '') + '</div>';
  }).join('');
  document.getElementById('summary').textContent = 'Showing ' + filtered.length + ' of ' + events.length + ' events';
}

function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

initCharts(); renderFilters(); renderTimeline();
</script>
</body>
</html>`;
}
