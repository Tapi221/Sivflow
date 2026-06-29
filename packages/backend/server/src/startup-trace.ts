import { appendFileSync } from 'node:fs';

export function traceStartup(message: string) {
  const shouldLog = process.env.SIVFLOW_STARTUP_TRACE === 'true';
  const traceFile = process.env.SIVFLOW_STARTUP_TRACE_FILE;
  const line = `[startup] ${message}`;

  if (shouldLog) {
    console.log(line);
  }

  if (traceFile) {
    appendFileSync(traceFile, `${line}\n`);
  }
}
