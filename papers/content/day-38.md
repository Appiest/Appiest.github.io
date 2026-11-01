---
day: 38
title: "EmbeddingGemma 2: Unified and Efficient Multimodal Representations"
short_title: "EmbeddingGemma 2 (one small map for text, photos, video and sound)"
authors: "Henrique Schechter Vera, Sahil Dua and about 70 others, EmbeddingGemma Team (Google)"
year: 2026
link: "https://arxiv.org/abs/2610.37364"
track: "Frontier"
section: "Frontier"
tldr: "Google built a small, free model (about 740 million parameters, small enough for a phone) that turns text, images, video and audio into points on one shared map, so a search for \"the clip where the dog catches the frisbee\" can find a video, a voice memo or a note with the same math, and it gets there by copying a giant teacher model first and then drilling on hard quizzes."
---

# Day 38: EmbeddingGemma 2: Unified and Efficient Multimodal Representations

Henrique Schechter Vera, Sahil Dua, Jovan Andonov, Sara Smoot and about 70 others, the EmbeddingGemma Team at Google (Google DeepMind). Technical report posted to arXiv on October 27, 2026. The model itself was released earlier, on October 6, 2026, with free weights under the Apache 2.0 license. [Read the paper on arXiv](https://arxiv.org/abs/2610.37364). Model: [google/embeddinggemma-2 on Hugging Face](https://huggingface.co/google/embeddinggemma-2). Track: Frontier.

A note on why this paper: the last two weeks were mostly agents, memory systems and robots. Today is about a quieter building block that sits underneath almost all of them: the **embedding model**, the piece that decides what counts as "similar" when an AI searches its memory. This one matters because it is small enough to run on a phone and handles sound and video natively, which touches Amelia, Unstall and your film work at once. A note on accuracy: this brief is built from the full arXiv HTML paper, the official model card and Google's launch posts. I did not run the model.

## TL;DR

You can squeeze text, photos, video and audio into one shared "map of meaning" with a model small enough for a phone, if you first have it copy a giant teacher model's map and only then train it on tricky right-versus-wrong quizzes, and design it from the start so it can be shrunk without falling apart.

## What it builds on

The idea of turning things into vectors where distance means meaning goes back to word2vec (Day 4). BERT (Day 10) showed that a Transformer (Day 9) reading in both directions makes good representations of whole sentences. CLIP (Day 15) put images and text on the same map using contrastive learning, the same core training trick used here. RAG (Day 14) is the main job these models do today: find the right memory, then hand it to a language model. Among frontier days, this is the retrieval layer that the memory papers (Day 23 Cortex, Day 28 MemoryTax, Day 36 EvoSpeakerMem) assume exists.

## The world before this paper

If you wanted an AI to search a mix of documents, photos, meeting recordings and video, you usually had two bad choices. **Choice 1: turn everything into text first.** Run speech through a transcription model, run images through a captioning model, then use a text-only embedding model. This works, but it is slow, costs extra models, and throws information away: a caption never mentions everything in a photo, and a transcript loses tone, music, and non-speech sounds. **Choice 2: use a big multimodal model as the embedder.** Recent "MLLM-based" embedders (built from multimodal large language models) are good at mixed inputs, but they are often several billion parameters, too big and slow to run on a phone or to embed millions of files cheaply. CLIP-style models are small and fast, but they only match one kind of thing to another (an image to a caption); they cannot handle a single input that mixes a photo, a sentence and a sound clip. Google had a strong answer in the cloud, Gemini Embedding 2 (generally available since April 2026, a paid API), but nothing small, free and on-device that did all four media types well.

## Core ideas

### 1. One shared map for every kind of media

**What it is.** An **embedding** is a list of numbers (here, 768 of them) that stands for the meaning of a piece of content. Think of it as a position on a map with 768 directions instead of two. The model is trained so that things with similar meaning land close together and unrelated things land far apart. Closeness is measured with **cosine similarity**: how much two arrows point the same way, from 1 (same direction) to 0 (unrelated, at right angles).

EmbeddingGemma 2's promise is that *everything* lands on the same map. A photo of a dog catching a frisbee, the sentence "dog catching a frisbee," a 3-second clip of it, and an audio clip of someone saying it should all end up near each other. And you can feed in **mixed** inputs: a photo plus a question, a video with its soundtrack, a slide with spoken narration. One input, one point on the map.

**How it works, step by step.**

1. **The core is a small language model turned inside out.** Google took a pretrained Gemma 4 language model (the kind that writes text one word at a time) and changed one rule: instead of each word only looking backward at earlier words, every word can look at every other word, in both directions. This is called **bidirectional attention**, the BERT trick from Day 10. For writing, you must not peek ahead; for understanding a whole input at once, peeking everywhere is better. This core has about 271 million parameters.
2. **Eyes and ears plug into it.** A **vision encoder** (167 million parameters, a ViT, or Vision Transformer, that chops an image into 16 by 16 pixel squares) turns each image into a few hundred **soft tokens**: number-lists that the core can read just like words. An **audio encoder** (305 million parameters, the same one used in Gemma 4's small models, built on Google's USM speech design) turns sound into 25 soft tokens per second. Small adapter layers resize these tokens so they fit the core.
3. **Everything goes in as one long sequence.** Text words, image tokens and audio tokens are interleaved, with special marker tokens around each image or audio clip (like "start of image ... end of image"). Video is sampled at about one frame per second (up to 32 frames, 140 tokens each), and its audio can be woven in second by second with timestamps.
4. **Squash it into one point.** The core produces one output vector per token. These are averaged (**mean pooling**), passed through a final layer that maps them to 768 numbers, and scaled to length 1 (**normalization**), so only direction matters.

**Analogy.** Think of a very good film librarian who has watched, read and listened to everything. You hand her anything, a script page, a still, a voicemail, a rough cut, and she pins it on one giant wall of index cards, placing it next to whatever it is most like. Later, you hand her a question, she pins it on the wall, and whatever is pinned nearby is your answer. The model is the librarian; the 768 numbers are the pin's position on the wall.

**A tiny worked example.** Pretend the map had only 3 directions. "Dog catching frisbee" (text) lands at (0.8, 0.6, 0.0). A video of it lands at (0.7, 0.7, 0.1). A recording of a real estate walkthrough lands at (0.0, 0.2, 0.98). Cosine similarity of text to dog video is 0.8×0.7 + 0.6×0.7 + 0×0.1 = 0.98: a near match. Text to walkthrough is 0×0.0 + 0.6×0.2 + 0×0.98 = 0.12: unrelated. A search engine just computes this for every stored item and returns the highest scores. With 768 directions instead of 3, the map has room for very fine distinctions.

### 2. Learn the map in stages: copy a master, then take hard quizzes

**What it is.** The model is trained on about 2.9 trillion tokens in three stages, and the most important choice is *how* it learns in each one.

**Stage A: copying a teacher (distillation).** **Distillation** means training a small "student" model to imitate a big "teacher" model. Here the teacher is Gemini Embedding 2, Google's large paid embedding model. For each training example, the teacher produces its embedding, and the student is graded on how close its own embedding is (the score is **mean squared error**, the average squared gap between the two lists of numbers). Because the teacher's embeddings are longer than 768 numbers, they simply chop the teacher's list to the first 768 and match that. Stages A1 (about 300 billion tokens of text pairs: questions and answers, similar sentences, code and its description, web searches) and A2 (about 2 trillion tokens adding images, audio, video and documents) are almost entirely distillation.

**Stage B: hard quizzes (contrastive learning).** In the final stage (about 600 billion tokens of higher-quality, task-specific data), distillation is switched off and replaced with **contrastive learning**, the CLIP method. Each training example has a query, a correct match (the **positive**), and wrong answers (**negatives**). The model is rewarded for pulling the query and positive together and pushing the negatives away. Two kinds of negatives matter: **in-batch negatives** (the other examples that happen to be in the same training batch, which are free and plentiful) and **hard negatives** (wrong answers chosen because they look almost right, like a photo of a dog catching a *ball* when the query asked for a frisbee). Hard negatives are what teach fine distinctions. The training also masks out "false negatives," duplicates that would wrongly be counted as wrong answers.

**Two extra tricks in the last stage.**

- **The spread-out regularizer.** An extra penalty that pushes random, unrelated pairs toward a cosine similarity of 0, so they sit at right angles. Without it, embeddings can bunch up in one corner of the map, wasting space. Spreading them out makes the map easier to search quickly and more robust when you compress it (Idea 3).
- **Model merging.** At the end, they average the final checkpoint's weights with a much earlier checkpoint from the same run. A **checkpoint** is a saved snapshot of the model during training. Averaging the two keeps most of the late gains while undoing some overfitting (getting too tuned to the final training data).

**Why the order matters.** The ablation (a test where you remove one piece to see what it contributed) is clear. After the copying stages, doing even more copying moved the multimodal score from 52.27 to 52.28: nothing. Switching to the contrastive quiz stage jumped it to 55.46, with big gains on images and video. Copying gets the student the rough shape of the map cheaply; quizzes sharpen the borders.

**Analogy.** A film student first traces the master editor's cuts, frame by frame, to absorb her instincts. Then the teacher stops showing her answers and instead gives the student pairs of nearly identical takes and asks "which one matches the script?" Tracing builds intuition fast; the hard comparisons build judgment.

### 3. Built to shrink: one model, many sizes

**What it is.** The paper's practical heart is that the model can be cut down at use time, in four independent ways, without retraining.

- **Load only the senses you need.** Text only: 271 million parameters. Text plus images: 439 million. Text plus audio: 577 million. All four: about 740 million. On a Pixel 11 Pro with compressed weights, Google measured about 191 MB of memory for text-only and 567 MB for everything.
- **Choose how closely to look at images.** The **vision token budget** sets how many tokens each image becomes: 70, 140, 280 (default), 560 or 1,120. Fewer tokens is faster but blurrier. Documents and screenshots with small text benefit most from more tokens.
- **Truncate the embedding (Matryoshka).** **Matryoshka Representation Learning** (named after Russian nesting dolls) trains the model so the first 512, 256 or 128 numbers of the 768 are each a usable embedding on their own. The most important information is packed into the front of the list. During training, every loss is applied at each of these lengths. Result: you can store a quarter of the numbers and lose little. On code search, the full 768 scores 78.68, 256 scores 76.18, and 128 scores 71.41. For multimodal search, 256 is fine but 128 falls off sharply (59.01 down to 45.65).
- **Compress the numbers (quantization).** **Quantization** stores each weight with fewer bits, like saving a photo as a smaller JPEG. The core is compressed to 4 bits per weight. To keep quality, they use **quantization-aware training**: a short extra training stage where the model practices running in its compressed form, learning from its own uncompressed version. The cost is tiny: on the multilingual text benchmark, 61.36 at full precision versus 60.96 and 60.84 for the two 4-bit versions.

**Analogy.** A camera bag where you can leave lenses at home, shoot at lower resolution, and save as a smaller file, and each choice is independent. You pick the kit for the job instead of buying a different camera.

### Walkthrough: searching your phone for a moment in a video

1. **Indexing (done once, in the background).** Your phone samples each video at about one frame per second. Each frame (plus its audio, if you want sound included) goes through the vision and audio encoders, into the core, and comes out as one 768-number point. Each point is saved with a pointer to "video X, 0:42."
2. **Shrinking the index.** To save storage, the phone keeps only the first 256 numbers of each point (Matryoshka), cutting the index to a third with little quality loss.
3. **The query.** You type "dog catching a frisbee at the beach." Only the text part of the model is needed, so the vision and audio encoders do not even have to be loaded. The text becomes one point, also cut to 256 numbers and rescaled to length 1.
4. **The search.** The phone finds the stored points with the highest cosine similarity to your query. A fast **approximate nearest neighbor (ANN)** index makes this take milliseconds instead of checking every point one by one.
5. **The result.** The top hit is "video X, 0:42," and nothing ever left the phone. This is essentially Google's "Video Moments Finder" demo in its AI Edge Gallery app.

## What they showed

**The headline: strong at everything for its size, best in several categories.** The paper compares only against single-vector models and excludes ones trained on much of the test data.

| Area | Benchmark (higher is better) | EmbeddingGemma 2 | Comparison |
| --- | --- | --- | --- |
| Code search | MTEB Code | 78.68 | EmbeddingGemma 1: 68.76. Qwen3-Embedding 0.6B: 75.4. Best under 1B parameters. |
| Image, video and document search | MMEB-v2 overall | 59.01 | EmbeddingGemma 1 (text only): 43.61. Beaten only by models around 2B parameters, such as Eddy-vl (1.93B) at 63.2. |
| Image understanding | MIEB-lite | 60.17 | Next best under 1B, SigLIP SO400M: 52.3. About 8 points ahead. |
| Spoken search | MSEB retrieval | 69.54 | Same model fed transcripts instead of audio: 57.59. Gemini Embedding 2 (the teacher): 73.99. |
| Audio tasks | MAEB | 49.9 | Within 0.2 of the best model under 1B (Jina Omni Nano, 50.1). |
| Text, multilingual | MTEB v2 | 61.36 | EmbeddingGemma 1: 61.15. Qwen3-Embedding 0.6B: 64.34. Jina Omni Nano: 65.52. |

**The most interesting result: listening beats transcribing.** On spoken search, feeding raw audio into the model scored 69.54, while transcribing the audio to text first and searching the text scored 57.59. That is a 12-point gap in favor of skipping transcription, and it even works across languages (67.68 when the spoken query and the target are in different languages). It suggests that the "turn everything into text first" pipeline really does lose information.

**The student nearly matches the teacher.** On spoken search the 740-million-parameter student reaches about 94% of the giant teacher's score, on a phone.

**Small design choices, measured.** Letting the vision encoder keep training (instead of freezing it) raised the multimodal score from 48.18 to 52.27. More image tokens help documents a lot (51.6 to 67.6 on document search going from 70 to 1,120 tokens) but video actually got worse past 280 tokens per frame.

**Why it is convincing.** The numbers come from standard public benchmarks across four media types, the ablations isolate why each piece matters, and the model is public, so anyone can check.

## Limitations

- **Text got slightly worse in English.** 68.46 versus 69.67 for the original text-only EmbeddingGemma. Adding senses cost a little on the old job. Several similar-size text models (Qwen3-Embedding 0.6B, Jina) score higher on text.
- **It hears words better than voices.** Zero-shot, it is weak at "paralinguistic" features (how someone sounds rather than what they say). Grouping speakers by gender, for example, scored only 0.40. It is not a voiceprint or speaker-identification model. The audio encoder was also kept frozen, so it never adapted to this job.
- **One point per item is a bottleneck.** A related 2025 Google DeepMind paper (Weller et al., "On the Theoretical Limitations of Embedding-Based Retrieval") proved that a single vector of a fixed size can only represent a limited number of "which documents go together" combinations, and showed top embedding models scoring under 20% recall on a simple test built to expose this. A whole video or a long meeting squashed into one point will lose detail; you need to chop content into segments.
- **The context window is shared.** 8,192 tokens covers about 5 minutes of audio, or about 29 images, or about 58 video frames. Longer media must be split.
- **Some evaluation caveats.** Ablations used an intermediate recipe, a few compressed-model scores used a different evaluation setup, and one competitor's score appears differently in two tables.
- **No safety tuning.** It is a raw model; anyone building on it adds their own safeguards and access controls.

## Where this is today

### How it IS used

- **Directly, as an open model developers can download now.** Released October 6, 2026. The Hugging Face page shows about 365,000 downloads in the past month, plus over 120 compressed versions and about 150 fine-tuned versions made by others. It runs in the common tools (sentence-transformers, Transformers, vLLM, llama.cpp, Ollama, LM Studio, MLX) and in Google's on-device runtime LiteRT, according to a third-party explainer from eesel.
- **In Google's own on-device demos.** Google's developer blog launched it with two demos in the AI Edge Gallery app: Instant Media Search (search your phone's photos and videos by typing or by example image) and Video Moments Finder (find a described moment inside your videos), plus an experimental Mac meeting companion, AI Edge Foresight, that pairs it with Gemma 4 to answer questions during meetings. Google says Android's ML Kit will offer it as a built-in service "in the coming weeks."
- **In vector databases.** A **vector database** stores millions of embeddings and finds the nearest ones fast. Qdrant published a guide at launch, and an analysis by NxCode reports Qdrant's tests compressing 256-number EmbeddingGemma 2 vectors to about 40 bytes each while keeping about 94.5% of search quality.
- **Its teacher is a commercial product.** Gemini Embedding 2, the model this one was distilled from, has been generally available on Google's Gemini API since April 22, 2026, priced (per eesel) at $0.20 per million text tokens, $0.00012 per image and $0.00016 per second of audio. EmbeddingGemma 2 is the free, local version of that same map. I could not find named outside companies running EmbeddingGemma 2 in production yet; it is four weeks old.

### How it ISN'T used (or where other approaches win)

- **Best-accuracy document search often uses many vectors, not one.** "Late interaction" models like ColBERT (for text) and ColPali (for page images) keep one vector per word or image patch and compare them piece by piece. According to Weaviate's overview, this captures finer detail, at the cost of much bigger storage (about five times larger in their example). Teams searching complex PDFs often choose this over single-vector models like EmbeddingGemma 2.
- **Rerankers usually sit on top.** In serious search systems, a fast embedding model like this one picks the top 50 or 100 candidates, then a slower, more precise model (a **cross-encoder** or **reranker**, which reads query and candidate together) reorders them. The Weller et al. paper recommends exactly this for hard queries.
- **Speech-to-text pipelines are not dead.** Transcripts remain human-readable, editable and easy to quote, so most products still store them. This paper's evidence argues for searching the audio directly *alongside* transcripts, not instead of them.
- **Speaker identification needs a different model.** Because it is weak on voice qualities, telling *who* is speaking still needs a dedicated voiceprint model (like the ones in Day 36's EvoSpeakerMem).

### Lineage

word2vec, words as points (2013, Day 4) -> sentence embeddings from BERT-style models (2018 onward, Day 10) -> CLIP, images and text on one map (2021, Day 15) -> RAG makes embeddings the memory of chatbots (Day 14) -> Gemini Embedding 2, all media on one map in the cloud (April 2026) -> EmbeddingGemma 2, the same map distilled onto a phone (October 2026) -> what you will likely use: private, on-device search across everything you have ever seen, said or saved.

## Why it matters for Brendan

**Amelia and permissioned relationship memory.** Your memory products need to answer "what did Dana say about the lease last month?" across recorded conversations. This paper shows two useful things. First, searching the audio itself beat searching its transcript by 12 points, so storing an audio embedding per segment, next to the transcript, is worth testing. Second, it all runs on a phone in under 600 MB, which means a conversation's memory can be searched without uploading it, a real selling point for anything built on *permission*. One honest catch: this model hears *what* was said, not *who* said it (weak on voice identity), so you would still pair it with a speaker-ID model, exactly the split Amelia already has.

**Unstall.** A real estate agent's world is mixed media: listing photos, walkthrough videos, voice memos, texts, PDFs. One model that puts all of them on a single map means a voice request like "pull up the place with the white kitchen island I saw Tuesday" could search photos, video and voice notes at once, on the agent's own phone.

**CoMinds.** Matching students into teams is a similarity problem. Students in a program like Iovine and Young bring demo reels, portfolios, code and written statements. Embedding all of those on one map gives you a way to measure "these two people make related work" or, more usefully for interdisciplinary teams, "these two are far apart but each is close to the project brief."

## Key terms

- **Embedding**: a list of numbers (here 768) that represents an item's meaning as a point on a map, where nearby points mean similar things.
- **Cosine similarity**: how closely two embeddings point the same way, from 1 (same meaning) to 0 (unrelated).
- **Distillation**: training a small "student" model to imitate a large "teacher" model's outputs.
- **Contrastive learning with hard negatives**: training by pulling matching pairs together and pushing look-alike wrong answers away.
- **Matryoshka embedding**: an embedding trained so its first 128, 256 or 512 numbers also work on their own, letting you trade a little quality for much less storage.
- **Quantization**: storing a model's numbers with fewer bits (here 4 per weight) so it fits in less memory, with a small quality cost.

## If you only have 10 more minutes

Read Section 1 (Introduction), which explains the "transcribe everything first" problem better than this brief can, then look at Figure 1 (the architecture diagram) and the training-recipe overview in Section 4. Then jump to the audio results table showing native audio versus transcribed audio (MSEB). Skip the detailed per-benchmark tables and the quantization appendix unless you plan to ship on a phone.

## One question to think about

This model puts a photo, a sentence and a voice memo on one map so that "close" means "similar." But in a product like Amelia, the most useful memory is often not the most *similar* one; it is the one that matters most to this person, right now, or the one they gave permission to recall. What would you add on top of "nearest point on the map" so that an AI remembers the right thing, not just the most similar thing?

## Sources

- [EmbeddingGemma 2: Unified and Efficient Multimodal Representations (arXiv)](https://arxiv.org/abs/2610.37364)
- [Full text (arXiv HTML)](https://arxiv.org/html/2610.37364)
- [EmbeddingGemma 2 paper page (Hugging Face)](https://huggingface.co/papers/2610.37364)
- [google/embeddinggemma-2 model card (Hugging Face)](https://huggingface.co/google/embeddinggemma-2)
- [Bring multimodal semantic search to the edge with EmbeddingGemma 2 (Google Developers Blog, October 6, 2026)](https://developers.googleblog.com/en/google-ai-edge-with-embeddinggemma-2/)
- [EmbeddingGemma 2: Google's open multimodal embedding model, explained (eesel)](https://www.eesel.ai/blog/embeddinggemma-2)
- [EmbeddingGemma 2 Makes Local Multimodal Search Plausible, but the Index Still Has to Fit (NxCode)](https://www.nxcode.io/resources/news/embeddinggemma-2-on-device-multimodal-retrieval-memory-2026)
- [Gemini Embedding 2 is now generally available (Google blog, April 22, 2026)](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-embedding-2-generally-available/)
- [On the Theoretical Limitations of Embedding-Based Retrieval (Weller et al., arXiv)](https://arxiv.org/html/2508.21038v1)
- [An Overview of Late Interaction Retrieval Models: ColBERT, ColPali, and ColQwen (Weaviate)](https://weaviate.io/blog/late-interaction-overview)
