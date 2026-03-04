import type {
  Batch,
  Culture,
  TemperatureLog,
  PHLog,
  RennetAddition,
  PressingStage,
  AgingEntry,
  BatchSummary,
} from "./types.js";

export interface CreateBatchOptions {
  readonly name: string;
  readonly milkType: string;
  readonly milkAmount: number;
  readonly startTime?: Date;
  readonly notes?: string;
}

export function createBatch(options: CreateBatchOptions): Batch {
  const now = new Date();
  const id = generateBatchId();

  return {
    id,
    name: options.name,
    milkType: options.milkType,
    milkAmount: options.milkAmount,
    startTime: options.startTime ?? now,
    cultures: [],
    temperatureLogs: [],
    phLogs: [],
    rennetAdditions: [],
    pressingStages: [],
    agingSchedule: [],
    notes: options.notes,
  };
}

export function addCulture(batch: Batch, culture: Culture): Batch {
  return {
    ...batch,
    cultures: [...batch.cultures, culture],
  };
}

export function addTemperatureLog(
  batch: Batch,
  log: Omit<TemperatureLog, "timestamp"> & { timestamp?: Date }
): Batch {
  const timestamp = log.timestamp ?? new Date();
  const newLog: TemperatureLog = {
    timestamp,
    value: log.value,
    note: log.note,
  };
  return {
    ...batch,
    temperatureLogs: [...batch.temperatureLogs, newLog],
  };
}

export function addPHLog(
  batch: Batch,
  log: Omit<PHLog, "timestamp"> & { timestamp?: Date }
): Batch {
  const timestamp = log.timestamp ?? new Date();
  const newLog: PHLog = {
    timestamp,
    value: log.value,
    note: log.note,
  };
  return {
    ...batch,
    phLogs: [...batch.phLogs, newLog],
  };
}

export function addRennetAddition(
  batch: Batch,
  addition: Omit<RennetAddition, "timestamp"> & { timestamp?: Date }
): Batch {
  const timestamp = addition.timestamp ?? new Date();
  const newAddition: RennetAddition = {
    timestamp,
    type: addition.type,
    amount: addition.amount,
    strength: addition.strength,
    note: addition.note,
  };
  return {
    ...batch,
    rennetAdditions: [...batch.rennetAdditions, newAddition],
  };
}

export function addPressingStage(
  batch: Batch,
  stage: Omit<PressingStage, "startTime"> & { startTime?: Date }
): Batch {
  const startTime = stage.startTime ?? new Date();
  const newStage: PressingStage = {
    startTime,
    weight: stage.weight,
    duration: stage.duration,
    flipped: stage.flipped,
    note: stage.note,
  };
  return {
    ...batch,
    pressingStages: [...batch.pressingStages, newStage],
  };
}

export function addAgingEntry(
  batch: Batch,
  entry: Omit<AgingEntry, "date"> & { date?: string }
): Batch {
  const date = entry.date ?? new Date().toISOString().split("T")[0];
  const newEntry: AgingEntry = {
    date,
    temperature: entry.temperature,
    humidity: entry.humidity,
    turned: entry.turned,
    note: entry.note,
  };
  return {
    ...batch,
    agingSchedule: [...batch.agingSchedule, newEntry],
  };
}

export function getBatchSummary(batch: Batch): BatchSummary {
  let status: BatchSummary["status"] = "active";
  if (batch.agingSchedule.length > 0) {
    status = "aging";
  } else if (batch.pressingStages.length > 0) {
    status = "pressing";
  }

  return {
    id: batch.id,
    name: batch.name,
    milkType: batch.milkType,
    startTime: batch.startTime,
    status,
  };
}

export function validateBatch(batch: unknown): batch is Batch {
  if (typeof batch !== "object" || batch === null) {
    return false;
  }

  const b = batch as Record<string, unknown>;

  if (typeof b.id !== "string" || b.id.length === 0) {
    return false;
  }
  if (typeof b.name !== "string" || b.name.length === 0) {
    return false;
  }
  if (typeof b.milkType !== "string" || b.milkType.length === 0) {
    return false;
  }
  if (typeof b.milkAmount !== "number" || b.milkAmount <= 0) {
    return false;
  }
  if (!(b.startTime instanceof Date)) {
    return false;
  }

  if (!Array.isArray(b.cultures)) {
    return false;
  }
  if (!Array.isArray(b.temperatureLogs)) {
    return false;
  }
  if (!Array.isArray(b.phLogs)) {
    return false;
  }
  if (!Array.isArray(b.rennetAdditions)) {
    return false;
  }
  if (!Array.isArray(b.pressingStages)) {
    return false;
  }
  if (!Array.isArray(b.agingSchedule)) {
    return false;
  }

  return true;
}

function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `batch_${timestamp}_${random}`;
}