import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import type { Batch, BatchSummary, ReportOptions } from "./types.js";

export interface StorageConfig {
  readonly dataDir: string;
}

export class BatchStorage {
  private readonly config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      dataDir: config?.dataDir ?? path.join(os.homedir(), ".cheese-log", "batches"),
    };
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }
  }

  private getBatchPath(id: string): string {
    return path.join(this.config.dataDir, `${id}.json`);
  }

  saveBatch(batch: Batch): void {
    const filePath = this.getBatchPath(batch.id);
    const data = JSON.stringify(batch, null, 2);
    fs.writeFileSync(filePath, data, "utf-8");
  }

  deleteBatch(id: string): void {
    const filePath = this.getBatchPath(id);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
    }
  }

  loadBatch(id: string): Batch | null {
    const filePath = this.getBatchPath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as Batch;
    } catch {
      return null;
    }
  }

  listBatches(): BatchSummary[] {
    const summaries: BatchSummary[] = [];
    if (!fs.existsSync(this.config.dataDir)) {
      return summaries;
    }
    const files = fs.readdirSync(this.config.dataDir);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = path.join(this.config.dataDir, file);
      try {
        const data = fs.readFileSync(filePath, "utf-8");
        const batch = JSON.parse(data) as Batch;
        const summary = this.createSummary(batch);
        summaries.push(summary);
      } catch {
        // skip invalid files
      }
    }
    return summaries;
  }

  queryBatchesByStatus(status: BatchSummary["status"]): BatchSummary[] {
    const all = this.listBatches();
    return all.filter((summary) => summary.status === status);
  }

  queryBatchesByMilkType(milkType: string): BatchSummary[] {
    const all = this.listBatches();
    return all.filter((summary) => summary.milkType.toLowerCase() === milkType.toLowerCase());
  }

  private createSummary(batch: Batch): BatchSummary {
    let status: BatchSummary["status"] = "active";
    if (batch.agingSchedule.length > 0) {
      status = "aging";
    } else if (batch.pressingStages.length > 0) {
      status = "pressing";
    }
    if (batch.agingSchedule.some(e => new Date(e.date) < new Date())) {
      status = "completed";
    }
    return {
      id: batch.id,
      name: batch.name,
      milkType: batch.milkType,
      startTime: batch.startTime,
      status,
    };
  }
}
