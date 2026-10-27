---
day: 33
title: "StreamVibe: Proactive Video Agents for Evolving User Intent"
short_title: "StreamVibe (an AI that watches and knows when to speak up)"
authors: "Chengzhi Liu, Yuxiang Lai, Yuzhe Yang, Yanqing Liu, Jiheng Hou, Yue Cao, Haonan Wang, Ruixi Fan, Lan Wang, Sheng Liu, Songyou Peng, Yale Song, Kevin Qinghong Lin, Xin Eric Wang, Jui-Hsin Lai, Youbao Tang (Google, UC Santa Barbara, Emory, UC Santa Cruz, Columbia, Stanford, Oxford)"
year: 2026
link: "https://arxiv.org/abs/2610.34662"
track: "Frontier"
section: "Frontier"
tldr: "StreamVibe teaches a video AI to watch a live stream (your kitchen, your screen) and decide on its own when to help, even when you only said \"keep an eye on this\" or changed your mind halfway through, by training it on when to stay silent and giving it a notebook that tracks what you currently want."
---

# Day 33: StreamVibe: Proactive Video Agents for Evolving User Intent

Chengzhi Liu, Yuxiang Lai, Yuzhe Yang and 13 others. Google, with UC Santa Barbara, Emory, UC Santa Cruz, Columbia, Stanford and Oxford. Posted to arXiv on October 26, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.34662). Track: Frontier.

A note on why this paper: it was the second most upvoted paper on Hugging Face Daily Papers for October 27, it comes from a Google-led team, and it tackles the exact problem behind Amelia and Unstall: an assistant that is always listening or watching has to decide, every second, whether to talk. I read the full paper (the arXiv HTML version, including the appendix) for this brief, so the numbers come from the paper itself.

## TL;DR

An always-on AI assistant is only useful if it speaks at the right moment about what you want right now, so this paper builds a test for that, trains a small open video model to be good at it (mostly by learning when to stay quiet), and adds a structured "intent notebook" around the model that cuts its unnecessary interruptions dramatically.

## What it builds on

The Transformer (Day 9) and GPT-3 (Day 11) are the foundation of the language model inside. CLIP (Day 15) began the line of models that connect images and words, which grew into today's vision-language models. InstructGPT (Day 16) introduced training a model with rewards for good behavior; StreamVibe uses a newer reward method in the same family. ReAct (Day 18) is the ancestor of "observe, think, act, repeat" agents. Whisper (Day 19) is the speech side of the same always-on assistant dream. Among frontier days, it connects to Day 23 (Cortex) and Day 28 (MemoryTax) on agent memory, and Day 30 (VISAGENT) on live voice agents.

## The world before this paper

Most AI assistants are **reactive**: you ask, they answer. Researchers have spent two years building **streaming video models**, which watch a live feed instead of a finished clip, and some can already speak up on their own. But they were almost all tested on **explicit** requests like "tell me when the water boils," where the trigger is spelled out. Real help is messier. You say "help me not mess this up," which never names a trigger. You change your mind ("actually, use less sugar"). And something the assistant said five minutes ago might now be wrong because you already did it. Existing models kept long histories but did not keep an up-to-date picture of what you still want, so they repeated themselves, answered stale requests, or missed the moment. Consumer products show the same problem: Engadget's review of Halliday's "proactive AI" glasses said it was "just a constantly-running chatbot which treats everything as a prompt," even trying to respond to "ums."

## Core ideas

### 1. A test for "when should I speak, and about what?"

**What it is.** **StreamVibe-Bench**, a benchmark (a standard test set) with 4,100 test videos totaling 183 hours, averaging about 8 minutes each, plus a separate 85,000-example training set.

**How it works.** Each video is a real task, either **physical** (cooking, assembling a shelf, making coffee, filmed first-person) or **digital** (screen recordings of someone using GIMP, Filmora, or a shopping app). Each comes with a user request and a set of **help points**: moments where a good assistant should say something, each with a time window and a reference answer. There are 20,546 help points in all. The requests come in three levels of difficulty:

- **Level 1, Explicit (600 videos).** "Let me know when the water starts boiling." The trigger is named.
- **Level 2, Implicit (2,000 videos).** "Help me keep an eye on this dish." The assistant must figure out what counts as worth saying, across four types: guidance, teaching, monitoring, and helping with a software tool.
- **Level 3, Dynamic (1,500 videos).** The request changes mid-task in one of three ways: **revision** (change a goal: "actually, make it spicier"), **composition** (add a goal while keeping the old one: "also tell me when it's time to flip"), or **interruption** (a quick side question while the main task continues).

Gemini drafted the help points, then four human reviewers checked every video, and a video stayed only if all four approved.

