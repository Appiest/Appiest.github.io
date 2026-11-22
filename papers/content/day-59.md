---
day: 59
title: "Depth Pro 2: Sharp and Temporally Consistent Metric Monocular Depth"
short_title: "Depth Pro 2 (real-world distances from one camera, steady across video)"
authors: "Peiyun Hu, Marko Mihajlovic, Lyndon Duong, Lahav Lipson, Wei Dong, Amaël Delaunoy, Stephan R. Richter, Vladlen Koltun (Apple)"
year: 2026
link: "https://arxiv.org/abs/2611.26603"
track: "Frontier"
section: "Frontier"
tldr: "Apple trained one Transformer that looks at either a single photo or a stretch of video and tells you how far away every pixel is in real meters, with crisp edges and without the flicker that plagued earlier video depth tools, and released models from 24 million to 872 million parameters, including Core ML versions for Apple devices."
---

# Day 59: Depth Pro 2: Sharp and Temporally Consistent Metric Monocular Depth

Peiyun Hu, Marko Mihajlovic, Lyndon Duong, Lahav Lipson, Wei Dong, Amaël Delaunoy, Stephan R. Richter and Vladlen Koltun, from Apple. Posted to arXiv November 19, 2026. [Read the paper](https://arxiv.org/abs/2611.26603). Track: Frontier.

This brief is built from the arXiv abstract page, most of the HTML version of the paper (method, training and the appendix result tables; the conclusion and the last appendix sections were not read), the official GitHub repository and Hugging Face model card, plus current pages on depth tools and products. Anything I could not check directly in the paper is marked.

## TL;DR

Earlier depth models made you choose between sharp edges (single-photo models) and steady, flicker-free video (multi-frame models); Depth Pro 2 is one network that gives you both, in real-world meters, at full resolution, fast enough to run live.

## What it builds on

From the foundations track, the model is a **vision Transformer**, the **Transformer (Day 9)** applied to image patches instead of words, and its final "unpacking" stage is a convolutional decoder in the line of **AlexNet (Day 3)** and **ResNet (Day 8)**. Its output is exactly the kind of geometry that **NeRF (Day 13)** and **3D Gaussian Splatting (Day 20)** need to build 3D scenes. On the frontier track it sits right next to **π^4 (Day 57)**, which recovers full 4D scene geometry and motion, and it comes from the same Apple group behind **FastFrames (Day 58)** (Wei Dong, Stephan Richter and Vladlen Koltun are on both papers), with the same obsession: make it work in real time.

## The world before this paper

**Monocular depth estimation** means looking at an image from one ordinary camera (no laser, no second lens) and guessing how far away each pixel is. In 2024, Apple's original **Depth Pro** made a splash: from one photo, in about 0.3 seconds, it produced a 2.25 megapixel depth map in real meters, with unusually sharp edges, and could even guess the camera's focal length. But it worked one photo at a time. Run it on video and each frame was judged separately, so the depth **flickered**: a wall would seem to breathe in and out by a few centimeters from frame to frame. Video-focused models such as Video Depth Anything (ByteDance) and DepthCrafter fixed the flicker by looking at many frames together, but they usually worked at lower resolution, so edges came out soft and smeared. The paper's starting observation is that the field had split into two camps: **multi-frame methods favor consistency, single-frame methods favor sharpness**. Nobody had both, and most did not give real meters either.

## Core ideas

### 1. One network for photos and video: just let frames talk to each other

**What it is.** Depth Pro 2 is a single model that accepts either one image or a group of video frames and outputs one depth map per frame. A photo is simply treated as a video that is one frame long.

**Some terms first.**

- A **vision Transformer (ViT)** chops an image into small square **patches** (here 16 by 16 pixels), turns each patch into a list of numbers called a **token**, and lets every token "pay attention" to every other token to understand the scene.
- **Attention** is the Transformer's way of letting one piece of the input look at other pieces and decide which ones matter.
- A **backbone** is the big pretrained part of the network that understands images in general. Here it starts from **DINOv3**, Meta's self-taught image model, chosen because it was trained to produce detailed, pixel-level features.

**How it works, step by step.**

1. Every frame is split into patch tokens.
2. In the first third of the network's layers, each frame only looks at itself (**within-frame attention**). This builds up a good understanding of each picture on its own.
3. In the remaining two thirds, the layers alternate: one layer looks within the frame, the next looks **across frames**, letting a patch of wall in frame 10 compare itself with the same wall in frames 9 and 11.
4. A decoder turns the final tokens back into a full-size depth map for each frame.

The clever part is that the cross-frame layers reuse the same attention machinery the single-image model already had. No new building blocks were bolted on, which is why one set of weights handles both photos and video.

**Two ways to run video.** In **buffered** mode, the model processes clips of 16 frames that overlap by 4 and blends the overlaps smoothly (good for editing footage after the fact). In **unbuffered**, or streaming, mode it looks only at the current frame plus the previous 15, keeping notes on past frames in a rolling memory, so it can run live on a camera feed. ("Causal" is the technical word: it never peeks at the future.)

**Analogy.** Imagine a surveyor estimating distances in a slideshow. Shown one slide, they guess from experience. Shown several slides of the same room, they can cross-check: "the doorway was 3 meters away a moment ago and the camera moved forward slightly, so it can't suddenly be 3.4 meters now." That cross-checking is what kills flicker.

**Evidence it matters.** An outside overview of the paper (alphaXiv, not verified in the paper text) reports that removing the cross-frame attention roughly triples the flicker score in their ablation test.

### 2. Sharp edges come from working at full resolution, in one pass

**The problem.** A depth map is only as useful as its edges. If the edge of a person's hair or a door frame is blurry, the depth "bleeds" from the person onto the wall behind them. When you then build 3D from it, you get **flying pixels**: little smears of points floating in midair between foreground and background.

**The paper's argument.** Boundary sharpness tracks **processing resolution**. Many models shrink the image to something like 500 pixels wide to save compute, then stretch the answer back up. Detail lost in shrinking never comes back. The original Depth Pro got around this by cutting the image into tiles and stitching them. Diffusion-based depth models (like DepthCrafter) get detail by running many slow generation steps.

**What Depth Pro 2 does.** It runs the image at its **native resolution in a single pass** through the Transformer. No tiles, no diffusion steps. Two smaller design choices help:

- The decoder (a **DPT** decoder, short for Dense Prediction Transformer, which gathers features from several depths of the network at different scales) uses learned upsampling layers instead of simple blurry stretching.
- During training, they never smooth or interpolate the ground-truth depth, because averaging the depth of a foreground object and the wall behind it creates exactly the in-between "flying" values they want to avoid.

**Mental picture.** Think of tracing a portrait. If you trace a thumbnail and then blow it up to poster size, the outline gets fuzzy. If you trace at poster size, the line stays crisp. Depth Pro 2 traces at poster size, and it can afford to because a Transformer at 1080p is now fast enough on modern hardware.

### 3. Real meters: separate "shape" from "zoom"

**The problem.** From one photo, distance is ambiguous. A toy car close to the lens and a real car far away can look identical. What breaks the tie is the camera's **focal length**, roughly how zoomed in the lens is. Get the zoom wrong and every distance in the scene is off by the same factor.

**Some terms.**

- **Metric depth** means distance in real units (meters), as opposed to **relative depth**, which only says "this is closer than that."
- **Inverse depth** is 1 divided by distance. Networks like it because near objects get big, precise numbers and the far-away sky shrinks toward zero instead of shooting off to infinity.
- **Field of view (FOV)** is how wide an angle the camera sees, which is just another way of expressing focal length.

**How it works, step by step.**

1. The main network predicts inverse depth that has been divided by the focal length. In other words, it learns the scene's *shape* in a way that does not depend on the zoom.
2. To turn that into meters, you multiply by the focal length.
3. If the photo has **EXIF** data (the hidden camera info most phones save, including focal length), it uses that.
4. If not, a small separate network (23.5 million parameters, also built on DINOv3) looks at the image and guesses the field of view. It was trained on photos from Flickr where the true focal length is known from EXIF. For video, it guesses on each frame and takes the middle value (the median), so one weird frame can't throw off the whole clip.

**Worked example.** Say the network says a doorway's focal-normalized inverse depth is 0.0005, and your phone's photo reports a focal length of 1,500 pixels. Inverse depth = 0.0005 x 1,500 = 0.75, so distance = 1 / 0.75, about 1.33 meters. (Illustrative numbers, not from the paper; the point is that shape and zoom are handled separately and multiplied at the end.)

**Why it's a good design.** When the camera info is there, you get it for free and exactly. When it is not, the guesser adds only about 0.5% to 8% extra compute, depending on model size. The new guesser is also much better than the old one: it gets the field of view within 25% on 88.6% of test images, versus 71.7% for the original Depth Pro.

### 4. Training on mostly fake worlds, with four simple rules

**The data.** Real-world depth labels are noisy and have holes (laser scanners miss glass, sky and thin objects). So they trained on **19 datasets with a strong focus on synthetic ground truth**: computer-rendered scenes where the exact distance of every pixel is known. Per the paper's data table (read only in summary), this includes a huge internal Apple synthetic set and a smaller internal set of real handheld smartphone video labeled with a time-of-flight depth sensor, plus public sets like Hypersim (indoor rooms), TartanAir, Virtual KITTI 2 and Waymo driving data. Each training example is a clip of 1 to 32 frames, so photos and video are mixed in the same batches.

**The four losses.** A **loss** is the score training tries to drive down. Depth Pro 2 simply adds four together, with no special weighting:

1. **Metric accuracy**: how far off the predicted depth is from the true depth, in real units (only on data that has real-unit labels). It is **trimmed**, meaning the worst few percent of pixels are ignored so a handful of bad labels can't dominate.
2. **Scale-and-shift-invariant accuracy**: is the *shape* right, even if the overall size is off? This lets them use data that only has relative depth.
3. **Gradient matching**: do depth *edges* line up with the true edges, at several zoom levels? This is the sharpness rule, used only on synthetic data where edges are perfect.
4. **Multi-view consistency**: if you take the predicted depth in one frame and project it into another frame using the known camera motion, does it agree? This is the anti-flicker rule.

**Analogy.** It's like training a set designer with four critics: one checks measurements with a tape, one checks proportions, one checks that edges are clean, and one walks around the set to make sure it looks the same from every angle.

## What they showed

They built four sizes: **S** (24 million parameters), **B** (97 million), **L** (334 million) and **H+** (872 million), and tested on standard benchmarks without training on them (**zero-shot**).

**Speed.** On one NVIDIA B200 data-center GPU, the smallest model streams **1080p video at 53 frames per second** and the largest at **8 frames per second**. Each extra past frame kept in memory adds only about 1 millisecond of delay.

**Sharpness.** Measured by **boundary F1** (how well predicted depth edges match true edges; higher is better), the largest model ranks first on average across five test sets, ahead of a newer sharp-edge method (InfiniDepth) and well ahead of the original Depth Pro.

**Steadiness.** Measured by **jitter** (how much depth wobbles frame to frame; lower is better), on the Sintel animated-film benchmark the big model scores 1.39 versus 2.09 for DepthCrafter, 2.55 for Video Depth Anything Large, 2.47 for Depth Anything 3, and 11.26 for the original Depth Pro. So it is about eight times steadier than its predecessor and noticeably steadier than the dedicated video models, while also being sharper than them.

**Accuracy in meters.** Across video benchmarks, the largest model's average rank is 1.2 (first almost everywhere), against 3.0 for UniDepthV2, 3.8 for UniK3D and 6.8 for the original Depth Pro. On the KITTI driving benchmark, 97 to 98% of pixels are within 25% of the true distance.

**A practical bonus test.** They used the depth maps to fake portrait-mode background blur (**bokeh**) and compared to real photos. Depth Pro 2 beat Depth Anything 3 and the original Depth Pro by about half a decibel to three quarters of a decibel in image quality, a modest but consistent win.

**Why it's convincing.** The usual story in this field is a tradeoff: improve one number and another gets worse. Here one model leads on accuracy, sharpness and steadiness at the same time, at every size, and the authors released every size so anyone can check.

## Limitations

- **Non-commercial weights.** The model weights are licensed "exclusively for Research Purposes," defined as non-commercial research. You can learn from it and prototype, but you cannot ship it in a paid product without a different agreement. (The code license I did not read.)
- **Data you can't reproduce.** Much of the training data is internal to Apple, including the real smartphone video. Outsiders can test the models but cannot rebuild them from scratch.
- **Big training budget.** Per the paper's training section (read in summary), it took 100,000 steps on 128 B200 GPUs. And the headline speeds are on a B200, among the most expensive chips there is. The Core ML versions run on Apple silicon Macs, but I did not find phone speeds.
- **Quirks the README warns about.** Smaller models give the sky a finite depth of "several kilometers," so you need to clip far values. Video assumes one focal length for the whole clip, so zooming mid-shot will throw off the scale. The first few frames of a live stream are less stable while the memory fills up. Feeding a much smaller image loses detail and can shift the scale.
- **Focal guesser has a comfort zone.** Per the paper (read in summary), it is reliable when the image's short side is roughly 384 to 768 pixels and gets worse outside that.
- **Metrics have blind spots.** The authors themselves note that one common consistency metric rewards blurry predictions, which is why they also report jitter and edge scores. And the paper estimates depth, not full 3D reconstruction or camera motion; for that you'd combine it with other tools.
- I did not find a dedicated limitations section in the parts I read, and the conclusion was not read.

## Where this is today

### How it IS used

- **Depth Pro (version 1) is already a standard building block.** It is built into Hugging Face's Transformers library as `DepthProForDepthEstimation`, so developers can call it in a few lines of Python. Depth Pro 2 is released the same way, on GitHub and Hugging Face, with exported **Core ML** models and a Mac demo that runs a live camera feed (Apple silicon, macOS 15 or later).
- **Your iPhone already does single-photo depth.** iOS 26's **Spatial Scenes** turns ordinary 2D photos into a 3D parallax effect on the Lock Screen and in Photos. 9to5Mac quotes Apple describing it as "advanced computer vision techniques running on the Neural Engine to reconstruct depth from flat images." Apple has not said which model powers it, so I can't confirm any link to Depth Pro.
- **Creative tools use depth models every day.** ComfyUI, the popular node-based tool for AI image and video workflows, has native support for ByteDance's **Depth Anything 3**, with workflows for image depth, video depth, camera pose and 3D reconstruction. Depth maps like these are how creators relight shots, add fog, composite elements behind actors, or guide AI image and video generators.
- **Room scanning is a crowded app category.** The App Store has many LiDAR-based room measuring and floor-plan apps. These rely on the depth sensor in Pro iPhones; models like Depth Pro 2 are what could bring similar measurements to phones and cameras without that sensor.

### How it ISN'T used

- **Not in commercial products (yet), by license.** Because the weights are research-only, any startup that wants depth in a shipping product today is more likely to use the Apache 2.0 licensed sizes of Depth Anything 3 (Base, Small, Metric-Large, Mono-Large) or a phone's built-in LiDAR.
- **Per-frame depth for video is on its way out.** Running a single-photo model frame by frame, the way people used Depth Pro version 1 on footage, is what this paper replaces. Dedicated video models already did better on flicker; Depth Pro 2 argues you no longer have to give up sharpness for that.
- **Tiling and diffusion for sharpness may fade.** The original Depth Pro's tile-and-stitch approach and slow diffusion-based depth models (like DepthCrafter) are exactly what the "one pass at native resolution" design aims to make unnecessary.
- **It does not replace full 3D reconstruction.** Models such as Depth Anything 3, VGGT and π^4 also recover camera position and multi-view geometry. Depth Pro 2 is the "how far is each pixel" piece, not the whole map.

### Lineage

Stereo cameras and laser sensors (special hardware) -> single-photo depth from deep networks (MiDaS, Depth Anything: shape but not meters) -> Depth Pro (sharp, metric, one photo) and Video Depth Anything (steady video, softer edges) -> Depth Pro 2 (sharp, metric and steady in one model) -> what you'll use: phone apps that measure, scan and add 3D effects from any camera.

## Why it matters for Brendan

**Standard Physics.** This is the most direct connection. Your app scans a space with a phone and checks it against ADA rules, which are all about real distances: door clear width, ramp slope, counter height, turning space. Depth Pro 2 gives **metric depth from any camera**, uses your phone's saved focal length automatically, keeps edges crisp exactly where it counts (door frames, handrails, counter edges), and holds steady across a walk-through video. That could mean supporting phones without LiDAR, or using it as a second opinion to clean up noisy LiDAR scans. Two caveats before you plan around it: the license is research-only, so prototype with it but look at Apache-licensed alternatives for the shipping product; and you'd still want to test its errors on real doorways, because "within 25%" is far too loose for an ADA pass or fail call.

**Your filmmaking.** A steady, sharp depth map for every frame of footage shot on any camera is a quiet superpower in post: depth-based relighting, fog and atmosphere, rack-focus and bokeh after the fact, and placing CG elements behind actors. The paper's own bokeh test is aimed squarely at that use.

## Key terms

- **Monocular depth estimation**: guessing how far away each pixel is from a single ordinary camera image, with no extra sensors.
- **Metric depth**: distance in real units like meters, as opposed to relative depth, which only orders things near to far.
- **Focal length / field of view**: how zoomed in the camera is; it sets the overall scale of every distance in the scene.
- **Temporal consistency (jitter)**: whether depth stays steady from one video frame to the next instead of flickering.
- **Boundary sharpness**: how cleanly depth changes at object edges; blurry edges create "flying pixels" when you build 3D.
- **Cross-frame attention**: a Transformer layer where patches in one frame look at patches in other frames, letting the model cross-check across time.

## If you only have 10 more minutes

Read the **Introduction (Section 1)**, which lays out the sharpness versus consistency tradeoff and why resolution is the key, and then **Section 3.1** on the architecture and the focal-length estimator. Glance at the results tables comparing jitter and boundary F1 against the video baselines. Skip the loss formulas and the long appendix tables unless you're curious about a specific benchmark. If you want to try it, the GitHub README is short and practical, with tips like clipping sky depth.

## One question to think about

If any phone camera can measure a room to within a few centimeters, accessibility audits could become something a tenant, not just a certified inspector, can do in two minutes. What would need to be true, technically and legally, for a city to accept a phone scan as evidence that a building is or isn't compliant?

## Sources

- [Depth Pro 2 paper (arXiv 2611.26603)](https://arxiv.org/abs/2611.26603)
- [Depth Pro 2 paper, HTML version](https://arxiv.org/html/2611.26603)
- [Depth Pro 2 code (Apple, GitHub)](https://github.com/apple-aiml-research/ml-depth-pro-2)
- [Depth Pro 2 model card (Hugging Face)](https://huggingface.co/apple/DepthPro2)
- [Depth Pro 2 on Hugging Face Daily Papers](https://huggingface.co/papers/2611.26603)
- [alphaXiv overview of Depth Pro 2](https://www.alphaxiv.org/abs/2611.26603)
- [Apple Machine Learning Research: Depth Pro (2024)](https://machinelearning.apple.com/research/depth-pro)
- [Hugging Face Transformers: DepthPro model documentation](https://huggingface.co/docs/transformers/v5.11.0/model_doc/depth_pro.md)
- [9to5Mac: Spatial Scenes will work on any iPhone running iOS 26](https://9to5mac.com/2025/06/10/psa-spatial-scenes-will-work-on-any-iphone-running-ios-26/)
- [Stereoscopy Blog: iOS 26 Spatial Scene converts any photo to a 3D scene](https://stereoscopy.blog/2025/09/21/new-ios-26-ushers-in-spatial-scene-convert-any-photo-to-a-dynamic-3-d-scene/)
- [ComfyUI docs: Depth Anything 3](https://docs.comfy.org/tutorials/utility/depth-anything-3)
- [Depth Anything 3 README (ByteDance Seed)](https://raw.githubusercontent.com/ByteDance-Seed/Depth-Anything-3/main/README.md)
- [Video Depth Anything paper](https://arxiv.org/html/2501.12375v3)
- [Example LiDAR room-measuring app on the App Store](https://apps.apple.com/us/app/-/id6755496543)
- [Hugging Face Daily Papers](https://huggingface.co/papers)
