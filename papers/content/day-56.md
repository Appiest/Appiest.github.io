---
day: 56
title: "Gamer: A Generalist Vision-Language-Action Foundation Model for Long-Horizon Real-Time Game Agent"
short_title: "Gamer (an AI that plays games live, through the screen, keyboard and mouse)"
authors: "Run Luo, Kuan Zhang, Qi Deng, Yukun Chen and others (miHoYo Honkai AI R&D Team, with several universities)"
year: 2026
link: "https://arxiv.org/abs/2611.18397"
track: "Frontier"
section: "Frontier"
tldr: "miHoYo, the studio behind Genshin Impact and Honkai: Star Rail, trained an open AI agent that watches the screen and presses keys and moves the mouse in real time, thinks only at key moments, writes itself progress notes when its memory fills up, and learns from its own attempts; it beats far bigger general-purpose AI models at live play, mainly because those models collapse when the game doesn't pause for them."
---

# Day 56: Gamer: A Generalist Vision-Language-Action Foundation Model for Long-Horizon Real-Time Game Agent

Run Luo, Kuan Zhang, Qi Deng, Yukun Chen and about two dozen others from the miHoYo Honkai AI R&D Team (the studio behind Genshin Impact and Honkai: Star Rail), with several university collaborators. Posted to arXiv November 13, 2026. [Read the paper](https://arxiv.org/abs/2611.18397). Track: Frontier.

This brief is built from the paper's full HTML version, its project page and code repository, plus current pages on other game-playing agents. It was one of the most upvoted papers on Hugging Face Daily Papers this week.

## TL;DR

The hard part of an AI that uses software like a person is not being smart, it's being smart *on time*: the best general-purpose AI models lose roughly 17 to 35 points when a game keeps running while they think, and Gamer wins by being trained for that pressure (react fast, think rarely, take notes, learn from practice) and by a serving engine that cuts its reaction time from 1.3 seconds to 65 milliseconds.

## What it builds on

From the foundations track: **DQN (Day 6)** was the first AI to learn games from raw screen pixels; Gamer is its grown-up version, playing modern 3D games with a language model inside. It uses the **Transformer (Day 9)**, **GPT-3 (Day 11)**-style large-scale pretraining, and a vision-language backbone in the spirit of **CLIP (Day 15)**. Its "think only when needed" behavior is a descendant of **Chain-of-Thought (Day 17)**, and its loop of think, act, observe is **ReAct (Day 18)** running 5 times a second. Learning from its own attempts comes from the **RLHF (Day 16)** family, and its overall shape, "pixels and instructions in, motor commands out," is the **RT-2 (Day 21)** recipe applied to a keyboard and mouse instead of a robot arm. On the frontier track it sits beside **OpenGCUA (Day 25)** and **CoworkOS (Day 43)** (agents using computers), **ScaleVLA (Day 55)** (the robot version of the same idea), and **MemoryTax (Day 28)** (when memory is worth it).

## The world before this paper

There were two kinds of game-playing AI, and neither was good enough. The first kind, like DQN and DeepMind's AlphaStar, was superhuman at one game but useless at any other, and often got special access to the game's internals. The second kind used big general AI models (the GPT, Claude and Gemini family) as "computer-use agents": take a screenshot, think, choose a click, take another screenshot. That works for filling in a web form, which waits for you. It fails in a live 3D game, which does not: by the time the model has finished reasoning, the enemy has moved and the jump is missed. Earlier specialist game agents (ByteDance's Game-TARS, DeepMind's SIMA 2, NVIDIA's NitroGen, Lumine) made progress, but the paper's comparison table notes that most were either not real-time, not trained with reinforcement learning, or not open-source. Nobody had put all of it together in one open system: real-time control, long tasks lasting many minutes, memory, and learning from practice.

## Core ideas

### 1. Act like a player: screen in, keyboard and mouse out, 30 times a second

**What it is.** Gamer is a **VLA (vision-language-action model)**: an AI that takes in images and text and outputs actions. Here the images are screenshots, the text is the task ("finish the side quest Bestial Ferocity"), and the actions are raw keyboard and mouse input. No game API, no access to the game's code or hidden state. It sees exactly what a human sees.

**How it works, step by step.**

1. Five times a second (every 200 milliseconds), it grabs a screenshot. It also keeps the last 20 frames as short-term visual context.
2. The model, built on top of Alibaba's open Qwen vision-language models (an 8-billion-parameter version and a 35-billion one), reads the frames, the task and its notes.
3. It writes out its action as a short line of text, like `X Y Z ; g1 ; g2 ; g3 ; g4 ; g5 ; g6`. X and Y are how far to move the mouse, Z is scroll, and g1 to g6 are six tiny 33-millisecond slices saying which keys are held down in each.
4. The game executes those six slices, and the loop repeats.

So one decision every 200 milliseconds gets turned into six control updates, giving roughly **30 actions per second**, like a human's continuous movement rather than a robot's stop-and-go clicks. Notice there's no special "action head" bolted on (compare ScaleVLA yesterday, which used a separate motion module): the action is just more text the language model writes.

**Two clever training tricks.**

- **Random key remapping.** During training, they randomly shuffle which keys do what ("jump" might be Space in one clip, F in another). This forces the model to learn *what an action does* rather than memorizing "press Space." Like learning to drive by renting a different car every week: you learn driving, not one dashboard.
- **Repeat-aware loss decay.** Holding W to walk forward produces hundreds of identical "W is down" steps, which would drown out the rare, important moments (starting, stopping, turning). They give less training weight to each repeated step, so the model pays attention to *changes*.

**Analogy.** A traditional AI agent is like a chess player mailing in moves. Gamer is like a racing driver: hands on the wheel, small corrections constantly.

### 2. Think only at decision points ("sparse thinking")

**What it is.** Since Chain-of-Thought (Day 17), we know AI models do better when they "think out loud" before answering. But thinking costs time, and at 5 decisions per second there isn't time to write a paragraph before every step.

**How it works.** The model itself decides, at each step, whether to think first. On routine steps (keep running down this corridor) it outputs the action immediately. At important moments (a fork in the road, a new target, a new on-screen prompt, a task switch) it writes a short `<think>` note first ("The door is locked; the key was on the table in the previous room; go back") and then acts. There's no separate "router" deciding this. It's learned behavior, trained from about 1.2 million human-written-style thinking annotations attached to roughly 1,000 hours of curated Honkai: Star Rail gameplay.

**Analogy.** An experienced driver doesn't consciously think about every steering adjustment. They think at intersections. Gamer is trained to have intersections.

### 3. Write yourself notes before you forget ("memory compaction")

**The problem.** An AI model has a **context window**: a limit on how much it can "see" at once, like a desk that only holds so many papers. A 20-minute quest at 5 screenshots per second overflows it fast.

**How it works.**

1. When the context is about to fill up, the same model writes a **memory summary**: completed objectives, failed attempts, important locations, resources, and the remaining plan.
2. Older raw history is then thrown away, and the summary stays. If even the summaries overflow, the oldest summaries go first.
3. Recent steps are kept in full detail.

Again, there's no separate memory system. Writing a note is just another thing the model outputs, in the same stream as its thoughts and actions. The training data included about 223,000 example notes, roughly one every 16 seconds of play.

**A nice engineering detail.** Models keep a working cache of what they've already read (the **KV cache**, short for key-value cache), so they don't reread everything at every step. Normally, deleting old history would force a full reread. Gamer's engine keeps the cache for what remains and just renumbers its positions, saving a large amount of compute.

**Analogy.** A film editor on a long project doesn't keep every take in their head. At the end of each day they write a log: "Scene 12 done, scene 14 needs a reshoot because of lighting, still need B-roll of the market." Tomorrow they work from the log plus today's footage.

### 4. Learn from practice, in real time (TA-GRPO)

After learning by imitation, Gamer practices. It plays tasks many times and improves from the results, which is **reinforcement learning (RL)**: learning by trial and reward.

**How it works.**

1. Run the same task 8 times in parallel (32 live game instances at once, on 64 data-center GPUs).
2. A checker reads the real game state and scores how far each attempt got. No AI judge, no guessing: the game itself says "milestone reached" or not. The agent never sees this hidden state; only the trainer does.
3. Because long tasks are split by the memory notes into segments, they compare *segments that reached the same stage*: "of the 8 attempts at this part of the quest, which went better than average?"
4. Better-than-average segments are reinforced, worse ones discouraged. Within a segment, later actions get a bit more of the credit, on the assumption that actions closer to the result mattered more. The authors are careful to say this is a rule of thumb, not proof.

This is a variant of **GRPO (Group Relative Policy Optimization)**, the "try several times, compare to the group average" method popularized by DeepSeek. The "TA" means **temporal-aware**, for the timing-based credit.

**The key insight: practice at real speed.** They compared practicing with the real-time engine against a slow setup running at 0.6 frames per second. The real-time version learned faster on all eight navigation tasks, while several slow runs collapsed late in training. If you practice in slow motion, you learn habits that fail at full speed.

### 5. The engine that makes it fast (Streaming-vLLM)

A model that takes 1.3 seconds per decision can't play a live game. The team built a serving system they call Streaming-vLLM (built on vLLM, a popular open-source tool for running AI models) with several tricks:

- **Keep each player's cache warm** between turns instead of starting fresh each time.
- **Predict the boring parts.** The action format is rigid (numbers, semicolons, key names), so a simple rule-based guesser proposes the structural tokens and the model only has to confirm them. This is **speculative decoding**: a cheap guesser drafts, the real model checks.
- **Send actions early.** As soon as the first 33-millisecond key slice is confirmed, it's sent to the game, even before the rest of the line is written.

Result: request time dropped from **1,306 ms to 65 ms**, a 20 times speedup, on an NVIDIA H200 GPU with the 35-billion-parameter model.

## What they showed

**Live versus paused play (the headline result).** They tested on four public game benchmarks (Minecraft tasks, the classic shooter Doom, and two multi-game suites) under two conditions: the game pauses while the AI thinks, or it keeps running.

- Top general-purpose models from OpenAI, Anthropic, DeepSeek and others lost **17 to 35 points on average** when the game kept running. One OpenAI model dropped from about 82% to 9% on the Minecraft tasks.
- Gamer's 35B model scored **31.5 on average, the highest**, and was the only model that did *better* live than paused (+3.4 points). The best general model scored about 17.6 live.
- Caveat: on one benchmark (GameWorld) the big general models still scored higher than Gamer. Gamer's lead comes mostly from Minecraft-style and action-heavy tests.

**Long quests in Honkai: Star Rail** (held-out side quests, scored as the share of 30 or 55 checkpoints reached, not full completion):

| Model | Quest 1 | Quest 2 |
| --- | --- | --- |
| Base Qwen model, no game training | 0% | 13.9% |
| Gamer after pretraining | 34.4% | 47.9% |
| Gamer after instruction tuning | 72.2% | 69.1% |
| Gamer after practice (RL) | **80.0%** | **83.6%** |
| Best general-purpose model | 23.3% | 45.5% |

**Puzzles and minigames** (40 new instances across seven types): Gamer after practice **49.7%**, versus 17.1% for the best general model. Practice alone took one navigation puzzle from 50% to 95.8%.

**What does more data buy? (GameScaling.)** In a companion study (120 training runs, models from 0.8 to 27 billion parameters, 50 to 1,600 hours of gameplay), more gameplay reliably helped on the games trained on and similar ones. But for *very different* unseen games, more data gave essentially **no further improvement**. That's an honest and important negative result.

**Why it's convincing.** Real commercial games, scoring based on the true game state, a clear stage-by-stage improvement (pretrain, then tune, then practice), and the live-versus-paused comparison exposes a weakness of today's general agents that most benchmarks hide.

## Limitations

- **Not truly general yet.** The Star Rail tests use new quests in a game it trained on heavily. The authors' own scaling study shows gains don't carry to distant, unfamiliar games.
- **Not "beating" a game.** Quest scores measure checkpoints reached across runs, not uninterrupted completion.
- **Ingredients aren't separated.** The paper doesn't isolate how much each piece (sparse thinking, memory notes, TA-GRPO) contributes. The live-versus-slow practice comparison also changes more than one thing at once.
- **Expensive.** Practice used 64 H200 GPUs, and serving the fast version still needs data-center hardware. The authors say serving cost is a real limitation.
- **Shallow thinking.** They note tasks that need deep deliberation may hit a ceiling, and suggest a two-level design (a slow planner plus a fast actor) as future work.
- **Partly open.** Code is Apache-2.0 and some checkpoints are on Hugging Face, but the Star Rail data and any models trained on it are withheld, and the fast Streaming-vLLM engine is listed as "coming soon."
- **Fair-play concerns.** An agent that plays through the normal screen and controls is also, in principle, an undetectable bot. The authors explicitly say they don't endorse cheating.

## Where this is today

### How it IS used

- **Game agents are a busy research race.** Google DeepMind's SIMA 2 (powered by Gemini) plays games like No Man's Sky and Valheim through the normal screen and controls, and DeepMind announced a research partnership with the makers of EVE Online in August 2026. NVIDIA's NitroGen (open weights on Hugging Face, CVPR 2026) was trained on 40,000 hours of gameplay video. Tencent's PLAYER-1 (October 2026) uses a similar "pretrain, then practice in synthetic games" approach. Gamer is the first of these from a major game *studio*, and it is open-source.
- **Automated game testing is the nearest real use.** NetEase's Titan agent tested two commercial online RPGs, completed 95% of assigned tasks and found four previously unknown bugs (reported September 2025). Amazon Web Services publishes a guide to building game-testing agents. Gamer's own page lists game testing and accessibility as intended uses. I could not confirm whether miHoYo uses Gamer internally for testing.
- **The same pattern runs through computer-use agents.** "Screenshot in, keyboard and mouse out" is how today's computer-use agents from the major labs operate. Gamer's contribution is showing what changes when the screen won't wait.

### How it ISN'T used

- **Not in shipped games as a player or companion.** DeepMind's post describes AI companions and adaptive non-player characters as possibilities, not deployments. The only live feature it mentions is a Gemini-based help assistant in EVE Online, which answers questions rather than playing.
- **"Pause and think" agents are falling short for anything live.** This paper's main evidence is that general-purpose models used in screenshot-by-screenshot mode lose much of their skill in real time. The direction is moving toward specialized fast models (like Gamer) or two-level designs where a big model plans and a small one acts.
- **Single-game superhuman bots (AlphaStar, OpenAI Five) were not productized.** They were research milestones that didn't transfer. The field has moved to generalist agents that use human interfaces.

### Lineage

DQN (2015, one Atari game from pixels) -> AlphaStar and OpenAI Five (superhuman at one game) -> SIMA, Game-TARS, NitroGen (one agent, many games, human controls) -> Gamer (real-time, memory, practice, open) -> likely next: fast "actor" models paired with slow "planner" models, used first for game testing.

## Why it matters for Brendan

**Unstall and Amelia: real time changes everything.** The paper's sharpest lesson is that an AI that's excellent when the world waits can be poor when it doesn't. A phone call with a real estate agent, or a live conversation Amelia is tracking, is a world that doesn't pause. Gamer's recipe maps over directly: respond immediately on routine turns, "think" only at decision points (a new request, a conflict in the schedule, a speaker change), and start sending output before the full answer is finished. When you test Unstall, test it live with realistic timing, not turn-by-turn, because this paper shows the two can give very different scores.

**Your memory startups: notes, not transcripts.** Gamer's memory is not a recording of everything. It's a self-written log of what's done, what failed and what's next, written by the same model right before older detail is dropped. That's a practical template for long Unstall sessions: keep recent conversation in full, compress older parts into structured notes (decisions made, open loops, what didn't work). Note that Gamer's memory is about *task progress*, not about *people*, so for relationship memory it's a useful pattern, not a full answer.

**Arbor: the cost of no API.** Gamer shows how much engineering it takes for an agent to operate through a human interface: data-center GPUs and a 20 times speedup just to keep up. That's an argument for what Arbor is building. When agents can talk through a proper protocol instead of pretending to be humans clicking on screens, a huge amount of cost disappears.

## Key terms

- **VLA (vision-language-action model)**: an AI that takes images and text in and outputs actions; here, keyboard and mouse input.
- **Sparse thinking**: the model decides for itself when to reason before acting, and skips reasoning on routine steps.
- **Context window**: how much an AI model can "see" at once; long tasks overflow it unless something is summarized or dropped.
- **Memory compaction**: replacing old detailed history with a short self-written summary so the model can keep going.
- **GRPO (Group Relative Policy Optimization)**: try a task several times, score each attempt, and push the model toward attempts that beat the group average.
- **Speculative decoding**: a cheap guesser drafts the next few output tokens and the real model just checks them, which is much faster.

## If you only have 10 more minutes

Read the **Introduction** and the **comparison table** that lines Gamer up against Game-TARS, Lumine and SIMA 2. Then go straight to the **benchmark table with real-time versus time-paused scores** in the experiments section: the numbers in parentheses are the whole story. Skim the **memory compaction section** if you want ideas for Unstall. Skip the GameScaling curve-fitting details, the RL math, and the inference kernel appendix.

## One question to think about

If the best "smart" AI models fall apart when the world won't wait for them, should the next generation of assistants be one big model, or a fast "reflex" model that handles the moment plus a slow "thinker" it consults only at decision points, and what would that split look like in a voice assistant you'd actually trust on a live call?

## Sources

- [Gamer (arXiv 2611.18397)](https://arxiv.org/abs/2611.18397)
- [Gamer full paper (arXiv HTML)](https://arxiv.org/html/2611.18397v1)
- [Gamer on Hugging Face Daily Papers](https://huggingface.co/papers/2611.18397)
- [Gamer summary on alphaXiv](https://www.alphaxiv.org/abs/2611.18397)
- [Gamer project page](https://mihoyo-gamer.github.io/)
- [Gamer code repository](https://github.com/RainBowLuoCS/Gamer)
- [Google DeepMind: Exploring new frontiers of AI and games research (SIMA 2, EVE Online)](https://deepmind.google/blog/from-atari-to-eve-online-building-on-15-years-of-ai-research-in-games/)
- [SIMA 2: A Generalist Embodied Agent for Virtual Worlds](https://arxiv.org/pdf/2512.04797)
- [NitroGen: An Open Foundation Model for Generalist Gaming Agents (CVPR 2026)](https://openaccess.thecvf.com/content/CVPR2026/html/Magne_NitroGen_An_Open_Foundation_Model_for_Generalist_Gaming_Agents_CVPR_2026_paper.html)
- [NitroGen model on Hugging Face](https://huggingface.co/nvidia/NitroGen)
- [Lumine: An Open Recipe for Building Generalist Agents in 3D Open Worlds](https://arxiv.org/html/2511.08892v1)
- [PLAYER-1: Learning to Play from Synthetic Experience (Tencent)](https://arxiv.org/pdf/2610.20584)
- [Decrypt: New Study Shows AI Outpaces Humans in Game Testing (NetEase Titan)](https://decrypt.co/342085/study-ai-outpaces-humans-game-testing)
- [AWS for Games: Building an AI game testing agent with Amazon Bedrock](https://aws.amazon.com/blogs/gametech/building-an-ai-game-testing-agent-with-amazon-bedrock/)
