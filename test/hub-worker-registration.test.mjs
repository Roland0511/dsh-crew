import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const originalHome = process.env.HOME;
const home = await mkdtemp(resolve(tmpdir(), 'dsh-crew-hub-registration-'));
process.env.HOME = home;
const { WorkerRegistry } = await import(`../src/hub/index.mjs?test=${Date.now()}`);

test.after(async () => {
  process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolve) => { resolvePromise = resolve; });
  return { promise, resolve: resolvePromise };
}

test('hub publishes a concrete worker before loader and preset initialization settle', async (t) => {
  const loader = deferred();
  const preset = deferred();
  const ctx = {
    get(name) {
      if (name === 'loader') return { await: () => loader.promise };
      if (name === 'agentPresets') return {
        resolve: () => preset.promise,
        mount: async () => {},
      };
      return undefined;
    },
    agents: {
      async create() { throw new Error('test stops before agent creation'); },
    },
    sessions: { flush: async () => {} },
  };
  const registry = new WorkerRegistry(ctx);
  t.after(() => registry.dispose());

  const job = await registry.spawn({
    task: 'pending initialization', tier: 'flash', effort: 'off',
    cwd: '/tmp/dsh-crew-test', source: 'codex', dispatchId: 'dispatch-test',
  });

  assert.equal(job.status, 'running');
  assert.equal(job.dispatchId, 'dispatch-test');
  assert.equal(registry.view(job).dispatchId, 'dispatch-test');
  assert.equal(registry.jobs.get(job.id), job);
  assert.equal(job.endedAt, null);

  loader.resolve();
  await Promise.resolve();
  assert.equal(job.status, 'running');
  assert.equal(job.endedAt, null);

  preset.resolve({ id: 'preset-test' });
  await job.promise;
  assert.equal(job.status, 'failed');
  assert.match(job.error, /test stops before agent creation/);
});

test('hub maps the vision tier to the multimodal model and its own preset key', async (t) => {
  const loader = deferred();
  const preset = deferred();
  let resolvedWanted;
  const ctx = {
    get(name) {
      if (name === 'loader') return { await: () => loader.promise };
      if (name === 'agentPresets') return {
        resolve: (wanted) => { resolvedWanted = wanted; return preset.promise; },
        mount: async () => {},
      };
      return undefined;
    },
    agents: {
      async create() { throw new Error('test stops before agent creation'); },
    },
    sessions: { flush: async () => {} },
  };
  const registry = new WorkerRegistry(ctx);
  registry.getConfig = () => ({ preset_vision: 'vision-preset' });
  t.after(() => registry.dispose());

  const job = await registry.spawn({
    task: 'look at the screenshot', tier: 'vision', effort: 'off',
    cwd: '/tmp/dsh-crew-test', source: 'codex',
  });

  assert.equal(job.status, 'running');
  assert.equal(job.tier, 'vision');
  assert.equal(job.model, 'deepseek-v4-flash-vision-exp');
  assert.equal(registry.view(job).model, 'deepseek-v4-flash-vision-exp');

  loader.resolve();
  await Promise.resolve();
  assert.equal(resolvedWanted, 'vision-preset');

  preset.resolve({ id: 'preset-test' });
  await job.promise;
  assert.equal(job.status, 'failed');
  assert.match(job.error, /test stops before agent creation/);

  await assert.rejects(
    registry.spawn({ task: 'x', tier: 'turbo', effort: 'off', cwd: '/tmp/dsh-crew-test', source: 'codex' }),
    /unknown tier "turbo"/,
  );
});
