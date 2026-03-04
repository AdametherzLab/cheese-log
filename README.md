# cheese-log 🧀

**Track your cheesemaking adventures with TypeScript precision!**

Cheese-log is a delightful, open-source library for logging every detail of your cheesemaking batches. From culture additions and pH readings to pressing weights and aging schedules, it helps you capture the science and art of cheese creation in a structured, queryable format. Perfect for hobbyists, small-scale producers, and developers who love fermentation!

## 📦 Installation

Install with your favorite package manager:

```bash
# Using Bun (recommended)
bun add cheese-log

# Using npm
npm install cheese-log

# Using yarn
yarn add cheese-log

# Using pnpm
pnpm add cheese-log
```

## 🚀 Quick Start

Here's a simple example to create your first cheese batch log:

```typescript
import { createBatch, addCulture, addTemperatureLog, getBatchSummary } from 'cheese-log';

// Create a new batch
let myBatch = createBatch({
  name: "My First Cheddar",
  milkType: "Cow",
  milkVolumeLiters: 10,
  startDate: new Date("2024-01-15"),
});

// Add a culture
myBatch = addCulture(myBatch, {
  name: "Mesophilic",
  manufacturer: "Cheese Cultures Ltd",
  amountGrams: 0.5,
  addedAt: new Date("2024-01-15T09:00:00"),
});

// Log a temperature reading
myBatch = addTemperatureLog(myBatch, {
  timestamp: new Date("2024-01-15T10:30:00"),
  temperatureC: 32.5,
  location: "Vat",
  notes: "Holding steady",
});

// Get a summary of your batch
const summary = getBatchSummary(myBatch);
console.log(`Batch: ${summary.name}`);
console.log(`Status: ${summary.status}`);
console.log(`Days active: ${summary.daysActive}`);
```

## 📖 API Reference

### Core Types

All measurements use metric units (liters, grams, Celsius) for consistency.

- **`Batch`**: The main batch object containing all logs and metadata
- **`Culture`**: Record of culture additions (name, amount, timing)
- **`TemperatureLog`**: Temperature readings with location context
- **`PHLog`**: pH measurements over time
- **`RennetAddition`**: Rennet type, amount, and coagulation details
- **`PressingStage`**: Pressing weight, duration, and flip schedule
- **`AgingEntry`**: Aging environment conditions and observations
- **`BatchSummary`**: Calculated summary of batch status and metrics
- **`ReportOptions`**: Configuration for generating batch reports

### Batch Functions

#### `createBatch(options: CreateBatchOptions): Batch`
Creates a new cheese batch with initial metadata.

```typescript
const batch = createBatch({
  name: "Gouda Experiment #3",
  milkType: "Goat",
  milkVolumeLiters: 8,
  startDate: new Date(),
  notes: "Trying a new aging schedule",
});
```

#### `addCulture(batch: Batch, culture: Culture): Batch`
Adds a culture addition to the batch. Returns a new Batch object (immutable).

#### `addTemperatureLog(batch: Batch, log: TemperatureLog): Batch`
Records a temperature measurement.

#### `addPHLog(batch: Batch, log: PHLog): Batch`
Records a pH measurement.

#### `addRennetAddition(batch: Batch, rennet: RennetAddition): Batch`
Logs rennet addition and coagulation details.

#### `addPressingStage(batch: Batch, stage: PressingStage): Batch`
Adds a pressing stage with weight and duration.

#### `addAgingEntry(batch: Batch, entry: AgingEntry): Batch`
Records aging conditions and observations.

#### `getBatchSummary(batch: Batch): BatchSummary`
Generates a summary with calculated fields like status, days active, and key metrics.

#### `validateBatch(batch: unknown): batch is Batch`
Type guard to validate if an object conforms to the Batch interface.

### Storage

#### `BatchStorage` class
Persistent storage for batches using JSON files.

```typescript
import { BatchStorage } from 'cheese-log';
import * as path from 'path';

const storage = new BatchStorage({
  dataDir: path.join(os.homedir(), '.cheese-log', 'batches'),
});

// Save a batch
await storage.saveBatch(myBatch);

// Load a batch by ID
const loaded = await storage.loadBatch(myBatch.id);

// List all batches
const allBatches = await storage.listBatches();

// Delete a batch
await storage.deleteBatch(myBatch.id);
```

## 🧪 Examples

### Complete Batch Lifecycle

```typescript
import { 
  createBatch, 
  addCulture, 
  addRennetAddition,
  addPressingStage,
  addAgingEntry,
  getBatchSummary 
} from 'cheese-log';

// Start a batch
let batch = createBatch({
  name: "Aged Manchego",
  milkType: "Sheep",
  milkVolumeLiters: 12,
  startDate: new Date(),
});

// Morning: Add culture
batch = addCulture(batch, {
  name: "Thermophilic",
  amountGrams: 0.8,
  addedAt: new Date(),
});

// Afternoon: Add rennet
batch = addRennetAddition(batch, {
  type: "Animal",
  strength: "Single",
  amountMl: 4,
  addedAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
  flocculationTimeMinutes: 18,
});

// Evening: First pressing
batch = addPressingStage(batch, {
  stageNumber: 1,
  weightKg: 5,
  durationHours: 2,
  startTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
  flipped: false,
});

// Aging: Weekly check-in
batch = addAgingEntry(batch, {
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  temperatureC: 12,
  humidityPercent: 85,
  notes: "Developing nice rind, slight bloom",
  weightGrams: 2500,
});

// Get current status
const summary = getBatchSummary(batch);
console.log(summary);
```

### Generating Reports

```typescript
import { BatchStorage } from 'cheese-log';
import * as fs from 'fs';
import * as path from 'path';

const storage = new BatchStorage();
const batches = await storage.listBatches();

// Create a simple text report
const report = batches.map(batch => {
  const summary = getBatchSummary(batch);
  return `
Batch: ${summary.name}
Started: ${summary.startDate.toLocaleDateString()}
Status: ${summary.status}
Last Activity: ${summary.lastActivityDate?.toLocaleDateString() || 'None'}
---
`;
}).join('\n');

// Save to file
fs.writeFileSync(
  path.join(os.homedir(), 'cheese-batch-report.txt'),
  report
);
```

## 🤝 Contributing

We welcome contributions from cheesemakers and developers alike! Whether you're fixing a bug, adding a feature, or improving documentation, here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b amazing-feature`)
3. Make your changes
4. Run tests (coming soon!)
5. Commit with clear messages (`git commit -m 'Add pH validation'`)
6. Push to your branch (`git push origin amazing-feature`)
7. Open a Pull Request

Please ensure your code follows the existing TypeScript style and includes appropriate tests.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details. Made with ❤️ and 🧀 by the open source community.