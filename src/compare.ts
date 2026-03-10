import type { Batch, AgingEntry } from './types';

export interface BatchMetrics {
  id: string;
  name: string;
  avgTemperature: number;
  avgPH: number;
  agingDurationDays: number;
}

export interface ComparisonReport {
  batches: BatchMetrics[];
}

export function compareBatches(batches: Batch[]): ComparisonReport {
  return {
    batches: batches.map(batch => ({
      id: batch.id,
      name: batch.name,
      avgTemperature: calculateAverage(batch.temperatureLogs.map(l => l.value)),
      avgPH: calculateAverage(batch.phLogs.map(l => l.value)),
      agingDurationDays: calculateAgingDuration(batch.agingSchedule)
    }))
  };
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateAgingDuration(entries: AgingEntry[]): number {
  if (entries.length === 0) return 0;
  
  const dates = entries
    .map(e => new Date(e.date))
    .sort((a, b) => a.getTime() - b.getTime());

  const start = dates[0];
  const end = dates[dates.length - 1];
  
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // Inclusive of both dates
}
