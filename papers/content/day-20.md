---
day: 20
title: "3D Gaussian Splatting for Real-Time Radiance Field Rendering"
short_title: "3D Gaussian Splatting"
authors: "Kerbl, Kopanas, Leimkühler & Drettakis"
year: 2023
link: "https://arxiv.org/abs/2308.04079"
track: "Foundations"
section: "Into the physical world"
tldr: "Instead of hiding a 3D scene inside a neural network the way NeRF did, describe it as millions of tiny, soft, colored, see-through blobs that a graphics card can draw directly, and you get NeRF-quality views of real places at over 100 frames per second after under an hour of training."
---

# Day 20: 3D Gaussian Splatting for Real-Time Radiance Field Rendering

Bernhard Kerbl, Georgios Kopanas, Thomas Leimkühler and George Drettakis (Inria and Université Côte d'Azur in France, and the Max Planck Institute for Informatics in Germany), 2023. Published at SIGGRAPH 2023, the biggest computer graphics conference. [Read the paper on arXiv](https://arxiv.org/abs/2308.04079). Track: Foundations 20/21.

## TL;DR

NeRF (Day 13) proved you could rebuild a real place from photos and fly a camera through it, but it was painfully slow because every pixel required asking a neural network hundreds of questions. Gaussian Splatting threw out the network and stored the scene as millions of fuzzy 3D blobs that can be drawn almost instantly, matching NeRF's quality while rendering roughly 2,000 times faster.

## How it builds on Day 19

It doesn't build on Whisper directly: Whisper gave AI ears, and this paper is about giving it eyes for physical space. Its real parent is NeRF from Day 13. It keeps NeRF's goal and its "learn the scene by comparing renders to real photos" training loop (gradient descent and backprop, Day 2), but swaps the neural network for an explicit list of shapes.

## The world before this paper

The task is called **novel view synthesis**: you take a few dozen or a few hundred photos of a place, and the computer produces a photo-realistic image from a camera position nobody actually stood in. NeRF (2020) cracked the quality problem by storing the scene inside a small neural network you could query: "at this point in space, seen from this direction, what color is it and how solid is it?" To make one pixel, you shot a ray from the camera through the scene and asked the network that question at hundreds of points along the ray, then blended the answers. That gave beautiful results but was brutally slow. The best-quality method, Mip-NeRF360, took about 48 hours to train one scene and around 10 seconds to render a single frame. Faster methods existed (Nvidia's Instant-NGP trained in minutes, and Plenoxels used a 3D grid instead of a network), but they either rendered at only about 7 to 12 frames per second or lost quality on big, real, outdoor scenes. Nobody had something that was high quality, quick to train, and real-time (smooth enough for VR or a game, which means at least 30 and ideally 90+ frames per second) all at once.

## Core ideas

### 1. Represent the scene as millions of soft 3D blobs (Gaussians)

**What it is.** Instead of a neural network, the scene is a list of 1 to 5 million little 3D shapes called **Gaussians**. A Gaussian is the mathematical name for a "bell curve" shape: dense and solid in the middle, fading smoothly to nothing at the edges. In 3D, think of a fuzzy ellipsoid, like a soft cotton ball or a puff of colored smoke.

**How it works.** Each blob stores just a handful of numbers:

- **Position**: where its center sits in 3D space (x, y, z).
- **Shape and orientation**: how stretched it is along each of three axes, and which way it's rotated. A blob can be a round ball, a flat pancake, or a long thin needle. The paper calls this the **covariance**, which is just the math word for "how spread out, and in which directions." Being able to stretch unevenly is called **anisotropic** (the opposite, **isotropic**, means equally round in every direction).
- **Opacity**: how see-through it is, from fully transparent to fully solid.
- **Color that changes with viewing angle**: stored as **spherical harmonics**, a compact recipe for "what color does this blob look like from each direction?" This is what lets a shiny car hood or a window reflection look right as you move around.

A clever detail: the authors store the shape as a separate "stretch" and "rotation" rather than one combined matrix. That guarantees that no matter how training nudges the numbers, the blob always stays a valid shape instead of turning into mathematical nonsense.

**Analogy.** Think of a pointillist painting like Seurat's, but in 3D, and with each dot being a soft, smeared, semi-transparent brushstroke that can be stretched and tilted. Up close it's a cloud of blurry smudges. From a normal distance, the smudges overlap and blend into a sharp, realistic image. Long thin blobs line up along edges like the cable of a bridge; flat pancake blobs tile a wall or tabletop; a few big blobs fill in a blue sky.

**Why blobs instead of points or triangles?** Plain points leave holes and look sparkly. Triangle meshes (what video games use) need clean surfaces and struggle with fuzzy things like hair, leaves and fog. Soft blobs blend into each other with no gaps, handle fuzziness naturally, and, crucially, are smooth, which means you can calculate exactly how to nudge each one to make the image better. That's what makes them trainable with gradient descent.

**Where the starting blobs come from.** Before training, a standard tool called **Structure-from-Motion (SfM)**, usually the free program COLMAP, looks at the photos, figures out where each camera was standing, and produces a sparse 3D **point cloud**: a few thousand to hundreds of thousands of dots on recognizable features like corners and textured spots. The paper puts one small blob on each of those dots as a starting guess. This matters a lot: in their tests, starting from random blobs instead dropped quality sharply on real scenes.

### 2. Train the blobs by comparing renders to real photos

**What it is.** Same loop as NeRF, different thing being tuned. You render the current blobs from the exact spot one of your real photos was taken, compare the render to that photo, and nudge every blob's numbers to shrink the difference. Repeat about 30,000 times, cycling through the photos.

**How it works, step by step.**

1. Pick one of the training photos and its known camera position.
2. Draw the current blob cloud from that camera (idea 3 explains how).
3. Measure the error: how different the rendered image is from the real photo, using both a pixel-by-pixel difference and a measure of whether textures and structures look similar (called **SSIM**, structural similarity).
4. Use backpropagation (Day 2) to work out, for every blob, "if I moved you a hair to the left, made you a bit more transparent, or tinted you slightly redder, would the error go down?" Then make those small adjustments.
5. Go to the next photo.

The authors add a few practical tricks: they start training at quarter resolution and step up, and they let blobs first learn one flat color before gradually unlocking the direction-dependent color recipe, so the blobs settle into the right positions before worrying about reflections.

**Analogy.** Imagine sculpting a scene out of colored cotton balls in a dark room. Someone shows you a real photo, then snaps a picture of your cotton-ball sculpture from the same spot. You compare the two, adjust every cotton ball slightly, and they do it again from another angle. After thousands of rounds, your sculpture looks like the real place from every angle you've been shown.

### 3. Grow, split and delete blobs as needed (adaptive density control)

**What it is.** The starting point cloud is far too sparse to capture fine detail, so the method keeps changing how many blobs there are during training. This is called **adaptive density control**.

**How it works.** Every 100 training steps, the system looks for blobs that are under heavy "pressure," meaning the gradients (the nudge signals from step 4 above) keep strongly pulling on their position. That pressure is a sign that this area isn't captured well. Then:

- **Clone**: if the blob is small, the area is probably **under-reconstructed** (there's detail with no blob covering it). Make a copy and move it in the direction the gradient is pulling.
- **Split**: if the blob is big, it's probably **over-reconstructed** (one giant blob is smearing over detail). Replace it with two smaller blobs (each shrunk by a factor of 1.6) placed inside the original.
- **Prune**: delete blobs that have become almost fully transparent, or that have ballooned to absurd sizes.

Every 3,000 steps they also reset every blob's opacity close to zero. Blobs that are actually needed quickly regain their solidity; blobs that aren't stay faint and get pruned. This keeps the count from exploding with useless floaters.

**Analogy.** It's like a city planner adding bus stops. Where crowds are overflowing a small stop, open another one nearby (clone). Where a single huge station is trying to serve two neighborhoods at once, replace it with two smaller ones (split). Stops nobody uses get closed (prune). Every so often, you temporarily cut service everywhere to see which stops people actually fight to keep.

The ablations (tests where they remove one part to see what it's worth) show this matters: turning off splitting dropped quality significantly on their benchmark.

### 4. A renderer built for graphics cards: tiles, sorting and blending

**What it is.** The speed comes from how the blobs get drawn. **Rendering** means turning the 3D scene into a 2D image. NeRF used **ray marching**: for every pixel, step along a ray and query a network hundreds of times. Gaussian Splatting uses **rasterization** (and specifically **splatting**): project each blob flat onto the screen, like throwing a paintball at a window, and paint it in. Rasterization is exactly what graphics cards (**GPUs**) have been optimized to do for games for decades.

**How it works, step by step.**

1. **Project**: each 3D blob, seen from the camera, becomes a 2D soft oval on the screen. There's a closed-form math formula for this, so it's instant.
2. **Cull**: throw away blobs that are behind the camera or off-screen.
3. **Tile**: split the screen into 16 by 16 pixel squares (**tiles**). Note which tiles each oval touches.
4. **Sort**: sort all the (tile, blob) pairs by tile and then by depth, nearest first, in one giant GPU sort. Sorting millions of items is something GPUs do extremely fast.
5. **Blend**: for each tile, a group of GPU threads walks through its blobs from front to back and mixes their colors using **alpha blending** (layering semi-transparent colors, like stacking tinted glass). Once a pixel is fully covered and nothing behind it can show through, it stops early.

Because every step is differentiable (you can compute how changing any blob would change the final pixels), the same renderer is used for training, not just display. That's why training is fast too.

**Analogy.** NeRF is like a detective who, for every single pixel, walks into the scene and interviews hundreds of witnesses along a line. Splatting is like a painter who sorts their pre-made stickers from back to front and slaps them onto the canvas in order, one small square of canvas at a time, with a team of assistants each handling a square.

## Walkthrough: from your phone video to a VR walkthrough

1. You walk around a living room filming a 2-minute video on your phone. Software pulls out about 200 sharp frames.
2. COLMAP (Structure-from-Motion) works out where the camera was for every frame and produces a sparse cloud of, say, 100,000 dots on the couch corners, picture frames and rug patterns.
3. Each dot becomes a tiny round blob with the dot's color.
4. Training begins. Early renders look like a blurry impressionist painting. Around the rug's fringe and the plant's leaves, the error is high, so blobs there clone and split. The big blank white wall gets covered by a few large flat pancake blobs. The window gets blobs whose color shifts with viewing angle, to show the glare.
5. After about 7,000 steps (around 6 minutes on a strong GPU in the paper's tests), it already looks good. After 30,000 steps (around 40 minutes), it's sharp. You now have maybe 2 to 3 million blobs, stored in a file of a few hundred megabytes.
6. You load the file into a VR headset viewer. Every frame, the renderer projects, sorts and blends the blobs from your current head position at well over 100 frames per second, so you can walk through the room and peek behind the couch smoothly.

## What they showed

They tested on the standard hard benchmarks: the 9 real-world scenes from the Mip-NeRF360 dataset (big indoor and outdoor scenes like a bicycle on a lawn, a garden, a kitchen counter), plus Tanks and Temples and Deep Blending (also real captured scenes). Quality was measured with **PSNR** (peak signal-to-noise ratio, a "how close is the render to the real held-out photo" score, where higher is better and each point is meaningful) and a couple of perception-based scores.

- **Versus Mip-NeRF360 (the quality champion):** roughly equal quality (PSNR 27.21 vs 27.69, and better on some other measures and some scenes), but training took about 41 minutes instead of 48 hours, and rendering ran at 134 frames per second instead of 0.06 (one frame every 16 seconds or so). That's over 2,000 times faster rendering.
- **Versus Instant-NGP and Plenoxels (the speed champions):** with a short 7,000-step run (about 6 minutes) it matched their quality, and with the full run it beat them clearly, while rendering 10 to 20 times faster than either (134 to 160 fps vs about 7 to 12).
- **Ablations:** removing the stretchy (anisotropic) shapes, the angle-dependent color, the splitting step, or the SfM starting points each hurt quality, so every piece earned its place.

What made it convincing was that it was the first method to hit all three at once: top-tier quality, training in minutes, and true real-time rendering of large, unbounded real scenes at 1080p. The authors also released their code, which is a big reason the idea spread so fast.

## Limitations

- **Big files.** A NeRF scene might be 8 to 50 MB; a splat scene was hundreds of MB (734 MB on average for the Mip-NeRF360 scenes). Training could need over 20 GB of GPU memory for large scenes.
- **Artifacts where you didn't film.** Areas seen in few photos get blotchy, stretched "needle" blobs or floaters. Fly the camera far from where the photos were taken and things fall apart.
- **Popping.** Because blobs are sorted by their centers rather than exactly per pixel, big blobs can suddenly "pop" in front of or behind each other as the camera moves.
- **No real surfaces.** It's a cloud of fuzz, not a solid mesh. You can't easily measure a wall, run physics, or relight the scene, because lighting is baked into the colors.
- **Static only.** The original method captures a frozen moment. Anything that moves during capture becomes a ghost.
- **Needs good camera poses.** It depends on COLMAP succeeding first; if Structure-from-Motion fails (blurry photos, blank walls, reflective surfaces), the whole thing fails.

## Where this is today

### How it IS used

Gaussian splatting went from paper to products remarkably fast, and in 2026 it's the default way to capture and share photo-real 3D of real places.

- **Phone capture apps.** Niantic's Scaniverse added splatting in March 2024, processing everything on the phone itself in about two minutes, no cloud needed. Polycam has supported splats since September 2023, and KIRI Engine and others followed.
- **VR headsets.** Meta's Horizon Hyperscape Capture (beta, launched in late 2025) lets you scan a room with a Quest 3 in a few minutes; Meta's servers turn it into a splat scene in 1 to 8 hours and stream it back so you can walk through it in VR. Apps like Gracia show splat scenes on Apple Vision Pro, Quest and Pico.
- **Real estate.** Zillow launched SkyTour in July 2025, using splats for exterior 3D views of showcase listings. Apartments.com launched Matterport 3D Exterior drone flyovers in November 2025 that appear to use splatting, though the exact pipeline isn't confirmed.
- **AI-generated worlds.** World Labs' Marble (announced September 2025) generates explorable 3D worlds from a text prompt or image and exports them as Gaussian splats. Here the splat is the output format of a generative model, not just a capture of a real place.
- **Volumetric video.** **4D Gaussian splatting** adds time, so you can capture moving people and pause and orbit around them. Companies like 4DV.ai, Gracia, Evercoast and Arcturus use it for music videos, sports replays and performances.
- **Industry standard.** In February 2026 the Khronos Group (which runs glTF, "the JPEG of 3D") released a candidate standard, KHR_gaussian_splatting, with Autodesk, Nvidia, Esri, Cesium and Niantic Spatial contributing, and is coordinating with the OpenUSD alliance. Ratification was expected around mid-2026; I couldn't confirm whether it has been finalized. Geospatial tools like CesiumJS and Esri ArcGIS are early adopters.
- **Self-driving and robotics simulation.** Companies such as Wayve use splatting-based reconstructions of real streets to build realistic simulation environments for testing.

How directly: the core representation (3D Gaussians with position, shape, opacity and angle-dependent color, drawn by sorted alpha blending) is used nearly as-is across all of these. Most products have added their own compression and streaming, but the blob is still the blob.

### How it ISN'T used

- **The original memory-hungry format** has been largely replaced in shipping products by compressed versions (Niantic's SPZ format, for example, and many research methods that cut files by 10x or more), because hundreds of MB doesn't stream well to phones.
- **Pure NeRF for real-time products** has mostly lost to splatting. NeRF-style methods survive in niches like compact archives and research, and some pipelines now use neural tricks during training and export splats for viewing. Note that this "splatting won" framing comes mostly from industry commentary rather than hard market data.
- **The slow per-scene, COLMAP-first workflow** is being challenged by **feed-forward** models that predict splats from a few photos in one pass, with no per-scene training, and by generative models like Marble. Many research groups have also moved toward fixing popping, anti-aliasing and relighting, which the original method doesn't handle.
- **Splats as final geometry** didn't happen. When you need measurable, solid surfaces (for construction, physics or accessibility checks), people still extract meshes or use LiDAR alongside splats.

### Lineage

Photogrammetry and point clouds -> NeRF (Day 13, scenes inside a network) -> 3D Gaussian Splatting (scenes as drawable blobs) -> compressed, streamed, 4D and AI-generated splats in Scaniverse, Hyperscape, Zillow, Marble and the coming glTF standard.

## Why it matters for Brendan

**Standard Physics.** This is the most direct connection in the whole series. A phone scan of a space is exactly the input splatting was built for, and Scaniverse shows it can run entirely on a phone in minutes. But note the key limitation: a splat is a photo-real "looks right" cloud of fuzz, not a measurable surface. For an ADA check, you need trustworthy dimensions (door widths, ramp slopes, counter heights), which is better served by LiDAR or a mesh. A strong design could use both: geometry from LiDAR for the measurements, and a splat as the shareable visual layer where you pin each violation so an owner or inspector can "walk" the space and see the problem in context.

**AR/XR/VR and generative video.** Splats are now the common currency between capture (phones, Quest), generation (World Labs Marble) and viewing (Vision Pro, browsers). As a filmmaker, 4D Gaussian splatting is worth watching: it turns a shoot into a scene you can re-frame after the fact, choosing camera angles in post the way you'd choose takes.

## Key terms

- **Novel view synthesis**: generating a realistic image of a scene from a camera angle that wasn't in the original photos.
- **3D Gaussian**: a soft, fuzzy ellipsoid with a solid center that fades out at the edges; the scene's basic building block here.
- **Anisotropic**: stretched by different amounts in different directions (a needle or a pancake), rather than a perfect sphere.
- **Structure-from-Motion (SfM)**: a technique (usually the COLMAP program) that works out where each photo's camera was and produces a sparse point cloud of the scene.
- **Rasterization / splatting**: drawing 3D objects by projecting them flat onto the screen and painting them in, the way GPUs draw games, instead of tracing rays pixel by pixel.
- **Alpha blending**: layering semi-transparent colors in order from front to back, like stacking tinted sheets of glass, to get each pixel's final color.

## If you only have 10 more minutes

Read **Section 1 (Introduction)** and look at **Figure 1** and **Figure 2**, which show the speed versus quality comparison and the full pipeline in one picture. Then skim **Section 5 (Adaptive density control)** and look at **Figure 4**, which shows clone versus split visually. Skip Section 6's GPU sorting details and the appendix math on projecting covariances, unless you're curious about graphics programming.

## One question to think about

A Gaussian splat looks real but isn't a true surface, while a mesh is measurable but often looks fake. For Standard Physics, which do you show a building owner, which do you show an inspector, and what happens to trust if the pretty version and the measured version ever disagree?

## Sources

- [3D Gaussian Splatting for Real-Time Radiance Field Rendering (arXiv)](https://arxiv.org/abs/2308.04079)
- [Paper text and results (Hugging Face Papers)](https://huggingface.co/papers/2308.04079.md)
- [Scaniverse Introduces Gaussian Splatting (Radiance Fields)](https://radiancefields.com/scaniverse-introduces-gaussian-splatting)
- [Luma AI Alternatives for Gaussian Splatting Capture (Radiance Fields)](https://radiancefields.com/luma-ai-alternatives)
- [Meta Horizon Hyperscape Capture on Quest 3 (UploadVR)](https://uploadvr.com/meta-horizon-hyperscape-photorealistic-scene-capture-quest-3)
- [Zillow Adds Gaussian Splatting Support with SkyTour (Radiance Fields)](https://radiancefields.com/zillow-adds-gaussian-splatting-support-with-skytour-unveiling)
- [Apartments.com Unveils Matterport 3D Exterior (Radiance Fields)](https://radiancefields.com/apartments-com-unveils-matterport-3d-exterior)
- [World Labs Unveils New Model, Marble (Radiance Fields)](https://radiancefields.com/world-labs-unveils-new-model-marble)
- [4D Gaussian Splatting explained (Radiance Fields)](https://radiancefields.com/4d-gaussian-splatting)
- [Khronos glTF Gaussian Splatting extension press release](https://www.khronos.org/news/press/gltf-gaussian-splatting-press-release)
- [Gaussian Splatting Statistics 2026 (Radiance Fields)](https://radiancefields.com/gaussian-splatting-statistics)
- [Gaussian Splatting vs NeRFs (Metavert)](https://metavert.io/compare/gaussian-splatting-vs-neural-radiance-fields)
