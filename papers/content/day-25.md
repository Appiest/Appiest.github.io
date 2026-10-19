---
day: 25
title: "OpenGCUA: Toward a Fully Open Stack for Generalist Computer Use"
short_title: "OpenGCUA (agents that write code to use computers)"
authors: "Hanzhang Zhou, Long Li, Quyu Kong, Lei Wang, Panrong Tong, Yue Wang and others (Alibaba)"
year: 2026
link: "https://arxiv.org/abs/2610.22200"
track: "Frontier"
section: "Frontier"
tldr: "Instead of making an AI agent click through a computer one step at a time, let it write a small program that mixes clicks, typing, terminal commands and checks, and let the model itself decide when it needs to look at the screen: across eight frontier models this raised scores on a hard desktop benchmark by about 20 points and cut the number of steps roughly in half."
---

# Day 25: OpenGCUA: Toward a Fully Open Stack for Generalist Computer Use

Hanzhang Zhou, Long Li, Quyu Kong, Lei Wang, Panrong Tong (equal contribution), Yue Wang (corresponding author) and others, the MAI-UI team at Alibaba Group, submitted October 16, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.22200). Code: [github.com/Tongyi-MAI/OpenGCUA](https://github.com/Tongyi-MAI/OpenGCUA). Track: Frontier. It is one of the most-upvoted papers on Hugging Face's trending list this week (over 300 upvotes), released alongside a sister project from the same team, MAI-Gym, a training ground for these agents.

## TL;DR

The best way for an AI to operate a computer is not "look at a screenshot, click once, repeat" but "write a short program that clicks, types, runs commands, loops and checks its own work," with the model deciding when it actually needs to look; OpenGCUA opens up the full recipe for building agents like that and shows it helps every frontier model they tried, weak ones most of all.

## What it builds on

The Transformer (Day 9) and GPT-3 (Day 11) are the engines doing the thinking. CLIP (Day 15) started the line of models that can read images and text together, which is how an agent reads a screenshot. InstructGPT (Day 16) is why these models follow instructions at all, and chain-of-thought (Day 17) is the "reasoning tokens" this paper measures. The most direct ancestor is ReAct (Day 18): think, act, observe, repeat. OpenGCUA keeps that loop but makes each "act" a whole program instead of a single move. And yesterday's Jeva (Day 24) is a cousin in spirit: both papers argue that the default way we wire language models into software is wasteful, and that changing the shape of the interface beats making the model bigger.

## The world before this paper

A **computer-use agent** is an AI that operates a computer the way you do: it looks at the screen, moves the mouse, clicks and types. The classic design, popularized by products like Anthropic's computer use and OpenAI's Operator, is a loop: take a screenshot, send it to the model, the model picks one action ("click at x=412, y=88"), the action runs, take another screenshot, repeat. It works, but it is slow and fragile. A task a person does in five minutes can take a hundred or more of these round trips, each one a full model call with an image attached. Errors compound: if each step is 98% reliable, a 50-step task succeeds only about a third of the time. Meanwhile, a separate family of agents (coding agents like Claude Code) works almost entirely in the **terminal**, the text window where you type commands, which is fast and precise but cannot touch apps that only have buttons. Some systems combined the two, letting the model output a short fixed list of GUI and terminal actions per turn. But in all of these, the people building the **harness** (the scaffolding code around the model that decides what it sees and how its outputs get executed) hard-coded the important choices: always send a screenshot after every step, always one action at a time, always the same memory rules. On top of that, the strongest systems are closed, so researchers could not study which of those choices actually matter. That is the gap this paper goes after.

## Core ideas

### 1. A "generalist" agent makes three decisions every step

The paper's first move is a definition. A **generalist computer-use agent (GCUA)** is one where the model, not the harness, makes three decisions at every step:

1. **What to observe.** Do I need a screenshot right now? Or the **accessibility tree** (the hidden, text-based map of every button and field on screen that screen readers for blind users rely on)? Or just the text output of the last command? Or nothing?
2. **How to act.** Click? Type? Run a terminal command? Call an app's API? Or several of these at once?
3. **How to organize the work.** What is done so far, what is next, and what should I remember?

Seen this way, older agent designs are just special cases where some of these decisions were frozen in advance. A pure GUI agent has decision 2 frozen to "mouse and keyboard only" and decision 1 frozen to "screenshot every time." A pure terminal agent has decision 2 frozen the other way. The definition matters because it turns a pile of competing products into one design space you can measure.

**Analogy:** compare a new intern on a tightly scripted checklist ("after every click, take a photo and email it to me") with an experienced assistant who decides when to check in, which tool to use, and how to track progress. Same brain, very different efficiency. OpenGCUA is about handing those choices to the model.

### 2. Act by writing a program, not by clicking once

This is the heart of the paper. Instead of outputting one action, the model writes a short **program**, a few lines of Python, that can mix every kind of action:

- **GUI operations**: mouse moves, clicks and key presses, using a common Python library called PyAutoGUI.
- **Terminal commands**: through a `bash()` function.
- **Browser control**: through Playwright, a tool that drives web pages by their structure rather than by pixels.
- **Accessibility and API calls** where available.

And because it is a real program, it gets the things programs have: **variables** (remember a value), **loops** (do this seven times), and **conditionals** (if this, then that). After it runs, the model gets back what the program printed, any errors, and whether it succeeded, plus a screenshot only if it asked for one.

**Step by step, in a mental picture.** Say the task is "rename every PDF in the Downloads folder by date, then email the list to Sam."

- The old way: screenshot, open Finder, screenshot, click file 1, screenshot, press Enter, type a name, screenshot... dozens of model calls just for the renaming.
- The OpenGCUA way: one program uses a terminal command to list and rename all the files in a loop, prints the new names, then uses GUI actions to open the mail app and paste the list. One model call does what used to take thirty.

The authors studied how the strongest closed model they tested (GPT-6 Astra) actually uses this freedom and found five recurring patterns:

1. **Cross-interface composition**: alternate clicks with programmatic checks (click "Export," then check from the terminal that the file really appeared).
2. **Loops**: one program visits seven sections of a web page, checking each before moving on.
3. **Result-dependent execution**: compare a draft email with a saved copy and click Send only if they match.
4. **Observation preparation**: gather 25 views into a single **contact sheet** image so the model can look once instead of 25 times.
5. **Executable verification**: after finishing, run code that confirms the expected files changed and nothing else did.

The fourth one is quietly brilliant: the agent prepares its own evidence before looking, the way a photographer reviews a contact sheet instead of flipping through prints one at a time.

**Analogy:** the difference between giving someone directions turn by turn over the phone ("now left... now stop... what do you see?") and handing them a written route with "if the bridge is closed, take Elm Street." The second needs far fewer calls.

### 3. Move decisions from the harness into the model

The second big design choice has a mouthful of a name: **harness-to-model decision transfer**. Rules that used to be hard-coded in the scaffolding become choices the model makes:

- **On-demand observation**: no automatic screenshot after every step. The model asks for one when it needs it.
- **Task-state tracking**: the model keeps its own running notes on what is done and what is left, instead of the harness deciding what history to show it.
- **Stated intent**: before each program runs, the model writes one line saying what the program is for. That makes its behavior easier to follow and debug, for the model and for people.
- **Context policies**: rules for what old information to keep or drop, so long tasks do not drown the model in stale screenshots.

There is a hidden cost win here. AI providers offer **prompt caching**: if the start of what you send matches something you sent before, they reuse the earlier work and charge less. Forcing a fresh screenshot into every turn keeps changing the input and breaks the cache. Letting the model skip unneeded screenshots raised cache hit rates by about 10 to 14 percentage points for two models, with no drop in scores. Cheaper and just as good.

**Analogy:** a film director who stops demanding dailies after every single take and instead asks for footage when a scene needs checking. The crew moves faster, and the director still sees what matters.

### 4. One SDK for every device, and a harness for your real computer

The last contribution is the most preliminary but the most forward-looking. An **SDK** (software development kit, a ready-made set of functions programmers call) gives the agent one way to talk to computers, browsers and phones. Every action names exactly which device, app, window or tab it targets, so nothing lands in the wrong place. The paper's example: open a report in a phone app, copy the file to a laptop with `mu.files.copy`, then type the results into a web service in the laptop's browser, all inside one program.

They also built a **real-device harness**: a version that runs on a person's own Mac rather than inside a clean virtual machine. Real computers are messy in ways benchmarks ignore. You might be using the machine at the same time. The target app might be in a background window. Permissions pop up. The harness is described in five layers, from top to bottom:

1. **Model**: writes a program each step.
2. **Runtime and host**: a persistent Python session that runs programs and assembles what the model sees next.
3. **Device SDK**: the one API across computer, browser and phone.
4. **Driver**: turns SDK calls into real operating-system actions, with rules about how and when to deliver them.
5. **Real apps and OS**: the actual source of truth, subject to whatever permissions you grant.

**Mental picture:** layers 1 to 3 are the brain and its vocabulary; layers 4 and 5 are the hands and the world. Keeping them separate means the same agent brain could, in principle, drive a Mac today and a phone tomorrow.

## What they showed

**The test.** The main benchmark is **OSWorld-v2**, a set of long, realistic desktop workflows (think "build this spreadsheet from these three files and email it") run inside virtual machines. They used an 82-task "offline" subset that skips tasks needing the live internet, so results do not depend on websites changing. Each task gets a **partial score** from 0 to 100 (credit for how much of the job was done right), and they counted how many steps each task took.

**The headline.** They ran eight frontier models, closed and open, under the old setup (GUI actions sent in batches) and under the full OpenGCUA setup. Every single model improved:

| Model | Score before → after | Steps per task before → after |
|---|---|---|
| GPT-6 Astra | 67.1 → 75.7 | 102 → 34 |
| Claude Opus 5 | 60.7 → 70.1 | 103 → 61 |
| Gemini 3.8 Flash | 50.1 → 67.0 | 167 → 101 |
| Qwen3.8-Max | 46.9 → 64.0 | 128 → 57 |
| Kimi K3 | 40.7 → 59.2 | 160 → 82 |
| Qwen3.8-Flash | 38.9 → 60.5 | 232 → 86 |
| GLM-5.3-Flash | 29.6 → 64.9 | 191 → 76 |
| DeepSeek-V4.1-Flash | 28.0 → 57.7 | 167 → 85 |

On average: **+19.6 points** and **53% fewer steps**.

**Why it is surprising.** Look at the bottom of the table. The weakest models gained the most: GLM-5.3-Flash more than doubled, from 29.6 to 64.9. The gap between the best and worst model shrank by more than half. In other words, a lot of what looked like "this model is dumb at computers" was actually "this model is being forced to use the computer in a clumsy way." The interface was hiding ability.

**Is it just the terminal access?** A fair objection: maybe the gain comes from letting the model use the terminal at all, not from writing programs. They tested that. Compared with a setup that already had GUI plus terminal actions in a fixed list, real code execution still added **+6.1 points** and cut steps by **about 15%**. For one model (Qwen3.8-Max) the progression was clean: one GUI action per turn scored 50.9, batched GUI 46.9 (batching alone actually hurt), GUI plus terminal 57.2, and code execution 62.4. So the form of acting, programs with logic, matters on its own.

**The real-computer reality check.** On four real macOS tasks, the open model Qwen3.8-Max used **19.4 times** as many reasoning tokens as GPT-6 Astra (5.7 times as many output tokens overall) and still finished fewer tasks. The authors trace it to over-thinking simple operations, trouble adapting to messy real conditions, and weaker coding. That is a useful, honest finding: the open models are catching up on benchmarks, but on real machines the efficiency gap is still huge.

## Limitations

- **No trained model yet.** This release is a recipe and a toolkit, not a new AI. All results use existing models plugged into the new harness. A trained OpenGCUA model is "planned for the next release," with no date.
- **Small real-world test.** The real-device evidence is four macOS tasks. That is a demo, not proof.
- **One benchmark subset.** 82 offline tasks from OSWorld-v2. Tasks that touch the live internet, which is a lot of real work, were excluded.
- **Self-checking is not checking.** The agent writing code to verify its own work is helpful, but the authors stress it does not replace independent evaluation. An agent can write a check that passes for the wrong reason.
- **Safety and permissions are open questions.** An agent that can run terminal commands on your actual computer can also delete things, send things, or buy things. The harness respects OS permissions, but the paper is mostly about capability, not about guardrails.
- **Numbers are the authors' own.** Coverage so far repeats their figures; no independent replication yet.

## Where this is today

### How it IS used

- **Computer-use agents are a real product category.** Anthropic's Claude computer use, OpenAI's Operator, Perplexity Computer and Google's Computer Use (in preview with Gemini) all operate screens on a user's behalf. On the standard OSWorld-Verified benchmark, top agents now score above the published human baseline of about 72%, and on the harder OSWorld 2.0 the best vendor-reported partial score is around 82%, though full end-to-end completion is still under 50%. OpenGCUA's ideas are aimed squarely at that remaining gap.
- **"Let the agent write code" is already winning elsewhere.** The idea of code as the action, rather than one tool call at a time, goes back to the 2024 paper CodeAct ("Executable Code Actions Elicit Better LLM Agents"). In November 2025 Anthropic's engineering team published "Code execution with MCP," arguing agents should call tools by writing code, with one example dropping from about 150,000 tokens to about 2,000. OpenGCUA extends the same idea from tools and APIs to the screen itself.
- **Practitioners already recommend the hybrid.** Industry write-ups on running computer-use agents in production say to use APIs or scripts wherever they exist and fall back to clicking only for legacy apps and portals you do not control. OpenGCUA formalizes that advice and puts it inside a single program.
- **Open source you can use.** The code, prompts, trajectories from all eight models, and the preliminary harness and SDK are released on GitHub. Its sister project MAI-Gym (also released) lets teams train agents in thousands of mocked, resettable copies of apps; the team reports a 9-billion-parameter model scoring 76.2% on OSWorld-Verified, and that practice on a mock train-ticketing app raised success on the real app on a physical phone from 28.8% to 48.1%.

### How it ISN'T used

- **Screenshot-every-step is on its way out**, at least as the only mode. It still exists in products because it is simple and works with any app, but its cost and slowness are the main complaint about computer-use agents today.
- **Fixed, harness-decided action lists are being superseded.** The paper's own data shows batching GUI actions without logic can even hurt (46.9 vs 50.9 for one model).
- **Pure GUI agents for apps with good APIs** do not make sense at scale. When a clean API exists, calling it is faster and more reliable than clicking, and almost every guide says so.
- **Real-device, cross-device agents are not mainstream yet.** The phone-plus-laptop-in-one-program vision is preliminary here and in industry. I could not find a widely used product that does it reliably today.

### Lineage

ReAct's think-act-observe loop (2022) -> screenshot-and-click computer-use agents (2024 to 2025) -> CodeAct and "code execution with MCP" (agents write code to call tools) -> OpenGCUA (agents write code that mixes clicks, commands and checks, and decide for themselves when to look) -> what you will likely use next: assistants that operate your actual devices in a few big, verified moves instead of hundreds of tiny ones.

## Why it matters for Brendan

**Unstall.** A chief of staff for real estate agents has to work inside tools that often have no clean API: MLS portals, brokerage CRMs, e-signature sites, county record searches, a phone full of texts. That is exactly the "GUI for the gaps, code where you can" world this paper is about. Two design lessons transfer directly. First, give your agent the ability to do a whole chunk ("pull every showing request from today, check each against the calendar, draft replies only for conflicts") in one verified program instead of narrating every click, which cuts cost and the compounding-error problem. Second, the result-dependent pattern ("compare the draft with the saved copy, send only if they match") is the kind of built-in checkpoint you want before an agent sends anything to a client. And the cross-device SDK idea, one program spanning phone and laptop, is basically Unstall's daily reality: realtors live on their phones, but the paperwork lives on a computer.

**Arbor.** If agents are going to bid for and perform tasks in a marketplace, the 19.4x token gap on the same real tasks is a pricing warning: two agents can "do the same job" at wildly different costs and success rates. A protocol that prices by verified outcome rather than by effort, and that can ask the agent for its own executable verification as part of delivery, lines up well with what this paper shows agents can already produce.

## Key terms

- **Computer-use agent**: an AI that operates a computer through its screen, mouse and keyboard, like a person would.
- **Harness**: the scaffolding code around a model that decides what it sees, runs its actions, and manages its memory.
- **Accessibility tree**: the hidden text map of every button, field and label on screen, built for screen readers and readable by agents.
- **Code execution (as an action)**: the model writes a small program, with loops and if-statements, instead of choosing a single click or command.
- **Harness-to-model decision transfer**: moving fixed rules (like "screenshot after every step") out of the scaffolding and letting the model decide.
- **Prompt caching**: a provider reusing work on an input that starts the same as a previous one, making repeated calls cheaper and faster.

## If you only have 10 more minutes

Read the section with the five code-execution patterns and its case studies. It is the most concrete part of the paper and shows what "an agent that writes programs to use a computer" looks like in practice. Then glance at Table 2 (the eight models, before and after). Skip the formal definitions section if you have read this brief, and skip the real-device harness architecture unless you are building one; it is preliminary and short on detail.

## One question to think about

If the same model jumps from 30 to 65 just by changing how it is allowed to act, how much of what we call an AI's "intelligence" is really the quality of the interface we give it, and what would the best possible interface for Unstall's agent look like?

## Sources

- [OpenGCUA: Toward a Fully Open Stack for Generalist Computer Use (arXiv)](https://arxiv.org/abs/2610.22200)
- [OpenGCUA full text (arXiv HTML)](https://arxiv.org/html/2610.22200v1)
- [OpenGCUA code (GitHub, Tongyi-MAI)](https://github.com/Tongyi-MAI/OpenGCUA)
- [Trending papers (Hugging Face)](https://huggingface.co/papers/trending)
- [Alibaba Tongyi-MAI releases OpenGCUA and MAI-Gym (AICoder)](https://aicoder.com/news/news-20261017-alibaba-tongyi-mai-opengcua-mai-gym-computer-use)
- [OSWorld leaderboard 2026: OSWorld-Verified and 2.0 (Presenc)](https://presenc.ai/research/osworld-computer-use-leaderboard-2026)
- [Computer use agents in production: reliability and cost (Contra Collective)](https://contracollective.com/blog/computer-use-agents-production-reliability-cost-2026)
- [Code execution with MCP (Anthropic Engineering)](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Executable Code Actions Elicit Better LLM Agents, CodeAct (arXiv)](https://arxiv.org/abs/2402.01030)
