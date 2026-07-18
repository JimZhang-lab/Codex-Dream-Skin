import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";

const [configPath, petId] = process.argv.slice(2);

if (!configPath || !petId) {
  throw new Error("Usage: select-custom-pet.mjs <config-path> <pet-id>");
}
if (!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(petId)) {
  throw new Error(`Invalid custom pet id: ${petId}`);
}

const selectedAvatarId = `custom:${petId}`;

function desktopSection(content) {
  const headers = [...content.matchAll(/^[ \t]*\[desktop\][ \t]*(?:#.*)?(?:\r?\n|$)/gm)];
  if (headers.length > 1) throw new Error("Refusing to rewrite multiple [desktop] tables.");
  const header = headers[0];
  if (!header) return null;
  const bodyStart = header.index + header[0].length;
  const remainder = content.slice(bodyStart);
  const nextHeader = /^[ \t]*\[/m.exec(remainder);
  const bodyEnd = nextHeader ? bodyStart + nextHeader.index : content.length;
  return { bodyStart, bodyEnd, body: content.slice(bodyStart, bodyEnd) };
}

function addDesktopSection(content, eol) {
  if (!content) return `[desktop]${eol}`;
  if (!content.endsWith("\n")) return `${content}${eol}${eol}[desktop]${eol}`;
  if (content.endsWith(`${eol}${eol}`)) return `${content}[desktop]${eol}`;
  return `${content}${eol}[desktop]${eol}`;
}

function selectPetInBody(body, value, eol) {
  const line = `selected-avatar-id = ${JSON.stringify(value)}`;
  const pattern = /^([ \t]*)selected-avatar-id[ \t]*=.*(?:\r?\n|$)/m;
  const matches = body.match(/^[ \t]*selected-avatar-id[ \t]*=.*$/gm) ?? [];
  if (matches.length > 1) throw new Error("Refusing to rewrite duplicate selected-avatar-id settings.");
  if (pattern.test(body)) {
    return body.replace(pattern, (_, indent) => `${indent}${line}${eol}`);
  }
  const trailingBlankLines = /((?:\r?\n[ \t]*){2,})$/.exec(body);
  if (trailingBlankLines) {
    return `${body.slice(0, -trailingBlankLines[1].length)}${eol}${line}${trailingBlankLines[1]}`;
  }
  const separator = body.length && !body.endsWith("\n") ? eol : "";
  return `${body}${separator}${line}${eol}`;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

async function unusedBackupPath(file) {
  const base = `${file}.bak-miku-pet-${timestamp()}`;
  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    try {
      await fs.access(candidate);
    } catch (error) {
      if (error.code === "ENOENT") return candidate;
      throw error;
    }
  }
  throw new Error(`Could not allocate a unique backup path for ${file}`);
}

async function atomicWrite(file, value, mode) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, value, { mode, flag: "wx" });
    await fs.rename(temporary, file);
    await fs.chmod(file, mode);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

function decodeStrictUtf8(bytes) {
  const content = bytes.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(bytes)) {
    throw new Error("Codex config is not valid UTF-8; nothing was changed.");
  }
  if (content.includes("\0")) {
    throw new Error("Codex config contains NUL characters; nothing was changed.");
  }
  return content;
}

function tomlStructureForLine(line) {
  let result = "";
  let quote = null;
  let escaped = false;
  for (const character of line) {
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (quote === "'") {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "#") break;
    else result += character;
  }
  return result;
}

function assertSupportedTomlLayout(content) {
  if (content.includes('\"\"\"') || content.includes("'''")) {
    throw new Error("Refusing to rewrite TOML containing multiline strings.");
  }
  for (const line of content.split(/\r?\n/)) {
    const structure = tomlStructureForLine(line);
    const assignment = structure.indexOf("=");
    if (assignment < 0) continue;
    let depth = 0;
    for (const character of structure.slice(assignment + 1)) {
      if (character === "[") depth += 1;
      if (character === "]") depth -= 1;
    }
    if (depth > 0) throw new Error("Refusing to rewrite TOML containing multiline arrays.");
  }
}

async function acquireConfigLock() {
  await fs.mkdir(path.dirname(configPath), { recursive: true, mode: 0o700 });
  const lockPath = `${configPath}.dream-skin.lock`;
  const deadline = Date.now() + 5000;
  while (true) {
    let created = false;
    try {
      await fs.mkdir(lockPath, { mode: 0o700 });
      created = true;
      await fs.writeFile(
        path.join(lockPath, "owner.json"),
        `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`,
        { mode: 0o600, flag: "wx" },
      );
      return async () => fs.rm(lockPath, { recursive: true, force: true });
    } catch (error) {
      if (created) {
        await fs.rm(lockPath, { recursive: true, force: true }).catch(() => {});
        throw error;
      }
      if (error.code !== "EEXIST") throw error;
      const lockStat = await fs.lstat(lockPath).catch(() => null);
      if (lockStat?.isSymbolicLink() || (lockStat && !lockStat.isDirectory())) {
        throw new Error(`Unsafe config lock path: ${lockPath}`);
      }
      if (lockStat && Date.now() - lockStat.mtimeMs > 30000) {
        let ownerAlive = false;
        try {
          const owner = JSON.parse(await fs.readFile(path.join(lockPath, "owner.json"), "utf8"));
          if (Number.isSafeInteger(owner.pid) && owner.pid > 0) {
            try {
              process.kill(owner.pid, 0);
              ownerAlive = true;
            } catch (probeError) {
              ownerAlive = probeError.code === "EPERM";
            }
          }
        } catch {}
        if (!ownerAlive) {
          await fs.rm(lockPath, { recursive: true, force: true });
          continue;
        }
      }
      if (Date.now() >= deadline) {
        throw new Error("Another Dream Skin config operation is still running; try again shortly.");
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function assertConfigUnchanged(expectedBytes, expectedStat, expectedExists) {
  let currentStat;
  try {
    currentStat = await fs.lstat(configPath);
  } catch (error) {
    if (error.code === "ENOENT" && !expectedExists) return;
    throw new Error("Codex config file identity changed during this operation; nothing was overwritten.");
  }
  if (
    !expectedExists || currentStat.isSymbolicLink() || !currentStat.isFile() ||
    currentStat.dev !== expectedStat.dev || currentStat.ino !== expectedStat.ino
  ) {
    throw new Error("Codex config file identity changed during this operation; nothing was overwritten.");
  }
  const currentBytes = await fs.readFile(configPath);
  if (!currentBytes.equals(expectedBytes)) {
    throw new Error("Codex config changed during this operation; nothing was overwritten.");
  }
}

async function main() {
  let content = "";
  let mode = 0o600;
  let exists = true;
  let originalBytes = Buffer.alloc(0);
  let originalStat = null;
  try {
    originalBytes = await fs.readFile(configPath);
    originalStat = await fs.lstat(configPath);
    if (originalStat.isSymbolicLink() || !originalStat.isFile()) {
      throw new Error("Codex config must be a regular file, not a symbolic link.");
    }
    content = decodeStrictUtf8(originalBytes);
    mode = originalStat.mode & 0o777;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    exists = false;
  }

  assertSupportedTomlLayout(content);

  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  let working = content;
  let section = desktopSection(working);
  if (!section) {
    working = addDesktopSection(working, eol);
    section = desktopSection(working);
  }

  const body = selectPetInBody(section.body, selectedAvatarId, eol);
  const updated = working.slice(0, section.bodyStart) + body + working.slice(section.bodyEnd);
  const changed = updated !== content;
  let backupPath = null;

  if (changed) {
    await assertConfigUnchanged(originalBytes, originalStat, exists);
    if (exists) {
      backupPath = await unusedBackupPath(configPath);
      await fs.copyFile(configPath, backupPath, fsConstants.COPYFILE_EXCL);
      await fs.chmod(backupPath, mode);
    }
    await assertConfigUnchanged(originalBytes, originalStat, exists);
    await atomicWrite(configPath, updated, mode);
  }

  console.log(JSON.stringify({
    changed,
    configPath,
    petId,
    selectedAvatarId,
    backupPath,
  }, null, 2));
}

const releaseLock = await acquireConfigLock();
try {
  await main();
} finally {
  await releaseLock();
}
