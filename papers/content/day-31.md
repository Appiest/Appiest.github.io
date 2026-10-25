---
day: 31
title: "Agentic World Action Models"
short_title: "AW-0 (a robot that writes a plan as code, imagines it, then acts)"
authors: "Zhuoyang Liu, Dantong Niu, Botong Zhang and others, with Ken Goldberg, Yuke Zhu, Linxi \"Jim\" Fan and Trevor Darrell (UC Berkeley, NVIDIA, UPenn)"
year: 2026
link: "https://arxiv.org/abs/2610.30136"
track: "Frontier"
section: "Frontier"
tldr: "AW-0 is one robot model that, in a single quarter-second pass, writes a short program for what it is about to do, imagines a video of doing it, and outputs the motor commands, and making the code come first raised its real-world score from 46 to 71 out of 100 versus the best rival."
---

# Day 31: Agentic World Action Models

Zhuoyang Liu, Dantong Niu, Botong Zhang, Boning Shao, Jing Wang, Ruijie Zheng, Yuvan Sharma, Runyu Lu, Jiaming Liu, Renrui Zhang, Roei Herzig, Yutong Bai, Ken Goldberg, Danfei Xu, Yuke Zhu, Guanzhi Wang, Linxi "Jim" Fan and Trevor Darrell. UC Berkeley, NVIDIA and the University of Pennsylvania. Posted to arXiv on October 21, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.30136). Track: Frontier.

A note on why this paper: it is one of the most talked-about robotics papers of the week, from a heavyweight group (Trevor Darrell's lab at Berkeley plus Jim Fan's robotics group at NVIDIA). It also sits exactly where three of your interests meet: agents that write code, generative video, and robotics. A note on accuracy: I worked from the arXiv abstract, the official project page and a detailed paper summary. The arXiv PDF itself was rate-limited during this run, so a few training details (noted below) are left out rather than guessed.

## TL;DR

The best robot brains may not choose between "think in words and code" and "imagine the future in video": AW-0 does both at once, and letting the code plan steer the imagination and the hands is what makes it work.

## What it builds on

RT-2 (Day 21) is the direct parent: it showed a web-trained vision-language model could output robot actions, the recipe now called a VLA. Day 27 (GPT-6-Astra as a robot brain) asked whether frontier chat models can already act as robot brains. Diffusion (Day 12) is the engine that generates the video and the actions. The Transformer (Day 9) is the backbone of all three parts. ReAct (Day 18) is the ancestor of the "write a plan, then call tools" habit that the code stream borrows. And Day 22 (ATAS) is a cousin: a video generator that keeps track of an explicit world state instead of just pixels.

## The world before this paper

By 2026, robot foundation models had split into two camps. **VLAs** (vision-language-action models) start from a model that understands images and text, then learn to output motor commands. They are good at following instructions but have no built-in sense of physics. **World action models (WAMs)** start from a video generator, which already "knows" how things move, fall and fold, and teach it to output actions alongside its predicted video. NVIDIA's DreamZero is the best known; in spring 2026 it topped a public robot leaderboard. But WAMs think in pixels, so they struggle with multi-step tasks where you need to remember "I've done step 2, now step 3," and they cannot reuse a skill learned in one task inside another. A third, older tradition, **code as policies** (having a language model write a short program that calls robot functions like `pick` and `place`), is great at structure and reuse but blind to physics: the program says "fold the towel" with no idea how cloth actually behaves. Each camp had what the others lacked.

## Core ideas

### 1. Three streams in one model: code, video, action

**What it is.** AW-0 produces three outputs together, for each short slice of a task:

- **Code**: a few lines of Python calling named skills, like `fold_edge_over(robot, 'blanket', ...)`.
- **Video**: a short predicted clip of what the scene will look like if the robot does this.
- **Action**: an **action chunk**, a short burst of low-level motor commands (joint positions for the next fraction of a second).

**How it works.** The model is a **mixture of transformers**: three specialist sub-networks ("experts") that each handle one stream but can look at each other's work through attention (Day 9's mechanism for one part of a model to read another). Each expert starts from an existing pretrained model rather than from scratch:

1. The **code expert** is built on LLaDA, a language model that writes text by diffusion rather than word by word, plus a frozen image encoder from Qwen3-VL so it can see the scene.
2. The **video expert** is NVIDIA's Cosmos-Predict2.5, a video generator trained to predict how the physical world unfolds.
3. The **action expert** is a smaller diffusion transformer that outputs motor commands.

