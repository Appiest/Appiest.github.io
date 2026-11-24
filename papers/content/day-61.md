---
day: 61
title: "Coda-DaVinci: Reimagining Video Generation with Code2Video"
short_title: "Coda-DaVinci (an AI builds a rough 3D scene first, then films it)"
authors: "Yiyan Ji, Qixun Wang, Yang Shi and 20 others (Nanjing University, KlingAI Research, Peking University, HKUST, HKU, Tsinghua)"
year: 2026
link: "https://arxiv.org/abs/2611.26595"
track: "Frontier"
section: "Frontier"
tldr: "Instead of asking a video model to invent a whole scene from a sentence, Coda-DaVinci has an AI agent first build the scene as rough 3D in Blender (with real physics where it helps), then hands that \"stand-in\" video to the video model as a guide, and it learns when to skip the 3D step entirely, which sharply improves instruction following, continuity and physics."
---

# Day 61: Coda-DaVinci: Reimagining Video Generation with Code2Video

Yiyan Ji, Qixun Wang, Yang Shi and 20 co-authors from Nanjing University, KlingAI Research, Peking University, HKUST (Guangzhou), the University of Hong Kong, HKUST and Tsinghua. Submitted to arXiv on November 19, 2026. [Read the paper](https://arxiv.org/abs/2611.26595). Track: Frontier.

A note on sourcing: arxiv.org rate-limited every request from this run, so this brief is built from the official project page, the paper's pages on alphaXiv and hyper.ai (abstract plus section text), and the authors' GitHub repo. The numbers below come from the project page's main table. Where I couldn't confirm a detail, I say so.

## TL;DR

Today's AI video models are amazing at making things look real but bad at doing exactly what you asked and keeping the world consistent; Coda-DaVinci fixes much of that by having an AI "previs artist" build a rough 3D version of the shot first and letting the video model paint over it, while being smart enough to skip the 3D step when it would make motion look stiff.

## What it builds on

From the foundations track: **diffusion models (Day 12)** are the video generator underneath, and **ReAct (Day 18)** is the agent pattern (think, use a tool, look at the result, try again). From the frontier track, it's a close cousin of **3DCodeVerse (Day 26)**, which built 3D worlds as code, **FilmFlow (Day 30)**, an AI camera crew that reviews and reshoots, and **VibePrevisBench (Day 52)**, which tested whether agents can block out a film in Blender. Coda-DaVinci is the step where that Blender previs actually becomes the final shot.

## The world before this paper

Video models like Seedance, Kling, Veo and Sora work in **pixels**: you give a sentence, and the model has to guess the layout of the room, where every object sits, how things move and what they look like, all at once. That's why they still struggle with three things the paper names: **detailed instruction following** (you said five leaves get swept, not "some leaf-ish motion"), **scene-state consistency** (the camera turns away and comes back, and the cleaned steps are dirty again), and **physically plausible interactions** (objects pass through each other or fall wrong).

A fix had started to emerge called **Code2Video**: have an AI agent write code that builds a simple 3D version of the scene (a "proxy"), render it, and give that render to the video model as a guide. Show Lab's original Code2Video (2025) did this for educational animations using Manim, a math animation library. Creators were doing a hand-made version too, building rough Blender scenes and uploading them to Seedance as a reference. But nobody had carefully answered the practical questions: **how detailed** should the proxy be, does **physics simulation** help, how should you **word the prompt**, and when is the whole approach a bad idea? Overly detailed proxies, it turned out, can pass their own errors and stiffness straight into the final video.

## Core ideas

**Some terms first.**

- A **video diffusion model** is an AI that makes video by starting from random noise and cleaning it up step by step until it matches the prompt (Day 12, extended to moving images). Here the model is **Seedance 2.5** from ByteDance.
- A **proxy** (or 3D proxy) is a rough stand-in for the real scene: gray boxes for furniture, simple shapes for people, roughly the right positions and motion, no realistic textures. Think of a **clay render** or an animatic.
- **Blender** is a free, open-source 3D program. It can be fully controlled by code, which is what lets an AI agent build scenes in it.
- **Previs** (previsualization) is the film practice of blocking out shots in rough 3D before shooting.
- An **agent** is an AI model that works in a loop, calling tools and checking its own results. Here the lead agent is a frontier language model (the paper uses GPT-6 Astra).

### 1. Build the shot as code first, then let the video model paint it

**What it is.** The video model no longer has to invent structure. An agent writes code that builds the scene in Blender: the room, the objects, where people stand, the camera path. Blender renders a plain-looking proxy video. That proxy, plus a text prompt and any reference images, goes into the video model, which keeps the structure and adds realism.

**How it works, step by step.**

1. The agent reads your request and any reference media.
2. It builds the scene in a **shared Blender workspace**. For big jobs, a lead agent hands separable pieces (say, "model the staircase") to **coding sub-agents** and then assembles their assets.
3. Blender renders the proxy video.
4. The agent **watches its own proxy** and checks it against the shot description. If the events are wrong (the leaves never get swept), it fixes the code before spending money on video generation.
5. The proxy, a prompt and the references go to Seedance 2.5, which produces the final video.

**Analogy.** It's the difference between telling a painter "paint a busy café" and handing them a photo of a café you staged with cardboard cutouts. The painter still makes it beautiful, but now the tables are where you wanted them.

**Mental picture.** The authors' headline demo: someone clears fallen leaves off a flight of steps while the camera drifts away and comes back. Asked directly, Seedance produced steps that were still largely covered in leaves after the camera returned, because the model "forgot" what had happened. With the Blender proxy, the leaves are tracked as actual objects, so when the camera comes back, the steps are clean.

### 2. Use the right amount of detail for each thing in the scene

This is the paper's most interesting finding. They ran controlled experiments with blinded human judges and found a **trade-off**:

- **Coarse proxies** (very rough, mostly "a person is here, facing this way") produce more **natural motion**. The video model has freedom to animate a body realistically.
- **Medium-grained proxies** (real shapes, rigid objects with collision geometry) produce better **consistency**: things stay where they should and keep their state.
- **Too much detail** backfires: the proxy's stiff, simplified animation gets copied into the final video, and errors in the 3D model become errors in the film.

So Coda-DaVinci picks detail **per entity** (per thing in the scene). In the paper's terms, environments and structured objects get a **G1 policy** (medium detail: solid shapes, collisions), while **human subjects get a G0 policy** (coarse: just position and which way they're facing). The furniture is pinned down precisely; the actor is a suggestion.

