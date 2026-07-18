import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const selector = path.resolve(here, "../scripts/select-custom-pet.mjs");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-dream-skin-pet-"));

function select(configPath, petId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [selector, configPath, petId], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(JSON.parse(stdout));
      else reject(new Error(stderr || `select-custom-pet exited with ${code}`));
    });
  });
}

try {
  const configPath = path.join(tempRoot, "config.toml");
  const original = "[desktop]\r\nselected-avatar-id = \"builtin:cat\"\r\nkeep = true\r\n";
  await fs.writeFile(configPath, original, { mode: 0o640 });

  const first = await select(configPath, "miku-future");
  assert.equal(first.changed, true);
  assert.equal(first.selectedAvatarId, "custom:miku-future");
  assert.ok(first.backupPath, "An existing config must be backed up before selecting a pet.");
  assert.equal(await fs.readFile(first.backupPath, "utf8"), original);
  const selected = await fs.readFile(configPath, "utf8");
  assert.match(selected, /selected-avatar-id = "custom:miku-future"\r\n/);
  assert.match(selected, /keep = true\r\n/);

  const second = await select(configPath, "miku-future");
  assert.equal(second.changed, false, "Selecting an already-selected pet must not rewrite config.toml.");
  assert.equal(second.backupPath, null);

  const freshPath = path.join(tempRoot, "fresh", "config.toml");
  const fresh = await select(freshPath, "miku-future");
  assert.equal(fresh.changed, true);
  assert.equal(fresh.backupPath, null);
  assert.equal(await fs.readFile(freshPath, "utf8"), "[desktop]\nselected-avatar-id = \"custom:miku-future\"\n");

  const invalidUtf8Path = path.join(tempRoot, "invalid-utf8.toml");
  const invalidUtf8 = Buffer.from([0x5b, 0x64, 0x65, 0x73, 0x6b, 0x74, 0x6f, 0x70, 0x5d, 0x0a, 0xff]);
  await fs.writeFile(invalidUtf8Path, invalidUtf8);
  await assert.rejects(select(invalidUtf8Path, "miku-future"), /not valid UTF-8/);
  assert.deepEqual(await fs.readFile(invalidUtf8Path), invalidUtf8);

  const duplicatePath = path.join(tempRoot, "duplicate.toml");
  const duplicate = "[desktop]\nselected-avatar-id = \"one\"\nselected-avatar-id = \"two\"\n";
  await fs.writeFile(duplicatePath, duplicate);
  await assert.rejects(select(duplicatePath, "miku-future"), /duplicate selected-avatar-id/);
  assert.equal(await fs.readFile(duplicatePath, "utf8"), duplicate);

  const duplicateTablePath = path.join(tempRoot, "duplicate-table.toml");
  const duplicateTable = "[desktop]\nkeep = true\n[desktop]\nkeep = false\n";
  await fs.writeFile(duplicateTablePath, duplicateTable);
  await assert.rejects(select(duplicateTablePath, "miku-future"), /multiple \[desktop\] tables/);
  assert.equal(await fs.readFile(duplicateTablePath, "utf8"), duplicateTable);

  await assert.rejects(select(configPath, "../miku"), /Invalid custom pet id/);
  console.log("PASS: custom pet selection is locked, strict-UTF-8, backed up, and idempotent.");
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
