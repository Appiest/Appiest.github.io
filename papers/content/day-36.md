---
day: 36
title: "From Voiceprints to User Entities: Online Speaker-Memory Construction for Multi-User Spoken Agents"
short_title: "EvoSpeakerMem (a voice assistant that keeps track of who is who, and whose memories are whose)"
authors: "Yucong Zhang, Cancan Li, Bo Xiao, Ke Zeng, Ming Li (CUHK-Shenzhen, Meituan, Wuhan University)"
year: 2026
link: "https://arxiv.org/abs/2610.36713"
track: "Frontier"
section: "Frontier"
tldr: "A voice assistant shared by several people has to decide whose memory each sentence belongs to before it can personalize anything, and this paper shows that treating a voiceprint as evidence to be carefully updated (rather than a fixed ID card) keeps profiles from splitting apart or bleeding into each other, raising answer accuracy by up to about 12 points with zero cases of handing one user's memories to another."
---

# Day 36: From Voiceprints to User Entities: Online Speaker-Memory Construction for Multi-User Spoken Agents

Yucong Zhang, Cancan Li, Bo Xiao, Ke Zeng and Ming Li (corresponding author). The Chinese University of Hong Kong, Shenzhen; Meituan (the Chinese delivery and services giant); and Wuhan University. Posted to arXiv on October 27, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.36713). Track: Frontier.

A note on why this paper: it is not the most upvoted paper of the week, but it is the most direct hit on one of your projects I have seen in this series. It is essentially a research version of Amelia's core problem: live speaker identification feeding per-person conversation memory. A note on accuracy: this brief is built from the full arXiv HTML paper. The code, dataset and demo are posted at anonymous links (the paper appears to be under anonymous review), and I did not run them.

## TL;DR

Before a shared voice assistant can remember anything about you, it has to know it is you, and this paper argues that the right way to do that is to treat each voiceprint as one more piece of evidence about a person who builds up over time, updating that person's stored voice only when the match is very confident, so the system neither loses track of returning users nor mixes two people's memories.

## What it builds on

Word2vec (Day 4) introduced the idea that meaning can be a point in space, compared by angle; a "voiceprint" is the same trick applied to voices. Whisper (Day 19) is the ancestor of the speech-to-text step. RAG (Day 14) is the pattern of looking up stored facts before answering, which is what the memory backend does here. Among frontier days, it connects directly to Day 23 (Cortex) and Day 28 (MemoryTax), both about how agents store memory, and Day 30 (VISAGENT), an end-to-end voice agent. Those papers all quietly assume the system knows who is talking. This one does not.

## The world before this paper

Research on AI memory has exploded, and there are good benchmarks for it. The best known, LoCoMo, tests whether an assistant can remember facts across very long conversations. But nearly all of these benchmarks are text, and they hand the system a label saying who said each line. In real life, a kitchen speaker, a car assistant, or a meeting bot just hears voices. Separately, the speech field has spent years on **speaker verification**: given two recordings, are they the same person? That work is usually tested as a one-off yes or no decision. Nobody had studied the combination: a system that hears people over weeks or months, has to build up profiles on the fly with no sign-up step, and then uses those profiles to decide whose private memories it is allowed to use. And there is a hidden problem: your voice drifts. A cold, a new microphone, a noisy room, or simply a year passing all change how you sound.

## Core ideas

### 1. A voiceprint is evidence about a person, not the person

**What it is.** A **speaker embedding**, often called a **voiceprint**, is a list of a few hundred numbers that a neural network (here a widely used one called **ECAPA-TDNN**) produces from a clip of someone talking. The network is trained so that clips of the same person land close together and clips of different people land far apart. You can picture each clip as a dot on a giant map, where each person's dots form a cloud.

To compare two dots, the system uses **cosine similarity**: a score from about -1 to 1 based on the angle between them. Close to 1 means "pointing the same way," likely the same speaker.

The paper's key reframing: most systems treat the first voiceprint you give as your permanent ID card. The authors argue that a voiceprint is just an *observation* of you, and a person (they call it a **user entity**) is something you build up out of many observations.

