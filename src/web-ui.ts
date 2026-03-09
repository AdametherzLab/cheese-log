import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { BatchStorage } from './storage';
import { createBatch, addTemperatureLog, addPHLog, getBatchSummary } from './batch';
import { renderBatchList, renderBatchDetails, renderEditBatchForm } from './templates';

export const app = new Hono();
const storage = new BatchStorage();

const createBatchSchema = z.object({
  name: z.string().min(1),
  milkType: z.string().min(1),
  milkAmount: z.coerce.number().positive()
});

const updateBatchSchema = createBatchSchema.partial();

app.get('/', (c) => {
  const statusFilter = c.req.query('status');
  const milkFilter = c.req.query('milkType');
  
  let batches = storage.listBatches();
  if (statusFilter) batches = batches.filter(b => b.status === statusFilter);
  if (milkFilter) batches = batches.filter(b => b.milkType.toLowerCase() === milkFilter.toLowerCase());
  
  return c.html(renderBatchList(batches));
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

app.get('/batches/:id/edit', (c) => {
  const batch = storage.loadBatch(c.req.param('id'));
  return batch ? c.html(renderEditBatchForm(batch)) : c.notFound();
});

app.put('/batches/:id', zValidator('form', updateBatchSchema), (c) => {
  let batch = storage.loadBatch(c.req.param('id'));
  if (!batch) return c.notFound();
  
  const updates = c.req.valid('form');
  const updatedBatch = { ...batch, ...updates };
  storage.saveBatch(updatedBatch);
  
  return c.html(renderBatchDetails(updatedBatch));
});

app.delete('/batches/:id', (c) => {
  const batch = storage.loadBatch(c.req.param('id'));
  if (!batch) return c.notFound();
  
  storage.deleteBatch(batch.id);
  return c.html(renderBatchList(storage.listBatches()));
});

app.post('/batches/:id/logs', async (c) => {
  const batch = storage.loadBatch(c.req.param('id'));
  if (!batch) return c.notFound();

  const formData = await c.req.parseBody();
  const updatedBatch = formData.get('type') === 'temperature'
    ? addTemperatureLog(batch, { 
        value: Number(formData.get('value')), 
        note: formData.get('note')?.toString() 
      })
    : addPHLog(batch, { 
        value: Number(formData.get('value')), 
        note: formData.get('note')?.toString() 
      });

  storage.saveBatch(updatedBatch);
  return c.html(renderBatchDetails(updatedBatch));
});
