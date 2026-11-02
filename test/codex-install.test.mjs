import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { installCodex, installStatus, uninstallCodex } from '../src/install/install.mjs';

async function fixture(t) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-crew-codex-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  await mkdir(join(home, '.codex'), { recursive: true });
  await writeFile(join(home, '.codex', 'config.toml'), 'model = "existing-model"\n');
  return home;
}

test('installCodex registers config_file agents rendered for the CLI bridge without MCP', async (t) => {
  const home = await fixture(t);
  const result = installCodex({ home });
  assert.equal(result.ok, true);

  const config = await readFile(join(home, '.codex', 'config.toml'), 'utf8');
  assert.match(config, /model = "existing-model"/);
  assert.doesNotMatch(config, /mcp_servers\.dsh-crew/);
  assert.doesNotMatch(config, /server\.mjs/);
  assert.match(config, /\[agents\."ds-flash"\]/);
  assert.match(config, /config_file = "\.\/agents\/ds-flash\.toml"/);
  assert.match(config, /\[agents\."ds-pro"\]/);
  assert.match(config, /\[agents\."ds-vision"\]/);

  for (const file of ['ds-flash.toml', 'ds-pro.toml', 'ds-vision.toml']) {
    const agent = await readFile(join(home, '.codex', 'agents', file), 'utf8');
    assert.match(agent, /model = "gpt-5\.6-luna"/);
    assert.match(agent, /DSH_DISPATCH_UNAVAILABLE/);
    assert.match(agent, /src\/cli\/run-worker\.mjs/);
    assert.match(agent, /--task-base64/);
    assert.doesNotMatch(agent, /__DSH_CREW_CLI__/);
    assert.doesNotMatch(agent, /\[mcp_servers\./);
    assert.doesNotMatch(agent, /server\.mjs/);
  }

  const vision = await readFile(join(home, '.codex', 'agents', 'ds-vision.toml'), 'utf8');
  assert.match(vision, /--tier vision/);

  const configPrompt = await readFile(join(home, '.codex', 'prompts', 'dsh-config.md'), 'utf8');
  const statusPrompt = await readFile(join(home, '.codex', 'prompts', 'dsh-status.md'), 'utf8');
  assert.match(configPrompt, /src\/cli\/run-worker\.mjs/);
  assert.match(statusPrompt, /src\/cli\/run-worker\.mjs/);
  assert.doesNotMatch(configPrompt + statusPrompt, /__DSH_CREW_CLI__/);

  assert.deepEqual(installStatus({ home }).codex, { installed: true, agents: true, registered: true });
});

test('installCodex is idempotent and uninstall removes only managed registrations', async (t) => {
  const home = await fixture(t);
  installCodex({ home });
  installCodex({ home });
  const installed = await readFile(join(home, '.codex', 'config.toml'), 'utf8');
  assert.equal(installed.match(/# BEGIN dsh-crew managed agents/g)?.length, 1);

  const result = uninstallCodex({ home });
  assert.equal(result.ok, true);
  const config = await readFile(join(home, '.codex', 'config.toml'), 'utf8');
  assert.equal(config, 'model = "existing-model"\n');
  assert.deepEqual(installStatus({ home }).codex, { installed: false, agents: false, registered: false });
});
