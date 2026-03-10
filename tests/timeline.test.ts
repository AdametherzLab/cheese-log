import { describe, it, expect } from "bun:test";
import {
  createBatch,
  addCulture,
  addTemperatureLog,
  addPHLog,
  addRennetAddition,
  addPressingStage,
  addAgingEntry,
} from "../src/index";
import {
  buildBatchTimeline,
  filterTimelineEvents,
  renderTimelineHTML,
} from "../src/timeline";
import type { Culture } from "../src/index";

describe("buildBatchTimeline", () => {
  it("should create a timeline with start event for empty batch", () => {
    const batch = createBatch({
      name: "Empty Batch",
      milkType: "Cow",
      milkAmount: 10,
    });

    const timeline = buildBatchTimeline(batch);

    expect(timeline.batchId).toBe(batch.id);
    expect(timeline.batchName).toBe("Empty Batch");
    expect(timeline.events).toHaveLength(1);
    expect(timeline.events[0].type).toBe("start");
    expect(timeline.temperatureSeries).toEqual([]);
    expect(timeline.phSeries).toEqual([]);
    expect(timeline.durationMinutes).toBe(0);
  });

  it("should include all event types and sort chronologically", () => {
    const baseTime = new Date("2026-03-08T08:00:00Z");

    let batch = createBatch({
      name: "Full Timeline",
      milkType: "Goat",
      milkAmount: 8,
      startTime: baseTime,
    });

    const culture: Culture = {
      id: "c1",
      name: "MA11",
      type: "mesophilic",
      description: "Starter culture",
    };
    batch = addCulture(batch, culture);

    batch = addTemperatureLog(batch, {
      value: 32,
      note: "Heating",
      timestamp: new Date("2026-03-08T08:10:00Z"),
    });
    batch = addPHLog(batch, {
      value: 6.5,
      note: "Initial pH",
      timestamp: new Date("2026-03-08T08:15:00Z"),
    });
    batch = addRennetAddition(batch, {
      type: "Vegetable",
      amount: 3,
      strength: 200,
      note: "Added rennet",
      timestamp: new Date("2026-03-08T08:30:00Z"),
    });
    batch = addTemperatureLog(batch, {
      value: 35,
      timestamp: new Date("2026-03-08T09:00:00Z"),
    });
    batch = addPHLog(batch, {
      value: 5.8,
      timestamp: new Date("2026-03-08T09:30:00Z"),
    });
    batch = addPressingStage(batch, {
      weight: 10,
      duration: 60,
      flipped: true,
      note: "First press",
      startTime: new Date("2026-03-08T10:00:00Z"),
    });
    batch = addAgingEntry(batch, {
      temperature: 12,
      humidity: 85,
      turned: true,
      note: "Cave aging",
      date: "2026-03-09",
    });

    const timeline = buildBatchTimeline(batch);

    // start + culture + 2 temp + 2 ph + 1 rennet + 1 pressing + 1 aging = 9
    expect(timeline.events).toHaveLength(9);

    // Verify chronological order
    for (let i = 1; i < timeline.events.length; i++) {
      expect(timeline.events[i].timestamp).toBeGreaterThanOrEqual(
        timeline.events[i - 1].timestamp
      );
    }

    // Verify series data
    expect(timeline.temperatureSeries).toHaveLength(2);
    expect(timeline.temperatureSeries[0].value).toBe(32);
    expect(timeline.temperatureSeries[1].value).toBe(35);

    expect(timeline.phSeries).toHaveLength(2);
    expect(timeline.phSeries[0].value).toBe(6.5);
    expect(timeline.phSeries[1].value).toBe(5.8);

    // Duration should cover from start to last event (aging on 2026-03-09)
    expect(timeline.durationMinutes).toBeGreaterThan(0);

    // Check event types are present
    const types = new Set(timeline.events.map((e) => e.type));
    expect(types.has("start")).toBe(true);
    expect(types.has("culture")).toBe(true);
    expect(types.has("temperature")).toBe(true);
    expect(types.has("ph")).toBe(true);
    expect(types.has("rennet")).toBe(true);
    expect(types.has("pressing")).toBe(true);
    expect(types.has("aging")).toBe(true);
  });

  it("should include notes and values on events", () => {
    let batch = createBatch({
      name: "Notes Test",
      milkType: "Sheep",
      milkAmount: 5,
    });

    batch = addTemperatureLog(batch, { value: 33.5, note: "Target reached" });
    batch = addRennetAddition(batch, {
      type: "Animal",
      amount: 2.5,
      strength: 150,
      note: "Slow set",
    });

    const timeline = buildBatchTimeline(batch);
    const tempEvent = timeline.events.find((e) => e.type === "temperature");
    const rennetEvent = timeline.events.find((e) => e.type === "rennet");

    expect(tempEvent).toBeDefined();
    expect(tempEvent!.value).toBe(33.5);
    expect(tempEvent!.unit).toBe("°C");
    expect(tempEvent!.note).toBe("Target reached");

    expect(rennetEvent).toBeDefined();
    expect(rennetEvent!.value).toBe(2.5);
    expect(rennetEvent!.unit).toBe("mL");
    expect(rennetEvent!.note).toBe("Slow set");
    expect(rennetEvent!.label).toContain("150 IMCU");
  });

  it("should handle unsorted event timestamps", () => {
    const batch = createBatch({
      name: "Out of Order",
      milkType: "Cow",
      milkAmount: 10,
    });

    const tempLog1 = { value: 30, timestamp: new Date("2026-03-08T10:00:00Z") };
    const tempLog2 = { value: 35, timestamp: new Date("2026-03-08T09:00:00Z") };
    const batchWithLogs = addTemperatureLog(
      addTemperatureLog(batch, tempLog1),
      tempLog2
    );

    const timeline = buildBatchTimeline(batchWithLogs);
    expect(timeline.events.map(e => e.value)).toEqual([undefined, 35, 30]);
    expect(timeline.temperatureSeries.map(s => s.value)).toEqual([30, 35]);
  });

  it("should handle empty data series", () => {
    const batch = createBatch({
      name: "No Logs",
      milkType: "Sheep",
      milkAmount: 7,
    });
    const timeline = buildBatchTimeline(batch);
    expect(timeline.temperatureSeries).toEqual([]);
    expect(timeline.phSeries).toEqual([]);
  });
});

