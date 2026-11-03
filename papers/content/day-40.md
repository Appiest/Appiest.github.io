---
day: 40
title: "Apriel Voice 27B Preview: An Open Model for Speech, Reasoning, and Tool Use"
short_title: "Apriel Voice (one open model that hears, thinks and calls tools)"
authors: "Aman Tiwari, Akshay Kalkunte, Akintunde Oladipo and 28 others (ServiceNow AI)"
year: 2026
link: "https://arxiv.org/abs/2610.40738"
track: "Frontier"
section: "Frontier"
tldr: "ServiceNow bolted a speech \"ear\" onto an existing open reasoning model and trained the two together, producing a free, downloadable voice model that listens to you directly, thinks, and calls software tools, coming within striking distance of OpenAI's and Google's closed voice agents on realistic customer-service calls."
---

# Day 40: Apriel Voice 27B Preview: An Open Model for Speech, Reasoning, and Tool Use

Aman Tiwari, Akshay Kalkunte, Akintunde Oladipo, Jash Shah, Tara Bogavelli and 26 others, ServiceNow AI. Posted to arXiv on October 29, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.40738). Model weights: [ServiceNow-AI/Apriel-Voice-27B-preview on Hugging Face](https://huggingface.co/ServiceNow-AI/Apriel-Voice-27B-preview). Track: Frontier.

A note on why this paper: it was one of the most upvoted papers on Hugging Face's Daily Papers for November 2, and it lands squarely on Unstall. Day 30 (VISAGENT) was about designing a whole voice system; Day 36 (EvoSpeakerMem) was about remembering who is speaking. Today is about the brain in the middle: can one open model hear a request and act on it, with no transcription step in between? A note on accuracy: arXiv's full-text page was rate-limiting me during this run, so this brief is built from the paper's abstract, the official model card (which reproduces the main results tables), the vLLM integration code, and the coverage in Sources. Where a training detail was only in the full text, I say so rather than guess.

## TL;DR

Instead of the usual three-part voice stack (transcribe your speech, send the text to a chatbot, read the answer aloud), Apriel Voice feeds your voice straight into a reasoning model that can answer or call a tool, and on a realistic airline-support test it beats every other open system and is competitive with closed ones from OpenAI and Google, while still being slower than them.

## What it builds on

Whisper (Day 19) supplies the "ear": Apriel uses a Whisper encoder to turn sound into numbers. The Transformer (Day 9) and GPT-3 (Day 11) are the backbone family. InstructGPT (Day 16) is the ancestor of the "post-trained" chat model it starts from. ReAct (Day 18) is where language models learned to interleave thinking with tool calls, which is exactly what Apriel now does from voice. CLIP (Day 15) popularized the trick of lining up two kinds of data (there, images and text) in one shared space, the same move this paper makes for speech. Among frontier days, it continues VISAGENT (Day 30) and EvoSpeakerMem (Day 36), and it uses the same Gemma model family as EmbeddingGemma 2 (Day 38).

## The world before this paper

Voice agents (the AI on the other end of a support line, or a voice assistant that books things for you) have mostly been built as a **cascade**: three separate models in a row. First **ASR** (automatic speech recognition, speech to text), then an **LLM** (large language model) that decides what to say or do, then **TTS** (text to speech). Cascades are easy to build and debug, but every handoff adds delay, and the LLM only sees a transcript, so a misheard confirmation code or name can derail the whole call. The alternative, **speech-to-speech** models like OpenAI's GPT Realtime and Google's Gemini Live, hear and speak natively and are fast, but they are closed: you rent them, cannot download them, and cannot inspect or fine-tune them. Open models that take audio directly existed (for example Ultravox), but on realistic multi-step tasks with tools they lagged far behind. So the gap was: an open, downloadable model that hears speech directly and is actually good at reasoning and using tools.

## Core ideas

### 1. Give a smart text model an ear, instead of building a new voice brain

**What it is.** Apriel Voice is three pieces glued together:

1. **Audio encoder: Whisper large-v3-turbo.** An **encoder** is a network that turns raw input into a list of number vectors that capture its meaning. Whisper's encoder listens to 16 kHz audio (in 30-second chunks) and outputs one vector per short slice of sound.
2. **Projector.** A small learned translator that converts Whisper's vectors into the exact "vocabulary of vectors" the language model already understands. Think of it as a plug adapter between two countries' outlets.
3. **Backbone: Gemma 4 26B-A4B.** Google's open, already post-trained reasoning model. "26B-A4B" means it has about 26 billion parameters in total but is a **mixture of experts** (it routes each word through only a subset of its parts), so only about 4 billion are active at a time. That keeps it fast for its size.

**How it works, step by step.** You say "Can you move my flight to Thursday?" The encoder turns those two seconds of sound into a short sequence of vectors. The projector reshapes them so they look, to Gemma, like a special kind of word. Gemma then reads them alongside any text, images and tool results in the conversation, exactly as if you had typed something, and writes its reply.

**Analogy.** Rather than training a new employee who can both hear and do the job, you take your best existing employee, who already knows the job cold but only reads email, and give them a simultaneous interpreter who whispers directly into their ear. Except the "interpreter" here does not produce words; it hands over meaning, including things a transcript loses.

**Why this matters.** The hard part of a voice agent is not hearing; it is reasoning, following policy and using tools correctly. Gemma already does that well in text. Reusing it means the voice model inherits those skills instead of learning them from scratch.

### 2. One model that both talks and acts (a "2-stage" system)

**What it is.** The paper's headline phrase is that the model "directly processes speech and generates both responses and tool calls" with no separate dialogue model. A **tool call** is a structured message, like a little form in JSON, that tells software to do something: `search_flights(date="Thursday")`. The application runs the tool and pastes the result back into the conversation, and the model continues.

**What it does not do.** Apriel Voice outputs **text**, not sound. A separate TTS voice (in their tests, Cartesia's Sonic 3.5) reads the answer aloud. It is also not **full-duplex** (able to listen and talk at the same time, handling interruptions naturally); turn-taking is left to the app around it.

So the field now has three shapes, which the paper's comparison table names explicitly:

| Shape | Pieces | Example |
| --- | --- | --- |
| 3-stage cascade | ASR, then LLM, then TTS | Parakeet + Gemma 4 + Sonic |
| 2-stage | speech-understanding LLM, then TTS | Apriel Voice + Sonic |
| Speech-to-speech | one model, sound in, sound out | GPT Realtime, Gemini Live |

**A thoughtful extra: "pre-tool speech."** Tool calls take time, and silence on a phone call feels broken. The integration code turns on a behavior by default where the model first says a short spoken-style line ("Let me check that for you") before it fires off the tool call. Small, human, and directly about how the call *feels*.

**Thinking mode.** Like many recent models, it can write out private reasoning before answering. The headline voice-agent results use this mode. Thinking improves accuracy but costs time, which matters a lot when someone is waiting on the line.

### 3. Teaching the ear without making the brain forget

**What it is.** The danger in bolting a new input onto a trained model is **catastrophic forgetting**: as you train it on speech, it gets worse at the reasoning it was chosen for. The paper's two-stage training is designed to avoid that.

**Stage 1: build the speech interface.** Train mainly the connection between ear and brain, so speech vectors land somewhere sensible in Gemma's space. (The model card says the speech interface is "aligned first.")

**Stage 2: adapt ear and brain together,** using three ingredients:

- **Supervised fine-tuning (SFT)** on spoken tasks: transcription, translation, spoken questions, and **automatically constructed speech-conditioned dialogues**, meaning multi-turn conversations, built by a pipeline rather than by hand, where the user's turns are audio. This is how it learns to handle a spoken request in the middle of an ongoing chat with tools.
- **Text replay.** Mix in plain text training examples of the kind the backbone was originally good at, so it keeps practicing its old skills. Like a pianist learning jazz who keeps playing scales.
- **Two kinds of teacher signal, chosen by data source.** **Cross-entropy** is the normal "here is the one right answer, make it more likely" signal. **Forward KL distillation** is subtler: a **teacher** model shows its full probability for every possible next word, and the student learns to match that whole spread, not just the top pick. That carries more information, like learning from a mentor who tells you "probably A, maybe B, definitely not C" instead of just "A." The paper uses whichever signal fits each data source. (The abstract I could read does not name the teacher; a natural guess is the original text model, but treat that as unconfirmed.)

**Engineering to make distillation affordable.** Distillation means running a big teacher alongside the student during training, which is expensive. They host the teacher locally, overlap the teacher's and student's computation so neither waits, and fuse the loss math over the full vocabulary into one efficient step.

**Did it work?** Mostly yes. On text benchmarks the voice model roughly matches or slightly beats the original Gemma: MMLU-Pro 84.42 vs 85.27 (tiny drop), GPQA Diamond 80.40 vs 77.80, AIME 2025 identical at 81.67, and a text tool-use test (τ²) 70.95 vs 68.93. The brain did not forget.

## Walkthrough: one call to an airline voice agent

1. A caller says, "Hi, I need to rebook my flight, confirmation code K7Q-2LM."
2. Whisper's encoder turns the audio into vectors; the projector translates them into Gemma's space. No transcript is produced as an in-between step.
3. In thinking mode, the model reasons privately: the caller wants a rebooking, I have a code, I should look up the booking before promising anything.
4. Pre-tool speech: it outputs "Sure, let me pull up that reservation," which the TTS voice says right away.
5. It emits a tool call like `get_reservation(code="K7Q2LM")`. The app runs it and returns the booking details as text.
6. The model reads the result and replies with options, which TTS speaks.
7. The whole loop, from the caller stopping talking to hearing the answer, averaged 1.91 seconds in their tests, including the speech synthesis.

## What they showed

The most convincing test is **EVA**, a benchmark ServiceNow released earlier in 2026, where a simulated caller with a goal and personality talks, out loud, to the voice agent in airline scenarios (rebooking, cancellations, standby, vouchers) with 15 tools. It scores two things: **EVA-A** (accuracy: did the task end in the right database state, were facts and codes spoken correctly) and **EVA-X** (experience: brief, natural, good turn-taking). They also report **τ-Voice**, a spoken version of a well-known customer-service agent benchmark.

| System | Type | EVA-A | EVA-X | τ-Voice | Latency (s) |
| --- | --- | ---: | ---: | ---: | ---: |
| GPT Realtime 2.1 | Speech-to-speech, closed | 59.03 | 61.6 | 69.82 | 1.55 |
| Gemini 3.8 Live (extended thinking) | Speech-to-speech, closed | 54.82 | 73.5 | 84.19 | 1.50 |
| Parakeet + Gemma 4 26B | 3-stage, open | 39.97 | 3.93 | 67.78 | 3.01 |
| Flux + Gemma 4 26B | 3-stage, mixed | 36.07 | 29.22 | 65.92 | 2.92 |
| UltraVox v0.6 | 2-stage, open | 8.94 | 1.91 | 26.80 | 3.95 |
| **Apriel Voice 27B Preview** | **2-stage, open** | **51.27** | **74.13** | **65.51** | **1.91** |

How to read this:

- **Against other open systems, it is a big jump.** The previous open 2-stage models score in the single digits or teens on EVA-A; Apriel scores 51. The best open cascades using the *same* Gemma brain reach about 40 on accuracy but score terribly on experience (3.93 for one), largely because they are slow and clunky. Apriel is about a second faster than them.
- **Against closed systems, it is close but not ahead.** It beats Gemini Live on EVA-A and edges both closed models on EVA-X, but GPT Realtime is still more accurate, Gemini Live is far better on τ-Voice (84 vs 66), and both closed models are faster (about 1.5 s vs 1.9 s).
- **Interesting wrinkle:** on τ-Voice, the plain cascade with Gemma slightly beats Apriel (67.78 vs 65.51). Hearing audio directly is not automatically better for raw task success; its advantage shows up most in speed and conversational feel.

Other results: speech recognition error of 2.23 percent on a standard clean-audio test (LibriSpeech) and 11.25 percent on messy earnings-call audio; 81.13 on a spoken function-calling test (Speech-BFCL); 98.90 on Big Bench Audio (spoken reasoning puzzles); and 93.18 on spoken grade-school math.

Why it is convincing: the evaluation is end to end with real audio, real tools and a scored final database state, and it is compared against the systems people actually ship. Why to be careful: EVA was built by the same company, the domain is one industry (airlines) in English, and latency depends heavily on the serving setup (they used four high-end H100 GPUs and a custom serving stack).

## Limitations

- **Not truly speech-to-speech.** It hears natively but still speaks through a separate TTS, and it cannot listen while talking. Interruptions and turn-taking depend on the surrounding app.
- **Still slower than the closed leaders**, and thinking mode, which produced the best scores, adds delay.
- **English-first.** The model card warns multilingual quality is uneven.
- **Noisy rooms and distant microphones remain hard**, as do long recordings (repetition, losing the thread) and complex multi-tool workflows.
- **Heavy to run.** The reference setup is four data-center GPUs; this is not a phone or laptop model.
- **A "preview."** The authors themselves frame it as early. The vLLM integration was still awaiting review when I checked, and no hosted inference providers offered it yet.
- **Home-team benchmark.** The strongest results are on ServiceNow's own EVA benchmark. Independent replication will matter.

## Where this is today

### How it IS used

- **The model itself is brand new (released October 29 to November 2, 2026)**, so real-world use is just starting. Weights are public under an MIT license on Hugging Face, with a demo ("Apriel Live"), a Docker image for serving, and an open pull request to add it to vLLM, the most popular open-source serving engine. It had around 340 downloads in its first days and no third-party hosting yet.
- **ServiceNow's own direction:** ServiceNow sells enterprise IT and customer-service software, and coverage frames this as a backbone for voice-driven enterprise agents. I could not find a confirmed ServiceNow product that ships it yet, so treat that as intent, not fact.
- **The underlying recipe (speech encoder + projector + LLM) is widely used.** Ultravox, an open model from Fixie, uses the same shape (an adapter mapping audio into Llama or Gemma), outputs text, and powers the Ultravox Realtime developer platform. Apriel is the same idea, trained much harder on reasoning and tool use.
- **Cascades still run most production voice agents.** Frameworks like Pipecat and LiveKit Agents, and services like Deepgram's Voice Agent API, let developers chain ASR, an LLM and TTS. Industry write-ups in October 2026 argue cascades remain attractive because the text reply exists before it is spoken, so you can check it against policy, and each piece can be swapped separately. Apriel keeps that advantage: its reply is text, so you can still check it before TTS speaks.
- **Closed speech-to-speech models** (GPT Realtime, Gemini Live) are the speed and quality leaders that Apriel is chasing.

### How it ISN'T used (or not yet)

- **It does not replace speech-to-speech for the most natural conversations.** True full-duplex models that can be interrupted mid-sentence and respond with emotion in their voice are a different, harder category.
- **"Half-cascade" hybrids have a mixed track record.** A recent comparison found two tested hybrids (speech in, text out, separate TTS) scored very poorly on conversational experience. Apriel's EVA-X of 74 suggests that is not inevitable, but it is one data point.
- **Older "frozen everything, train only the adapter" recipes** (like early Ultravox) look superseded for agent work: Apriel's results suggest you need to adapt the brain itself, carefully, to get good spoken tool use.

### Lineage

Whisper (2022, speech to text) and CLIP-style alignment of modalities -> "audio adapter + LLM" models like Ultravox (2024 to 2025) -> Apriel Voice: an open reasoning model that hears directly and calls tools (2026) -> the open goal still ahead: a fully open, full-duplex speech-to-speech agent.

## Why it matters for Brendan

**Unstall.** This is close to a direct blueprint for your core engine. A real estate agent driving between showings says "Move the Henderson showing to 4 and text the buyer's agent," and the system must hear it, reason, and call calendar and messaging tools. Three concrete takeaways: (1) a 2-stage design keeps a text checkpoint, so Unstall can confirm before sending anything risky; (2) "pre-tool speech" is a cheap trick worth copying so the user never sits in silence; (3) EVA-style testing (a simulated caller, real tools, a scored end state, plus a separate "did it feel good" score) is exactly how you should evaluate Unstall before real agents depend on it. Being open and MIT-licensed also means you could, in principle, fine-tune it on real estate vocabulary like addresses, MLS numbers and names, which are exactly the "misheard entity" failures EVA found most damaging. The catch is cost: four data-center GPUs is not a startup's first deployment.

**Amelia.** Apriel hears audio directly but has no idea *who* is speaking. Pair today with Day 36: a speaker-identity layer in front, an Apriel-style model in the middle, and per-person memory behind it is roughly the full Amelia stack.

## Key terms

- **Cascade (3-stage)**: a voice system built from separate speech-to-text, language model and text-to-speech pieces in a row.
- **Speech-to-speech model**: one model that takes sound in and produces sound out, like GPT Realtime.
- **Encoder and projector**: the encoder turns audio into number vectors; the projector translates those into the language model's own vector space.
- **Tool call**: a structured instruction the model writes so software performs an action, like searching flights.
- **Distillation (forward KL)**: training a student model to match a teacher's full probabilities for each next word, not just the single right answer.
- **Full-duplex**: able to listen and speak at the same time, so it can be interrupted naturally.

## If you only have 10 more minutes

Read the introduction for why they chose a 2-stage design, then the voice-agent evaluation section with the EVA and τ-Voice comparison table (the same table is in the model card if arXiv is slow). If you want one more thing, read the short training overview of Stage 1 and Stage 2, which explains how they avoided forgetting. Skip the serving-efficiency and kernel details unless you are deploying it, and skip the long list of individual speech benchmarks.

## One question to think about

Apriel deliberately outputs text and lets another system speak it, which costs some speed but lets you inspect every reply before a human hears it. For Unstall, which moments in a real estate agent's day are worth half a second of delay for that safety check (sending a contract, quoting a price), and which should feel instant (reading back the next appointment)? Could one product use both modes?

## Sources

- [Apriel Voice 27B Preview: An Open Model for Speech, Reasoning, and Tool Use (arXiv)](https://arxiv.org/abs/2610.40738)
- [Paper page on Hugging Face Daily Papers](https://huggingface.co/papers/2610.40738)
- [Daily Papers for November 2, 2026 (Hugging Face)](https://huggingface.co/papers/date/2026-11-02)
- [Model card: ServiceNow-AI/Apriel-Voice-27B-preview (Hugging Face)](https://huggingface.co/ServiceNow-AI/Apriel-Voice-27B-preview)
- [vLLM pull request #64683: Add Apriel Voice support (GitHub)](https://github.com/vllm-project/vllm/pull/64683)
- [ServiceNow Open-Sources Apriel Voice 27B With Tool Calling (AI Weekly, November 2, 2026)](https://aiweekly.co/alerts/servicenow-open-sources-apriel-voice-27b-with-tool-calling)
- [Apriel Voice 27B: Open Model for Speech and Tool Use (CCTest)](https://cctest.ai/en/articles/apriel-voice-27b-preview-unifies-speech-reasoning-and-tool-use)
- [A New Framework for Evaluating Voice Agents (EVA) (ServiceNow on Hugging Face, March 2026)](https://huggingface.co/blog/ServiceNow-AI/eva)
- [Speech-to-Speech vs Cascaded Voice AI in 2026 (Coval, October 2026)](https://www.coval.ai/blog/speech-to-speech-vs-cascaded-voice-ai-which-architecture-should-you-deploy/)
- [Ultravox (Fixie, GitHub)](https://github.com/fixie-ai/ultravox)
