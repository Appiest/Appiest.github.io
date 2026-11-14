---
day: 51
title: "Discovering Effective Agent Memory Designs through Program Evolution"
short_title: "MAPE (letting an AI invent better memory systems for AI)"
authors: "Xinheng Ding, Seyyed Saeid Cheshmi, Ziyang Zhang, Tairan Chen, Wenya Xie, Yu Hou, Rui Zhang, Zirui Liu (University of Minnesota, Stevens Institute of Technology)"
year: 2026
link: "https://arxiv.org/abs/2611.17068"
track: "Frontier"
section: "Frontier"
tldr: "Instead of hand-designing how an AI assistant remembers past conversations, the authors let a coding AI write, test and rewrite whole memory systems starting from nothing, and the winners beat every human-designed system they tried (by up to 12 points, at about a third of the cost) while rediscovering two simple rules: keep the original conversation, and process what you retrieve differently depending on what kind of question was asked."
---

# Day 51: Discovering Effective Agent Memory Designs through Program Evolution

Xinheng Ding, Seyyed Saeid Cheshmi, Ziyang Zhang, Tairan Chen, Wenya Xie, Yu Hou, Rui Zhang and Zirui Liu (University of Minnesota; Tairan Chen is at Stevens Institute of Technology). Posted to arXiv November 12, 2026 (cs.CL, cs.AI). [Read the paper](https://arxiv.org/abs/2611.17068). Code: [github.com/ash-ding/MAPE](https://github.com/ash-ding/MAPE). Track: Frontier.

This brief is built from the full paper text, including the appendices with the exact search setup and the prompts.

## TL;DR

If you let an AI repeatedly invent, test and fix memory systems for other AIs, it ends up with designs that beat the best hand-built ones, and the two lessons it keeps landing on are surprisingly human: don't throw away the original conversation, and handle a "when did..." question differently from a "how many..." question.

## What it builds on

From the foundations track: RAG (Day 14) is the "look it up, then answer" idea every memory system here is built on; ReAct (Day 18) and chain-of-thought (Day 17) are the reasoning-then-acting habits the "designer" AI uses as it works; GPT-3 (Day 11) is the ancestor of the models doing both the designing and the answering. On the frontier track this is the latest chapter of a running memory thread: Cortex (Day 23), MemoryTax (Day 28, which found that fancy memory systems stop paying off once models get strong, and that raw conversation plus search often wins), Anthropic's memory layers and "dreaming" (Day 45, which also kept raw transcripts as the source of truth) and The Memory Trap (Day 47, on what goes wrong when an agent summarizes a conversation into an overly broad rule). It also borrows the "AI that improves its own systems" idea from The Trinity (Day 35). Today's paper is the strongest evidence yet for a conclusion those papers circled: summaries lose things, so keep the receipts.

## The world before this paper

An AI assistant that remembers you across conversations needs a **memory system**: code that decides what to save from past chats, how to organize it, and what to pull back out when you ask something. Popular open systems such as Mem0, Zep, A-Mem, LightMem and SimpleMem are all designed by hand. Engineers pick a strategy (say, "use an AI to extract short facts from each chat and store them in a database," or "build a knowledge graph of people and events"), tune it, and publish. That has two problems. First, the space of possible designs is huge, and humans tend to explore just a few corners of it. Second, nobody quite knows *which* choices are doing the work, because each system changes many things at once. Meanwhile, a different research line had shown that you can let an AI search for good programs automatically. Google DeepMind's AlphaEvolve (2025) uses an AI to propose code changes, scores each version automatically, and keeps the best, and it found algorithms better than ones humans had used for decades. Earlier attempts to apply this to memory mostly tweaked prompts or settings inside an existing design, and they optimized only for accuracy, ignoring cost.

## Core ideas

### 1. Treat a memory system as a program with four fill-in-the-blank stages

**What it is.** The authors define a standard "shape" every memory system must fit, called a **lifecycle interface** (a fixed list of steps a program has to implement, so any two programs can be compared fairly). There are four stages:

1. **Build**: read the whole conversation history once and turn it into a stored memory (facts, notes, an index, or just the raw text).
2. **Retrieve**: for a new question, pull out the pieces of memory that seem relevant.
3. **Compose**: arrange and process those pieces into the context the answering model will read. This stage is new: most systems skip straight from retrieve to answer.
4. **Answer**: a fixed model, with a fixed prompt, writes the answer. This part is never allowed to change, so any improvement must come from the memory design.

**Analogy.** Think of a film production: build is shooting and logging the footage, retrieve is finding the right takes, compose is the edit, and answer is the screening. The authors lock the screening room and let everything before it be redesigned.

**Why it matters.** Because every candidate fills in the same blanks, you can swap parts between systems. That later lets them take one piece invented by the search and drop it into five human-built systems to see whether it helps them too.

### 2. An evolution loop with a designer, a tester and a critic

**What it is.** **Program evolution** means improving code the way breeders improve crops: make variations, keep the ones that do best, and breed from those. Here the "variations" are written by an AI.

**How it works, step by step.**

1. **Start from a minimal seed.** The search begins with deliberately dumb programs: one that remembers *nothing*, and (in one setting) one that just stuffs the entire history into the prompt. Starting from nothing means the search isn't anchored to any human design.
2. **Propose.** A **proposer agent** (in this paper, Claude Opus 4.8 at its highest reasoning setting) reads an archive of every past attempt: its code, its score, and notes on why it failed. It picks one or more "parents," writes a new complete program, and states a **design hypothesis** ("If I keep raw messages alongside extracted facts, questions about exact wording should improve"). It can choose a small targeted fix or a completely different approach, and it is allowed to search the web for research ideas. It is explicitly told not to make cosmetic changes like rewording a prompt.
3. **Sanity check.** The new program is run on two or three questions to catch crashes. The proposer gets two tries to fix errors.
4. **Test.** Survivors run on a fixed **search set** (a slice of the benchmark used only during the search, here 20% of the data), recording accuracy and cost.
5. **Diagnose.** A separate **diagnosis agent** reads the code, the hypothesis and the wrong answers, traces each failure back to the stage that caused it ("retrieval never returned the session where the user mentioned the dog"), and writes notes for the next proposer. It is forbidden to suggest designs itself; its job is evidence.
6. **Archive everything**, including failures, so later rounds can revisit an older idea instead of only building on the current leader.

Each run is 20 rounds, one new program per round.

**Analogy.** A writers' room with a showrunner who pitches a new draft each week, a test screening that scores it, and a script doctor who explains exactly which scene lost the audience, with every past draft kept in a binder.

**Keeping it honest.** The other 80% of the data (the **evaluation set**) is locked away during the search and only used at the end to pick and report the final programs, so the search can't simply memorize the test. The authors also manually threw out winners that would not scale, such as programs that read the entire history with an AI on every question.

### 3. Two scorecards: accuracy only, or accuracy and cost

**What it is.** They ran the search two ways. **MAPE-A** cares only about accuracy. **MAPE-P** cares about accuracy and **lifecycle serving cost** (the dollar cost of all the AI and embedding calls needed to build the memory and answer questions, spread across the number of questions, reported per 1,000 questions).

With two goals, there is rarely one "best" program. Instead there is a **Pareto frontier**: the set of programs where you can't get more accuracy without paying more, or pay less without losing accuracy. Picture a menu where every dish on it is the best taste you can get at its price. MAPE-P keeps that whole menu as parents for the next round.

**What happened.** The accuracy-only searches behaved like a production that keeps adding reshoots: each round bolted on another operation to fix the remaining errors, and late gains got expensive. In one run, adding an AI step that wrote notes from every session at build time raised cost about sixfold for a small accuracy bump. The accuracy-and-cost searches branched out more, kept cheap ideas alive, and learned to *remove* expensive steps.

The resulting designs spend effort in different places. Accuracy-only winners do heavy AI work up front, at build time (in one, note extraction was about 92% of the total cost). Cost-aware winners mostly skip that, store the raw conversation, use cheap keyword search, and do focused work only when a question actually arrives. They used 90% fewer AI calls on one benchmark and 40% fewer on the other, while staying competitive.

**Mental picture.** Two ways to prepare for an open-book exam: write detailed summary notes of every chapter in advance (expensive, and you might leave out the detail you need), or keep the textbook, tab it well, and read closely only the pages each question needs. When most chapters never get asked about, the second is far cheaper.

### 4. What the search kept rediscovering

Across both benchmarks and both scorecards, the winning programs converged on two habits.

**Habit one: keep the raw conversation as evidence.** Every human-designed system tested either throws away the original chat after extracting facts, or never shows it to the answering model. The evolved systems keep extracted notes *and* the original back-and-forth, and retrieve both. Example: if you once told an assistant "my sister's dog is a corgi named Biscuit, but she's thinking of renaming him," a fact extractor might save "sister has a corgi named Biscuit" and drop the renaming. The raw text still has it.

**Habit two: process evidence according to what kind of question it is.** The best design includes a compose step the authors call **Query-Routed Scaffolding** (RQS; a "scaffold" here is a small set of helper steps that structure the evidence before the final answer). It works in three steps:

1. **Route.** Simple rules on the question's wording sort it into one of six types: temporal ("when..."), aggregation ("how many..."), difference ("how much more..."), current value ("what is my current..."), preference, or direct lookup.
2. **Scaffold.** Each type gets its own treatment. For a temporal question, it pulls out dates and converts phrases like "last week" into real calendar dates using the session date, then does the date math in actual code. For "how many" questions, it extracts matching items from each session, removes duplicates and counts them in code, running the extraction twice and flagging disagreements.
3. **Deliberate.** One AI call reviews the scaffold's output against the evidence and writes a draft answer with a supporting quote, which is passed along to the fixed answering model.

**Why that helps.** Language models are notoriously shaky at arithmetic and counting, and at turning "two weeks ago" into a date. Handing those parts to plain code (an idea from earlier work called program-aided reasoning) removes a class of errors.

**Worked example.** Question: "How many weeks ago did I start the pottery class?" The router tags it temporal. The scaffold finds the session from March 3 where you said "I start pottery next Monday," resolves "next Monday" to March 9, and computes the gap to today's date in code. The answering model now just reads off a number instead of doing calendar math in its head.

## What they showed

**The benchmarks.** **LoCoMo** is ten very long, multi-session conversations between two people, with about 1,300 test questions (single-hop facts, multi-hop facts that need combining, open-domain and temporal). **LongMemEval** gives an assistant a long chat history and one question per history, across six types including temporal reasoning, multi-session, knowledge updates and preferences. Answers are graded by another AI (GPT-5 mini) using each benchmark's rubric.

**The comparison.** Seven baselines: stuffing the full history into the prompt, basic RAG, and five published memory systems (Mem0, A-Mem, LightMem, SimpleMem, Zep), all using the same answering model and the same embedding model so only the memory design differs.

**The headline numbers.**

| Setting | Best human-built or baseline | Evolved (accuracy-only) | Evolved (accuracy + cost) |
| --- | --- | --- | --- |
| LoCoMo, GPT-4.1 mini | Full context 80.9% ($12.54 per 1k questions) | 87.9% ($7.21) | 85.2% ($2.03) |
| LoCoMo, Qwen3-30B (open model) | Full context 70.0%; SimpleMem 69.3% ($3.24) | 78.6% | 81.3% ($1.14) |
| LongMemEval, Qwen3-30B | Plain RAG 66.0% ($2.62) | 77.0% ($52.84) | 72.3% ($5.76) |

The "12% at 35% of the cost" in the abstract is the cost-aware LoCoMo program on the open Qwen model: 81.3% versus SimpleMem's 69.3%, at about a third of SimpleMem's cost. A striking side note: on LongMemEval, plain RAG beat all five fancy memory systems, which echoes Day 28.

**It transfers.** Programs evolved on one benchmark, run unchanged on the other, still beat all five published memory systems (and nearly matched or beat RAG). Programs evolved with GPT-4.1 mini still did well when the whole system was switched to Qwen, with one instructive exception: the accuracy-only LoCoMo program's temporal score collapsed from 80% to 44%, because it left date math to the answering model, and Qwen got it wrong (134 of its 145 temporal errors gave the conversation date instead of the event date). The cost-aware program had converted dates in code and kept 71%.

**The ablations (switching parts off).** Taking raw conversation snippets out of the best LongMemEval program cut accuracy by 6.5 points there and 12.2 points on LoCoMo; on questions about what the *assistant* had said earlier, accuracy fell 20 points. Taking out the routed scaffolding cut 6.25 and 4.4 points, mostly on temporal questions. Removing both cut 14 points.

**The transplant.** This is the most convincing part. They took the scaffolding module alone and bolted it onto all five human-built systems without changing their storage or retrieval. Every one improved on LongMemEval, by 2.75 to 9.25 points (LightMem jumped from 59.3% to 68.3%). Mem0 gained least, and the error analysis explains why: Mem0's failures were mostly cases where the needed information was never retrieved at all, and no amount of clever composing fixes missing evidence. Across systems, how complete the retrieved evidence was tracked accuracy very closely.

## Limitations

- **Only two question-answering benchmarks**, both about recalling facts from chat history. Whether this works for agents that need to remember *how* to do things, or for open-ended tasks, is untested.
- **Small data, few runs.** LoCoMo has only ten conversations, and the search used just two of them. LongMemEval got one search run per setting. The authors say outcomes vary between runs and final selection involved human judgment.
- **The router is simple word-matching rules**, and its six categories were shaped by these benchmarks' question types. Real users ask messier questions.
- **Cost excludes the search itself.** Running a top model with maximum reasoning for 20 rounds, many times over, isn't free; the reported costs are only for serving the final program. Latency was not measured at all, which matters a lot for voice products.
- **Benchmarks reward exact recall.** Neither tests privacy, forgetting on request, or the "overgeneralized memory" problem from Day 47, so a system that keeps everything raw scores well here without paying for the downsides of keeping everything.
- **AI grading AI.** Correctness is judged by GPT-5 mini with fairly generous rubrics; that's standard practice but adds noise.

## Where this is today

### How it IS used

- **The search method is already a product.** Google made AlphaEvolve, the best-known version of "AI proposes code, automatic tests score it, repeat," generally available to Google Cloud customers in July 2026. Reported uses include Klarna doubling ML training throughput, JetBrains cutting code-completion latency 15 to 20%, and internal Google work on TPU chip design and the Spanner database. Those figures come from Google and its customers, not independent tests. An open-source alternative, OpenEvolve, exists. MAPE is the same family of idea pointed at memory systems, and its code is open.
- **The baselines are real products.** Mem0 is a widely used open-source memory layer (over 60,000 GitHub stars) that plugs into LangChain, CrewAI, the OpenAI Agents SDK, AWS Bedrock and voice stacks like LiveKit and Pipecat. Its own blog describes storing *extracted* facts, which is exactly the habit this paper questions. Zep (built on its Graphiti knowledge graph), Letta (formerly MemGPT), Cognee, LangMem and AWS AgentCore Memory are other commercial or open options. Note that Mem0 reports much higher LoCoMo scores for its own newest version (92.5%) than this paper measured for the open-source version under a shared setup; benchmark numbers in this area swing a lot with configuration and grading.
- **"Keep the raw transcript" is spreading.** Anthropic's managed memory for Claude agents stores plain text documents with version history rather than vectors, and its research (Day 45) treats raw transcripts as the source of truth. Independent papers this fall, including MemoryTax and "naive RAG is stronger than we thought," point the same way.

### How it ISN'T used

- No major product, as far as I could find, says it ships an *evolved* memory system. Today's commercial memory layers are still hand-designed.
- The pure "summarize everything into facts and discard the conversation" approach is under pressure from multiple directions, but it hasn't been abandoned; it remains the default in several popular libraries because it is compact and simple.
- Consumer memory in ChatGPT is closed: you can't inspect or customize how it works, so none of these design lessons are visible from outside.

### Lineage

Hand-designed memory (MemGPT, Mem0, Zep) plus AI-driven code search (FunSearch, AlphaEvolve) -> whole memory programs evolved from scratch (MAPE) -> what you'd build today: store raw conversations plus light notes, retrieve both, and route each question to a specialized, code-assisted answering step.

## Why it matters for Brendan

**Amelia and the relationship-continuity startups.** This paper is close to a design spec for per-person conversation memory. Two concrete takeaways: keep the original utterances (with who said them and when) instead of only an AI-written profile, because the profile will drop the detail someone asks about later; and treat "when did I last talk to Priya?" and "how many times has she mentioned her move?" as different kinds of questions that get computed in code, not guessed by the model. The cost-aware result also argues for doing very little AI work when a conversation is recorded and spending effort only when a question arrives, which suits a product that listens all day. The flip side: "keep everything raw" is exactly what makes *permissioned* memory hard, so your consent and deletion layer has to sit on top of the raw store, not just the summaries.

**Unstall.** Real estate agents ask a chief of staff questions that are heavily temporal and countable ("when did the Garcias say they'd hear back on financing?", "how many showings did we do on Elm Street?"). The paper's single biggest failure mode was date math left to the model, and its biggest fix was resolving dates in code at the moment of the question. That is directly applicable.

**Building any AI product.** The evolution loop itself (a proposer, an automatic test set you never peek at, and a separate critic that only diagnoses) is a pattern you could run on your own pipelines, as long as you can write a scoring function.

## Key terms

- **Agent memory system**: the code that decides what an AI saves from past conversations, how it is stored, and what is pulled back out for a new question.
- **Program evolution**: improving software by having an AI propose variations, automatically scoring them, and building on the best, over many rounds.
- **Lifecycle interface**: a fixed set of stages (build, retrieve, compose, answer) every candidate must implement, so designs can be compared and parts swapped.
- **Pareto frontier**: the set of options where you can't improve one goal (accuracy) without worsening another (cost).
- **Ablation**: switching off one part of a system to measure how much that part was contributing.
- **Query-Routed Scaffolding (RQS)**: sorting each question by type and running type-specific helper steps (like date math or counting in code) on the retrieved evidence before answering.

## If you only have 10 more minutes

Read **Section 4.3** (Emergent Memory Designs and Component Analysis) with **Figure 2** and **Table 3**: it shows the winning design, the two habits, and the ablations in about a page. If you have a few minutes more, read **Appendix D.5**, which spells out exactly how the question routing and scaffolds work, and glance at **Figure 4** for the date-math failure. Skip Appendix C (data splits, pricing and configuration details) and the prompt templates in Appendix E unless you plan to run the code.

## One question to think about

The search was rewarded only for answering recall questions correctly and cheaply, and it learned to keep everything. If you added a third score for privacy (for example, "forgets what a user asked it to forget" or "never reveals one person's memories to another"), what do you think the winning designs would start doing differently, and would you trust an AI-designed system to get that part right?

## Sources

- [Discovering Effective Agent Memory Designs through Program Evolution (arXiv 2611.17068)](https://arxiv.org/abs/2611.17068)
- [MAPE code repository](https://github.com/ash-ding/MAPE)
- [InfoQ: AlphaEvolve generally available (July 2026)](https://infoq.com/news/2026/07/alphaevolve-generally-available)
- [Mem0: State of AI Agent Memory 2026](https://mem0.ai/blog/ai-agent-memory-benchmark)
- [Rick Hightower: Eight agent memory systems, none of them complete (July 2026)](https://rickhigh.substack.com/p/eight-agent-memory-systems-none-of)
