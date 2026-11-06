---
day: 43
title: "CoworkOS: Scaling Agent Coworkers for Real-world Automation"
short_title: "CoworkOS (an operating system for AI coworkers)"
authors: "CoworkOS Team: Jiajie Jin, Guanting Dong, Chengjun Pan, Xin Deng, Zhuohui Sheng, Guoqiang Wang, Tao Gui, Yutao Zhu and others (Renmin University of China, Fudan, with SJTU, NUS and others)"
year: 2026
link: "https://arxiv.org/abs/2611.03178"
track: "Frontier"
section: "Frontier"
tldr: "A team led by Renmin University and Fudan built an open-source \"harness\" for AI coworkers that splits the job into a boss agent that decides, a runtime that keeps track of everything so nothing is forgotten, and helper agents that do scoped work, and showed that with the same AI model it matches or beats OpenAI's Codex and DeepSeek's harness across 12 benchmarks, then used it to automatically train a smaller model nearly 10 points better."
---

# Day 43: CoworkOS: Scaling Agent Coworkers for Real-world Automation

The CoworkOS Team. Core contributors include Jiajie Jin, Guanting Dong, Chengjun Pan, Xin Deng, Zhuohui Sheng, Guoqiang Wang, Tao Gui and Yutao Zhu, with mentors including Ji-Rong Wen, Zhicheng Dou, Yu-Gang Jiang and Tat-Seng Chua (Renmin University of China and Fudan University, with Shanghai Jiao Tong, the National University of Singapore and others). Posted to arXiv on November 2, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2611.03178). Project page: [CoworkOS](https://coworkos-ai.github.io/). Code: [GitHub, MIT license](https://github.com/RUC-NLPIR/CoworkOS). Track: Frontier.

A note on why this paper: it was the third most upvoted paper on Hugging Face's Daily Papers for November 3 (about 100 upvotes) and is one of the most-upvoted papers of the week. It is also the clearest public blueprint yet for the kind of product you are building with Unstall: an AI that doesn't just answer one question, but carries a messy, multi-day job to the finish while a human steps in when needed.

## TL;DR

The model is only half of an AI coworker: the other half is the "harness" around it, and a harness that separates *deciding* (the model's job) from *remembering and tracking* (the software's job) lets the same model do measurably better, longer work.

## What it builds on

The basic loop of "think, use a tool, look at the result, think again" is ReAct (Day 18). The models inside are large language models (GPT-3, Day 11) post-trained to follow instructions (InstructGPT, Day 16), and the self-training experiment at the end is a supervised fine-tuning loop of the same kind. Loading reference documents only when needed is a cousin of retrieval (RAG, Day 14). Among frontier days, it continues the computer-use agent thread (OpenGCUA, Day 25), agent memory (Cortex, Day 23 and MemoryTax, Day 28), multi-agent orchestration (DynaFlow, Day 34), recursive self-improvement (The Trinity, Day 35) and AI-as-teammate evaluation (Collaborative Intelligence, Day 41).

## The world before this paper

By 2026, "agent harnesses" were everywhere. A **harness** is the software wrapped around an AI model that gives it tools (a terminal, a browser, file editing), feeds it the right context, and runs its loop. Claude Code, OpenAI's Codex and DeepSeek Harness are all harnesses, and products like Claude Cowork bring the idea to non-coding work. They work well for a task that fits in one sitting. They struggle with *real* work: a job that takes hours, involves a dozen sub-tasks, runs a long computation in the background, waits on a human answer, survives a crash, and must end with a verified deliverable (a deck, a CAD model, a trained model) rather than a chat reply. The core trouble is that most harnesses keep the state of the job inside the model's **context window** (the limited text the model can see at once). When that fills up, gets summarized, or the process restarts, the agent "forgets" what it had delegated, what it was waiting for, or whether it was actually done. CoworkOS argues the fix is architectural: the model should make decisions, and dependable software should hold the state.

## Core ideas

### 1. Three layers: a boss, a control room and a crew

**What it is.** CoworkOS splits an AI coworker into three roles.

- The **Main Agent** is the boss. It reads your goal, decides what to do next, does work itself when it needs the big picture, hands out scoped pieces, and decides whether returned work is good enough. The paper's one-line rule: the model chooses actions, delegation and acceptance.
- The **Coordinator Runtime** is the control room. It is ordinary software, not an AI. It packages each assignment, tracks who is doing what, queues results and messages, and keeps all of that saved to disk.
- **Subagents** are the crew. Each is a fresh AI instance with its own private workspace, given only what it needs for one job.

**How it works, step by step.**

1. You give a goal: "Build an interactive web page explaining how an espresso machine works, with an exploded 3D view."
2. The Main Agent plans and delegates. Each delegation is what the paper calls an **evidence contract**: the objective, the limits, which tools the helper may use, and *what proof it must hand back* ("a working page plus a screenshot of the exploded view").
3. The Coordinator builds the subagent's starting context: the assignment, a short slice of relevant background from the boss, the granted tools, and a short catalog of available **skills** (instruction documents for specialist tasks, which the agent opens in full only when it needs them).
4. The subagent works, checks its own output, and returns a report: what it did, what is still uncertain, where the files are, and whether it succeeded.
5. The Coordinator shows the boss the short report and keeps the subagent's full step-by-step history on file, so the boss's context isn't flooded but can dig in if needed.
6. The boss decides: accept, ask for a revision, or try another approach.

Delegation can be **synchronous** (the boss waits) or **asynchronous** (the boss gets a ticket number and keeps working, and the result lands in the boss's **Inbox** to be read at the next sensible moment). Subagents can message each other through the Coordinator, but only the boss can widen the scope or accept the final result. A subagent that needs a decision can ask, while stating a fallback ("I'll assume the US version unless told otherwise") so it doesn't sit idle.

**Analogy.** A film production. The director (Main Agent) makes the creative calls and signs off on takes. The production office (Coordinator) keeps the call sheets, tracks every department and logs everything, so nothing depends on the director's memory. The departments (subagents) do scoped work and report back with dailies as proof.

**Why the split matters.** If the "who is doing what" lives only in the model's head, it can be lost when context is trimmed or a process restarts. If it lives in the control room, the boss can always rebuild its picture from records, not from assumptions.

### 2. Work that survives time, crashes and humans

**What it is.** A set of runtime features that let a job run for hours or days and be interrupted safely.

**How it works.**

- **Background Jobs.** Long computations (training a model, rendering a Blender scene) get a permanent ID, a process record and a log. They outlive the conversation turn and even a restart of the boss. The boss checks: is it alive, how long has it run, is the log still moving? If a process vanishes without a recorded exit, the result is marked *uncertain*, not assumed successful.
- **Monitoring without paying for AI.** To watch something external (a folder, a website, an inbox), a plain script compares the current state with a saved snapshot. If nothing changed, no AI model is called at all, which saves money. Only changes are passed up to the boss. A goal that is "ongoing" must have either something watching it or a scheduled review time, so it can't be quietly forgotten.
- **Checkpoints and recovery.** Events and progress are saved so that replaying after a crash doesn't duplicate work. A supervisor wakes the boss back up if there is pending work, but respects explicit pauses and "waiting for the human" states. A resumed boss first looks at the current state, because the world may have moved on.
- **A "are we really done?" check.** Before accepting "Task complete," the runtime checks for still-running jobs, unanswered delegations, undelivered messages and open questions. This targets a well-known agent failure: declaring victory too early.

**Analogy.** A good production coordinator's binder. If the director walks off set for a day, the binder says what is rendering, who owes what, and what the client asked for, so anyone can pick up exactly where things stood.

### 3. Shared files that both humans and agents edit safely

**What it is.** A way for you and several agents to work on the same document, slide deck, CAD model or Blender project without overwriting each other.

**How it works.**

1. Every shared item has an identity, a type, its content and a **revision number** (like a version count).
2. Any edit says which revision it was based on. If that is still the latest, the edit is saved, the revision ticks up, and the system records who did it and a summary.
3. If someone else changed it in the meantime, the edit is *not* forced through. It comes back as a **conflict** and is kept for the boss to reconsider.
4. Subagents work on private **candidates** (drafts) that only become part of the real file when the boss merges them.
5. When *you* edit directly (move a slide, change a CAD dimension), agents see a short summary of your change as part of their context. Your hands-on edit becomes guidance, without you having to type instructions.

It connects to real apps (text documents, presentations, parametric CAD through FreeCAD, and Blender) through **MCP**, the Model Context Protocol, a common standard for plugging tools into AI models. For apps with only a visual interface, there is a browser and desktop-control mode, and you can pause it and take over the mouse.

**Analogy.** Shared editing in Google Docs plus the "check out, check in" rule of a film edit suite: two editors never cut the same reel at the same time, and every change is logged with a name.

### 4. Memory as a written briefing, not a long transcript

**What it is.** How the boss keeps its bearings across a long job.

**How it works.** The boss maintains a **task memory document**: the objective, what is done, what is next, and key decisions and constraints. At the end of each phase, it updates that document and the runtime wipes and rebuilds its context from: the memory document, the live runtime status (what is running, what is waiting), experiment summaries, and a little recent history. Your scoped preferences and past project experience are added within a size budget. Inside subagents, older steps are **compacted** (summarized) as they near the context limit. An **experimental ledger** records every run and its metrics, and carefully separates numbers *read from actual output files* from numbers an agent merely *claimed* in a report. That last detail is a quiet guard against agents reporting results they never produced.

**Analogy.** The director doesn't rewatch every take from day one before each new scene; they read the script supervisor's notes.

### 5. Using the coworker to train a better AI (recursive self-improvement)

**What it is.** A case study where CoworkOS runs an AI training project on its own. **Recursive self-improvement (RSI)** here means AI systems running the cycle of improving AI models.

**How it works.** A strong model (GLM-5.3) drives CoworkOS. Its job: make a smaller open model, **Qwen3.6-35B-A3B**, better at agent tasks. ("35B-A3B" means 35 billion total parameters, the model's adjustable numbers, with only about 3 billion used for any given word, a design called mixture-of-experts that keeps it cheap to run.) Each round:

1. Test the small model on eight benchmarks.
2. Diagnose where it is weak.
3. Revise the data pipeline and generate, check and filter new training examples. These are **trajectories**: recorded step-by-step examples of an agent using tools to finish a task.
4. Fine-tune the small model on them (**supervised fine-tuning, SFT**: training it to imitate good examples).
5. Re-test.

To avoid cheating, training data that resembled any test task too closely was filtered out.

**What happened, round by round.** The start (R0) averaged 33.19. Round 2 got *worse* (36.94 to 35.90), and the agent's review found the cause: 42 examples supplied 84% of the training signal, so the model was over-learning a handful of cases. Round 3 fixed that with a larger, more varied set (39.22). Round 4 targeted specific habits: skipping items in multi-item tasks, breaking constraints, and not double-checking after acting. Round 5 made obeying constraints a hard requirement and added examples of correct tool calls. Final: **42.95, a gain of 9.76 points**, better than the start on seven of eight benchmarks.

**Analogy.** An assistant director who reviews the dailies, notices the actor keeps missing the same mark, and writes a targeted rehearsal plan, then checks again tomorrow.

## Walkthrough: a CoworkOS job from start to finish

1. **Goal.** "Make a 12-slide presentation on the shrinking of the Aral Sea, with clear charts and a cause-and-effect diagram." (The Aral Sea deck is one of the paper's showcase cases.)
2. **Plan.** The boss writes its task memory: objective, slide outline, constraints (12 slides, cite sources).
3. **Delegate in parallel.** Subagent A researches data, with the contract "return figures with source links." Subagent B drafts the cause-and-effect diagram. Both run asynchronously; the boss keeps working on the outline.
4. **Results arrive** in the boss's Inbox. A's report says one figure is uncertain. The boss sends A back for a second source.
5. **You step in.** You open the deck and delete slide 7. Your change shows up to the boss as a short summary, and B's next edit to slide 7 comes back as a conflict instead of reviving the slide you deleted.
6. **Done check.** Before saying "finished," the runtime confirms no subagent is still running and no question is unanswered.
7. **Interruption.** If your laptop slept in the middle, the boss resumes from its memory document and the runtime's records, checks what changed, and continues.

## What they showed

**Same model, different harness.** The fairest comparison in the paper: all harnesses were run with the *same* AI model (GLM-5.3, with high thinking effort and a large context window), so the difference is the harness itself. They tested 12 benchmarks in four areas against OpenHands (a popular open-source harness), OpenAI's Codex and DeepSeek Harness (DSH).

- **Productivity (real office and professional work):** CoworkOS had the best average (57.54, vs 56.13 for DSH, 55.27 OpenHands, 40.11 Codex). The biggest standout was JobBench, realistic job tasks: CoworkOS 59.88, DSH 56.15, OpenHands 55.02, Codex 23.42. On GDPVal (OpenAI's benchmark of work tasks from real occupations) it had the top rating. On a legal-work benchmark, OpenHands was slightly ahead.
- **ML coding (running machine learning experiments):** narrowly the best average (56.26 vs 56.14 for DSH), with Codex and OpenHands well behind.
- **Tool use:** essentially tied with DSH (55.22 vs 55.31). DSH won the banking customer-service test.
- **Web search:** essentially tied with OpenHands (82.14 vs 82.22).

So the honest reading: CoworkOS is consistently at or near the top across *every* area, rather than dominating everywhere. Its edge is largest on long, real-world productivity tasks, which is exactly what it was designed for. The striking side result is how much the harness alone matters: with an identical model, Codex scored less than half of CoworkOS on JobBench.

**Self-improvement.** The 33.19 to 42.95 jump (Idea 5), with the agent catching and correcting its own bad round, is the paper's most eye-catching result. The biggest single gain was on an automation benchmark (+33 points over the start).

**Showcase.** 24 side-by-side cases (websites, games, slide decks, interactive explainers, CAD models of a turbofan engine and a robotic joint, Blender scenes), compared with the other harnesses by visual inspection.

## Limitations

- **Not a clean win.** It ties or loses on several benchmarks. The margins on averages are often small (0.1 to 1.5 points).
- **No ablations.** The paper doesn't remove one feature at a time to show *which* part (the Coordinator, the conflict system, the memory document) is responsible for the gains.
- **The self-improvement result is tangled.** The authors say themselves that each round changed several things at once, so you can't credit a specific fix. Some benchmarks fluctuated, and one (a function-calling test) stayed below the starting score for four rounds.
- **Showcases are eyeballed.** The 24 case comparisons are visual inspections by the authors, not scored. They openly note cases where Codex did better, and that a good-looking CAD model doesn't prove it is manufacturable or that parts fit.
- **One model tested.** All harness comparisons used GLM-5.3. It is not shown whether the advantage holds with Claude, GPT or Gemini models.
- **Cost not reported.** No dollar or time costs for the self-improvement experiment, and multi-agent systems typically use many more tokens than a single agent.
- **Brand new.** The open-source repo had only a handful of stars at the time of checking. There is no track record of real-world use yet.

## Where this is today

### How it IS used

- **The architecture is mainstream in commercial products, mostly undocumented.** [Claude Cowork](https://support.claude.com/en/articles/13345190-get-started-with-cowork) (launched January 2026) brings the agentic harness to non-coding work: it splits work into subagents running in parallel, keeps long tasks running in the cloud when you close your laptop, runs scheduled tasks, edits files in connected folders, and offers approval modes for how much a human signs off. OpenAI [turned Codex into an everyday work agent](https://www.thedeepview.com/articles/openai-turns-codex-into-a-daily-work-agent) in May 2026, connecting it to Slack, Drive, email and calendar. CoworkOS is a detailed public description of the same category, and a direct competitor to these.
- **Open harnesses are a crowded, fast-moving field.** [DeepSeek Harness](https://datanorth.ai/news/deepseek-releases-v4-pro-0813-and-harness-v0-1) (MIT license, released August 13, 2026) is an "open alternative to Codex and Claude Code" with plugins and resumable, replayable session logs. OpenHands is the long-standing open option. Both are baselines in this paper.
- **CoworkOS itself is usable.** The [GitHub repo](https://github.com/RUC-NLPIR/CoworkOS) is MIT-licensed, with a macOS desktop app and a command-line tool that connect to any model service you configure.
- **Individual ideas are standard practice.** Subagents with fresh context, skills loaded on demand, context compaction and plain-script monitoring that only wakes the AI on change all appear in today's major agent products in some form. CoworkOS's distinctive contributions are packaging them into one design with explicit rules (evidence contracts, revision conflicts, the completion check) and publishing it.

### How it ISN'T used

- **Not yet proven at scale.** It is a research release days old, with benchmark results but no reported production deployments.
- **"Agent remembers everything in its chat history" is being abandoned.** The single long transcript, where the model is the only record of the job, is the approach this paper (and the industry) is moving away from in favor of saved, structured state.
- **Fully autonomous RSI is not how frontier models are trained.** Labs use AI heavily in their pipelines, but the "agent runs the whole post-training loop" setup here is a small-scale case study on one model, with humans designing the setup.
- **One giant do-everything agent is fading** for long jobs, replaced by boss-plus-helpers designs like this one, though critics note multi-agent setups cost more and can multiply errors (see Day 29 on herding and runaway cascades).

### Lineage

ReAct's think-act loop (2022) -> coding agents with tools (Claude Code, Codex, OpenHands) -> general "cowork" agents for office work (Claude Cowork, Codex for everyday work, DeepSeek Harness) -> CoworkOS: a boss agent, a software control room that holds state, and helper agents, published openly -> likely, AI coworkers that run multi-day projects and help train their own successors.

## Why it matters for Brendan

**Unstall.** This is close to a design doc for a voice-first chief of staff. A real estate agent's work is exactly the long, interruptible kind CoworkOS targets: a listing goes on for weeks, with waiting on inspections, lenders and clients. Three ideas to steal directly. First, keep the deal state (who owes what, what is waiting) in software, not in the AI's conversation, so the assistant never "forgets" a pending task when a call ends. Second, the plain-script monitoring rule: check the MLS, the inbox or the calendar with cheap code, and only wake the AI when something changed, which keeps costs down. Third, the "are we really done?" check before the assistant tells an agent something is handled; for a client-facing product, falsely claiming completion is the most damaging failure.

**Arbor.** The **evidence contract** (objective, limits, granted tools, and the proof required on return) is a natural format for a task posted to an agent marketplace. If agents bid on work in Arbor, a contract that specifies what proof the buyer accepts is what lets payment be tied to verifiable delivery, and CoworkOS's ledger, which separates numbers read from real outputs from numbers an agent merely claimed, is the kind of check a buyer would want.

## Key terms

- **Harness**: the software around an AI model that gives it tools, feeds it context and runs its loop; Claude Code, Codex and CoworkOS are harnesses.
- **Subagent**: a separate AI instance given one scoped task with its own clean workspace, which reports back to a coordinating agent.
- **Context window**: the limited amount of text a model can see at once; long jobs overflow it, so information must be summarized or stored elsewhere.
- **Evidence contract**: CoworkOS's term for a delegated task that states the goal, the limits, the allowed tools and the proof that must come back.
- **Compaction**: summarizing older parts of an agent's history so it fits in the context window while keeping recent steps in full.
- **Recursive self-improvement (RSI)**: AI systems running the process of improving AI models, here an agent generating data and fine-tuning a smaller model over several rounds.

## If you only have 10 more minutes

Read the paper's architecture section (the Main Agent, Coordinator Runtime and Subagents, plus the figure that shows them), since it is the reusable design. Then skim the RSI case study for the round 2 story, where the agent diagnoses its own bad training round; it is the clearest picture of what "AI improving AI" looks like in practice. Skip the full benchmark appendix and the long per-case showcase notes, or just browse the visual cases on the [project page](https://coworkos-ai.github.io/).

## One question to think about

CoworkOS gives the AI boss the final say on accepting work, and lets you guide it by editing files directly. For a product like Unstall, which decisions should only ever be accepted by the human, and how would you design the "evidence" the AI must show so a busy agent can approve it in five seconds on a phone?

## Sources

- [CoworkOS: Scaling Agent Coworkers for Real-world Automation (arXiv abstract)](https://arxiv.org/abs/2611.03178)
- [Full text (arXiv HTML)](https://arxiv.org/html/2611.03178)
- [CoworkOS on Hugging Face Daily Papers](https://huggingface.co/papers/2611.03178)
- [Hugging Face Daily Papers, November 3, 2026](https://huggingface.co/papers/date/2026-11-03)
- [CoworkOS project page](https://coworkos-ai.github.io/)
- [CoworkOS on GitHub](https://github.com/RUC-NLPIR/CoworkOS)
- [Get started with Cowork (Claude Help Center)](https://support.claude.com/en/articles/13345190-get-started-with-cowork)
- [OpenAI turns Codex into a daily work agent (The Deep View)](https://www.thedeepview.com/articles/openai-turns-codex-into-a-daily-work-agent)
- [DeepSeek releases V4-Pro-0813 and open sources Harness v0.1 (DataNorth)](https://datanorth.ai/news/deepseek-releases-v4-pro-0813-and-harness-v0-1)
- [CoworkOS coverage (AI Weekly, in French)](https://aiweekly.co/fr/alerts/coworkos-atteint-le-sota-en-productivit-et-montre-976-pts-en-rsi-sur-qwen36-35b)
