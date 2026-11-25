---
day: 62
title: "Leto: Utility-Centric Agent Memory"
short_title: "Leto (an AI memory judged by whether it helps next time, not how well it records the past)"
authors: "Shuguang Chen and Salman Paracha (DigitalOcean)"
year: 2026
link: "https://arxiv.org/abs/2611.33005"
track: "Frontier"
section: "Frontier"
tldr: "Leto argues that an AI agent's memory should be judged by whether it improves the next answer, not by how faithfully it records past conversations, and builds a memory system around that idea (keep everything findable, prepare a standing profile before you're asked, and keep score of which memories actually helped), beating six popular memory systems on personalization and multi-step tasks."
---

# Day 62: Leto: Utility-Centric Agent Memory

Shuguang Chen and Salman Paracha, DigitalOcean. Submitted to arXiv on November 24, 2026. [Read the paper](https://arxiv.org/abs/2611.33005). Track: Frontier.

This brief is built from the full paper PDF. No code or project page was listed with it.

## TL;DR

Most AI memory systems try to be a faithful diary of what you said; Leto treats memory as a **prediction** ("what will the next answer need?"), so it keeps everything findable, hands the agent a short standing profile of who you are before you even ask, and keeps a running score of which memories actually helped, which lifts preference-following accuracy from 44% (best rival) to 60.5%.

## What it builds on

From the foundations track: **RAG (Day 14)** is the "look it up, then answer" pattern every memory system descends from, and Leto's own baseline is plain RAG over the raw chat history. **ReAct (Day 18)** is the agent loop the memory is feeding. From the frontier track, it's the next chapter of a thread you've been following: **MemoryTax (Day 28)** asked whether agent memory is even worth it, **Day 45** broke memory into its components, **The Memory Trap (Day 47)** showed memories can hurt, and **MAPE (Day 51)** let an AI search for better memory designs. Leto's answer to all of them: measure memory by outcomes, and build the system to optimize for outcomes.

## The world before this paper

An AI agent that works with the same person across many sessions needs memory: the preference you mentioned three weeks ago, where a half-finished task stands. The popular systems (Mem0, Zep, Letta, LangMem, Memobase, Hindsight) mostly work the same way. When a conversation ends, they **extract facts or write a summary**. When a new request comes in, they **retrieve the memories most similar to the request** and paste them into the AI's context. They're also *graded* the same way: did the memory capture the conversation completely, and did the retrieved memory contain the right evidence? The authors call this **fidelity**. Their complaint: fidelity is about the past, but the only thing that matters is the next answer. A memory can be perfectly faithful and still useless, or never get served when it matters, because people rarely restate their standing preferences.

## Core ideas

**Some terms first.**

- An **LLM agent** is an AI language model running in a loop: it reads a request, uses tools, and responds, often across many sessions.
- **Context** is the text the AI can see right now while answering. Memory only helps if it gets into the context.
- **Retrieval** means searching a store of saved text and pulling out the pieces most similar to the current request (usually using **embeddings**, number lists that put similar meanings close together, Day 4).
- **Fidelity** is how faithfully memory records the past. **Utility** is how much memory improves the agent's next response.

### 1. Change the scorecard: memory is a prediction problem

**What it is.** The paper's central move is to redefine what "good memory" means. A memory system makes two bets, both before the answer exists:

1. **What to memorize** when a conversation ends (a bet on what future requests will need).
2. **What to serve** when a request arrives (a bet on what this answer will need).

Both are predictions, so they should be judged against outcomes. The authors define utility very simply: **utility = (did the task succeed with memory) minus (did it succeed with no memory)**. That can be +1 (memory helped), 0 (no difference), or -1 (memory actively hurt, for example by misleading the agent).

This names two failure modes:

- **The memorization gap**: a detail gets summarized away because it didn't look important at the time, and later it's the thing you need.
- **The serving gap**: the memory is in the store, but it doesn't get served because it doesn't *look like* the request.

**Mental picture.** The paper's opening example: you ask "Book me a hotel near the workshop venue." A similarity-based memory pulls up the workshop location and your 9 PM arrival, and books a hotel 3 minutes away with a 24-hour desk. Perfect match to the request. But it has stairs only, and you use a wheelchair. That fact was in memory the whole time, it just didn't resemble the word "hotel." A utility-based memory serves the wheelchair fact too, and books the accessible hotel 6 minutes away. One memory decides whether the answer is usable.

**Analogy.** A great executive assistant doesn't keep the most complete notes. They're the one who, when you say "book dinner Thursday," remembers that your guest is vegan without being told, because they're thinking about what will make Thursday go well, not about what you just said.

### 2. Memory indexing: keep everything, find it by small facts

**What it is.** Since you can't know at write time what will matter later, Leto **never throws the conversation away**. Instead it builds an index over it.

**How it works, step by step.**

1. When a session ends, an AI pulls out **atomic facts**: single, self-contained claims like "The user uses a wheelchair" or "The workshop is at Riverside Center, Sep 14 to 16."
2. Each fact becomes a **key that points to its source**: the few adjacent messages it came from. So the fact is the label on the folder, and the original conversation is what's inside.
3. New facts are **consolidated** with old ones. If a new fact revises an old one ("actually I moved to Austin"), the new one **supersedes** the old one, but the old one isn't deleted. The system can tell what's true now from what used to be true.
4. Each session also gets a short **summary**.
5. When a request arrives, Leto matches it against the facts, and serves the **source messages** behind matching facts, so the agent sees the original wording, including any nuance or caveats the extracted fact dropped.

**Why this matters.** Most systems serve the extracted fact itself, so if extraction lost a detail, it's gone forever. Leto treats extraction as a search index, not as the memory. The asymmetry the authors point out: storing something unnecessary costs a little disk space; discarding something you later need costs you on every future request that depends on it.

**Analogy.** A library catalog card versus the book. Other systems give you the catalog card. Leto uses the card to find the book, then hands you the relevant pages.

### 3. Memory replay: prepare the briefing before anyone asks

**What it is.** To close the serving gap (relevant memories that don't resemble the request), Leto doesn't wait for a request. **Between conversations**, it re-reads its own store and writes **standing context** that goes into every future conversation automatically.

There are two parts:

- **Profile rewrite.** A concise **user profile** of what's always true about you: standing preferences, constraints, how you want things done. It's rewritten after new sessions, merging related facts and dropping preferences you've since changed.
- **Task rendering.** For long, multi-step tasks, a **task state** placed at the start of each session: first "where the task stands" (each entity, its attributes, their current values), then "how we got here" (summaries of prior sessions in order).

**How it plays out.** Because "uses a wheelchair" lives in the profile, it reaches the agent on *every* request, hotel or not. Nothing has to "match."

**Analogy.** A film production's call sheet and continuity notes. Every morning the crew gets the same briefing (the director hates handheld, the actor is allergic to cats, scene 12 was shot with the jacket on) whether or not today's scene obviously needs it.

### 4. The utility loop: keep score of which memories actually helped

**What it is.** Even with good guesses, you only know if a memory helped after the answer comes back. So Leto gives every memory a running **utility index**, a score from 0 to 1, and updates it from feedback.

**How it works, step by step.**

1. Every new memory starts with an **initial forecast** of how useful it'll be. A low forecast never deletes the memory; storing and serving are separate decisions.
2. When a memory is served, Leto watches the conversation for **outcome signals**: a confirmation or the memory being used counts as positive (1); a user correction counts as negative (0). These are detected with simple word-pattern rules, not another AI call. (They come from the authors' earlier "Signals" work.) If a task has a graded success or failure, that counts too.
3. The score is updated as a simple weighted average: the initial forecast counts as if it were **k** observations, and each real observation is added in. So early on the forecast dominates, and as evidence piles up, real outcomes take over.
4. At serving time, a retrieved memory only gets through if its score clears a **threshold** (the paper calls it τ, "tau"). If there's more than fits the token budget, higher-scored memories go first.

**Worked example.** Say a memory starts with a forecast of 0.5, weighted as k = 2 observations. It gets served three times: confirmed, confirmed, corrected (1, 1, 0). The new score is (2 x 0.5 + 1 + 1 + 0) / (2 + 3) = 3 / 5 = 0.6. One more correction would pull it to 0.5. (These specific numbers are my illustration; the paper gives the formula but I didn't find its exact settings for k and τ.)

**Analogy.** Your phone's keyboard learning which autocorrect suggestions you accept and which you undo. The authors are careful to say this score is a **heuristic priority**, not a true measurement of each memory's contribution.

## What they showed

They tested against **six memory systems** (Mem0, LangMem, Hindsight, Letta, Zep, Memobase), plus plain **RAG over the full history**, **No Memory**, and **Standalone** (stuff the entire history into the AI's context). Five benchmarks, three scenarios.

**Scenario 1: Personalization (does the AI follow preferences you didn't restate?).**

| Benchmark | Best rival | Leto |
| --- | --- | --- |
| PrefEval accuracy | 44.2% (Hindsight) | **60.5%** |
| PrefEval "forgot the preference" errors (lower better) | 33.8% (Hindsight) | **19.1%** |
| PERMA task completion, averaged | about 73.4% (Memobase) | **76.5%** |

The most surprising number: **Standalone, which had the entire history in its context every time, followed the preference only 3.3% of the time.** Plain RAG got 13.1%. Having the information somewhere in a giant context is not the same as using it. Leto's short profile put the preference in front of the agent in 84% of cases (rivals: 12% to 69%), and the agent followed a visible preference 64% of the time (rivals: 32% to 56%).

**Fidelity vs. usefulness, proven.** PERMA includes its own "memory score," a fidelity measure. Letta had the **highest** memory score in the multi-domain setting but the **lowest** accuracy and task completion. That's the paper's thesis in one data point.

**Scenario 2: Long, multi-step tasks (MemoryArena: shopping, travel, search, math, physics).** Leto had the best overall progress score (32.0%) and success rate (18.3%), narrowly ahead of Letta (31.2%, 18.0%). More telling: its advantage **grows the further into a chain you go**. In shopping, its gain over No Memory rose from 1.3 points at the first purchase to 7.3 at the sixth. In search, from zero at question 1 to about 14 points at question 8, where most systems were near zero. It was also the only memory system that helped more often than it hurt in every environment.

**Scenario 3: Answering questions about long histories (LoCoMo, LongMemEval).** Leto was the best memory system (71.8% and 73.2%) and pulled up the supporting evidence 87% to 95% of the time (rivals at most 57% and 79%), using about 1,200 tokens per question. Against plain RAG it was a split: 2.8 points **worse** on LoCoMo, 6.8 points **better** on LongMemEval, while serving roughly 1.7x and 8x fewer tokens. When a question clearly says what it's looking for, a plain search over raw history is already strong.

**Why it's convincing.** It reports how often memory *hurt*, not just how often it helped, which almost no memory paper does. And the gains are biggest exactly where the theory predicts: unstated preferences and long dependent tasks.

## Limitations

- **Extraction still sets the ceiling.** If no fact points at a message, Leto can only reach it by accident. About 40% of the LoCoMo questions RAG got right and Leto missed came down to this.
- **The profile can be wrong.** Profiles and task states are AI-written summaries and can misstate what was said.
- **The feedback is blunt.** One correction is credited to *every* memory served in that answer, so a good memory can get penalized and an unneeded one rewarded. A memory that's never served never gets scored.
- **Utility is agent-specific.** A memory that helps one AI may not help another, so the scores don't transfer cleanly.
- **Serving isn't using.** Leto decides what to show the agent, not whether the agent pays attention to it.
- **Standing context costs space**: the profile rides along even on requests that don't need it.
- **Modest test setup.** The agents were small models (gpt-4o-mini, gpt-5-mini), the outcome signals are word-pattern rules, the utility threshold isn't learned yet (that's listed as future work), and no code was released with the paper.

## Where this is today

### How it IS used

- **Agent memory is now a product category, and Leto's rivals are the products.** Mem0 raised $24M in October 2025, reported 186 million API calls in Q3 2025, and was named the exclusive memory provider for AWS's Agent SDK. Zep, Letta and LangMem are widely used open-source or hosted options.
- **Hindsight**, from Vectorize, is open source and built around retain, recall and reflect, with recall "within a token budget." Thoughtworks put it in the "Assess" ring of its November 2026 Technology Radar and told teams to measure whether its extra AI calls are worth it, which is exactly the utility question Leto raises.
- **The feedback signals are a real product.** The utility loop uses interaction signals from the authors' earlier work. That work now ships as **DigitalOcean Signals** (public preview, updated October 2026), which watches production agent conversations and detects corrections, rephrased requests, confirmations and goals achieved, "with no model call in the loop." The authors came to DigitalOcean when it acquired their company, Katanemo Labs (makers of the open-source Plano agent data plane), in April 2026. So Leto reads like the memory piece of a production agent platform, though I found no announcement that Leto itself ships.
- **Standing profiles are already the consumer pattern.** Major chat assistants now keep a summarized picture of the user that's loaded into conversations, which is the "profile rewrite" idea in product form. I couldn't verify each vendor's current internals from a single reliable page, so I won't claim details.

### How it ISN'T used

- **Outcome-scored memory isn't standard yet.** The main products still rank memories by similarity and judge themselves on fidelity benchmarks; I found no major product that keeps a per-memory usefulness score updated from user corrections.
- **"Just use a huge context window" isn't the answer.** Leto's Standalone result (3.3% preference-following with the full history visible) is a strong data point against the idea that bigger contexts make memory systems unnecessary.
- **Plain RAG isn't dead either.** For direct questions about the past, retrieval over raw history is still roughly as good, and cheaper to build.

### Lineage

RAG: look it up before answering (2020) -> memory layers that extract facts and retrieve by similarity (Mem0, Zep, Letta, 2023 to 2025) -> reflective memory that rewrites itself into profiles (Hindsight, 2025) -> Leto: memory judged and tuned by whether the next answer got better (2026) -> what you'll likely use: assistants that quietly learn which things about you matter, from how you react.

## Why it matters for Brendan

**Unstall.** This is close to a design document for a real estate chief of staff. An agent says "set up showings for the Garcias this weekend." The facts that make or break that request are never in it: they need a ground-floor unit, they only do Saturday mornings, the husband hates HOAs. That's the wheelchair-and-hotel example. Leto's lesson: keep a **standing client profile** that rides along on every request about that client, and a **deal task state** ("offer at $X, inspection Tuesday, appraisal pending") for each transaction. And because a voice assistant hears the agent's reaction out loud ("no, not that one," "perfect"), you have unusually rich correction and confirmation signals to run a utility loop on.

**Amelia and your relationship-memory startups.** Amelia's per-person memory has the exact memorization gap: in a live conversation you can't know which offhand comment will matter later. Leto's pattern, small fact cards that point back to the original transcript span, keeps the nuance (tone, the exact words, who said it) without dumping whole transcripts into context. And for a **permissioned** memory product, the "superseded but not deleted" design is a real question you'll have to answer: when someone's preference changes, is the old one still yours to keep? Leto keeps it for accuracy; a consent-first product might need to let people delete it outright.

## Key terms

- **Fidelity**: how faithfully memory records past conversations.
- **Utility**: whether served memory improved the answer, compared with no memory at all (can be negative).
- **Atomic fact**: one self-contained claim, used here as a search key pointing to the original messages.
- **Memory replay**: re-reading the memory store between conversations to write a standing profile and task state.
- **Utility index**: a 0 to 1 score per memory, updated from confirmations and corrections, that decides what gets served.
- **Serving gap**: a memory that's stored but never shown because it doesn't resemble the request.

## If you only have 10 more minutes

Read the **Introduction with Figure 1** (the hotel example, two pages) and **Section 5.2, Personalization**, especially Figure 3 on "availability vs. use," which shows why having information in context isn't the same as the AI using it. Skip the Related Work and the long-context appendix tables.

## One question to think about

Leto learns which memories are useful from how people react. In Unstall or Amelia, what reactions would you treat as "that helped" or "that was wrong," and are there memories that would be genuinely useful but that a person might *not* want the AI to act on unprompted?

## Sources

- [Leto paper (arXiv 2611.33005)](https://arxiv.org/abs/2611.33005)
- [Hugging Face Daily Papers, November 2026](https://huggingface.co/papers/month/2026-11)
- [TechCrunch: Mem0 raises $24M](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps)
- [Vectorize: Introducing Hindsight](https://vectorize.io/blog/introducing-hindsight-agent-memory-that-works-like-human-memory)
- [Thoughtworks Technology Radar: Hindsight](https://www.thoughtworks.com/radar/languages-and-frameworks/hindsight)
- [DigitalOcean: Signals, observability for AI agents](https://www.digitalocean.com/blog/digitalocean-signals-observability-ai-agents)
- [Business Wire: DigitalOcean Acquires Katanemo Labs](https://www.businesswire.com/news/home/20260402272982/en/DigitalOcean-Acquires-Katanemo-Labs-to-Accelerate-the-Inference-Cloud-for-the-Agentic-Era)
