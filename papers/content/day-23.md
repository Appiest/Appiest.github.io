---
day: 23
title: "Cortex: Consolidating Context into Parametric Memory"
short_title: "Cortex (context into weights)"
authors: "Jintian Zhang, Feng He, Xinnian Liang, Ziwen Xu, Haoming Xu, Haojing Huang, Shuangzhi Wu, Ningyu Zhang (ByteDance Seed)"
year: 2026
link: "https://arxiv.org/abs/2610.20399"
track: "Frontier"
section: "Frontier"
tldr: "Instead of re-pasting the same notes into a model's prompt forever, Cortex has the model quiz itself on those notes and then bakes the answers into a small add-on to its own weights, so it keeps the new knowledge with the notes gone and barely forgets anything else."
---

# Day 23: Cortex: Consolidating Context into Parametric Memory

Jintian Zhang, Feng He, Xinnian Liang, Ziwen Xu, Haoming Xu, Haojing Huang, Shuangzhi Wu and Ningyu Zhang, ByteDance Seed, submitted October 14, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.20399). Track: Frontier. It is a "technical report," under review at a conference, and the authors say the code and benchmark will be open sourced (not linked yet). Ningyu Zhang's group is known for EasyEdit, one of the most widely used toolkits for editing facts inside language models, so this comes from people who have worked on the problem for years.

## TL;DR

Today an AI "remembers" you only because your notes get pasted back into its prompt every single time; Cortex shows a practical way to move those notes into the model's actual brain (its weights) so the knowledge survives after the notes are removed, while keeping about 99.8% of everything else it already knew.

## What it builds on

The Transformer (Day 9) gives it the target: Cortex writes new knowledge only into the Transformer's "feed-forward" layers. GPT-3 (Day 11) showed the thing Cortex is trying to make permanent: in-context learning, where a model gets smarter just from what is in its prompt. RAG (Day 14) is the rival approach it wants to complement: look things up and paste them in. InstructGPT (Day 16) is the reminder that changing weights after pretraining is how models actually acquire new behavior. And the "teacher and student" trick at its core is a form of distillation, a recurring idea across the series.

## The world before this paper

