import { icon, joinHtml } from "./html.mjs";
import { Marked } from "./vendor/marked.esm.js";

const markdown = new Marked({ gfm: true, async: false });

const KEY_TERMS_HEADING = /^(key terms|glossary)\b/i;
const WALKTHROUGH_HEADING = /^(walkthrough|worked example|step[- ]by[- ]step|in detail|the math)\b/i;
const BOLD_TERM_ITEM = /^\*\*(.+?)\*\*[ \t]*[:.\-–]?[ \t]*([\s\S]*)$/;
const PLAIN_TERM_ITEM = /^([^:*\n]{1,80}):[ \t]+([\s\S]+)$/;

function isHeading(token, depth) {
  return token.type === "heading" && token.depth === depth;
}

function withLinks(tokens, links) {
  const copy = [...tokens];
  copy.links = links;
  return copy;
}

function renderTokens(tokens, links) {
  return markdown.parser(withLinks(tokens, links));
}

function renderInline(text) {
  return markdown.parseInline(text);
}

function plainText(text) {
  return text.replace(/[*_`~]/g, "").trim();
}

function createSlugger() {
  const used = new Map();
  return (text) => {
    const base = plainText(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

function dropIntroduction(tokens) {
  const firstSection = tokens.findIndex((token) => isHeading(token, 2));
  if (firstSection === -1) return tokens.filter((token) => !isHeading(token, 1));
  return tokens.slice(firstSection);
}

function splitAtHeadings(tokens, depth) {
  const groups = [{ heading: null, tokens: [] }];
  for (const token of tokens) {
    if (isHeading(token, depth)) groups.push({ heading: token, tokens: [] });
    else groups.at(-1).tokens.push(token);
  }
  return groups.filter((group) => group.heading || group.tokens.length > 0);
}

function walkthrough(contentHtml) {
  return `<details class="walkthrough group">
<summary class="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 text-meta font-semibold text-accent [&::-webkit-details-marker]:hidden">${icon("caretRight", "size-3.5 transition-transform duration-200 group-open:rotate-90")}<span class="group-open:hidden">Walk through it</span><span class="hidden group-open:inline">Hide the walkthrough</span></summary>
<div class="mt-3 [&>*+*]:mt-4">${contentHtml}</div>
</details>`;
}

function headingHtml(heading, tag, slug) {
  return `<${tag} id="${slug(heading.text)}">${renderInline(heading.text)}</${tag}>`;
}

function sectionContent(heading, contentHtml) {
  if (heading && WALKTHROUGH_HEADING.test(plainText(heading.text))) return walkthrough(contentHtml);
  return contentHtml;
}

function definitionCard(termHtml, definitionHtml) {
  return `<div class="definition rounded-card bg-surface-raised p-6 shadow-lift sm:p-8"><dt class="text-section text-accent">${termHtml}</dt><dd class="mt-3 [&>*+*]:mt-3">${definitionHtml}</dd></div>`;
}

function splitTermItem(itemText) {
  const text = itemText.trim();
  const match = text.match(BOLD_TERM_ITEM) ?? text.match(PLAIN_TERM_ITEM);
  if (!match) return { term: null, definition: text };
  return { term: match[1].replace(/:$/, "").trim(), definition: capitalizeFirst(match[2].trim()) };
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function termCardFromListItem(item) {
  const { term, definition } = splitTermItem(item.text);
  const termHtml = term ? renderInline(term) : "";
  return definitionCard(termHtml, markdown.parse(definition));
}

function definitionList(cards) {
  return `<dl class="definitions grid gap-3">${cards.join("")}</dl>`;
}

function renderTermTokens(tokens, links) {
  return tokens.map((token) => {
    if (token.type !== "list") return renderTokens([token], links);
    return definitionList(token.items.map(termCardFromListItem));
  });
}

function renderKeyTerms(section, links) {
  const groups = splitAtHeadings(section.tokens, 3);
  const leading = groups[0].heading ? [] : groups.shift().tokens;
  const headedCards = groups.map((group) => definitionCard(renderInline(group.heading.text), renderTokens(group.tokens, links)));
  return joinHtml([...renderTermTokens(leading, links), headedCards.length > 0 ? definitionList(headedCards) : ""]);
}

function renderSubsection(group, links, slug) {
  const content = sectionContent(group.heading, renderTokens(group.tokens, links));
  if (!group.heading) return content;
  return joinHtml([headingHtml(group.heading, "h3", slug), content]);
}

function renderSectionBody(section, links, slug) {
  if (section.heading && KEY_TERMS_HEADING.test(plainText(section.heading.text))) return renderKeyTerms(section, links);
  const subsections = splitAtHeadings(section.tokens, 3).map((group) => renderSubsection(group, links, slug));
  return sectionContent(section.heading, joinHtml(subsections));
}

function renderSection(section, links, slug) {
  const heading = section.heading ? headingHtml(section.heading, "h2", slug) : "";
  return joinHtml([heading, renderSectionBody(section, links, slug)]);
}

export function renderBriefBody(source) {
  const tokens = markdown.lexer(source);
  const slug = createSlugger();
  const sections = splitAtHeadings(dropIntroduction(tokens), 2);
  return sections.map((section) => renderSection(section, tokens.links, slug)).join("\n");
}
