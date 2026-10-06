---
day: 12
title: "Denoising Diffusion Probabilistic Models"
short_title: "Diffusion (DDPM)"
authors: "Ho, Jain & Abbeel"
year: 2020
link: "https://arxiv.org/abs/2006.11239"
track: "Foundations"
section: "Generative and multimodal"
tldr: "Teach a network to remove a little noise from an image, then start from pure static and let it remove noise 1,000 times in a row: what comes out is a brand new, realistic image."
---

# Day 12: Denoising Diffusion Probabilistic Models

Jonathan Ho, Ajay Jain and Pieter Abbeel (UC Berkeley), 2020. Published at NeurIPS 2020. [Read the paper on arXiv](https://arxiv.org/abs/2006.11239). Track: Foundations 12/21.

## TL;DR

You can generate realistic images by training a network to do one small, boring job, "look at a noisy picture and guess the noise", and then running that job about 1,000 times in a row starting from pure static.

## How it builds on Day 11

GPT-3 creates text by building it up one small step (one token) at a time; DDPM brings the same "many small steps" idea to images, except each step is not "add the next word" but "make the whole picture slightly less noisy".

## The world before this paper

In 2020 the best image generators were GANs (Day 7): a generator and a critic locked in a contest. GANs made sharp images but were notoriously fiddly to train. The contest could collapse, and a GAN often learned to make only a few kinds of images well (called **mode collapse**) instead of covering the full variety of the training data. The alternatives had their own problems. **VAEs** (variational autoencoders, which squeeze an image into a compact code and rebuild it) were stable but tended to give blurry results. **Autoregressive** models like PixelCNN, which paint an image one pixel at a time, were stable and principled but slow and not as visually impressive. A 2015 paper by Sohl-Dickstein and colleagues had proposed "diffusion probabilistic models", inspired by physics, and a 2019 line of work by Yang Song and Stefano Ermon had made progress with a related idea called score matching. But nobody had shown that diffusion could produce images as good as the best GANs. That is what this paper did.

## Core ideas

### 1. The forward process: destroy an image on purpose, slowly

**What it is.** The **forward process** is a fixed recipe for wrecking an image. You take a real photo and add a tiny amount of random static, then a bit more, then more, for **T = 1,000 steps**, until nothing is left but pure static. The static is **Gaussian noise**: random values drawn from a bell curve, like the snow on an old analog TV.

**How it works, step by step.**

1. Start with a real image, call it x0 (the zero means "no noise yet").
2. At each step t, shrink the image very slightly toward gray and add a small dose of fresh noise. How big that dose is at each step is set by a list of numbers called the **noise schedule** (the paper calls them betas). In DDPM the dose grows in a straight line from 0.0001 at step 1 to 0.02 at step 1,000. So the early steps barely touch the image and the late steps are rough.
3. After 1,000 steps the result, x1000, is statistically indistinguishable from pure static. All trace of the original is gone.

**The handy shortcut.** You never actually have to run 1,000 steps to get a noisy image. Because adding bell-curve noise many times just gives you bigger bell-curve noise, there is a formula that jumps straight to any step: noisy image = (a signal amount) x original + (a noise amount) x random static. The schedule decides both amounts. This shortcut is what makes training fast.

Nothing in this process is learned. It is just a fixed, known way to go from "photo" to "static".

**Analogy.** Think of a drop of ink spreading in a glass of water. That spreading is literally called diffusion in physics, which is where the name comes from. Going forward is easy and automatic. The hard and interesting question is whether you can run the film backward.

### 2. The reverse process: learn to undo one step at a time

**What it is.** The **reverse process** is the learned part. A neural network is trained to take a noisy image at step t and produce a slightly cleaner version, as if stepping from t back to t minus 1. Chain 1,000 of these small cleanups together and you can start from static and end with an image.

**Why tiny steps matter.** Turning static into a cat in one leap is an impossibly hard problem: there are infinitely many possible cats. But removing a sliver of noise from an almost-clean cat is easy, and removing a sliver of noise from almost-pure static is also manageable, because each step only has to make a small, local guess. The paper relies on a mathematical fact: when each forward step adds only a little noise, each reverse step can be well described by a simple bell curve too. So the network only has to predict where the center of that bell curve is.

**What the network is.** DDPM uses a **U-Net**, an image-to-image network shaped like a U: it shrinks the image down to capture the big picture, then expands it back up to full size, with shortcut connections that carry fine detail across. (This is a cousin of the skip connections in ResNet, Day 8.) The network is also told which step t it is on, so it knows how noisy the input is supposed to be. The CIFAR-10 model had about 36 million parameters.

**Analogy.** A film restorer cleaning a badly damaged reel. Nobody can repaint the whole film in one pass, but a skilled restorer can always make any single frame a little cleaner. Repeat enough passes and the picture emerges. The twist in diffusion is that the restorer starts from a reel that is 100% damage and still ends up with a convincing film, one that never existed before.

### 3. The key simplification: just predict the noise

This is the paper's most important contribution and the reason diffusion took off.

**The problem.** The "proper" way to train this model, inherited from the 2015 paper, uses a complicated objective called a **variational bound** (a mathematical stand-in for "how likely does the model think real images are?"). It works, but it is messy and the resulting images were not great.

**The insight.** The authors rewrote the problem so that, instead of predicting the cleaner image directly, the network predicts **the noise that was added**. Once you know the noise, you can subtract it out. They showed that this choice connects diffusion to Song and Ermon's score matching work: predicting the noise is mathematically the same as learning which direction makes an image "more realistic" at every noise level, and the sampling procedure then looks like a well-known physics method called **Langevin dynamics** (take a step in the "more realistic" direction, plus a little randomness).

**The training recipe, which is shockingly simple.**

1. Pick a real image from the dataset.
2. Pick a random step t between 1 and 1,000.
3. Generate random static.
4. Use the shortcut formula to make the noisy image for step t.
5. Ask the network: "what noise was added?"
6. Score it by the squared difference between its guess and the true noise. Nudge the weights to do better (backpropagation, Day 2).

That's it. The paper calls this loss **L_simple**. It deliberately throws away some of the weighting the "proper" math would require, which means the model cares less about the near-clean steps and more about the harder, noisier ones. In their tests, this "wrong" simple loss gave clearly better images than the theoretically correct one.

**Analogy.** Instead of asking a student "draw the original photo", you ask "circle the scratches". Spotting damage is a much easier, better-defined task, and if you can find the damage you can remove it.

### 4. A side discovery: images are built coarse to fine

When the authors watched the reverse process run, they saw that the big structure of an image (overall layout, colors, the rough shape of a face) appears in the early, very noisy steps, and fine details like hair texture and skin pores are only filled in near the end. They framed this as a kind of **progressive decoding**, similar to how a slow image loads blurry first and sharpens. They also found that most of the model's "information budget" goes to details too small for people to see, which helps explain why its sample quality was excellent even though it scored worse on the strict likelihood metric (see Limitations). This coarse-to-fine behavior is also why later tools can do things like "keep the composition, change the style": you can step in partway through.

## Worked example: one image, forward and back

Here is what the actual DDPM noise schedule does to a picture. "Signal" is how much of the original remains; "noise" is how much static has been mixed in.

| Step t | Signal | Noise | What you'd see |
| --- | --- | --- | --- |
| 1 | 1.00 | 0.01 | Looks identical to the photo |
| 100 | 0.95 | 0.32 | Clearly grainy, subject obvious |
| 250 | 0.72 | 0.69 | Heavy grain, subject still recognizable |
| 500 | 0.28 | 0.96 | Mostly static, faint shapes |
| 750 | 0.06 | 1.00 | Static with the barest ghost |
| 1000 | 0.01 | 1.00 | Pure static |

**Training on one example.** Take a photo of a dog. Pick t = 250. Mix 0.72 x dog with 0.69 x fresh static. Hand that to the U-Net along with the number 250 and ask, "what was the static?" Compare its answer to the real static and adjust. Do this hundreds of thousands of times with random photos and random steps.

**Generating a new image.**

1. Start with pure random static at step 1,000.
2. Ask the network to predict the noise in it.
3. Remove a step's worth of that predicted noise, then add back a small amount of fresh randomness (this keeps results varied and helps the process stay on track).
4. You now have a step 999 image. Repeat for 998, 997, all the way down to 1.
5. Around step 700 to 500 a rough layout starts to show. By step 100 it is a recognizable scene. At step 0 you have a clean, brand new image that is not a copy of any training photo.

Different starting static gives a different image. That is where the variety comes from.

## What they showed

- **Best-in-class image quality on CIFAR-10.** CIFAR-10 is a standard dataset of small 32 by 32 pixel images of things like planes, cars, birds and cats. Quality was measured with **FID** (Frechet Inception Distance: how statistically similar a pile of generated images is to real ones, as judged by another neural network; lower is better). DDPM scored an FID of 3.17, the best reported for an unconditional model at the time (unconditional means you can't ask for a particular class, it just makes something), with an Inception Score of 9.46. This beat or matched the best GANs, without any adversarial contest.
- **Large, realistic images.** On 256 by 256 photos of bedrooms, churches and cats (the LSUN datasets) the results were comparable to ProgressiveGAN, a leading GAN of that era, and the paper also showed strong 256 by 256 celebrity faces (CelebA-HQ).
- **The simple loss mattered.** Their comparisons showed that predicting the noise with L_simple gave much better images than the alternatives they tried, including predicting the cleaner image directly or training on the full "proper" bound.
- **Stable training.** No balancing act between two networks, no mode collapse. You just minimize one loss and it improves.

Why it was convincing: diffusion went from a curiosity to beating the reigning champion on a standard benchmark, with a training recipe a grad student could write in an afternoon. Why it was surprising: the theoretically "worse" simplified loss is what made it work.

## Limitations

- **Very slow to generate.** Making one image means running the network 1,000 times, one after another. The follow-up DDIM paper measured that sampling 50,000 tiny 32 by 32 images from a DDPM took about 20 hours on an Nvidia 2080 Ti GPU, versus under a minute for a GAN. This was the biggest practical obstacle.
- **Worse on likelihood.** On the strict statistical measure of how well a model "explains" the data (log-likelihood, reported in bits per dimension), DDPM was competitive with some models but behind the best autoregressive models. The authors argued that this is because likelihood rewards modeling invisible details, while their model focused on what people can see.
- **No control.** The paper's models are unconditional. You couldn't type "a dog on a skateboard". Text control came later.
- **Pixel space is expensive.** Running 1,000 steps over every pixel of a big image is costly, which capped the resolution in practice.
- **Hand-picked choices.** The linear noise schedule and fixed step variance were chosen by hand. Follow-up work found better schedules and learned versions.

## Where this is today

### How it IS used

- **Almost all modern image and video generation is diffusion or its direct descendant.** OpenAI's February 2024 Sora report states plainly that "Sora is a diffusion model": given noisy patches of video, it is trained to predict the clean ones. It is also a "diffusion transformer", meaning the U-Net was swapped for a Transformer (Day 9).
- **Stable Diffusion.** The 2022 "Latent Diffusion" paper (Rombach et al.) ran the DDPM idea inside a compressed version of the image (a **latent space**) instead of on raw pixels, which made it cheap enough to run on consumer GPUs and add text prompts. That became Stable Diffusion.
- **The DDPM recipe is literally still in the toolbox.** Hugging Face's widely used Diffusers library ships a `DDPMScheduler` whose defaults are the paper's exact settings: 1,000 steps, betas from 0.0001 to 0.02, linear schedule.
- **Beyond images.** Robotics: Diffusion Policy (Columbia and collaborators, 2023) generates robot arm movements by denoising them, and reported an average 46.9% improvement over prior methods across 12 manipulation tasks. Biology: AlphaFold 3 (Nature, 2024) uses a diffusion module that starts with noisy atom positions and denoises them into a 3D molecular structure. Text: Google DeepMind showed an experimental Gemini Diffusion language model in 2025 that generates whole blocks of text by refining noise, reported at around 1,500 tokens per second, though it was a demo with a waitlist rather than a mainstream product.

### How it ISN'T used

- **Nobody runs 1,000 sampling steps anymore.** DDIM (late 2020) reused the same trained models but sampled 10 to 50 times faster. Today's systems typically use somewhere from a few to around 50 steps, and distilled models can go even lower.
- **"Predict the noise" is giving way to flow matching.** Stable Diffusion 3 (2024) uses **rectified flow**, which connects data and noise along a straight line and trains the model to follow that path. Black Forest Labs' FLUX.1 (12 billion parameters, August 2024) is built on flow matching, which its creators describe as including diffusion as a special case. Same family, cleaner math, fewer steps.
- **The U-Net is mostly replaced by Transformers** at the frontier (Sora, SD3, FLUX).
- **Pixel-space diffusion is rare.** Nearly everything now diffuses in a compressed latent space.

### Lineage

Physics-inspired diffusion (2015) + score matching (2019) -> DDPM's "predict the noise" recipe (2020) -> faster samplers, text guidance and latent diffusion (Stable Diffusion, 2022) -> diffusion transformers and flow matching (Sora, SD3, FLUX) -> the AI image and video tools you use today.

## Why it matters for Brendan

- **Generative video and your filmmaking.** Every AI video tool you might use on a set or in post (text to video, extending a shot, restyling footage) sits on this paper's idea. Understanding the coarse-to-fine behavior explains practical things you'll notice: why "image to video" and "strength" sliders exist (you start partway through the denoising instead of from pure static), why the same prompt with a different "seed" (the starting static) gives a different shot, and why fast "turbo" modes trade some detail for speed (fewer denoising steps).
- **Robotics.** Diffusion Policy shows that "denoise your way to an answer" works for robot actions, not just pixels. That's useful context for Day 21 (RT-2) and for any robotics or XR idea where a system has to choose among many valid ways to move.

## Key terms

- **Diffusion model**: a generator that learns to reverse a gradual noising process, turning random static into data step by step.
- **Forward process**: the fixed, unlearned recipe that adds noise to a real image over many steps until it is pure static.
- **Reverse process**: the learned recipe that removes noise one step at a time, used to generate new images.
- **Noise schedule**: the list of how much noise is added at each step (in DDPM, a straight line from 0.0001 to 0.02 over 1,000 steps).
- **U-Net**: a U-shaped image-to-image network that shrinks an image to see the big picture and then expands it back, keeping detail through shortcut connections.
- **FID**: Frechet Inception Distance, a score of how similar generated images are to real ones overall; lower is better.

## If you only have 10 more minutes

Look at **Figure 2** (the diagram of the forward and reverse chains) and **Algorithms 1 and 2** in Section 3, which are the entire training and sampling procedures in about ten lines total. Then look at the sample grids and the **progressive generation figure in Section 4**, which shows images forming coarse to fine. Skip the derivations in Sections 2 and 3 and the appendix unless you want the math.

## One question to think about

A diffusion model never copies a training image, yet everything it makes is built from patterns it absorbed from them. For a filmmaker, where is the line between "a new image" and "a remix of other people's work", and does the step-by-step way these images are made change your answer?

## Sources

- [Ho, Jain and Abbeel, Denoising Diffusion Probabilistic Models, on arXiv](https://arxiv.org/abs/2006.11239)
- [DDPM paper, HTML version on ar5iv](https://ar5iv.arxiv.org/html/2006.11239)
- [TheoremPath breakdown of DDPM (schedule, L_simple, sampling)](https://theorempath.com/papers/denoising-diffusion-probabilistic-models)
- [Song, Meng and Ermon, Denoising Diffusion Implicit Models (DDIM), sampling time comparison](https://ar5iv.arxiv.org/html/2010.02502)
- [Hugging Face Diffusers: DDPMScheduler documentation](https://huggingface.co/docs/diffusers/v0.35.1/api/schedulers/ddpm)
- [OpenAI, Video generation models as world simulators (Sora)](https://openai.com/index/video-generation-models-as-world-simulators/)
- [Rombach et al., High-Resolution Image Synthesis with Latent Diffusion Models, on arXiv](https://arxiv.org/abs/2112.10752v1)
- [Stability AI, Stable Diffusion 3 research paper (rectified flow, MMDiT)](https://stability.ai/news/stable-diffusion-3-research-paper)
- [Black Forest Labs, FLUX.1 announcement](https://bfl.ai/blog/24-08-01-bfl)
- [Diffusion Policy project page (Columbia)](https://diffusion-policy.cs.columbia.edu/)
- [Abramson et al., AlphaFold 3, Nature 2024 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11168924)
- [The Decoder on Gemini Diffusion](https://the-decoder.com/gemini-diffusion-could-be-googles-most-important-i-o-news-that-slipped-under-the-radar/)