**How a user entity is stored.** Each entity holds three things:

1. A **center**: the average location of that person's voice dots so far.
2. A **count**: how many turns have been linked to them.
3. A **memory partition**: a private folder of facts extracted from what they said ("my sister lives in Denver," "I have a dentist appointment Friday").

**Analogy.** Think of a casting director who has met an actor once. If she only ever compares new auditions to that one headshot, she will stop recognizing the actor after a haircut and a year of aging. If she keeps a running mental picture that she refreshes every time she is *sure* it is them, she keeps up.

### 2. Two kinds of mistakes, and why they compound

The paper names the two ways an identity mistake damages memory:

- **Fragmentation**: a returning user is treated as a stranger. Their history gets split into two or more profiles, so the assistant "forgets" things it actually knows.
- **Contamination**: two different people get merged, or one person's sentence gets filed under someone else. Now one profile contains another person's facts, and the assistant might tell your roommate about your doctor's appointment.

These errors are **stateful**: they do not just cause one bad answer. A wrong filing stays in memory and poisons future answers. And the two errors pull against each other. Be strict about matching and you fragment; be loose and you contaminate. The paper insists on measuring both together, which is one of its most useful contributions.

To measure them, it uses **B-cubed (B³) F1**, a score that checks for each turn whether the turns it was grouped with are really the same speaker (catching contamination) and whether all of that speaker's turns ended up together (catching fragmentation). Higher is better. It also reports **FNUR (false new-user rate)**: the share of returning-speaker turns wrongly sent to a brand new profile, a pure fragmentation measure.

### 3. EvoSpeakerMem: link generously, update cautiously

**What it is.** EvoSpeakerMem is the paper's system. It is **training-free** (no neural network is trained; it is logic wrapped around existing models) and it sits in front of any ordinary text memory system. **Online** and **causal** mean it handles turns one at a time as they arrive, never peeking at the future.

**How it works, step by step.** For every new spoken turn:

1. **Embed.** Turn the audio into a voiceprint.
2. **Score.** Compare it, by cosine similarity, to the center of every existing user entity.
3. **Route (link or create).** If there are no entities yet, or the best score is below **0.489**, create a new entity. Otherwise, link the turn to the best match. That 0.489 is not arbitrary: it is the **equal error rate (EER) point**, the threshold where the system wrongly accepts strangers exactly as often as it wrongly rejects real matches, measured once on a reference set of voices and then frozen.
4. **Gated update.** Here is the clever part. Linking a turn to you and *updating your stored voice* are separate decisions. The center only moves toward the new voiceprint if the score is at least **0.58**, a stricter bar. Between 0.489 and 0.58, the turn is filed under you, but your voice profile is left alone. When it does update, the new center is a simple running average of all accepted voiceprints.
5. **Write memory.** An audio-capable language model (Qwen3-Omni) transcribes the turn. The transcript, the entity ID and a timestamp go to a text memory system called **LightMem**, which pulls out individual facts and stores them in that entity's private partition. Importantly, *what* you said never influences *who* the system thinks you are; routing is purely by voice.

**Why two thresholds?** If you update on every link, a single wrong link drags your center toward the other person, which makes the next wrong link more likely: a slow slide into contamination. If you never update, your profile goes stale as your voice drifts: fragmentation. Gating lets the profile follow drift using only the cases it is sure about.

**Analogy.** A bouncer at a members' club lets you in if you look *reasonably* like your membership photo. But he only replaces the photo on file when he is *certain* it is you, so a lookalike who gets in once does not become the new reference photo.

The paper compares four policies: **Fixed** (keep the first voiceprint forever), **Update** (update on every link), **Gated Update** (the method above), and **All-exemplar KNN** (keep every accepted voiceprint and score a newcomer by its average similarity to the five closest stored ones; KNN stands for k-nearest neighbors).

### 4. Identity-gated memory: when unsure, give nothing

