---
day: 50
title: "An LLM Is All You Need: Data-Efficient Adaptation to Full-Duplex, Word-Level Spoken Dialogue"
short_title: "Full-duplex on a budget (teaching a frozen AI to listen while it talks, in about 30 GPU-hours)"
authors: "Tairan Chen, Richard Yucheng He, Yihang Liu, Baodong Cao, Chen Xu"
year: 2026
link: "https://arxiv.org/abs/2611.14774"
track: "Frontier"
section: "Frontier"
tldr: "Instead of training a voice AI on hundreds of thousands of hours of conversation so it can listen while it talks, this paper bolts a small 97M-parameter add-on onto a frozen general AI model that decides, every 80 milliseconds, whether to say a word, wait, back off or jump in, and after about 30 GPU-hours of training it holds its own against big open full-duplex systems while being the least likely to cut you off when you pause."
---

# Day 50: An LLM Is All You Need: Data-Efficient Adaptation to Full-Duplex, Word-Level Spoken Dialogue

Tairan Chen, Richard Yucheng He, Yihang Liu, Baodong Cao and Chen Xu. Posted to arXiv November 10, 2026 (cs.CL). [Read the paper](https://arxiv.org/abs/2611.14774). Track: Frontier.

A note on sources: arXiv blocked full-text reads all morning (repeated rate limits), so this brief is built from the paper's abstract, which is unusually detailed, plus the benchmark papers and industry write-ups linked at the bottom. Every number about this paper below comes from the abstract. Where I explain *how* a piece probably works beyond what the abstract says, I flag it as an illustration, not a claim about the paper.

## TL;DR

You don't need a giant purpose-built speech model to get an AI that talks like a person (listening while speaking, saying "mhm," handling interruptions): you can teach an existing frozen AI the *rhythm* of conversation with a tiny add-on and about 30 GPU-hours of training.

## What it builds on

From the foundations track: the Transformer (Day 9) and GPT-3 (Day 11) are the ancestors of the frozen "brain" this paper reuses; Whisper (Day 19) is the ancestor of the speech-hearing front ends these systems rely on; ReAct (Day 18) is the idea of a model interleaving thinking with acting, here applied to the act of *speaking*. On the frontier track it continues a voice thread: VISAGENT (Day 30, a phone line run by voice agents), StreamVibe (Day 33, an AI that knows when to speak up), EvoSpeakerMem (Day 36, keeping track of who is speaking) and especially Apriel Voice (Day 40), which ended with "the open goal still ahead: a fully open, full-duplex speech-to-speech agent." Today's paper is a cheap route toward that goal. It also pushes back on something Day 40 suggested: that "freeze the brain, train only the adapter" recipes were being left behind.

## The world before this paper

Most voice assistants are polite walkie-talkies. You talk, they wait for silence, they answer. That's called **half-duplex** (only one side can transmit at a time). Real conversation is **full-duplex**: both people can make sound at once. We say "mhm" while the other person talks, we pause mid-sentence to think without giving up our turn, and we cut each other off. Getting AI to do this has worked, but expensively. Open systems like Kyutai's Moshi (2024) and NVIDIA's PersonaPlex (2026) model both people's audio as parallel streams and learn conversation timing from enormous amounts of recorded speech: the paper puts the usual budget at hundreds of thousands to millions of hours. That's out of reach for a university lab or a startup, and the resulting speech models tend to be weaker "thinkers" than a top text model, because so much of their capacity goes into handling raw audio. The cheaper alternative, a **cascade** (speech-to-text, then a text model, then text-to-speech), keeps the smart brain but feels robotic: it uses silence to guess when you're done, so it either cuts you off when you pause or waits awkwardly long.

## Core ideas

### 1. Keep the brain frozen; teach it only the timing

**What it is.** The authors start with a general-purpose **multimodal LLM** (a large language model that can also take in audio, images and so on) and **freeze** it: its billions of weights never change. Everything new is learned by lightweight **adapters** (small extra layers inserted into the model, like clip-on lenses on a camera) plus a handful of new **token embeddings** (the model's internal "meaning vectors" for a few brand-new vocabulary items). The trainable part totals **97 million parameters**, a tiny fraction of a modern LLM.

**Why that works.** The bet is that a strong LLM already understands language, meaning and what a sensible reply looks like. What it lacks is *timing*: when to talk, when to stay quiet, when to toss in an "mhm." That's a much smaller skill than understanding language from scratch, so it should need far less data.

**Analogy.** Hiring an experienced screenwriter to do live improv. You don't need to teach them dialogue. You need to teach them to watch their scene partner and time their lines. That's a weekend workshop, not a degree.

**Why it matters.** Because the brain is untouched, it doesn't forget what it knew (a common problem called **catastrophic forgetting**, where retraining a model on a new skill degrades old ones). And when a better base model comes out, you could in principle swap it in and retrain only the small add-on.

### 2. A conversation clock: one decision every 80 milliseconds

**What it is.** The system runs on an **80 ms frame clock**: time is chopped into slices of 80 milliseconds (12.5 per second), and at every slice the "thinker" (see idea 3) must emit exactly **one token**. A token here is either a word piece to say, or one of several special **control tokens** that encode conversational moves. The abstract names three kinds: **pauses**, **yields** and **onsets**.

**How it works, as a mental picture** (illustrative; the exact token set and names are in the paper):

- While you're talking, the model keeps emitting "stay quiet" style tokens, 12.5 times a second, while still listening.
- You pause for half a second to think. The model has to decide: is that a turn ending, or just a breath? If it's a breath, it keeps waiting.
- You finish. The model emits an **onset** token (start speaking) and then words, one per frame.
- You cut in with "wait, actually." The model emits a **yield** token (give up the floor) and stops.

**The guardrail: a finite-state machine.** A **finite-state machine (FSM)** is a simple rulebook with a few states (say "listening," "speaking," "yielding") and allowed moves between them. It constrains which tokens are legal at each moment, so the model can't produce nonsense like "start speaking" while it's already speaking, or words while it's supposed to be silent.

**Analogy.** A drummer keeping time. Every beat, the drummer either plays a note or a rest. The FSM is the sheet music's rules: you can't end a bar you never started. Silence becomes an explicit choice, made on the beat, rather than an absence the system has to infer from a gap.

**Why "word-level."** The thinker produces *words* (text tokens), not raw audio. That keeps the expensive LLM working in its native medium, and is why it can stay a strong reasoner.

### 3. Thinker and talker, trained separately

**What it is.** The system is split in two. The **thinker** (the frozen LLM plus adapters) listens and decides what to say and when, emitting that one-token-per-frame stream. The **talker** turns those tokens into actual voice. Crucially, the talker reads *only* the thinker's discrete tokens, nothing hidden inside the thinker.

**Why that's a big deal.** Because the only connection is a plain stream of tokens, the two halves can be **trained independently**. You can improve or replace the voice without touching the timing brain, and vice versa. (The thinker-talker split itself isn't new: Alibaba's Qwen2.5-Omni popularized it in 2025. But there the talker reads the thinker's internal states, which ties them together, and those systems were described as near-duplex rather than truly full-duplex.)

**Analogy.** A writer and a voice actor connected only by a teleprompter. The writer types words and stage directions ("[pause]", "[cut]"); the actor performs them. You can recast the actor without rewriting the show.

### 4. A four-stage curriculum, about 30 GPU-hours

**What it is.** A **curriculum** is a training plan that teaches easy things before hard ones. The paper converts the frozen LLM into a full-duplex system in four stages, for about **30 GPU-hours** of total compute (one GPU running for about 30 hours, which rents for well under $100 in the cloud today).

**How it probably flows** (illustrative; the abstract gives the count and cost, not the stage contents): first teach the adapters to align with the new frame clock and special tokens, then teach basic turn-taking, then overlap and backchannels, then longer multi-turn conversations. Read the paper's method section for the actual stages and datasets.

**For scale.** If the big systems need hundreds of thousands of hours of speech data and many thousands of GPU-hours, this is several orders of magnitude cheaper. That's the paper's headline.

## Walkthrough: one moment of conversation, frame by frame

An illustration of the behavior the paper is built to produce (not a transcript from the paper):

1. **0.0 s.** You: "So I want to list the house on Elm, but..." The thinker emits silent tokens, frame after frame, while listening.
2. **1.6 s.** You trail off for 600 ms to think. A naive system would see silence and start talking. The thinker keeps emitting "wait" tokens. (This is exactly the behavior the paper measures as *pause handling*, and where it scores best.)
3. **2.2 s.** You: "...the seller wants to wait until spring." Mid-sentence, the thinker emits a short backchannel ("mhm"), which the talker voices softly while you continue.
4. **3.4 s.** You stop. The FSM allows an onset; the thinker emits it, then one word per frame: "Got it, should I..."
5. **3.8 s.** You interrupt: "Actually, also check the comps." The thinker emits a yield; the talker stops mid-sentence. The frozen LLM, which heard everything, then answers the new request.

## What they showed

**Benchmarks.** Two public tests of conversational behavior:

- **Full-Duplex-Bench** measures four skills: *pause handling* (how often the model wrongly grabs the floor when you merely pause, called the **takeover rate**, lower is better), *backchanneling* (how often and how naturally it says "mhm"), *smooth turn-taking* (how fast it replies when you're actually done) and *interruption handling* (does it stop, and is what it says next coherent).
- **InteractionBench**, which (per the abstract) also scores spoken-task accuracy, groundedness (sticking to facts it was given) and coherence over long conversations.

**Headline results**, as stated in the abstract:

- **Competitive overall** with open-source full-duplex systems trained at large scale, despite using a sliver of the data and compute.
- **Least likely to take the floor when the user merely pauses.** This is the most practically important win: being cut off mid-thought is the number one complaint about voice assistants.
- **Backchannels most often** of the systems compared.
- **Leads on spoken-task accuracy, groundedness and coherence over long conversations.** That's the payoff of keeping a strong frozen LLM: it stays smart.

The abstract doesn't give the exact numbers or the full list of systems compared; those are in the paper's tables.

**Why it's convincing.** It's tested on public benchmarks that other full-duplex systems also report on, and it wins on the specific dimensions you'd predict from its design: timing (because of the frame clock and FSM) and intelligence (because of the frozen LLM).

**Why it's surprising.** The field's assumption has been that natural conversational timing is learned from massive amounts of real two-person audio. This suggests timing is a small skill you can graft on, if the brain underneath is good.

## Limitations

- **"Competitive," not "best."** On some full-duplex measures it matches rather than beats the big systems. The abstract highlights where it leads; check the tables for where it trails.
- **Backchanneling "most often" isn't automatically good.** Too many "mhms" is annoying. Full-Duplex-Bench also scores whether backchannel *timing* matches humans; whether this system wins on that too isn't clear from the abstract.
- **The voice is only as good as the talker.** Since the talker only sees words and control tokens, it can't easily pick up on the user's tone. Emotional or prosodic nuance (sounding sympathetic, matching energy) is harder in a word-level design than in audio-native models like Moshi.
- **80 ms is a floor on reaction time.** Every decision waits for the next frame. That's fine for conversation but adds up with the talker's own delay.
- **Benchmarks are not phone calls.** Neither benchmark captures noisy rooms, crosstalk from several people, or bad cell connections.
- **Brand new, no replication yet**, and the abstract doesn't mention a code or model release.

## Where this is today

### How it IS used

- **Full-duplex voice is now a product category.** OpenAI's GPT-Live-1 arrived in ChatGPT in July 2026 and in the API on September 10, 2026, at $0.05 per minute, listening and talking at the same time and handing reasoning and tool calls to a separate backend model. OpenAI reports 80.1% on a full-duplex interactivity benchmark versus 45.4% for its previous realtime model, and Yelp uses it for phone reservations. That "speech layer plus separate brain" split is a close commercial cousin of this paper's thinker and talker.
- **The open field is crowded.** A public tracker lists 40 full-duplex models, 12 released between September and November 2026 alone (including Amazon Nova 2.5 Sonic, Grok Voice 3.0, Gemini 3.8 Live and open-weight ones from Ant Group and NVIDIA). Kyutai's Moshi and NVIDIA's PersonaPlex remain the reference open systems this paper is measured against in spirit.
- **Thinker-talker is a mainstream architecture.** Alibaba's Qwen Omni line uses it, valued because the LLM keeps its long context, tool calling and retrieval.
- **Benchmarks are standardizing.** Full-Duplex-Bench (with v1.5, v2 and v3 versions) is the shared yardstick that both vendors (OpenAI quotes it) and academic papers like this one report on.

### How it ISN'T used

- **Most production voice agents still take strict turns.** Industry write-ups describe cascaded speech-to-text, LLM and text-to-speech pipelines (on platforms like LiveKit and Pipecat) as still common, because they're simpler to control, audit and plug into tools. For scripted calls (IVR menus, data capture, regulated scripts) half-duplex remains a sensible choice.
- **"Barge-in" is often a switch, not a skill.** Many deployed systems can be interrupted, but can't tell a real interruption from an "mhm," so they stop talking whenever you make a sound.
- **This specific recipe** is days old; nothing public runs it in a product.

### Lineage

Walkie-talkie voice assistants (Siri-era cascades) -> audio-native full-duplex models trained on huge speech corpora (Moshi, 2024; PersonaPlex, 2026) -> thinker-talker designs that keep a strong LLM (Qwen Omni, 2025) -> commercial full-duplex APIs (GPT-Live-1, 2026) -> this paper: full-duplex timing grafted onto a frozen LLM with a tiny add-on -> likely next: anyone with a good open LLM and a weekend of GPU time can build a voice agent that doesn't cut people off.

## Why it matters for Brendan

- **Unstall.** A voice-first chief of staff for real estate agents lives or dies on not interrupting. Agents talk in fragments while driving between showings ("so the Elm listing... uh... tell the seller..."). The metric this paper wins on, not taking the floor during pauses, is exactly the one your users will feel. Two practical takeaways: you may not need to pick between "smart cascade that cuts people off" and "natural duplex model that's dumber," and the thinker-talker split means you could keep your own LLM, tools and memory, and rent or swap only the timing layer and voice. (Industry pieces also flag where call audio is stored and for how long as the real deployment question for hosted duplex APIs, which matters for client conversations.)
- **Amelia.** Live speaker identification needs the same skill as full-duplex: tracking who holds the floor, frame by frame, including overlaps. The paper's representation, explicit tokens for onsets, yields and pauses on a fixed clock, is a clean way to log "who started talking when and who gave way," which is exactly the timeline a per-person conversation memory needs.
- **Your memory and continuity startups.** The frozen-brain design is a quiet argument for your thesis: keep the core model general, and put the specialized, swappable parts (timing, voice, memory) around it.

## Key terms

- **Full-duplex**: both sides of a conversation can speak and listen at the same time, like a phone call; half-duplex means taking strict turns, like a walkie-talkie.
- **Backchannel**: a short listener signal ("mhm," "right") that shows attention without taking the turn.
- **Frozen model with adapters**: a pretrained model whose weights stay fixed, with small trainable layers added to teach it a new skill.
- **Frame clock**: chopping time into fixed slices (here 80 ms) and making exactly one decision per slice.
- **Finite-state machine**: a small rulebook of states and allowed transitions that keeps the model's moves legal.
- **Thinker-talker**: an architecture where one model decides what to say and another turns it into speech.

## If you only have 10 more minutes

Read the introduction, then go straight to the method figure showing the thinker, the talker and the 80 ms clock, and the table of control tokens with the finite-state machine. Then read the Full-Duplex-Bench results table, focusing on the pause-handling takeover rate column, since that is the paper's clearest win. Skip the adapter implementation details and the curriculum hyperparameters unless you plan to build it.

## One question to think about

If an AI never interrupts you and always says "mhm" at the right moment, it will feel like it's listening. How would your users, or you, tell the difference between an AI that sounds attentive and one that actually understood?

## Sources

- [An LLM Is All You Need: Data-Efficient Adaptation to Full-Duplex, Word-Level Spoken Dialogue (arXiv)](https://arxiv.org/abs/2611.14774)
- [Full-Duplex-Bench: the benchmark's original paper (arXiv)](https://arxiv.org/html/2503.04721v3)
- [Full-Duplex-Bench review: dimensions and metrics (Moonlight)](https://www.themoonlight.io/review/full-duplex-bench-a-benchmark-to-evaluate-full-duplex-spoken-dialogue-models-on-turn-taking-capabilities)
- [Introducing GPT-Live-1 in the API (OpenAI)](https://openai.com/index/introducing-gpt-live-1-in-the-api/)
- [OpenAI's GPT-Live-1 API lets developers build apps that talk and listen at the same time (The Decoder)](https://the-decoder.com/openais-gpt-live-1-api-lets-developers-build-apps-that-talk-and-listen-at-the-same-time/)
- [Full-duplex voice AI is a deployment decision, not latency (ibl.ai)](https://ibl.ai/blog/gpt-live-1-full-duplex-voice-api-enterprise)
- [Full-Duplex Voice Agents: Simultaneous Speech (Evalgent)](https://www.evalgent.com/blog/full-duplex-voice-agents)
- [Speech-to-Speech Models in 2026: Three Architectural Bets (Krzysztof Sopyła)](https://ai.ksopyla.com/posts/voice-to-voice-models-2026-review/)
- [Full-duplex model tracker (Fullduplex)](https://www.fullduplex.ai/models)
