import type { Temporal } from "@js-temporal/polyfill";

export interface Culture {
  readonly id: string;
  readonly name: string;
  readonly manufacturer?: string;
  readonly type: "mesophilic" | "thermophilic" | "adjunct" | "mold" | "yeast" | "other";
  readonly description?: string;
}

export interface TemperatureLog {
  readonly timestamp: Date;
  readonly value: number;
  readonly note?: string;
}

export interface PHLog {
  readonly timestamp: Date;
  readonly value: number;
  readonly note?: string;
}

export interface RennetAddition {
  readonly timestamp: Date;
  readonly type: string;
  readonly amount: number;
  readonly strength?: number;
  readonly note?: string;
}

export interface PressingStage {
  readonly startTime: Date;
  readonly weight: number;
  readonly duration: number;
  readonly flipped: boolean;
  readonly note?: string;
}

export interface AgingEntry {
  readonly date: string;
  readonly temperature: number;
  readonly humidity?: number;
  readonly turned: boolean;
  readonly note?: string;
}

export interface Batch {
  readonly id: string;
  readonly name: string;
  readonly milkType: string;
  readonly milkAmount: number;
  readonly startTime: Date;
  readonly cultures: ReadonlyArray<Culture>;
  readonly temperatureLogs: ReadonlyArray<TemperatureLog>;
  readonly phLogs: ReadonlyArray<PHLog>;
  readonly rennetAdditions: ReadonlyArray<RennetAddition>;
  readonly pressingStages: ReadonlyArray<PressingStage>;
  readonly agingSchedule: ReadonlyArray<AgingEntry>;
  readonly notes?: string;
}

export interface BatchSummary {
  readonly id: string;
  readonly name: string;
  readonly milkType: string;
  readonly startTime: Date;
  readonly status: "active" | "pressing" | "aging" | "completed";
}

export interface ReportOptions {
  readonly includeLogs: boolean;
  readonly includeAging: boolean;
  readonly format: "text" | "json";
}