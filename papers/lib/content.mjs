import fs from "node:fs";
import path from "node:path";
import { isFoundationDay } from "./curriculum.mjs";
import { ContentError, parseFrontMatter } from "./front-matter.mjs";

const EM_DASH = "\u2014";
const CONTENT_FILE = /^day-(\d{2,})\.md$/;
const TRACKS = ["Foundations", "Frontier"];
const TEXT_FIELDS = ["title", "short_title", "authors", "link", "track", "section", "tldr"];
const NUMBER_FIELDS = ["day", "year"];
const REQUIRED_FIELDS = ["day", "title", "short_title", "authors", "year", "link", "track", "section", "tldr"];

function lineNumbersContaining(source, needle) {
  return source
    .split("\n")
    .flatMap((line, index) => (line.includes(needle) ? [index + 1] : []));
}

function checkNoEmDash(source, fileName) {
  const lines = lineNumbersContaining(source, EM_DASH);
  if (lines.length === 0) return;
  const where = lines.length === 1 ? `line ${lines[0]}` : `lines ${lines.join(", ")}`;
  throw new ContentError(fileName, `contains an em dash (U+2014) on ${where}. Use a comma, colon, period or parentheses instead.`);
}

function checkFieldsPresent(fields, fileName) {
  const missing = REQUIRED_FIELDS.filter((key) => fields[key] === undefined || fields[key] === "");
  if (missing.length > 0) {
    throw new ContentError(fileName, `front matter is missing ${missing.map((key) => `"${key}"`).join(", ")}`);
  }
}

function checkFieldTypes(fields, fileName) {
  for (const key of NUMBER_FIELDS) {
    if (!Number.isInteger(fields[key])) throw new ContentError(fileName, `"${key}" must be a whole number, got ${JSON.stringify(fields[key])}`);
  }
  for (const key of TEXT_FIELDS) {
    if (typeof fields[key] !== "string") throw new ContentError(fileName, `"${key}" must be text, got ${JSON.stringify(fields[key])}`);
  }
}

function checkDayMatchesFileName(fields, fileName) {
  const fileDay = Number(fileName.match(CONTENT_FILE)[1]);
  if (fields.day !== fileDay) {
    throw new ContentError(fileName, `front matter says day ${fields.day}, but the file name says day ${fileDay}`);
  }
  const expectedName = contentFileName(fields.day);
  if (fileName !== expectedName) {
    throw new ContentError(fileName, `day ${fields.day} should be named ${expectedName}`);
  }
}

function checkTrack(fields, fileName) {
  if (!TRACKS.includes(fields.track)) {
    throw new ContentError(fileName, `"track" must be "Foundations" or "Frontier", got "${fields.track}"`);
  }
  const expected = isFoundationDay(fields.day) ? "Foundations" : "Frontier";
  if (fields.track !== expected) {
    throw new ContentError(fileName, `day ${fields.day} belongs to the ${expected} track, but "track" says "${fields.track}"`);
  }
}

function checkLink(fields, fileName) {
  if (!/^https?:\/\//.test(fields.link)) {
    throw new ContentError(fileName, `"link" must start with http:// or https://, got "${fields.link}"`);
  }
}

export function contentFileName(day) {
  return `day-${String(day).padStart(2, "0")}.md`;
}

function readPaper(directory, fileName) {
  const source = fs.readFileSync(path.join(directory, fileName), "utf8");
  checkNoEmDash(source, fileName);
  const { fields, body } = parseFrontMatter(source, fileName);
  checkFieldsPresent(fields, fileName);
  checkFieldTypes(fields, fileName);
  checkDayMatchesFileName(fields, fileName);
  checkTrack(fields, fileName);
  checkLink(fields, fileName);
  return { ...fields, body };
}

function listContentFiles(directory) {
  const names = fs.readdirSync(directory).filter((name) => !name.startsWith(".")).sort();
  const strays = names.filter((name) => !CONTENT_FILE.test(name));
  if (strays.length > 0) {
    throw new ContentError(strays[0], `doesn't match the day-NN.md naming pattern. Rename it (for example day-09.md) or move it out of papers/content/.`);
  }
  return names;
}

function tryReadPaper(directory, fileName, errors) {
  try {
    return [readPaper(directory, fileName)];
  } catch (error) {
    if (!(error instanceof ContentError)) throw error;
    errors.push(error.message);
    return [];
  }
}

export function loadPapers(directory) {
  const errors = [];
  const papers = listContentFiles(directory).flatMap((fileName) => tryReadPaper(directory, fileName, errors));
  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} content file${errors.length === 1 ? " has" : "s have"} problems`);
  }
  return papers.sort((a, b) => a.day - b.day);
}
