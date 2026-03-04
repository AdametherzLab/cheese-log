import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {
  createBatch,
  addCulture,
  addTemperatureLog,
  addPHLog,
  addRennetAddition,
  addPressingStage,
  addAgingEntry,
  getBatchSummary,
  validateBatch,
  BatchStorage,
  type Batch,
  type Culture,
  type ReportOptions,
} from "../src/index";

describe("cheese-log public API", () => {
  const testDataDir = path.join(os.tmpdir(), "cheese-log-test-" + Date.now());
  let storage: BatchStorage;

  beforeEach(() => {
    storage = new BatchStorage({ dataDir: testDataDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe("batch creation and manipulation", () => {
    it("should create a new batch with required fields", () => {
      const batch = createBatch({
        name: "Test Cheddar",
        milkType: "Cow",
        milkAmount: 10,
        notes: "First attempt",
      });

      expect(batch.id).toMatch(/^batch_/);
      expect(batch.name).toBe("Test Cheddar");
      expect(batch.milkType).toBe("Cow");
      expect(batch.milkAmount).toBe(10);
      expect(batch.notes).toBe("First attempt");
      expect(batch.cultures).toEqual([]);
      expect(batch.temperatureLogs).toEqual([]);
      expect(batch.phLogs).toEqual([]);
      expect(batch.rennetAdditions).toEqual([]);
      expect(batch.pressingStages).toEqual([]);
      expect(batch.agingSchedule).toEqual([]);
      expect(batch.startTime instanceof Date).toBe(true);
    });

    it("should add culture to batch", () => {
      let batch = createBatch({
        name: "Test",
        milkType: "Goat",
        milkAmount: 5,
      });

      const culture: Culture = {
        id: "cult_1",
        name: "MA11",
        manufacturer: "Chr. Hansen",
        type: "mesophilic",
        description: "Primary culture",
      };

      batch = addCulture(batch, culture);

      expect(batch.cultures).toHaveLength(1);
      expect(batch.cultures[0]).toEqual(culture);
    });

    it("should record sequential pH and temperature measurements", () => {
      let batch = createBatch({
        name: "Sequential Logs",
        milkType: "Sheep",
        milkAmount: 8,
      });

      const tempLog = { value: 32.5, note: "Initial heating" };
      batch = addTemperatureLog(batch, tempLog);

      const phLog = { value: 6.4, note: "After culture" };
      batch = addPHLog(batch, phLog);

      expect(batch.temperatureLogs).toHaveLength(1);
      expect(batch.temperatureLogs[0].value).toBe(32.5);
      expect(batch.temperatureLogs[0].note).toBe("Initial heating");

      expect(batch.phLogs).toHaveLength(1);
      expect(batch.phLogs[0].value).toBe(6.4);
      expect(batch.phLogs[0].note).toBe("After culture");

      batch = addTemperatureLog(batch, { value: 35.0, note: "Rennet temp" });
      expect(batch.temperatureLogs).toHaveLength(2);
      expect(batch.temperatureLogs[1].value).toBe(35.0);
    });

    it("should transition batch states via summary", () => {
      let batch = createBatch({
        name: "State Test",
        milkType: "Cow",
        milkAmount: 12,
      });

      let summary = getBatchSummary(batch);
      expect(summary.status).toBe("active");

      batch = addPressingStage(batch, {
        weight: 10,
        duration: 60,
        flipped: true,
        note: "First press",
      });
      summary = getBatchSummary(batch);
      expect(summary.status).toBe("pressing");

      batch = addAgingEntry(batch, {
        temperature: 12,
        humidity: 85,
        turned: true,
        note: "Cave aging",
      });
      summary = getBatchSummary(batch);
      expect(summary.status).toBe("aging");
    });

    it("should validate batch structure", () => {
      const validBatch = createBatch({
        name: "Valid",
        milkType: "Cow",
        milkAmount: 5,
      });

      expect(validateBatch(validBatch)).toBe(true);
      expect(validateBatch(null)).toBe(false);
      expect(validateBatch({})).toBe(false);
      expect(validateBatch({ id: "x", name: "x", milkType: "x", milkAmount: -1 })).toBe(false);
      expect(validateBatch({ id: "x", name: "x", milkType: "x", milkAmount: 5 })).toBe(false);
    });
  });

  describe("storage operations", () => {
    it("should persist and retrieve a batch", () => {
      let batch = createBatch({
        name: "Persistent Batch",
        milkType: "Goat",
        milkAmount: 7,
      });

      const culture: Culture = {
        id: "cult_2",
        name: "LH100",
        type: "thermophilic",
      };
      batch = addCulture(batch, culture);
      batch = addRennetAddition(batch, {
        type: "Animal",
        amount: 2.5,
        strength: 200,
        note: "Added at 35°C",
      });

      storage.saveBatch(batch);

      const loaded = storage.loadBatch(batch.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(batch.id);
      expect(loaded!.name).toBe("Persistent Batch");
      expect(loaded!.cultures).toHaveLength(1);
      expect(loaded!.rennetAdditions).toHaveLength(1);
      expect(loaded!.rennetAdditions[0].type).toBe("Animal");
    });

    it("should return null for non-existent batch", () => {
      const loaded = storage.loadBatch("non-existent-id");
      expect(loaded).toBeNull();
    });

    it("should list all batches with summaries", () => {
      const batch1 = createBatch({ name: "Batch 1", milkType: "Cow", milkAmount: 10 });
      const batch2 = createBatch({ name: "Batch 2", milkType: "Sheep", milkAmount: 6 });
      const batch3 = addPressingStage(
        createBatch({ name: "Batch 3", milkType: "Goat", milkAmount: 8 }),
        { weight: 5, duration: 120, flipped: false }
      );

      storage.saveBatch(batch1);
      storage.saveBatch(batch2);
      storage.saveBatch(batch3);

      const list = storage.listBatches();
      expect(list).toHaveLength(3);

      const names = list.map((b) => b.name).sort();
      expect(names).toEqual(["Batch 1", "Batch 2", "Batch 3"]);

      const pressing = storage.queryBatchesByStatus("pressing");
      expect(pressing).toHaveLength(1);
      expect(pressing[0].name).toBe("Batch 3");

      const cowBatches = storage.queryBatchesByMilkType("cow");
      expect(cowBatches).toHaveLength(1);
      expect(cowBatches[0].name).toBe("Batch 1");
    });

    it("should export batch report in JSON format", () => {
      let batch = createBatch({
        name: "Report Batch",
        milkType: "Mixed",
        milkAmount: 15,
        notes: "Test export",
      });
      batch = addTemperatureLog(batch, { value: 33.0 });
      batch = addAgingEntry(batch, { temperature: 10, turned: false });

      storage.saveBatch(batch);

      const options: ReportOptions = {
        includeLogs: true,
        includeAging: true,
        format: "json",
      };

      const report = storage.exportBatchReport(batch.id, options);
      expect(report).not.toBeNull();

      const parsed = JSON.parse(report!);
      expect(parsed.name).toBe("Report Batch");
      expect(parsed.temperatureLogs).toHaveLength(1);
      expect(parsed.agingSchedule).toHaveLength(1);
      expect(parsed.notes).toBe("Test export");
    });

    it("should export batch report in text format", () => {
      const batch = createBatch({
        name: "Text Report",
        milkType: "Cow",
        milkAmount: 20,
      });

      storage.saveBatch(batch);

      const options: ReportOptions = {
        includeLogs: false,
        includeAging: false,
        format: "text",
      };

      const report = storage.exportBatchReport(batch.id, options);
      expect(report).toContain("Batch: Text Report");
      expect(report).toContain("Milk: Cow (20 L)");
    });

    it("should return null when exporting non-existent batch", () => {
      const options: ReportOptions = {
        includeLogs: true,
        includeAging: true,
        format: "json",
      };
      const report = storage.exportBatchReport("missing-id", options);
      expect(report).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle empty data directory", () => {
      const emptyStorage = new BatchStorage({ dataDir: path.join(testDataDir, "empty") });
      const list = emptyStorage.listBatches();
      expect(list).toEqual([]);
    });

    it("should skip invalid JSON files when listing", () => {
      const invalidPath = path.join(testDataDir, "corrupted.json");
      fs.writeFileSync(invalidPath, "not json", "utf-8");

      const list = storage.listBatches();
      expect(list).toEqual([]);
    });

    it("should generate unique batch IDs", () => {
      const batch1 = createBatch({ name: "A", milkType: "Cow", milkAmount: 1 });
      const batch2 = createBatch({ name: "B", milkType: "Goat", milkAmount: 2 });
      expect(batch1.id).not.toBe(batch2.id);
    });
  });
});