---
day: 37
title: "TAPESTRY: A Single Backbone for Video Generation and Robot Control"
short_title: "TAPESTRY (a video generator retrained to move a robot, without making any video)"
authors: "Jeremy A. Collins, Seungjae Lee, Rachanon Wachakorn, Krishnan Srinivasan, Animesh Garg, Vitor Campagnolo Guizilini, Paarth Shah (Georgia Tech, University of Maryland, Toyota Research Institute)"
year: 2026
link: "https://arxiv.org/abs/2610.36823"
track: "Frontier"
section: "Frontier"
tldr: "A video-generation AI already knows a lot about how the physical world moves, and TAPESTRY taps that knowledge for a robot by disguising each robot motion as a tiny piece of video the model already understands, then skipping video generation entirely at run time, which made it about 44 times faster than a leading rival and the best performer on new objects and tasks."
---

# Day 37: TAPESTRY: A Single Backbone for Video Generation and Robot Control

Jeremy A. Collins, Seungjae Lee, Rachanon Wachakorn, Krishnan Srinivasan, Animesh Garg, Vitor Campagnolo Guizilini and Paarth Shah. Georgia Institute of Technology, University of Maryland, and Toyota Research Institute (TRI). Posted to arXiv on October 27, 2026, and accepted to CoRL 2026 (the Conference on Robot Learning, the main robotics-and-AI venue). [Read the paper on arXiv](https://arxiv.org/abs/2610.36823). Project page: [tapestry-wam.github.io](https://tapestry-wam.github.io). Track: Frontier.

A note on why this paper: the last few days leaned heavily on memory and voice, so today goes to your robotics and generative video interests at once. The question it answers is one you will keep hearing: can the AI models that make videos also be the brains of robots? A note on accuracy: this brief is built from the full arXiv HTML paper. I did not run any code (none is linked yet).

## TL;DR

The physics that a video generator has learned lives in its weights, not in the videos it produces, so you can teach that same network to output robot motions directly, as long as you feed the motions in a format it already recognizes, and then you never have to pay for generating video at all.

## What it builds on

The Transformer (Day 9) is the engine inside the video model. Denoising diffusion (Day 12) is how both the video and the robot motions are generated: start from random noise and clean it up. RT-2 (Day 21) showed you could turn a big pretrained web model into a robot controller (a "vision-language-action" model, or VLA). Among frontier days, this is a direct sibling of Day 31 (AW-0, "Agentic World Action Models"), which also uses imagined video to guide a robot, and Day 29, which tried a general-purpose chatbot as a robot brain and found it too slow. TAPESTRY's headline is speed: it keeps the video model's knowledge while dropping the slow part.

## The world before this paper

Robots are starved for training data. Collecting robot demonstrations means a person remote-controlling a robot arm for hours, which is slow and expensive. Video models, by contrast, have watched millions of hours of people cooking, pouring, opening doors. So researchers have been trying to transfer that video knowledge into robots, and three approaches emerged. **(1) Dream then copy:** generate a video of the robot doing the task, then use a second model to work out which motor commands would produce that video. This is slow (you must render video every time the robot moves) and errors stack up across two models. **(2) Borrow the features:** run the video model partway and hand its internal signals to a brand-new "action head" trained from scratch. Faster, but the new head never really gets the video model's knowledge. **(3) Share one brain:** train the video network itself to produce both video and actions. The deepest integration, but existing versions either still generate full video at run time (NVIDIA's DreamZero takes seconds per move), or bolt on new untrained parts. Nobody had gotten the deep integration and real-time speed together.

## Core ideas

### 1. Disguise each robot motion as a tiny patch of video

**What it is.** Video models do not look at raw pixels. A component called a **VAE** (variational autoencoder) first compresses each video into a smaller grid of numbers called **latents**. Then a layer called the **patchifier** chops that grid into small squares (**patches**), and each patch becomes one **token**, the unit the Transformer reads. Everything the model knows about the world, it learned while reading tokens made this way.

TAPESTRY's trick: take one moment of robot action (for this robot, 20 numbers: for each of two arms, the hand's position, its rotation, and how open the gripper is) and reshape it so it looks exactly like one patch of video latents. Then send it through the model's *own* patchifier, the same door video comes in through.

**How it works, step by step.**

