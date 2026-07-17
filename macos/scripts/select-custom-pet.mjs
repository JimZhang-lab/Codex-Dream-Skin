import fs from "node:fs/promises";
import path from "node:path";

const [configPath, petId] = process.argv.slice(2);

if (!configPath || !petId) {
  throw new Error("Usage: select-custom-pet.mjs <config-path> <pet-id>");
}
if (!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(petId)) {
  throw new Error(`Invalid custom pet id: ${petId}`);
}

const selectedAvatarId = `custom:${petId}`;

function desktopSection(content) {
  const header = /^[ \t]*\[desktop\][ \t]*(?:#.*)?(?:\r?\n|$)/m.exec(content);
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
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, value, { mode });
  await fs.rename(temporary, file);
  await fs.chmod(file, mode);
}

let content = "";
let mode = 0o600;
let exists = true;
try {
  content = await fs.readFile(configPath, "utf8");
  mode = (await fs.stat(configPath)).mode & 0o777;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  exists = false;
}

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
  await fs.mkdir(path.dirname(configPath), { recursive: true, mode: 0o700 });
  if (exists) {
    backupPath = await unusedBackupPath(configPath);
    await fs.copyFile(configPath, backupPath);
    await fs.chmod(backupPath, mode);
  }
  await atomicWrite(configPath, updated, mode);
}

console.log(JSON.stringify({
  changed,
  configPath,
  petId,
  selectedAvatarId,
  backupPath,
}, null, 2));
