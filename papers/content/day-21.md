---
day: 21
title: "RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control"
short_title: "RT-2"
authors: "Brohan, Brown, Carbajal, Chebotar et al. (Google DeepMind)"
year: 2023
link: "https://arxiv.org/abs/2307.15818"
track: "Foundations"
section: "Into the physical world"
tldr: "Take a big vision-language model that already learned about the world from the internet, teach it to write robot movements as if they were words, and the robot can suddenly handle objects, places and instructions it never practiced on."
---

# Day 21: RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control

Anthony Brohan, Noah Brown, Justice Carbajal, Yevgen Chebotar and 50 co-authors at Google DeepMind (including Chelsea Finn, Karol Hausman, Sergey Levine and Vincent Vanhoucke), 2023. [Read the paper on arXiv](https://arxiv.org/abs/2307.15818). Track: Foundations 21/21, the last paper of the foundations series.

## TL;DR

RT-2 showed that a robot's "brain" can be the same kind of model that answers questions about photos, as long as you let it answer in a new language made of movement numbers. That one move let the robot borrow everything the model learned from billions of web images, and it roughly doubled how often the robot succeeded in situations it had never seen.

## How it builds on Day 20

Gaussian Splatting (Day 20) gave AI a way to see and rebuild physical space. RT-2 is the step after seeing: acting in that space. Its real parents are scattered across the series: the Transformer (Day 9) as the engine, CLIP-style image and text understanding (Day 15) as the eyes, GPT-3's "one model, many tasks" idea (Day 11), and chain-of-thought (Day 17) for thinking before moving. It is, in a sense, the whole series pointed at a robot arm.

## The world before this paper

Robots were stuck in a data trap. A language model can read trillions of words from the internet, but robot training data has to be collected one demonstration at a time: a person steers a real robot through "pick up the apple" again and again. Google's own previous model, RT-1 (2022), was trained on about 130,000 such demonstrations gathered by 13 robots over 17 months in an office kitchen. That is huge by robotics standards and tiny by internet standards. The result: RT-1 was good at the exact objects and tasks it had practiced, but brittle with anything new. Show it a toy it had never seen, or a different tablecloth, and success dropped sharply. Ask it something requiring general knowledge ("move the banana to the sum of two plus one") and it had no chance, because nothing in its kitchen data taught it arithmetic or what a Taylor Swift photo looks like. Meanwhile, vision-language models (models that look at an image and answer questions about it) knew a lot about the world, but they could only talk. Researchers tried to connect them: a language model would write a plan ("step 1: pick up the sponge") and a separate, smaller robot model would carry it out. But the robot part never got the big model's knowledge directly, so it remained the weak link.

## Core ideas

### 1. Actions as words: teach the model a "movement language"

**What it is.** The central trick is to express robot movements as text tokens, so a model that writes words can also write actions. A **token** is the basic unit a language model reads and writes, roughly a word or a piece of a word (or, here, a number).

**How it works.** At each moment, the robot needs to decide one small move. RT-2 describes that move with 8 numbers:

- one flag: keep going, or stop because the task is done
- three numbers for how far to move the hand (the **end-effector**, the robot's gripper) left/right, forward/back and up/down
- three numbers for how much to rotate the hand
- one number for how open or closed the gripper should be

Robot movements are naturally continuous (the hand could move 2.37 cm or 2.38 cm), but language models pick from a fixed vocabulary. So each number is **discretized**: its full range is chopped into 256 equal slices called **bins**, and you just say which bin. "Move up a little" might become bin 140; "move up a lot" might be bin 230.

The action then becomes a short string like `0 140 92 201 128 127 130 255`. For one backbone (PaLI-X), numbers up to 1000 already exist as tokens, so the action numbers are just written as numbers. For the other (PaLM-E), the researchers took the 256 least-used tokens in the vocabulary and repurposed them to mean "bin 0" through "bin 255."

The input is a camera image plus a text prompt in the exact style of a visual question: `Q: what action should the robot take to pick up the apple? A:` and the answer is the action string. When the model is in "robot mode," it is only allowed to output valid action tokens, so it can't answer with a sentence when the robot needs a movement.

**Analogy.** Imagine a brilliant travel writer who has seen millions of photos and read about every object on Earth, but has never driven. You don't rebuild their brain; you teach them a shorthand for driving ("L3 F7 B0" means turn left a bit, go forward fairly fast, no brake) and let them practice in a car. All their knowledge of what a stop sign, a pedestrian or a school zone means comes along for free.

**Why it matters.** Because actions are just another output of the same model, nothing new has to be bolted on. Any vision-language model can, in principle, become a robot controller. The authors named this new category of model a **vision-language-action model (VLA)**, and that name stuck: it's now the standard term for robot foundation models.

### 2. Co-fine-tuning: learn robot moves without forgetting the internet

**What it is.** **Fine-tuning** means taking an already-trained model and training it a bit more on a new task. The danger is **catastrophic forgetting**: train only on robot data and the model may lose the web knowledge you wanted to keep. RT-2's answer is **co-fine-tuning**: every training batch mixes robot demonstrations with the original web image and text tasks.

**How it works.**

1. Start from a big pretrained vision-language model. They used two: PaLI-X (5 billion and 55 billion parameter versions) and PaLM-E (12 billion). A **parameter** is one adjustable number inside the model; more parameters roughly means more capacity to know things.
2. Build training batches that are about half to two thirds robot data (camera image, instruction, correct action string) and the rest regular web tasks like captioning images or answering questions about them.
3. Train on the mix. The model keeps practicing "what is in this picture?" while learning "what should the arm do?"

**Analogy.** It's like a language student who keeps reading novels in their native language while learning to speak Spanish. They pick up the new skill without the old one going rusty, and the two reinforce each other.

**Did it matter?** Yes, and the ablations (experiments that remove one ingredient to see what it was worth) make the case clearly. On the generalization tests, a 5B model trained from scratch on robot data scored 9%. The same size starting from the pretrained model scored 42% with plain fine-tuning and 44% with co-fine-tuning. At 55B, plain fine-tuning reached 52% and co-fine-tuning reached 63%. Two lessons: starting from web knowledge is the single biggest win, and bigger models plus co-fine-tuning add more on top.

### 3. Closed-loop control from a giant model in the cloud

**What it is.** RT-2 doesn't plan a whole motion and then execute it blindly. It runs in a **closed loop**: look, decide one small move, do it, look again.

**How it works.** The 55B model is far too big to run on the robot, so it ran on a cluster of Google's AI chips (TPUs) in the cloud. The robot sent a camera frame and instruction over the network, got back one action, executed it, and repeated. The big model managed about 1 to 3 decisions per second; the 5B model about 5 per second. That's slow for a robot (a human adjusts their grip dozens of times a second), but enough for deliberate tabletop tasks like picking and placing.

**Mental picture.** Think of a remote-controlled arm where the operator is a very knowledgeable person looking at a webcam feed and calling out one short instruction every half second: "a bit left... down... close the gripper... lift."

### 4. Emergent reasoning, including chain-of-thought for robots

**What it is.** **Emergent capabilities** are skills the model shows that were never in its robot training data. Because RT-2 still "knows" the web, it can follow instructions that need general knowledge.

**Examples from the paper.** The robot data only covered seven basic skills (pick, move near, place upright, knock over, open or close a drawer, put into or take out of a container). Yet RT-2 could:

- **Understand symbols**: "move the apple to the 3" or "move the coke can to the heart."
- **Reason**: "move the banana to the sum of two plus one," "pick the object that is different," or follow instructions in other languages.
- **Recognize people and things**: "move the coke can to the person with glasses," or "pick up the extinct animal" (it picked a toy dinosaur).

**Chain-of-thought.** The authors also briefly trained a version (a few hundred extra training steps) to write a short plan in words before its action tokens, borrowing the idea from Day 17. Told "I'm hungry," it wrote "Plan: pick rxbar chocolate" and then produced the movement. Asked to pick an improvised hammer, it chose a rock. Thinking in words first helped on multi-step, more abstract requests.

**Analogy.** RT-1 was like a trained dog that knows "fetch the ball" perfectly. RT-2 is more like a new employee who has never worked in this kitchen but understands English, numbers, brands and common sense, so "grab me something to eat" makes sense on day one.

## Walkthrough: one decision, start to finish

1. A person types: "move the banana to the sum of two plus one." On the table are a banana and three paper cards showing 1, 2 and 3.
2. The robot's head camera captures a frame. The image and the instruction, wrapped as `Q: what action should the robot take to move the banana to the sum of two plus one? A:`, go to the model in the cloud.
3. The vision part turns the image into tokens the Transformer can read, alongside the text tokens.
4. The model's web knowledge lets it connect "two plus one" with the card showing 3, and its robot training lets it connect "move the banana to X" with a reach-grasp-carry motion.
5. It outputs 8 action tokens: keep going, move hand a bit right and forward, slightly down, no rotation, gripper open.
6. These bin numbers are converted back into real distances and sent to the arm, which moves a few centimeters.
7. A fresh camera frame is taken and the loop repeats, maybe 20 to 60 times, until the banana sits on the 3 and the model outputs the "done" flag.

## What they showed

The team ran about 6,000 real-robot trials, comparing RT-2 against RT-1 and against other robot methods that used pretrained vision models (VC-1 and R3M) or an object-detection-based approach (MOO).

- **Familiar tasks:** everyone good enough was roughly tied. RT-2 scored 91 to 93% versus RT-1's 92%. So the new approach didn't sacrifice basic skill.
- **Unseen situations:** this is where it shone. Averaged across new objects, new backgrounds and new rooms, both RT-2 versions scored 62%, versus 35% for MOO, 32% for RT-1, 12% for R3M and 10% for VC-1. That's about 2x better than the previous best and about 6x better than the other pretrained-vision methods.
- **Emergent tasks** (symbols, reasoning, recognizing people): the 55B version averaged 60% versus 17% for RT-1, roughly 3x. On symbol understanding alone it was 82% versus 16%.
- **Simulation check:** on a separate tabletop pushing benchmark (Language-Table), a small 3B RT-2 hit 90% versus 74 to 77% for prior methods, showing the recipe worked on a different robot and setup too.

Why it was surprising: nobody added reasoning modules, object detectors or knowledge bases. The same robot data plus web knowledge, connected through the "actions as words" trick, was enough. It was strong evidence that the scaling story from language models (bigger pretrained models generalize better) also applies to physical control.

## Limitations

- **No new physical skills.** Web knowledge helped the robot understand *what* to do, but it could only perform motions found in its robot data. It couldn't learn to wipe a table or fold a towel just by having seen pictures of it. The authors say this plainly.
- **Slow and expensive.** 1 to 3 decisions per second from a 55B model in a data center is far too slow for fast or delicate work, and depends on a network connection.
- **Coarse actions.** Chopping each motion into 256 bins and producing one step at a time limits precision and smoothness. This turned out to be the biggest technical weakness.
- **Failure cases.** It struggled to grasp objects by a specific part (like a handle), with dexterous motions, and with long multi-step tasks. In simulation, it didn't understand unfamiliar physics, like a pen rolling off a table.
- **Closed and narrow.** Only a few huge private models could serve as the base, the weights were never released, and all testing was one robot type in office kitchens.

## Where this is today

### How it IS used

The term and the recipe RT-2 introduced are now the backbone of the robotics industry's push toward general-purpose robots, as of October 2026.

- **Google DeepMind's Gemini Robotics** is RT-2's direct descendant: a vision-language-action model built on Gemini that turns images and instructions into motor commands. Gemini Robotics 1.5 (September 2025) "thinks" in words before acting, extending RT-2's chain-of-thought experiment, and can transfer skills between very different robots. A separate planner model, Gemini Robotics-ER 1.5, is open to developers through the Gemini API, while the action model is limited to partners such as Apptronik, Agility Robotics and Boston Dynamics.
- **Boston Dynamics** announced at CES in January 2026 that Gemini Robotics models will power the next Atlas humanoid, starting with automotive manufacturing research. Hyundai, Boston Dynamics' majority owner, has said it plans to bring Atlas into a U.S. plant from 2028. This is still research and phased rollout, not a shipped product.
- **Open-source VLAs.** OpenVLA (Stanford and collaborators, June 2024) copied RT-2's recipe, including discretized action tokens, in an open 7B model and beat the 55B RT-2 on many manipulation tests. Hugging Face's SmolVLA (450M parameters) runs on a consumer GPU or a MacBook.
- **Startups built around the VLA idea.** Physical Intelligence (raised $600M in late 2025 at about a $5.6B valuation) open-sourced its π0 model in February 2025. Figure AI's Helix controls a whole humanoid upper body. NVIDIA's GR00T N-series offers open humanoid VLAs other companies can build on.

How directly: the concept (start from a web-trained vision-language model, train it to output actions, call it a VLA) is used everywhere. The specific way RT-2 did it is mostly not.

### How it ISN'T used

- **One-token-per-bin actions have largely been replaced.** Most newer VLAs keep the vision-language "brain" but attach a separate **action expert** that outputs smooth, continuous movements using diffusion or flow matching (relatives of the diffusion models from Day 12). π0, Octo and SmolVLA work this way, and π0 can produce actions up to 50 times per second. Even the token approach got rebuilt: Physical Intelligence's FAST tokenizer compresses whole chunks of motion into far fewer tokens, because simple per-step binning "rapidly breaks down" on dexterous tasks.
- **One big slow model was split in two.** Figure's Helix and NVIDIA's GR00T use a "System 2 / System 1" design: a big vision-language model thinks slowly about the scene, and a small fast network handles motor control (Helix runs its action part at 200 times per second, on the robot itself). This directly fixes RT-2's 1 to 3 Hz cloud bottleneck.
- **RT-2 itself is a benchmark, not a product.** The model was never released. Today it mostly appears as the baseline that newer models (like OpenVLA) compare against.
- **The data trap isn't solved.** Companies now add human videos, simulation and AI-generated training data on top of teleoperation, because robot demonstrations are still scarce. Commercial deployments remain mostly pilots and demos; claims of "general-purpose" robots in homes are still ahead of reality.

### Lineage

Hand-coded robot programs -> RT-1 (robot-only Transformer) -> RT-2 (web vision-language model that writes actions as tokens, the first VLA) -> OpenVLA, π0, Helix, GR00T and Gemini Robotics (VLAs with continuous action experts and fast/slow splits) -> the humanoid and warehouse robot pilots of 2026.

## Why it matters for Brendan

**Arbor.** RT-2's deepest idea is "if you can express something as tokens, a language model can learn to produce it." Arbor's agents bidding and negotiating in a structured protocol is the same move in a different domain: you're defining a small, constrained "action vocabulary" (bid, counter, accept, walk away, with parameters) that a general model can output. RT-2's trick of restricting the model to only valid action tokens when it's in action mode is directly relevant: an agent in an auction should be physically unable to emit a malformed bid.

**Robotics and Standard Physics.** If you ever want Standard Physics to go beyond scanning, the stack is now visible: Gaussian splats or LiDAR to capture a space (Day 20), and a VLA to act in it. More immediately, Gemini Robotics-ER is available through an API today, and it's designed for spatial questions about a camera image ("where is the door handle, how high is it?"). That's worth testing as an ADA-check assistant layered on top of your measurements, while trusting real measurements over the model for compliance.

## Key terms

- **Vision-language-action model (VLA)**: a model that takes images and text instructions in and produces robot actions out; RT-2 coined the term.
- **Token**: the small unit of text (or here, a number) a language model reads and writes one at a time.
- **Discretization (bins)**: chopping a continuous range, like "how far to move," into a fixed number of slots (256 in RT-2) so it can be written as a token.
- **Co-fine-tuning**: continuing to train a pretrained model on a mix of new task data (robot demos) and its original data (web images and text) so it learns the new skill without forgetting.
- **Closed-loop control**: repeatedly looking, choosing one small action, acting and looking again, instead of planning everything up front.
- **Emergent capability**: a skill a model shows that wasn't directly in its training data for that task, like understanding "the sum of two plus one" while moving a banana.

## If you only have 10 more minutes

Look at **Figure 1** on the first page, which shows the whole idea in one picture: web data and robot data go into one model, and actions come out as tokens. Then read **Section 3** (the RT-2 method), especially the part on turning actions into tokens; it's short and readable. Finally, look at the **emergent capability examples and the chain-of-thought figure** in the experiments section. Skip the appendix tables on model training settings and the detailed per-category baselines.

## One question to think about

RT-2 could understand far more than it could physically do: it knew what a towel was but couldn't fold one. For any AI product you build, where is your own gap between what the model understands and what it can actually do in the world, and is the bottleneck data, speed, or the "action vocabulary" you've given it?

## Sources

- [RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control (arXiv)](https://arxiv.org/abs/2307.15818)
- [RT-2 paper PDF (arXiv)](https://arxiv.org/pdf/2307.15818)
- [Gemini Robotics 1.5 brings AI agents into the physical world (Google DeepMind)](https://deepmind.google/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/)
- [Gemini Robotics (Wikipedia)](https://en.wikipedia.org/wiki/Gemini_Robotics)
- [Google DeepMind's Gemini Robotics models will power Boston Dynamics' Atlas (The Decoder)](https://the-decoder.com/google-deepminds-gemini-robotics-models-will-power-boston-dynamics-atlas-for-industrial-tasks/)
- [CES 2026: Google DeepMind partners with Boston Dynamics (Toolnavs)](https://toolnavs.com/article/1048-ces-2026-google-deepmind-partners-with-boston-dynamics-to-bring-gemini-robotics)
- [Vision-language-action model (Wikipedia)](https://en.wikipedia.org/wiki/Vision-language-action_model)
- [OpenVLA: An Open-Source Vision-Language-Action Model (arXiv)](https://arxiv.org/pdf/2406.09246)
- [FAST: Efficient Action Tokenization (Physical Intelligence)](https://pi.website/research/fast)
- [Physical Intelligence raises $600M (The Robot Report)](https://www.therobotreport.com/physical-intelligence-raises-600m-advance-robot-foundation-models/)
- [Top 10 Physical AI Models Powering Real-World Robots in 2026 (MarkTechPost)](https://www.marktechpost.com/2026/04/28/top-10-physical-ai-models-powering-real-world-robots-in-2026/)
- [Vision-Language-Action Models (Metavert)](https://www.metavert.io/vision-language-action-models)
