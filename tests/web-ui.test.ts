import { describe, it, expect } from 'bun:test';
import app from '../src/web-ui';
import { BatchStorage } from '../src/storage';

const testStorage = new BatchStorage({ dataDir: './test-data' });

describe('Web UI', () => {
  it('should list batches', async () => {
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Cheese Batches');
  });

  it('should create new batch', async () => {
    const form = new FormData();
    form.append('name', 'Test Batch');
    form.append('milkType', 'Cow');
    form.append('milkAmount', '10');

    const req = new Request('http://localhost/batches', {
      method: 'POST',
      body: form
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(201);
    expect(testStorage.listBatches()).toHaveLength(1);
  });

  it('should add temperature log', async () => {
    const batch = testStorage.listBatches()[0];
    const form = new FormData();
    form.append('type', 'temperature');
    form.append('value', '32.5');

    const req = new Request(`http://localhost/batches/${batch.id}/logs`, {
      method: 'POST',
      body: form
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    expect(testStorage.loadBatch(batch.id)?.temperatureLogs).toHaveLength(1);
  });
});