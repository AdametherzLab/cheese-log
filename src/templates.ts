import { Batch, BatchSummary } from './types';
import { buildBatchTimeline } from './timeline';
import { escapeHTML } from './utils';

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
          .filters { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
          .actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto">
          <h1>Cheese Batches</h1>
          
          <div class="filters">
            <form hx-get="/" hx-target="body">
              <select name="status" onchange="this.form.submit()">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pressing">Pressing</option>
                <option value="aging">Aging</option>
                <option value="completed">Completed</option>
              </select>
              <select name="milkType" onchange="this.form.submit()">
                <option value="">All Milk Types</option>
                <option value="Cow">Cow</option>
                <option value="Goat">Goat</option>
                <option value="Sheep">Sheep</option>
              </select>
            </form>
          </div>
          
          <form hx-post="/batches" hx-target="#batches">
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
                <h2>${escapeHTML(b.name)}</h2>
                <p>${escapeHTML(b.milkType)} • ${b.status}</p>
                <div class="actions">
                  <a href="/batches/${b.id}">View</a>
                  <a href="/batches/${b.id}/edit">Edit</a>
                  <button hx-delete="/batches/${b.id}" hx-target="closest .batch-card">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </body>
    </html>
  `;
}

export function renderEditBatchForm(batch: Batch) {
  return `
    <form hx-put="/batches/${batch.id}" hx-target="body">
      <input name="name" value="${escapeHTML(batch.name)}" required>
      <select name="milkType" required>
        <option value="Cow" ${batch.milkType === 'Cow' ? 'selected' : ''}>Cow</option>
        <option value="Goat" ${batch.milkType === 'Goat' ? 'selected' : ''}>Goat</option>
        <option value="Sheep" ${batch.milkType === 'Sheep' ? 'selected' : ''}>Sheep</option>
      </select>
      <input type="number" name="milkAmount" value="${batch.milkAmount}" required>
      <textarea name="notes">${escapeHTML(batch.notes || '')}</textarea>
      <button type="submit">Save Changes</button>
    </form>
  `;
}

export function renderBatchDetails(batch: Batch) {
  const timeline = buildBatchTimeline(batch);
  return `
    <div class="chart-container">
      <canvas id="tempChart"></canvas>
      <canvas id="phChart"></canvas>
    </div>
    <div class="actions">
      <button hx-get="/batches/${batch.id}/edit" hx-target="body">Edit Batch</button>
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
