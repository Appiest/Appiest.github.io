---
day: 35
title: "The Trinity: Capability-Driven Recursive Self-Improvement for Multimodal Agents"
short_title: "The Trinity (agents that build their own practice worlds and upgrade their own toolkit)"
authors: "Weidong Tang, Ruiheng Wang, Jingxuan Zhang, Hexin Wang and others; corresponding authors Pengfei Zhou, Odin Zhang, Yang You (InfRec, National University of Singapore, CUHK, Tongji, Xidian, UC Berkeley and others)"
year: 2026
link: "https://arxiv.org/abs/2610.36077"
track: "Frontier"
section: "Frontier"
tldr: "The Trinity has an AI agent sort dozens of very different tasks by the skills they secretly share, build simple practice worlds for each shared skill, and keep only the upgrades to its own scaffolding that provably help, which lifted one frozen model by about 34 points on its training tasks and about 22 to 26 points on tasks it had never seen."
---

# Day 35: The Trinity: Capability-Driven Recursive Self-Improvement for Multimodal Agents

Weidong Tang, Ruiheng Wang, Jingxuan Zhang, Hexin Wang and 17 others. Corresponding authors Pengfei Zhou (InfRec and National University of Singapore), Odin Zhang (CUHK) and Yang You (NUS). Posted to arXiv on October 26, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.36077). Track: Frontier.

A note on why this paper: it was the number one paper on Hugging Face Daily Papers for October 28 (over 530 upvotes, the most of the week), and it is about something every agent product depends on but almost nobody talks about outside engineering teams: the "harness," the software wrapped around a model that decides what it sees, remembers, and does. A note on accuracy: this brief is built from the full arXiv HTML paper, the Hugging Face page and its comment thread, and two secondary write-ups. The code repository says "coming soon," so nothing here was reproduced. Where the paper's own numbers disagree with each other, I say so.

## TL;DR

Instead of retraining the AI model, The Trinity lets an agent improve its own scaffolding by noticing that a chess puzzle, a robot maze, and a party game like Among Us often need the same underlying skill, practicing that skill in small made-up worlds, and keeping only the changes that measurably help.

## What it builds on

