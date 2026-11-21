---
day: 58
title: "FastFrames: Video Generation at Interactive Latency"
short_title: "FastFrames (AI video that reacts faster than you can notice)"
authors: "Gene Chou, Guandao Yang, Fujun Luan, Lars Mescheder, Wei Dong, Stephan R. Richter, Vladlen Koltun (Apple, Cornell University)"
year: 2026
link: "https://arxiv.org/abs/2611.23226"
track: "Frontier"
section: "Frontier"
tldr: "Apple researchers found that the slow part of live AI video is not the famous diffusion step but the plumbing around it, rebuilt that plumbing, and got an open video model to answer each new input with a fresh frame in about 36 milliseconds, roughly 7.6 times faster than the previous fastest model and quick enough to feel instant."
---

# Day 58: FastFrames: Video Generation at Interactive Latency

Gene Chou, Guandao Yang, Fujun Luan, Lars Mescheder, Wei Dong, Stephan R. Richter and Vladlen Koltun, from Apple and Cornell University (Gene Chou did the work as an Apple intern). Posted to arXiv November 17, 2026. [Read the paper](https://arxiv.org/abs/2611.23226). Track: Frontier.

This brief is built from the paper's abstract page and the HTML version (the introduction, method, main results table and the start of the results section read in full; the appendices and later figures only in summary), the two model pages Apple posted on Hugging Face, two news write-ups, and current pages on real-time video products. Numbers that came only from the parts I read in summary are marked.

## TL;DR

To make AI video you can steer live, like a video game, you don't mainly need a faster "brain"; you need to stop wasting time unpacking and filing each frame, and FastFrames shows that fixing those two chores makes a 1.3 billion parameter model respond in 36 milliseconds per frame.

## What it builds on

From the foundations track: the video model underneath is a **diffusion model (Day 12)** built on a **Transformer (Day 9)**, generating video one piece at a time the way **sequence to sequence models (Day 5)** generated sentences one word at a time. Its new decoder is a small **convolutional network (AlexNet, Day 3)** with shortcut-style blocks descended from **ResNet (Day 8)**, and it is sharpened with the "forger versus detective" training trick from **GANs (Day 7)**. On the frontier track it is the speed piece that **Any Time, Any Space (Day 22)**, **Agentic World Action Models (Day 31)**, **StreamVibe (Day 33)** and **TAPESTRY (Day 37)** all quietly need, and it complements the filmmaking tools in **FilmFlow (Day 32)** and **MoviEdit (Day 42)**.

## The world before this paper

Most AI video models (Wan, HunyuanVideo, Veo, Sora) are **bidirectional**: they create a whole clip at once, so every frame can "see" every other frame. That gives great quality, but you wait tens of seconds to minutes, and you can't change anything mid-clip. Since late 2024 a second family, **autoregressive video diffusion**, generates video frame by frame (or chunk by chunk), so you can steer it as it goes: press "turn left" and the next frames turn left. The key papers were CausVid (MIT and Adobe), Self Forcing, and Causal Forcing++, and the field mostly measured success in **frames per second (FPS)**. The authors argue FPS is the wrong number. A model that spits out 30 frames in one batch every second can claim 30 FPS while still making you wait a full second after you press a key. And even the fastest open model, Causal Forcing++, took about 272 milliseconds to show the effect of a new input, around five times too slow to feel instant. Everyone was busy cutting diffusion steps, which, it turns out, was no longer where the time went.

## Core ideas

### 1. Measure the right thing: latency, not frame rate

**What it is.** The paper defines **end-to-end per-frame latency**: the time from a new input (a steering command, a camera move) to the first finished image that shows its effect. It flips that into **responses per second (RPS)**: 1 divided by latency in seconds. Their target is 50 milliseconds or less, which is 20 RPS, based on research showing people start noticing delay around 50 to 60 milliseconds.

**Analogy.** A restaurant that serves 30 dishes per minute sounds fast. But if it only sends food out in one big batch every few minutes, your table still waits. FPS counts dishes; latency asks how long *you* wait after ordering.

**Why this matters.** Once you measure waiting time instead of throughput, you're forced to look at every step between "input arrives" and "pixels on screen," not just the famous one.

### 2. Profile first: the diffusion step wasn't the bottleneck

Here's the paper's most useful lesson, and it's a simple one. They timed every part of Causal Forcing++ on one NVIDIA B200 (a top-end data-center GPU). Some terms first:

- A **latent** is a compressed version of the video. Instead of working on millions of pixels, the model works on a small grid of numbers. A **VAE** (variational autoencoder) is the pair of networks that packs video into latents (the encoder) and unpacks latents back into pixels (the **decoder**).
- A **DiT** (diffusion transformer) is the model that does the actual creative work in latent space, turning noise into a frame over a few **diffusion steps**.
- A **KV cache** is the model's notebook. As a Transformer processes each frame, it stores summary "keys" and "values" (KV) so later frames can look back at earlier ones without recomputing everything. That's how frame 50 remembers what frame 10 looked like.

**Worked example: where 272 milliseconds went.**

| Step | Time |
| --- | --- |
| Diffusion step 1 (DiT pass) | 41.6 ms |
| Diffusion step 2 (DiT pass) | 41.6 ms |
| Extra DiT pass just to update the KV cache | 41.6 ms |
| VAE decoder: latents to pixels | 147 ms |
| **Total** | **about 272 ms** |

Only about 30% of the time is the diffusion everyone was optimizing. The VAE decoder alone costs as much as three and a half DiT passes. Cutting from two diffusion steps to one only saves about 15% and makes the video worse. So the authors went after the other 70%.

**Analogy.** It's like a film shoot where everyone is trying to make the actors deliver lines faster, when most of the day is actually spent on lighting changes and moving the camera truck.

### 3. Replace the slow unpacker with a tiny "pixel decoder"

**The problem.** The standard Wan VAE decoder is a heavy network that rebuilds full-resolution video from the latents, carefully, layer by layer, at high resolution. That takes 147 ms.

**How FastFrames does it, step by step.**

1. Keep the big video model (the DiT) completely **frozen**: no changes to its weights at all.
2. Build a new, small **pixel decoder** that does almost all of its thinking on the small latent grid instead of at full resolution. It uses three lightweight **causal** 3D convolution blocks ("causal" means each frame may look at past frames but never future ones, which is necessary for live generation).
3. At the very end, one simple layer turns each latent token straight into a finished patch of pixels: a 16 by 16 pixel square across 4 frames. Tile all the patches together and you get 480 by 832 video.
4. **Training, stage 1: copy the teacher.** Run the old VAE decoder on about 150,000 generated videos and teach the new decoder to produce the same pixels. The loss (the score the training tries to minimize) mixes a few things: how close the pixels are, whether edges match, whether motion between frames matches.
5. **Training, stage 2: sharpen with a critic.** Copying the teacher alone makes things slightly blurry. So they add **adversarial training** (the GAN idea from Day 7): a "discriminator" built on Meta's DINOv3 image model tries to tell real video from the decoder's output, and the decoder learns to fool it. This brings back fine detail like strands of hair and raindrops.

**Result.** About 64 million parameters (slightly *smaller* than the old 73 million parameter decoder) but **1 millisecond instead of 147**. Same-ish size, about 150 times faster, because it does the expensive work on a small grid.

**Analogy.** The old decoder is a painter who repaints every frame from scratch on a huge canvas. The new one is a printer that has learned to stamp each small square of the picture directly from a compact code.

A small but telling detail: they also tried gently fine-tuning the big video model itself, and it became unstable. Freezing the expensive model and training cheap add-ons around it was the reliable path.

### 4. Replace the "extra pass" with a tiny note-taker

**The problem.** After making each new frame, these models run the whole DiT one more time on the finished, clean frame, just to write better notes into the KV cache for future frames. In a two-step model, that's one third of all the heavy computation. Simply skipping it makes the video fall apart over time (the paper shows this degrading in Figure 6).

**How FastFrames does it.** Train a small separate network to *predict* what those cleaned-up notes would have been. It reads the frame through the DiT's own front door (its frozen patch embedding), runs four small Transformer blocks, then uses one tiny "repair head" per DiT layer to fix the notes the cheap pass left behind. The repair heads start at zero, so at first they change nothing, and they learn only the corrections that matter.

**Result.** About 2 ms for the small model (6 ms for the large one), instead of a full 41.6 ms pass.

**Analogy.** Instead of re-reading the whole chapter to update your study notes, a sharp assistant who has watched you do it thousands of times writes the update for you in a few seconds.

### 5. Ordinary engineering, done well

The rest is careful systems work, which the paper is refreshingly honest about:

- **Keeping memory in place** instead of reallocating it every frame, precomputing tables that never change, and fusing small operations together.
- **Split-KV attention**: break the long notebook (about 32,760 tokens) into five segments, process them in parallel, and merge the results. This alone cut 13%.
- **CUDA graphs**: recording the whole sequence of GPU instructions once and replaying it, so the computer doesn't spend time deciding what to do next.
- Together these cut one DiT pass from 41.6 ms to 16.4 ms for the small model.
- **Eight GPUs at once** (context parallelism): split each frame's work across eight GPUs that swap notes once per layer over a very fast connection. That brings a DiT pass for the small model to 5.8 ms.

**The new budget for FastFrames-S** (one GPU): two DiT passes at about 16 ms each, plus about 2 ms of note-taking, plus about 1 ms of decoding, comes to roughly **35 to 36 ms**. Same frozen video model, same quality setting, a 7.6 times shorter wait.

## What they showed

They built two versions, both from Alibaba's open Wan 2.1 video models: **FastFrames-S** (1.3 billion parameters) and **FastFrames-L** (14.3 billion). All main tests are at 480p (832 by 480).

**Speed (Table 1).**

- FastFrames-S: **36 ms per response on one GPU (about 28 RPS)**, versus 272 ms for Causal Forcing++, 662 ms for CausVid and 717 ms for Self Forcing. On eight GPUs: **14 ms (about 71 RPS)**.
- FastFrames-L: 158 ms on one GPU, **45 ms on eight GPUs (about 22 RPS)**. The best comparable large model, Krea Realtime (14.3 billion parameters), takes 1,675 ms.
- For scale: the original bidirectional Wan 2.1 1.3B takes about 30 seconds, and HunyuanVideo 1.5 about 26 minutes, because they make the whole clip at once.

**Quality.** On **VBench**, a standard automatic scorecard for video quality and prompt-matching (higher is better), FastFrames-S scored 84.23 against 84.11 for Causal Forcing++, and FastFrames-L scored 84.44 against 84.42 for Krea Realtime. These gaps are tiny. The honest reading is "the same quality, many times faster," not "better."

**It works on other people's models too.** They bolted the same tricks onto two existing open models: LingBot (a world model you steer with camera moves) went from 842 ms to 52 ms on eight GPUs, and RealWonder (which responds to physical forces like pushes) went from 1,141 ms to 51 ms. That's the convincing part: the recipe isn't tied to one model.

**Why it's surprising.** The field had spent two years squeezing diffusion steps. A careful stopwatch showed most of the time was elsewhere, and fixing it was mostly cheap add-on networks plus good engineering.

## Limitations

- **Data-center hardware.** Every number is on NVIDIA B200 GPUs, among the most expensive chips available; the eight-GPU numbers need a whole server. The authors say older H100s run about 25 to 50% slower (from the appendix, read in summary). Running on a phone, laptop or headset is a goal, not a result.
- **Low resolution.** Main results are 480p. At 720p the small model takes about 127 ms on one GPU (appendix, read in summary), back above the "feels instant" line.
- **Quality isn't improved, just kept.** VBench differences are within a fraction of a point, and I found no human viewer study in the parts I read.
- **Add-ons are per model.** The pixel decoder and note-taker have to be retrained for every base model; you can't reuse them.
- **The hard parts of world models remain.** Long-term consistency (does the room look the same when you turn back?) and physical plausibility are listed as future work. Speed doesn't fix a world that drifts.
- **Steering is still slowish.** Models that take camera or action inputs run slower, partly because of how those inputs are fed in. The authors suggest a fix but don't test it.
- **License.** Apple posted both models on Hugging Face under its own research license (tagged "apple-amlr"), and the LingBot demo parts are non-commercial (CC BY-NC-SA). I didn't read the full license text, so check the terms before building anything commercial on it.

## Where this is today

### How it IS used

- **Real-time "world models" are now products.** Google DeepMind's Genie 3 runs at 720p and 24 frames per second, and since January 2026 US Google AI Ultra subscribers can explore its worlds for 60 seconds at a time in Project Genie. Waymo built its own driving simulator on Genie 3. Decart launched Oasis 3 in June 2026, an autoregressive, frame-by-frame driving world model sold by API at $0.02 per second. A tracker page (run by a vendor, so treat with care) also lists Runway's GWM-1, PixVerse R1 and Odyssey-3, and a research preview of Genie 4 in late October 2026.
- **These are all built on the same basic recipe FastFrames speeds up:** generate frame by frame, distill to very few diffusion steps, and train the model on its own outputs. FastFrames is open, so it's a public example of the speed engineering that companies like Decart describe only in general terms (Decart credits an in-house "optimization stack").
- **Apple released code and weights.** Both FastFrames-S and FastFrames-L, including the intermediate training checkpoints for the large model, are on Hugging Face, and the two pages had about 600 likes between them within days.

I could not find any product that says it uses FastFrames itself yet, which is unsurprising four days after release.

### How it ISN'T used

- **Bidirectional models still win for finished clips.** For a polished ten-second shot (an ad, a music video), whole-clip models like Wan, Veo and Kling still give the best quality, because you can afford to wait. FastFrames-style models are for interaction, not for final renders.
- **FPS as the headline number is on its way out** for interactive work, if this paper's argument catches on.
- **The heavy VAE decoder in the live loop** is the thing this paper argues should go. It stays useful for training and offline generation.
- **Independent checks are missing.** One write-up notes that nobody outside Apple has reproduced the numbers yet.

### Lineage

Whole-clip diffusion video (Wan, Sora: great but slow) -> autoregressive video diffusion (CausVid, Self Forcing, Causal Forcing++: steerable but about a quarter second behind) -> FastFrames (profile the whole pipeline, replace the decoder and the extra pass: about 36 ms) -> what you'll use: AI video worlds, games and previs tools that react as you move.

## Why it matters for Brendan

**Your filmmaking and generative video.** A model that answers a camera move in 50 ms is the difference between "render and wait" and **live directing**: moving a virtual camera through a generated scene and seeing the shot immediately, the way previs and virtual production already work with game engines. The LingBot result (camera-steered world model, 842 ms down to 52 ms) is exactly that use case. It's still 480p and data-center only, so think of it as a preview of where previs tools are heading in a year or two, not something to shoot with today.

**Unstall and Amelia (and every voice product you build).** The paper's real lesson travels: before optimizing the famous model, put a stopwatch on every step from input to output. In voice agents the equivalent trap is spending weeks on the language model when the delay is actually in speech recognition finalizing, text-to-speech warming up, or network round trips. Their "latency, not throughput" framing maps directly onto "time until the agent starts speaking," which is the number users feel.

## Key terms

- **Autoregressive video diffusion**: generating video frame by frame, each new frame made by a diffusion model that looks back at earlier frames, so it can be steered as it goes.
- **Latency (per-frame, end-to-end)**: the wait from a new input to the first frame that shows its effect; RPS (responses per second) is one divided by that wait.
- **VAE decoder**: the network that unpacks a compact latent code back into full pixels; here, the hidden bottleneck.
- **KV cache**: a Transformer's stored notes about earlier input, letting new frames refer back without recomputing.
- **Distillation**: training a small or fast "student" to imitate a slow "teacher," here used to copy the old decoder and the extra notes pass.
- **Adversarial training**: improving a generator by pitting it against a critic that tries to spot fakes (the GAN idea).

## If you only have 10 more minutes

Read the **Introduction (Section 1)** with **Figure 2**, the timing breakdown: it's the whole argument in one picture. Then read **Section 3.2** on the pixel decoder, the clearest new idea, and look at **Table 1** for speed against quality. Skip the loss equations and the multi-GPU parallelism details in Section 3.4 unless you're curious about systems engineering.

## One question to think about

If AI video becomes fast enough to respond to your every move, the line between a film, a game and a conversation starts to blur. As a filmmaker, what do you keep control of in a story the viewer can steer frame by frame, and what would you want to hand over?

## Sources

- [FastFrames paper (arXiv 2611.23226)](https://arxiv.org/abs/2611.23226)
- [FastFrames paper, HTML version](https://arxiv.org/html/2611.23226)
- [FastFrames paper PDF](https://arxiv.org/pdf/2611.23226)
- [FastFrames-S on Hugging Face (Apple)](https://huggingface.co/apple/FastFrames-S)
- [FastFrames-L on Hugging Face (Apple)](https://huggingface.co/apple/FastFrames-L)
- [Let's Data Science: FastFrames brings autoregressive video diffusion to interactive latency](https://letsdatascience.com/news/fastframes-brings-autoregressive-video-diffusion-to-interact-6508da0f)
- [OrcaRouter: FastFrames video generation at interactive latency](https://www.orcarouter.ai/blog/fastframes-video-generation-apple-interactive-latency)
- [CausVid: From Slow Bidirectional to Fast Autoregressive Video Diffusion Models](https://arxiv.org/pdf/2412.07772)
- [TechCrunch: Decart's new world model can simulate hours of photorealistic driving](https://techcrunch.com/2026/06/10/decarts-new-world-model-can-simulate-hours-of-photorealistic-driving-with-some-caveats/)
- [Wikipedia: Genie (world model)](https://en.wikipedia.org/wiki/Genie_(AI_model))
- [Wikipedia: World model (artificial intelligence)](https://en.wikipedia.org/wiki/World_model_(artificial_intelligence))
- [LiveGen: Real-time AI video and world models release tracker](https://livegen.ai/best/real-time-ai-video-models)
- [Hugging Face Trending Papers](https://huggingface.co/papers/trending)
