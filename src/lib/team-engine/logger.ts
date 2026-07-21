// ============================================================================
// Structured Logger — captures every step of the generation pipeline
// ============================================================================

import type { EngineLogEntry } from "./types";

export class EngineLogger {
  private entries: EngineLogEntry[] = [];
  private startedAt = Date.now();

  info(step: string, message: string, data?: Record<string, unknown>): void {
    this.push("info", step, message, data);
  }
  warn(step: string, message: string, data?: Record<string, unknown>): void {
    this.push("warn", step, message, data);
  }
  error(step: string, message: string, data?: Record<string, unknown>): void {
    this.push("error", step, message, data);
  }

  private push(
    level: EngineLogEntry["level"],
    step: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: EngineLogEntry = { ts: Date.now(), level, step, message, data };
    this.entries.push(entry);
    // Mirror to server console for dev.log visibility
    const prefix = `[team-engine][${level.toUpperCase()}][${step}]`;
    if (level === "error") {
      console.error(prefix, message, data ?? "");
    } else if (level === "warn") {
      console.warn(prefix, message, data ?? "");
    } else {
      console.log(prefix, message, data ?? "");
    }
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  snapshot(): EngineLogEntry[] {
    return [...this.entries];
  }
}