**Two ways of grading.** This is subtle and important.
- **Pointwise:** the model is dropped at a single moment, given a perfect history, and asked "speak or stay silent, and if you speak, what?" It tests one decision in isolation.
- **Trajectory:** the model runs through the whole video on its own, living with its own earlier mistakes. This is what a real product experiences.

Scores track **timing** (precision: of the times it spoke, how many were right; recall: of the moments it should have spoken, how many it caught; and **false positive rate**, how often it spoke when it should not have) and **content** (Claude Sonnet 4.6 graded each answer from 0 to 4).

**Analogy.** It is like testing a stage manager. Pointwise asks, "Here is the script and this exact moment; do you call the cue?" Trajectory asks them to run the whole show live, where one missed cue throws off everything after it.

### 2. Training a model to know when to keep quiet

**What it is.** **StreamVibe-VL**, a small open **vision-language model** (an AI that takes in images or video plus text and writes text). It watches video at one frame per second, and at every step it outputs a decision: wait, or speak, followed by what to say.

**How it works, in two stages.**

1. **Supervised fine-tuning (SFT).** Fine-tuning means taking an existing trained model and training it further on examples of the behavior you want. Here: 70,000 task examples plus 768,000 general streaming-video examples. The catch is that "wait" is the right answer almost all the time, so a naive model learns to never speak, or (if overcorrected) to speak constantly. The authors use **adaptive weighting**: the training automatically rebalances how much each "wait" or "speak" decision counts, based on how common each is in the current batch of training data, so neither habit dominates.

2. **Reinforcement learning (RL) on short clips around help points.** RL means the model tries things and gets a score (a **reward**) instead of being shown the right answer. Grading a whole 8-minute run with one score makes it hard to tell which decision earned it (researchers call this the **credit assignment** problem). So they cut short windows around each help point and score those. The reward multiplies a timing score (did you speak inside the window?) by a content score (was it right?), subtracts for missed help points and extra chatter, and adds a smaller score for whether the run as a whole was coherent and not repetitive. The specific algorithm, **GRPO**, has the model try several versions of the same moment and rewards the ones that beat the group's average.

**Analogy.** SFT is a new assistant shadowing a great one and copying them. RL is that assistant running small practice scenes and getting notes: "right moment, wrong words," "too early," "you already said that."

**What it does in practice.** SFT made the model notice more opportunities (higher recall) but also interrupt more. RL made it pickier: in full runs on implicit tasks, its false positive rate dropped to about 1.5 percent, while open models built for single questions were firing falsely 15 to 26 percent of the time.

### 3. The Harness: an intent notebook around the model

