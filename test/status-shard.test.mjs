import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const originalHome = process.env.HOME;
const home = await mkdtemp(resolve(tmpdir(), 'dsh-crew-shards-'));
process.env.HOME = home;
await mkdir(resolve(home, '.config/dsh-crew/status.d'), { recursive: true });
const { createShardWriter, readMergedStatus } = await import(`../src/status-shard.mjs?test=${Date.now()}`);

test.after(async () => {
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

test('keeps independent dispatches and deduplicates only their concrete handoff', (t) => {
  const dispatcher = createShardWriter('dispatcher-test');
  const hub = createShardWriter('hub-test');
  t.after(() => { dispatcher.dispose(); hub.dispose(); });

  const idle = { id: 'dispatcher-idle', status: 'idle', dispatcher: true };
  const first = {
    id: 'dispatch-1', dispatchId: 'dispatch-1', status: 'running',
    dispatch: true, phase: 'dispatching', task: 'same task',
  };
  const second = {
    id: 'dispatch-2', dispatchId: 'dispatch-2', status: 'running',
    dispatch: true, phase: 'dispatching', task: 'same task',
  };
  dispatcher.publish([idle, first, second]);

  assert.deepEqual(readMergedStatus().map((job) => job.id).sort(), [
    'dispatch-1', 'dispatch-2', 'dispatcher-idle',
  ]);

  hub.publish([{ id: 'hub-1', dispatchId: 'dispatch-1', status: 'running', task: 'same task' }]);
  const handedOff = readMergedStatus();
  assert.equal(handedOff.filter((job) => job.dispatchId === 'dispatch-1').length, 1);
  assert.equal(handedOff.find((job) => job.dispatchId === 'dispatch-1').id, 'hub-1');
  assert.ok(handedOff.some((job) => job.id === 'dispatch-2'));
  assert.ok(handedOff.some((job) => job.id === 'dispatcher-idle'));
});