1. A tiny new layer stretches the 20 action numbers into the size of one video patch (2 by 2 by 16 numbers). This is the only new part added to the whole model: 1,280 parameters, in a model with about 2 billion.
2. A **normalization** step rescales those numbers so their average and spread match what real video patches look like. (Video latents are designed to look roughly like a standard bell curve; raw robot numbers do not.)
3. The result goes through the video model's existing patchifier, becoming one token per action step. A chunk of 16 steps (about half a second of motion) is just 16 tokens.
4. On the way out, the same path runs in reverse to turn tokens back into motor commands, with no new parts.

**Why it matters.** The authors tried the obvious shortcut: feed actions straight into the Transformer with a fresh layer, skipping the patchifier. Training blew up every time (the numbers went to infinity). Removing just the normalization step cut success from 58% to 33% in a quick test. Speaking the model's native language is not a nicety; it is what makes the transfer work.

**Analogy.** Imagine a veteran film editor who has cut thousands of action scenes and has a great feel for how bodies move. You want her advice on choreographing a real stunt. You could write her a technical memo (she would struggle), or you could hand her storyboard frames in the exact format she has always worked with. TAPESTRY hands the video model storyboard frames.

### 2. Train one network three ways at once

**What it is.** The same network is trained on a mix of three jobs, chosen at random for each training example:

- **Video only.** Ordinary video generation on a large pile of robot and human footage (robot datasets like DROID and AgiBot-World; human video like Ego4D, Epic Kitchens, and Something-Something; and web clips from Panda-70M). About 673 hours in all. This keeps the model's sense of physics sharp and stretches it toward robot-relevant scenes.
- **Video and actions together.** On the robot's own demonstrations, the model generates future video and the matching actions side by side. A one-way **attention mask** (a rule about which tokens can look at which) lets action tokens look at the imagined video, but stops video tokens from looking at actions, so the action training cannot scramble the video skills.
- **Actions only.** Given the current camera image and an instruction, generate only the actions, with no video. This exactly matches how the robot will be used.

Strikingly, only about 6 hours of robot demonstrations carried any action labels; everything else was plain video.

**Why all three?** The ablations make the case. Skip the actions-only job, and a model that works when generating video (78%) fails completely when asked for actions alone. Drop the video job, and the model scores 0%. Train video and actions as separate jobs that never mix, and it reaches only 36%. The full mix reaches 58% in that same short training run (76% when fully trained).

**Analogy.** A dance student who sometimes just watches performances, sometimes watches and dances along, and sometimes dances with no video at all. The last one is what the recital requires, but the first two are where she learns what good movement looks like.

### 3. One step, not many: the surprising smoothness result

**What it is.** Diffusion models normally clean up noise in many small steps (often 10 to 100). The general rule in image and video generation: more steps, better results. For robot actions coming out of a video model, the authors found the opposite: every extra step made the motion *jittery*, with high-frequency shaking that hurts a real robot. So TAPESTRY takes a single step, straight from pure noise to the final answer, using a standard method called **DDIM**.

**Why extra steps hurt.** Video is full of fine, fast detail: textures, edges, flickering motion. A video model learns that in its last cleanup steps, its job is to add that fine detail. Robot motion is smooth and slow by comparison. The authors measured it: 95% of a robot's motion energy sits below about 0.35 cycles per second, versus about 2 for natural video, a gap of four to six times. So when the video model does its final polishing on robot actions, it adds the kind of fine detail that belongs in video, which shows up as shaking. Other teams had seen this symptom: DreamZero runs a smoothing filter on its outputs, and NVIDIA's Cosmos Policy averages 112 parallel predictions per chunk. TAPESTRY sidesteps it by never entering those final polishing steps at all.

**Why one step works here.** With this model's particular math setup (the technical names are a "zero terminal signal-to-noise" schedule and "v-prediction"), a single step from pure noise mathematically collapses to "predict the most likely action chunk given what you see and what you were told." The authors checked: the output barely changes no matter what random noise you start from.

**Analogy.** Asking a portrait painter to "just tidy up" a technical blueprint. Her instinct is to add brushwork and texture, which ruins straight lines. Better to ask for one confident sketch and stop.

### Walkthrough: one half-second of the robot pouring a golf ball

1. The robot's cameras (up to three, such as wrist and overhead) capture the current scene. The VAE compresses each view into latents, then into image tokens.
2. The instruction, "pour the golf ball out of the bowl," is turned into text tokens by a frozen language encoder (T5-XXL).
3. Sixteen action tokens are filled with pure random noise.
4. All of it goes through the Transformer once. No future video is created, and the VAE's decoder (the expensive part that turns latents back into pixels) is never used.
5. The 16 action tokens come out and are translated back into 16 motor commands for both arms: about 0.53 seconds of motion.
6. Time taken: 84 milliseconds on a single RTX 5090 (a high-end gaming graphics card), using 9 GB of memory. The robot starts moving, and the process repeats.

