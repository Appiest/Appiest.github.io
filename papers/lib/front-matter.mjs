export class ContentError extends Error {
  constructor(fileName, message) {
    super(`${fileName}: ${message}`);
    this.name = "ContentError";
  }
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
const FIELD_LINE = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;
const DOUBLE_QUOTED = /^"((?:[^"\\]|\\.)*)"[ \t]*(?:#.*)?$/;
const SINGLE_QUOTED = /^'((?:[^']|'')*)'[ \t]*(?:#.*)?$/;
const INTEGER = /^-?\d+$/;

function parseBareValue(raw) {
  const value = raw.replace(/[ \t]+#.*$/, "").trim();
  return INTEGER.test(value) ? Number(value) : value;
}

function parseValue(raw, fileName, key) {
  const doubleQuoted = raw.match(DOUBLE_QUOTED);
  if (doubleQuoted) return parseDoubleQuoted(doubleQuoted[1], fileName, key);
  const singleQuoted = raw.match(SINGLE_QUOTED);
  if (singleQuoted) return singleQuoted[1].replaceAll("''", "'");
  if (raw.startsWith('"') || raw.startsWith("'")) {
    throw new ContentError(fileName, `the value of "${key}" has an unclosed quote`);
  }
  return parseBareValue(raw);
}

function parseDoubleQuoted(inner, fileName, key) {
  try {
    return JSON.parse(`"${inner}"`);
  } catch {
    throw new ContentError(fileName, `the value of "${key}" has an escape sequence that can't be read`);
  }
}

function isSkippable(line) {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

function parseFields(block, fileName) {
  const fields = {};
  for (const line of block.split(/\r?\n/)) {
    if (isSkippable(line)) continue;
    const match = line.match(FIELD_LINE);
    if (!match) throw new ContentError(fileName, `can't read this front matter line: ${line}`);
    fields[match[1]] = parseValue(match[2].trim(), fileName, match[1]);
  }
  return fields;
}

export function parseFrontMatter(source, fileName) {
  const match = source.match(FRONT_MATTER);
  if (!match) {
    throw new ContentError(fileName, 'must start with front matter between two "---" lines');
  }
  return { fields: parseFields(match[1], fileName), body: match[2] };
}
