import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

const CLI = resolve('src/cli/run-worker.mjs');

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function runCli(args, { env = {}, stdin = '' } = {}) {
  const child = spawn(process.execPath, [CLI, ...args], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.end(stdin);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [code] = await once(child, 'exit');
  return { code, stdout, stderr, json: JSON.parse(stdout.trim()) };
}

test('CLI bridge sends an exact base64 task through the hub and returns its verifiable job', async (t) => {
  const task = 'line one\n$(must-not-execute)\n中文';
  let received;
  const server = createServer(async (req, res) => {
    if (req.url === '/_dsh/dsh-crew/ping') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, service: 'dsh-crew-hub' }));
      return;
    }
    if (req.method === 'POST' && req.url === '/_dsh/dsh-crew/jobs') {
      let body = '';
      for await (const chunk of req) body += chunk;
      received = JSON.parse(body);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, job: { id: 'hub-cli-test', status: 'running' } }));
      return;
    }
    if (req.url?.startsWith('/_dsh/dsh-crew/jobs/hub-cli-test')) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, job: {
        id: 'hub-cli-test', status: 'done', result: 'worker result', toolCalls: 2,
        tokens: { input: 11, output: 3, reasoning: 0 },
      } }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  });
  const port = await listen(server);
  t.after(() => server.close());

  const result = await runCli([
    'run', '--tier', 'flash', '--cwd', process.cwd(), '--task-base64', Buffer.from(task).toString('base64'),
  ], { env: { DSH_CREW_HUB: `http://127.0.0.1:${port}` } });

  assert.equal(result.code, 0, result.stderr);
  assert.equal(received.task, task);
  assert.equal(received.tier, 'flash');
  assert.equal(received.source, 'codex-cli');
  assert.equal(result.json.id, 'hub-cli-test');
  assert.equal(result.json.status, 'done');
  assert.equal(result.json.result, 'worker result');
});

test('CLI bridge rejects an empty task before dispatch', async () => {
  const result = await runCli(['run', '--tier', 'flash'], { env: { DSH_CREW_HUB: 'http://127.0.0.1:1' } });
  assert.equal(result.code, 1);
  assert.equal(result.json.status, 'failed');
  assert.match(result.json.error, /task is required/);
});

test('CLI bridge accepts the vision tier and validates unknown tiers', async (t) => {
  // Isolated HOME so the bridge reads default global config (tier_policy auto)
  // instead of whatever the machine's ~/.config/dsh-crew/config.json pins.
  const home = await mkdtemp(resolve(tmpdir(), 'dsh-crew-bridge-vision-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  let received;
  const server = createServer(async (req, res) => {
    if (req.url === '/_dsh/dsh-crew/ping') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, service: 'dsh-crew-hub' }));
      return;
    }
    if (req.method === 'POST' && req.url === '/_dsh/dsh-crew/jobs') {
      let body = '';
      for await (const chunk of req) body += chunk;
      received = JSON.parse(body);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, job: { id: 'hub-vision-test', status: 'running' } }));
      return;
    }
    if (req.url?.startsWith('/_dsh/dsh-crew/jobs/hub-vision-test')) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, job: {
        id: 'hub-vision-test', status: 'done', result: 'looked at the image', toolCalls: 1,
        tokens: { input: 5, output: 1, reasoning: 0 },
      } }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'not found' }));
  });
  const port = await listen(server);
  t.after(() => server.close());

  const result = await runCli([
    'run', '--tier', 'vision', '--cwd', process.cwd(), '--task-base64', Buffer.from('describe ./shot.png').toString('base64'),
  ], { env: { HOME: home, DSH_CREW_HUB: `http://127.0.0.1:${port}` } });

  assert.equal(result.code, 0, result.stderr);
  assert.equal(received.task, 'describe ./shot.png');
  assert.equal(received.tier, 'vision');
  assert.equal(result.json.status, 'done');

  const bad = await runCli(['run', '--tier', 'turbo', '--cwd', process.cwd(), '--task-base64', Buffer.from('x').toString('base64')]);
  assert.equal(bad.code, 1);
  assert.match(bad.json.error, /invalid tier: turbo/);
});