There are two ways to give a language model new information. The first is the **context window**: the text you put in the prompt. It is instant and works remarkably well, but it is temporary. Close the chat, and it is gone. Every product with "memory" (ChatGPT's saved memories, memory layers like Mem0, Zep and Letta) works by storing notes in a database and pasting the relevant ones back into the prompt on every turn. That costs money and time on every request, and long prompts get slow and unreliable. The second way is to change the **weights**, the billions of numbers that are the model's long-term knowledge. That is permanent, but it has been clumsy. Fine-tuning tends to cause **catastrophic forgetting** (learn one thing, quietly break others). Specialized "knowledge editing" methods like ROME, MEMIT and AlphaEdit can change a single fact ("the CEO of X is now Y"), but they are narrow: they handle facts, not skills or behavior, and they degrade when you stack many edits in a row. Each kind of update (facts, new tools, personality, "stop saying this") had its own separate method and its own benchmark. Nobody had one recipe for "take whatever the prompt taught the model and make it stick."

## Core ideas

### 1. Name the goal: close the "context gap" without breaking anything

**What it is.** The paper's first contribution is a clean way to define the problem, which it calls **Memory Consolidation**, borrowing a term from neuroscience. In your brain, consolidation is the process (largely during sleep) where short-term experiences get rewritten into long-term memory.

**How it works.** Pick some piece of context, say a short document describing a new software tool. Ask the model questions about it twice: once with the document in the prompt, once without. The difference in scores is the **context gap**. The goal of consolidation is to update the weights so that, *without* the document, the model scores as if it still had it, while scoring the same as before on everything unrelated.

That gives two measurements:

- **Consolidation Rate (CR)**: what fraction of the context gap the updated model recovers with the context removed. 100% means it fully absorbed the lesson.
- **Retention Rate (RR)**: how well the updated model does on unrelated "retain" questions, compared with the original model. 100% means nothing else got damaged.

The paper also separates two kinds of failure. A **memory failure** is when the model *can* use the information when it is in the prompt but loses it when it is not. That is the only thing consolidation tries to fix. A **capability failure** is when the model can't solve the task even with the information in front of it. No amount of consolidation fixes that, because there is no gain to keep.

**Analogy.** A student who aces the open-book exam but fails the closed-book one has a memory failure. A student who fails both has a capability failure. Studying (consolidation) only helps the first student.

**Why this framing matters.** It unifies jobs that used to be separate fields. The paper's test bed has five task families, all treated as "consolidate this context":

1. **Factual editing**: update or add facts.
2. **Novel API learning**: learn to use a new software tool, so later you don't need the documentation in the prompt.
3. **Persona steering**: adopt a personality or style as a default.
4. **Knowledge suppression**: stop producing certain information.
5. **Agent experience**: absorb lessons from successful past attempts at tasks (they use ALFWorld, a text-based household task game, and tau2-Bench, which simulates customer service agents).

It also tests three schedules: one update at a time, a big batch at once, and **sequential** updates, where lessons arrive one after another and old notes can't be revisited. Sequential is the realistic one for a product that learns over months, and the hardest.

### 2. Prospective queries: have the model quiz itself before it forgets

**What it is.** To train the weights, you need examples of the model using the new information. Cortex generates them itself, with no outside helper model. The authors call these **prospective queries**, inspired by how people decide what to remember by imagining when they will need it.

**How it works, step by step.**

1. Take the context (for example, the new tool's documentation).
2. Ask the frozen, original model: "What questions might a user ask that this text would help answer?" It writes a set of plausible future questions.
3. Have the same model answer each question *with the context in its prompt*. Those answers are good, because the model is reading the documentation.
4. Save each (context, question, answer) triple as training data. An optional filter can throw out bad ones. For agent tasks, the "questions" come from the task environment, and only trajectories that actually succeeded are kept.

When there are many contexts in a batch, there are two options: glue the contexts together first and then generate questions, or generate questions per context and merge the results so each example remembers which context it came from.

**Analogy.** Before a trip, you don't memorize the guidebook word for word. You imagine "where will I eat on day two? how do I get from the airport?" and remember the answers to those. The questions shape what sticks.

**Why it matters.** Training on the raw text tends to produce a model that can recite the text but not use it. Training on varied questions and answers teaches *use*. (A related 2025 Stanford method called Cartridges found the same thing: training on the raw document made a memorizer, while training on self-generated conversations about it made something useful.)

### 3. Write only into the feed-forward layers, as a removable add-on

**What it is.** Every Transformer layer has two main parts. **Attention** decides which words to look at. The **feed-forward network (FFN)** is a block of math applied to each word afterwards, and researchers have long viewed it as the model's **key-value memory**: patterns come in as "keys," stored associations come out as "values." Cortex writes new knowledge *only* there and keeps attention frozen. Its ablations show this beats also training attention, on both learning and not forgetting.

**Two ways to write.**

- **Cortex-Synaptic** adds small **low-rank** adjustments to the existing FFN weight matrices. "Low-rank" means the change is described by a few thin slices of numbers instead of a whole new matrix (this is the same idea as **LoRA**, the most popular cheap fine-tuning method). Afterward the adjustment is simply added into the weights.
- **Cortex-Structural** leaves the original FFN untouched and bolts on a small parallel branch: a few **new channels** (think extra memory slots) with their own weights. Afterwards this is merged by making the FFN slightly wider. Old weights never change, so old knowledge is harder to disturb, and it is also cheaper to train than the Synaptic version for the same size.

Either way, the final model has a normal architecture. You don't need special software to run it.

**One extra wrinkle for mixture-of-experts models.** Many big models today are **mixture-of-experts (MoE)**: each layer has many expert FFNs, and a router sends each word to only a few. If you add a new branch to every expert, some branches barely get trained because few words reach them. Cortex instead adds one shared branch per layer that every word passes through, which still folds neatly into the standard design.

**Analogy.** Synaptic is editing notes in the margins of your existing textbook. Structural is adding a few new index cards to the back of the book: nothing already printed gets smudged, but the book gets a little thicker with every lesson.

### 4. The teacher and student: copy the "open book" self

**What it is.** The training step is **context distillation**: the same model plays both roles.

**How it works.**

- The **teacher** is the original frozen model, given the context plus the question plus the answer.
- The **student** is the model with the new trainable add-on, given the question and answer but *not* the context.
- The student is trained to produce the same next-word probabilities as the teacher (measured with **KL divergence**, a standard score for how different two probability distributions are). In plain terms: "act as if you had read the notes, without the notes."
- A second loss keeps the student's internal signals at every layer close to the teacher's. This acts as a guardrail so the inside of the model doesn't drift, which is what usually damages unrelated skills. It costs a little learning but stabilizes retention.

**Query replay for long-running learning.** In the sequential setting, Cortex optionally saves only the *questions* from earlier lessons, not the notes or the answers. Before each new lesson, the previous version of the model answers those old questions, and those answers get mixed into training so the new lesson doesn't overwrite old ones. Nothing extra is needed at run time.

## Worked example: a new tool, start to finish

This is my own illustration of the pipeline, not an example from the paper.

1. A company releases a new internal API, `book_showing(listing_id, time)`, and writes two paragraphs of documentation.
2. Without the docs, the model has never heard of it and fails. With the docs pasted in, it uses it correctly. That difference is the context gap.
3. Prospective queries: the model writes questions like "How do I schedule a showing for listing 4471 tomorrow at 3pm?" and "What happens if the time slot is taken?"
4. With the docs in its prompt, the model answers each one. These become training triples.
5. Distillation: a small structural branch is trained so the model, without the docs, gives the same answers.
6. The branch is merged in. Now the docs can be deleted from every future prompt. Questions about unrelated things (writing an email, doing math) score essentially the same as before.
7. Next week, a second API arrives. Repeat, with query replay of last week's questions so the first API isn't forgotten.

## What they showed

**Scale and breadth.** They tested models from 4 billion to 120 billion parameters, both regular ("dense") and mixture-of-experts, instruction-tuned and "thinking" models, text-only and multimodal. That breadth is a big part of why the paper is credible: it isn't a trick that works on one model.

**The headline number.** On a 14B model, after **50 factual edits in a row**, Cortex-Structural recovered **88.9%** of the context gap while keeping **99.8%** of performance on unrelated questions. Against AlphaEdit, a strong specialized fact-editing method, under the same conditions, that is reported as about **66 percentage points** more consolidation and about **4 points** better retention. That is the surprising part: a general method beat a specialist at the specialist's own job, and the gap is huge in the sequential setting where specialist editors tend to collapse.

**The bigger picture.** Across the five task families, Cortex sits on the **Pareto frontier** "in most settings." That phrase means: for the amount it learns, nothing else forgets less, and for how little it forgets, nothing else learns more. It is not claiming to win every single comparison.

**What the ablations showed.**

- Writing only into the FFN beat also training attention, on both measures.
- Structural forgot less than Synaptic, even without query replay.
- The shared branch for mixture-of-experts models learned more than giving each expert its own.
- The internal-signal guardrail stabilized retention at a small cost in learning.

## Limitations

- **I could not read the full paper.** The arXiv PDF was rate-limited for me today, so the method details and numbers here come from the abstract, the Hugging Face page and a detailed third-party summary. The headline numbers match the abstract; finer details deserve a check against the PDF.
- **Not yet reproducible.** Code and benchmark are promised but not released, and the paper is not yet peer reviewed.
- **The headline is one setting.** 88.9% and 99.8% are for a 14B model on 50 factual edits. "Most settings" means some settings are not on the frontier.
- **The model keeps getting wider.** Each structural update adds channels and freezes the old ones. Over thousands of updates, that growth adds up, and the paper's evaluation is on tens of updates, not years of daily learning.
- **It costs compute per update.** Generating questions and training is far heavier than writing a row to a database, and the summary I read notes the overhead isn't fully quantified.
- **Hand-built test cases.** The test contexts were written by hand to have a clear context gap. Messy real-world conversations are harder.
- **It can't fix capability failures.** By design, it only preserves what the model could already do with the notes in front of it.
- **Weights are hard to audit and delete.** A database memory can be shown to a user and deleted line by line. Knowledge baked into weights cannot be inspected the same way, which matters for privacy and "forget this" requests. (This is my observation, not a limitation the paper lists.)

## Where this is today

### How it IS used

- **Product memory today is all context, not weights.** ChatGPT's memory stores "saved memories" and references chat history separately from the model, and lets you view, correct and delete them; OpenAI's help page describes choosing relevant information for each response, not retraining your copy of the model. Memory layers like Mem0 work the same way: extract facts, store them in a database keyed by user, retrieve the relevant ones, and paste them into the prompt. Cortex is aimed at the step after that: turning those pasted notes into weights.
- **Close cousins already exist as research tools.** Sakana AI's Doc-to-LoRA and Text-to-LoRA (February 2026) train a "hypernetwork" (a model that writes weights for another model) to turn a document or a task description into a LoRA adapter in under a second, with open code. Stanford's Cartridges (2025) compress a long document into a small trained cache using self-generated conversations, using about 38.6 times less memory than keeping the whole document in context. Cortex shares the self-quizzing idea with Cartridges and the "mergeable adapter" idea with LoRA methods, but bakes the result into the weights themselves.
- **Companies do update weights from deployment, in batches.** Shopify's engineering team described (August 2026) a loop for its Sidekick assistant that first improves prompts and tools, then, once that plateaus, fine-tunes the model daily on repaired production conversations. That is the coarse, company-wide version of what Cortex does surgically, one lesson at a time.
- **Knowledge editing tools.** Ningyu Zhang's group maintains EasyEdit, an open-source toolkit that implements many fact-editing methods, including AlphaEdit, the baseline Cortex beats. It is used mostly in research, not products.

### How it ISN'T used

- **No shipping assistant I found learns into its weights per user.** A forecasting exercise built on Dwarkesh Patel's "continual learning" predictions (August 2026) put about 60% on mid-2027 still being "context and memory only, no weight change" for frontier products, and only about 3% on per-customer weight copies updated weekly. Cortex is a step toward the thing forecasters think is still far off.
- **Narrow single-fact editors are being outgrown.** Methods like ROME, MEMIT and AlphaEdit edit one fact at a time and struggle when edits pile up. Cortex's result suggests one general distillation recipe can replace them.
- **Plain fine-tuning on raw text is the thing to avoid.** It tends to produce memorization without understanding, plus forgetting. The self-quizzing approach (Cortex, Cartridges) is the current answer.

### Lineage

In-context learning (GPT-3) + fact editing (ROME, MEMIT) + LoRA adapters -> self-quizzing distillation (Cartridges, Doc-to-LoRA, Cortex) -> what you use today: retrieved notes pasted into the prompt (ChatGPT memory, Mem0) -> what may come next: assistants that consolidate those notes into their own weights over time.

## Why it matters for Brendan

**For your relationship-memory startups**, this is the clearest picture yet of the "two-tier" memory design that could be your architecture, and the trade-off you will have to sell. Tier one is an explicit, permissioned store of what a person shared (inspectable, deletable, scoped to whoever was granted access). Tier two is consolidation: knowledge that has been stable and confirmed for a while gets distilled into a small per-user add-on so it doesn't have to be pasted into every prompt. Cortex-Structural's design (old weights frozen, new knowledge in a separable branch) is what makes a per-person "memory module" even thinkable, because a separable branch is something you could in principle switch off when permission is revoked. The paper doesn't test that, and it is the hard question: once something is in weights, deletion and consent get much harder than deleting a database row.

**For Unstall**, the "novel API learning" and "agent experience" task families map directly onto a chief of staff that needs to learn each agent's tools (their CRM, their showing scheduler) and the habits that worked before. Today you would put those docs and examples in the prompt every call; consolidation is the path to a faster, cheaper assistant that just knows them. In the near term, the practical lesson is cheaper: if you ever fine-tune, train on realistic questions and answers about the material, not the raw material itself.

## Key terms

- **Context window**: the text a model can see in its prompt right now; powerful but temporary.
- **Parametric memory**: knowledge stored in a model's weights (its parameters), which persists without being in the prompt.
- **Context gap**: how much better a model does with some context in its prompt than without it; the thing consolidation tries to keep.
- **Consolidation Rate and Retention Rate**: how much of the context gap is kept after the context is removed, and how much unrelated performance survives.
- **Prospective queries**: questions the model writes for itself to anticipate how a piece of context will be used later.
- **Context distillation**: training a model without the context to imitate its own outputs with the context.
- **Feed-forward network (FFN)**: the per-word processing block inside each Transformer layer, often viewed as the model's key-value memory.
- **Catastrophic forgetting**: when training on something new quietly breaks what a model already knew.

## If you only have 10 more minutes

Read the **introduction** and the **problem definition section** (context gap, memory vs capability failure, Consolidation and Retention Rates); that framing is the most reusable idea in the paper and will change how you think about any memory product. Then look at the **method overview figure** and the **sequential editing results**. Skip the per-model result tables and the mixture-of-experts derivation.

## One question to think about

If an assistant could either keep a person's details in a visible, deletable notebook or absorb them into its own weights where it is faster and cheaper but nearly impossible to inspect, which details belong in which place, and who should get to decide when something moves from the notebook into the brain?

## Sources

A note: I read the arXiv abstract page and the Hugging Face paper page directly; the full PDF was rate-limited today, so method details come from those pages and from a detailed Mindverse summary of the paper.

- [Cortex: Consolidating Context into Parametric Memory (arXiv abstract)](https://arxiv.org/abs/2610.20399)
- [Paper page (Hugging Face)](https://huggingface.co/papers/2610.20399)
- [Cortex summary (Mindverse, German)](https://www.mind-verse.de/news/cortex-kontext-parametrisches-gedaechtnis-llm-c92b8321116b)
- [ByteDance Seed publishes Cortex (AI Weekly, French)](https://aiweekly.co/fr/alerts/bytedance-seed-publie-cortex-qui-compile-le-contexte-en-mmoire-paramtrique-sans)
- [Memory FAQ (OpenAI Help Center)](https://help.openai.com/en/articles/8590148-memory-faq)
- [State of AI Agent Memory 2026 (Mem0)](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- [Instant LLM Updates with Doc-to-LoRA and Text-to-LoRA (Sakana AI)](https://sakana.ai/doc-to-lora/)
- [Cartridges: Storing long contexts in tiny caches with self-study (Hazy Research, Stanford)](https://hazyresearch.stanford.edu/blog/2025-06-08-cartridges)
- [Sidekick's continual learning loop (Shopify Engineering)](https://shopify.engineering/sidekicks-continual-learning-loop)
- [When Will AI Have Continual Learning? (FutureSearch)](https://futuresearch.ai/dwarkesh-continual-learning-forecast/)
- [EasyEdit knowledge editing framework (zjunlp, README)](https://cdn.jsdelivr.net/gh/zjunlp/easyedit@main/README.md)
- [AlphaEdit: Null-Space Constrained Model Editing (USTC)](https://data-science.ustc.edu.cn/_upload/tpl/15/04/5380/template5380/publication/iclr25-fjf.html)
