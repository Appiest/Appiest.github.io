import { FOUNDATIONS } from "./curriculum.mjs";
import { escapeHtml, originMark } from "./html.mjs";

const START_YEAR = 1950;
const BREAK_YEAR = 2010;
const BREAK_SHARE = 0.22;
const BREAK_GAP = 0.9;

export function createTimelineScale(papers) {
  const years = [...FOUNDATIONS, ...papers].map((paper) => paper.year);
  const endYear = Math.max(...years, BREAK_YEAR + 1);
  return { endYear, years: [...new Set(years)].sort((a, b) => a - b) };
}

function shareOfAxis(year, scale) {
  if (year <= BREAK_YEAR) return ((year - START_YEAR) / (BREAK_YEAR - START_YEAR)) * BREAK_SHARE;
  return BREAK_SHARE + ((year - BREAK_YEAR) / (scale.endYear - BREAK_YEAR)) * (1 - BREAK_SHARE);
}

function percentAlong(year, scale, inset) {
  const share = Math.min(Math.max(shareOfAxis(year, scale), 0), 1);
  return Number((inset + share * (100 - 2 * inset)).toFixed(2));
}

function axisSegments(scale, inset, lineClass) {
  const breakAt = percentAlong(BREAK_YEAR, scale, inset);
  const segment = (from, to) => `<span class="absolute h-px ${lineClass}" style="left:${from}%;width:${Number((to - from).toFixed(2))}%"></span>`;
  return segment(inset, breakAt - BREAK_GAP) + segment(breakAt + BREAK_GAP, 100 - inset);
}

function contextDots(scale, inset, dotClass) {
  return scale.years
    .map((year) => `<span class="absolute ${dotClass} -translate-x-1/2 -translate-y-1/2 rounded-full" style="left:${percentAlong(year, scale, inset)}%"></span>`)
    .join("");
}

function labelAlignment(percent) {
  if (percent < 18) return "-translate-x-2";
  if (percent > 82) return "-translate-x-[calc(100%-0.5rem)]";
  return "-translate-x-1/2";
}

function axisLabel(year, scale, inset) {
  const percent = percentAlong(year, scale, inset);
  return `<span class="absolute top-3 text-meta text-text-muted ${labelAlignment(percent)}" style="left:${percent}%">${year}</span>`;
}

const HERO_INSET = 7;

export function timelineHero({ paper, scale, children = "" }) {
  const percent = percentAlong(paper.year, scale, HERO_INSET);
  return `<div class="relative aspect-[16/10] overflow-hidden rounded-card bg-surface-sunken shadow-lift sm:aspect-[3/1]">
  <div aria-hidden="true" class="grid-paper absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_85%)]"></div>
  <div class="absolute inset-x-0 top-[50%] sm:top-[56%]">
    ${axisSegments(scale, HERO_INSET, "bg-text-muted/35")}
    ${contextDots(scale, HERO_INSET, "size-1.5 bg-text-muted/55")}
    <span class="absolute -translate-x-1/2 -translate-y-1/2 scale-[2.25]" style="left:${percent}%">${originMark()}</span>
    <span class="absolute bottom-5 text-title tabular-nums ${labelAlignment(percent)}" style="left:${percent}%">${escapeHtml(paper.year)}</span>
    ${axisLabel(START_YEAR, scale, HERO_INSET)}
    ${axisLabel(BREAK_YEAR, scale, HERO_INSET)}
    ${axisLabel(scale.endYear, scale, HERO_INSET)}
  </div>
  ${children}
</div>`;
}

const THUMB_INSET = 10;
const THUMB_FRAME = "relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:w-36";

export function timelineThumbnail({ paper, scale }) {
  const percent = percentAlong(paper.year, scale, THUMB_INSET);
  return `<div aria-hidden="true" class="${THUMB_FRAME} shadow-lift">
  <div class="grid-paper-fine absolute inset-0 opacity-70"></div>
  <div class="absolute inset-x-0 top-[60%]">
    ${axisSegments(scale, THUMB_INSET, "bg-text-muted/30")}
    ${contextDots(scale, THUMB_INSET, "size-1 bg-text-muted/45")}
    <span class="absolute -translate-x-1/2 -translate-y-1/2" style="left:${percent}%">${originMark()}</span>
  </div>
</div>`;
}

export function placeholderThumbnail() {
  return `<div aria-hidden="true" class="${THUMB_FRAME} bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--color-line)_6px_7px)]"></div>`;
}
