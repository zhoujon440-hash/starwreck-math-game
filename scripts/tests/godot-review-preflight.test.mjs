import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Execute the real preflight against inert byte fixtures. Never launch a game or
// touch the real player save. These checks replace GDScript source-text matching.
const shell = 'pwsh';
const script = resolve('scripts/godot-review-preflight.ps1');

function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'godot-preflight-test-'));
  try {
    writeFileSync(join(dir, 'candidate.exe'), 'abc');
    writeFileSync(join(dir, 'candidate.pck'), '');
    writeFileSync(join(dir, 'save_01.json'), '{"keep":"player-progress"}');
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function invoke(dir, ...args) {
  return spawnSync(shell, ['-NoProfile', '-NonInteractive', '-File', script,
    '-ExePath', join(dir, 'candidate.exe'), '-PckPath', join(dir, 'candidate.pck'),
    '-SaveRoot', dir, ...args], { encoding: 'utf8', timeout: 20000 });
}

test('preflight reports exact hashes and real save state without changing any file', () => fixture(dir => {
  const before = readdirSync(dir).sort().map(name => [name, readFileSync(join(dir, name), 'hex')]);
  const result = invoke(dir, '-Resolution', '1920x1080');
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const report = JSON.parse(result.stdout);
  assert.equal(report.hashes.exe_sha256.toLowerCase(), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(report.hashes.pck_sha256.toLowerCase(), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.deepEqual(report.resolution, { width: 1920, height: 1080 });
  assert.equal(report.save_exists, true);
  assert.equal(report.acceptance_evidence, false);
  assert.equal(report.binary_launched, false);
  assert.equal(realpathSync.native(report.save_root), realpathSync.native(dir));
  assert.deepEqual(readdirSync(dir).sort().map(name => [name, readFileSync(join(dir, name), 'hex')]), before);
}));

test('preflight refuses missing EXE before producing an evidence report', () => fixture(dir => {
  rmSync(join(dir, 'candidate.exe'));
  const result = invoke(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing reviewed EXE artifact/);
  assert.equal(result.stdout.trim(), '');
}));

test('preflight refuses missing PCK before producing an evidence report', () => fixture(dir => {
  rmSync(join(dir, 'candidate.pck'));
  const result = invoke(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing reviewed PCK artifact/);
  assert.equal(result.stdout.trim(), '');
}));

test('preflight reports a clean isolated directory and the 1366 default without creating a save', () => fixture(dir => {
  rmSync(join(dir, 'save_01.json'));
  const result = invoke(dir);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const report = JSON.parse(result.stdout);
  assert.equal(report.save_exists, false);
  assert.deepEqual(report.resolution, { width: 1366, height: 768 });
  assert.deepEqual(readdirSync(dir).sort(), ['candidate.exe', 'candidate.pck']);
}));

test('preflight rejects unsupported resolution instead of claiming a requested screenshot size', () => fixture(dir => {
  const result = invoke(dir, '-Resolution', '640x480');
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout.trim(), '');
}));

test('relative save root follows PowerShell location just like the artifact paths', () => fixture(dir => {
  const quote = value => `'${value.replaceAll("'", "''")}'`;
  const command = `Set-Location -LiteralPath ${quote(dir)}\n& ${quote(script)} -ExePath ./candidate.exe -PckPath ./candidate.pck -SaveRoot .`;
  const result = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-Command', command],
    { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const report = JSON.parse(result.stdout);
  assert.equal(realpathSync.native(report.save_root), realpathSync.native(dir));
  assert.equal(report.save_exists, true);
}));
