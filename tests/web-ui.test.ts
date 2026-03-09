import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../src/web-ui';
import { BatchStorage } from '../src/storage';

const testStorage = new BatchStorage({ dataDir: './test-data' });

describe('Web UI', () => {
  beforeEach(() => {
    testStorage.deleteBatch('test-batch-1');
    testStorage.deleteBatch('test-batch-2');
  });

  afterEach(() => {
    if (Bun.file('./test-data').exists()) {
      Bun.spawnSync(['rm', '-rf', './test-data']);
    }
  });

  it('should create and list batches', async () => {
    const form = new FormData();
    form.append('name', 'Test Batch');
    form.append('milkType', 'Cow');
    form.append('milkAmount', '10');

    let res = await app.request(new Request('http://localhost/batches', {
      method: 'POST',
      body: form
    }));
    expect(res.status).toBe(201);
    expect(testStorage.listBatches()).toHaveLength(1);
  });

  it('should update batch details', async () => {
    const batch = testStorage.loadBatch(testStorage.listBatches()[0].id);
    const form = new FormData();
    form.append('name', 'Updated Name');
    form.append('milkType', 'Goat');

    const res = await app.request(new Request(`http://localhost/batches/${batch!.id}`, {
      method: 'PUT',
      body: form
    }));
    expect(res.status).toBe(200);
    const updated = testStorage.loadBatch(batch!.id);
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.milkType).toBe('Goat');
  });

  it('should delete batches', async () => {
    const batch = testStorage.listBatches()[0];
    const res = await app.request(new Request(`http://localhost/batches/${batch.id}`, {
      method: 'DELETE'
    }));
    expect(res.status).toBe(200);
    expect(testStorage.listBatches()).toHaveLength(0);
  });

  it('should filter batches by status', async () => {
    const res = await app.request(new Request('http://localhost/?status=active'));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Active');
  });

  it('should prevent XSS in batch names', async () => {
    const form = new FormData();
    form.append('name', '<script>alert(1)</script>');
    form.append('milkType', 'Cow');
    form.append('milkAmount', '5');

    await app.request(new Request('http://localhost/batches', {
      method: 'POST',
      body: form
    }));
    
    const batch = testStorage.listBatches()[0];
    const res = await app.request(new Request(`http://localhost/batches/${batch.id}`));
    const body = await res.text();
    expect(body).not.toContain('<script>');
    expect(body).toContain('&lt;script&gt;');
  });
});
