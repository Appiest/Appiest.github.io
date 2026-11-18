---
day: 55
title: "ScaleVLA: Scaling Vision-Language-Action Models to 552 Billion Parameters"
short_title: "ScaleVLA (a giant frozen AI brain makes robots learn from fewer demos)"
authors: "Ruixi Yu, Dairu Liu, Xuchuan Chen, Zekun Qi and others, with He Wang and Li Yi (Tsinghua, Peking University, Shanghai Jiao Tong University, Galbot)"
year: 2026
link: "https://arxiv.org/abs/2611.21607"
track: "Frontier"
section: "Frontier"
tldr: "Robot 'brains' usually sit on top of small 2 to 8 billion parameter vision-language models; ScaleVLA plugs in a frozen 552-billion-parameter frontier model instead, trains only a small action module on top, and finds the robot learns a task from 10 demonstrations better than a small-brained robot does from 50, copes better with unfamiliar setups, and still answers in about a fifth of a second."
---

# Day 55: ScaleVLA: Scaling Vision-Language-Action Models to 552 Billion Parameters

Ruixi Yu, Dairu Liu, Xuchuan Chen, Zekun Qi, Zekai Li, Zhuo Cao, Luyang Niu, Yingsheng Zhang, Sikai Liang, Ke Fan, He Wang and Li Yi (Tsinghua University, Peking University, Shanghai Jiao Tong University and the robotics company Galbot). Posted to arXiv November 16, 2026 (cs.RO, robotics). [Read the paper](https://arxiv.org/abs/2611.21607). Track: Frontier.

This brief is built from the full paper (arXiv HTML version), plus current pages on the models and companies it relates to.

## TL;DR

If you give a robot a much bigger "understanding" brain, even one you never retrain, it learns physical skills from far fewer examples and handles surprises better, and the cost in reaction time is smaller than you'd expect: 276 times the parameters, only about 1.9 times slower.

## What it builds on

From the foundations track, this is the direct descendant of **RT-2 (Day 21)**, which first showed that a web-trained vision-language model could be turned into a robot controller. It also uses **CLIP (Day 15)**-style vision-language understanding inside the backbone, the **Transformer (Day 9)** everywhere, and a cousin of **diffusion (Day 12)**, called flow matching, to produce smooth motions. On the frontier track, it sits next to Day 27 (GPT-6-Astra as a robot brain), Day 37 (TAPESTRY) and Day 44 (uni-robot-agent): all asking "how much of a robot's skill can be borrowed from a big pretrained model?" This paper answers one narrow version very cleanly: what if you just make that model enormous?

## The world before this paper

A **VLA (vision-language-action model)** is a robot brain that takes in camera images and an instruction ("plug in the charger") and outputs motor commands. Since RT-2 in 2023, the recipe has been: start from a **VLM (vision-language model)**, an AI that understands images and text, then attach something that outputs actions. But in practice almost every VLA uses a small VLM, typically 2 to 8 billion parameters (π0 about 3 billion, OpenVLA 7 billion, NVIDIA's GR00T N1.7 uses a 2-billion-parameter backbone). The reason is speed: a robot has to react in a fraction of a second, and giant chatbot-scale models were assumed to be far too slow. Meanwhile robots still need lots of human demonstrations per task, and still fail when the room, objects or lighting change slightly. Nobody had tested cleanly whether a truly frontier-sized model (hundreds of billions of parameters) would help, because nobody had made one fast enough to try.

## Core ideas

### 1. A frozen giant "eye and mind," plus a small trainable "hand"

**The setup.** ScaleVLA has two parts:

- **The backbone** is DeepSeek-V4.1-Flash, a 552-billion-parameter model that understands images and text. It is **frozen**, meaning its weights are never changed during robot training. It just looks at the camera images and the instruction and produces a rich description of the scene, not in words but as a long list of numbers per piece of the image and text (each list is 5,120 numbers wide). These are called **features**: the model's internal summary of "what's here and what matters."
- **The action head** is a much smaller network, trained from scratch, that reads those features plus the robot's current joint positions and outputs the next stretch of movement. Its design is copied from NVIDIA's GR00T N1.7 so the comparison is fair.

**A detail that matters.** The backbone is a "language model" that normally reads and then writes text. ScaleVLA stops it halfway: it runs only the part that *reads and understands* (the encoder, 20 layers) and never runs the part that writes (the decoder). Robots don't need the model to talk, only to understand.

**Step by step, during training:**

1. Collect demonstrations: a human remotely steers the robot through the task many times (**teleoperation**).
2. Run every camera frame and instruction through the frozen backbone once and save the features to disk.
3. Train only the action head to map "saved features + robot state" to "what the human did next."

Because step 2 happens once, training is cheap: the giant model is never updated, and its output is reused.

**Analogy.** Think of hiring a world-class art director who has seen millions of films (the backbone) and a new camera operator (the action head). You don't retrain the art director. You just have them describe every shot in rich detail, and the operator learns to move the camera from those descriptions. The better the descriptions, the faster the operator learns.

**Why it's surprising.** Many robotics researchers assumed you *must* fine-tune the backbone for it to understand physical tasks. RT-2, for example, trained its backbone further on robot data. ScaleVLA shows a frozen frontier model's understanding is already good enough to be useful as-is.

### 2. Outputting smooth motion with flow matching

**Action chunks.** Instead of one motor command at a time, the action head predicts a short sequence of upcoming movements at once, called an **action chunk** (for example, the next fraction of a second of arm and gripper positions). That makes motion smoother and means the slow backbone only has to run once per chunk, not once per tiny movement.

**Flow matching.** This is how the action head produces a chunk. It's a close relative of diffusion (Day 12):

1. Start with a chunk of pure random noise: a meaningless jumble of arm positions.
2. The network predicts a "direction to move" (a **velocity**) that turns this noise toward a sensible motion, given the scene features.
3. Take a step in that direction. Repeat. ScaleVLA uses just **4 steps**.
4. The result is a smooth, realistic chunk of motion.

**Analogy.** Imagine a sculptor starting from a random lump of clay and, in four confident passes, shaping it into the right pose. Diffusion is the same idea; flow matching just learns straighter paths, so fewer passes are needed.

The action head itself is a 32-layer **diffusion transformer (DiT)**, a Transformer used for this "shape noise into an output" job, which keeps "looking back" at the scene features at every layer through **cross-attention** (the mechanism that lets one sequence read from another).

### 3. A fair head-to-head test of brain size

The paper's real contribution is a **controlled comparison**: same action head, same data, same training steps, same rule for picking the final checkpoint, and only the backbone changes. They test six backbones: Qwen3-VL at 2B and 32B, NVIDIA's Cosmos-Reason2 at 2B, 8B and 32B, and the 552B DeepSeek model. For smaller backbones they read features from a layer about halfway through, matching the "encoder only" choice for the big one.

**Why this matters.** Most robotics papers change many things at once (new data, new architecture, bigger model), so you can't tell what caused the improvement. Here, any difference is mostly the backbone. (Mostly: see Limitations.)

### 4. Making a 552B model fast enough for a robot

How can something this big drive a robot in real time?

- **Mixture of experts (MoE).** The backbone is split into many specialist sub-networks ("experts"), and for each piece of input only a few are switched on. So most of its 552 billion parameters sit idle on any given step. Think of a hospital with hundreds of specialists where each patient sees only two or three.
- **Run it once per chunk.** All four flow-matching steps reuse the same backbone features.
- **Split it across GPUs.** The model runs on four NVIDIA H200 GPUs at once (called **tensor and expert parallelism**: dividing each layer, and the experts, across chips).

Result: a median of **216 milliseconds per action chunk** in simulation (141 for the backbone, 72 for the action head) versus 115 milliseconds for the 2B setup on one GPU. On the real robot, round trip including networking was 384 milliseconds. So 276 times more parameters cost about 1.9 times the reaction time. Important caveat: the robot isn't carrying four H200s. The model runs on a server and the robot talks to it.

### Worked example: teaching a new task with 10 demos

Say you want a robot arm to "put the bowl on the plate" in a simulated kitchen (the LIBERO-Goal benchmark).

- With a **2B backbone** and 5 demonstrations, it succeeds 39% of the time. With 50 demonstrations, 86%.
- With the **552B backbone** and 5 demonstrations, 77%. With just **10 demonstrations, 88%**, already better than the small brain with five times the data.

For a harder, longer task set (LIBERO-Long), at 5 demos: 24% (2B) versus 62% (552B).

In plain terms: each human demonstration is worth roughly five times as much when the robot's understanding is better. Demonstrations are the expensive part of robotics (a person has to steer the robot by hand every time), so this is the economically important result.

## What they showed

**Simulated benchmarks.** **LIBERO** is a standard set of simulated tabletop tasks for a robot arm, in four groups (spatial layouts, different objects, different goals, long multi-step tasks).

- Average success: ScaleVLA **96.1%**, versus 90.7 to 94.0% for the five smaller backbones, and versus published systems π0 (94.2%), CoT-VLA (83.9%) and OpenVLA (76.5%). The gap is small here because everyone is near the ceiling.

**Generalization (the more interesting test).** **LIBERO-PRO** takes LIBERO tasks and changes things the model wasn't trained on (moved objects, swapped items, reworded instructions), with no retraining.

- ScaleVLA **45.1%** versus at most **31.3%** for the best smaller backbone (Cosmos 8B) and 23 to 29% for the 2B ones. Still low in absolute terms, but a 14-point jump is large.

**Kitchens.** **RoboCasa** is a simulated home-kitchen benchmark with lots of variety.

- With 30 demos per task: **30.7%** versus 22 to 26% for others. With 100 demos: **54.9%** versus 43 to 46%. The gap grew with more data rather than shrinking, which suggests the big brain isn't just a shortcut for low-data settings.

**Two-handed dexterity.** **DexJoCo**, five simulated tasks using two hands.

- With objects randomized: **42.1%** versus 32 to 38%. With everything randomized: 24.4% versus 22.1%, a much smaller edge. Assembly tasks stayed near zero for everyone (at most 1.3%).

**A real robot.** One two-armed task on real hardware: pick up a charger, hand it to the other arm, and insert the plug into a socket.

| Policy | Normal setup | Unfamiliar setup | Time to insert |
| --- | --- | --- | --- |
| 2B backbone + action head | 4/10 | 5/15 | 86 s |
| π0.5 backbone + same action head | 8/10 | 7/15 | 81 s |
| ScaleVLA (552B) | 9/10 | 8/15 | 58 s |

The authors note the gains were concentrated in the fiddly part: lining up the plug with the socket, which needs precise, contact-sensitive control.

**Why it's convincing.** The controlled design, the consistent direction of results across four benchmarks plus a real robot, and especially the "10 demos beats 50" sample-efficiency result.

## Limitations

- **Scale isn't perfectly isolated.** The giant model is also a different architecture (mixture of experts) and receives more input tokens (568 versus 212 for the small model). The authors say themselves they couldn't separate these effects from pure size.
- **Small real-world test.** One real task, 25 trials per policy, success judged by a human operator, and one training run (one random seed) per model.
- **Fixed training budget.** All models got the same number of training steps. The appendix notes the small model was still improving, so with longer training the gap might shrink.
- **Heavy hardware.** Four H200 data-center GPUs per robot brain is not something you put inside a robot or a home. It's a server-side setup.
- **Hard things stay hard.** Assembly, rearranged environments, and precise insertion in unfamiliar positions remain mostly unsolved, even at 552B.
- **The "π0.5" row isn't the real π0.5.** It's π0.5's backbone with this paper's action head, so it's not a fair comparison to Physical Intelligence's actual product model.
- **Release unclear.** The paper lists a project page but doesn't say whether code or trained models will be released.

## Where this is today

### How it IS used

- **The two-part design is the industry standard.** "Pretrained vision-language backbone + action module that outputs chunks of continuous motion" is how most VLAs are built today. Physical Intelligence's π0 pairs a roughly 3-billion-parameter vision-language model with a 300-million-parameter flow-matching "action expert" predicting about 50 future actions at a time. NVIDIA's open GR00T N1.7 (April 2026, 3B total) uses a 2B Cosmos-Reason2 backbone and a 32-layer diffusion transformer action head, and is the exact head ScaleVLA copied. Figure AI's Helix uses a similar split: a roughly 7B "slow thinking" model and an 80M fast controller.
- **Galbot, the company behind this paper, deploys robots commercially.** Its wheeled humanoid Galbot G1 started working in a Beijing pharmacy in March 2026 (finding, picking and packing medicines), and in September 2026 it opened three autonomous "GalbotStore" retail shops in Hong Kong run by a humanoid store manager that takes orders, fetches products and talks to customers. The paper doesn't say whether ScaleVLA runs in these products. Treat it as research from a company with real deployments, not as their product model.
- **The frozen-backbone idea has precedent.** Some VLAs (for example ChatVLA-2) already freeze their backbone during an action-only training stage. ScaleVLA's novelty is doing this at frontier scale and measuring the payoff.

### How it ISN'T used

- **Not in shipping robots, as far as I could find.** It was posted two days ago, and four H200s per robot is impractical for most deployments today.
- **Production VLAs stay small, on purpose.** Commercial systems favor 2B to 7B backbones because they need to run on the robot itself or cheaply, and because they want high control rates. Figure markets Helix as running onboard; Google released an on-device version of Gemini Robotics. ScaleVLA pushes in the opposite direction, so the likely real-world path is a cloud "big brain" or using the giant model to teach (distill into) a small one, which the paper does not test.
- **RT-2's "actions as text tokens" approach has largely been replaced.** RT-2 output motor commands as words in the model's vocabulary. Today's systems, including this one, use a separate action module producing continuous motion via diffusion or flow matching, which is smoother and more precise.

### Lineage

RT-2 (2023, a VLM fine-tuned to output actions as text) -> π0, GR00T, Helix (small VLM + flow-matching action expert) -> ScaleVLA (frozen frontier-size VLM + same action expert) -> likely next: cloud-hosted big brains or big models distilled into small onboard ones.

## Why it matters for Brendan

**Standard Physics.** Your scan-a-space accessibility check is a "spatial understanding" problem, not a robot-control problem, but this paper's central finding transfers: a frozen, very large vision-language model already encodes a lot of useful physical understanding (where things are, what fits where), and you can train a small task-specific head on top of it with few labeled examples. For Standard Physics, that suggests not training your own perception from scratch: use a strong pretrained vision model's features and train a small module that flags ADA issues (door widths, ramp slopes, clearance) from a modest number of labeled scans.

**Startups in general (the economics lesson).** The "10 demos beats 50" result is a business lesson as much as a technical one: when labeled data is your most expensive input, a stronger frozen foundation model can be cheaper overall even if it costs more to run. That trade-off (pay for compute, save on data collection) is one you'll face in Unstall and Amelia too, wherever getting real labeled examples from users is slow.

## Key terms

- **VLA (vision-language-action model)**: a robot brain that takes camera images and an instruction and outputs motor commands.
- **Frozen backbone**: a pretrained model used as-is, with its weights never updated during new training; only the parts added on top learn.
- **Action chunk**: a short sequence of upcoming robot movements predicted all at once, instead of one command at a time.
- **Flow matching**: a way to generate outputs by starting from random noise and moving it, in a few learned steps, toward a realistic result (here, a smooth motion).
- **Mixture of experts (MoE)**: a model made of many specialist sub-networks where only a few are used for each input, so a huge model can run with a fraction of its compute.
- **Sample efficiency**: how few examples a system needs to learn a task well.

## If you only have 10 more minutes

Read the **Introduction** for the argument in plain language, then look at the **sample-efficiency table (Table 7)** for LIBERO-Goal and LIBERO-Long at 5, 10, 25 and 50 demonstrations: it's the single clearest picture of what the bigger brain buys. If you have more time, read the **real-robot section (Table 8)** for the charger task. Skip the appendix training details and readout-layer choices unless you're implementing it.

## One question to think about

If a frozen frontier model already "understands" physical scenes well enough to teach a robot from ten demos, where should a startup spend its money: on collecting more demonstrations, on renting bigger models, or on figuring out how to shrink a big model's understanding into something small enough to run on a phone or a robot?

## Sources

- [ScaleVLA (arXiv 2611.21607)](https://arxiv.org/abs/2611.21607)
- [ScaleVLA full paper (arXiv HTML)](https://arxiv.org/html/2611.21607)
- [ScaleVLA summary on HyperAI](https://hyper.ai/en/papers/2611.21607)
- [NVIDIA Isaac GR00T N1.7 on the Hugging Face blog](https://huggingface.co/blog/nvidia/gr00t-n1-7)
- [Turing Post: VLA models explained](https://www.turingpost.com/p/vlaplus)
- [Pebblous: What is a VLA model? (2026 edition)](https://blog.pebblous.ai/project/PhysicalAI/physical-ai/en/)
- [CGTN: China's first pharmacy robot goes into service in Beijing (Galbot G1)](https://news.cgtn.com/news/2026-03-13/China-s-first-pharmacy-robot-goes-into-service-in-Beijing-1LtZ7juLcZ2/p.html)
- [The Standard: Galbot opens first autonomous retail stores in Hong Kong](https://www.thestandard.com.hk/news/article/342052/Mainland-embodied-AI-firm-Galbot-opens-first-autonomous-retail-stores-in-HK)
