---
day: 45
title: "The components of agent memory"
short_title: "Agent memory and dreaming (how an AI decides what to remember, then fixes it overnight)"
authors: "Lance Martin (Anthropic), with Caitlin Love, Tom Chivers, Rebecca Hiscott, Jake Eaton and Blake Wilson"
year: 2026
link: "https://www.anthropic.com/research/components-of-agent-memory"
track: "Frontier"
section: "Frontier"
tldr: "Anthropic breaks agent memory into four layers (raw transcripts, notes, linked wiki pages and a tiny always-loaded file) and shows that strong models remember best when told what memory is for rather than given rules, and that an offline \"dreaming\" pass that checks notes against the original transcripts can fix the wrong memories that otherwise send an agent in circles."
---

# Day 45: The components of agent memory

Lance Martin (Anthropic), with editorial guidance from Caitlin Love, Tom Chivers, Rebecca Hiscott, Jake Eaton and Blake Wilson. Published November 6, 2026 as an Anthropic research report (a long research article, not an arXiv paper). [Read the report](https://www.anthropic.com/research/components-of-agent-memory). Track: Frontier.

## TL;DR

An AI agent has to decide what to remember before it knows what will matter, so it will get some of it wrong, and the fix is to keep the raw record, keep the always-loaded memory tiny, and run a background "dreaming" pass that rereads past sessions to correct and reorganize the notes.

## What it builds on

RAG (Day 14) is the idea of letting a model look things up instead of memorizing them, and this report's "transcript search" layer is RAG over the agent's own past. ReAct (Day 18) is the think, act, look loop the agents run in. Two recent frontier days set this up directly: MemoryTax (Day 28) found that for strong models, plain transcripts plus search beat fancy memory systems, and this report largely agrees but asks what to build on top. EvoSpeakerMem (Day 36) dealt with whose memory is whose in a shared voice assistant; this report deals with whether the memory is right at all. Cortex (Day 23) explored the other road, baking knowledge into the model's weights, which this report deliberately leaves out.

## The world before this paper

Every AI agent forgets everything when a session ends. The common patches were: stuff past conversations back into the prompt, save "memories" as short facts (the way ChatGPT's memory began), or bolt on a memory product like Mem0 or Zep that extracts facts and retrieves them later. Each patch has the same weak spot. The agent decides what to save in the moment, and in the moment it does not know what will matter tomorrow. So it either saves too much (a cluttered archive nobody can use) or saves something wrong, and then trusts that wrong note in every future session. Meanwhile there was little shared vocabulary for the pieces of memory and little evidence about which pieces actually help, which is why studies like MemoryTax kept finding that elaborate memory often did not beat simply searching the old transcripts.

## Core ideas

### 1. Memory comes in four layers, from raw to refined

**What it is.** The report defines **agent memory** narrowly: knowledge the agent gains from experience and keeps between sessions as readable text. It explicitly excludes changing the model's weights (as Cortex did), **in-context learning** (picking things up within one conversation) and **compaction** (summarizing a long conversation so it fits). What remains is stacked in four layers:

1. **Transcripts.** The full, searchable log of what happened in every session. Nothing is filtered, so it is the ground truth.
2. **Memory notes.** Things the agent chose to write down during a session because they seemed **salient** (worth noticing), or tags it put on moments in the log.
3. **Representations.** Organized structures built from notes and sources, most often a **wiki**: linked pages on topics, like a personal Wikipedia the agent maintains.
4. **Injected context.** A small file loaded into the start of every single session, such as Claude Code's MEMORY.md.

**How it works.** Information flows upward and gets more refined at each level. The higher the layer, the more expensive and dangerous it is: the injected layer costs tokens every session, and a wrong note there spreads into everything. The report also notes that longer instruction files get followed less closely. So the advice is to keep the top layer short, like an index or a table of contents, and push details down to the layers below, leaving a link behind.

**Analogy.** Think of a documentary edit. The transcripts are every hour of raw footage. The memory notes are the logger's timecode notes ("great quote at 02:14:30"). The representation is the organized bin structure and story outline. The injected context is the one-page treatment the director reads before every edit session. You would never tape all the footage to the director's monitor, but you also never throw the footage away, because the notes are sometimes wrong.

### 2. Salience: tell the agent what memory is for, not what to save

**What it is.** The hardest decision in memory is what to write down. The report's finding is that strong models make this decision better on their own, given a clear purpose, than when given fixed rules.

**How it works.** The evidence comes from two places.

- **Pokémon Red.** Claude has been playing the game for a long time as a public test of long-horizon agents. An older model, Sonnet 3.7, wrote to memory about everything: 413 files across 225 folders, nearly a million characters, including things like its money and position that were already visible on screen. At one point it spent 17 steps reorganizing its files and took no game actions at all. It earned one badge. A newer model, Fable 5, wrote about ten files and one global.md "dashboard," saving only things the screen did not show (strategy, rules it had tested), and earned four badges. Opus 5.5 kept a small folder tracking its goal and next steps, and finished the game.
- **CL-Bench.** A database question benchmark where each question starts a fresh session and only a memory folder carries over. When the newer models were told to follow a fixed rule ("record only your failures"), they lost much of the benefit of memory: Opus 5's gain shrank by 0.234 and Opus 4.7's by 0.150. Letting them decide was better.

The one exception is older, weaker models. Sonnet 4.6 often did not even read its memory (less than half the time, versus about 9 times in 10 for Sonnet 5). Explicitly telling it to read memory and test its theories raised its score from 0.364 to 0.641. So: strong models want purpose, weaker models need steering.

**Analogy.** A good production assistant who knows the goal ("the director needs to make continuity decisions tomorrow") takes better notes than one handed a form that says "write down every prop." The form either misses what matters or drowns it.

**Worked example.** In Pokémon, "I have 3,200 coins" is a bad note: it is on screen, and it is stale in a minute. "The ledge south of Mt. Moon is one-way; don't go down it unless you want to restart the cave" is a good note: invisible, tested and useful for days.

### 3. Dreaming: fixing memory offline by rereading the raw record

**What it is.** **Dreaming** is an offline process, run between sessions, where the agent rereads past transcripts and uses them to check, correct and reorganize its notes and wiki. The name comes from neuroscience: during sleep, the hippocampus "replays" the day's experiences, which helps consolidate memory. The report credits earlier work on **sleep-time compute** from Letta and UC Berkeley, which had agents do memory work in the background while idle.

**How it works.** The report describes it through examples rather than a strict recipe. Put together, a dreaming pass:

1. Reads transcripts from past sessions as ground truth.
2. Tests existing notes against them and fixes the wrong ones.
3. Builds or updates wiki pages and links them to related notes and sources.
4. Merges duplicates and checks claims against original documents.
5. Repairs broken links and adds index pages.
6. Trims the injected layer, moving details down and leaving links.
7. Repeats across many sessions, with several agents coordinating through a shared log.

**The Mt. Moon story.** A note said the Pokémon Center was on the wrong side of Mt. Moon. The agent trusted it, fell off a one-way ledge three times and ended up back in Pewter City, never reaching the next town, Cerulean City. Interestingly, a run with no memory at all also never reached Cerulean. After a dreaming pass compared the note to what actually happened in the transcripts and corrected it, the resumed run reached Cerulean City at action 1,935. Bad memory was no better than no memory; corrected memory was what helped.

**Analogy.** It is the editor's overnight conform: going back to the camera originals to check that every note in the edit decision list actually matches the footage, fixing the timecodes that were logged wrong on set, before the director sits down in the morning.

### 4. Wikis on top of search, and where they help

**What it is.** The report tests whether a dreamed-up wiki (layer 3) beats simply searching the raw sources.

**How it works.** Opus 5 agents ran 128 dreaming sessions over a huge internal corpus from Stainless (a developer tools company Anthropic acquired): about 350,000 files, roughly 420 million tokens. The wiki grew from 103 pages and 766 links after 2 sessions to 222 pages and 12,893 links after 128. They also tested on Harvey LAB, a legal benchmark built from merger documents.

The finding is nuanced. A wiki alone never beat search. But wiki plus search beat search alone, and it was cheaper, because the agent could jump to the right page instead of rereading piles of files. The wiki helps most when an answer needs to be stitched together from many documents, and barely at all when the answer sits in one document.

**Analogy.** Search is the footage library's search box. The wiki is the producer's story map that says "the three interviews about the founder's childhood are here, here and here." The map does not replace the footage, but it gets you to the right clips much faster.

## Walkthrough: one memory cycle, step by step

1. A session starts. The small injected file loads: "Goal: reach Cerulean City. Key rules in /notes/routes.md."
2. The agent works and writes a note when something important and invisible happens: "Pokémon Center is east of Mt. Moon."
3. The session ends. The full transcript is saved, unedited.
4. Later, offline, a dreaming pass rereads the transcript and sees the agent actually found the Pokémon Center to the west.
5. Dreaming fixes the note, updates the "Mt. Moon" wiki page, and links it to the evidence in the transcript.
6. Dreaming checks the injected file is still short and points to the right places.
7. Next session, the agent loads the corrected memory and walks the right way.

## What they showed

- **Memory helped every model on CL-Bench.** Mean reward (a score between 0 and 1) with no memory versus with a memory folder: Opus 5.5 went from 0.655 to 0.838, Sonnet 5.5 from 0.644 to 0.833, Opus 5 from 0.564 to 0.828, Opus 4.7 from 0.383 to 0.700, Sonnet 5 from 0.306 to 0.610 and Sonnet 4.6 from 0.330 to just 0.364.
- **Newer models use memory differently, not just better.** Sonnet 4.6 wrote untested theories. Opus 4.7 separated confirmed from unconfirmed facts. Opus 5 was the first to "close the loop," recording validated rules with evidence and warnings.
- **Rules hurt strong models.** "Record only failures" cut Opus 5's memory gain by 0.234 and Opus 4.7's by 0.150.
- **Less is more for salience.** In Pokémon, roughly a million characters of notes earned one badge; about ten small files earned four.
- **Dreaming fixes poisoned memory.** A single wrong note blocked progress entirely until a dreaming pass corrected it against the transcript.
- **Wiki plus search wins, wiki alone does not.** On the Stainless corpus, search alone met 53% of graded criteria, wiki alone rose from 13% to 48% over 128 sessions, and wiki plus search reached 61% while saving about 20,000 tokens per question. On Harvey LAB's 24 multi-document merger questions, wiki plus search scored 87% versus 73% for search alone; on a single-document task there was no clear gain.
- **Structure matters when many agents share memory.** When several agents wrote into one shared table of contract terms, they overwrote each other and only 41 of 57 facts (72%) survived. Giving each contract its own page with terms quoted verbatim kept all 57.

Why it is convincing: the report tests the same ideas across very different settings (a game, a database benchmark, a giant codebase and legal documents) and is candid that some ideas help only in some of them.

## Limitations

- **It is an internal report, not a peer-reviewed paper.** Anthropic chose the corpora, ran the evaluations, and also sells the memory features being tested. Nobody has independently replicated the wiki results yet. (Also worth saying plainly: this brief is written by Claude, an Anthropic model, so read it with that in mind.)
- **Small and anecdotal pieces.** Pokémon comparisons are single runs of different models over different step counts. CL-Bench is one task family, its reward scale is not fully explained, and the chart covers 30 questions.
- **Wikis can bloat.** On a small 115 KB legal corpus, the wiki grew to 203 KB, about 1.77 times bigger than its sources, with some orphan pages nobody linked to.
- **Dreaming costs money and time.** It burns compute, the results are not available instantly (the beta API takes minutes to hours), and rechecking every memory constantly is impractical.
- **Note-taking distracts.** Writing notes mid-task takes attention away from the task itself.
- **Open questions remain**, which the report names itself: when to create memories, how often to dream, and how to keep memory current as facts change.
- **Security.** Anthropic's own documentation warns that untrusted input could inject malicious content into memory, which then loads into future sessions.

## Where this is today

### How it IS used

- **In Anthropic's own products, right now.** Claude Managed Agents offers memory stores in public beta (folders mounted into an agent's workspace, with version history kept for 30 days). Dreams is a research preview API: it takes a memory store plus 1 to 100 past sessions and writes a new, separate store, so the original is never overwritten and a human can review changes first. Claude Code loads the first 200 lines (or 25 KB) of a MEMORY.md file into every session, which is the "injected context" layer in practice.
- **OpenAI arrived at the same idea.** In June 2026 OpenAI rolled out a ChatGPT memory upgrade it also calls "dreaming," which synthesizes context from past chats instead of relying only on individually saved memories, and reported cutting its compute cost about fivefold so it could run at scale. Two leading labs converging on background consolidation is a strong signal.
- **Letta's sleep-time agents** are the direct ancestor: a second agent runs in the background, rereads conversations and rewrites the main agent's memory blocks, with no delay for the user.
- **Memory-layer startups** like Mem0 (which raised $24M in October 2025 and is used inside frameworks like CrewAI and as the memory provider for AWS's Agent SDK) represent the "extract facts as you go" approach this report adds a correction step to.

### How it ISN'T used

- **"Save everything" memory is out.** The report's Sonnet 3.7 example is a cautionary tale against archives that log every detail, and the field is moving to small, curated top layers.
- **Rigid rule-based memory for strong models is fading.** Fixed instructions about what to store actually hurt the newest models in these tests.
- **Wikis as a replacement for search did not pan out.** Search over raw records stays the foundation (MemoryTax, Day 28, reached a similar conclusion); wikis are an add-on where answers span many documents.
- **Real-time correction is not the norm.** Dreaming happens offline and in batches, not continuously.

### Lineage

RAG over documents (Day 14) -> MemGPT and saved-fact memories in chat apps -> sleep-time compute (Letta and UC Berkeley, 2025) -> layered memory with offline dreaming (this report, and ChatGPT's 2026 memory) -> what you use today in Claude Code's MEMORY.md and ChatGPT's memory.

## Why it matters for Brendan

- **Your permissioned relationship memory startups and Amelia.** This report is close to a design spec for you. The four layers map neatly: keep every conversation's raw transcript as ground truth (with consent), let the model write short notes about each person, organize them into a per-person page (a mini wiki), and inject only a tiny summary when you are about to talk to that person. The Mt. Moon lesson matters most: if Amelia mishears a name or attributes a fact to the wrong person, that wrong note will be trusted forever unless something rereads the original audio transcript and fixes it. A nightly dreaming pass, writing to a reviewable copy rather than overwriting, is also a natural place to put "permissioned": a person could approve or reject what was learned about them.
- **Unstall.** A real estate agent's chief of staff needs memory of clients, listings and preferences across months. The contract experiment is directly relevant: when multiple helper agents wrote into one shared table, 28% of facts were lost. Give each client or each deal its own page, and quote key terms (prices, dates, contingencies) verbatim rather than paraphrasing them.

## Key terms

- **Agent memory**: knowledge an agent gains from experience and keeps between sessions as readable text, not as changes to the model itself.
- **Transcript**: the complete, unfiltered log of a session, used as ground truth.
- **Salience**: how worth noticing something is; the judgment of what to write down.
- **Injected context**: the small set of notes loaded into the start of every session.
- **Dreaming**: an offline pass that rereads past sessions to correct, merge and reorganize memory.
- **Sleep-time compute**: doing useful work (like memory upkeep) in the background while the agent is not talking to anyone.

## If you only have 10 more minutes

Read the section describing the four components of memory, then the Pokémon Red sections on salience and the Mt. Moon correction; together they carry the whole argument and are written as stories, not math. Skip the detailed Stainless and Harvey numbers unless you are building a document-search product, and skip the product documentation details.

## One question to think about

If an AI that remembers you is only trustworthy when it can go back and check its notes against the raw record, who should own and control that raw record of your conversations: you, the app, or the people you were talking to?

## Sources

- [The components of agent memory (Anthropic)](https://www.anthropic.com/research/components-of-agent-memory)
- [Claude agent memory: Opus 5.5 rises from 0.655 to 0.838 on CL-Bench with dreaming (Data Studios)](https://www.datastudios.org/post/anthropic-claude-agent-memory-dreaming-opus-5-5-cl-bench)
- [Anthropic's agent memory study: rules on what to save cost Claude much of the gain (DEV Community)](https://dev.to/gabrielanhaia/anthropics-agent-memory-study-rules-on-what-to-save-cost-claude-much-of-the-gain-3089)
- [OpenAI rolls out new ChatGPT memory system to keep personalization current (EdTech Innovation Hub)](https://edtechinnovationhub.com/news/openai-rolls-out-new-chatgpt-memory-system-to-keep-personalization-current)
- [Memory blocks and sleep-time compute in Letta (course notes)](https://learn.traeai.com/t/ai-engineering/phases/14-agent-engineering/08-memory-blocks-sleep-time-compute.html)
- [Mem0 raises $24 million for a memory layer for AI agents (Pulse 2.0)](https://pulse2.com/mem0-24-million-raised-for-powering-memory-layer-for-ai-agents/)
- [Daily Digest, 2026-11-06 (Antoine Buteau)](https://antoinebuteau.com/daily-digest-2026-11-06)