## What they showed

**Learning tasks it only saw as video (LIBERO simulation).** LIBERO is a standard simulated kitchen-and-tabletop benchmark with five groups of tasks. In this harder version, models get action labels for only one group (90 tasks) and see the other four groups only as video. They must figure out how to *do* tasks they have only watched.

| Method | Average success on unseen-as-action tasks |
| --- | --- |
| Diffusion Policy, BAKU, QueST (no video learning) | 0 to 2% |
| AMPLIFY | 61% |
| Cosmos Policy (NVIDIA and Stanford) | 70% |
| DreamZero (NVIDIA) | 70% |
| TAPESTRY trained from scratch | 58% |
| TAPESTRY with video pretraining | 76% |

It beat the two strongest rivals by about 6 points, winning big on tasks about objects (95%) and spatial layouts (87%), though it trailed on the long multi-step group. The 18-point gap between from-scratch and pretrained is the value of the video model's prior knowledge.

**Real two-armed robot.** On a 20-joint two-armed robot, trained on three tasks (screwdriver into toolbox, croissant from oven to plate, corn into bowl), TAPESTRY succeeded 28 of 30 times versus 15 of 30 for a standard from-scratch robot policy (Diffusion Policy).

**New situations.** The real test: a croissant on a glass oven door instead of inside, pouring a golf ball from a bowl (both never seen in demonstrations), and putting a Lego brick on a wooden boomerang (neither object ever seen by the robot). TAPESTRY fully completed 10 of 15 tries. DreamZero managed 4 of 15 (all on the pouring task). Every other version scored 0. TAPESTRY was the only one to do the Lego task, and it did it 5 of 5 times, which the authors credit to the broad web and human video it trained on.

**Speed.** 84 ms per chunk versus about 3.7 seconds for DreamZero on the same card, even after the authors sped DreamZero up (about 20 seconds with its released code). Roughly 44 times faster. Training cost was similar.

**Why it is convincing.** It works on a real robot, not just simulation; the speed gain is huge and comes from a clear reason (16 tokens and one step, instead of about a thousand video tokens and several steps); and the jitter finding is backed by careful measurements that rule out four other explanations.

## Limitations

- **Small real-world tests.** Out-of-distribution results are 5 tries per condition. The margin over DreamZero there is not statistically significant (the authors say so).
- **One answer, not a range.** The single-step trick returns the "average best" action. If a task has two equally good options (go left or right around an obstacle), averaging could produce something in between that does neither. In a test with two identical croissants, the robot committed to one each time (8 of 10 successes), but tricky cases remain possible.
- **Tied to one model's math.** The single-step result depends on CogVideoX's particular noise setup. Many newer video models (like Wan) use a different method called rectified flow, where the trick did not carry over in their experiments.
- **One robot body.** The action layer is sized for this 20-number, two-armed robot. Moving to other robots is untested.
- **Short tasks.** It lagged rivals on LIBERO's long multi-step tasks, and it has no long memory of earlier frames.
- **Older, smaller base model.** CogVideoX-2B is modest by 2026 standards; whether the approach scales to much bigger video models is open.

## Where this is today

### How it IS used

- **Big labs are betting on video models as robot brains.** NVIDIA's research groups built both main rivals in this paper. DreamZero (from NVIDIA's GEAR lab, early 2026) uses a 14-billion-parameter Wan video model and topped public robot leaderboards like RoboArena, but needs top-end data-center chips to run in real time. Cosmos Policy (NVIDIA and Stanford, ICLR 2026) fine-tunes NVIDIA's Cosmos video model into a controller and reported 98.5% on standard LIBERO. These are research releases, not shipped products.
- **A consumer humanoid uses the "dream then copy" approach.** 1X, the company making the NEO home robot, launched its "1X World Model" in January 2026. Per The Robot Report, NEO generates visualizations of possible future actions, then "a built-in inverse dynamics model" translates them into movement. That is family (1) from above, the approach TAPESTRY argues is slower. NEO is sold through early access ($20,000, or $499 a month). How well this works in real homes is not something I could verify.
- **Toyota Research Institute** is a co-author and has its own "Large Behavior Model" program for multitask robot manipulation; TAPESTRY borrows its action-normalization recipe. I found no public sign that TAPESTRY itself is in a Toyota product.

### How it ISN'T used (or not yet)

