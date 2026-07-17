import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const [mode, ...args] = process.argv.slice(2);

function valueFor(name, fallback = "") {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
  return value;
}

function validateHex(value, name) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} must be a six-digit hex color.`);
  return value.toLowerCase();
}

function validatePreset(value) {
  if (!/^[a-z0-9-]{1,40}$/i.test(value)) {
    throw new Error("preset must contain only letters, numbers, and hyphens.");
  }
  return value.toLowerCase();
}

function hexToRgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, value, { mode: 0o600 });
    await fs.rename(temporary, file);
    await fs.chmod(file, 0o600);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

const outputDir = path.resolve(valueFor("output-dir", path.join(root, "assets")));
const themePath = path.join(outputDir, "theme.json");

if (mode === "reset-demo") {
  if (outputDir === path.join(root, "assets")) {
    throw new Error("Refusing to delete the bundled demo assets; pass a user --output-dir.");
  }
  await fs.rm(outputDir, { recursive: true, force: true });
  console.log("Restored the bundled abstract demo preset.");
  process.exit(0);
}

if (mode !== "custom") {
  throw new Error("Usage: write-theme.mjs custom [options] | reset-demo --output-dir <dir>");
}

const image = path.basename(valueFor("image", "background.jpg"));
if (!/\.(?:png|jpe?g|webp)$/i.test(image)) throw new Error("image must be a PNG, JPEG, or WebP filename.");
const imagePath = path.join(outputDir, image);
const imageStat = await fs.stat(imagePath);
if (!imageStat.isFile() || imageStat.size < 1 || imageStat.size > 16 * 1024 * 1024) {
  throw new Error("The prepared theme image must be non-empty and no larger than 16 MB.");
}
const sceneValue = valueFor("scene", "").trim();
const scene = sceneValue ? path.basename(sceneValue) : "";
if (sceneValue && scene !== sceneValue) {
  throw new Error("scene must stay inside the theme directory.");
}
if (scene && !/\.(?:png|jpe?g|webp)$/i.test(scene)) {
  throw new Error("scene must be a PNG, JPEG, or WebP filename.");
}
if (scene) {
  const scenePath = path.join(outputDir, scene);
  const sceneStat = await fs.stat(scenePath);
  if (!sceneStat.isFile() || sceneStat.size < 1 || sceneStat.size > 16 * 1024 * 1024) {
    throw new Error("The prepared scene image must be non-empty and no larger than 16 MB.");
  }
}
const characterValue = valueFor("character", "").trim();
const character = characterValue ? path.basename(characterValue) : "";
if (characterValue && character !== characterValue) {
  throw new Error("character must stay inside the theme directory.");
}
const cardIcons = ["card-icon-1", "card-icon-2", "card-icon-3", "card-icon-4"]
  .map((name) => valueFor(name, "").trim())
  .filter(Boolean)
  .map((filename) => {
    const basename = path.basename(filename);
    if (basename !== filename) throw new Error("card icons must stay inside the theme directory.");
    if (!/\.(?:png|jpe?g|webp)$/i.test(basename)) {
      throw new Error("card icons must be PNG, JPEG, or WebP files.");
    }
    return basename;
  });
if (cardIcons.length !== 0 && cardIcons.length !== 4) {
  throw new Error("card icons must provide either zero or four files.");
}
for (const cardIcon of cardIcons) {
  const cardIconPath = path.join(outputDir, cardIcon);
  const cardIconStat = await fs.stat(cardIconPath);
  if (!cardIconStat.isFile() || cardIconStat.size < 1 || cardIconStat.size > 16 * 1024 * 1024) {
    throw new Error("Each prepared card icon must be non-empty and no larger than 16 MB.");
  }
}
if (character && !/\.(?:png|jpe?g|webp)$/i.test(character)) {
  throw new Error("character must be a PNG, JPEG, or WebP filename.");
}
if (character) {
  const characterPath = path.join(outputDir, character);
  const characterStat = await fs.stat(characterPath);
  if (!characterStat.isFile() || characterStat.size < 1 || characterStat.size > 16 * 1024 * 1024) {
    throw new Error("The prepared character image must be non-empty and no larger than 16 MB.");
  }
}

const name = valueFor("name", "我的 Codex Dream Skin").trim().slice(0, 80);
const tagline = valueFor("tagline", "把喜欢的画面变成可交互的 Codex 工作台。").trim().slice(0, 160);
const quote = valueFor("quote", "MAKE SOMETHING WONDERFUL").trim().slice(0, 80);
const preset = validatePreset(valueFor("preset", "classic"));
const background = validateHex(valueFor("background", "#071116"), "background");
const panel = validateHex(valueFor("panel", "#0b1a20"), "panel");
const panelAlt = validateHex(valueFor("panel-alt", "#10272c"), "panel-alt");
const accent = validateHex(valueFor("accent", "#7cff46"), "accent");
const accentAlt = validateHex(valueFor("accent-alt", valueFor("accent", "#7cff46")), "accent-alt");
const secondary = validateHex(valueFor("secondary", "#36d7e8"), "secondary");
const highlight = validateHex(valueFor("highlight", "#642a8c"), "highlight");
const text = validateHex(valueFor("text", "#f2fff7"), "text");
const muted = validateHex(valueFor("muted", "#a7c2ba"), "muted");

const custom = {
  schemaVersion: 1,
  id: `custom-${Date.now()}`,
  preset,
  name: name || "我的 Codex Dream Skin",
  brandSubtitle: "CODEX DREAM SKIN",
  tagline: tagline || "把喜欢的画面变成可交互的 Codex 工作台。",
  projectPrefix: "选择项目 · ",
  projectLabel: "◉  选择项目",
  statusText: "DREAM SKIN ONLINE",
  quote: quote || "MAKE SOMETHING WONDERFUL",
  image,
  ...(scene ? { scene } : {}),
  ...(character ? { character } : {}),
  ...(cardIcons.length ? { cardIcons } : {}),
  colors: {
    background,
    panel,
    panelAlt,
    accent,
    accentAlt,
    secondary,
    highlight,
    text,
    muted,
    line: hexToRgba(accent, 0.32),
  },
};

await atomicWrite(themePath, `${JSON.stringify(custom, null, 2)}\n`);
console.log(`Saved custom theme “${custom.name}”.`);
