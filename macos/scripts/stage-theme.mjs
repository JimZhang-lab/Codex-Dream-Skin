import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const [sourceDirArg, stageDirArg] = process.argv.slice(2);
if (!sourceDirArg || !stageDirArg) {
  throw new Error("Usage: stage-theme.mjs <source-theme-dir> <stage-dir>");
}

const MAX_CONFIG_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const OPEN_FLAGS = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);

function assertContained(rootPath, candidatePath, label) {
  const relative = path.relative(rootPath, candidatePath);
  if (
    relative === ""
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))
  ) return;
  throw new Error(`${label} must stay inside its theme directory`);
}

function sameStat(left, right) {
  return left.isFile() && right.isFile()
    && left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

async function readStableFile(filePath, label, maxBytes) {
  let handle;
  try {
    handle = await fs.open(filePath, OPEN_FLAGS);
  } catch (error) {
    if (error.code === "ELOOP") throw new Error(`${label} must not be a symbolic link`);
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new Error(`${label} must be a regular file`);
    if (before.size > maxBytes) throw new Error(`${label} is larger than ${maxBytes} bytes`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameStat(before, after)) {
      throw new Error(`${label} changed while it was being staged`);
    }
    if (bytes.length > maxBytes) throw new Error(`${label} is larger than ${maxBytes} bytes`);
    return { bytes, stat: after };
  } finally {
    await handle.close();
  }
}

function decodeJson(bytes, label) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (text.includes("\0")) throw new Error(`${label} contains NUL characters`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function themeImageNames(theme) {
  const names = [];
  const add = (value, label, required = false) => {
    if (value === undefined || value === null || value === "") {
      if (required) throw new Error(`${label} is required`);
      return;
    }
    if (typeof value !== "string" || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)) {
      throw new Error(`${label} must be a filename`);
    }
    const name = value.trim();
    if (!name || path.basename(name) !== name || name === "theme.json") {
      throw new Error(`${label} must stay inside its theme directory`);
    }
    names.push(name);
  };
  add(theme.image, "Theme image", true);
  add(theme.scene, "Theme scene image");
  add(theme.character, "Theme character image");
  if (theme.cardIcons !== undefined) {
    if (!Array.isArray(theme.cardIcons) || theme.cardIcons.length !== 4) {
      throw new Error("Theme cardIcons must contain exactly four filenames");
    }
    theme.cardIcons.forEach((value, index) => add(value, `Theme card icon ${index + 1}`, true));
  }
  if (theme.pet !== undefined) {
    if (!theme.pet || typeof theme.pet !== "object" || Array.isArray(theme.pet)) {
      throw new Error("Theme pet must be an object");
    }
    add(theme.pet.image, "Theme pet image", true);
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Theme image filenames must not repeat");
  }
  return names;
}

async function writeExclusive(filePath, bytes) {
  const temporary = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, bytes, { flag: "wx", mode: 0o600 });
    await fs.rename(temporary, filePath);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

async function main() {
  const sourceRoot = await fs.realpath(sourceDirArg);
  const sourceStat = await fs.stat(sourceRoot);
  if (!sourceStat.isDirectory()) throw new Error("Theme source must be a directory");

  const configPath = path.join(sourceRoot, "theme.json");
  const config = await readStableFile(configPath, "Theme config", MAX_CONFIG_BYTES);
  const theme = decodeJson(config.bytes, "Theme config");
  if (theme?.schemaVersion !== 1 || typeof theme.image !== "string" || !theme.image) {
    throw new Error("Theme config has an unsupported schema or image field");
  }
  const imageNames = themeImageNames(theme);
  const images = await Promise.all(imageNames.map(async (name, index) => {
    const label = index === 0 ? "Theme image" : `Theme asset ${name}`;
    const imagePath = path.resolve(sourceRoot, name);
    assertContained(sourceRoot, imagePath, label);
    const image = await readStableFile(imagePath, label, MAX_IMAGE_BYTES);
    if (image.bytes.length < 1) throw new Error(`${label} is empty`);
    return { name, image };
  }));

  const stageRoot = await fs.realpath(stageDirArg);
  const stageStat = await fs.stat(stageRoot);
  if (!stageStat.isDirectory()) throw new Error("Theme stage must be a directory");
  assertContained(stageRoot, path.join(stageRoot, "theme.json"), "Staged theme config");
  for (const name of imageNames) {
    assertContained(stageRoot, path.join(stageRoot, name), "Staged theme image");
  }

  // Write every referenced image from the already-open, stable descriptors.
  // The caller publishes assets first and theme.json last, so the watcher
  // only ever observes a complete pack; later source edits cannot race it.
  await Promise.all(images.map(({ name, image }) =>
    writeExclusive(path.join(stageRoot, name), image.bytes)));
  await writeExclusive(path.join(stageRoot, "theme.json"), config.bytes);
  process.stdout.write(`${JSON.stringify({ image: theme.image, files: imageNames })}\n`);
}

await main();