**Analogy.** Think of a film crew shooting a stunt. The director writes the shot list (code), the storyboard artist sketches each frame (video), and the stunt coordinator works out exactly how the performer's body moves (action). They work in the same room, looking at each other's pages, and finish together.

### 2. The order of who listens to whom: code first

**What it is.** Inside each expert, every piece can see every other piece. Across experts, the attention is one-way in a fixed order: **code, then video, then action**. The video expert can read the code, and the action expert can read both, but not the reverse.

**Why it matters.** This is the paper's most important finding. The plan shapes what the model imagines, and the plan plus the imagined future shape what the hands do. When the authors flipped the order to video first, then code, then action, the real-world score fell from 71.1 to 48.3. With no code at all (video then action, which is basically a standard WAM), it fell to 32.9.

**Mental picture.** On the "arrange fruits" task, the code-first model scored 91.7. Video-first scored 31.3, and no-code scored 27.1. Without a written plan, the model's imagination drifts: it can picture a plausible next moment, but not the right next step.

**Even the comments help.** Removing the comments from the generated code dropped the score to 62.8, and replacing skill calls with plain-English subgoals ("now put the apple in the bowl") gave 63.6. Structured code with explanations beat both. Code is a more precise language for plans than English.

### 3. Generating all three at once (joint denoising)

**What it is.** **Denoising** is how diffusion models create things (Day 12): start with random noise and clean it up over many small steps until a picture, or here a video and an action sequence, appears. For text, the equivalent is **masked diffusion**: start with every word blanked out and fill blanks in over several rounds.

**How it works.** AW-0 runs all three cleanup processes in lockstep. At every step, the code gets a few more words filled in, while the video and actions get a little less noisy. Because they progress together, each stream refines in light of the others' current draft.

**Why do it this way?** Speed. The obvious alternative is **autoregressive**: write the full program, then generate the video, then the actions, one after another. That took 0.55 seconds per decision on a single high-end consumer GPU (an RTX 5090). Joint denoising took 0.23 seconds, 2.4 times faster, and it also scored higher (71.1 versus 54.5). For a robot, a quarter second per decision is the difference between smooth motion and visible hesitation. Dropping code entirely only saves another 0.04 seconds.

**Analogy.** Instead of a writer finishing the script before the artist starts sketching, they draft side by side, each nudging the other with every pass.

### 4. A skill library built by AI coding agents

**The problem.** To train a model to write robot code, you need thousands of hours of robot video labeled with the right code. No human is going to write that.

**How it works, step by step.**

