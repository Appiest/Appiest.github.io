---
day: 13
title: "NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis"
short_title: "NeRF"
authors: "Mildenhall, Srinivasan, Tancik, Barron, Ramamoorthi & Ng"
year: 2020
link: "https://arxiv.org/abs/2003.08934"
track: "Foundations"
section: "Generative and multimodal"
tldr: "Store a whole 3D scene inside a small neural network that answers \"what color and how solid is the space at this point, seen from this angle?\", then render brand new camera views by asking it that question along every ray of light."
---

# Day 13: NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis

Ben Mildenhall, Pratul P. Srinivasan, Matthew Tancik, Jonathan T. Barron, Ravi Ramamoorthi and Ren Ng (UC Berkeley, Google Research, UC San Diego), 2020. Published at ECCV 2020, where it received a best paper honorable mention. [Read the paper on arXiv](https://arxiv.org/abs/2003.08934). Track: Foundations 13/21.

## TL;DR

Take about 100 photos of an object or a room, and NeRF trains a small neural network that *is* the scene: ask it about any point in space and it tells you the color and how solid that point is, which lets you render photorealistic views from camera positions nobody ever shot.

## How it builds on Day 12

Diffusion (Day 12) used a neural network to *invent* new images from noise; NeRF, published the same year, uses a neural network to *remember* one real place so precisely that it can show you that place from a brand new angle.

## The world before this paper

The problem is called **view synthesis**: given some photos of a scene, produce a realistic photo from a new viewpoint. Classic approaches built an explicit 3D model, usually a **mesh** (a surface made of thousands of tiny triangles, the way video game characters are built) or a **voxel grid** (3D pixels, like Minecraft blocks). Photogrammetry tools could build meshes from photos, but they struggled with shiny, thin, fuzzy or see-through things: reflections on a car, leaves, hair, glass. Voxel grids could capture fuzzier stuff, but their memory cost explodes as you raise the resolution, so results looked blocky or blurry. Deep learning methods from 2019, like Local Light Field Fusion (LLFF), Neural Volumes and Scene Representation Networks (SRN), helped, but they either only worked from viewpoints close to the original photos or produced soft, smeared detail. Nobody had a way to get crisp, photoreal, freely movable views of complex real scenes.

## Core ideas

### 1. A scene is a function, and a small network can be that function

**What it is.** Instead of storing the scene as triangles or blocks, NeRF stores it as a **neural radiance field**: a function that takes five numbers in and gives four numbers out.

- **In (5 numbers):** a location in space (x, y, z) plus a viewing direction (two angles: which way you are looking when you see that point).
- **Out (4 numbers):** a color (red, green, blue) and a **density**, written with the Greek letter sigma. Density means "how much stuff is here that blocks light". Empty air has density near zero; a solid wall has very high density; smoke or fog sits in between.

The function is a **multilayer perceptron (MLP)**: the plainest kind of neural network, a stack of layers where every number connects to every number in the next layer. NeRF's MLP has 8 layers of 256 numbers each for the position, then a small extra layer that also takes in the viewing direction to decide the final color. One design choice is important: density depends only on *where* a point is, but color can depend on *where you look from*. That is how NeRF captures reflections and shine: the same spot on a shiny table can look bright from one angle and dark from another, but it is solid from every angle.

The whole trained network weighs about 5 MB, which the paper notes is smaller than the photos used to train it.

**Analogy.** Imagine an oracle who has memorized a room. You can point at any spot in the air, say "I'm standing over here, looking that way", and it answers "at that spot there is a bit of red, and it's 90% solid." The oracle doesn't hold a 3D model in the usual sense. It just answers questions, and the answers add up to a scene.

### 2. Volume rendering: turning answers into a picture

**What it is.** To make an image, NeRF uses **volume rendering**, an old technique from computer graphics (used for clouds and medical CT scans). It works because it can be computed with simple, smooth math, which means you can train the network through it.

**How it works, step by step.**

1. For each pixel of the image you want, shoot a **ray**: a straight line from the camera, through that pixel, out into the scene.
2. Pick sample points along the ray (say, 64 of them, from near to far).
3. Ask the network about each point: what color, what density?
4. Walk along the ray from the camera outward, keeping track of **transmittance**: how much light has survived so far. At each point, the point contributes its color in proportion to (its own density) times (how much light still reaches it). Once the ray hits something very dense, transmittance drops to almost zero, so everything behind it barely counts. That is how things in front hide things behind them.
5. Add up the contributions. That sum is the pixel's color.

**Why this matters for training.** Every step above is smooth arithmetic, so if the final pixel is the wrong color, backpropagation (Day 2) can trace the blame back through the sum, to each sample point, and into the network's weights. Training is then simple:

1. Pick a batch of pixels (4,096 rays at a time) from the real photos, where you know the camera's position.
2. Render those pixels with the current network.
3. Compare to the true pixel colors (squared difference).
4. Nudge the weights. Repeat a few hundred thousand times.

No one ever tells the network where the surfaces are. It discovers that the only way to make every photo match, from every angle at once, is to put solid stuff in the right places. 3D shape comes out as a side effect of getting 2D pictures right.

**Analogy.** Looking through a glass of milky water at a coin. Light passes through a bit of cloudiness here, a bit there, and finally the coin. What you see is everything along that line of sight, each piece weighted by how much was blocking it. NeRF does this for every pixel, with the network playing the role of the milk and the coin.

**One required input.** NeRF needs to know exactly where each camera was when each photo was taken. The authors got those positions from COLMAP, a standard free tool that estimates camera positions by matching features between photos.

### 3. Positional encoding: helping the network see fine detail

**The problem.** When the authors fed raw (x, y, z) numbers into the network, results were blurry. Neural networks have a known bias toward learning smooth, slowly changing functions. A brick wall or the texture of fabric changes very fast as you move a tiny bit, and a plain network just can't represent that well.

**The fix.** Before the coordinates go into the network, NeRF transforms each one into a long list of sine and cosine waves at increasing frequencies: the value at normal speed, at 2x, 4x, 8x, and so on, up to 512x (10 frequency levels for position, 4 for direction). This is called **positional encoding**. A single number like x = 0.31 becomes 20 numbers that wiggle at different rates. The fast wiggles let the network tell apart two points that are extremely close together.

**Analogy.** A clock. If you only had the hour hand, you couldn't tell 3:00 from 3:04. Add a minute hand that spins 12 times faster and a second hand that spins faster still, and tiny differences in time become big, obvious differences in hand positions. Positional encoding gives the network a minute hand and a second hand for space.

(The idea of positional encoding with sines and cosines is borrowed from the Transformer, Day 9, which used it to tell the model where each word sits in a sentence. A follow-up paper by some of the same authors, "Fourier Features Let Networks Learn High Frequency Functions", explained mathematically why it works.)

### 4. Hierarchical sampling: spend effort where the stuff is

**The problem.** Most of a ray passes through empty air or through the inside of objects that are hidden. Sampling evenly along every ray wastes almost all the effort.

**The fix.** NeRF trains two networks at once.

1. A **coarse** network is queried at 64 evenly spaced points per ray. Its answers give a rough idea of where along the ray the visible surface probably is.
2. NeRF then places 128 more sample points concentrated in those likely regions, and a **fine** network is queried at all 192 points to produce the final color.

**Analogy.** Searching a beach for a dropped ring. First you walk the whole beach quickly and note where the metal detector beeps faintly. Then you spend your real time digging carefully only in those spots.

## Worked example: rendering one pixel

Imagine a NeRF trained on a red mug sitting on a wooden table, with a white wall behind it.

1. You ask for a new view from a spot no photo was taken from. Pick the pixel that should land on the mug's side.
2. Shoot a ray from the virtual camera through that pixel.
3. The coarse network samples 64 points. The first 30 or so are in the air between the camera and the mug: density near zero, so they contribute almost nothing. Around point 34 the density jumps: that's the mug.
4. The fine network adds 128 points packed near that jump, so the edge of the mug is located precisely.
5. Walking the ray: air contributes nothing; the mug's surface has high density and the network says "red, slightly brighter from this angle because of a glossy highlight"; transmittance now drops to almost zero.
6. The wall behind the mug also has high density and says "white", but almost no light survives to reach it along this ray, so it adds almost nothing.
7. The final pixel is red with a little highlight. Do this for all 640,000 pixels of an 800 by 800 image and you have a new photo of the mug from an angle nobody shot.

## What they showed

The authors tested on three kinds of data and measured quality with **PSNR** (peak signal to noise ratio: how close a rendered image is to the real held-out photo, pixel by pixel; higher is better, and a gain of 3 points roughly means half the error), plus SSIM and LPIPS, two other similarity scores.

- **Synthetic objects (360 degrees).** Eight detailed objects rendered in Blender (a Lego bulldozer, a ship, a microphone, a drum set and others), each with 100 training views at 800 by 800 pixels. NeRF scored about 31.0 PSNR, versus about 26.1 for Neural Volumes, 24.9 for LLFF and 22.3 for SRN. That is a large jump, and the pictures make it obvious: reflections on the ship's water and the fine mesh of the microphone are crisp.
- **Real forward-facing scenes.** Eight real scenes (a fern, a T-rex skeleton, orchids, a conference room and more) shot with a phone, using only about 20 to 60 photos each. NeRF scored about 26.5 PSNR versus 24.1 for LLFF, the previous best on this kind of data.
- **What mattered.** Ablations (experiments that remove one piece at a time) showed that removing positional encoding or removing view-dependent color each caused a big drop, and both changes were visible as blur or missing reflections.

Why it was convincing: the rendered videos looked like real camera moves through real places, with reflections, transparency and fine geometry, from a tiny 5 MB network. Why it was surprising: this was a very simple network (no convolutions, no clever architecture) trained on a single scene. The breakthrough came from combining old ideas (volume rendering, an MLP) in a way that made 3D emerge from 2D supervision.

## Limitations

- **Painfully slow.** Training one scene took one to two days on a high-end GPU (an NVIDIA V100). Rendering a single frame took on the order of tens of seconds, because every pixel needs about 192 network calls. Useless for real-time AR or VR as published.
- **One network per scene.** Nothing learned about one room transfers to the next. Every scene starts from scratch.
- **Static, fixed lighting.** Anything that moves, or lighting that changes between photos, breaks it. You can't relight the scene or move objects.
- **Needs good camera positions and lots of views.** If COLMAP misestimates where the camera was, results degrade. Sparse photos give poor results.
- **Geometry is fuzzy, not a clean surface.** The density field is great for pictures, but extracting a precise mesh for measuring, physics or editing is awkward.
- **Not built for unbounded scenes.** Big outdoor scenes stretching to the horizon needed later fixes.

## Where this is today

### How it IS used

- **Google Maps Immersive View.** Google's research blog (June 2023) describes using NeRF, building on its follow-up mip-NeRF 360, to reconstruct restaurants and venues from a dense set of DSLR photos taken in about an hour, then render smooth flythrough videos people explore on their phones.
- **Google Search product views.** In April 2023 Google began showing 3D product views made with NeRF in US mobile Search, built from as few as 5 to 10 photos.
- **Open-source tools.** Nerfstudio, from UC Berkeley's Kanazawa lab (co-founded by Matthew Tancik, a NeRF co-author), is a free, modular framework for training radiance fields, and it is still how many researchers and hobbyists experiment. NVIDIA's Instant NGP (2022) cut NeRF training from days to seconds on a single GPU by swapping most of the big MLP for a fast lookup table.
- **Luma AI** built its early 3D capture app on NeRF, and its reconstruction platform remains available on web and desktop, though the company's focus has shifted to generative video (Dream Machine).
- **A conceptual ancestor of text-to-3D.** The idea of "optimize a 3D representation until its rendered images look right" is the backbone of many text-to-3D methods, which combine it with diffusion models (Day 12).

### How it ISN'T used

- **For real-time capture, 3D Gaussian Splatting has largely taken over.** Gaussian Splatting (Day 20) keeps NeRF's "learn the scene from photos by rendering and comparing" recipe but replaces the neural network with millions of little colored, fuzzy blobs that a GPU can draw directly, so it renders in real time. Niantic's Scaniverse added on-device Gaussian splatting in March 2024 (about two minutes from capture to result on a phone). Meta's Horizon Hyperscape Capture (beta from September 2025) lets Quest 3 owners scan a room and revisit it in VR, and it uses Gaussian splatting, not NeRF. Nerfstudio itself now ships a splatting method called Splatfacto.
- **Standards bet on splats.** In February 2026 the Khronos Group (which maintains glTF, the common file format for 3D on the web) announced a release candidate extension for storing Gaussian splats in glTF. There is no equivalent standard for NeRF networks.
- **The original slow, single-MLP NeRF is not used as-is.** Products use faster descendants (Instant NGP style hash grids, mip-NeRF 360, Zip-NeRF) or have moved to splatting.

### Lineage

Volume rendering (1980s graphics) + neural networks as functions -> NeRF (2020) -> faster and bigger NeRFs (Instant NGP, mip-NeRF 360, 2022) -> 3D Gaussian Splatting (2023) -> phone and headset scanning apps like Scaniverse and Hyperscape today.

## Why it matters for Brendan

- **Standard Physics.** Your product scans a space with a phone and checks it for accessibility. NeRF is the paper that made "photos in, faithful 3D place out" work, and the apps you'd compete with or build on (Scaniverse, Hyperscape) descend from it. But notice the limitation above: radiance fields are built to *look* right, not to *measure* right. A door that renders perfectly may still have a fuzzy edge in the density field, and there is no built-in real-world scale. For an ADA check (is this doorway at least 32 inches clear?), you would likely pair a radiance field for the visual record with LiDAR depth or explicit geometry for the measurements. That distinction is worth understanding before you pick a pipeline.
- **Filmmaking and XR.** NeRF introduced the idea of reshooting a camera move after the fact: capture a location once, then fly a virtual camera through it on any path and with any lens, even through windows, exactly as Google describes for Immersive View. That is a real tool for previsualization, location scouting and virtual production, and it is the foundation for capturing real places to walk around in VR.

## Key terms

- **View synthesis**: rendering a realistic image of a scene from a camera position that was never photographed.
- **Neural radiance field**: a network that maps a 3D point and viewing direction to a color and a density.
- **Density (sigma)**: how much light-blocking stuff exists at a point; near zero for air, high for solid surfaces.
- **Volume rendering**: making a pixel by adding up color and density along a ray, letting dense things in front hide things behind.
- **Positional encoding**: turning coordinates into sine and cosine waves at many frequencies so a network can learn fine detail.
- **PSNR**: a score of how closely a rendered image matches the real photo; higher is better.

## If you only have 10 more minutes

Look at **Figure 2** (the pipeline: rays, sample points, the network, volume rendering and the loss) and read **Section 4** on volume rendering, which is short and is the heart of the method. Then skim **Section 5** on positional encoding and hierarchical sampling, and look at the comparison images in **Section 6**, especially the ship and the fern. Skip the appendix and the detailed metrics tables unless you want the exact numbers.

## One question to think about

NeRF can produce a camera move through a real room that no camera ever made. If a documentary uses a NeRF flythrough of a real location, is that footage "real"? Where would you draw the line between capturing a place and generating one?

## Sources

- [Mildenhall et al., NeRF, on arXiv](https://arxiv.org/abs/2003.08934)
- [NeRF in the ECCV 2020 proceedings (ML Anthology)](https://mlanthology.org/eccv/2020/mildenhall2020eccv-nerf/)
- [Google Research blog, Reconstructing indoor spaces with NeRF (Immersive View)](https://research.google/blog/reconstructing-indoor-spaces-with-nerf/)
- [Radiance Fields, Google launches product NeRFs in Search](https://radiancefields.com/google-launches-product-nerfs-in-search)
- [Radiance Fields, Nerfstudio platform overview](https://radiancefields.com/platforms/nerfstudio)
- [The Decoder, Create NeRFs with NVIDIA Instant NGP](https://the-decoder.com/create-nerfs-with-nvidia-instant-ngp-no-code-tutorial/)
- [Radiance Fields, Luma AI to sunset Flythroughs](https://radiancefields.com/luma-ai-to-sunset-flythroughs-on-january-1-2026)
- [Radiance Fields, Scaniverse introduces Gaussian splatting](https://radiancefields.com/scaniverse-introduces-gaussian-splatting)
- [Radiance Fields, Niantic Spatial bets big on Scaniverse and Gaussian splatting](https://radiancefields.com/niantic-spatial-bets-big-on-scaniverse-and-gaussian-splatting)
- [UploadVR, Meta Horizon Hyperscape Capture for Quest 3](https://uploadvr.com/meta-horizon-hyperscape-photorealistic-scene-capture-quest-3)
- [Khronos Group, glTF Gaussian splatting release candidate press release](https://www.khronos.org/news/press/gltf-gaussian-splatting-press-release)
