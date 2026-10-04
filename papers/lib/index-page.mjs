import {
  FIRST_FRONTIER_DAY,
  FOUNDATION_SECTIONS,
  FOUNDATIONS,
  FOUNDATIONS_TOTAL,
  FRONTIER_WEEK_LENGTH,
  isFoundationDay,
} from "./curriculum.mjs";
import { escapeHtml, icon, joinHtml, originMark, pageShell } from "./html.mjs";
import { placeholderThumbnail, timelineHero, timelineThumbnail } from "./timeline.mjs";

export const INDEX_TITLE = "AI research, one paper a morning";
const INDEX_DESCRIPTION = "Daily plain-English briefs on the papers that built modern AI, then the frontier.";
const FRONTIER_GROUPING_THRESHOLD = FRONTIER_WEEK_LENGTH;

export function dayPath(day) {
  return `/papers/day/${day}/`;
}

function rowBody({ day, year, title, description }) {
  return `<div class="min-w-0">
  <p class="text-meta text-text-muted">Day ${day}<span class="text-text-muted/80">, ${escapeHtml(year)}</span></p>
  <h3 class="mt-0.5 text-body font-semibold leading-snug text-pretty">${escapeHtml(title)}</h3>
  <p class="mt-1 line-clamp-2 text-meta text-text-muted">${escapeHtml(description)}</p>
</div>`;
}

function publishedRow(paper, scale) {
  const body = rowBody({ day: paper.day, year: paper.year, title: paper.short_title, description: paper.tldr });
  return `<li><a href="${dayPath(paper.day)}" class="group flex items-center gap-4 rounded-card p-3 transition-colors hover:bg-surface-raised">
${timelineThumbnail({ paper, scale })}
${body}
</a></li>`;
}

function upcomingRow(foundation) {
  const body = rowBody({ day: foundation.day, year: foundation.year, title: foundation.short_title, description: foundation.authors });
  return `<li class="flex items-center gap-4 rounded-card p-3 opacity-55">
${placeholderThumbnail()}
${body}
</li>`;
}

function rowList(rows) {
  return `<ol class="mt-4 grid gap-1 sm:grid-cols-2">
${rows.join("\n")}
</ol>`;
}

function foundationSection(section, papersByDay, scale) {
  const foundations = FOUNDATIONS.filter((item) => item.day >= section.firstDay && item.day <= section.lastDay);
  const rows = foundations.map((item) => {
    const paper = papersByDay.get(item.day);
    return paper ? publishedRow(paper, scale) : upcomingRow(item);
  });
  return `<section>
<h2 class="text-section">${escapeHtml(section.name)}</h2>
${rowList(rows)}
</section>`;
}

function frontierWeekNumber(day) {
  return Math.floor((day - FIRST_FRONTIER_DAY) / FRONTIER_WEEK_LENGTH);
}

function groupByWeek(newestFirst) {
  const weeks = new Map();
  for (const paper of newestFirst) {
    const week = frontierWeekNumber(paper.day);
    weeks.set(week, [...(weeks.get(week) ?? []), paper]);
  }
  return [...weeks.values()];
}

function weekHeading(papers) {
  const days = papers.map((paper) => paper.day);
  const first = Math.min(...days);
  const last = Math.max(...days);
  return first === last ? `Day ${first}` : `Days ${first} to ${last}`;
}

function frontierWeeks(newestFirst, scale) {
  return groupByWeek(newestFirst)
    .map((papers) => `<div class="mt-8 first:mt-4">
<h3 class="text-meta font-semibold text-text-muted">${weekHeading(papers)}</h3>
${rowList(papers.map((paper) => publishedRow(paper, scale)))}
</div>`)
    .join("\n");
}

function frontierBody(frontier, scale) {
  if (frontier.length === 0) {
    return `<p class="mt-3 text-meta text-text-muted">Frontier papers start on day ${FIRST_FRONTIER_DAY}, once the foundations are done.</p>`;
  }
  const newestFirst = [...frontier].sort((a, b) => b.day - a.day);
  if (newestFirst.length <= FRONTIER_GROUPING_THRESHOLD) return rowList(newestFirst.map((paper) => publishedRow(paper, scale)));
  return frontierWeeks(newestFirst, scale);
}

function frontierSection(frontier, scale) {
  return `<section>
<h2 class="text-section">Frontier</h2>
${frontierBody(frontier, scale)}
</section>`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function progressLine(papers) {
  const foundationsOut = papers.filter((paper) => isFoundationDay(paper.day)).length;
  const frontierOut = papers.length - foundationsOut;
  const cadence = "A new paper lands every morning.";
  if (foundationsOut < FOUNDATIONS_TOTAL) return `${foundationsOut} of ${FOUNDATIONS_TOTAL} foundations out so far. ${cadence}`;
  if (frontierOut === 0) return `All ${FOUNDATIONS_TOTAL} foundations are out, and the frontier starts next. ${cadence}`;
  return `All ${FOUNDATIONS_TOTAL} foundations are out, plus ${plural(frontierOut, "frontier paper")}. ${cadence}`;
}

function latestPaper(paper, scale) {
  const chip = `<span class="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-surface/90 px-4 py-2.5 text-meta font-semibold backdrop-blur transition-colors group-hover:bg-surface">${icon("arrowRight", "size-4 text-accent")}Read day ${paper.day}<span class="font-normal text-text-muted">${escapeHtml(paper.authors)}</span></span>`;
  return `<section aria-label="Latest paper" class="mt-12">
<a href="${dayPath(paper.day)}" class="group block">
${timelineHero({ paper, scale, children: chip })}
<h2 class="mt-5 text-title">${escapeHtml(paper.title)}</h2>
<p class="mt-2 max-w-2xl text-lead text-text-muted">${escapeHtml(paper.tldr)}</p>
</a>
</section>`;
}

export function renderIndexPage(papers, scale) {
  const papersByDay = new Map(papers.map((paper) => [paper.day, paper]));
  const frontier = papers.filter((paper) => !isFoundationDay(paper.day));
  const latest = papers.at(-1);
  const sections = FOUNDATION_SECTIONS.map((section) => foundationSection(section, papersByDay, scale));

  const body = `<main class="relative">
<div aria-hidden="true" class="grid-paper pointer-events-none absolute inset-x-0 top-0 h-[42rem] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"></div>
<div class="relative mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-8 sm:pt-20">
<header class="flex items-start gap-3">
${originMark("mt-3 sm:mt-4")}
<div>
<h1 class="text-display">${INDEX_TITLE}</h1>
<p class="mt-3 text-lead text-text-muted">${progressLine(papers)}</p>
</div>
</header>
${latest ? latestPaper(latest, scale) : ""}
<div class="mt-20 space-y-14">
${joinHtml([...sections, frontierSection(frontier, scale)])}
</div>
</div>
</main>`;

  return pageShell({ title: INDEX_TITLE, description: INDEX_DESCRIPTION, body });
}
