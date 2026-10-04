import { renderBriefBody } from "./body.mjs";
import { FOUNDATIONS_TOTAL, isFoundationDay } from "./curriculum.mjs";
import { escapeHtml, icon, originMark, pageShell } from "./html.mjs";
import { dayPath } from "./index-page.mjs";
import { timelineHero } from "./timeline.mjs";

function dayFact(paper) {
  return isFoundationDay(paper.day) ? `${paper.day} of ${FOUNDATIONS_TOTAL}` : String(paper.day);
}

function facts(paper) {
  const rows = [
    ["Day", dayFact(paper)],
    ["Authors", paper.authors],
    ["Year", String(paper.year)],
    ["Track", paper.track],
  ];
  const items = rows
    .map(([label, value]) => `<div><dt class="text-meta text-text-muted">${label}</dt><dd class="text-meta font-semibold">${escapeHtml(value)}</dd></div>`)
    .join("");
  return `<dl class="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">${items}</dl>`;
}

function readThePaper(paper) {
  return `<a href="${escapeHtml(paper.link)}" class="mt-8 inline-flex items-center gap-2 rounded-lg bg-surface-raised px-4 py-2.5 font-semibold shadow-lift transition-colors hover:bg-line">
${icon("arrowUpRight", "size-4 text-accent")}Read the paper
</a>`;
}

function pagerLink(paper, direction) {
  const isNext = direction === "next";
  const arrow = isNext
    ? `Day ${paper.day} ${icon("arrowRight", "size-4 transition-transform group-hover:translate-x-0.5")}`
    : `${icon("arrowLeft", "size-4 transition-transform group-hover:-translate-x-0.5")} Day ${paper.day}`;
  return `<a href="${dayPath(paper.day)}" class="group rounded-card bg-surface-raised p-5 shadow-lift transition-colors hover:bg-line${isNext ? " text-right sm:col-start-2" : ""}">
<span class="inline-flex items-center gap-1.5 text-meta text-text-muted">${arrow}</span>
<span class="mt-1 block font-semibold">${escapeHtml(paper.short_title)}</span>
</a>`;
}

function pager(previous, next) {
  if (!previous && !next) return "";
  return `<nav aria-label="More papers" class="mt-20 grid gap-3 sm:grid-cols-2">
${previous ? pagerLink(previous, "previous") : ""}
${next ? pagerLink(next, "next") : ""}
</nav>`;
}

export function renderDayPage({ paper, previous, next, scale }) {
  const body = `<main class="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-8">
<a href="/papers/" class="inline-flex items-center gap-2 rounded-md py-2 text-meta font-semibold text-text-muted transition-colors hover:text-text">
${originMark()}All papers
</a>
<div class="mt-4">
${timelineHero({ paper, scale })}
</div>
<article class="mx-auto mt-10 max-w-[68ch]">
<h1 class="text-title">${escapeHtml(paper.title)}</h1>
${facts(paper)}
${readThePaper(paper)}
<p class="mt-10 text-lead text-accent">${escapeHtml(paper.tldr)}</p>
<div class="notes mt-10">
${renderBriefBody(paper.body)}
</div>
</article>
${pager(previous, next)}
</main>`;

  return pageShell({ title: `Day ${paper.day}: ${paper.title}`, description: paper.tldr, body });
}
