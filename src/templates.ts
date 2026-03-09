import { Batch, BatchSummary } from './types';
import { buildBatchTimeline } from './timeline';

export function renderBatchList(batches: BatchSummary[]) {
  return `
    <!DOCTYPE html>
    <html data-theme="dark" hx-boost="true">
      <head>
        <title>Cheese Batches</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1"></script>
        <style>
          .batch-card { background: #1a1a1a; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
          .chart-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto">
          <h1>Cheese Batches</h1>
          <form hx-post="/batches" hx-target="body">
            <input name="name" placeholder="Batch name" required>
            <select name="milkType" required>
              <option value="Cow">Cow</option>
              <option value="Goat">Goat</option>
              <option value="Sheep">Sheep</option>
            </select>
            <input type="number" name="milkAmount" placeholder="Liters" required>
            <button type="submit">Create Batch</button>
          </form>
          <div id="batches">
            ${batches.map(b => `
              <div class="batch-card">
                <h2>${b.name}</h2>
                <p>${b.milkType} • ${b.status}</p>
                <a href="/batches/${b.id}">View Details</a>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderBatchDetails(batch: Batch) {
  const timeline = buildBatchTimeline(batch);
  return `
    <div class="chart-container">
      <canvas id="tempChart"></canvas>
      <canvas id="phChart"></canvas>
    </div>
    <form hx-post="/batches/${batch.id}/logs" hx-target="this">
      <select name="type">
        <option value="temperature">Temperature</option>
        <option value="ph">pH</option>
      </select>
      <input type="number" step="0.1" name="value" required>
      <input type="text" name="note" placeholder="Note">
      <button type="submit">Add Log</button>
    </form>
    <script>
      new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: {
          labels: ${JSON.stringify(timeline.temperatureSeries.map(s => new Date(s.time).toLocaleTimeString()))},
          datasets: [{ data: ${JSON.stringify(timeline.temperatureSeries.map(s => s.value))} }]
        }
      });
      new Chart(document.getElementById('phChart'), {
        type: 'line',
        data: {
          labels: ${JSON.stringify(timeline.phSeries.map(s => new Date(s.time).toLocaleTimeString()))},
          datasets: [{ data: ${JSON.stringify(timeline.phSeries.map(s => s.value))} }]
        }
      });
    </script>
  `;
}