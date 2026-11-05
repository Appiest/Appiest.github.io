---
day: 42
title: "MoviEdit: Long-form Multi-Shot Video Editing Made Easy"
short_title: "MoviEdit (one AI edit that survives every cut)"
authors: "Suhyeon Lee, Zhengang Li, Soo Ye Kim, Peihao Zhu, Jong Chul Ye, Chun-Hao Paul Huang, Duygu Ceylan, Yan Kang, Hyeonho Jeong (Adobe, KAIST)"
year: 2026
link: "https://arxiv.org/abs/2611.02737"
track: "Frontier"
section: "Frontier"
tldr: "Adobe and KAIST built an AI editor that takes a 15-second, multi-shot clip and a single instruction (\"replace the baby girl with a puppy\") and applies it to the right subject in every shot, by first sketching a rough, low-resolution edit of the whole clip and then rendering it in full detail piece by piece, matching Runway's commercial Aleph 2.0."
---

# Day 42: MoviEdit: Long-form Multi-Shot Video Editing Made Easy

Suhyeon Lee, Zhengang Li, Soo Ye Kim, Peihao Zhu, Jong Chul Ye, Chun-Hao Paul Huang, Duygu Ceylan, Yan Kang and Hyeonho Jeong (Adobe Research, with KAIST; Lee and Jeong contributed equally). Posted to arXiv on November 2, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2611.02737). Project page: [MoviEdit](https://multi-shot-edit.github.io/). Track: Frontier.

A note on why this paper: it was one of the most upvoted papers on Hugging Face's Daily Papers for November 4, it comes from Adobe Research (the people behind Premiere Pro and Firefly), and of everything this week it is the one closest to your day job as a filmmaker. It tackles the problem that stops AI video editing from being useful on real footage: the moment the camera cuts, the AI forgets what it was doing.

## TL;DR

To edit a whole multi-shot scene consistently, don't edit it shot by shot: first make a cheap, blurry "rough cut" of the edit across the entire clip so every shot agrees, then render the full-quality version in order, always looking back at that rough cut.

## What it builds on

The engine is a diffusion model (Day 12, DDPM) built from Transformer blocks (Day 9), steered by text the way CLIP (Day 15) taught models to connect words and pictures. The paper's key move is combining two ways of reading a sequence you have already met: **bidirectional**, where every part looks at every other part (BERT, Day 10), and **autoregressive**, where you produce one piece at a time, left to right (GPT-3, Day 11). Among frontier days, it continues the generative video thread from Day 22 (keeping a "world state" so video stays consistent), Day 32 (FilmFlow, AI cinematography) and Day 37 (TAPESTRY, video models as robot brains).

## The world before this paper

By 2026, AI could edit a short clip from a sentence: remove a person, change the weather, restyle it as anime. But nearly all of those editors were built for a single shot a few seconds long. Real footage is a scene: a wide, a close-up, a reverse, back to the wide. Push a 15-second, five-shot sequence through a short-clip editor and three things go wrong. The edit lands on the wrong person after a cut, or vanishes. Details drift (the puppy's color slowly changes, the image gets oversaturated). And if you try to process the whole clip at once, the computing cost explodes, because every frame has to compare itself with every other frame. Behind all three sits a data problem: to teach a model this, you need thousands of "before and after" pairs of multi-shot videos where the same edit was applied correctly to the same subject in every shot, and nobody has those. Commercial tools (Runway's Aleph 2.0, Google's Gemini Omni Flash) had started to handle multiple shots, but how they do it is secret. MoviEdit is a fully described recipe.

## Core ideas

### 1. Manufacture the training data you can't find

**What it is.** Since nobody has thousands of correctly edited multi-shot pairs, the team built three automatic pipelines that create them, with no human labeling. They ended up with about 87,000 pairs (86,619 after filtering out about 120,000 bad ones), each around 15 seconds long at 540p (roughly DVD-quality) and 24 frames per second.

**How it works, step by step.**

1. **Collect raw multi-shot footage from three places.** Synchronized multi-camera recordings (2 to 4 cameras filming the same moment, which you can cut between to fake a multi-shot scene: 1,147 clips), real cinematic footage (32,474 clips), and multi-shot clips made by AI video generators (27,630 clips).
2. **Make "pixel-aligned" edits** (adding, removing or swapping an object, changing its appearance, restyling, changing the environment). The trick: take the first frame of every shot, lay them out in a grid as one image, and edit that grid with an image editor in one go. Because it is one image, the edit is consistent across shots (the puppy looks the same in every tile). Then an existing short-clip editor spreads each edited first frame through its own shot.
3. **Make "localization" pairs**, where the target video simply highlights, outlines or color-fills the subject. These teach the model *which* thing in each shot the instruction is about.
4. **Make "semi-pixel-aligned" pairs** for big changes where the pixels can't line up (turn live action into clay animation, change a character's whole look) by regenerating the scene with a multi-shot video generator.
5. **Filter with an AI judge.** A vision-language model (an AI that looks at images and answers questions in text) throws out pairs where the edit failed.

**Analogy.** It is like building a continuity training course for a new script supervisor by staging scenes yourself: you shoot the same moment from four cameras, then dress the set two different ways, so you know exactly what "correct" looks like in every angle.

**Why it matters.** The grid trick sidesteps a chicken-and-egg problem: you don't need a multi-shot editor to make multi-shot editing data.

### 2. Draft first, then render: the two-pass editor

**What it is.** The model edits in two passes, called the **Draft Editor** and the **Render Editor**. They are actually the same trained model (same weights) used in two modes.

First, two definitions. A **diffusion model** makes images or video by starting from static (random noise) and removing it step by step until a picture appears, guided by an instruction. A **latent** is a compressed version of the video (a smaller grid of numbers) that the model works on instead of raw pixels, to save computing; an **autoencoder** (here a "video VAE") squeezes video into latents and expands them back.

**How it works, step by step.**

1. **Draft pass (bidirectional).** The model takes about half the frames, at lower resolution, and edits them all at once. "Bidirectional" means every frame can look at every other frame, before and after. Because it sees the whole scene at once, shot 1 and shot 5 agree on what the puppy looks like and which character it replaces. Because it is small and blurry, this is affordable.
2. **Render pass (autoregressive).** Now the model renders the real, full-resolution video in fixed-size chunks, in order, from start to finish. "Autoregressive" means each chunk is made based on what came before. Each chunk looks at four things: the draft (for the big picture), the last few chunks it rendered (for smooth motion), the matching piece of the original footage (to keep everything that shouldn't change), and the instruction.
3. **The result**: global consistency from the draft, sharp detail from the render, and a cost that grows gently with length instead of exploding.

**Analogy.** This is an animatic before final animation, or an offline edit before the online. You first lay out the whole sequence cheaply so every shot agrees, then do the expensive finishing work shot by shot while keeping the animatic on the second monitor.

**Why the draft is needed.** The authors show that rendering chunk by chunk *without* a draft slowly drifts: colors oversaturate and the edited subject changes appearance, because small errors in each chunk get copied into the next. The draft is a fixed reference that keeps pulling the render back on model.

**Two ways to steer it.** You can give a text instruction ("Remove the man in a black tactical suit"), or give an edited still of any frame from any shot (fix one frame in Photoshop, and the model spreads that change through the whole clip). At test time it even accepts several edited frames from different shots.

### 3. Make it fast enough to use

**What it is.** A 15-second clip (361 frames) originally took about 6 minutes on 8 high-end GPUs. Three standard speedups bring that down.

**How it works.**

- **Sliding-window attention**: each chunk only looks back at its recent neighbors, not the whole history (364 s down to 259 s).
- **KV caching**: the model saves its notes on chunks it has already processed instead of recomputing them (down to 167 s).
- **Distillation**: a faster "student" version is trained to imitate the full model in far fewer denoising steps (12 for the draft, 4 for the render). This brings it to **11.8 seconds**, about 31 times faster than the start.

**Analogy.** Proxy files and render caches: you stop re-rendering what you already rendered.

### 4. A test that checks the edit survives the cut

**What it is.** **MoviEdit-Bench**, a new benchmark: 64 AI-generated multi-shot videos (4 to 6 shots, 15 seconds each) with 128 editing tasks across eight categories, such as one person, several people, a person and an animal, global style changes, and tricky changes of medium.

**How it works.** Each edit is scored on seven things: Did the background and other people stay untouched? Did the edit land on the right subject? Was the subject's motion and identity preserved? Is the edit consistent across shots? Does it match the instruction? Is the video quality good? (And for edited-frame mode, does it match the frame you supplied?) Scores mix pixel comparisons, AI image features and AI-judge answers, rolled into one "overall edit success" number from 0 to 1.

**Why it matters.** Before this, nobody was checking the exact failure filmmakers care about: the edit is right in shot 1 and wrong in shot 3.

## Walkthrough: "Replace the baby girl with a puppy"

1. **Input.** A 15-second, five-shot clip of a family at home: a wide of the room, a close-up of the baby, a parent's reaction, a two-shot, back to the wide. Instruction: "Replace the baby girl with a puppy."
2. **Draft.** The model looks at about 180 low-res frames from all five shots at once. It figures out that the small figure in the wide, the face in the close-up and the bundle in the two-shot are the same baby, and roughs in one consistent puppy in all of them.
3. **Render.** It renders chunk 1 at full resolution, guided by the draft and the original footage. Chunk 2 uses the draft plus chunk 1, and so on. The cut points, timing, camera moves and the parents all stay exactly as shot.
4. **What a short-clip editor might have done instead.** Swapped the baby in shot 1, missed her in the two-shot, and drifted to a slightly different puppy by shot 5.
5. **If it's wrong.** Hand it one frame where the puppy looks exactly how you want, and it re-renders the clip to match.

## What they showed

**Text-guided editing (overall edit success, 0 to 1):** MoviEdit scored **0.790**, ahead of Runway's commercial Aleph 2.0 (0.764), Alibaba's HappyHorse-1.0 (0.623) and Google's Gemini Omni Flash (0.586). Open-source editors scored far lower, from Wan-Edit (0.378) down to an older "add noise and regenerate" method called SDEdit (0.193).

**Where MoviEdit wins and loses.** It changes the least of what should stay the same, and it is best at putting the edit on the right subject (about 90% precision and 86% recall by the AI judge). But Aleph 2.0 is still better on cross-shot consistency (0.981 vs 0.904) and on raw video quality (0.801 vs 0.762). So MoviEdit is more accurate; Aleph is smoother and prettier.

**Edited-frame mode:** a near tie. When you edit the first frame, Aleph edges ahead (0.806 vs 0.803). When you edit a frame from a later shot, MoviEdit edges ahead (0.786 vs 0.781). Both are far ahead of the others (HappyHorse about 0.49 to 0.52).

**How the commercial tools failed.** HappyHorse and Gemini Omni did make the edits but drifted from the source footage: shot transitions and timing were lost and motion was invented. Open-source tools carried artifacts from one shot into the next or edited the wrong thing after a cut.

**Beyond what it was trained on.** Trained only on clips up to 15 seconds, it handled 25-second clips with up to 17 shots, single long takes, and applying one edit across a set of separate videos at once.

**More helps.** Results improved steadily with more training data and more training steps, a sign the approach has headroom.

**Why it is convincing.** A research model built from a published recipe matching a leading commercial product is notable, and the benchmark is designed around the specific failure (the cut) rather than generic video quality.

## Limitations

- **Look-alikes confuse it.** When two subjects look similar (two kids in matching outfits), it can edit the wrong one. Partly visible subjects are also hard.
- **Resolution.** It works at 540p; Aleph 2.0 edits up to 30 seconds at 1080p. That gap matters for anything beyond social or previs.
- **It edits, it doesn't direct.** It keeps motion and story the same. Changing what characters *do*, or the narrative, is listed as future work.
- **Home-made test.** The benchmark videos are AI-generated, and the authors built the benchmark themselves. AI judges do part of the scoring, and no human viewer study is reported.
- **No model release mentioned.** The benchmark is meant to be public, but the paper does not say the model weights or code will be released. The base model is also not named.
- **Still heavy.** Even the fast version uses 8 data-center GPUs for about 12 seconds per clip, and training used 64 top-end GPUs.

## Where this is today

### How it IS used

- **The idea is already in commercial products, built in secret.** Runway's [Aleph 2.0 and Edit Studio](https://runway.com/news/introducing-aleph-2-and-edit-studio) (May 2026) edit clips up to 30 seconds at 1080p, apply one edit across multiple cuts, and take "a frame with the edit you want" as a reference, which is exactly MoviEdit's two input modes. MoviEdit is the first detailed public recipe for doing the same.
- **Adobe's own products already ship prompt-based video editing**, but through a partner: since December 2025, [Firefly's video editor uses Runway's Aleph](https://techcrunch.com/2025/12/16/adobe-firefly-now-supports-prompt-based-video-editing-adds-more-third-party-models) for instructions like "change the sky to overcast." An in-house Adobe model like MoviEdit is the kind of research that could eventually replace that dependency, though Adobe has not announced that.
- **Google's [Gemini Omni Flash](https://www.phonearena.com/news/googles-newest-ai-model-lets-you-edit-video-by-just-talking-to-it_id180484)** (I/O 2026) lets anyone edit video by talking to it in the Gemini app, Google Flow and, for free, YouTube Shorts. It is one of the baselines MoviEdit beat on this benchmark.
- **Research siblings.** Agent-based approaches like "Thinking on Shots" (August 2026) attack the same multi-shot problem with an AI agent that reasons about the shots before editing, and multi-shot generators like HoloCine are what MoviEdit's team used to make some of its training data.

### How it ISN'T used

- **Not available to try.** MoviEdit is a research model; there's no app, and the paper doesn't promise weights.
- **Short-clip editors are being left behind** for real footage. Tools built for one few-second shot, and the older "add noise and regenerate" approach (SDEdit), scored lowest here.
- **Pro VFX still runs on traditional tools.** Rotoscoping, tracking and compositing remain the standard for anything going to a theater; AI editors at 540p to 1080p are used for previs, social content, pitches and quick fixes. The paper doesn't claim otherwise.
- **Pure "edit everything at once" doesn't scale.** Processing the whole long video at full resolution in one go is the approach this paper shows to be too expensive; the draft-then-render split is how it gets around it.

### Lineage

Diffusion image editing (SDEdit, 2021) -> short single-shot video editors (Runway Aleph, Lucy Edit, Wan-Edit) -> commercial multi-shot editors (Aleph 2.0, Gemini Omni Flash) -> an open recipe: draft the whole scene, render it in order (MoviEdit) -> likely, AI editors living inside the timeline of Premiere and Firefly.

## Why it matters for Brendan

**Your own films.** This is the paper closest to your craft so far. The real-world use is the "reshoot you can't afford": a logo on a shirt that legal flagged, a boom in the shot, a prop that changed between takes, a costume a client wants in a different color, across every angle of the scene. The key practical lessons: these tools are strongest at keeping everything else untouched, they now take an edited still as direction (so your Photoshop skills become video skills), and they still break when two subjects look alike, so cover yourself by giving it one reference frame per character. Treat output at this resolution as previs or social, not festival master, for now.

**Amelia.** MoviEdit's hardest failure is the same as Amelia's: keeping track of *who is who* when the view changes, and getting confused by look-alikes. MoviEdit's answer, which is to look at the whole sequence at once for a cheap global draft before committing to each moment's detail, is a pattern worth stealing. For a conversation, that could mean a quick pass over the whole recording to settle "these voices are the same person" before writing per-person memories, rather than deciding speaker by speaker in real time and never revisiting.

## Key terms

- **Multi-shot video**: a clip made of several shots joined by cuts, like a real scene, rather than one continuous take.
- **Diffusion model**: an AI that creates or edits images and video by starting from noise and cleaning it up step by step, guided by an instruction.
- **Bidirectional vs autoregressive**: bidirectional means every frame can look at every other frame at once; autoregressive means frames are produced in order, each based on the ones before.
- **Latent**: a compressed numeric version of a video that the model works on to save computing, expanded back into pixels at the end.
- **Distillation**: training a faster "student" model to copy a slower "teacher" model's results in fewer steps.
- **Drift**: small errors that compound across a long generation, so colors or a character's look gradually change.

## If you only have 10 more minutes

Watch the examples on the [project page](https://multi-shot-edit.github.io/) first; as a filmmaker you will learn more from five minutes of the before-and-after clips than from any table. Then read the paper's figure of the data pipeline (the grid trick) and the comparison figure against the commercial editors. Skip the inference-speed table, the distillation math and the external benchmarks in the appendix.

## One question to think about

If any shot can be changed after the fact by typing a sentence, what is a "take" anymore? On a set where wardrobe, props and even who is in the frame can be swapped in post, which decisions should a director still insist on getting right in camera, and why?

## Sources

- [MoviEdit: Long-form Multi-Shot Video Editing Made Easy (arXiv abstract)](https://arxiv.org/abs/2611.02737)
- [Full text (arXiv HTML)](https://arxiv.org/html/2611.02737)
- [MoviEdit project page](https://multi-shot-edit.github.io/)
- [MoviEdit on Hugging Face Daily Papers](https://huggingface.co/papers/2611.02737)
- [Hugging Face Daily Papers](https://huggingface.co/papers)
- [Introducing Aleph 2.0 and Edit Studio (Runway)](https://runway.com/news/introducing-aleph-2-and-edit-studio)
- [Adobe Firefly now supports prompt-based video editing (TechCrunch)](https://techcrunch.com/2025/12/16/adobe-firefly-now-supports-prompt-based-video-editing-adds-more-third-party-models)
- [Google's newest AI model lets you edit video by just talking to it (PhoneArena)](https://www.phonearena.com/news/googles-newest-ai-model-lets-you-edit-video-by-just-talking-to-it_id180484)
- [Thinking on Shots: Consistent Multi-Shot Video Editing with Agentic Reasoning (arXiv)](https://arxiv.org/html/2608.26809)