**What it is.** When someone asks a question ("what did I say my sister's name was?"), the system matches the voice to its single best entity. It only opens that entity's memory if the match clears 0.489. If not, it answers with no personal memory at all. The paper counts every query as **correct** (right person's memory opened), **wrong** (someone else's memory opened, the dangerous case) or **denied** (no memory opened, annoying but safe).

**Analogy.** A receptionist who will read out your appointment details only if she recognizes you; if she is unsure, she says "I can't share that," rather than guessing and reading someone else's file aloud.

### Walkthrough: one evening with a shared kitchen assistant

This example is illustrative; the numbers are made up but follow the paper's rules.

1. **Monday.** Maya says, "I'm vegetarian." No entities exist, so the system creates Entity A, center = Maya's voiceprint, and files "vegetarian" under A.
2. **Monday.** Jordan says, "I'm allergic to nothing, I eat everything." Similarity to A is 0.21, below 0.489, so a new Entity B is created.
3. **Three weeks later.** Maya has a cold. Her voiceprint scores 0.52 against A. That clears 0.489, so the turn is linked to A and her new fact is filed there. But 0.52 is below 0.58, so A's center is *not* moved toward her sick voice.
4. **A month later.** Maya, healthy, on a new phone. Score 0.66 against A. Linked, and since 0.66 clears 0.58, A's center shifts slightly toward how she sounds on the new phone. The profile is now tracking her drift.
5. **That evening.** Jordan asks, "What should I cook for myself?" Best match is B at 0.71, so only B's memory is opened. The assistant does not suggest vegetarian food because of Maya's preference.

Under the **Fixed** policy, step 4 might have scored below 0.489 against her original Monday voiceprint, creating a third "stranger" entity: fragmentation. Under **Update**, step 3's sick-voice turn would have moved her center, and repeated borderline links like that are how profiles drift into someone else.

## What they showed

**Voices really do drift.** On SMIIP-TV, a dataset of 373 speakers recorded over 90 days with a follow-up about a year later for 118 of them, a frozen first voiceprint rejected the real person 29.8% of the time when the recordings were a day apart, 40.7% at two to three months, and 55.6% at a year. In other words, after a year a fixed profile fails to recognize the right person more often than not. A stronger voice model (ReDimNet2-B6) helped a lot but showed the same upward trend (5.2% to 13.0%).

**A new benchmark, LoCoMo-ID.** The authors took LoCoMo's ten long two-person conversations (5,882 turns), gave each character a synthetic voice using Qwen3-TTS, hid the speaker labels, and rewrote most questions into first person ("what did *I* say...") so the system has to figure out who is asking. That produced 30 voice collections, about 17,600 history clips and about 6,000 spoken questions. They also made a **shifted** version where history audio is passed through simulated rooms, devices and background noise, and a four-speaker stress test that interleaves two stories with shared character names and conflicting facts.

**Grouping turns into people (B³, higher is better).**

| Policy | Clean audio | Shifted audio |
| --- | --- | --- |
| Fixed | 97.0 | 74.2 |
| Update | 98.4 | 93.5 |
| Gated Update | 99.5 | 92.7 |
| All-exemplar KNN | 98.5 | 96.6 |

With clean audio all policies look fine. Add realistic recording changes and the fixed policy collapses, because people stop matching their first voiceprint.

**Answering questions with identity gating (4,113 questions).**

| Audio | Policy | Correct / Wrong / Denied | Answer accuracy |
| --- | --- | --- | --- |
| Clean | Fixed | 4084 / 0 / 29 | 71.4% |
| Clean | Gated Update | 4110 / 0 / 3 | 75.3% |
| Clean | All-exemplar KNN | 3993 / 116 / 4 | 73.6% |
| Shifted | Fixed | 4079 / 1 / 33 | 60.2% |
| Shifted | Gated Update | 4109 / 0 / 4 | 71.8% |
| Shifted | All-exemplar KNN | 3993 / 116 / 4 | 72.4% |

This is the paper's punchline. Gated Update beats Fixed by about 4 points on clean audio and about 12 points on shifted audio, and it *never* opened the wrong person's memory. KNN looks slightly better on raw accuracy in the shifted case and was the best at clustering, but it handed someone else's memories to the asker 116 times. A good clustering score can hide a privacy leak, which is exactly why the authors insist on measuring both kinds of error.

**Four speakers.** Gated Update again had the best grouping (97.8) and best accuracy (73.6%) with zero wrong-person openings; Fixed had 18 and plain Update 32.

**Versus big end-to-end models.** On MSU-Bench, a speaker retrieval and verification test, a simple voiceprint tool plus a persistent registry scored 96.6% on retrieval, far ahead of the best end-to-end audio model listed (Gemini-3-Flash at 69%). Large multimodal models are still not good at "is this the same person I heard earlier?"

**Smaller findings.** Results were nearly flat for update thresholds from 0.58 to 0.66; dropping it to 0.50 produced 115 wrong-person openings. Very short turns (1 to 2 seconds) were much harder, especially with noisy audio: 77% correct identification versus 99% for longer turns.

**Why it is convincing.** It isolates the identity step, shows on real longitudinal data that the problem (voice drift) is large, and shows the fix is cheap, needs no training, and works with any memory backend.

## Limitations

- **Synthetic voices.** LoCoMo-ID uses AI-generated voices, and the "shifted" conditions are simulated rooms and devices, not real recordings. Real people interrupt, mumble, and change mood in ways synthetic voices do not.
- **No overlapping speech.** The conversations are mostly two people taking turns. Even the four-speaker test does not have people talking over each other, which is the norm in real meetings and dinners.
- **One threshold was never stress-tested.** The 0.489 link threshold was not varied; only the update threshold was, and only on clean audio.
- **Mistakes are permanent.** If a turn gets filed under the wrong person, nothing ever goes back to fix it.
- **Not security.** The authors say plainly that this is not authentication and should not guard anything sensitive. Voice can be imitated, and modern voice cloning makes that easier every month.
- **Surveillance risk.** The paper notes that silently linking voices across sessions is a capability that can be misused, and frames the work as a research prototype.
- **Short turns are fragile.** "Yeah, do that" is too short to identify a speaker reliably, which matters for live conversation.

## Where this is today

### How it IS used

- **Smart speakers have done basic voice recognition for years.** Google's Voice Match lets up to six people in a home get personal results from a shared device; unrecognized voices get "guest" results. Notably, Google's help page tells users how to manually "Retrain" their voice model, which is exactly the drift problem this paper addresses automatically. Amazon's Alexa Voice ID does the same for personalized content, and since 2018 Alexa has been able to start learning a voice automatically from requests like "Alexa, play music." Neither company publishes how its profiles are updated, so I cannot say whether they use anything like gated updating.
- **Open-source voiceprint and diarization tools are everywhere.** **Diarization** means splitting a recording into "who spoke when." SpeechBrain's ECAPA-TDNN model, the same kind used in this paper, is a standard open reference. pyannote, the most widely used open diarization pipeline, originally used ECAPA-TDNN and has since moved to WeSpeaker embeddings in its 2026 Community-1 release. Meeting transcription tools are built on pipelines like these, but they label speakers within one recording; persistent cross-session identity linked to memory is much rarer.
- **Memory layers for agents are a booming category.** LightMem, the memory backend used here, is an open-source research system from Zhejiang University. Products like ChatGPT have long-term memory, but it is tied to the logged-in account, not to the voice.

### How it ISN'T used (or not yet)

- **Mainstream chat assistants do not tell voices apart.** As of October 2026, an OpenAI community feature request asks for exactly this, stating that ChatGPT Voice "does not currently distinguish which person is speaking" in a shared conversation. That is a user's description, not an official statement, but I found no announcement contradicting it. If two people share one phone's voice mode, their facts go into one memory.
- **End-to-end audio models do not replace dedicated voiceprint tools yet.** The MSU-Bench result above (about 97% for a simple tool plus registry versus 69% for the best end-to-end model) suggests that "just ask the big model who is talking" does not work well today.
- **Fixed enrollment voiceprints** (record a few phrases once, compare forever) remain common in products, but this paper's longitudinal data shows why they degrade.

### Lineage

Speaker verification (one-off "same person?" checks) -> speaker embeddings like ECAPA-TDNN and diarization tools like pyannote -> smart-speaker voice profiles (Voice Match, Alexa Voice ID) with manual retraining -> EvoSpeakerMem: voice-identified user entities that update themselves cautiously and gate per-person memory -> what is likely next: multi-user voice agents where "whose memory is this?" is a first-class design decision.

## Why it matters for Brendan

**Amelia.** This paper is close to a design document for Amelia's identity layer. Three things to take directly. First, separate "file this turn under Sam" from "update Sam's voice profile," with a stricter bar for the second; it is a two-line change that, in this paper, eliminated wrong-person memory access. Second, build both of the paper's error measures into your evaluation from day one: count how often one person gets split into two profiles *and* how often two people get merged, because optimizing only one hides the other (the KNN result is a warning). Third, plan for short turns: in live conversation many utterances are one or two seconds, and those are where identification falls apart. You may want to hold short turns in a "pending" state and assign them once a longer turn from the same stretch of audio makes the speaker clear.

**Permissioned relationship continuity and memory startups.** Identity-gated retrieval with an explicit "denied" outcome is a concrete pattern for permissioned memory: when the system is not sure who is asking, it should share nothing rather than guess. The paper's Correct / Wrong / Denied table is a good template for how to report safety to customers or investors, since "zero wrong-person disclosures across 4,113 queries" is a claim people understand.

**Unstall.** Real estate agents talk to assistants in cars, open houses and on speakerphone with clients. If Unstall ever hears more than one voice (a client on speaker, a partner in the car), this is the problem it will hit: not filing a client's offhand comment as the agent's own preference.

## Key terms

- **Speaker embedding (voiceprint)**: a list of numbers summarizing what a voice sounds like, arranged so the same person's clips land close together.
- **Cosine similarity**: a score of how closely two embeddings point in the same direction; near 1 means very similar.
- **Equal error rate (EER)**: the threshold where a system wrongly accepts strangers exactly as often as it wrongly rejects the right person.
- **Fragmentation and contamination**: splitting one person into several profiles, versus mixing different people into one profile.
- **Gated update**: only refreshing a stored voice profile when the match is very confident, even if a weaker match is enough to file the turn.
- **Identity-gated retrieval**: only opening a person's private memory when their voice clearly matches; otherwise using no personal memory.

## If you only have 10 more minutes

Read the introduction (especially the paragraph on fragmentation and contamination) and the section describing the routing and update rules, which is short and nearly code. Then look at Table 4, the identity-gated QA table with Correct / Wrong / Denied counts: that one table carries the paper's argument. Skip the SMIIP-TV replay tables and the encoder comparison appendix unless you plan to pick a voice model for Amelia.

## One question to think about

The system never fixes a misfiled memory. If Amelia realizes after an hour that two "different" people it has been tracking were actually the same person (or that one profile was really two people), what should happen to the facts already filed, and should the people involved be told?

## Sources

- [From Voiceprints to User Entities: Online Speaker-Memory Construction for Multi-User Spoken Agents (arXiv)](https://arxiv.org/abs/2610.36713)
- [Full text (arXiv HTML)](https://arxiv.org/html/2610.36713)
- [Turn on voice recognition with Voice Match (Google Assistant Help)](https://support.google.com/assistant/answer/9071681?hl=en)
- [What Is Alexa Voice ID? (Amazon Help)](https://digprjsurvey.amazon.com/csad/help/node/GYCXKY2AB2QWZT2X)
- [Amazon's Alexa can now learn your voice automatically (VentureBeat, 2018)](https://venturebeat.com/business/amazons-alexa-can-now-learn-your-voice-automatically)
- [pyannote vs. SpeechBrain for speaker diarization (pyannoteAI)](https://www.pyannote.ai/blog/pyannote-vs.-speechbrain-for-speaker-diarization)
- [LightMem: Lightweight and Efficient Memory-Augmented Generation (arXiv)](https://arxiv.org/pdf/2510.18866)
- [Optional Speaker Recognition for ChatGPT Voice (OpenAI Developer Community, October 2026)](https://community.openai.com/t/optional-speaker-recognition-for-chatgpt-voice/1402974)
