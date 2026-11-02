// Sharded worker-status publishing: every writer (hub process, per-session
// standalone MCP server) owns one file under ~/.config/dsh-crew/status.d/
// and readers merge all fresh shards. Kills the last-writer-wins race that a
// single shared status.json had with multiple concurrent writers.

import { writeFileSync, mkdirSync, renameSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_DIR = join(homedir(), '.config', 'dsh-crew');
const SHARD_DIR = join(CONFIG_DIR, 'status.d');
export const SHARD_FRESH_MS = 30 * 60 * 1000;

export function createShardWriter(kind) {
  const writer = `${kind}-${process.pid}`;
  const file = join(SHARD_DIR, `${writer}.json`);
  const temp = join(SHARD_DIR, `.${writer}.tmp`);
  const cleanup = () => {
    try { rmSync(file, { force: true }); } catch {}
    try { rmSync(temp, { force: true }); } catch {}
  };
  process.once('exit', cleanup);
  process.once('SIGINT', () => { cleanup(); process.exit(130); });
  process.once('SIGTERM', () => { cleanup(); process.exit(143); });
  return {
    writer,
    publish(jobs) {
      try {
        mkdirSync(SHARD_DIR, { recursive: true });
        writeFileSync(temp, JSON.stringify({ updatedAt: new Date().toISOString(), writer, jobs }, null, 2));
        renameSync(temp, file);
      } catch {}
    },
    dispose: cleanup,
  };
}

/** Merge fresh shards (plus the legacy status.json during transition). */
export function readMergedStatus({ excludeWriter } = {}) {
  const jobs = [];
  const now = Date.now();
  const consume = (raw) => {
    try {
      const shard = JSON.parse(raw);
      if (shard.writer === excludeWriter) return;
      if (now - +new Date(shard.updatedAt) > SHARD_FRESH_MS) return;
      for (const job of shard.jobs ?? []) jobs.push({ ...job, origin: shard.writer ?? 'legacy' });
    } catch {}
  };
  try {
    for (const f of readdirSync(SHARD_DIR)) {
      if (f.endsWith('.json')) { try { consume(readFileSync(join(SHARD_DIR, f), 'utf8')); } catch {} }
    }
  } catch {}
  try { consume(readFileSync(join(CONFIG_DIR, 'status.json'), 'utf8')); } catch {}

  // A concrete worker and its provisional dispatch can coexist briefly while
  // two independent shard writers perform the handoff. Reconcile by the stable
  // invocation id so consumers never render a duplicate, regardless of file
  // enumeration order; unrelated/idle rows have no dispatchId and are retained.
  const concreteDispatches = new Set(jobs
    .filter((job) => job.dispatchId && !(job.dispatch === true && job.phase === 'dispatching'))
    .map((job) => job.dispatchId));
  return jobs.filter((job) => !(job.dispatchId && concreteDispatches.has(job.dispatchId)
    && job.dispatch === true && job.phase === 'dispatching'));
}