- **The leading commercial robot brains are VLAs, not video models.** Physical Intelligence's π0 family attaches a small "action expert" (about 300 million parameters in π0) to a vision-language model and generates motions with a few-step method called flow matching. Its π0 and π0.5 models are open-source through the openpi repository; π0.7 (April 2026) is closed. This is close to approach (2) above: a newly trained action part next to a big pretrained model. VLAs are faster than video-generating robots but do not inherit a video model's sense of motion.
- **Generating video at run time is being questioned.** TAPESTRY, and earlier Fast-WAM, both argue the robot does not need to imagine the future in pixels. If that holds, "dream then copy" systems may give way to designs that keep the video model's weights but skip the video.
- **TAPESTRY itself** is a brand-new research result with no released code yet.

### Lineage

Video generators trained on the internet (Day 12 diffusion, Day 9 Transformer) -> "dream a video, then copy it" robots (UniPi, DreamGen, 1X World Model) -> shared video-and-action models that still render video (DreamZero, Cosmos Policy) -> TAPESTRY: same shared brain, actions disguised as video patches, no video at run time, one step -> what is likely next: robot policies built on ever-larger video models, running on a single local chip.

## Why it matters for Brendan

**Generative video, from the filmmaker's side.** This paper is evidence for something you can say with confidence in a pitch or a panel: video models are not just content tools; they are learning physics. The fact that a model trained mostly to make clips can, with 1,280 new parameters and 6 hours of robot data, place an unseen Lego on an unseen boomerang tells you how much real-world understanding those models hold. It also explains why NVIDIA, a chip company, keeps building video models: they are becoming the brains of robots.

**A design lesson that travels.** Two ideas here apply to any product that repurposes a big pretrained model. First, feed it data in the format it already knows (the normalization step was worth 25 points). Second, the expensive output is not always the valuable part: the knowledge is in the weights, so ask whether you can skip generating the costly thing. If Standard Physics ever uses a 3D or video model to judge a scanned room, the question "do I need to render anything, or can I read the answer straight off the model?" is the same one this paper asks.

## Key terms

- **World action model (WAM)**: a single AI model that understands how the world changes over time (like a video model) and also outputs robot actions.
- **VAE latents and patches**: the compressed grid of numbers a video model uses instead of pixels, cut into small squares that each become one token.
- **Diffusion and DDIM step**: generating something by starting from random noise and cleaning it up; DDIM is a standard recipe for doing that in few steps.
- **Action chunk**: a short batch of future motor commands (here 16, about half a second) predicted all at once.
- **VLA (vision-language-action model)**: a robot brain built from a model that understands images and text, with an add-on that outputs actions (RT-2, π0).
- **Inverse dynamics model**: a model that looks at a before-and-after (or a video) and works out which actions caused it.

## If you only have 10 more minutes

Read the Introduction, which lays out the three families of video-to-robot approaches more clearly than most review papers, and then Section 3 (the jitter section) with Figure 2, which is the paper's most original insight. Glance at Table 3, the real-robot out-of-distribution results. Skip Appendix G's derivations and the dataset-alignment appendix unless you want the math.

## One question to think about

TAPESTRY's robot never "imagines" the future visually; it just acts. A film director, by contrast, often storyboards before shooting. When should an AI system (a robot, or a creative tool) actually render its plan so a human can see and approve it, and when is skipping that step the right call, even if it makes the system harder to understand?

## Sources

- [TAPESTRY: A Single Backbone for Video Generation and Robot Control (arXiv)](https://arxiv.org/abs/2610.36823)
- [Full text (arXiv HTML)](https://arxiv.org/html/2610.36823v1)
- [TAPESTRY project page](https://tapestry-wam.github.io)
- [Why Is DreamZero So Good at Robotics Benchmarks? (It Can Think, February 2026)](https://itcanthink.substack.com/p/why-is-dreamzero-so-good-at-robotics)
- [Cosmos Policy project page (NVIDIA Research)](https://research.nvidia.com/labs/cosmos-lab/cosmos-policy/)
- [Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning (arXiv)](https://arxiv.org/html/2601.16163v1)
- [1X launches world model enabling NEO robot to learn tasks by watching videos (The Robot Report)](https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/)
- [NEO humanoid maker 1X releases world model to help bots learn what they see (TechCrunch, January 2026)](https://techcrunch.com/2026/01/13/neo-humanoid-maker-1x-releases-world-model-to-help-bots-learn-what-they-see)
- [openpi (AI Wiki summary of Physical Intelligence's open-source models)](https://aiwiki.ai/wiki/openpi)
- [pi-zero: Physical Intelligence's VLA Model (Claru glossary)](https://claru.ai/glossary/pi-zero)
