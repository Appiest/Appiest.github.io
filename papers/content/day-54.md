---
day: 54
title: "eDIAR: Training-Free Open-Speaker Streaming Diarization for Long Meetings and Large Archives via e-means"
short_title: "eDIAR (live 'who spoke when' that no longer runs out of seats)"
authors: "Kyudan Jung, Jihwan Kim, Minwoo Lee, Eunji Shin and Jaegul Choo (KAIST AI, Ewha Womans University)"
year: 2026
link: "https://arxiv.org/abs/2611.18529"
track: "Frontier"
section: "Frontier"
tldr: "Today's best live 'who spoke when' models can only track a fixed number of voices (four or eight 'seats'); eDIAR adds a small, retraining-free clustering step that splits a seat when two people end up sharing it, so a live system can handle 20 speakers and hour-long meetings at a steady cost, and it uses Meta's brand-new e-means clustering to link the same voice across a thousand-speaker archive in seconds."
---

# Day 54: eDIAR: Training-Free Open-Speaker Streaming Diarization for Long Meetings and Large Archives via e-means

Kyudan Jung, Jihwan Kim, Minwoo Lee and Jaegul Choo (KAIST AI) and Eunji Shin (Ewha Womans University). Posted to arXiv November 13, 2026 (cs.SD, sound). [Read the paper](https://arxiv.org/abs/2611.18529). Live demo: [Hugging Face Space](https://huggingface.co/spaces/hugging-apps/ediar). Track: Frontier.

This brief is built from the full paper (arXiv HTML version), plus current model cards and articles on the tools it builds on.

## TL;DR

The newest live speaker-tracking models work like a table with a fixed number of seats: each voice gets a seat, and when the seats run out, new people get squeezed into someone else's chair. eDIAR leaves the model alone and adds a cheap "is this seat actually two people?" check, which turns a 4- or 8-speaker model into one with no speaker limit, keeps it stable over hours, and costs the same per second at minute 90 as at minute 1.

## What it builds on

From the foundations track: Whisper (Day 19) is the transcription half of every "who said what" product, and diarization is the other half; the Transformer (Day 9) is inside the slot model; word2vec (Day 4) introduced the core move this paper relies on, turning something (there a word, here a voice) into a list of numbers where "similar" means "close together." On the frontier track it is the direct sequel to Day 36 (EvoSpeakerMem, a voice assistant that builds a memory of who is who). That paper assumed you could reliably tell voices apart in the moment; this one makes that "in the moment" layer work for big rooms and long sessions. It also connects to Day 38 (EmbeddingGemma 2), since speaker embeddings are the same idea applied to voices.

## The world before this paper

**Speaker diarization** means answering "who spoke when" in a recording: you get a timeline like "Speaker 1: 0:00 to 0:14, Speaker 2: 0:12 to 0:30," with no names, just consistent labels. There were two families of systems, each with a hole. **Clustering pipelines** (the classic approach, used by tools like pyannote) cut audio into pieces, turn each piece into a voiceprint, and group similar voiceprints. They handle any number of people but work best offline, after the whole recording exists; simple live versions make early guesses they can never take back, so mistakes pile up over a long meeting. **End-to-end neural diarizers** (like NVIDIA's Streaming Sortformer and the new Nemotron 3 Diarization, released in September 2026) are fast, accurate, handle people talking over each other, and run live. But they have a fixed number of output **slots**: four for Sortformer, eight for Nemotron 3. Speaker number nine has nowhere to go. A board meeting, a classroom, a 12-person film crew call: all of these break the model.

## Core ideas

### 1. Keep the slot model, but check each slot for "two people in one chair"

**What a slot is.** A slot model listens to audio in tiny 80-millisecond frames and, for each frame, outputs a probability for each slot: "slot 1 is talking with 92% confidence, slot 3 with 4%." Each slot is supposed to belong to one person. The model is very good at the hard parts: noticing when *someone* starts talking, and handling two people speaking at once (called **overlap**).

**The trick.** eDIAR trusts the slot model for *when* and *how many people at once*, and only questions *who*. Step by step:

1. Run the slot model (by default Nemotron 3, about 99 million parameters) as normal. A slot counts as active on a frame when its probability is above 0.55.
2. Separately, compute a **speaker embedding** (a voiceprint: a list of 256 numbers summarizing what a voice sounds like over about 1.5 seconds) using a small, standard model called WeSpeaker ResNet34 (6.6 million parameters).
3. Track which slots have been "used" (active for at least 2 seconds in total).
4. **Do nothing special until every slot is used.** If there are only five people in an eight-slot room, eDIAR behaves exactly like the slot model. This is why it rarely hurts.
5. Once all slots are used, for each slot, gather the voiceprints from moments when *only that slot* was talking (clean "solo" frames) and ask: do these form one tight group or several? It tries splitting into 4, 3 and 2 groups and keeps the largest split where the groups are clearly different voices (their average voiceprints are not too similar) and each group has a real amount of speech (at least 2 seconds or 3% of the slot's solo time).
6. Label each frame in that slot with whichever sub-group its voiceprint is closest to. Because the slot model already handled overlap, two overlapping slots still produce two overlapping labels.

**Analogy.** Think of a coat check with eight hooks. The attendant (the slot model) is fast and never drops a coat, but when coat number nine arrives it gets hung on a hook that's already taken. eDIAR is a second person who, once every hook is in use, looks at each hook and asks "are these two different coats piled together?" and if so, gives the second one its own ticket.

**Worked example.** A 12-person writers' room on an 8-slot model. By minute 20 all 8 slots are used. Slot 3 has been Maya, but two newer voices, Theo and Priya, keep landing in slot 3 too. eDIAR gathers slot 3's solo voiceprints, tries 3 groups, finds three clearly separate voice clusters each with plenty of speech, and splits slot 3 into Maya, Theo and Priya. The meeting now has 10 labels instead of 8.

**Training-free** means nobody retrains the slot model or the voiceprint model; eDIAR is just logic and clustering wrapped around existing, downloadable models. **Open-speaker** means there is no built-in cap on how many people it can label.

### 2. Live, but allowed to change its mind for 10 seconds

**The problem with going live.** In a live system you must show a label right away. But early on you have little evidence, so you'll sometimes be wrong. Old live clustering systems either never corrected themselves (errors pile up) or re-examined the whole meeting each time (cost grows as the meeting gets longer, until it can't keep up).

**eDIAR's compromise, step by step:**

1. Audio arrives in chunks (about one second each in the main tests).
2. After each chunk, re-run the slot-splitting step only on the **last 90 seconds**, a bounded window. Older audio isn't re-processed.
3. Show labels immediately, but allow them to be **revised until they are 10 seconds old**. After that they're frozen.
4. **Slot-anchored identities**: when slot 3 gets re-split in a new window, the new sub-groups are matched to the IDs slot 3 already had (by voiceprint similarity, using the **Hungarian algorithm**, a standard method for finding the best one-to-one pairing between two lists). So Maya stays "Speaker 3" instead of being relabeled every few seconds. Sub-groups that match nobody get brand-new IDs.

**Analogy.** It's like live captions on TV that you sometimes see correct a word a second later. Viewers get text instantly, the system gets a short grace period to fix it, and then the line is locked so the transcript stops shifting.

**Why it matters.** Because the window is fixed at 90 seconds, each update costs about the same at hour three as at minute one. The paper measures about 56 milliseconds per update with 4 speakers and about 188 milliseconds with 10, flat across three-hour recordings, and labels appear on average 0.7 to 0.8 seconds after the words are spoken.

### 3. e-means: faster grouping for huge piles of voiceprints

**What k-means is.** **Clustering** means grouping data points so similar ones end up together. **k-means** is the classic recipe, invented decades ago: pick k centers, assign every point to its nearest center, move each center to the average of its points, repeat. The standard version is called **Lloyd's algorithm**, and it looks at every single point on every round, which gets slow with millions of points.

**What e-means changes.** e-means is a new algorithm from Meta's FAIR lab, published only a week before this paper (November 2026, by a team including the creators of the FAISS search library). Instead of looking at all points each round, it looks at small random batches and nudges each center a little toward that batch's average, using an **exponential moving average** (a running average where recent data counts more and old data fades gradually). The batch and step sizes come from rules the Meta team fitted from experiments, so it needs almost no tuning.

**Analogy.** Lloyd's algorithm re-surveys the whole country before moving each polling station. e-means polls a few hundred random people at a time and shifts the stations a bit after each poll. You get to the same answer in a fraction of the effort.

**How eDIAR uses it.** Inside meetings, for the slot splits. And for a second job: **archive linking**, finding the same person across many separate recordings. On a test archive of 1,248 recordings with 1,251 different speakers (about 29 hours, 1.16 million voiceprint frames), e-means grouped everything in about 14 seconds with a lower error (19.3%) than Lloyd's algorithm managed in about 44 seconds (21.0%). Two passes of e-means matched Lloyd's 25-pass quality in roughly a seventh of the time. One catch: you have to tell it how many speakers are in the archive.

## What they showed

The standard score is **DER (diarization error rate)**: the share of time that's labeled wrong, counting missed speech, speech detected where there was none, and speech given to the wrong person. Lower is better.

**Ordinary meetings (fewer people than slots): about a tie.** On short (7 to 8 minute) clips from standard test sets, live mode at a 1-second delay:

- **VoxConverse** (TV debates and interviews): eDIAR 5.8 vs Nemotron 3 at 6.4.
- **AMI** (office meetings): Sortformer is best at 8.3; eDIAR 9.1.
- **LibriSpeech open-speaker** (synthetic conversations with 2 to 12 speakers): eDIAR 16.4 vs Nemotron 3 at 19.8 and Sortformer at 41.4.

So: a small win on VoxConverse, a small loss on AMI, and a big win on the test set with many speakers. Offline (whole recording at once), the pattern is the same: 4.5 vs 5.5 on VoxConverse and 8.6 vs 18.1 on LibriSpeech against Nemotron 3.

**Many speakers: the headline.** On synthetic conversations with up to 20 speakers, eDIAR cut error from 66% to 44% on top of Nemotron 3, and from 81% to 44% on top of Sortformer. Simply bolting the method onto Sortformer, with no retraining, took it from 41.4 to 16.2 DER on the many-speaker test.

**Hour-long meetings.** On six one-hour meetings with 12 to 20 speakers, Sortformer's error climbed from 23% at 15 minutes to 57% at 45 minutes, as people kept getting crammed into its four slots. eDIAR and the Nemotron 3 model stayed far below that, with eDIAR about half a point ahead of Nemotron 3 alone.

**Cheap to run.** Peak GPU memory on a 3.2-hour recording was 0.43 GB for eDIAR versus 9.6 GB for Streaming Sortformer, and it runs well faster than real time (it needs roughly 7% to 25% of the audio's length to process it).

**Why it's convincing.** It's a small, honest idea: it doesn't claim to beat the slot model where the slot model is fine, it fixes the specific failure (running out of slots) and shows exactly how much that failure costs.

## Limitations

- **Small and clean test sets.** The real meeting sets have only 15 or 16 meetings each, and the many-speaker and archive tests use read or interview speech, not messy real meetings with 15 people.
- **Tuned on the same data.** The thresholds (0.55, 0.6, 2 seconds and so on) were set on half of each test corpus. That's common but means real-world performance may be a bit worse.
- **Fast back-and-forth hurts.** On long meetings with many people and rapid turn-taking, the authors report its error can grow past the slot model's own.
- **English only, close mics.** No other languages, and no far-field rooms (one mic in the middle of a big room), which is exactly where many real products live.
- **Archive linking needs the head count.** You must tell it how many unique people are in the archive, which you usually don't know.
- **Anonymous labels only.** It says "Speaker 7," not "Maya." Naming people is a separate step.

## Where this is today

### How it IS used

- **The slot models it extends are brand-new and in use.** NVIDIA released Nemotron 3 Diarization as open weights in September 2026: about 100 million parameters, up to eight speakers, live latencies down to a third of a second, commercial use allowed. It topped a public diarization leaderboard (VoiceArena) at launch. Streaming Sortformer, its four-speaker predecessor, is in NVIDIA's NeMo toolkit.
- **e-means is public.** Meta FAIR open-sourced it in early November 2026, reporting 8 to 15 times faster clustering than FAISS on CPU. eDIAR is one of the first published uses outside Meta.
- **eDIAR itself is usable.** The model is on Hugging Face and a demo Space takes an audio upload and returns a color-coded speaker timeline plus a standard RTTM file (the common "who spoke when" file format). The paper says code is in the project repository.
- **Diarization is everywhere in meeting products.** Commercial APIs such as pyannoteAI (with a live model, Live-1), AssemblyAI, Deepgram and Speechmatics sell speaker labels to meeting-notes apps and recorders. Clustering-based systems like pyannote's have no speaker cap, which is why eDIAR's "remove the cap" contribution matters mainly for the newer neural, slot-based models.

### How it ISN'T used

- **Not in a shipping product yet** that I could find. It was posted four days ago.
- **Diarization is not identification.** Commercial diarization APIs return per-meeting labels that reset each session; recognizing the same person across recurring meetings (re-identification) is usually something developers build themselves with a voiceprint database. Gladia's guide on the topic says outright that this layer is not provided by its API. eDIAR's archive linking is a research step toward that, not a product feature.
- **The old "fully offline" approach is fading for live products.** Clustering everything after the meeting is accurate but too slow for live captions or a live assistant, which is why streaming slot models took over, and why their slot cap became the bottleneck.

### Lineage

Offline voiceprint clustering (k-means, pyannote) -> end-to-end neural diarizers with fixed slots (EEND, then Sortformer, then Nemotron 3) -> slot models plus targeted clustering for unlimited speakers (eDIAR) -> what live meeting tools and voice assistants will need for big rooms.

## Why it matters for Brendan

**Amelia.** This is almost exactly Amelia's first layer. Live speaker identification has to answer "who is talking right now" before per-person memory can attach anything to anyone. Three concrete takeaways: (1) if you build on Nemotron 3 or Sortformer, you will hit the slot cap the moment Amelia is used at a dinner party, a class or a team meeting, and eDIAR is a free, retraining-free way around it; (2) the "show a label now, allow corrections for 10 seconds, then freeze" pattern is a good product rule for Amelia's UI too: don't commit a memory to a person until their label has settled; (3) archive linking is the bridge from "Speaker 4 in tonight's meeting" to "the same Maya from last week," which is the core of per-person memory, but note the paper's own warning that this can re-identify people across recordings, so consent has to be designed in from the start.

**Permissioned relationship memory.** The ethics note in this paper is a useful line for your pitch: voiceprints that link people across recordings are biometric data (Gladia's guide notes they fall under GDPR), so "permissioned" isn't a nice-to-have, it's the legal shape of the product.

## Key terms

- **Speaker diarization**: labeling "who spoke when" in audio, with consistent anonymous labels rather than names.
- **Slot**: one of the fixed output channels in a neural diarizer, each meant to hold one speaker; the number of slots caps how many speakers it can label.
- **Speaker embedding (voiceprint)**: a short list of numbers that summarizes what a voice sounds like, so that similar voices have similar numbers.
- **Clustering / k-means**: grouping similar points; k-means picks k group centers and repeatedly moves them to the average of their nearest points.
- **e-means**: Meta's November 2026 replacement for standard k-means that updates centers from small random batches with a running average, reaching the same quality several times faster.
- **DER (diarization error rate)**: the share of audio time that is labeled wrong; lower is better.

## If you only have 10 more minutes

Read **Section 1 (Introduction)** for the slot-cap problem and the four contributions in plain language, then look at **Figure 1**: it shows in four small charts the many-speaker result, the hour-long meeting result, and the flat cost per update. If you have more time, read the **Ethics statement** at the end, since it's directly relevant to Amelia. Skip the threshold details and the appendix ablations unless you're implementing it.

## One question to think about

eDIAR can tell that two voices in different recordings are probably the same person, but not who that person is. For Amelia, should the moment of naming someone ("that's Maya") be something the user does explicitly, something each person agrees to themselves, or something the system infers and asks to confirm, and how does each choice change what people would be comfortable saying in front of it?

## Sources

- [eDIAR (arXiv 2611.18529)](https://arxiv.org/abs/2611.18529)
- [eDIAR full paper (arXiv HTML)](https://arxiv.org/html/2611.18529v1)
- [eDIAR on Hugging Face Papers](https://huggingface.co/papers/2611.18529)
- [eDIAR demo Space on Hugging Face](https://huggingface.co/spaces/hugging-apps/ediar)
- [Mixed News: Nvidia's Nemotron 3 Diarization tracks eight speakers](https://mixed-news.com/en/nvidia-nemotron-3-diarization-eight-speakers-100m-parameters/)
- [Let's Data Science: Meta FAIR open-sources e-means](https://letsdatascience.com/news/meta-fair-open-sources-e-means-a-faster-k-means-replacing-ll-707a9c1d)
- [pyannoteAI: Top 7 speaker diarization APIs and models in 2026](https://www.pyannote.ai/blog/top-7-speaker-diarization-apis-and-models-in-2026)
- [Gladia: Speaker re-identification across recurring meetings](https://www.gladia.io/blog/speaker-re-identification-across-recurring-meetings)
