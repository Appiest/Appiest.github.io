// Regenerates papers/index.html and papers/day/N/index.html from papers/content/day-NN.md.
// Run from anywhere: node papers/build.mjs. Uses only built-in Node modules and the vendored Markdown parser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPapers } from "./lib/content.mjs";
import { renderDayPage } from "./lib/day-page.mjs";
import { ContentError } from "./lib/front-matter.mjs";
import { renderIndexPage } from "./lib/index-page.mjs";
import { createTimelineScale } from "./lib/timeline.mjs";

const papersDirectory = path.dirname(fileURLToPath(import.meta.url));
const contentDirectory = path.join(papersDirectory, "content");
const dayDirectory = path.join(papersDirectory, "day");

function buildPages(papers) {
  const scale = createTimelineScale(papers);
  const papersByDay = new Map(papers.map((paper) => [paper.day, paper]));
  const pages = [{ file: path.join(papersDirectory, "index.html"), html: renderIndexPage(papers, scale) }];
  for (const paper of papers) {
    const html = renderDayPage({ paper, previous: papersByDay.get(paper.day - 1), next: papersByDay.get(paper.day + 1), scale });
    pages.push({ file: path.join(dayDirectory, String(paper.day), "index.html"), html });
  }
  return pages;
}

function checkOutputHasNoEmDash(pages) {
  const offender = pages.find((page) => page.html.includes("\u2014"));
  if (offender) throw new Error(`Generated ${path.relative(papersDirectory, offender.file)} contains an em dash (U+2014). Check the templates in papers/lib/.`);
}

function writePages(pages) {
  fs.rmSync(dayDirectory, { recursive: true, force: true });
  for (const page of pages) {
    fs.mkdirSync(path.dirname(page.file), { recursive: true });
    fs.writeFileSync(page.file, page.html);
  }
}

function failureMessages(error) {
  if (error instanceof AggregateError) return error.errors;
  if (error instanceof ContentError) return [error.message];
  return [error.stack ?? String(error)];
}

function reportFailure(error) {
  console.error("\nPapers build failed.\n");
  const messages = failureMessages(error);
  for (const message of messages) console.error(`  - ${message}`);
  console.error("\nNothing was written. Fix the files above and run `node papers/build.mjs` again.\n");
  process.exitCode = 1;
}

function main() {
  const papers = loadPapers(contentDirectory);
  const pages = buildPages(papers);
  checkOutputHasNoEmDash(pages);
  writePages(pages);
  const days = papers.map((paper) => paper.day).join(", ") || "none";
  console.log(`Built papers/index.html and ${papers.length} day page${papers.length === 1 ? "" : "s"} (days: ${days}).`);
}

try {
  main();
} catch (error) {
  reportFailure(error);
}
