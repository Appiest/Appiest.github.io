# Daily AI papers

The section of appiest.github.io at `/papers/`. Each day's brief is a Markdown file in `papers/content/`, and `papers/build.mjs` turns those files into `papers/index.html` and `papers/day/N/index.html`.

GitHub Pages serves this repo straight from the `main` branch, so the generated HTML is committed alongside the content. Nothing builds on GitHub's side.

## To add a day

Create `papers/content/day-NN.md`, run the build, commit both the content file and the regenerated `papers/` output, then push to `main`.

```sh
node papers/build.mjs
git add papers/
git commit -m "Add day NN: Short title"
git push origin main
```

The build needs Node 18 or newer and nothing else. Don't run `npm install`, and it never touches the network. It deletes and rewrites `papers/day/` on every run, so a removed content file also removes its page. Running it twice gives identical output.

## File name

`day-NN.md`, with the day number zero-padded to two digits: `day-09.md`, `day-22.md`, `day-105.md`.

## Front matter

Every field is required.

```markdown
---
day: 9
title: "Attention Is All You Need"
short_title: "Transformer"
authors: "Vaswani et al."
year: 2017
link: "https://arxiv.org/abs/1706.03762"
track: "Foundations"        # or "Frontier"
section: "The Transformer era"
tldr: "One sentence."
---
```

| Field | Rules |
| --- | --- |
| `day` | Whole number. Must match the file name. |
| `title` | The paper's full title. Used as the page heading. |
| `short_title` | Shown in the index and the previous and next links. |
| `authors` | Shown in the facts block. |
| `year` | Whole number. Places the paper on the timeline. |
| `link` | Starts with `http://` or `https://`. Becomes the "Read the paper" button. |
| `track` | `Foundations` for days 1 to 21, `Frontier` from day 22 on. |
| `section` | The index section name. Days 1 to 21 are grouped by day number, so this is a record only. Use `Frontier` for frontier days. |
| `tldr` | One sentence. Shown under the title and in the index. |

Wrap text values in double quotes. Inside double quotes, write a literal `"` as `\"`.

## Body

```markdown
# Day 9: Attention Is All You Need

Ashish Vaswani, Noam Shazeer and others, 2017.

## The problem

Paragraphs...

## Core ideas

### First core idea

Paragraphs...

## Walkthrough: one attention step

1. Steps...

## Key terms

- **Attention**: a weighted average where...
```

- Everything before the first `##` heading is skipped, because the page already shows the title, authors and year. Start the body with your own `# Day N: ...` header and author line as usual.
- Each `##` heading becomes a section and each `###` heading becomes a sub-section. Put each core idea under its own `###`.
- A section headed `## Key terms` or `## Glossary` becomes a set of boxed definitions. Write each term as a list item, `- **Term**: definition`. A `###` heading per term also works.
- A `##` or `###` heading that starts with `Walkthrough`, `Worked example`, `Step by step`, `In detail` or `The math` keeps its heading visible and folds its content behind a "Walk through it" toggle.
- Standard Markdown works everywhere else, including GitHub-style tables, fenced code blocks, block quotes and links.

## What makes the build fail

The build stops without writing anything, and lists every problem, when a content file:

- is missing a front matter field, or has a text field where a number belongs (or the reverse)
- has a `day` that doesn't match its file name, or a file name that isn't `day-NN.md`
- has a `track` that doesn't fit its day number, or a `link` that isn't a web address
- contains an em dash (U+2014) anywhere. Use a comma, colon, period or parentheses instead.

## Changing the design

The page templates live in `papers/lib/`. The look is copied from the teach-linalg course: the same Hanken Grotesk type, dark palette, list rows, facts block and boxed definitions. The stylesheet `papers/assets/papers.css` is compiled from `papers/styles.css` with Tailwind and committed. Daily builds never need to recompile it. If you change classes in `papers/lib/`, recompile once:

```sh
cd papers && npm install && npm run css
```

`papers/lib/vendor/marked.esm.js` is the Markdown parser (marked 18.0.14, MIT), copied in so the build has no dependencies.
