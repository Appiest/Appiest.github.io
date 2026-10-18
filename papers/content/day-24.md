---
day: 24
title: "Jeva: System One Models from First Principles"
short_title: "Jeva (fast typed decisions)"
authors: "Qi Li, Xinchao Wang (National University of Singapore)"
year: 2026
link: "https://arxiv.org/abs/2610.18773"
track: "Frontier"
section: "Frontier"
tldr: "When an AI only needs to pick from a list, say yes or no, or give a score, Jeva treats that as a decision instead of a writing task: it reads each option once, never lets their order matter, can say \"none of these,\" and reuses its work on options it has seen before, which makes it accurate, stable and up to 28 times faster."
---

# Day 24: Jeva: System One Models from First Principles

Qi Li and Xinchao Wang, National University of Singapore, submitted October 13, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.18773). Code: [github.com/LiQiiiii/Jeva](https://github.com/LiQiiiii/Jeva), model: Jeva-4B on Hugging Face (gated access). Track: Frontier. At the time of writing it is the most-upvoted paper on Hugging Face's trending list (over 400 upvotes), partly because it lands in the middle of a hot debate: a month earlier, the startup TypeSafe launched a commercial "System One model" called Jev, and Jeva is an open, academic, first-principles version of the same idea.

## TL;DR

Most of what AI does inside real software is not writing essays but making small decisions (which tool? which intent? is this spam? how urgent, 1 to 5?), and Jeva shows that if you build a model specifically for choosing among options, instead of asking a chatbot to type out its choice, you get decisions that never change when you shuffle the options, can honestly say "none of these," scale to thousands of options, and get much faster when the options repeat.

## What it builds on

word2vec (Day 4) gave the core trick of turning text into vectors and comparing them with a dot product; Jeva's final scores are exactly that. The Transformer (Day 9) supplies attention, and Jeva's decision step is a single attention block where the question "looks at" the options. BERT (Day 10) is the model of an encoder plus a small task-specific head on top. GPT-3 (Day 11) introduced the habit Jeva is arguing against: write the options into a prompt and let a language model type the answer. RAG (Day 14) and ReAct (Day 18) are why this matters now: agents constantly pick documents and tools from long lists. And yesterday's LoRA-style adapters (Day 23) are how Jeva is trained cheaply on top of an existing model.

## The world before this paper

When software needs an AI to make a decision today, the usual move is to ask a large language model (LLM): paste the situation and a numbered list of options into a prompt and ask it to answer "B." That works, but it is slow (seconds per call), expensive, and has strange failure modes. LLMs read text left to right, so the **order** of the options leaks into the answer: shuffle the list and the choice can change. They have no clean way to say "none of these fit," so they often force a pick. Adding more options means a longer prompt, and past a few hundred the prompt overflows. And if the same 500 tools appear in a million requests, the model re-reads all 500 every single time. The alternatives each solve part of this. **Classifiers** are fast but have a fixed list of labels baked in, so a new option means retraining. **Embedding search** (turn the question and each option into vectors, pick the closest) is fast and reusable, but each option is judged alone, so the model can't notice that two options are near-duplicates or that the right answer depends on what else is on the menu. **Rerankers** read the question and one option together, which is accurate, but nothing can be reused, because every pair is new. Nobody had one design that was accurate, order-proof, null-aware, scalable and reusable at the same time. That is what "first principles" in the title means: list the properties a decision should have, then design the model so it has them by construction.

## Core ideas

### 1. A decision is not a sentence: four properties it must have

**What it is.** The paper starts by naming what a good decision-maker must guarantee, not just usually achieve:

- **Null-aware.** It must tell apart "I'm torn between A and B" from "none of these is right." Those are different situations and need different actions (pick one vs. escalate to a human).
- **Permutation-invariant.** "Permutation" just means a reordering. Listing the options as A, B, C or C, A, B must give the same decision.
- **Option-scalable.** Going from 4 options to 4,000 should not require a different model or a different output format.
- **Cacheable.** "Caching" means saving work to reuse later. If an option (say, a tool description) shows up in many requests, the model's work on that option should be done once and reused.

It also defines three output types that cover most everyday decisions, a vocabulary shared with TypeSafe's Jev:

- **Choice**: pick one candidate (or "null," meaning none).
- **Noul**: the probability that a yes/no statement is true ("Is this email spam?" → 0.93).
- **Score**: a value on a rubric ("Urgency 1 to 5?" → 3.8, computed as the probability-weighted average of the levels).

**Analogy.** A chatbot answering a multiple-choice question is like a student reading the options out loud and saying the letter that sounds best; a nervous student is swayed by which option came first. Jeva is designed like a fair judge: every contestant is judged on their own merits, the judge is allowed to say "no winner this year," and the panel can handle 10 contestants or 2,000.

### 2. Encode each option alone, then decide all together

**What it is.** This is the architecture, and it has two phases that split the work in a clever place.

**Phase 1, the encoder.** A shared language model (Jeva uses Qwen3.5-4B, a 4-billion-parameter open model from Alibaba) reads the **request** (the decision type, the question and the current situation) and turns it into a vector called the **request state**. Separately, it reads **each option on its own** (just the decision type and the option's text) and turns it into:

- a **semantic vector** (a list of numbers capturing what the option means), and
- a set of **keys and values** for the next phase. In attention, a key is like the label on a folder ("what am I about?") and a value is the folder's contents ("what do I contribute if chosen?").

The crucial detail: an option's encoding never sees the request or the other options. So it is the same no matter which request it appears in. The paper calls this the **immutable option memory**.

**Phase 2, the decision block.** A small extra layer (just one block in Jeva-4B) lets the request state "look at" all the options at once using attention: the request asks a question, every option's key answers how relevant it is, and the request state is updated with a blend of the most relevant options' values. Only the request state changes; the options stay frozen.

**Step 3, scoring.** Each option's score is the dot product (a simple similarity measure: multiply matching numbers and add them up) between the refined request state and that option's semantic vector. A **softmax** (a function that turns scores into probabilities adding up to 100%) gives the share for each option.

**Why order can't matter.** Attention over a set has no notion of position: the request state is a blend of the options, and a blend doesn't care which ingredient you poured first. Since Jeva never tells the decision block what position an option was in, shuffling the list cannot change the result. It is guaranteed by the math, not learned and hoped for.

**Why it still understands context.** You might think "encode each option alone" is just embedding search. The difference is Phase 2: because the request looks at all the options together before scoring, the presence of other options shapes the decision. The paper includes a small proof (their "Proposition 1") showing that adding or swapping a third option can flip which of two other options wins. Humans do this too: a $9 popcorn next to a $7 small and an $8.50 large makes the large look like a deal. A pure embedding search can't do that, because it scores each option in isolation.

**Analogy.** Think of a casting director. Each actor's headshot and reel (the option) is prepared once and filed. When a new role comes in (the request), the director looks across the whole stack of files together, forms a sharper picture of what the role needs given who is available, and then scores each file. The files never change; only the director's thinking does.

**Worked example.** A real estate assistant hears: "Can we push Thursday's showing to Friday?" The options are tool descriptions: `reschedule_showing`, `cancel_showing`, `book_showing`, `send_message`. Each tool description was encoded once, last week. Now only the request is encoded, the decision block reads the four frozen tool memories, and the scores come out something like 0.88, 0.05, 0.04, 0.03. Reorder the tools and you get exactly the same numbers.

### 3. A separate gauge for "is anything here good enough?"

**What it is.** The **coverage gate** is a second output, separate from "which option is best." It looks only at the single highest score and compares it with a learned threshold, then squashes the difference into a probability with a **sigmoid** (a smooth curve from 0 to 1). That probability is **coverage**: how likely it is that at least one acceptable option exists.

- The **null probability** is simply 1 minus coverage.
- Each option's final probability is coverage times its share from the softmax.

**Why this design is smart.** It separates two questions LLMs blur together: "is there an answer?" and "which one?" It also has a neat property: adding weaker options below the current best leaves coverage unchanged. Padding the list with junk can't trick the model into thinking a real answer exists.

**Training.** The model is trained with examples that include "all-null" cases where no option is correct, so the gate learns what "nothing fits" looks like without being forced to rank options that are all wrong.

**Analogy.** A restaurant host checks two things: "Do we have a table that fits this party at all?" and, if yes, "Which table is best?" Adding a bunch of two-tops to the floor plan doesn't make a party of twelve fit.

### 4. Reuse the options, recompute the decision

**What it is.** Because option memories never depend on the request, they can be saved and reused. The model card's motto is literally "Reuse the options. Recompute the decision." There are two caches:

- **Set cache**: remembers an exact list of options in an exact order. Useful when the same menu repeats verbatim, useless when lists are freshly assembled.
- **Hybrid cache**: remembers each option individually, so a brand-new list made of previously seen options (in any order) is almost free to encode.

Only the cheap parts run every time: encoding the new request and the small decision block. The cache changes no decisions: the largest difference in any probability between cached and uncached runs was 0.007, from rounding.

**Cost of the cache.** Storage grows with the number of options, the number of decision layers and the vector size. With one decision block, that is modest.

**Analogy.** A recruiter who already read 2,000 résumés last month doesn't reread them when a new job opens. They read the new job description and compare.

**How it's trained, briefly.** The base model is adapted with **LoRA** (Low-Rank Adaptation: training a small set of add-on numbers instead of the whole model), rank 64, on a curriculum that moves from typed decisions to intent selection, verification, reading comprehension and finally retrieval over large candidate sets. The loss rewards putting probability on the right option or on null, plus a separate term that teaches the coverage gate.

## What they showed

The baselines include several other decision models: "Jev-1.13.0" and "JevK5" (which appear to be versions of TypeSafe's commercial Jev, though the summaries I read don't say so explicitly), InternDecision (4B and 0.8B), Re-Flex-4B, KEV-4B and a plain language model, CLM-8B.

- **Accuracy.** Jeva was best on 7 of 8 test slices. On BANKING77 (a standard test where you map a banking customer's message to one of 77 intents), with 16 options, it scored **91.6%** vs. 82.5% for the best rival. On MASSIVE (a voice-assistant intent dataset from Amazon), **90.2%** vs. 81.6%. On Mind2Web (picking the right element to click on real websites, an agent task), **80.0%** vs. 66.3%. The one exception was the "Typed Test," where InternDecision-4B edged it out, 78.7% to 78.3%.
- **Order stability.** On 600 Choice questions, each tried in original, reversed and shuffled orders, Jeva had **zero** changed decisions. The other decision models flipped on **17% to 26%** of questions. This is the most striking result, because it shows a property that is guaranteed by design, while rivals that merely learned it still fail one time in five.
- **Saying "none of these."** On BANKING77 with 588 queries that had no correct option, Jeva separated "no answer" from "has answer" with an AUROC of **98.7%** (AUROC is a 0 to 100% score of how well a detector separates two groups; 50% is a coin flip). At a 5% false-alarm rate, it caught **94%** of the no-answer cases.
- **Scale.** On a tool-retrieval test with up to **2,048** candidate tools, Jeva scored the whole set in one pass at 69.9% accuracy in about 12 seconds; the next best (JevK5, which has to work recursively in batches) got 67.5% in 28 seconds. Several rivals simply could not handle more than 32 or 128 options at all.
- **Speed from reuse.** With options already cached, the median response on long-document decisions fell from about **2.1 seconds to 0.075 seconds**, about **28 times** faster; with half the options reused, about 2 times faster. On short typed decisions, the median went from 93 ms to 47 ms.

Why it's convincing: the order and null results are not small improvements on a leaderboard; they show the design delivering the exact properties it promised, which is rarer and more reusable than another point of accuracy.

## Limitations

- **I couldn't open the arXiv PDF directly today.** Details here come from a full-text reproduction of the paper (hyper.ai), the model card, and a detailed news summary; the numbers are consistent across them, but check the PDF before quoting them.
- **Self-reported, not peer reviewed.** All results come from the authors; there are no independent reproductions yet. Several baselines (KEV, Re-Flex, InternDecision) are not well documented in what I could find.
- **It only decides; it never explains.** Jeva returns probabilities, not reasons. That is the point (speed), but it makes debugging and audits harder, a criticism also aimed at TypeSafe's Jev.
- **The options must be known.** It can only choose among candidates you hand it. If the right answer isn't on the list, the best it can do is say null.
- **Caching only helps if options repeat.** For freshly written options every request, the speedup largely disappears. The paper also doesn't describe how old cache entries are evicted.
- **Very large lists still cost more.** Scoring is linear in the number of options, and 12 seconds for 2,048 tools is still slow for live use.
- **Order-proofing removes position on purpose.** Some decisions should care about order ("the first available slot"). For those, the order must be written into each option's text.

## Where this is today

### How it IS used

- **The commercial cousin is real and getting tried.** TypeSafe launched **Jev**, its "System One model," in early access on September 15, 2026: you send state plus typed questions (Choice, Score, yes/no) and get calibrated probabilities back in 70 to 500 ms, priced at $0.042 per million input tokens with free output. Reviews report Vercel offering it through its AI Gateway and one Vercel engineer saying it replaced a safety-review model there, Cloudflare hosting it on Workers AI, and OpenRouter listing it. TypeSafe has not disclosed Jev's architecture, so Jeva is the first fully described open design in this category.
- **The use cases are everywhere in agents.** The patterns people report for Jev map straight onto Jeva's design: routing requests to the right model or tool, guardrails ("is this agent action safe?"), reranking search results, scoring and prioritization, and real-time decisions in games and voice-controlled apps. These jobs are mostly done today by calling a big LLM as a "judge," which is the slow, expensive approach this line of work aims to replace.
- **Its ancestors run most search today.** The two halves of Jeva are standard tools: **bi-encoders** (embed the question and each document separately, compare vectors; reusable and fast) power vector search, and **cross-encoders** (read question and document together; accurate but nothing reusable) power rerankers like Cohere Rerank and Elastic Rerank in Elasticsearch. Jeva is a hybrid: it keeps the bi-encoder's reusable option vectors but adds a small cross-attention step so the decision sees all options together.

### How it ISN'T used

- **Jeva itself isn't in products yet.** It was released five days ago, its weights require authenticated access, and it runs in-process in Python on NVIDIA GPUs with no hosted API. I found no deployments.
- **"Ask a chatbot to type the letter" is what this is meant to replace**, but it is still the default in most agent frameworks for tool choice and judging, because it is easy and needs no special model.
- **Fixed-label classifiers are fading for these jobs.** They are fast, but every new tool or category means retraining. Option-scalable designs like Jeva and Jev handle a new option by just encoding it.
- **Hype check.** Commentators push back on claims that decision models "can't hallucinate": the output is always a valid type, but it can still be confidently wrong.

### Lineage

word2vec vectors + Transformer attention + BERT-style encoders -> bi-encoder search and cross-encoder rerankers -> LLM-as-a-judge for agent decisions -> "System One" decision models (TypeSafe's Jev, now the open Jeva) -> what you use today: mostly LLM prompts for decisions, with vector search and rerankers underneath.

## Why it matters for Brendan

**For Arbor**, this is close to the core engine you'll need. An agent marketplace is a constant stream of "which listing or bid best fits this agent's context?" decisions over a catalog that changes slowly, which is exactly where option caching pays off: encode each listing once, then score millions of incoming requests against it cheaply. Two of Jeva's guarantees are also marketplace rules in disguise. Permutation invariance means a seller can't buy influence by being listed first, which is a fairness property you could actually promise participants. And the coverage gate gives your protocol an honest "no acceptable match, don't transact" outcome instead of forcing a bad trade. The context-dependence result (adding a third option can flip two others) is also a reminder that decoy listings are a real attack surface in any auction that ranks options jointly.

**For Unstall**, voice is unforgiving about delay: an extra second of silence feels broken. Most of what a voice chief of staff does between sentences is small typed decisions: which intent is this ("reschedule," "call back," "add note")? which client is "the Hendersons"? is this even a command, or just chatter? (that last one is the null case). MASSIVE, one of Jeva's test sets, is a voice-assistant intent benchmark, and Jeva's tens-of-milliseconds decisions on cached options suggest a pattern: let a fast decision model handle routing and save the big LLM for writing replies.

## Key terms

- **System One model**: a model built to make fast, typed decisions (pick, yes/no, score) rather than generate text, named after the "fast thinking" mode in Daniel Kahneman's psychology.
- **Permutation invariance**: reordering the options cannot change the decision.
- **Null / coverage gate**: a separate output estimating whether any option is acceptable at all, so the model can answer "none of these."
- **Immutable option memory**: each option's precomputed vector, keys and values, built without seeing the request, so it can be reused.
- **Bi-encoder vs. cross-encoder**: encoding question and option separately (fast, reusable) versus together (accurate, not reusable); Jeva sits between.
- **Calibration**: when a model says 80%, it is right about 80% of the time, which lets software set confidence thresholds.

## If you only have 10 more minutes

Read the **introduction**, where the four properties are laid out; that list is the most reusable idea and works as a checklist for any decision system you design. Then look at the **architecture figure** and the short section on the **coverage gate**. Skim the **permutation stability and null detection results**. Skip Proposition 1's math and the detailed latency tables.

## One question to think about

If a model's decisions are guaranteed never to depend on the order of options, but also come with no explanation, would you trust it more or less than a chatbot that explains its pick but changes its mind when you shuffle the list, and does the answer change if the decision is who gets matched with whom?

## Sources

A note: the arXiv page itself did not load for me today; I read a full-text reproduction of the paper on hyper.ai, the papers.cool listing, the model card and a Mindverse summary.

- [Jeva: System One Models from First Principles (arXiv)](https://arxiv.org/abs/2610.18773)
- [Jeva full text and figures (hyper.ai)](https://hyper.ai/en/papers/2610.18773)
- [Jeva listing (papers.cool)](https://papers.cool/arxiv/2610.18773)
- [Jeva-4B model card (Hugging Face)](https://huggingface.co/LIQIIIII/Jeva-4B)
- [Jeva architecture summary (Mindverse, German)](https://www.mind-verse.de/news/jeva-architektur-system-one-entscheidungsmodelle-e7b5d3c7bf3f)
- [Trending papers (Hugging Face)](https://huggingface.co/papers/trending)
- [Jev: TypeSafe's System One Model Explained (DataCamp)](https://www.datacamp.com/blog/system-one-models-jev)
- [TypeSafe Jev review (eesel)](https://www.eesel.ai/blog/typesafe-jev-review)
- [What is Jev? (DigitalOcean)](https://www.digitalocean.com/resources/articles/what-is-jev)
- [Jev use cases (AY Automate)](https://www.ayautomate.com/blog/jev-use-cases)
- [Semantic re-ranking, bi-encoders vs cross-encoders (Elastic docs)](https://www.elastic.co/guide/en/elasticsearch/reference/8.18/semantic-reranking.html)
