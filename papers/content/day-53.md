---
day: 53
title: "VibePrevisBench: Evaluating Agentic Coding for 4D Scene Generation in Blender"
short_title: "VibePrevisBench (can AI agents block out your film in 3D?)"
authors: "Yuzhe Chen, Muxi Diao, Lele Yang and others, with Jiale Cao (Tianjin University, Kling AI, BUPT, Zhongguancun Academy, PolyU)"
year: 2026
link: "https://arxiv.org/abs/2611.15789"
track: "Frontier"
section: "Frontier"
tldr: "A new benchmark gives 11 frontier coding agents 242 film-style briefs (scripts, photos, reference videos) and asks each to build a moving 3D 'graybox' previs scene in Blender, then checks the scene's code against nearly 100,000 hidden facts: the best agent scores about 78 out of 100, camera work and reading reference images are the weak spots, and agents routinely look at their own renders, say 'looks right', and leave the errors in."
---

# Day 53: VibePrevisBench: Evaluating Agentic Coding for 4D Scene Generation in Blender

Yuzhe Chen, Muxi Diao, Lele Yang, Wenbin Xu, Xuyang Liu and 17 others, with Jiale Cao as senior author (Tianjin University, Kling AI, Beijing University of Posts and Telecommunications, Zhongguancun Academy, The Hong Kong Polytechnic University). Posted to arXiv November 11, 2026 (cs.CV). [Read the paper](https://arxiv.org/abs/2611.15789). Project page: [vibeprevisbench.github.io](https://vibeprevisbench.github.io/). Track: Frontier.

This brief is built from the full paper (PDF from the project page), plus current product pages for the "Blender to AI video" workflows it is measuring.

## TL;DR

The hottest new AI filmmaking workflow is: have a coding agent build a rough, untextured 3D version of your scene in Blender, render it, and hand that render to a video model to "paint" the final look. This paper is the first serious test of the first half of that pipeline, and it finds that today's best agents get staging mostly right but still botch camera angles, unusual camera moves and details mentioned only in prose, and are bad at noticing their own mistakes.

## What it builds on

From the foundations track: the Transformer (Day 9) and GPT-3 (Day 11) are the ancestors of every agent tested; ReAct (Day 18) is the "think, act, look at the result, think again" loop the agents run inside Blender; diffusion (Day 12) is the engine of the video model that turns the rough render into finished footage; NeRF (Day 13) and Gaussian Splatting (Day 20) belong to the same family of "rebuild 3D from images" ideas the benchmark uses to extract ground truth from real videos; CLIP (Day 15) is the early version of the image-plus-language models that act as the judge. On the frontier track it sits right next to Day 26 (3DCodeVerse, 3D worlds written as code), Day 25 (OpenGCUA, agents that write code to operate software) and especially Day 32 (FilmFlow, an AI camera crew in a virtual set). FilmFlow showed agents *could* do virtual cinematography; this paper measures how well they actually do it.

## The world before this paper

Text-to-video models in 2026 (Seedance, Kling, Veo, Runway) make gorgeous shots but are hard to *direct*: you type "low-angle orbit around the actor as she crosses to the window" and get something roughly like it. Filmmakers have long solved this problem with **previs** (previsualization: a rough, often untextured 3D version of a scene, made before shooting, to lock down where everyone stands, how they move and where the camera goes). The new trick is to feed a previs render into a video model as a structural guide. But building previs takes trained 3D artists, so people started asking AI coding agents to write the Blender code instead. The catch: nobody could say how good those agents were. Existing 3D benchmarks used single objects or static rooms, short clips, and judged only whether the final picture "looked right," never whether the underlying scene was actually correct.

## Core ideas

### 1. The graybox proxy: separate "where things are" from "what things look like"

**What it is.** A **graybox proxy video** is a render of a scene made only of plain gray boxes and simple shapes: a box for the sofa, a capsule for the actor, a camera moving through it. No textures, no lighting finesse. It carries the **layout** (where things are), the **motion** (who moves where, when) and the **camera** (angle, lens, movement, cuts), and nothing else.

**How it works in the pipeline.**

1. You write a brief ("Two coworkers argue in an open-plan office; she storms toward the elevator; cut to a high angle as the doors close").
2. A **coding agent** (an AI model that writes and runs code on its own, revising as it goes) writes a Blender Python program that builds the scene and animates it.
3. Blender renders the graybox video.
4. A **controllable video generation** model (a video model that accepts extra guidance beyond text, here Seedance 2.5) takes the graybox as a reference and paints realistic people, materials and light onto that exact staging.

The paper calls the scene a **4D scene**: 3D space plus time. Every object has a position and orientation on every frame.

**Analogy.** It's a stage rehearsal in street clothes on a bare set with tape marks on the floor. Everyone knows their blocking, the camera operator knows the moves, and *then* costumes and lighting arrive. The video model is costumes and lighting. The agent is the director running the bare-stage rehearsal.

**Why it matters.** Errors in the graybox don't get fixed downstream; they get beautifully rendered. The paper's Figure 2 shows a weak agent's wrong high-angle camera and missed turns faithfully reproduced in the final Seedance video. So if you care about directing AI video, the quality of this rehearsal is the bottleneck.

### 2. The benchmark: 242 film-style briefs across four kinds of input

**What it is.** VibePrevisBench gives an agent a brief plus a list of named places and subjects and output specs (frame count, frame rate, resolution), and asks it to deliver an executable Blender program and its rendered proxy video. Tasks come in four flavors:

- **Scripts (94 tasks)**: prose only, like a screenplay scene.
- **Reference videos (86)**: "rebuild this real clip's staging and camera."
- **Photos (39)**: one to five photos of a real space to rebuild, then stage action in.
- **Continuations (23)**: an opening frame plus a description of what happens next.

They span seven everyday domains (homes, offices, streets, shops, industry, sports, nature) and 33 kinds of places. These aren't toy tasks: the median output is about **40 seconds** long, most tasks have **multiple shots**, and the median brief is 368 words.

**How the "answer key" was made.** Each task has hidden **ground-truth facts** (things that must be true in a correct scene, like "the chair is left of the desk" or "shot 3 is from above head height").

- For scripts, the facts come from the scene the script was written from.
- For photos, they come mostly from 3D scan datasets where real object boxes and camera positions were measured.
- For videos, an automated pipeline of 3D-from-video tools (object segmentation, 3D reconstruction, human pose tracking) estimates the facts, and anything that can't be verified is marked unscorable and dropped.

In total: about **99,000 checks**, a median of 408 per task.

**Analogy.** It's like a film school assignment with a strict continuity supervisor holding a secret 400-line checklist for every scene.

### 3. Two kinds of grading: check the scene, then check the screen

This is the paper's cleverest design choice.

**Scene Check (rule-based).** The grader re-runs the agent's code, exports the exact 4D scene, and compares it to the hidden facts with deterministic rules (same input, same score, every time). Nine dimensions:

- **Entities**: is every listed subject and prop there, with the right type and count?
- **Layout**: relative positions, sides, distances, depth, left-to-right order on screen.
- **Spaces**: the rooms or areas, their size, how they connect.
- **Picture structure**: does each shot's depth and composition match the reference frames? (Only for tasks with reference images.)
- **Routes**: where each subject is over time, and the order and direction of places they visit.
- **Events**: does each action happen, when, in what order, with what posture and gait?
- **Camera**: per-shot position, height, facing, lens, who's in frame, and camera moves.
- **Cuts**: number of shots, cut times, transitions, shot length.
- **Physical validity**: nothing passing through walls, floating, teleporting or wildly mis-sized.

Scores are **chance-corrected**: the graders shuffle object placements to see what a random scene would score, and only credit the agent for doing better than that. Missing objects aren't a free pass either.

**Screen Check (judged by a vision-language model).** A **VLM** (vision-language model, an AI that reads images or video and text together) watches the proxy video at two frames per second. Here it's Gemini 4, with agent and object names hidden. It first writes a **blind recap** of the clip without seeing the brief. Then it gets the brief and a checklist built only from facts that already *passed* Scene Check, and rates each item yes, partial or no on four things: can you recognize the shapes and places, can you read the action, is the important thing visible at the key moment, do the story beats land?

**Why two checks?** Because a scene can be technically correct and still unreadable (the actor does sit down, but behind a pillar), or look fine in one frame while being wrong in 3D. The final score is simply the average: Overall = (Scene + Screen) / 2.

**Analogy.** Scene Check is the script supervisor with a tape measure. Screen Check is a test audience: "could you actually tell what happened?"

### 4. A fair, realistic harness for the agents

Each agent got Blender 5.2 on an 8-core machine with no GPU, a four-hour time limit, no internet, no outside 3D assets and no access to the grader. GPT models ran in OpenAI's Codex CLI; all others ran in Claude Code. A small toolkit let agents tag objects with the task's IDs so the grader knew which box was "Maria" and which was "the elevator." Agents could write code, render previews, look at frames and revise, which is exactly how a person would use these tools today.

## What they showed

**The scoreboard (Overall out of 100):**

| Agent | Scene | Screen | Overall |
| --- | --- | --- | --- |
| GPT-6 Astra | 70.0 | 85.4 | 77.7 |
| GPT-6.1 Sol | 69.0 | 83.1 | 76.1 |
| Gemini 4 Argon | 68.4 | 81.7 | 75.0 |
| Claude Opus 5.5 | 68.4 | 79.8 | 74.1 |
| GPT-5.6 Sol | 62.9 | 77.5 | 70.2 |
| DeepSeek V4.1 Flash | 61.3 | 77.9 | 69.6 |
| Kimi K3 | 61.5 | 73.5 | 67.5 |
| Gemini 3.8 Flash | 60.7 | 68.7 | 64.7 |
| GLM 5.3 Flash | 57.8 | 69.5 | 63.7 |
| Doubao Seed 2.1 Pro | 56.3 | 66.2 | 61.3 |
| Muse Spark 1.3 | 57.2 | 65.0 | 61.1 |

Nobody comes close to solving it. Even taking the *best* agent's result on every single task, the combined score only reaches 80.6.

**Finding 1: seeing is what separates the leaders.** The gap between best and worst agents grows from 12 points on text-only scripts to about 20 points on photo tasks. On "picture structure" (matching a reference image's composition), the top four score 66 to 71 while the rest score 24 to 38. In other words, the frontier models can *read* a photo of a room and rebuild it; the cheaper models mostly can't.

**Finding 2: the basics are fine, the hard asks get flattened.** This is the part a filmmaker should memorize:

- When the reference was shot from a **low angle**, 66% of the agents' shots came out at plain eye level anyway.
- Only **4% of orbits stayed orbits**; 47% turned into simple sideways moves.
- Every agent put **32 to 41% of shots at the wrong camera height**.
- Objects mentioned only in the prose went missing **35%** of the time, versus 11% for objects in the explicit list.
- Only **36%** of annotated story events were both correct in the scene *and* visible on screen. A test that delayed all action by just 4 seconds cost 9.8 points, so timing matters.

**Finding 3: agents look, but don't fix.** Agents viewed 13 to 40 rendered images per run, but looking more barely helped. In 1,377 of 2,582 runs where agents commented on their renders, they claimed the render matched the brief, and those runs had camera and event errors about as often as everyone else. It's the AI version of an assistant director glancing at the monitor and saying "great, moving on."

**Cost.** Per task, from $0.73 (GLM 5.3 Flash) to $32.59 (GPT-6 Astra). GPT-6.1 Sol got 98% of the leader's score for 21% of the cost.

**Why it's convincing.** The rule-based grading is reproducible and checks the actual 3D scene, not just a vibe from the pixels; the tasks are long and multi-shot like real scenes; and the findings are specific enough to act on.

## Limitations

- **The judge has a horse in the race.** Gemini 4 is the Screen Check judge and also helped build some ground truth; the authors measured a 1.3-point advantage for its own model family.
- **Small slices.** The photo ranking rests on only 39 tasks, and some ablations cover one agent and five tasks.
- **Automated answer keys for videos.** Facts extracted from real videos come from a 3D-reconstruction pipeline, which can be wrong; unverifiable facts are dropped, which may skew toward easier facts.
- **Correlation, not cause.** The "look but don't fix" finding is observational; the authors say so.
- **Only boxes.** The benchmark deliberately ignores appearance, lighting, performance nuance and acting. It measures blocking and camera, which is the point, but it isn't a measure of a good film.
- **Not tested end to end at scale.** The paper shows examples of proxy errors flowing into Seedance 2.5 videos, but doesn't score the final generated videos across the benchmark.

## Where this is today

### How it IS used

- **Agent plus Blender is a real workflow right now.** BlenderMCP (now published as mcp-for-blender) is an open-source bridge that lets Claude and other models create objects, run Blender Python and look at viewport renders. It has about 33,000 GitHub stars. Creators publish exactly the pipeline this paper studies: for example, a September 2026 write-up builds a 10-second skateboard ad animatic with Claude, Blender and MCP, then uses it as a motion guide for a video model.
- **Video companies built product around it.** ByteDance's Dreamina offers a Blender "Clay Renderer" plugin that renders your scene as a clay (graybox) video and uploads it as a reference for Seedance 2.5, and its own guide starts from a scene built with GPT-6 Astra. Krea's Seedance Studio and BudgetPixel Previs generate simple 3D scenes from text and use the flythrough as Seedance's camera reference.
- **Game engines are adding the same hooks.** Unreal Engine 5.8 (June 2026) shipped an experimental MCP plugin that lets any LLM operate levels, assets and materials, and Epic demoed Claude Code furnishing a virtual apartment. Unreal Engine 6 plans built-in model integrations.
- **The benchmark itself** is public: code on GitHub and tasks on Hugging Face, released with the paper.

### How it ISN'T used

- **Professional previs is still artist-driven.** Studios like The Third Floor build previs with human artists in tools like Unreal and Maya; I found no evidence of a major studio handing previs to coding agents. This paper's numbers (a third of shots at the wrong camera height) explain why.
- **Many AI video tools skip 3D entirely.** Higgsfield Cinema Studio and LTX Studio, for example, control the camera with presets and keyframes inside the video model, with no 3D scene to check. That's faster but gives you no verifiable layout.
- **"Vibe" previs is not production previs.** Even the vendors' own pages say the render is a reference, not a replacement for a real Blender pipeline, and that you must check the scene yourself.

### Lineage

Hand-built previs in Maya and Unreal -> text-to-video with vague camera prompts (Sora, early Kling) -> coding agents build graybox scenes that steer a video model (BlenderMCP, Dreamina Clay Renderer + Seedance 2.5) -> benchmarks that grade the scene, not just the pixels (VibePrevisBench).

## Why it matters for Brendan

**As a filmmaker.** This is a cheat sheet for working with AI previs today. Write camera height, angle and moves *explicitly and as a list*, not buried in prose (prose-only details went missing three times as often). Expect orbits, low angles and precise timing to be flattened, and check those first. Never trust the agent's own "the render matches" line; do the item-by-item check the authors recommend. And pick the model by the task: if you're rebuilding a location from photos, the gap between frontier and cheap models is huge; for text-only blocking, a cheaper model gets you most of the way.

**Standard Physics.** Two of the benchmark's ideas transfer directly. First, rebuilding a real space from photos is exactly where agents differ most, and the best ones still miss; your scan-then-check pipeline will need a measured 3D source (like the scan datasets they used) rather than trusting a model's reading of photos. Second, the Scene Check design (export the 3D scene, then check hidden facts with deterministic rules plus a physical-validity pass) is essentially what an ADA checker does: "is the doorway at least this wide, is there a clear turning circle." Rules on geometry, not a model's opinion of a picture, is the trustworthy way to grade a space.

## Key terms

- **Previs (previsualization)**: a rough 3D version of a scene, made before shooting, to plan blocking, movement and camera.
- **Graybox proxy video**: an untextured render of plain shapes that carries only layout, motion and camera, used to steer a video model.
- **4D scene**: a 3D scene plus time, where every object has a position and orientation on every frame.
- **Coding agent**: an AI model that writes code, runs it, looks at the result and revises on its own, here inside Blender.
- **Scene Check vs Screen Check**: grading the actual 3D scene against hidden facts with fixed rules, versus having a vision-language model judge whether the rendered video is readable.
- **Chance correction**: subtracting what a random arrangement would score, so agents only get credit for real accuracy.

## If you only have 10 more minutes

Read **Section 4.3 (Observations and implications)**: it's short, concrete, and contains the camera-height, orbit and "look but don't fix" numbers. Then look at **Figure 2** for a picture of how a weak proxy ruins the final Seedance video. If you have a few more minutes, skim **Appendix A.2 (Task examples)** to see what a real brief looks like. Skip Section 3.3 and Appendix B.2 (the scoring and chance-correction math) unless you plan to build a benchmark yourself.

## One question to think about

The agents in this paper were bad at catching their own mistakes, even when they looked at the render. If you were designing the next version of this pipeline, would you rather give the agent a second "script supervisor" agent with a strict checklist, or keep a human director in the loop only at the graybox stage, and what would each choice do to the cost and creative feel of making a short film?

## Sources

- [VibePrevisBench (arXiv 2611.15789)](https://arxiv.org/abs/2611.15789)
- [VibePrevisBench full paper (PDF, project page)](https://vibeprevisbench.github.io/VibePrevisBench.pdf)
- [VibePrevisBench on GitHub](https://github.com/vibeprevisbench)
- [VibePrevisBench tasks on Hugging Face](https://huggingface.co/datasets/AidanYuzhe/vibeprevisbench)
- [BlenderMCP / mcp-for-blender on GitHub](https://github.com/ahujasid/blender-mcp)
- [Tau Home: Building a 3D previs workflow for AI video with Claude and Blender MCP (Sept 2026)](https://tau-home.com/en/post/claude-blender-mcp-ai-video-previs-workflow/)
- [Dreamina: Turn GPT-6 Astra Blender scenes into videos with Seedance 2.5](https://dreamina.capcut.com/seedance/seedance-2-5-blender-model-workflow)
- [BudgetPixel: Best AI previs tools 2026 (vendor comparison, Oct 2026)](https://budgetpixel.com/learn/best-ai-previs-tools)
- [The Next Web: Epic is building Claude and Gemini into Unreal Engine 6](https://thenextweb.com/news/epic-unreal-engine-6-ai-claude-gemini)
- [The Third Floor: what we do](https://thethirdfloorinc.com/what-we-do/animation)