**Analogy.** A good director gives the set designer exact measurements, but tells the actor only "start by the window, end at the door," and lets them find the performance.

### 3. Real physics, and prompts tied to the proxy

**Physics.** When the request involves collisions, falling, deformation or cause and effect, Blender's physics engine simulates it, so the proxy shows a ball actually bouncing off the wall rather than an AI's guess. The video model then inherits physically correct motion.

**Grounded prompting.** The agent also rewrites the text prompt so each description is **linked to a specific proxy object** and its appearance reference ("the tall gray box on the left is the oak bookshelf in reference image 2"). The paper calls this best prompting setup **PE2**. Without this link, the video model can't tell which gray shape is supposed to become what.

The overall best recipe in the controlled study was medium proxies, with physics, with proxy-aligned prompting.

### 4. Know when not to use 3D at all, and check the work

**Task routing.** Some shots are mostly about natural body movement (a dancer, someone stretching). A crude proxy only makes these stiffer. So before building anything, the agent **routes** the task: shots that need precise structure or motion control go down the 3D path; shots centered on natural human motion go straight to the video model with a carefully written action and camera prompt.

**Review and repair.** After generating, the system compares final frames side by side with proxy views. If the problem is in the 3D (wrong object placement), it fixes the scene code. If the problem is in the generation (wrong texture, a face drifting), it changes the prompt or references. Finally an **independent acceptance agent**, a separate AI judge, checks task success, human motion, scene consistency and visual quality, and the loop repeats until it passes. The ablations show this independent check matters most for consistency.

**Analogy.** A film production with a script supervisor (catches continuity errors), a director who decides "this shot needs a set build, that one we just shoot handheld," and a producer who signs off before anything leaves the building.

## What they showed

Every method used the same video model (Seedance 2.5), so the differences come from the harness around it. Coda-DaVinci versus plain direct generation:

| Test | What it measures | Direct | Coda-DaVinci |
| --- | --- | --- | --- |
| VTR checklist | Did it do each thing asked? (higher better) | 85.15 | 91.42 |
| VTR word error rate | Mistakes in the words the video should contain (lower better) | 59.21% | 11.08% |
| R2M scene identity | Does the scene stay the same place? (higher better) | 0.347 | 1.011 |
| R2M state | Do changes stick, like swept leaves? (higher better) | 0.159 | 0.875 |
| World Models' Last Exam, Physics | Physical plausibility (higher better) | 47.16 | 60.77 |
| T2AV-Compass realism | How real it looks (higher better) | 71.38 | 70.26 |

(I couldn't confirm what the VTR acronym stands for from the sources I could read.)

**What's convincing.** The consistency scores roughly **triple**, and the "state" score (does the world remember what happened) jumps more than fivefold. That's exactly the weakness pixel-only models have. Word errors drop from more than half to about one in nine.

**What's honest.** Realism dips slightly: direct generation still looks a bit more real. And on physics, a simpler baseline (Claude + Blender, scoring 65.52) actually beat Coda-DaVinci. The paper also compared rendering engines: **Blender beat Three.js** (a web 3D library) on quality but cost about **twice the agent tokens**.

**Long videos.** On 29 long multi-event cases and 50 game-scene cases, it improved event completion and consistency. One example: a game screen goes black, then the gamer slams the desk and stands up. Direct generation later "magically" restores the game picture; Coda-DaVinci keeps the screen black.

The controlled study used ten blinded human evaluators scoring consistency, instruction following, physics and naturalness on a 0 to 3 scale across three benchmarks.

## Limitations

- **Long videos still wobble** at transitions between clips, and stick to scene settings less reliably than you'd want. The video model can loosen the proxy's control at clip boundaries.
- **Fine human motion remains hard.** Hands, subtle gestures and body mechanics are exactly what crude proxies can't specify, which is why the system often hands people back to the video model.
- **Slightly less realism** than letting the video model run free, and **not the best on physics**.
- **Cost and speed.** A lead agent, sub-agents, physics simulation, rendering, several judges and repair loops is far more compute than one generation call.
- **Not released yet.** The GitHub repo lists Coda-DaVinci's code as "coming soon," under a non-commercial academic license.
- **Evaluations are partly AI-judged** and partly on benchmarks the broader community hasn't settled on.

## Where this is today

### How it IS used

- **The manual version is already a creator workflow.** Curious Refuge published a tutorial on having Claude drive Blender through the official Blender MCP connector to block out a scene, then uploading the rough animatic to Seedance 2.5 as a reference. It even warns Seedance can follow the Blender reference "almost too closely," which is the stiffness problem this paper quantifies.
- **Seedance 2.5 itself** (ByteDance, launched July 31, 2026) accepts up to 30 images, 10 video clips and 10 audio clips as references, explicitly including **clay renders** (textureless 3D that sets layout, pose and camera). The model was built to take proxies.
- **Commercial previs-to-video tools** now exist: BudgetPixel Previs plans a shot as a clay 3D preview and renders it through Seedance 2.5; Krea's Seedance Studio has a scene agent that builds a simple 3D scene from text and uses the flythrough as the camera reference; Intangible offers browser-based previs and camera blocking that renders through Luma, Kling, Seedance or Veo. (This list comes from a vendor's own roundup.)
- **AI-made 3D assets** for proxies: Autodesk Flow Studio (formerly Wonder Dynamics) added Wonder 3D in March 2026 for text- and image-to-3D.
- **Show Lab's Code2Video** (2025) is the conceptual ancestor, generating educational videos with Python and Manim using a planner, coder and critic agent.

### How it ISN'T used

- **Automatic routing and per-entity detail aren't in products yet.** Today's tools make you decide how much to build in 3D; none I found pick detail per object or skip 3D for motion-heavy shots on their own.
- **Physics simulation inside previs-for-AI tools is rare.** Current tools mainly lock camera and blocking, not simulated collisions.
- **Pure pixel generation isn't being abandoned.** For natural human performance, the paper itself concludes that direct generation is often better, and products keep investing in it.
- **Closed integration gaps.** A September 2026 Nexscope write-up of a GPT-6 plus Blender plus Seedance pipeline notes the connections are still manual or need custom integration.