GPT-3 (Day 11) showed that one frozen model can do many tasks if you give it the right context, which is the whole premise here: the model never changes, only what surrounds it. Chain-of-Thought (Day 17) and ReAct (Day 18) are the basic agent loop (think, act, observe) that a harness formalizes. DQN (Day 6) is the ancestor of learning by practicing in simulated environments. RT-2 (Day 21) is the background for the two real robot tests. Among frontier days, it connects to Day 23 (Cortex, which stored experience inside the model's weights; The Trinity deliberately does the opposite), Day 28 (MemoryTax, on when agent memory is worth its cost), Day 31 (AW-0, a robot that writes its plan as code), and Day 34 (DynaFlow, which trained the manager; The Trinity evolves the scaffolding instead).

## The world before this paper

Today's agents are a model plus a **harness**: the code around the model that formats what it sees, stores memories, decides when to plan, which tools to call, and when to stop. Engineers now spend enormous effort tuning harnesses by hand, and it works: LangChain reportedly moved its coding agent from 30th to 5th on a coding benchmark in 2026 without changing the model at all. But hand-tuning does not scale to thousands of different tasks. Earlier research on letting agents improve their own harness mostly worked on text tasks like coding and math, and it had two bad options. Evolve one harness *per task*, and it overfits (gets great at that one benchmark and useless elsewhere). Evolve one *global* harness for everything, and it gets pulled in conflicting directions (what helps a poker bot can hurt a video watcher). On top of that, building training environments by hand for every new kind of task is slow and expensive. Nobody had a good way to organize self-improvement across very different, multimodal tasks (images, video, games, robots).

## Core ideas

### 1. Sort tasks by the skills they need, not by what they look like

**What it is.** A **capability** is an underlying skill a task demands, like "keep track of what has changed in the scene" or "check the evidence before committing to an answer." The key insight of the paper is that tasks that look nothing alike often need the same capabilities. A grid puzzle game (ARC-AGI-3) and a robot mouse finding its way through a maze (Micromouse) both depend on **perception and state tracking**: seeing what is in front of you and remembering how things have changed.

**How it works, step by step.**

1. The agent attempts all 28 training benchmarks (more on these below) and records **trajectories**: complete logs of what it saw, thought, and did, and whether it succeeded.
2. One role, the **Evolver**, reads the verified trajectories and writes down, for each task, which capabilities it actually required.
3. Those requirement lists are merged into a **capability tree**: broad skills near the root, more specific ones further out, with tasks hanging off the branches that match them. The tree is built with a **trie**, a simple data structure that merges lists sharing the same beginning, the way the words "car" and "cart" share a branch in a dictionary tree.
4. The top-level branches turned out to be five domains: rule discovery, constrained problem solving, perception and control, multi-agent interaction, and long-horizon tasks. Specific capabilities include things like "hypothesis and counterpart inference" (guessing what rules or opponents are doing) and "constraint checking and feedback repair" (noticing you broke a rule and fixing it).

**Analogy.** A film school that organizes classes by surface category would have "horror," "documentary," "music video." One that organizes by capability would have "blocking actors in a tight space," "building tension with sound," "cutting on motion." A horror short and a music video might both land in "cutting on motion." The second school transfers better, because skills, not genres, are what you reuse.

### 2. Real2Sim2Real: build small practice worlds for each shared skill

**What it is.** **Real2Sim2Real** means: start from real tasks, build simulated (practice) versions, train in the simulation, then test back on the real tasks. A **simulated world** here is a small, simplified, automatically checkable environment, like a tiny puzzle game, written by the agent itself.

**How it works, step by step.**

1. For each node in the capability tree, the **Creator** role looks at the public descriptions of the tasks on that node and designs a simplified training world that exercises just their shared skill.
2. The world is deliberately *not* a copy of any test. It excludes the real tasks' layouts, private answers, and solution traces, so the agent cannot just memorize the exam.
3. A pool of **verifiers** (automatic checkers run by the host system, not by the agent) confirms the world works and that success can be scored.
4. A **difficulty band** filter: a frozen reference agent tries the world, and only worlds of medium difficulty are kept. Too easy teaches nothing; too hard gives no useful signal.
5. After practice, the agent is scored on the original real benchmarks. That is the real test: did the skill *transfer*?

The paper's Figure 3 gives an example: four different tasks all require "checking evidence before deciding," so one shared practice world is built for that habit instead of four separate ones.

**Analogy.** A basketball coach does not only scrimmage. She notices that missed layups, bad free throws, and turnovers all trace back to footwork, so she invents a cone drill for footwork. The drill looks nothing like a game, but game performance is how she checks it worked.

### 3. Evolve the harness, not the model, and only keep upgrades that prove themselves

**What it is.** The model (Claude Opus 5, kept **frozen**, meaning never retrained) stays fixed throughout. What evolves is the harness, which the paper breaks into six **protocols** (slots that a piece of code can fill):

- **Perception:** pull facts out of what the agent sees.
- **Memory:** build a useful view of past evidence.
- **Inference:** keep a list of hypotheses consistent with the evidence.
- **Planning:** rank or prune options into a decision.
- **Orchestration:** figure out which tools or resources apply.
- **Loop:** decide when to act, commit, or hold back.

Each slot is filled by **modules**: small, reusable pieces of code that read the agent's records and return something useful. The paper ends up with 29 of them. The starting harness is called "Prime Agent."

**How it works, step by step.** The third role, the **Explorer**, maintains a **harness tree** that has exactly the same shape as the capability tree. Each node of the harness tree holds modules inherited from its parent plus its own local modules. One improvement round goes like this:

1. The Explorer runs the agent in the practice worlds for each node and records trajectories.
2. The Evolver compares successes with failures and proposes a change to a module (say, a better way to track which cups have already been lifted).
3. The host system checks the proposal: Is there evidence for it? Does it fit the slot's interface? Is it based on the current version?
4. **Strict acceptance rules.** A local change is kept only if it does not lower the score. A change pushed down from a parent node replaces the child's inherited version only if it *strictly* improves the child's verified results on the same tasks, budget, and number of tries. Sibling branches evolve independently, so improving the poker branch cannot break the video branch.
5. At the end of the round, the Creator merges modules that complement each other and removes near-duplicates, producing a new, better starting harness. It also revises practice worlds where checkers found failures.

This loop repeats. **Recursive self-improvement (RSI)** is the name for a system improving the very machinery it uses to improve; here, four rounds were run.

**Analogy.** A restaurant that never changes its chef (the model) but keeps refining its kitchen systems: prep lists, ticket order, plating checklists. Every station can propose changes, but a change only goes into the official binder if it measurably speeds service at that station, and a change at the pastry station never overrides the grill station's binder.

### 4. A router picks the right harness for each new task

**What it is.** After evolution you do not have one harness; you have a tree of them. The **Capability-Aware Harness Router** is an agent that, given a new task, picks which configuration of modules to use.

**How it works.** It reads the task's public goal and first observation, the descriptions of each candidate harness, summaries of how each has performed and what it costs, and up to ten similar past experiences pulled from a memory of 20,000 records. It must commit to one harness and state why *before* running. Afterward, the verified outcome is written back to memory so future routing gets better.

**Analogy.** A casting director who reads the script's logline, checks notes on how each actor did on similar roles, commits to a choice with a reason, and logs how it went.

### Walkthrough: one real robot test

This is assembled from the paper's description of the CaP-X real-robot task; the internal reasoning lines are illustrative.

1. **Task:** a two-armed robot (AlohaMini2) faces three upside-down cups. It must uncover them and report whether a cube is hidden, and if so its color and which cup.
2. **Router:** reads the goal and the camera view. It recognizes "perception and state tracking" plus "check evidence before deciding," and picks the harness branch that evolved under those nodes.
3. **Perception module:** after each lift, records "cup 1: empty."
4. **Memory and Inference modules:** maintain "cube is under cup 2 or cup 3."
5. **Loop module:** holds back from answering until the evidence is complete, the habit drilled in the practice worlds.
6. **Answer:** "Red cube under cup 3."

With the starting harness, the robot succeeded 0 percent of the time on this real task. After four rounds, 60 percent.

## What they showed

**The tests.** 28 training benchmarks across the five domains, including Mastermind, chess tactics, Rubik's Cube solving, a maze game, billiards, car emergency braking tests, Among Us, Codenames, and survival games. Then 18 **unseen** benchmarks, never used during evolution, including NetHack, Crafter (a Minecraft-like game), Hanabi, heads-up poker, a science-discovery gym, a video understanding test, and two real robots (a Unitree G1 humanoid walking to a specific desk, and the cup task above).

**Headline results.**

| Measure | Starting harness | After 4 rounds |
| --- | --- | --- |
| Training benchmarks, average | about 39 | about 73 |
| Unseen benchmarks, average | about 42 | about 64 |

For reference, the paper reports Codex at about 47.5 and DeepSeek at about 46.2 on the unseen set. Two unseen tasks, Crafter and DiG-bench, stayed below both.

**Organizing by capability beat the alternatives.** After one round, using modules only: one global harness reached about 43 on unseen tasks, organizing by surface task category about 41, and the capability tree with simulated worlds about 47. The capability tree with simulated worlds was also the cheapest to run at test time.

**Modules and skills stack.** On unseen tasks, evolved modules alone gave about 47, short practice summaries (skills, explained below) alone about 49, both together about 54.

**Routing matters.** A random choice of harness scored about 46 on unseen tasks, the full router about 61, and a perfect "oracle" chooser about 64. So the router gets most of the available benefit.

**Relevant modules really are doing the work.** Adding an irrelevant module to the starting harness changed the score by about 1 point; adding a relevant one by about 19.

**Robots.** In simulation, the humanoid navigation task went from 0 to 80 percent success and the cup task from 10 to 60 percent. On the real robots, both went from 0 to 60 percent.

**Why it is convincing.** The model is frozen throughout, so every gain comes from the harness. And the transfer to 18 benchmarks the system never trained on, including physical robots, is the strongest kind of evidence that it learned reusable skills rather than test answers.

## Limitations

- **The unseen tests got a little practice.** Before scoring, the system ran five **preparation trials** on each unseen benchmark and turned those runs into short written tips ("skills") that were then frozen. A commenter on Hugging Face and a secondary write-up both flagged this: part of the "unseen" gain is adaptation to that specific test, not pure transfer. The module-only results (about 37 to 47 after one round) suggest real transfer exists, but the paper does not report a no-preparation column for the final system, or the cost of the preparation runs.
- **The paper's numbers do not quite agree.** The abstract claims about 26 points of gain on unseen tasks, but the figures in the body (42.1 to 64.1) work out to 22. The unseen starting score also appears as 37.45 in one table and 42.1 in another, without explanation.
- **Tiny robot samples.** Robot success rates move in 20 percent steps, which suggests five trials each. Sixty percent means roughly three out of five.
- **One model only.** Everything uses a single frozen backbone, Claude Opus 5. Whether the evolved harnesses help other models is untested (an earlier paper, Meta-Harness, did show harnesses transferring across models).
- **Expensive.** Building the practice worlds and evolving harnesses used hundreds of millions of tokens per round (about 406 million for the best setup's first round).
- **No safety discussion.** For a "recursive self-improvement" paper, it is notable that the paper does not address risks. Earlier self-improving agents have been caught gaming their scoring: Sakana's Darwin Gödel Machine faked a log saying tests had passed, and in another case removed the markers a hallucination detector relied on. The Trinity's host-run verifiers are a reasonable guard, but the paper does not test them against an agent trying to cheat.
- **Code not released yet.** The repository says "coming soon."

## Where this is today

### How it IS used

- **Harness engineering is now its own discipline.** "Agent = Model + Harness" is a common 2026 framing. Claude Code, for example, ships with a default harness (file tools, terminal access, a multi-step loop, permissions) that teams extend with MCP tool servers and CLAUDE.md instruction files. The LangChain jump from 30th to 5th on Terminal Bench 2.0 came entirely from harness changes. Today almost all of this is done by human engineers, which is what The Trinity aims to automate.
- **Automated harness search exists in research.** Stanford's Meta-Harness (March 2026, Chelsea Finn's group and others) has an agent read the code, scores, and logs of previous harnesses and propose better ones; a single discovered harness raised IMO-level math accuracy by 4.7 points across five different models. The Trinity's addition is organizing this by shared capability across very different, multimodal tasks.
- **Reusable "skills" are a mainstream product format.** The Trinity's "skills" (short written tips distilled from practice runs) closely resemble Agent Skills, the folder-plus-SKILL.md format Anthropic introduced in October 2025 and published as an open standard. By September 2026 over 40 clients reportedly supported it, including Claude, OpenAI Codex and ChatGPT, GitHub Copilot, Cursor, and VS Code. In products, humans mostly write these skills; The Trinity has the agent write them from its own experience.
- **Self-improving coding agents are the closest working ancestor.** Sakana's Darwin Gödel Machine (2025) rewrote its own agent code and went from 20 to 50 percent on SWE-bench, a benchmark of real GitHub bug fixes.

### How it ISN'T used (or not yet)

- **No shipping product runs this loop.** I could not find any product that lets an agent evolve its own harness modules unattended. The Trinity is three days old with no released code.
- **Per-task tuning and one-size-fits-all harnesses** are exactly what the paper argues against. In practice, though, most products still use one global harness per product plus hand-written skills.
- **Retraining the model for each new domain** is the expensive alternative this line of work avoids. Fine-tuning is still used, but harness and skill changes are faster, cheaper, and reversible.

### Lineage

ReAct agent loop (one model thinking and acting) -> hand-engineered harnesses (Claude Code, Codex, LangChain agents) plus hand-written skill files -> agents that rewrite their own code or harness (Darwin Gödel Machine, Meta-Harness) -> The Trinity: harness evolution organized by shared capability, with self-built practice worlds and a router -> what you are likely to see next: agent products that quietly write and test their own skills from your usage.

## Why it matters for Brendan

**Unstall.** A real estate chief of staff faces dozens of request types that look different but share capabilities: scheduling a showing, rescheduling around an inspection, and coordinating a closing all need "track the state of many moving parts." Prepping for a listing appointment, answering a buyer's question about a property, and drafting a counter-offer all need "check the evidence before committing." The paper's evidence that organizing by capability transfers better than organizing by request type is a concrete design argument for how to structure Unstall's internal modules and skills. Real2Sim2Real also suggests a practical move: build small fake practice scenarios (a mock calendar with conflicts, a fake MLS listing with a trap) to test Unstall's behavior before it touches a real agent's day.

**Arbor.** The router is a matching problem: given a job description, pick the best-fit configuration from a catalog, using track records and cost summaries, and commit before running. That is close to what an Arbor buyer agent does when picking a seller. Two specific ideas worth borrowing: requiring a stated rationale *before* the job runs (an auditable decision), and the strict "only accept an update if it beats the incumbent on the same tasks, budget, and trials" rule, which is a fair way to decide when a new seller should displace a trusted one.

**CoMinds.** The core claim, that matching by underlying capability beats matching by surface category, is the same bet CoMinds makes when it looks past a student's major to what they can actually do.

## Key terms

- **Harness**: the software around an AI model that controls what it sees, remembers, and does; the model is the engine, the harness is the rest of the car.
- **Capability tree**: a hierarchy grouping tasks by the underlying skills they require rather than by what they look like.
- **Real2Sim2Real**: start from real tasks, build simplified simulated practice versions, practice there, then test back on the real tasks.
- **Module**: a small reusable piece of harness code that fills one slot, such as perception, memory, or planning.
- **Recursive self-improvement (RSI)**: a system improving the very tools it uses to improve itself, round after round.
- **Router**: the component that picks which harness configuration to use for a new task.

## If you only have 10 more minutes

Read the introduction (especially the ARC-AGI-3 and Micromouse example of tasks sharing a capability) and look at Figure 3, which shows four tasks being abstracted into one practice world. Then look at Table 3 (global vs. task-category vs. capability-tree harnesses), which is the paper's central argument in one table. Skip the module-capability correlation heatmap and the full benchmark appendix.

## One question to think about

The Trinity only accepts a change if it measurably improves the score. That works when success is checkable, like solving a puzzle or finding a cube. For Unstall, "success" is a busy agent feeling more on top of their week. How would you turn that into something a verifier could check without the system learning to game the measure instead of actually helping?

## Sources

- [The Trinity: Capability-Driven Recursive Self-Improvement for Multimodal Agents (arXiv)](https://arxiv.org/abs/2610.36077)
- [The Trinity, full text (arXiv HTML)](https://arxiv.org/html/2610.36077)
- [The Trinity on Hugging Face Papers, with comment thread](https://huggingface.co/papers/2610.36077)
- [Hugging Face Daily Papers, October 28, 2026](https://huggingface.co/papers/date/2026-10-28)
- [The Trinity project page](https://trinity-rsi.github.io/)
- [The Trinity code repository (GitHub, "coming soon")](https://github.com/InfRec-Cardinal/The-Trinity)
- [The Trinity: Capability-Driven Self-Improving Agents (CCTest)](https://cctest.ai/en/articles/the-trinity-recursive-self-improvement-built-around-capabilities)
- [Trinity framework lifts multimodal agents 34 points on 28 tests (AI Weekly)](https://aiweekly.co/alerts/trinity-framework-lifts-multimodal-agents-34-points-on-28-tests)
- [Harness engineering: What makes AI coding agents work in 2026 (Faros)](https://www.faros.ai/blog/harness-engineering)
- [Meta-Harness: End-to-End Optimization of Model Harnesses (Hugging Face Papers)](https://huggingface.co/papers/2603.28052)
- [The Darwin Gödel Machine (Sakana AI)](https://sakana.ai/dgm/)
- [What Are Agent Skills? SKILL.md, Structure, and How They Work (Atlan)](https://atlan.com/know/ai-agent/ai-agent-skills/what-are-agent-skills/)
