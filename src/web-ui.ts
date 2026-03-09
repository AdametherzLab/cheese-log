import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { BatchStorage } from './storage';
import { createBatch, addTemperatureLog, addPHLog } from './batch';
import { renderBatchList, renderBatchDetails } from './templates';

const app = new Hono();
const storage = new BatchStorage();

const createBatchSchema = z.object({
  name: z.string().min(1),
  milkType: z.string().min(1),
  milkAmount: z.coerce.number().positive()
});

app.get('/', (c) => {
  return c.html(renderBatchList(storage.listBatches()));
});

app.post('/batches', zValidator('form', createBatchSchema), (c) => {
  const { name, milkType, milkAmount } = c.req.valid('form');
  const batch = createBatch({ name, milkType, milkAmount });
  storage.saveBatch(batch);
  return c.html(renderBatchList(storage.listBatches()), 201);
});

app.get('/batches/:id', (c) => {
  const batch = storage.loadBatch(c.req.param('id'));
  return batch ? c.html(renderBatchDetails(batch)) : c.notFound();
});

app.post('/batches/:id/logs', async (c) => {
  const batch = storage.loadBatch(c.req.param('id'));
  if (!batch) return c.notFound();

  const formData = await c.req.parseBody();
  const updatedBatch = formData.get('type') === 'temperature'
    ? addTemperatureLog(batch, { value: Number(formData.get('value')), note: formData.get('note')?.toString() })
    : addPHLog(batch, { value: Number(formData.get('value')), note: formData.get('note')?.toString() });

  storage.saveBatch(updatedBatch);
  return c.html(renderBatchDetails(updatedBatch));
});

export default app;