### Lineage

Hand-built film previs (decades old) -> educational Code2Video with Manim (2025) -> creators hand-feeding Blender animatics and clay renders to Seedance 2.5 (2026) -> Coda-DaVinci: an agent that decides when to build 3D, how much, with physics, and checks its own work -> what you'll likely use: a video tool where you describe a scene and it quietly builds and simulates a set before it "shoots."

## Why it matters for Brendan

**Your filmmaking.** This is the most directly usable paper for you in a while, because the manual version works today: Blender (free) plus Claude through the Blender MCP connector plus Seedance 2.5. The paper hands you the craft rules for that workflow: **block the set precisely, leave the actors rough**, add physics when objects interact, name each gray box in your prompt ("the left cube is the bookshelf in image 2"), and for performance-driven shots, skip the 3D and write a good action and camera prompt instead. It turns "AI video is a slot machine" into "AI video is a production with a set."

**Standard Physics.** Your app already captures real spaces as 3D from a phone scan. A scanned room is a ready-made, medium-grained proxy. That suggests a feature: show a client a realistic video of their actual space after an ADA fix (a ramp added, a doorway widened), generated from the scan plus the change, with the geometry locked so it's honest about dimensions. Coda-DaVinci's evidence that proxies triple scene consistency is exactly what you'd want for something that has to be accurate, not just pretty.

## Key terms

- **Code2Video**: making videos by having an AI write code that builds a scene, then turning the render into the final video.
- **3D proxy**: a rough stand-in scene (simple shapes, right positions and motion) used as a guide for the video model.
- **Proxy granularity**: how detailed the proxy is, from coarse (position and facing only) to medium (solid shapes with collisions).
- **Task routing**: deciding per request whether to build a proxy at all or generate directly.
- **Grounded prompting (PE2)**: a prompt that links each description to a specific proxy object and reference image.
- **Acceptance agent**: an independent AI judge that must approve the video before the loop stops.

## If you only have 10 more minutes

Read the **controlled study on proxy granularity, physics and prompting**: it's the transferable craft knowledge and why the paper exists. Then look at the **project page's side-by-side videos** (the leaf-clearing and black-screen examples), which make the consistency gains obvious in seconds. Skip the benchmark descriptions and the Blender versus Three.js cost comparison unless you're building a pipeline.

## One question to think about

The paper found the best results come from pinning down the world precisely but leaving people loose. In your own films, which parts of a shot do you want the AI to obey exactly, and which parts do you want it to surprise you with, and how would you tell it the difference?

## Sources

- [Coda-DaVinci paper (arXiv 2611.26595)](https://arxiv.org/abs/2611.26595)
- [Coda-DaVinci project page](https://coda-davinci.github.io/)
- [Coda-DaVinci on alphaXiv](https://www.alphaxiv.org/abs/2611.26595)
- [Coda-DaVinci on hyper.ai](https://hyper.ai/en/papers/2611.26595)
- [Coda research series on GitHub](https://github.com/FrankYang-17/Coda)
- [ByteDance Seed: Introducing Seedance 2.5](https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5)
- [Curious Refuge: How to Control AI Video Camera Movements With Blender and Claude](https://curiousrefuge.com/blog/how-to-control-ai-videos-with-blender-and-claude)
- [BudgetPixel: Best AI Previs Tools 2026](https://budgetpixel.com/learn/best-ai-previs-tools)
- [Nexscope: How GPT-6 and Seedance 2.5 Work Together to Create Videos](https://www.nexscope.ai/blog/how-gpt-6-and-seedance-2-5-work-together-to-create-videos)
- [Autodesk: Introducing Wonder 3D in Flow Studio](https://blogs.autodesk.com/media-and-entertainment/2026/03/04/introducing-wonder-3d-text-and-image-to-3d-in-flow-studio/)
- [Show Lab: Code2Video](https://showlab.github.io/Code2Video)
- [Hugging Face Daily Papers, week 47 of 2026](https://huggingface.co/papers/week/2026-W47)
