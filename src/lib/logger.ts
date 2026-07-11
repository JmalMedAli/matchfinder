type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify({
    t: entry.timestamp,
    l: entry.level,
    m: entry.message,
    ...(entry.context ? { c: entry.context } : {}),
  });
}

const queue: LogEntry[] = [];
let flushing = false;

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  while (queue.length > 0) {
    const entry = queue.shift()!;
    console[entry.level === "error" ? "error" : "log"](formatEntry(entry));
  }
  flushing = false;
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  queue.push(entry);
  Promise.resolve().then(flush);
}

export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) =>
    log("error", msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) =>
    log("debug", msg, ctx),
};
