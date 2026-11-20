---
day: 57
title: "π^4: A Foundation Model for 4D Scene Geometry and Motion"
short_title: "π^4 (one model turns any photos or video into a moving 3D scene)"
authors: "Yifan Wang, Weiguang Zhao, Ni Yang, Haoyu Guo, Junting Dong, Weinan Zhang, Chunhua Shen (Shanghai AI Laboratory, Shanghai Jiao Tong University, Zhejiang University)"
year: 2026
link: "https://arxiv.org/abs/2611.23144"
track: "Frontier"
section: "Frontier"
tldr: "Give π^4 a single photo, a pile of photos or a video, with no information about the camera, and in one pass it rebuilds the 3D shape of the scene, where every camera was, how big things really are, which objects are moving and where every point travels over time, using a model less than half the size of most rivals."
---

# Day 57: π^4: A Foundation Model for 4D Scene Geometry and Motion

Yifan Wang, Weiguang Zhao, Ni Yang, Haoyu Guo, Junting Dong, Weinan Zhang and Chunhua Shen, from Shanghai AI Laboratory, Shanghai Jiao Tong University and Zhejiang University. Posted to arXiv November 17, 2026. [Read the paper](https://arxiv.org/abs/2611.23144). Track: Frontier.

This brief is built from the paper's PDF (the method, data and main result tables in full, the later sections partly), its abstract page, its code repository and Hugging Face page, plus current pages on the models it competes with. Where a number came only from the parts I read less closely, I say so.

## TL;DR

"4D" means 3D plus time: π^4 is one compact model that looks at ordinary, uncalibrated pictures or video and hands back a measured 3D world in which things move, which until recently took a stack of separate tools and slow optimization.

## What it builds on

From the foundations track: it is a **Transformer (Day 9)** through and through, and it is the fast, learned answer to the question **NeRF (Day 13)** and **3D Gaussian Splatting (Day 20)** both start from: "where were the cameras, and what is the shape of the scene?" Those methods need that answer handed to them first; π^4 produces it. Its idea of turning a 2D match into a 3D point by looking it up on a reconstructed surface echoes how **RT-2 (Day 21)** and other robot models need the world in 3D to act in it. On the frontier track it sits beside **3DCodeVerse (Day 26)** and **VibePrevisBench (Day 53)** (building 3D scenes), **TAPESTRY (Day 37)** and **ScaleVLA (Day 55)** (robots that need to understand space), and **Gamer (Day 56)**, which also leaned on video game data.

## The world before this paper

For decades, turning photos into 3D meant **structure from motion (SfM)**: find the same feature (a window corner, a sign) in many photos, then solve a big math puzzle to work out where each camera stood and where each point sits in space. The standard tool, COLMAP, is accurate but slow, breaks on blurry or textureless images, and assumes nothing in the scene moves. Starting around 2024, a new family of **feed-forward** models (DUSt3R, then Meta's VGGT, which won the CVPR 2025 best paper award, then π^3 from this same lab) learned to do it in a single pass of a neural network: photos in, 3D points and camera positions out, in seconds. But each tool did one job. Separate models tracked moving points across video (CoTracker), separate ones spotted moving objects, separate ones guessed real-world scale. Models that tried to handle moving scenes (MonST3R, Track4World, ARROW) were large, often over 1.3 billion parameters. Nobody had a single, compact model that did geometry, cameras, real scale, motion tracking and moving-object detection together, from any kind of input.

## Core ideas

### 1. One model, any input, no camera settings, no "main" photo

**What it is.** π^4 accepts a single image, an unordered stack of photos, or a video. It needs no **camera calibration**: the lens details (focal length, distortion) and the camera's position, which older pipelines must know or estimate first.

**How it works, step by step.**

1. Each image is cut into small square patches and read by **DINOv3**, a large pretrained image model from Meta that already "understands" what it sees. Its outputs are short lists of numbers per patch called **tokens**.
2. The tokens go into the **geometry branch**, which alternates two kinds of **attention** (the Transformer's way of letting each piece of input look at the others): first each patch looks at the other patches in its own image, then at patches in all the other images. That second step is where "this corner in photo 3 is the same corner in photo 7" gets worked out.
3. For each image it outputs a **pointmap**: for every pixel, how far away that spot is and in which direction, so every pixel becomes a 3D point. It also outputs that image's **camera pose** (where the camera stood and which way it pointed) and a confidence score per pixel.

**The "no main photo" trick.** Older models like VGGT pick the first image as the reference and describe everything relative to it, so changing the order of your photos can change the answer. π^4 inherits from π^3 a design called **permutation-equivariant**: shuffle the inputs and you get the same results, just shuffled. It does this by never telling the model which image came first, and by training it only on *relative* facts ("camera A is this far from camera B"), so the model invents its own shared coordinate system.

**Analogy.** Imagine handing a stack of holiday snapshots to someone who has never been to the place. A good detective can still sketch a floor plan and mark where you stood for each shot, without needing the photos in order or any camera settings. π^4 is that detective, and it doesn't care which photo you handed over first.

### 2. Real-world scale from pictures alone

**The problem.** From photos alone, a dollhouse and a real house can look identical. Most reconstruction models therefore give shape without size: correct proportions, unknown units.

**How it works.** Alongside the geometry, a small extra part of the model looks at the whole set of images and predicts one number: the scale factor that converts its internal units into meters. It is trained on datasets where the true size is known, using all the cues a person uses (the size of doors, cars, chairs, people). Multiply everything by that number, and the 3D world comes out in meters, with no ruler, LiDAR sensor or alignment step at use time.

**Worked example.** Film a hallway on your phone. π^4 rebuilds the hallway, then predicts "multiply by 2.7." A doorway that measured 0.33 units wide in its internal space becomes about 0.9 meters, which is roughly a standard door.

### 3. Track motion in 2D, then lift it into 3D

This is the paper's most elegant idea, and the reason the name went from π^3 to π^4: it adds time.

**The problem.** To follow a point on a moving object (a skater's hand, a passing car) through 3D space, you could try to predict 3D motion directly. That's hard: errors in depth and errors in motion pile on top of each other.

**How it works, step by step.**

1. A second part of the model, the **motion branch**, has its own weights and looks at the same image tokens. It is also nudged by what the geometry branch already worked out about each patch (a technique called **conditioning**: feeding one network's results into another as hints).
2. You pick a **query image** (say, frame 1 of a video). For every pixel in it, the motion branch predicts *where that same point appears in each other image*: a flat, 2D answer like "pixel (200, 340) in frame 1 is at pixel (215, 338) in frame 12." This is called **correspondence**. It also predicts whether the point is visible there or hidden behind something.
3. Now the lift: frame 12 already has its own 3D pointmap from the geometry branch. So π^4 just looks up the 3D point at pixel (215, 338) in frame 12's pointmap. That's where the point is in 3D at that moment.
4. Do this for every frame and you have a **3D track**: the path of that point through space over time.

**Analogy.** Instead of asking "where in the room is the skater's hand now?", which is hard, π^4 asks "where in this photo is the hand?" (easier, you just need to spot it) and then reads the 3D position off a map of the room it has already built. A 2D question plus a 3D map gives a 3D answer.

**A design choice worth noticing.** The geometry branch is trained first, then frozen while the motion branch learns. The motion part can't damage the geometry part. That's a clean way to add a new skill to a working model.

### 4. Which things are moving?

A small extra head (an output layer) marks **moving-object masks**: which pixels belong to things that move during the clip. It combines the motion branch's signals with features from Meta's SAM 2, a well-known model for cutting objects out of images. One sensible rule: if an object moves at any point in the clip, it counts as "moving" in every frame where it appears, even when it pauses. A parked car stays background; a person who stops for a second is still a person.

### 5. Think in loops to stay small

**What it is.** Most Transformers stack many different layers, each with its own weights. π^4's decoders reuse the *same* block of layers over and over, feeding the output back in. This is a **looped decoder**. The geometry branch was trained with 8 to 16 loops and runs 16 at test time. The motion branch runs 8.

**Why it matters.** Reusing weights means far fewer parameters for the same amount of "thinking." The whole system, geometry plus motion, is about **0.5 billion parameters**, and the geometry model alone that they benchmark is 343 million. Rivals: VGGT 1.26 billion, π^3 959 million, MapAnything 1.23 billion, Track4World 1.72 billion. (One small rival, DVLT, is 117 million, so "less than half the size of most baselines" is accurate but not "of all.")

**Analogy.** Instead of a 24-person assembly line where each worker does one step, it's one skilled craftsperson who goes over the piece 16 times, refining it each pass.

### 6. Where the training data came from

The model learned from a large mix of public 3D and video datasets (indoor scans, driving footage, landmark photos, synthetic animations), plus three things worth knowing:

- **About 10,000 3D scene assets** rendered into training images, including deliberately strange camera angles and lens types (fisheye-like and barrel distortion) so the model isn't thrown by a phone's ultra-wide lens.
- **Internet videos** where moving foreground objects were masked out and filled in, so an earlier version of the model could label the static background, and those labels were reused for training.
- **GameRealm**, a dataset built from video games with collaborators. Game engines know the exact 3D position of every surface and every moving point, so they give perfect answers for training, something you can't get from real footage. It makes up about 4.5% of the geometry training mix and about 20.5% of the motion mix. (Same lesson as Gamer yesterday: games are becoming a major training ground for AI that understands the physical world.)

Training took 64 data-center GPUs and roughly 400,000 update steps in total.

## What they showed

**Geometry (the main result).** They compared π^4 with nine strong models across 16 test settings: depth from a single image, depth across video, camera positions, and full multi-view reconstruction. Ranking every model in every setting and averaging, π^4 came first with an average rank of **3.00**, just ahead of Pi3X (an improved π^3) at 3.10, then π^3 at 3.85. VGGT averaged 7.76 and MapAnything 7.96. π^4 was best on video depth, camera positions and multi-view reconstruction, and not best on single-image depth. On one well-known video depth test (Sintel), its error was 0.160, the lowest in the table (Track4World 0.181, Pi3X 0.189).

**Long sequences.** On six routes of the Oxford Spires dataset (361 to 800 frames each, all in one pass), π^4 cut camera-path error by **47.2%** and shape error by **24.1%** compared with DVLT, a recent rival built for this kind of long input. (In the tables I read only in summary, several larger rivals ran out of memory on most routes.) The paper also shows scenes with **over 1,000 images** processed in one pass, even though training never used more than 64 at once.

**Motion and moving objects.** Here the abstract's own word is "competitive," and that's fair: from the result tables (which I read in less detail), π^4 lands close to the specialist trackers and segmenters but is usually not first. CoWTracker and ARROW still lead on some tracking measures, and the GMOS segmenter leads on average for moving-object masks. The point is that one half-billion-parameter model gets near the specialists on every task at once.

**Why it's convincing.** Many baselines, many datasets, one consistent ranking method, and the size advantage is verifiable. Why it's surprising: a smaller model that also does tracking matches or beats bigger models that only do geometry.

## Limitations

- **Real-world scale isn't its strongest suit.** In the metric-scale comparison (which I read only in summary), Pi3X has a lower average scale error than π^4, and errors on the order of 10 to 20% are typical across these models. That's fine for a rough room layout and not fine for measurements that need centimeter accuracy.
- **Tricky motion.** The authors note it can mistake a moving object for background when the background has little texture (a blank wall) or when the moving thing fills most of the frame.
- **Drift far from the origin.** Camera position errors grow for cameras far from where the reconstruction starts.
- **Not always better than slow methods.** It doesn't consistently match careful optimization-based pipelines, especially on sequences much longer than it trained on.
- **Non-commercial license.** Code and weights are released, but under CC BY-NC 4.0, which forbids commercial use. You can experiment with it, not ship it in a product.
- **Needs a real GPU.** The repo reports about 12 GB of GPU memory for 150 frames at low resolution. This is a server model, not a phone model, today.

## Where this is today

### How it IS used

- **Feed-forward 3D is replacing the old pipeline in research and tools.** Meta's VGGT repository now exports directly to COLMAP's format and feeds gsplat, a popular Gaussian splatting library, so people can make splats (Day 20) from photos without the slow classic step. Meta relicensed VGGT's code for commercial use in 2025 and offers a separate commercial checkpoint by application.
- **One API for the whole family.** Meta and Carnegie Mellon's MapAnything (Apache 2.0 code, with an Apache-licensed checkpoint) wraps VGGT, DUSt3R, MASt3R, Pi3-X, Depth Anything 3 and others behind one interface. That's a sign this family has become a standard toolbox, and π^4 is the newest entrant.
- **Robots.** VGGT-SLAM 2.0 runs a VGGT-based mapping system in real time on board a ground robot with an NVIDIA Jetson Thor (about 3.5 frames per second). The 3D-MIX research module adds frozen VGGT features to robot "brain" models (the VLA kind from Day 21 and Day 55) and reports about a 7% average gain on an out-of-domain robot benchmark.
- **ByteDance's Depth Anything 3** reports beating VGGT by about 36% on camera accuracy, showing how fast the leaderboard moves: π^4 now ranks above both in its own comparison.

I could not find a named consumer product that publicly says it runs π^4 or VGGT inside it. Phone scanning apps generally don't disclose their models, and π^4's license rules out commercial use for now.

### How it ISN'T used

- **Classic structure from motion isn't gone,** but it's being pushed to the "final polish" step. Feed-forward models give a fast first answer; slow optimization still wins when you need the last bit of accuracy, as this paper admits.
- **Separate per-task tools are fading.** Stacking a depth model, a camera solver, a tracker and a segmenter is being replaced by single models (MapAnything for geometry, π^4 for geometry plus motion).
- **Phone LiDAR scanning (Apple's RoomPlan-style apps) is a different route.** It measures depth with a sensor rather than inferring it. Models like π^4 aim to get similar results from any ordinary camera, including old footage.

### Lineage

COLMAP structure from motion (slow, static scenes) -> DUSt3R and VGGT (one fast pass, static scenes) -> π^3 (no reference photo) -> π^4 (adds time: tracking, moving objects and real scale in one compact model) -> likely next: the same thing running live, feeding robots, AR headsets and video generators.

## Why it matters for Brendan

**Standard Physics.** This is the core technology your product depends on: phone footage in, measured 3D room out, with no special sensor. π^4 shows what the research frontier can do (walk through a building with any phone and get geometry plus real scale in one pass), and also exactly where it falls short for you. ADA checks hinge on small measurements (a 32-inch clear door width, a 1:12 ramp slope, 60 inches of turning space), and a 10% scale error turns a compliant door into a failing one. The practical takeaway: models like this are great for the layout, but you'll want a scale anchor (LiDAR on newer iPhones, or a known-size object like a sheet of paper in frame) for the numbers you actually report. And for a product, look at MapAnything's or VGGT's commercially licensed versions, not π^4.

**Your filmmaking.** Working out where the camera was in every frame, and which things are moving, is what VFX artists call **matchmoving** or camera tracking, and it usually means hours in specialized software. A model like π^4 does a version of it in one pass from ordinary footage. For generative video and previs (Days 32 and 53), that's how you'd place a virtual object or character into a real shot so it stays locked in place as the camera moves.

## Key terms

- **4D reconstruction**: rebuilding a scene's 3D shape plus how it changes over time.
- **Feed-forward model**: a network that produces its answer in a single pass, with no slow step-by-step solving afterward.
- **Camera pose**: where a camera stood and which way it pointed when it took a picture.
- **Pointmap**: an image where every pixel stores a 3D position instead of a color.
- **Permutation-equivariant**: shuffling the inputs just shuffles the outputs; the order you give images in doesn't change the answer.
- **Looped decoder**: a network that reuses the same layers several times in a row, getting more thinking from fewer parameters.

## If you only have 10 more minutes

Look at **Figure 1** (what goes in and what comes out) and read **Section 3**, especially the part on lifting 2D correspondences into 3D tracks; it's short and the core trick is there. Then glance at **Table 2** for the main geometry ranking. Skim **Section 4** if you're curious about GameRealm and the training data. Skip the loss-function details and the per-dataset tracking tables.

## One question to think about

π^4 gets its sharpest motion labels from video games, because game engines know the truth about every surface. If more and more AI that "understands the real world" is trained on game worlds, what kinds of real places, people or objects will it be worst at, and how would you test that before trusting it to measure a real building?

## Sources

- [π^4 paper (arXiv 2611.23144)](https://arxiv.org/abs/2611.23144)
- [π^4 paper PDF](https://arxiv.org/pdf/2611.23144)
- [π^4 on Hugging Face Papers](https://huggingface.co/papers/2611.23144)
- [π^4 code repository](https://github.com/yyfz/Pi4)
- [Hugging Face Papers, November 2026](https://huggingface.co/papers/month/2026-11)
- [VGGT code repository (Meta)](https://github.com/facebookresearch/vggt)
- [MapAnything code repository (Meta and CMU)](https://github.com/facebookresearch/map-anything)
- [AlphaSignal: MapAnything replaces 12 separate 3D vision tools with one model](https://alphasignal.ai/news/meta-and-cmu-s-mapanything-replaces-12-separate-3d-vision-tools-with-one-model)
- [VGGT-SLAM 2.0: Real-time Dense Feed-forward Scene Reconstruction](https://arxiv.org/pdf/2601.19887)
- [3D-MIX for VLA: integrating VGGT-based 3D information into robot models](https://arxiv.org/pdf/2603.24393)
- [Depth Anything 3: Recovering the Visual Space from Any Views](https://arxiv.org/pdf/2511.10647)
