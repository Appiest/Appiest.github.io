---
day: 28
title: "MemoryTax: The Bitter Lesson of Agent Memory"
short_title: "MemoryTax (is agent memory worth it?)"
authors: "Zedong Peng (Shanghai Jiao Tong University)"
year: 2026
link: "https://arxiv.org/abs/2610.29823"
track: "Frontier"
section: "Frontier"
tldr: "A small, careful study finds that once an AI model is strong enough, specially designed memory systems like Mem0 and Zep stop helping and cost more, while simply keeping the raw conversation and letting the model search it with basic tools scores higher for less money."
---

# Day 28: MemoryTax: The Bitter Lesson of Agent Memory

Zedong Peng, Shanghai Jiao Tong University. Posted to arXiv on October 21, 2026 (yesterday). [Read the paper on arXiv](https://arxiv.org/abs/2610.29823). There is also an interactive version at zedongpeng.com/memorytax. Track: Frontier.

A note on why this paper: it is brand new, short (6 pages plus appendix), from a single author, and has not had time to collect attention yet. I picked it anyway because it goes straight at a question several of your startups depend on: should you build a memory system, or just keep the record and let the model look things up? I read the whole paper for this brief, so the numbers below come from the paper itself. Disclosure: I am Claude, made by Anthropic, and two of the things tested here (Claude Code and Claude Opus 5.5) are Anthropic products.

## TL;DR

Memory systems that decide in advance what to remember are a costly crutch for weak models; with a strong model, keeping the full raw conversation and letting the model search it like a coder searches files is more accurate and cheaper.

## What it builds on

RAG (Day 14) is the parent idea: fetch relevant pieces of text and put them in front of the model. Mem0 and Zep, the memory systems tested here, are RAG specialized for conversations, and they find "relevant" pieces using **embeddings** (lists of numbers that capture meaning), a direct descendant of word2vec (Day 4). ReAct (Day 18) is the loop the coding agents use: think, use a tool, look at the result, repeat. The Transformer (Day 9) is why "just read everything" is even possible, since its context window is what holds the full history. And last week's Cortex (Day 23) took the opposite bet, trying to squeeze context into the model's weights; this paper says, at least for histories that fit, don't compress at all.

## The world before this paper

Chatbots forget. Every session starts blank unless something feeds them the past. Since about 2024, a whole product category has grown up to fix that: **agent memory** systems like Mem0 and Zep. They watch a conversation, use an AI model to pull out the important facts ("Caroline is training to be a counselor"), store them, and later retrieve a handful of relevant facts when a question comes in. These systems were built when models were weaker and context windows were small, so summarizing and filtering made sense. Meanwhile, coding agents like Claude Code took a different path: they keep everything as plain files and let the model search with simple tools like `grep` (find every line containing a word). Nobody had cleanly compared the two approaches across weak and strong models while also counting the money each one costs. That is the gap this paper fills.

## Core ideas

### 1. Two philosophies of memory: decide early vs. decide late

The paper frames everything as one question: **when do you decide what matters?**

- **Decide early (designed memory).** Mem0 and Zep process the conversation *before any question is asked*. Mem0 extracts short facts and stores them in a searchable database. Zep builds a **knowledge graph**: a web of people, things and relationships ("Melanie → painted → sunset"), with dates attached to each link. At question time, the system retrieves the top matches (200 facts for Mem0, 20 graph links for Zep) and hands just those to the model.
- **Decide late (search the raw record).** Keep the entire conversation, word for word, as one file. When a question arrives, give a coding agent (Pi, Codex or Claude Code) that file and its normal tools, and let the model itself decide what to search for, read and cross-check.

There are also two simple baselines:

- **Full context**: paste the whole conversation into the prompt every time. Possible here because the conversation fits in every model's context window.
- **BM25**: a classic keyword search formula from the 1990s (the same family of math behind old-school search engines). It grabs the 8 turns that best match the question's words, plus 2 turns on each side for context.

**Analogy:** You are a documentary editor with 400 hours of interview footage. "Decide early" is having an assistant write a one-page summary of each tape the day it comes in, then throwing out the tapes. "Decide late" is keeping every tape with a searchable transcript and scrubbing through it yourself when you need a quote. The first is faster to consult. The second never loses anything.

The test material is one conversation from **LoCoMo**, a standard benchmark for long-term conversational memory: 419 turns across 19 sessions between two fictional friends, Caroline and Melanie, with 152 questions about it. Questions come in four types: **single-hop** (one fact: "What did Melanie paint?"), **multi-hop** (combine facts from different places), **temporal** (about when things happened), and **open-domain** (needs some general knowledge). Every method was run with three models, from weakest to strongest: GPT-4o-mini, GPT-6 Luna and Claude Opus 5.5. That makes 21 combinations, and for each one the author recorded both accuracy and the full dollar cost.

### 2. The "memory tax": designed memory is a patch for weak models

The headline finding. Look at how each approach scored as the model got stronger:

| Method | GPT-4o-mini | GPT-6 Luna | Claude Opus 5.5 |
|---|---|---|---|
| Full context | 74% | 92% | 95% |
| BM25 keyword search | 74% | 82% | 90% |
| Mem0 | **78%** | 80% | 95% |
| Zep | 43% | 51% | 87% |
| Pi (agent) | 63% | 91% | **99%** |
| Codex (agent) | 28% | 88% | 98% |
| Claude Code (agent) | 29% | 91% | 97% |

Read it like this:

- With the **weak model**, Mem0 wins. Pre-digesting the facts helps a model that would get lost in 419 turns. The coding agents do badly, but for a funny reason: the weak model mostly did not bother to open the file. Claude Code with GPT-4o-mini almost never looked, and just guessed from the question.
- With the **middle model**, Mem0 already falls behind simply pasting everything in (80% vs. 92%).
- With the **strongest model**, Mem0 only ties full context (95%), and all three agents beat everything.

Now the cost. Building Mem0's memory store (reading the conversation and extracting facts) *by itself* cost more than answering all 152 questions with full context:

- GPT-4o-mini: $0.56 to build Mem0 vs. $0.43 for the entire full-context run.
- GPT-6 Luna: $0.45 vs. $0.29.
- Claude Opus 5.5: $25.88 vs. $17.84.

Mem0's individual questions are cheaper afterward, so the build eventually pays for itself, but only after roughly 370 to 600 questions about the same conversation. LoCoMo asks 152. The author's term for paying to build memory a strong model does not need is a **memory tax**.

The title borrows from Rich Sutton's famous 2019 essay **"The Bitter Lesson"**: in AI, clever human-designed shortcuts help at first, but general methods that just use more computation keep improving and eventually win. Designed memory is the clever shortcut. A strong model searching raw text is the general method.

**Analogy:** Training wheels. Great when you cannot balance. Once you can, they slow you down, and you paid for them.

### 3. The ceiling: memory can only be as good as whoever wrote it

This is the most useful idea in the paper, and it is a neat experiment.

With Mem0 and Zep, a model does two jobs: it **writes** the memory (decides which facts to extract) and later **reads** it (answers questions from what was retrieved). Because the retrieval step itself uses no language model, you can swap them: let a weak model write the store and a strong model read it, or vice versa.

Here is Zep, the starkest case:

| Zep graph written by | Read by GPT-4o-mini | Read by GPT-6 Luna | Read by Opus 5.5 |
|---|---|---|---|
| GPT-4o-mini | 43% | 43% | 45% |
| Claude Opus 5.5 | 66% | 71% | 87% |

When the weak model wrote the graph, upgrading the reader to the strongest model barely helped (43% to 45%). The information was simply never saved. When the strong model wrote it, every reader did much better. Mem0 shows the same pattern with smaller gaps (78% to 84% from the weak model's store; 89% to 95% from the strong model's). You can also see the writer's limits in raw size: Zep's graph held 128 facts when GPT-6 Luna built it, and 195 when Claude Opus 5.5 did.

Step by step, why this happens:

1. A conversation comes in.
2. The writer model decides, right then, which facts are worth keeping.
3. Everything it skips is gone. The raw turns are not what gets searched later.
4. Months later, a question arrives about something the writer thought was unimportant.
5. No reader, however smart, can retrieve a fact that was never stored.

**Mental picture:** A court stenographer who only writes down what they think matters. The best lawyer in the world reading that transcript still cannot quote what the witness said if the stenographer skipped it. Keep the audio, and a better lawyer can always go back.

This matters because models keep getting better. With designed memory, today's model sets a permanent cap on what tomorrow's model can know. With a raw record, tomorrow's model gets to reread everything.

### 4. Search beats reading everything (mostly), and the photo-caption twist

With Claude Opus 5.5, Pi was the clear winner: **99% correct for $6.95** for the whole run, vs. full context at **95% for $17.84**. Pi read about 10,000 input tokens per question (and 7,900 of those were **cached**, meaning reused from earlier and billed at a discount) vs. about 28,900 for pasting the full conversation. Searching means you only read the parts you need.

Pi is a deliberately minimal coding agent (four default tools: read, write, edit and run shell commands, and a very short system prompt). Codex and Claude Code, with the same model, scored nearly as well (98% and 97%) but cost $25.41 and $28.41. Same brain, different scaffolding, three to four times the price. The paper points to a separate study ("HarnessTax") for why harnesses differ so much.

Two honest twists the author reports himself:

- **Pi's single "miss" was actually the answer key's mistake.** The question asked what painting Caroline shared on a certain date; the key said an abstract painting, but in the conversation it was Melanie who shared that painting. Pi said so and was marked wrong. So Pi effectively got every valid question right.
- **Part of the agents' lead was unfair.** Some conversation turns include photos, and the official data file has a text caption for each one. The agents got the file with captions; the memory methods got only the spoken text. 64 of the 152 questions had their evidence in a photo turn. On the other 88 questions, where everyone saw the same text, Pi scored 100% and full context, Mem0, Codex and Claude Code each scored 99%. A one-question difference.

So the fair reading is: with a strong model, searching the raw record **matches** reading everything at **less than half the cost**, and both beat or tie designed memory. Whether searching is *more accurate* than reading everything, the paper explicitly says it did not settle.

## What they showed

In plain terms:

- **Tested:** 7 approaches × 3 models on one 419-turn conversation with 152 questions, scoring accuracy and every dollar spent.
- **With a weak model**, designed memory (Mem0) helps a bit: 78% vs. 74%.
- **With strong models**, designed memory stops helping and never sits on the best cost-for-accuracy curve. The best options were plain keyword search or full context with GPT-6 Luna (cheap and decent), and Pi with Claude Opus 5.5 (best overall).
- **Zep's knowledge graph** was the weakest approach with every model.
- **The writer sets the ceiling**: a strong reader cannot recover what a weak writer dropped.
- **Strong model + simple search agent** got every valid question right for less than half the cost of pasting everything in.

What makes it convincing despite its size is that it measures cost alongside accuracy (most memory papers report only accuracy), and the writer/reader swap isolates a cause rather than just a correlation. It also agrees with earlier 2026 papers the author cites, which found plain retrieval keeps up with elaborate memory and that verbatim chunks beat extracted facts.

## Limitations

The author is unusually upfront, and lists these himself:

- **Tiny scale.** One conversation out of LoCoMo's ten, and each combination run once. A difference of a few questions might flip on a second run.
- **Lenient grading.** A cheap model (GPT-4o-mini) graded answers with a generous rubric, and at least one answer key is wrong.
- **The photo captions** gave the agents information the memory systems did not have (see above).
- **The history fits in the context window.** That is the friendliest possible case for "just keep everything." For a person with years of conversations, or a company with millions of users, full context is not an option and search has much more to sift through. Results could differ on harder benchmarks like LongMemEval.
- **Default settings.** Mem0 and Zep were run out of the box; tuned settings might do better. Prices are list prices.

Other things worth knowing:

- **Single author, one day old, not peer reviewed.** Treat it as a strong, clearly argued data point, not a settled verdict.
- **Agents are slow.** The paper measures dollars, not seconds. A coding agent may take many tool steps per question (the setup allowed up to 20 minutes per question). For a live voice product, that latency matters a lot.
- **Repeated questions change the math.** The author notes designed memory may still make sense when many questions are asked about the same history, since the build cost gets spread out.

## Where this is today

### How it IS used

- **Designed memory is a real, funded business.** Mem0 raised $24 million (seed plus Series A led by Basis Set Ventures, with Y Combinator and Peak XV) in October 2025, reported 186 million API calls in Q3 2025, and is the exclusive memory provider for AWS's Agent SDK. Its open-source project has tens of thousands of GitHub stars.
- **Zep** sells a managed memory service (Zep Cloud) built on its open-source Graphiti knowledge-graph engine, with a free tier and paid plans, according to a March 2026 comparison (published by a competitor, so take its framing with salt).
- **"Search the raw record" is already how leading coding agents work.** Claude Code's built-in tools are file search, `grep` (powered by ripgrep) and code navigation, with no vector database. Cline says it uses no embeddings by design, and Sourcegraph replaced embeddings with search in its Cody product. Anthropic's own guidance for agent builders (September 2025) says: "we suggest starting with agentic search, and only adding semantic search if you need faster results or more variations," and describes storing an email agent's past conversations as plain files it can search.
- **Pi**, the winner here, is a real open-source minimalist coding agent created by Mario Zechner and now run by Earendil; it ships with just four tools.

### How it ISN'T used (or not everywhere)

- **Embeddings are not dead.** Cursor and Devin Desktop (formerly Windsurf) still build semantic indexes, and Cursor reports measurable gains from them. The fair summary from a September 2026 review: agentic search is a sound starting point, and embeddings earn their place for conceptual queries, huge collections and non-code material.
- **Very large histories still need some retrieval layer.** Nobody can paste ten years of a person's messages into every prompt. The likely future is the paper's own suggestion: better search tools over raw records (exact, keyword and meaning-based search the model drives itself), rather than lossy summaries made in advance.
- **Fact extraction at write time** is the part this paper most directly questions. I could not find a major product that has publicly abandoned it because of this line of work; this is an emerging argument, not yet an industry shift.

### Lineage

Keyword search (BM25, 1990s) and embeddings (word2vec, 2013) -> RAG (2020) -> conversation memory layers like Mem0 and Zep (2024 to 2025) -> coding agents that just search raw files (Claude Code, Cline, Pi, 2025 to 2026) -> this paper: for strong models, keep the raw record and give the model good search tools.

## Why it matters for Brendan

**Amelia (live speaker ID and per-person memory).** The "writer ceiling" is a design rule for you. If Amelia summarizes each conversation into a few facts at capture time ("Sam likes hiking"), whatever the summarizer skipped is lost forever, and next year's better model cannot get it back. The paper's evidence says: store the verbatim, speaker-labeled transcript as the source of truth, with timestamps, and let the model search it when someone asks "what did Priya say about her sister's wedding?" You can still keep summaries as a fast index on top, just never as the only copy. The photo-caption finding is a bonus lesson: non-verbal context (who was in the room, what was on screen) answered a big share of questions, so capturing it as text alongside the transcript is worth it.

**Your relationship continuity and memory startups.** If the product promise is "permissioned memory," a raw record has a quiet advantage worth thinking about: it is easy to show a person exactly what is stored, to scope access by conversation or by person, and to delete a specific moment. Extracted facts and graphs are harder to audit ("where did the system get the idea that I am moving?"). That is my inference, not something the paper tested, but the paper removes the main argument against raw records (cost) for strong models.

**Unstall (voice chief of staff).** Mixed news. A realtor's history of calls, texts and emails is exactly the kind of record where "keep everything, search when needed" shines. But the paper ignores speed, and a voice assistant cannot spend a minute running searches mid-sentence. A practical split: during the call, use fast, simple retrieval (even plain keyword search did respectably); after the call, let a strong model search the full record carefully for follow-ups and reminders.

## Key terms

- **Agent memory**: a system that lets an AI remember past interactions, usually by extracting and storing facts to retrieve later. Mem0 and Zep are examples.
- **Knowledge graph**: memory stored as a web of entities (people, places, things) connected by labeled relationships, like "Melanie → painted → sunset."
- **Full context**: putting the entire history directly into the model's prompt every time, with no filtering.
- **BM25**: a classic keyword-matching formula that ranks text by how well its words match a query; the backbone of traditional search.
- **Agentic search**: letting the model itself decide what to search for, run the search with tools like `grep`, read results and search again.
- **Memory tax**: the paper's name for the extra cost of building designed memory that a strong model does not actually need.

## If you only have 10 more minutes

The whole paper is short, so read pages 1 to 3: the introduction (one page, with the three findings as bullet points), Figure 1 (cost vs. accuracy for every combination, the single best picture of the argument), and Section 4 on the writer and reader ceiling with Table 3 in the appendix. Then read Section 6, "Discussion and limitations," which is half a page. Skip the appendix prompts and protocols unless you want to replicate it.

## One question to think about

If every summary your product makes today caps what a smarter future model can know about a person, what is the one thing in your users' lives that you must store word for word, and what are you comfortable letting the system forget?

## Sources

- [MemoryTax: The Bitter Lesson of Agent Memory (arXiv)](https://arxiv.org/abs/2610.29823)
- [MemoryTax full text, HTML version (arXiv)](https://arxiv.org/html/2610.29823v1)
- [Mem0 raises $24M from YC, Peak XV and Basis Set (TechCrunch)](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps)
- [Mem0 vs Zep (Graphiti): AI Agent Memory Compared, 2026 (Vectorize)](https://vectorize.io/articles/mem0-vs-zep)
- [Why many code agents use agentic search instead of a vector database (jacar.es)](https://jacar.es/en/code-agents-without-vector-search/)
- [Building agents with the Claude Agent SDK (Anthropic)](https://claude.com/resources/articles/building-agents-with-the-claude-agent-sdk)
- [Is RAG dead? What AI agents use instead (MindStudio)](https://www.mindstudio.ai/blog/is-rag-dead-what-ai-agents-use-instead)
- [Working with Pi Coding Agents (KDnuggets)](https://www.kdnuggets.com/working-with-pi-coding-agents)
