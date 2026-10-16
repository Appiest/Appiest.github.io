---
day: 22
title: "Any Time, Any Space: A World-State-Centric Framework for Agentic Video Generation"
short_title: "ATAS (video world memory)"
authors: "Weijie Wang, Haomin Zhang, Ye Li, Akide Liu, Zeyu Zhang, Haoyu Zhao, Yefei He, Donny Y. Chen, Feng Chen, Bohan Zhuang (Zhejiang University and collaborators)"
year: 2026
link: "https://arxiv.org/abs/2610.20571"
track: "Frontier"
section: "Frontier"
tldr: "Give an AI film director a memory of the set's 3D geometry and a time-stamped log of what happened in each scene, only let verified shots into that memory, and its long videos stay consistent when it returns to a place or replays a moment, on top of any video generator."
---

# Day 22: Any Time, Any Space: A World-State-Centric Framework for Agentic Video Generation

Weijie Wang, Haomin Zhang, Ye Li, Akide Liu, Zeyu Zhang, Haoyu Zhao, Yefei He, Donny Y. Chen, Feng Chen and Bohan Zhuang, Zhejiang University and collaborators, submitted October 14, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.20571). Code (MIT license): [github.com/ziplab/ATAS](https://github.com/ziplab/ATAS). Track: Frontier, the first frontier paper. It was the #1 paper of the day on Hugging Face Daily Papers, with over 300 upvotes in its first two days.

## TL;DR

Today's video models can make a gorgeous 10 second clip but have no idea what the room looked like three shots ago; ATAS wraps any video model in a "continuity department" that keeps a 3D map of every location and a time-stamped log of every event, feeds the right evidence into each new shot, and only lets a shot update that memory after it passes checks.

## What it builds on

This is the series coming together in one system. Diffusion (Day 12) is the engine inside the video generators it uses. NeRF (Day 13) and 3D Gaussian Splatting (Day 20) are the reason it is now practical to rebuild a 3D scene from video and re-render it from a new camera. RAG (Day 14) is the template for "look up evidence first, then generate." ReAct (Day 18) is the template for an agent that plans, acts, checks the result and updates its state. And the Transformer (Day 9) runs underneath nearly all of it.

## The world before this paper

By late 2026, single clips from models like Wan 3.0, Kling 3.0, MiniMax H3 and Google's Gemini Omni look close to real footage. The problem is a film is not one clip. A short film might be 30 to 100 shots, and each video model only makes 4 to 15 seconds at a time, so someone has to stitch shots together. The first wave of "video agents" (systems like MovieAgent, VGoT and Mora) used a language model to break a script into shots and then called a video generator for each one. To keep things consistent, they passed forward text prompts ("a cozy wooden cabin with a stone fireplace") or the last few frames of the previous shot. That works for shot 5 following shot 4. It breaks when shot 40 returns to the cabin from shot 3, because nothing in the system actually remembers what the cabin looked like, where the couch was, or that someone lit a fire in it. The fire vanishes, the couch moves, the window switches walls. Filmmakers call this a continuity error, and on a real set an entire job (the script supervisor) exists to prevent it. Video agents had no script supervisor.

## Core ideas

### 1. Compile the screenplay into precise shot requests

**What it is.** Before generating anything, ATAS turns the screenplay into a schedule of **shot requests**. Think of a shot request as a work order for one shot that says not just what happens but exactly where and when it sits in the story world.

**How it works.** A compiler (driven by a language model) reads the screenplay and splits it recursively: first by scene, then by spatial relationships, timing, events and camera needs, until each piece is small enough for one generation (that is what "bounded" means here). Each shot request carries six fields:

- a short **local description** ("she kneels and strikes a match")
- a **scene ID** (which location: "cabin living room")
- a **spatial anchor** (a fixed reference point in that location, like "by the fireplace")
- a **target camera** (where the camera is and where it points)
- a **time interval** (when in story time this shot happens)
- an optional **event ID** (a named story moment it refers back to, like "the fire being lit")

**Analogy.** It is the difference between a director saying "make another shot of the cabin" and a first assistant director's shot list that says "Scene 4, living room, camera at the doorway facing the fireplace, 20 minutes after the fire was lit." The second one can actually be checked against what was filmed before.

**Why it matters.** The key insight is that two different things get mixed up in "consistency." Returning to a **place** (the same room later) is a spatial question. Replaying a **moment** (the fire being lit, seen from a new angle) is a time question. By writing both down explicitly, ATAS can look up the right memory for each.

### 2. Two memories: one for places, one for events

**What it is.** ATAS keeps a persistent **world state** (the system's record of what the story world currently looks like) split into two parts.

**Scene memory** stores the **static geometry** of every location: the walls, furniture, floor, anything that doesn't move. All of it lives in one shared **coordinate frame**, meaning one agreed-upon 3D grid so that "two meters left of the fireplace" means the same spot every time. Moving things (people, flames) are masked out so they don't get frozen into the set. Because this is real 3D data, the system can **render** it (draw a picture of it) from any camera position, including one never filmed before.

**Event memory** stores the **dynamic** stuff: observations of people and things in motion, each tagged with its scene, which event it belongs to, where it came from and when it happened in story time.

**How it works, step by step.** Before generating a shot, ATAS reads the shot request and:

1. Looks up the scene in scene memory and renders the stored geometry from the requested camera. That gives a picture of "what this room should look like from here."
2. If the request names an event, it pulls matching evidence from event memory: "here is what the fire looked like when it was lit, and here is roughly where she was standing."
3. Hands the video generator three things together: the shot's text description, the scene reference and the event reference.

The video generator itself is not retrained. ATAS treats it as a plug-in, which is why the authors could test it on four different generators.

**Analogy.** Scene memory is the production designer's 3D model of the set. Event memory is the script supervisor's binder of continuity photos, filed by scene and time. Before each new setup, the crew checks both.

**A mental picture.** Shot 3: a woman lights the fireplace. Shot 12: we cut to the kitchen. Shot 25: we return to the living room from the opposite doorway. A prompt-passing agent has only the words "living room" and maybe the last frames of the kitchen. ATAS renders the stored living room from that new doorway (so the couch and window are in the right place) and pulls the "fire lit" event (so the fireplace is still burning). The authors use exactly this cabin example, and they are careful to call it a qualitative illustration, not proof the system simulates what happened while the camera was away.

The 3D side is built from existing tools. According to the project's code requirements, the geometry service uses **Pi3X**, a model that reconstructs 3D structure directly from video frames, and **SAM3**, Meta's "segment anything" model that cuts out objects, which is how moving things get separated from the static set.

### 3. Register every shot, but only let verified shots become memory

**What it is.** After each shot is generated, ATAS reconstructs it in 3D and **registers** it, meaning it lines the new footage up with the shared coordinate frame so it can be compared with what is already stored. Then it runs separate checks:

- **Film review**: is this shot good enough to go in the film?
- **Registration**: did the 3D alignment actually succeed?
- **Admission (state) check**: is this observation from a trusted source and does it belong to the right scene? Should it become part of the permanent world?

Only if all of these pass does the world state change. The crucial design choice is that **delivery and admission are decoupled**. A shot can be good enough to appear in the movie but still be kept out of memory if its geometry looks off.

**Why this matters.** Without this gate, errors compound. If shot 7 accidentally adds a second window to the room and that gets written into memory, every later shot of that room now faithfully reproduces the mistake. This is the same failure that haunts any AI system with long-term memory: a bad memory poisons future answers. ATAS's answer is a bouncer at the memory door.

**Analogy.** A newsroom can publish a quick update while still refusing to add an unverified detail to the official record that all future stories cite.

## Walkthrough: one shot, start to finish

1. The compiler produces request #25: "She sits by the fire, reading." Scene: cabin living room. Anchor: fireplace. Camera: from the hallway doorway, eye level. Time: evening, after event "fire lit." Event ID: fire lit.
2. Scene memory renders the stored living room from the hallway doorway: walls, couch, bookshelf, the fireplace opening.
3. Event memory returns the evidence clip for "fire lit": flames in the fireplace, her coat on the chair.
4. The video generator receives the text, the rendered room and the event evidence, and makes a 10 second clip.
5. The clip is reconstructed in 3D and registered against the room.
6. Film review: looks good, it goes in the film. Registration: aligned. Admission check: the scene ID matches, the source is the generator under ATAS, accepted.
7. Memory updates: the room's geometry gains a slightly better view of the hallway side, and event memory adds "evening, reading by the fire" for later shots to reuse.

If step 6 had failed admission, the clip could still be in the film, but shot #40 would never use it as evidence.

## What they showed

**Setup.** They ran ATAS on four different video generators: MiniMax H3, Wan 3.0, HappyHorse 1.0 and Wan 2.7. In each case they compared against other long-form systems using the same generator, prompts and time budget: video agents (VGoT, Mora, MovieAgent), a simple "keep extending the last frame" approach, ViewCrafter (a 3D-guided method) and ReCA (the closest competing system, which also carries state between shots).

**Consistency across shots.** On standard benchmarks for multi-shot video (ST-Bench and ViStory, which score how consistent characters and scenes stay across shots), ATAS improved every cross-shot consistency score and got the highest overall score on all four generators. One example: with Wan 3.0, a top-pairs consistency score went from 0.602 (ReCA) to 0.719 (ATAS), roughly a 20% jump. Interestingly, it did not always make individual clips prettier: with Wan 2.7, ReCA scored higher on VBench, which measures single-clip quality. ATAS's gains are in continuity, not in raw image quality.

**Going back to a place.** When asked to return to a location and match a target image, ATAS beat every other method, including the 3D-guided ViewCrafter (reported image match of about 16.0 vs 15.3 on PSNR, a pixel-match score where higher is better). That is a modest number, but it is the specific skill the scene memory is meant to deliver.

**Replaying a moment.** A vision-language model judged "event recapture" on five axes. ATAS led on three (getting the right event, the right time order and the right viewpoint), tied ReCA on keeping characters and objects consistent, and was slightly behind ReCA on reproducing the exact action and state (0.688 vs 0.700).

**People preferred it.** In human ratings across six criteria, ATAS got the highest average on all six, with script faithfulness and character consistency as its clearest strengths.

**The memory really is doing the work.** In an ablation (a test where you remove one part to see what it contributes), removing event memory and keeping only scene memory dropped the event recapture score from 0.728 to 0.585. Memory and the recursive screenplay compiler gave the biggest gains.

**Fewer do-overs.** With persistent memory, the average number of retries per shot fell from 1.00 to 0.54, because shots were more often right the first time.

## Limitations

- **It is slower overall.** Memory work adds up to about 98 seconds per shot. A full story took about 65 minutes instead of 52, and throughput fell from about 7.3 to 6.2 shots per hour. Time per delivered shot improved slightly only because of fewer retries.
- **No guarantee of correct geometry.** Even accepted shots are not guaranteed to be geometrically right; memory is only as good as the 3D reconstruction and the checks.
- **Actions are the weak spot.** Exactly reproducing what a character was doing (and the state of objects) is the one area where it trails a competitor.
- **Static sets, mostly.** The scene memory is built around things that don't move. Rooms that change (a wall knocked down, a crowd rearranging) and heavy occlusion are open problems.
- **Evaluation limits.** Event recapture was judged by another AI model against source evidence, not against a "true" target video, so it can't prove pixel-perfect replay. Human ratings were highest overall, but background consistency and narrative coherence were relatively weaker areas.
- **Very new.** It was posted two days ago. Nobody outside the authors has reproduced it yet.

## Where this is today

### How it IS used

- **The commercial tools are reaching for the same goal with simpler tools.** Kling 3.0 has an "elements" library of reusable characters and a multi-shot mode with continuity; Google's Veo 3.1 takes up to three reference images and first and last frames; Runway offers reference images and its Aleph video editor for fixing nearly right shots. A survey of 2026 tools points out that every one of these consistency features is conditioning, meaning you feed the model reference pictures or frames each time. None of them keeps an explicit 3D map of the set or a time-indexed event log. ATAS is a research prototype of the next step, not something you can use inside these apps today.
- **The backbones are real products.** ATAS runs on top of models people actually use: Wan 3.0 and MiniMax H3 were in the top five of a 2026 blind human-preference video leaderboard. Because ATAS is a wrapper rather than a new model, it could in principle sit on top of whichever generator wins next.
- **Persistent 3D worlds are already a product category.** World Labs' Marble turns a photo or prompt into an explorable 3D world exported as Gaussian splats (Day 20) and meshes, and is pitched for previs: build the set once, shoot it from any angle without drift. That is close to ATAS's scene memory as a standalone product, but it has no characters or events.
- **Interactive world models hold memory too, briefly.** Google DeepMind's Genie 3 keeps a world consistent within roughly a one minute memory window, so revisited areas stay coherent, but not for hours. ATAS's explicit, stored memory is one answer to "how do you get past minutes?"
- **Open source.** The code is public on GitHub under the MIT license. It needs an NVIDIA GPU with about 20 GB of memory for the 3D service; the director part runs on a normal machine and calls video models through APIs.

### How it ISN'T used

- **Not in any shipping product that I could find.** I found no company announcing ATAS-style memory in a video tool. If this gets adopted, expect it first in previs and agentic filmmaking startups, not consumer apps.
- **The approach it replaces is "pass the prompt and last frame forward."** That is still how most extend and multi-shot features work, and the paper's argument is that it can't scale to long films with revisits.
- **A competing philosophy.** Some labs bet that a big enough world model will simply learn to remember (Genie 3 and the internal successors to OpenAI's discontinued Sora are in this camp). ATAS bets on explicit, inspectable memory built around a model. Both may coexist: explicit memory is easier to edit and audit, learned memory is smoother.

### Lineage

Script supervisors and continuity photos -> NeRF and Gaussian splats (rebuild 3D from images) + RAG (retrieve before you generate) + ReAct-style agents -> agentic video systems with a persistent, verified world state (ATAS) -> what you'd eventually use: a "continuity layer" inside AI filmmaking tools.

## Why it matters for Brendan

**As a filmmaker**, this is the first paper in the series that speaks your language directly. The shot request (scene, anchor, camera, time, event) is essentially a machine-readable shot list, and the split between "place memory" and "event memory" maps onto the production designer vs script supervisor jobs. If you make AI-assisted shorts, the takeaway is practical: consistency comes from a structured world state you control, not from better prompts. Even without running ATAS, you can mimic it by building a 3D set first (for example in a tool like Marble) and generating shots from rendered views of it.

**For Amelia and your relationship-memory startups**, the memory admission gate is the transferable idea. ATAS separates "use this output now" from "write this into permanent memory," and only admits observations that pass provenance and scope checks. A conversation memory system faces the same compounding-error problem: if a misheard name gets saved to a person's profile, every future conversation inherits it. Indexing memories by who, which conversation and when (as ATAS indexes by scene, event and time) and gating what gets saved is a clean pattern to borrow.

**For Standard Physics**, scene memory is a cousin of what you already do: a phone scan registered into one coordinate frame with moving things masked out. The part worth noticing is registration, aligning a new partial scan to an existing model so the space can be updated over time instead of rescanned.

## Key terms

- **Agentic video generation**: using an AI agent to plan, generate, check and assemble many shots into a long video, instead of one prompt making one clip.
- **Shot request**: a structured work order for one shot, with its description, scene, spatial anchor, camera, story time and an optional event to refer back to.
- **World state**: the system's persistent record of what the story world looks like, here split into scene memory and event memory.
- **Scene memory**: stored 3D geometry of each location's static parts, in one shared coordinate frame, that can be rendered from any camera.
- **Event memory**: stored observations of moving people and things, tagged by scene, event and story time.
- **Registration**: aligning new footage or 3D data with an existing coordinate frame so it can be compared and merged.
- **Memory admission**: the gate that decides whether a new observation becomes permanent memory, separate from whether it is used in the film.

## If you only have 10 more minutes

Watch the demo on the [project page](https://lhmd.top/atas/) first; the cabin and revisit examples make the idea click faster than any text. Then read the paper's **introduction** and the **method section on shot requests and the two memories** (the main pipeline figure is the whole system on one page). Skip the detailed benchmark tables and the implementation appendix; the ablation table on memory configurations is the only results table worth a look.

## One question to think about

ATAS lets a shot into the film even when it won't let it into memory. In your own products, which outputs should be allowed to "ship" in the moment but never be trusted as facts later, and who or what gets to decide?

## Sources

A note: I read the arXiv abstract, the Hugging Face paper page, the GitHub README and two detailed summaries of the paper, but could not open the full PDF or HTML today (access was blocked or rate-limited), so a few numbers come from those summaries.

- [Any Time, Any Space (arXiv abstract)](https://arxiv.org/abs/2610.20571)
- [Paper page and discussion (Hugging Face)](https://huggingface.co/papers/2610.20571)
- [Paper overview (alphaXiv)](https://www.alphaxiv.org/abs/2610.20571)
- [Paper summary (HyperAI)](https://hyper.ai/en/papers/2610.20571)
- [ziplab/ATAS code (GitHub)](https://github.com/ziplab/ATAS)
- [ATAS gives video agents a memory of places and time (CCTest)](https://cctest.ai/en/articles/atas-gives-video-agents-a-memory-of-places-and-time)
- [Hugging Face Trending Papers](https://huggingface.co/papers/trending)
- [AI Video Generation in 2026: Veo and Gemini Omni, Kling, Runway, MiniMax H3, and the End of Sora (OCDevel)](https://ocdevel.com/mlg/mla-26)
- [AI Multi-Shot Video: Consistent Characters and Scenes (AI Magicx)](https://www.aimagicx.com/blog/ai-multi-shot-video-character-consistency-2026)
- [World Labs Marble explained (invideo)](https://invideo.io/blog/world-labs-marble-3d-worlds/)
- [Genie 3 Doesn't Make Videos, It Builds Worlds (Labellerr)](https://www.labellerr.com/blog/genie-3-google-deepmind-world-model/)
