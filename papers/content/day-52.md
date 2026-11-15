---
day: 52
title: "Duo: A Reciprocal World Model for Full-Duplex Interaction"
short_title: "Duo (an AI you video-call that generates its own face and voice in real time)"
authors: "Hengyuan Cao, Biao Gong, Guoshan Lu, Qiyuan Zhang and others, with Zhenzhong Lan (Ant Research / inclusionAI)"
year: 2026
link: "https://arxiv.org/abs/2611.15131"
track: "Frontier"
section: "Frontier"
tldr: "Ant Research built Duo, an AI you talk to like a video call: every 0.7 seconds a 'brain' model watches and listens to you and decides whether to speak or wait, and a second 'body' model generates the AI's face, gestures and voice together as live video, passing 93% of the authors' own quality checks while still missing about a quarter of conversational cues like jokes."
---

# Day 52: Duo: A Reciprocal World Model for Full-Duplex Interaction

Hengyuan Cao, Biao Gong, Guoshan Lu, Qiyuan Zhang, Lin Liu and 15 others, with Zhenzhong Lan as senior author (Ant Research, publishing under the inclusionAI name associated with Ant Group). Posted to arXiv November 11, 2026 (cs.CV). [Read the paper](https://arxiv.org/abs/2611.15131). Project page: [duo-v1.github.io](https://duo-v1.github.io/). Track: Frontier.

This brief is built from the full technical report, the project page, and the release notes for the model weights.

## TL;DR

Instead of gluing together a chatbot, a voice and a talking-head animation, Duo splits a video-call AI into two models that run in lockstep every 0.7 seconds: one decides *what to do* (speak or wait, and what to say), and one turns that decision directly into synchronized video and audio of a character, so the "person" on screen is generated live rather than animated from pre-made speech.

## What it builds on

From the foundations track: diffusion models (Day 12) are the engine that paints each frame of the AI's video; the Transformer (Day 9) and GPT-3 (Day 11) are the ancestors of the "brain" model; Whisper (Day 19) is the ancestor of the speech-to-text step that turns your voice into words for the brain; CLIP (Day 15) is the early version of the trick of putting images and words into one shared space. On the frontier track it continues two threads at once. The voice thread: Day 50 taught a frozen AI the rhythm of full-duplex talk with a tiny "speak or wait" decider, and Duo does the same kind of decision but adds a face. The video thread: Day 22 (world-state video generation) and Day 32 (StreamVibe, video agents that react to changing intent) treated generated video as something an agent produces; Duo makes that video a live conversation partner.

## The world before this paper

Two research worlds had grown up separately. **World models** (AI systems that generate a simulated environment frame by frame as you act in it, like Google's Genie 3) can produce a place you walk through with a keyboard or gamepad, but nobody in that place notices you or talks back. The authors call these worlds "lifeless": "a world to explore, but no one to talk to." Meanwhile, **talking-avatar** products (Tavus, Anam, HeyGen's interactive avatars) put a face on a chatbot by chaining steps: transcribe your speech, have a language model write a reply, turn the reply into speech, then animate a face to match that audio. Each hand-off adds delay (vendor benchmarks put typical reply latency around 1.2 to 1.9 seconds), and because the face is animated *from* finished audio, it can't react to you while it's talking or while you're talking. On the research side, models such as Moshi had made *voice* full-duplex (both sides able to talk at once), and audio-driven animation systems such as EMO and OmniHuman made realistic faces from supplied speech. But nothing combined a model that decides when to participate with a model that generates the person's look and sound together, live.

## Core ideas

### 1. The "reciprocal world model": a brain (Intent) and a body (Realization)

**What it is.** The paper's big framing idea is that a real "world" includes not just physics but *someone in it* who perceives and responds. They call this a **Reciprocal World Model (RWM)**: a system where the AI's responses become part of the world you see, which then shapes what you do next, which shapes its next response, and so on. It has two capabilities:

- **Intent**: understanding what's going on and deciding how to respond (cognition and decisions).
- **Realization**: expressing that decision as coherent, synchronized video and sound (behavior).

Duo v1 builds each one as a separate model.

**How it works.**

1. The **Intent Module** is a multimodal language model (a model that reads both images and text), adapted from a pretrained vision-language model (the paper cites the Qwen team's work). It sees the overall instruction (for example, "you are a friendly cooking coach"), frames of your video, the transcript of what you've said so far, and its own previous words.
2. Every chunk, it outputs one of two **actions**: `<wait>` (keep listening, or keep finishing what I was already saying) or `<speak>` followed by the text it wants to say.
3. Crucially, it passes on not just that text but its **hidden states**: the internal numbers the model computed while deciding. Think of hidden states as the model's private "mood and meaning" behind the words. Passing them along lets the body know *how* to say something (amused, concerned) and not only *what*.
4. The **Realization Module** is a **diffusion transformer** (a Transformer that generates images or video by starting from random noise and cleaning it up step by step, as in Day 12), initialized from pretrained audio-and-video generator weights from the Chinese AI company MiniMax. It generates the AI character's next moment of video *and* stereo audio together, conditioned on: a **reference image** (a photo that fixes what the character looks like), the brain's hidden states, your audio and video, and its own recent output.

**Analogy.** It's a film set with a director and an actor who never stop rolling. The director (Intent) watches the scene and calls "say this line, a bit warmly" or "hold, just listen." The actor (Realization) performs the line, face, voice and body together, in one take. Older avatar systems are more like dubbing: someone records the voice first, then an animator lip-syncs a puppet to it afterward.

**Why it matters.** Because voice and face come out of one generator, the lips, expression and tone are produced together instead of being matched after the fact. And because the brain's decision is separate, the system can choose to stay quiet, nod along, or jump in, rather than speaking only when it detects you've stopped.

### 2. One shared clock, chopped into 0.7-second chunks ("causal chunk conditioning")

**What it is.** Everything in Duo runs on a single timeline cut into **chunks** of 17 video frames, which at 24 frames per second is about 0.71 seconds. Your speech, your video, the brain's decisions and the AI's generated video all sit on that same clock. **Causal** means "can only use the past": each chunk is allowed to see only what had actually happened by the moment that chunk's decision is made, never anything later.

**How it works, step by step.**

1. Your camera and microphone stream in. Your speech is transcribed by a speech recognizer, with each word time-stamped so the model only "hears" a word once you've finished saying it, exactly as in real life.
2. At each chunk boundary, the brain looks at everything up to that point and outputs `<wait>` or `<speak>`.
3. The body generates the next chunk of the character's video and audio, using only the reference photo, the brain's signal and the clean (already finished) history. **Attention masks** (rules inside a Transformer that block certain inputs from being looked at) enforce this, so during training the model can't cheat by peeking at the future.
4. That chunk plays to you while the next one is being computed. If you interrupt mid-sentence, your words land in the next chunk's inputs and the brain can change course.

**A mental picture.** Imagine a comic strip drawn live, one panel every 0.7 seconds. The artist can look at every earlier panel and at what you just did, but never at panels that don't exist yet. Training uses the same rule, so the model practices under the exact conditions it will face live.

**Why it matters.** Many video generators make a whole clip at once and can "see" the end while drawing the beginning. That's great for a finished film, useless for a conversation, because in conversation the future depends on what *you* haven't done yet.

### 3. Three-stage training, ending with "dual rollout distillation"

**What it is.** The two modules are trained separately, then trained together under live-like conditions and sped up.

**How it works.**

1. **Stage 1, train the brain.** Fine-tune the Intent Module on conversations so it learns when to speak and what to say. Two clever touches: most chunks contain no new speech, so they **rebalance** the data so the model doesn't learn "always wait"; and they deliberately **perturb the history** (insert imperfect earlier replies) so the model learns to recover from its own mistakes. They use **LoRA**, a cheap way to fine-tune a big model by training a small add-on instead of every weight.
2. **Stage 2, train the body.** With the brain frozen, train the Realization Module with **flow matching** (a cousin of diffusion: the model learns the "direction" to push a noisy frame toward a clean one), on real and synthetic video-call data.
3. **Stage 3, distill and practice on itself.** **Distillation** means training a fast "student" to imitate a slow "teacher." Here the body is compressed from many cleanup steps to just **four** per chunk (a method called Distribution Matching Distillation), which is what makes real time possible. The key twist is **dual rollout**: during this stage both modules run on *their own generated outputs* instead of on recorded ground truth. The brain writes its own replies, and the body conditions on video it generated itself.

**Analogy.** Rehearsing a play by reading lines off the script is different from performing it live, where you must keep going after your own flubs. Stages 1 and 2 are script reading. Dual rollout is the dress rehearsal: the model gets used to building on its own slightly-off previous moments, which is exactly what happens in a real call. Without it, small errors tend to snowball over a long session (researchers call this **distribution shift**, when the data a model sees at use time drifts from what it saw in training).

### 4. The data: scripted fake video calls plus real recordings

To teach "when to talk," you need lots of two-person video with natural back-and-forth, which is scarce. The team built two sources:

- **Synthetic calls**: they wrote control cards and screenplays for everyday exchanges (planning, coaching, comforting, negotiating), turned them into prompts for a text-to-video generator, and filtered the results for problems such as the character's face changing, stray sounds, or the camera drifting.
- **Recorded data**: single-person videos, two-person video conversations (recorded at the same time and at different times), live streams where a host reacts to audience comments, two-channel audio of real conversations, and open datasets.

Live streams are a smart choice: a streamer answering a chat is basically a human doing exactly the "watch, decide, respond on camera" job Duo is learning.

## What they showed

**Speed.** On a single server with eight GPUs, one chunk's work takes about 330 to 650 milliseconds: 90 to 160 ms for the brain to decide, 200 to 450 ms to generate the video and audio at 768 by 576 resolution, and roughly 70 ms for decoding and overhead. Since each chunk covers 708 ms of playback, the system keeps up with real time. The catch: you also wait up to a full chunk for your own input to be collected, so the total delay from when you finish a sentence to when the AI's response begins can approach a second or more. That's in the same ballpark as commercial talking avatars, not faster.

**Quality.** The authors ran 30 live, real-time conversations and judged each one, at normal speed with sound, against six yes-or-no criteria (no partial credit). Overall it passed 168 of 180 checks (93.3%):

| Criterion | Pass rate |
| --- | --- |
| Speaks the right language | 30/30 |
| Speech is intelligible | 30/30 |
| Character's face stays the same person | 30/30 |
| Voice emotion matches facial emotion | 29/30 (96.7%) |
| Lips and sound are in sync | 27/30 (90%) |
| Responds sensibly to what the user actually said or did | 22/30 (73.3%) |

**The interesting part** is where it fails. The "body" is nearly flawless; the "brain" is the weak link. Misses came from jokes and from meaning that only emerges when you combine what someone says with what you see. In one example, a user indoors talks about a shared bike stopped by rain, and the model misreads it as a request for advice.

**Showcase.** The paper's figures show the model in plan revision, visual guidance, collaborative design, negotiation, coaching, decision support and comforting conversations. Some of those panels come from offline, script-conditioned runs rather than fully live calls, which the paper labels.

**Why it's convincing, and why it isn't yet.** It's convincing because it's a working, released system that runs live, with a clear architecture. It's not yet proof because there is no comparison against any baseline (not even a standard chatbot-plus-avatar pipeline), the 30 conversations are small, and the authors scored their own system.

## Limitations

- **Self-graded and unbenchmarked.** No outside evaluation, no baseline comparisons, and the paper doesn't report parameter counts or how much training data it used.
- **The brain hears you through a transcript.** In v1, your voice reaches the Intent Module as speech-recognition text, so your tone of voice, sighs and laughter are mostly lost to the decision-maker. The release notes say direct audio-video conditioning is planned for v2.
- **Heavy hardware.** The real-time setup uses eight GPUs; the released weights total about 153 GB. The offline demo needs two GPUs. This is not a phone app.
- **Short, single-user sessions.** The authors themselves say timing, consistency over longer sessions, and recovery from misunderstandings need broader evaluation. There's no notion of multiple users or of remembering you between calls.
- **Licensing.** The code is Apache-2.0, but the model weights use MiniMax's community license, whose grant, according to the release write-up, excludes the United States, the EU, the UK and South Korea. So a US startup can't simply ship it.
- **Deepfake risk.** A system that generates a convincing live person from one reference photo is also a tool for impersonation on video calls. The paper doesn't discuss safety testing.

## Where this is today

### How it IS used

- **The pipeline version is a real industry.** Tavus (Conversational Video Interface), Anam, HeyGen's interactive avatars and Synthesia sell real-time talking avatars for customer support, sales demos, tutoring and healthcare intake. They let you bring your own language model and voice. Anam's own benchmark (a vendor claim) reports median reply latency of about 1.24 seconds for Anam and 1.86 seconds for Tavus. These are the products Duo's "one generator for face and voice, plus a speak-or-wait brain" design is implicitly competing with.
- **Full-duplex voice is shipping, without a face.** OpenAI's GPT-Live replaced ChatGPT's Advanced Voice Mode around July 2026 and is full-duplex (it decides many times a second whether to talk or listen), but launched without camera input. Google's Gemini Live can see through your camera and screen share. Neither generates a video of the assistant.
- **Interactive world models are in public preview.** Google's Project Genie (built on Genie 3, launched to US AI Ultra subscribers in January 2026) lets you walk through generated worlds in real time, capped at 60-second sessions. That's the "world to explore" half of Duo's framing.
- **Duo itself is a research preview.** inclusionAI released the code and four checkpoints on Hugging Face around November 12 to 13. There's no hosted version and, as far as I could find, no product built on it yet.

### How it ISN'T used

- No major product I could find generates the assistant's face and voice together from a model that also decides turn-taking. Commercial avatars still animate a face *after* text-to-speech, and that stitched approach remains the default because each piece can be swapped and debugged separately.
- The "world model" label is contested. Most of the field uses it for physics and environment simulation (Genie, Dreamer); calling a conversational avatar a world model is the paper's own framing, and others may not adopt it.

### Lineage

Chatbot + text-to-speech + lip-synced avatar (Tavus, HeyGen) and full-duplex voice (Moshi, GPT-Live) and playable world models (Genie 3) -> one system where a decision model drives a live audio-video generator (Duo) -> what you can use today: the stitched avatar platforms; Duo is something to study and prototype with, not ship.

## Why it matters for Brendan

**As a filmmaker and for generative video.** This is the clearest example yet of generated video becoming a *live performer* rather than a rendered clip. The director/actor split is a useful mental model for directing AI characters: identity is locked by a reference image (it held the same face in 30 of 30 sessions), and the "performance" is driven by a separate decision layer you could, in principle, script or steer. If you ever want a generated character who reacts to an audience or a co-star in real time (interactive film, a live installation, an AR companion), this is the architecture to understand, along with its current limit: it reads lines well but misses subtext.

**Unstall.** A real estate agent's chief of staff probably doesn't need a face, but Duo's results are a good lesson for the voice product: the *rendering* was nearly perfect, and the failures were all in the brain's judgment of when and how to respond. The explicit `<speak>`/`<wait>` action each chunk is a simple, inspectable design you could borrow for a voice agent that knows not to talk over an agent who's mid-showing.

**Amelia.** Duo treats the conversation as one user and one AI, and it hears speech only as a transcript. Amelia's problem (who is speaking, across several people, and what each has said before) is exactly the piece Duo leaves out. That's a gap, not a competitor, and it's a reminder that "per-person context" isn't something even frontier video agents handle yet.

## Key terms

- **Full-duplex**: both sides of a conversation can talk and listen at the same time, the way people do, instead of strictly taking turns.
- **Reciprocal World Model (RWM)**: the paper's name for a system where an AI perceives you, decides how to respond, and generates that response as part of the world you see, in a continuous loop.
- **Intent / Realization**: Duo's two modules; the first decides whether to speak or wait and what to say, the second turns that decision into synchronized video and audio of a character.
- **Causal (chunk) conditioning**: generating each short slice of time using only what has already happened, never peeking at the future, so the system can run live.
- **Diffusion transformer with flow matching**: a video generator that starts from noise and repeatedly nudges it toward a clean frame, learning the direction of each nudge.
- **Distillation (and dual rollout)**: training a fast model to imitate a slow one; here done while both modules run on their own outputs, so they learn to cope with their own small errors.

## If you only have 10 more minutes

Read **Section 3.1** (the overview of the Reciprocal World Model, with its main architecture figure) to lock in the brain/body split, then **Section 7.1** (human evaluation), which is short and honest about where it fails. If you have a few minutes more, skim **Section 5.1** on synthetic data, since the screenplay-to-video-call pipeline is a filmmaker-friendly idea. Skip Sections 3.3 (the compression settings), 4.3 (the distillation math) and 6 (GPU scheduling) unless you plan to run the model.

## One question to think about

Duo's "body" almost never failed, but its "brain" missed a quarter of conversational cues like jokes. If you were directing a live AI character for an audience, would you rather it respond instantly and sometimes misread the room, or pause a beat longer to get it right, and how would you design the character so that a pause reads as thoughtful instead of broken?

## Sources

- [Duo: A Reciprocal World Model for Full-Duplex Interaction (arXiv 2611.15131)](https://arxiv.org/abs/2611.15131)
- [Duo full text (arXiv HTML)](https://arxiv.org/html/2611.15131v1)
- [Duo project page](https://duo-v1.github.io/)
- [Duo on Hugging Face Papers](https://huggingface.co/papers/2611.15131)
- [OrcaRouter: Duo-1.0-causal-base weights release notes](https://www.orcarouter.ai/blog/duo-1-0-causal-base-quiet-weights-release)
- [CASRAI: inclusionAI Duo v1 release](https://casrai.org/news/inclusionai-duo-v1-video-audio-model-2026)
- [Anam: Anam vs Tavus real-time avatar platforms (vendor post, 2026)](https://anam.ai/blog/tavus-conversational-video-interface-what-it-is)
- [Apidog: GPT-Live vs Gemini Live](https://apidog.com/blog/gpt-live-vs-gemini-live/)
- [Google: Project Genie](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/project-genie/)
