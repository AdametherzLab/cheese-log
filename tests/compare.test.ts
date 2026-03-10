import { describe, it, expect } from 'bun:test';
import { createBatch, addTemperatureLog, addPHLog, addAgingEntry } from '../src/batch';
import { compareBatches } from '../src/compare';

describe('Batch Comparison', () => {
  const baseDate = new Date('2024-01-01');

  it('should handle batches with no metrics', () => {
    const batch = createBatch({ name: 'Empty', milkType: 'Cow', milkAmount: 5 });
    const report = compareBatches([batch]);

    expect(report.batches[0].avgTemperature).toBe(0);
    expect(report.batches[0].avgPH).toBe(0);
    expect(report.batches[0].agingDurationDays).toBe(0);
  });

  it('should calculate averages and aging duration correctly', () => {
    let batch = createBatch({
      name: 'Test Batch',
      milkType: 'Goat',
      milkAmount: 8,
      startTime: baseDate
    });

    // Add metrics
    batch = addTemperatureLog(batch, { value: 32, timestamp: new Date(baseDate.getTime() + 3600000) });
    batch = addTemperatureLog(batch, { value: 34, timestamp: new Date(baseDate.getTime() + 7200000) });
    batch = addPHLog(batch, { value: 6.2, timestamp: new Date(baseDate.getTime() + 3600000) });
    batch = addPHLog(batch, { value: 5.8, timestamp: new Date(baseDate.getTime() + 7200000) });
    batch = addAgingEntry(batch, { date: '2024-01-05', temperature: 12, turned: true });
    batch = addAgingEntry(batch, { date: '2024-01-08', temperature: 12, turned: true });

    const report = compareBatches([batch]);
    
    expect(report.batches[0].avgTemperature).toBeCloseTo(33);
    expect(report.batches[0].avgPH).toBeCloseTo(6.0);
    expect(report.batches[0].agingDurationDays).toBe(4); // 2024-01-05 to 2024-01-08 inclusive
  });

  it('should compare multiple batches effectively', () => {
    // Batch 1: High temp, stable pH
    let batch1 = createBatch({ name: 'Batch 1', milkType: 'Cow', milkAmount: 10 });
    batch1 = addTemperatureLog(batch1, { value: 35 });
    batch1 = addPHLog(batch1, { value: 6.5 });
    batch1 = addAgingEntry(batch1, { date: '2024-01-01' });

    // Batch 2: Low temp, acidic
    let batch2 = createBatch({ name: 'Batch 2', milkType: 'Sheep', milkAmount: 8 });
    batch2 = addTemperatureLog(batch2, { value: 30 });
    batch2 = addPHLog(batch2, { value: 5.2 });
    batch2 = addAgingEntry(batch2, { date: '2024-01-01' });
    batch2 = addAgingEntry(batch2, { date: '2024-01-07' });

    const report = compareBatches([batch1, batch2]);
    
    expect(report.batches).toHaveLength(2);
    expect(report.batches[0].avgTemperature).toBe(35);
    expect(report.batches[1].avgPH).toBe(5.2);
    expect(report.batches[0].agingDurationDays).toBe(1);
    expect(report.batches[1].agingDurationDays).toBe(7);
  });

  it('should handle single aging entry as 1 day duration', () => {
    const batch = addAgingEntry(
      createBatch({ name: 'Single Aging', milkType: 'Cow', milkAmount: 5 }),
      { date: '2024-03-01' }
    );
    
    const report = compareBatches([batch]);
    expect(report.batches[0].agingDurationDays).toBe(1);
  });
});