**What it is.** **StreamVibe-Harness**, software wrapped around the model (an **agent harness** is the code that manages an AI's memory, tools, and context). The key choice: the model still makes every speak-or-wait decision, but the harness keeps the facts straight.

**How it works.** The harness keeps three things:

- **The intent list.** Each request you have made is its own record with a status: waiting for evidence, evidence found, answered, or cancelled. A one-time question closes once answered. A standing request ("tell me whenever the pan smokes") stays open after each alert. Saying "never mind that" retires it. Crucially, an AI suggestion is never treated as proof that you actually did the step.
- **Task progress.** What has actually been observed happening, up to the last 8 completed steps.
- **What it already said.** So it does not repeat itself.

It also keeps a **hierarchical memory**, meaning memory at several levels of detail:
- **Recent:** the raw last ~32 seconds of video.
- **Mid-term:** short written summaries of each 32-second chunk (produced by a second, smaller off-the-shelf model, Qwen3-VL-4B), noting object states, on-screen text, and what changed.
- **Long-term:** older summaries merged into compact blocks; the oldest drop off first.

Before each decision, the harness looks up the few most relevant memories (up to 3 facts and 3 "what changed" events), ranked by simple keyword overlap with your current request and by recency. No fancy search model. It packs those, plus your active intents, into a short text block it hands the model along with the latest frames.

**Analogy.** A producer's call sheet next to the director. The director (the model) still decides when to yell "cut," but the call sheet says which scenes are still owed, which notes were already given, and what the studio changed this morning.

### Walkthrough: browning butter

This is an illustrative example built from the paper's described process, loosely based on one of its case studies; the dialogue is made up.

1. **You say:** "Help me brown this butter without burning it." (Implicit: no trigger named.)
2. **Harness:** registers intent A, "prevent scorching," status: waiting for evidence.
3. **0:00 to 1:30:** butter melts. The model sees nothing worth saying and keeps choosing "wait." Each 32 seconds, the small model writes a summary: "butter fully melted, foaming, pale yellow."
4. **1:50:** foam subsides, specks turn tan. The model speaks: "It's starting to brown. Keep swirling, you're close." Harness logs it.
5. **2:05:** you say, "Actually, I want it a bit darker for the cookies." Harness revises intent A from "golden" to "darker, nutty," instead of piling on a second, contradictory goal.
6. **2:25:** specks are deep brown. The model, seeing the revised intent, speaks: "That's the darker color you wanted. Pull it off the heat now." Harness marks intent A complete.
7. **2:40:** no more talking, even though butter is still on screen, because the harness shows nothing is still owed.

A model without the harness is the one that says "it's browning!" again at 2:30, or stops at "golden" because it forgot your revision.

## What they showed

**Single decisions with a perfect history (pointwise).** On implicit requests, StreamVibe-VL's content score (61.3) beat Gemini 3.1 Pro (52.3) and GPT-Realtime-2.1 (39.3), and trailed only Gemini 3.8 Flash (66.9), which is also the model that drafted the benchmark's answers. It beat every open model of similar size. Its answer-quality score on implicit tasks (85.1) was higher than every baseline, including Gemini 3.8 Flash (82.6).

**Whole runs on its own (trajectory).** This is the sobering part. Every model's scores collapse when it has to live with its own history. On implicit tasks, content scores were:

| Model | Content F1 (implicit, full run) | False positive rate |
| --- | --- | --- |
| Qwen3-VL-8B (open, not built for streaming) | 2.9 | 26.5% |
| JoyAI-VL-Interaction (open) | 3.7 | 18.9% |
| MMDuet2 (best open streaming model) | 16.5 | 4.1% |
| StreamVibe-VL, SFT only | 13.9 | 3.8% |
| StreamVibe-VL, SFT + RL | 19.1 | 1.5% |

StreamVibe won in all three intent types in full runs, but the absolute numbers are low for everyone. The big proprietary models were only tested pointwise, not in full runs.

**What breaks.** Implicit and dynamic requests are much harder than explicit ones. Models that catch more help points also fire more falsely. And timing gets steadily worse the longer a video runs; for revisions specifically, recall drops late in the video, meaning models forget that you changed your mind.

**The harness matters most for interruptions.** On an outside timing benchmark, adding the harness to the RL model raised timing F1 from 39.9 to 59.4 and cut false positives from 44.9 percent to 6.8 percent. The abstract summarizes the harness's overall gain on proactive interaction as 12.3 percent, and the model's gain over baselines as 10.7 percent. The gains were biggest on dynamic intents, which is what you would expect from a notebook that tracks changes.

**It did not get dumber.** The trained model scored higher than its starting model on four standard video-understanding tests, so learning to wait did not cost general skill.

## Limitations

- **The absolute numbers are low.** Even the best full-run content scores are under 20 out of 100. This is a clearly better research system, not a solved product.
- **No sound.** The model watches frames at one per second and reads your requests as text. It never hears tone, a sizzle, or a sigh. The paper does not discuss speech or response latency at all.
- **Gemini graded its own homework, partly.** Gemini 3.8 Flash drafted the help points and reference answers, and it is also the top scorer in single-decision tests. Four-way human review helps, but the bias risk is real, and most authors are at Google.
- **The appendix tables are confusing.** In version 1, the detailed with-and-without-harness table on the main benchmark has rows that do not line up cleanly with the main results table. The headline harness gains are easier to trust on the outside benchmark.
- **The harness is hand-built.** Memory search is keyword overlap, with ten fixed "skills" (monitor hazards, next-step guidance, and so on). It works, but it is engineering, not learned behavior.
- **Single user, single task.** No multiple people, no conversations between people, no switching between unrelated tasks.
- **No code or model release** is mentioned. The project page is listed as stream-vibe.github.io.

## Where this is today

### How it IS used

- **Live camera assistants are shipping, but reactive.** Google's Gemini Live lets you point your phone camera or share your screen and talk about what it sees; it grew out of the Project Astra research prototype, which promised "proactive responses." As of mid-2026, a review of Gemini on glasses described its features as user-triggered, with continuous background vision still a future item. StreamVibe is Google-adjacent research on exactly that missing step.
- **Meta's Live AI** on Ray-Ban Meta glasses (rolled out from December 2024) allows a continuous conversation with live video, without repeating "Hey Meta," but you still drive it.
- **Proactive glasses from smaller companies** try to speak first. Even Realities' glasses advertise "proactive AI prompts from dialogue analysis" once you start their Conversate mode. Halliday shipped "proactive AI" and Engadget found it responded to everything, including filler words. That is precisely the false-positive problem this paper measures and attacks.
- **The research line is crowded.** The paper compares against seven earlier proactive benchmarks and five open streaming models (including VideoLLM-Online from 2024 and MMDuet2), and cites agent memory systems such as Mem0. StreamVibe is the first to combine implicit and changing intents with full-run testing.

### How it ISN'T used (or not yet)

- **"Treat everything as a prompt"** (an AI that answers every utterance) is what early proactive products did, and it is failing in reviews. The replacement direction is a separate "should I speak?" decision trained with penalties for chatter.
- **Just keeping a longer history** is not enough. The paper shows models with long context still answer stale or superseded requests. The direction is structured state (intent lists with statuses) on top of raw memory.
- **StreamVibe itself** is not in any product I could find. Treat it as research.

### Lineage

Reactive chatbots (GPT-3, InstructGPT) -> streaming video models that speak on explicit triggers (VideoLLM-Online, 2024) -> StreamVibe (implicit and changing intents, trained silence, an intent notebook) -> what you will likely see next: glasses and phone assistants that stay quiet by default and interrupt only when they are confident it matters to what you want right now.

## Why it matters for Brendan

**Amelia.** This is the clearest blueprint yet for Amelia's hardest product question: when does a live memory assistant whisper something, and when does it shut up? Three directly usable ideas: give each request its own lifecycle record (open, matched, delivered, retired), never count the assistant's own suggestion as proof something happened, and log what was already said so it never repeats. Their three-level memory (raw recent, 32-second summaries, merged long-term blocks) is a reasonable starting design for per-person conversation memory, and the per-intent records map naturally onto per-person records. Also note the gap: they ignore audio entirely, which is where Amelia lives.

**Unstall.** A chief of staff for real estate agents gets mostly implicit and dynamic requests: "keep me on track with the Hendersons," then "actually push their showing to Thursday." The paper's revision, composition, and interruption categories are a ready-made test plan: write 20 realistic agent days with mid-day changes and score whether Unstall follows the latest instruction without dropping old ones. And measure false positives, not just helpfulness; that is what makes users turn an assistant off.

**AR/XR.** If you build anything for glasses, this paper's result is the key design constraint: unnecessary interruptions are the product killer, and a trained "wait" decision plus explicit state cut them sharply.

## Key terms

- **Proactive assistant**: an AI that decides on its own when to say something, instead of only answering when asked.
- **Implicit intent**: a goal the user states loosely ("help me not mess this up") without naming when the AI should speak.
- **False positive rate**: how often the AI speaks when it should have stayed silent.
- **Pointwise versus trajectory evaluation**: grading one decision with a perfect history, versus grading a full run where the model lives with its own earlier choices.
- **Agent harness**: the software around an AI model that manages its memory, state, and context.
- **GRPO**: a reinforcement learning method where the model tries several answers to the same situation and is rewarded for those that beat the group average.

## If you only have 10 more minutes

Read Section 3.2 (the three intent levels, one page with examples) and Section 4.1 plus Appendix C.2 (how the harness tracks each intent's lifecycle); together they are the design you would copy. Then look at Figure 7 and the case studies in Appendix D.2 (browning butter, assembling a shelf, editing in Filmora) to see the failure modes in pictures. Skip the reward equations and the long per-tolerance results tables.

## One question to think about

The paper treats every unnecessary interruption as a failure. But a human chief of staff sometimes speaks up about something you never asked for ("you have not eaten since breakfast"). How would you decide, and measure, when an unrequested interruption is welcome, and should the user be able to set that threshold per person or per situation?

## Sources

- [StreamVibe: Proactive Video Agents for Evolving User Intent (arXiv)](https://arxiv.org/abs/2610.34662)
- [StreamVibe on Hugging Face Papers](https://huggingface.co/papers/2610.34662)
- [Hugging Face Daily Papers](https://huggingface.co/papers)
- [What is Project Astra? Gemini Live, Android XR, and everything else you need to know (Android Central)](https://www.androidcentral.com/apps-software/ai/project-astra)
- [Gemini Glasses AI: Google Gemini in Smart Glasses, Project Astra, and Wearable AI in 2026 (TransferLLM)](https://transferllm.com/blog/gemini-glasses-ai-google-gemini-in-smart-glasses-project-astra-and-wearable-ai-in-2026/)
- [Meta Adds 'Live AI' To Ray-Ban Smart Glasses (Silicon UK)](https://silicon.co.uk/cloud/ai/meta-ray-ban-ai-593050)
- [AI Glasses with ChatGPT and Auto Real-time Prompts (Even Realities)](https://www.evenrealities.com/ai-glasses)
- [Halliday Glasses review: Ambitious smart glasses with frustrating flaws (Engadget)](https://www.engadget.com/wearables/halliday-glasses-review-ambitious-smart-glasses-with-frustrating-flaws-130000207.html)
