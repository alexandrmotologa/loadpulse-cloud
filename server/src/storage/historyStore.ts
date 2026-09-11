import fs from 'node:fs';
import path from 'node:path';
import { BenchmarkReport } from '../types';

export class HistoryStore {
  private reports: Map<string, BenchmarkReport> = new Map();
  private filePath: string | null = null;
  private maxItems: number = 100;

  constructor(storageDir?: string) {
    if (storageDir) {
      try {
        if (!fs.existsSync(storageDir)) {
          fs.mkdirSync(storageDir, { recursive: true });
        }
        this.filePath = path.join(storageDir, 'history.json');
        this.loadFromFile();
      } catch (err) {
        console.warn('[HistoryStore] Could not initialize file storage, falling back to memory-only:', err);
      }
    }
  }

  private loadFromFile(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      const parsed: BenchmarkReport[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.id) {
            this.reports.set(item.id, item);
          }
        }
      }
    } catch (err) {
      console.warn('[HistoryStore] Failed to read history file:', err);
    }
  }

  private saveToFile(): void {
    if (!this.filePath) return;
    try {
      const items = Array.from(this.reports.values()).slice(-this.maxItems);
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[HistoryStore] Failed to persist history file:', err);
    }
  }

  public save(report: BenchmarkReport): void {
    this.reports.set(report.id, report);
    // Prune if exceeded maxItems
    if (this.reports.size > this.maxItems) {
      const firstKey = this.reports.keys().next().value;
      if (firstKey) this.reports.delete(firstKey);
    }
    this.saveToFile();
  }

  public get(id: string): BenchmarkReport | null {
    return this.reports.get(id) || null;
  }

  public list(limit = 20): BenchmarkReport[] {
    const all = Array.from(this.reports.values());
    all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return all.slice(0, limit);
  }

  public clear(): void {
    this.reports.clear();
    this.saveToFile();
  }
}

export const historyStore = new HistoryStore(process.env.DATA_DIR || './data');