describe("filterTimelineEvents", () => {
  it("should filter events by specified types", () => {
    let batch = createBatch({
      name: "Filter Test",
      milkType: "Cow",
      milkAmount: 10,
    });
    batch = addTemperatureLog(batch, { value: 32 });
    batch = addPHLog(batch, { value: 6.4 });
    batch = addTemperatureLog(batch, { value: 35 });

    const timeline = buildBatchTimeline(batch);

    const tempOnly = filterTimelineEvents(timeline, ["temperature"]);
    expect(tempOnly).toHaveLength(2);
    expect(tempOnly.every((e) => e.type === "temperature")).toBe(true);

    const phOnly = filterTimelineEvents(timeline, ["ph"]);
    expect(phOnly).toHaveLength(1);
    expect(phOnly[0].type).toBe("ph");

    const multiple = filterTimelineEvents(timeline, ["temperature", "start"]);
    expect(multiple).toHaveLength(3); // 2 temp + 1 start

    const none = filterTimelineEvents(timeline, ["aging"]);
    expect(none).toHaveLength(0);
  });
});

describe("renderTimelineHTML", () => {
  it("should generate valid HTML with Chart.js and event data", () => {
    let batch = createBatch({
      name: "HTML Test Batch",
      milkType: "Cow",
      milkAmount: 12,
      startTime: new Date("2026-03-08T10:00:00Z"),
    });
    batch = addTemperatureLog(batch, {
      value: 32,
      timestamp: new Date("2026-03-08T10:05:00Z"),
    });
    batch = addPHLog(batch, {
      value: 6.5,
      timestamp: new Date("2026-03-08T10:10:00Z"),
    });

    const timeline = buildBatchTimeline(batch);
    const html = renderTimelineHTML(timeline);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("HTML Test Batch");
    expect(html).toContain("chart.js");
    expect(html).toContain("tempChart");
    expect(html).toContain("phChart");
    expect(html).toContain("Temperature");
    // Verify event data is embedded
    expect(html).toContain('"type":"start"');
    expect(html).toContain('"type":"temperature"');
    expect(html).toContain('"type":"ph"');
    // Check filter buttons exist
    expect(html).toContain("filters");
    expect(html).toContain("activeTypes");
  });

  it("should escape HTML in batch name and notes", () => {
    let batch = createBatch({
      name: '<script>alert("xss")</script>',
      milkType: "Cow",
      milkAmount: 5,
    });
    batch = addTemperatureLog(batch, {
      value: 30,
      note: '<img onerror="hack">',
    });

    const timeline = buildBatchTimeline(batch);
    const html = renderTimelineHTML(timeline);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img onerror=");
  });

  it("should display no data messages when empty", () => {
    const batch = createBatch({
      name: "No Data Batch",
      milkType: "Goat",
      milkAmount: 5,
    });
    const timeline = buildBatchTimeline(batch);
    const html = renderTimelineHTML(timeline);

    expect(html).toContain("No temperature data");
    expect(html).toContain("No pH data");
    expect(timeline.events).toHaveLength(1);
  });

  it("should handle special characters in notes", () => {
    const batch = createBatch({
      name: "Special Notes",
      milkType: "Cow",
      milkAmount: 8,
    });
    const updatedBatch = addTemperatureLog(batch, {
      value: 40,
      note: "Dangerous & <temperature>",
    });
    const timeline = buildBatchTimeline(updatedBatch);
    const html = renderTimelineHTML(timeline);

    expect(html).toContain("Dangerous &amp; &lt;temperature&gt;");
    expect(html).not.toContain("Dangerous & <temperature>");
  });
});