1. They collected about 2,000 hours of a two-armed robot (the YAM station) being teleoperated, meaning a human drove it remotely, plus about 1,000 hours of **egocentric** human video (filmed from the person's own point of view, like a head-mounted camera) of people handling objects.
2. Gemini 3.1 Pro watched slices of these videos and wrote short programs describing each slice, using a small set of **primitives** (the most basic robot functions: `pick`, `place`, `rotate`, `handover`).
3. Claude Code, running Claude Opus 4.8, acted as a coordinator. It looked across thousands of these programs, noticed routines that kept recurring, and **distilled** them into named, reusable skills, for example `pick_and_bring`, `stir_contents`, `wrap_around_target` and `tilt_pour_over_target`.
4. The library was then frozen at 50 skills: 23 from robot data and 27 from human data.
5. Everything was relabeled using the frozen library. To save cost, if a new slice matched the contact and motion pattern of one already labeled, the cached program was reused, and the coding agent was only called on a miss.

The result: 2,913 hours, about 249,000 episodes, 606 distinct tasks, all labeled with code from one shared vocabulary of skills. (How exactly the human videos, which have no robot motor data, train the action expert is not something I could confirm from what I read, so I am leaving it out.)

**Analogy.** It is like a film editor who logs hours of raw footage, notices the director keeps using the same five camera moves, names them ("the slow push-in"), and then re-logs the whole archive using those names. Now every new shot can be described in a shared shorthand.

### 5. Hybrid execution: sometimes actually run the code

By default, AW-0's code is never executed. It is a plan that steers the video and actions, and the robot does the action chunk. In the optional **hybrid mode**, when the generated program passes a set of safety and sanity checks (correct syntax, only allowed functions, the right stage of the task, not empty), the robot actually runs the program through its hand-written perception and control routines. Otherwise it falls back to the action chunk. This made the model sturdier when the scene looked different from training, at some cost in normal conditions (details below).

### Walkthrough: one decision, folding a towel

1. The robot's cameras capture the scene: a crumpled towel on a table, two grippers.
2. Its memory holds a compressed summary of the program slices it already produced this episode ("flattened the towel").
3. All three experts start from blanks and noise. Over a few rounds, the code fills in as `fold_edge_over(robot, 'towel', [0.15, 0.0, 0.0], [0.15, 0.0, 0.0])`, meaning grab one edge with both arms and carry it 15 cm across.
4. Reading that code, the video expert sharpens a clip of the edge lifting and laying flat over the other half.
5. Reading both, the action expert sharpens the exact joint movements for the next instant.
6. About a quarter second later, the robot moves. In hybrid mode, if the code passes the checks, the `fold_edge_over` routine runs instead.
7. Repeat until done.

## What they showed

**Simulation (RoboTwin 2.0).** RoboTwin is a standard benchmark of 50 two-armed manipulation tasks in simulation. Each model was trained on 50 demonstrations per task, then tested 50 times per task, in "clean" scenes and "randomized" ones (cluttered, with changed lighting and textures).

| Model | Clean | Randomized | Average |
| --- | --- | --- | --- |
| Pi-0.5 (Physical Intelligence, a VLA) | 54.9 | 27.7 | 41.3 |
| DreamZero (NVIDIA, a WAM) | 33.6 | 17.6 | 25.6 |
| WLA | 64.8 | 3.6 | 34.2 |
| AW-0 | 80.8 | 20.6 | 50.7 |
| AW-0, hybrid mode | 63.1 | 29.2 | 46.2 |

AW-0 is far ahead in clean scenes. In randomized scenes, the default mode falls behind Pi-0.5, and hybrid mode edges ahead (29.2 versus 27.7).

**Real robots.** Eight tasks on two different robots: the YAM two-gripper station and a pair of 22-joint robotic hands (Tianji with Sharpa hands). Tasks included arranging fruit, packing a backpack, replacing a lightbulb, folding towels, picking fruit with tongs, dealing poker cards, flipping a scoreboard and solving a puzzle cube. Scored with a **rubric** (partial credit for each sub-step), each task trained on 100 demonstrations, tested 48 times.

- AW-0 averaged **71.1**, versus DreamZero 46.0, Pi-0.5 43.6, WLA 39.9 and EgoScale 35.9.
- Best tasks: arranging fruit (91.7) and folding towels (84.4, and 90.6 in hybrid mode).
- Hardest: fruit with tongs (54.2) and dealing cards (58.3).

**Why it is convincing.** The 25-point jump over the next-best model is large for real-robot work, and the ablations isolate the cause cleanly: the same model with code removed collapses to 32.9. That points squarely at the code stream, not just more data or a bigger model.

## Limitations

- **Rubric, not pass or fail.** Real-world scores give partial credit. A 71 does not mean the robot finished 71 percent of tasks.
- **Valid code is not correct code.** A program can pass every syntax check and still pick the wrong object or the wrong distance.
- **Fixed skill library.** The robot can only compose the 50 skills it has. A task needing a new kind of move is out of reach until someone rebuilds the library.
- **Visual change still hurts.** Every model, AW-0 included, roughly halves or worse in the randomized scenes. Structure in the plan does not fix shaky perception.
- **Hybrid mode is narrow.** It was only tested on the gripper robot, since nobody has good code-level skills for dexterous hands yet, and on only one real task.
- **No learning on the job.** It does not improve from its own attempts.
- **Untested claims.** The abstract mentions gains in language following and semantic reasoning, but the material I read did not show separate experiments for those.

## Where this is today

### How it IS used

- **World action models are a real, crowded product race.** NVIDIA's own technical blog (June 2026) lists DreamZero (built on the Wan video model) and Cosmos Policy (built on Cosmos) from NVIDIA, LingBot-VA from Ant Group and Being-H0.7 from BeingBeyond, plus companies such as Rhoda AI (DVA), Sereact (Cortex 2.0, which uses a world model to score possible futures before acting) and Mimic Robotics. AW-0 is a new entry in this family, from partly the same NVIDIA ecosystem: its video expert is Cosmos-Predict2.5.
- **VLAs are still the commercial default.** Physical Intelligence's Pi models are VLAs, though the same NVIDIA blog notes Pi-0.7 already borrows a world-model trick, generating "subgoal images" of what the scene should look like next. Mixing the camps is the trend AW-0 rides.
- **Code-writing robot brains exist in products.** Google DeepMind's Gemini Robotics-ER model was introduced in 2025 with the ability to reason about space and generate code to control a robot. AW-0 is notable for pulling that idea inside the action model rather than keeping it as a separate planner.
- **AI coding agents as data labelers.** AW-0's dataset was labeled by Gemini and Claude Code. Using frontier coding agents to turn raw video into structured, reusable training labels is likely to spread well beyond robotics.
- **Status of AW-0 itself:** a research model. The project page links code and a pretrained checkpoint on GitHub and Hugging Face. No product uses it yet.

### How it ISN'T used (or not yet)

- **Hand-written code as policies alone** has largely been absorbed: pure "LLM writes a script, robot runs it" systems were too brittle for contact-rich work like cloth. AW-0's own default mode does not run its code, which is telling.
- **Pure video-first world models** without explicit plans look weaker on long, multi-step tasks, at least on this paper's evidence. That is one paper's result, not yet the field's consensus.
- **Nothing here is robust yet** to messy real homes. Every model in the comparison drops sharply under visual change.

### Lineage

Code as Policies (2022, LLM writes robot scripts) + RT-2 (2023, VLAs) + video world models (2024 to 2026, DreamZero, Cosmos Policy) -> AW-0 (one model that writes the plan, imagines it and acts) -> what you will likely see next: commercial robot brains with a readable plan stream you can inspect and edit.

## Why it matters for Brendan

**Arbor and agent marketplaces.** The skill library is the real lesson. Claude Code read thousands of messy demonstrations and boiled them down to 50 named, parameterized routines that any task can compose. That is exactly what a protocol for agents needs: a shared vocabulary of capabilities that is discovered from behavior, not designed top-down. And the paper's finding that a plan written as code with comments beats a plan written in English is a strong argument for making Arbor's bids and task specs structured and machine-checkable rather than free text.

**Generative video and filmmaking.** This paper is a good reminder that a video generator is a physics simulator in disguise. The striking result is that the video becomes far more useful when it is conditioned on an explicit script. That is how you already work: shot list first, then frames. If you ever build tools for previs or AI-generated sequences, "plan as structured code, then generate" is a pattern with real evidence behind it.

**Standard Physics.** Hybrid mode's idea, use the learned model by default but only execute the precise, rule-based routine when it passes strict checks, maps well onto accessibility checking: let a learned model propose ("this ramp looks too steep") and only report it as a finding when a deterministic measurement check confirms it.

## Key terms

- **VLA (vision-language-action model)**: a model that starts from image-and-text understanding and learns to output robot motor commands.
- **World action model (WAM)**: a robot model built on a video generator that predicts future frames and actions together.
- **Action chunk**: a short burst of low-level motor commands covering the next fraction of a second.
- **Mixture of transformers**: several specialist sub-networks, one per data type, that read each other through attention.
- **Joint denoising**: generating several outputs at once by cleaning up noise in all of them in lockstep.
- **Skill library**: a fixed set of named, reusable robot routines built from basic primitives like pick and place.

## If you only have 10 more minutes

Watch the overview video on the [project page](https://agentic-wam.github.io/) first; seeing the code, imagined video and real robot side by side explains the paper faster than any text. Then read the Introduction and the main architecture figure in the method section. Then jump to the ablation tables, especially attention order and code content: they are the paper's strongest evidence. Skip the training hyperparameters and per-task simulation tables unless you are building a robot model.

## One question to think about

AW-0's code is mostly a plan the model writes for itself, not a program anyone runs. If a robot's "thinking out loud" is readable code, should a human be able to edit that plan mid-task, and if they do, who is responsible when the robot then does something wrong?

## Sources

- [Agentic World Action Models (arXiv)](https://arxiv.org/abs/2610.30136)
- [Agentic World Action Models (project page)](https://agentic-wam.github.io/)
- [Agentic World Action Models (alphaXiv)](https://www.alphaxiv.org/abs/2610.30136)
- [AW-0 robot model averages 71.1% across 8 real-robot tasks (AI Weekly)](https://aiweekly.co/alerts/aw-0-robot-model-averages-711-across-8-real-robot-tasks)
- [Pretrained to Imagine, Fine-Tuned to Act: The Rise of World-Action Models (NVIDIA Technical Blog)](https://developer.nvidia.com/blog/pretrained-to-imagine-fine-tuned-to-act-the-rise-of-world-action-models/)
- [Gemini Robotics brings AI into the physical world (Google DeepMind)](https://deepmind.google/blog/gemini-robotics-brings-ai-into-the-physical-world/)
- [Hugging Face Daily Papers, October 2026](https://huggingface.co/papers/month/2026-10)
