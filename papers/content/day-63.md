---
day: 63
title: "Don't Sleep, Keep Watch: Proactive Perception for Computer-Use Agents"
short_title: "NightWatch (a tiny watcher that tells a slow AI agent when the screen changed)"
authors: "Jiaqi Su, Jie-Jing Shao, Yichen Liu, Long-Kai Huang and Haiyan Yin (NUS, A*STAR CFAR, SenseTime, HKBU)"
year: 2026
link: "https://arxiv.org/abs/2611.28947"
track: "Frontier"
section: "Frontier"
tldr: "AI agents that use a computer look at the screen like a flipbook, one screenshot, think for seconds, act, sleep, so they act on screens that have already changed and wait on screens that were ready long ago; NightWatch adds a tiny 0.8B-parameter watcher that keeps its eyes on the live screen and can cancel the big model's thinking, block a stale click, or wake it early, cutting wasted time on OSWorld by about half with success on par."
---

# Day 63: Don't Sleep, Keep Watch: Proactive Perception for Computer-Use Agents

Jiaqi Su (National University of Singapore), Jie-Jing Shao (A*STAR Centre for Frontier AI Research), Yichen Liu (SenseTime), Long-Kai Huang (Hong Kong Baptist University) and Haiyan Yin (A*STAR CFAR). Listed as published November 21, 2026. [Read the paper](https://arxiv.org/abs/2611.28947). [Project page](https://sujq0722.github.io/NightWatch/). Track: Frontier.

A note on how this brief was made: arXiv was rate-limiting today, so I could not read the full paper text directly. This brief is built from the abstract, the authors' project page, their GitHub README, the released model card on Hugging Face, and an extracted copy of the paper's method and results text. Where an exact number lives only in a table image I could not read, I say so instead of guessing.

## TL;DR

A computer-use agent is a big, slow AI that sees the screen in snapshots, so it keeps clicking on things that moved and sleeping through pages that already loaded; NightWatch pairs it with a tiny, fast "watcher" model that never chooses actions but decides **when** the big model should look again, and that alone cuts wasted time on the OSWorld benchmark by 53% and raises success on a dynamic web benchmark from 39.5% to 44.2%.

## What it builds on

From the foundations track: **ReAct (Day 18)** is the think, act, observe loop every computer-use agent runs, and this paper is about the "observe" part of that loop. **CLIP (Day 15)** and the vision-language models after it are what let an AI read a screenshot at all. From the frontier track: **OpenGCUA (Day 25)** was your introduction to computer-use agents, and **Jeva (Day 24)** introduced "System 1" decision models, small fast models that pick an answer instead of writing one. NightWatch's watcher is exactly that kind of model, used as the agent's reflexes. **StreamVibe (Day 37)** made video agents proactive about a user's changing intent; NightWatch makes a desktop agent proactive about a changing screen.

## The world before this paper

A computer-use agent controls a real computer the way you do: it looks at the screen, decides what to click or type, does it, and looks again. Today's agents run that loop on their own clock: take a screenshot, think (often for several seconds), act, then **sleep for a fixed delay** so the app has time to respond, then take the next screenshot. On a static page that works. On a real, live screen it fails in two opposite ways. First, while the model is thinking, the screen keeps changing: a pop-up appears, a page finishes loading, a button shifts down because an ad loaded above it. The model then acts on a picture that is already out of date. Second, the fixed sleep is a guess: often the page was ready in half a second and the agent sits idle for three, and sometimes the page isn't ready and the agent looks too early. The authors call this mismatch the **perception-action gap**. An earlier fix, AOI (June 2026), captured extra keyframes and audio between steps and fed them to the big model, which helped a lot on accuracy but made every call bigger and more expensive.

## Core ideas

**Some terms first.**

- A **computer-use agent** is an AI that operates software through the screen, keyboard and mouse, like a person would, instead of through a programming interface.
- A **VLM** (vision-language model) is an AI that can read images and text together. The agent's "brain" is a large VLM.
- **Latency** is delay: how long between asking a model something and getting its answer. Big VLMs have seconds of latency per step.
- **System 1 and System 2** are borrowed from psychology: System 1 is fast, automatic reflexes; System 2 is slow, deliberate reasoning.
- **Parameters** are the adjustable numbers inside a model; roughly, its size. 0.8B means 800 million, which is tiny by today's standards (frontier models are hundreds of billions or more).

### 1. Split the agent into a slow thinker and a fast watcher

**What it is.** NightWatch doesn't touch the big model at all. Same model, same prompt, same set of actions. Instead it adds a second, tiny model that watches the screen continuously, the way your peripheral vision does while you're concentrating on something else. The big model is System 2: it plans and chooses every action. The watcher is System 1: it **never chooses an action**. Its only job is to decide when the big model's view of the world has gone stale.

**How it's wired.** The only engineering change on the big model's side is that its response is **streamed and cancellable**: the harness (the software wrapped around the model that runs the loop) can stop it mid-thought. The watcher runs locally, with no API calls, and it doesn't look at every frame: a cheap pixel check fires it only when the screen changes noticeably, plus an occasional check during static loading screens so it can notice when loading is done.

**Analogy.** A film director and a script supervisor. The director (big model) is deep in thought about the next shot. The script supervisor (watcher) isn't making creative decisions, but they're watching the set, and they'll tap the director's shoulder: "the actor just changed jackets," "that prop got moved," "lighting's ready, you can roll now."

### 2. Three interventions: interrupt, void, wake

The watcher turns what it sees into exactly three kinds of action, each tied to a moment in the loop.

1. **Interrupt (while the big model is thinking).** If something important appears (a dialog box, an error, a new page), the watcher cancels the big model's current reasoning and the step restarts from the fresh screen. No point finishing a plan for a screen that no longer exists.
2. **Void (just before an action fires).** The big model has decided "click the Submit button at this spot." Right before the click is sent, the watcher checks: is the target still there, unchanged and uncovered? If the button moved or a pop-up is now on top of it, the pending action is **thrown away** instead of clicking the wrong thing.
3. **Wake (after the action runs).** Instead of a fixed sleep, the watcher estimates when the screen has truly **settled** and wakes the big model right then. Not just "pixels stopped moving," which can be fooled by a page that pauses mid-load, but a learned judgment that this stillness is final.

**Worked example.** The paper's demo task (from the OSWorld benchmark): open a terminal, run the `ls` command in the home folder, and save a screenshot of the result to the Desktop. Partway through, a file window is still drawing while the vanilla agent is reasoning about the half-drawn screen. Without NightWatch, the agent plans around a picture that's already wrong. With it, the watcher sees the window finish opening, interrupts the stale reasoning, and the agent re-plans on the real screen. Across three runs each, NightWatch solved this task 3 out of 3 times, the plain agent 1 of 3, and the two competing methods (AOI and another baseline called PUSV) 0 of 3 and 1 of 3.

### 3. Ask the screen a fixed list of yes-or-no questions

**What it is.** How does a 0.8B model make these calls reliably? It doesn't write text or reason in words. It answers a **fixed question bank** in one pass, giving a probability for each question. The questions fall into four groups: change and stability ("has the screen settled?"), unexpected events ("did a dialog appear?"), target validity ("is the click target still present? has it changed?"), and action effects (did the last action do something?).

**How it works, step by step.**

1. The watcher is given a short text description of what the agent is doing and what action is pending, plus up to four images: the screenshot the agent last saw, a recent frame, the current frame, and a close-up crop of the region that changed.
2. It reads all of that once and outputs a probability for every question (for example: dialog appeared, 0.97; target present, 0.12).
3. Simple **fixed thresholds** turn probabilities into actions. If "dialog appeared" is above the line during reasoning, interrupt. If "target present" falls below the line before a click, void. If "settled" crosses the line after an action, wake.

Because the rules are fixed, the probabilities need to be **calibrated**, meaning a 0.9 should really mean "right about 90% of the time." The authors train with a scoring term (the Brier score) that specifically rewards honest probabilities, then do a final calibration adjustment.

**Analogy.** A pilot's pre-flight checklist. You don't ask the co-pilot "how do things look?" and wait for an essay. You run down a fixed list and get a quick yes or no on each item. That's faster, and it makes the decision rule obvious.

The watcher itself is a fine-tuned version of a small "decision model" built on Qwen3.5-0.8B (Alibaba's open model family), trained cheaply with a technique called LoRA that only adjusts a small slice of its weights. The authors describe it as a "Jev-style" System-1 model, which reads as a nod to the Jeva approach from Day 24.

### 4. Train the watcher on fake apps and hindsight, never on the test

**What it is.** To learn "has this screen settled?" you need lots of labeled examples of screens mid-change. The authors generated them:

- **360 generated desktop tasks** across the same ten apps OSWorld uses, but with no shared tasks and no instructions close to OSWorld's (they checked text similarity), so the watcher can't have memorized the test.
- **SynthWeb**, procedurally generated web pages where the truth is known exactly, because the generator itself put in the pop-up, the toast notification, the loading spinner, the layout shift or the button that enables after a delay.
- **Hindsight labels** for settledness: record the screen, and afterward mark a moment as "settled" if nothing changed for the next second. You can't know that in the moment, but you can know it in the recording, which makes it a clean teaching signal.
- **Teacher labels** from a larger decision model for the remaining questions.

The decision points come from real runs of the unmodified agent: moments during reasoning, right before a click, and at various delays after an action. So the watcher learns on exactly the kinds of moments it will face.

**Analogy.** Teaching a lifeguard with video replays: you know, after the fact, which swimmers turned out fine and which needed help, so you can train their eye on clear examples before they ever sit in the chair.

## What they showed

**Benchmarks.** **OSWorld-Verified**, the standard test of real desktop tasks inside a virtual machine (100 tasks, 3 runs each), and **DynaCU-Bench**, a benchmark of dynamic web tasks (pop-ups, loading, moving content) introduced by the AOI paper (49 tasks here, 3 runs each). Main agent: MiMo-V2.6-Flash, also tested with Qwen3.8-27B. Everyone got the same screenshot-only input, prompt, actions and step budget.

**Headline results.**

| Measure | Result |
| --- | --- |
| OSWorld non-reasoning time (time the loop spends not thinking) | about **33% less** |
| OSWorld wasted time (idle, too-early looks, stale actions) | about **53% less** |
| OSWorld task success | **on par** with the plain agent; matches the best pass@3 |
| DynaCU-Bench success (large agent) | **39.5% to 44.2%** |
| Agent API cost | within a few percent of plain; AOI costs **37% to 52% more** |

(The exact OSWorld success percentages are in a table image I couldn't read, so I'm reporting the authors' wording.)

**The ablations are the convincing part.** Turn off any one of the three interventions and success drops and tasks slow down. Removing **interrupt** hurts most. Removing **void** makes mismatched actions (clicking something that's no longer what the agent thought it was) jump from **3.6% to 15.9%** of actions, more than four times as many. Wake fires on about half of all steps, and replacing it with a simple "pixels stopped moving" rule is slower.

**The surprise.** The 0.8B watcher beat both a hosted Jeva-style watcher API and a decision model **more than 30 times its size** on success, total time and non-reasoning time. Small and local wins because speed is the whole point: a watcher that takes a second to answer is already looking at the past.

**Why it matters.** Most agent research tries to make the big model smarter. This shows a meaningful chunk of failure and wasted time comes from **timing**, and you can fix it without touching the big model and without paying more for it.

## Limitations

- **Success didn't jump on OSWorld.** The big win there is speed and fewer wasted steps; task success is "on par." The accuracy gain shows up on the dynamic web benchmark, which is where the problem is sharpest.
- **AOI still wins on raw accuracy in its own setting.** AOI reported gains of 17 to 48 percentage points on DynaCU-Bench by giving the big model much more to look at. NightWatch's trade is cheaper and faster, not strictly better at everything. The two ideas could be combined.
- **The watcher can't see what isn't on screen.** No audio, no background state. It only knows pixels and the pending action.
- **Fixed thresholds.** The cutoffs are hand-set, not learned per app. A weird app with constant animation could fool the settledness check (the training includes "ambient motion" to fight this, but it's a real risk).
- **Early release.** The code repo has one commit; an integration with the Hermes agent framework is listed as coming. The paper's own limitations section was not in the text I could read, so this list is my assessment.

## Where this is today

### How it IS used

- **Computer-use agents are mainstream products, and they all run the flipbook loop.** Anthropic's Claude computer use (in the API since October 2024, and in Claude's own apps and Chrome extension), Google's Gemini 2.5 Computer Use model (October 2025) and OpenAI's computer-using agents all work by taking screenshots and returning actions. An AI wiki tracking the field describes this "flipbook" character as the core perception limit and lists OSWorld scores climbing from about 15% in late 2024 to the high 70s in 2026, around the human baseline of 72%. In other words, the agents are now smart enough that **timing and speed**, not intelligence, is a big part of what's left. That's the gap NightWatch targets.
- **NightWatch itself is open.** Code (Apache-2.0), the 0.8B watcher model and the training data are public on GitHub and Hugging Face. It's a research release, not yet in a named product.
- **AOI, its main rival, is also open** (Pine AI and the University of Washington, MIT-licensed code), along with the DynaCU-Bench benchmark both papers use.

### How it ISN'T used

- **Fixed sleeps are still the default.** I found no major product that publicly describes a learned watcher deciding when to re-look. Products typically rely on fixed waits, screenshot loops and, in browsers, page signals like "page finished loading."
- **"Use the page's code instead of pixels" is the other road.** Many browser agents read the page structure (the DOM) directly, which avoids some of this problem on the web but doesn't exist for arbitrary desktop apps. NightWatch works on pure pixels, so it applies anywhere.
- **Streaming video perception is emerging but not standard.** Feeding a big model continuous video is expensive; NightWatch's bet is that you don't need the big model to watch, only a small one.

### Lineage

ReAct's think, act, observe loop (2022) -> screenshot-based computer-use agents (Claude computer use, 2024; OpenAI and Google, 2025) -> richer observation between steps (AOI, June 2026) -> a cheap System-1 watcher that controls the big model's timing (NightWatch, November 2026) -> what you'll likely use: agents that feel like they're paying attention, reacting the moment a page loads instead of a few awkward seconds later.

## Why it matters for Brendan

**Unstall.** A voice-first chief of staff for real estate agents will eventually have to operate software that has no clean API: an MLS portal, a transaction-management site, a showing scheduler. That's exactly the dynamic, pop-up-heavy web NightWatch targets. Two lessons carry over directly. First, **speed is a product feature**: a voice assistant that sits silent for ten seconds feels broken, and half of an agent's slowness can be timing, not thinking. Second, the **void** idea is a safety feature you'd want for anything consequential: right before submitting an offer or sending a document, check that the button you're about to press is still the button you think it is.

**Amelia.** The architecture is the same shape as a live conversation-memory system: a big, slow model that understands, plus a small, fast, always-on model that only answers narrow questions ("did a new speaker start?", "did the topic just change?", "is this a good moment to surface a memory?") and decides when to wake the big one. NightWatch is a clean, measured example of that pattern, including the trick of training the small model on **hindsight labels** from recordings, which you could do with conversation transcripts.

## Key terms

- **Computer-use agent**: an AI that operates a computer through the screen, keyboard and mouse.
- **Perception-action gap**: the screen changing between when the agent looked and when it acts.
- **System 1 watcher**: a small, fast model that makes narrow decisions instead of writing text; here, it decides when the big model should look again.
- **Interrupt, void, wake**: cancel stale thinking, discard a stale click, and replace fixed sleeps with "the screen is ready now."
- **Hindsight label**: a training label you can only know after the fact, like "nothing changed for the next second, so this moment was settled."
- **Calibration**: a model's probabilities matching reality, so 0.9 really means about 90%.

## If you only have 10 more minutes

Watch the four-agent comparison video on the [project page](https://sujq0722.github.io/NightWatch/) (a minute, and it makes the whole idea obvious), then read the paper's **method section on the three interventions** and the **ablation results on DynaCU-Bench**, especially the void result. Skip the training-objective details and the control-scheme comparison tables.

## One question to think about

NightWatch's watcher never decides what to do, only when to pay attention. In Unstall or Amelia, what is the "when to pay attention" decision, and what would be the cost of getting it wrong in each direction: interrupting too often, or sleeping through the moment that mattered?

## Sources

- [Don't Sleep, Keep Watch (arXiv 2611.28947)](https://arxiv.org/abs/2611.28947)
- [NightWatch project page](https://sujq0722.github.io/NightWatch/)
- [NightWatch code on GitHub](https://github.com/SuJQ0722/NightWatch)
- [NightWatch-0.8B model card](https://huggingface.co/nullptr04/NightWatch-0.8B)
- [HyperAI summary of the paper](https://hyper.ai/en/papers/2611.28947)
- [Trendoday: Hugging Face Daily Papers, Nov 25, 2026](https://trendoday.com/hugging-face/papers/2026/11/25)
- [Agent-Computer Observation Interfaces (AOI) overview](https://www.alphaxiv.org/overview/2606.29472)
- [AOI and DynaCU-Bench code](https://github.com/19PINE-AI/aoi)
- [AI Wiki: Computer-use agent](https://aiwiki.ai/wiki/computer-use_agent)
