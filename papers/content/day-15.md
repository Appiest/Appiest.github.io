---
day: 15
title: "Learning Transferable Visual Models From Natural Language Supervision"
short_title: "CLIP"
authors: "Radford, Kim, Hallacy, Ramesh, Goh, Agarwal, Sastry, Askell, Mishkin, Clark, Krueger & Sutskever"
year: 2021
link: "https://arxiv.org/abs/2103.00020"
track: "Foundations"
section: "Generative and multimodal"
tldr: "Train an image model and a text model together on 400 million captioned pictures from the internet so that matching pictures and words land in the same place, and you get a vision system that can recognize almost anything you can describe in a sentence, with no labeled training data for the task."
---

# Day 15: Learning Transferable Visual Models From Natural Language Supervision

Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger and Ilya Sutskever (OpenAI), 2021. Published at ICML 2021. This is the paper behind **CLIP** (Contrastive Language-Image Pre-training). [Read the paper on arXiv](https://arxiv.org/abs/2103.00020). Track: Foundations 15/21.

## TL;DR

Instead of teaching a vision model a fixed list of 1,000 labels, CLIP learns from the captions people already wrote next to images on the web, by playing a matching game: which caption goes with which picture? The result is a shared "meaning space" for images and text, so you can classify, search or steer image generators using plain English.

## How it builds on Day 14

RAG (Day 14) searched a library by turning text into embeddings and finding the closest match; CLIP does the same trick across two kinds of data, putting images and sentences into one embedding space so text can find pictures and pictures can find text.

## The world before this paper

Since AlexNet (Day 3), the standard recipe for computer vision was: collect a big dataset, pay humans to label every image from a fixed list (ImageNet: 1.28 million images, 1,000 categories), and train a model to predict those labels. That worked, but it had three costs. First, **labels are expensive**, so datasets stayed small compared to the web. Second, **the label list is a cage**: a model trained on ImageNet's 1,000 categories literally cannot say "skateboard ramp" or "wheelchair-accessible entrance" unless you collect new labeled data and retrain. Third, **the models were brittle**: a network scoring superhuman on ImageNet photos would stumble on sketches, cartoons or slightly unusual photos of the same objects. Meanwhile, in language, GPT-2 and GPT-3 (Day 11) had shown that training on huge piles of raw internet text, with no hand labels at all, produced models that could do new tasks on request. Researchers had tried learning vision from text before (one 2017 system managed only 11.5% accuracy on ImageNet without ImageNet training), but the results were too weak to take seriously. The question CLIP asked: can the "train on the raw web" trick that worked for text also work for images?

## Core ideas

### 1. Use captions as the teacher, and gather a lot of them

**What it is.** Instead of hand labels, CLIP learns from **natural language supervision**: the text that already sits next to images online (captions, titles, descriptions). A caption like "my golden retriever catching a frisbee at the beach" carries far more information than the single label "dog", and nobody had to be paid to write it.

**How they did it.** OpenAI built a new dataset called **WIT (WebImageText)**: 400 million (image, text) pairs from the internet. To cover a wide range of things, they started from about 500,000 search queries (words and phrases common on Wikipedia, among others) and collected up to 20,000 pairs per query so no single topic dominated. For comparison, ImageNet has 1.28 million images. The dataset was not released.

**Analogy.** Learning a language by living in a city full of signs, menus and conversations, versus studying a 1,000-word vocabulary list. The vocabulary list is clean but small; the city is messy but contains everything.

### 2. The matching game: contrastive learning

This is the key technical idea, so let's go slowly.

**The two parts.** CLIP has two separate networks, called **encoders** (a network that turns an input into an embedding, the list of numbers representing meaning, as on Days 4 and 14):

- An **image encoder** (they tried both ResNets from Day 8 and Vision Transformers, which are the Transformer from Day 9 applied to a picture chopped into small square patches).
- A **text encoder** (a Transformer of about 63 million parameters that reads the caption).

Each encoder produces an embedding of the same length, so an image and a sentence can be compared directly with a similarity score (the dot product from Day 14: a high score means "these point the same way").

**The game, step by step.**

1. Take a batch of N image-caption pairs. CLIP used enormous batches: N = 32,768.
2. Run all N images through the image encoder and all N captions through the text encoder.
3. Compute the similarity of every image with every caption. That gives an N by N grid of scores. The N squares on the diagonal are the true pairs; every other square is a mismatch.
4. Train both encoders so that for each image, its own caption scores highest among all N captions, and for each caption, its own image scores highest among all N images. In other words, it's a multiple-choice test with 32,768 options, taken in both directions.
5. Repeat for hundreds of millions of examples (32 passes over the dataset).

This is called **contrastive learning**: the model learns by contrasting the right match against many wrong ones, rather than by producing an answer from scratch. Over time, the two encoders are forced to agree on a shared **embedding space** where a photo of a dog and the sentence "a photo of a dog" sit right next to each other.

**Why not just generate the caption?** The authors tried that first: train the image model to write out the exact caption, like an image-to-text version of seq2seq (Day 5). It was painfully slow, because predicting the exact wording is very hard (the same photo could be captioned a thousand ways). Predicting just which words appear, ignoring order, learned about 3 times faster. Switching to the contrastive matching game gave another roughly 4 times speedup. The insight: you don't need to say the exact caption, you only need to recognize which caption fits. Recognizing is much easier than writing, and it is enough to learn good representations.

**Analogy.** A party game where everyone drops a photo and a written description into separate piles, the piles are shuffled, and you must re-pair them. To win with 32,768 photos, you can't rely on "is there a dog?" since hundreds have dogs; you must notice breed, setting, lighting, text in the image, even art style. The size of the game forces fine-grained understanding.

### 3. Zero-shot classification: turn the label list into sentences

**What it is.** **Zero-shot** means doing a task with zero training examples for that specific task. CLIP's big trick is that once images and text share a space, any classification problem becomes a matching problem.

**How it works.** Say you want to sort photos into "cat", "dog" and "airplane".

1. Write each label into a sentence: "a photo of a cat", "a photo of a dog", "a photo of an airplane".
2. Run those sentences through the text encoder once. Now you have three embeddings, one per class.
3. For a new photo, run it through the image encoder and see which of the three sentence embeddings it is closest to. That's the prediction.

No new training happens. You just wrote your labels as text. Want 1,000 ImageNet classes? Write 1,000 sentences. Want "ramp", "stairs" and "elevator"? Write three.

**Prompt engineering.** The wording matters. Using "A photo of a {label}." instead of the bare word raised ImageNet accuracy by 1.3 percentage points, partly because single words are ambiguous ("crane" the bird or the machine?) and because web captions are usually sentences. Adding context helps more: for a pet dataset, "a photo of a {label}, a type of pet." They also **ensembled** 80 different phrasings ("a blurry photo of a...", "a drawing of a...", "a close-up photo of a...") and averaged the resulting text embeddings, which added another 3.5 points. Together, almost 5 points just from how the labels were written. This was one of the earliest clear demonstrations that "prompting" matters for vision too.

**Analogy.** A bilingual friend who has looked at millions of photos with captions. You don't teach them your categories; you just say the category names out loud and ask "which of these does this picture look most like?"

### 4. Scale, and checking it was not cheating

They trained 8 models of increasing size (5 ResNets and 3 Vision Transformers). The largest took 12 days on 256 GPUs (ViT-L/14) or 18 days on 592 GPUs (the biggest ResNet). Like GPT-3 (Day 11), zero-shot ability improved smoothly as compute grew. Because the web is huge, a fair worry is that test images were already in the training data. The authors checked 35 datasets for overlap: the median overlap was 2.2%, and the biggest accuracy boost it could explain was 0.6 points. So the results came from learning, not memorizing the test.

## Worked example: classifying one photo with no training

Imagine you run a small accessibility app and want to know whether a photo shows **stairs**, a **ramp** or an **elevator**, and you have zero labeled examples.

1. **Write prompts.** "a photo of stairs", "a photo of a wheelchair ramp", "a photo of an elevator door". (Better: ensemble a few phrasings each, like "a building entrance with stairs".)
2. **Embed the prompts.** The text encoder turns each into a list of 512 or so numbers. Do this once and save them.
3. **Embed the photo.** A user snaps a photo of a concrete ramp with a handrail. The image encoder turns it into its own list of numbers in the same space.
4. **Compare.** Similarity to "wheelchair ramp" is highest, "stairs" a bit lower (also concrete, also an entrance), "elevator" far lower.
5. **Turn scores into confidence.** A softmax (the "make these add up to 100%" function) converts the scores into something like 78% ramp, 19% stairs, 3% elevator.
6. **Change your mind later.** Need "automatic door" too? Add one sentence. No retraining.

Now flip it around: embed every photo in a library once, then type "a ramp next to a staircase" and return the photos closest to that text. That's text-to-image search, the most common way CLIP is used in products.

## What they showed

- **Zero-shot ImageNet: 76.2%.** Without using any of ImageNet's 1.28 million labeled training images, the best CLIP matched the accuracy of the original ResNet-50, a model trained directly on all of them. The previous zero-shot attempt was at 11.5%. That jump is the headline.
- **Breadth.** They tested on more than 30 datasets: fine-grained objects (cars, flowers, food, pets), actions in videos, reading text in images (OCR), geolocation, and more. Zero-shot CLIP beat a fully trained ResNet-50 classifier (with a simple trained layer on top) on 16 of 27 datasets.
- **Zero-shot is worth a lot of examples.** On average, zero-shot CLIP matched a standard approach given 4 labeled examples per class; on ImageNet it matched one given 16 per class.
- **Much more robust.** This was the most surprising finding. ImageNet-trained models fall apart on **distribution shift** (test images that look different from training images: sketches, renditions, odd angles, adversarially chosen hard photos). Zero-shot CLIP shrank the gap between "normal ImageNet accuracy" and "accuracy on shifted versions" by up to 75%. And when they fine-tuned CLIP on ImageNet itself, ImageNet accuracy went up by 9.2 points but accuracy on sketches, renditions and other shifted sets went down. Training to a narrow benchmark made it more brittle. The interpretation: earlier models were partly exploiting quirks of the ImageNet dataset, while CLIP learned something closer to the actual concepts.
- **Strong general features.** Even setting zero-shot aside, CLIP's image embeddings were among the best available for training simple classifiers on new tasks.

Why convincing: a single model, never trained on any of these benchmarks, competed with specialists across dozens of them, and the overlap check ruled out the obvious "it saw the test" objection.

## Limitations

- **Far from the best specialist.** Zero-shot CLIP was competitive with a ResNet-50 baseline, not the state of the art. The authors estimated it would take about 1,000 times more compute for zero-shot CLIP to reach state of the art across the board.
- **Bad at abstract or precise tasks.** It struggled with counting objects, estimating distances (like "how close is the nearest car?"), classifying satellite images and spotting tumors in medical scans. It got only 88% on MNIST handwritten digits, worse than a simple model reading raw pixels, because neat handwritten digits barely appear in web photos.
- **Weird few-shot behavior.** Humans who see one labeled example of a new category improve a lot. CLIP with a few examples (using a standard method) sometimes did worse than zero-shot, which shows it learns differently from people.
- **It inherits the internet's biases.** The authors tested it on a face dataset (FairFace) with labels that included offensive and non-human categories, and found a few percent of faces were misclassified into non-human categories, with images of Black people affected most. How you phrase the label list changes who gets harmed. The training data was also never released, so outsiders couldn't audit it.
- **Easily fooled by text in images.** Because CLIP learned to read, OpenAI's own follow-up work showed that sticking a paper label reading "iPod" onto an apple could make CLIP call it an iPod (a "typographic attack").
- **It can only choose, not describe.** CLIP scores how well text matches an image; it can't write a caption or answer a question on its own.

## Where this is today

CLIP itself is now five years old, but the idea of a shared image-text embedding space trained by contrastive matching is one of the most widely used building blocks in AI.

### How it IS used

- **The "text understanding" inside image generators.** Stable Diffusion uses CLIP's text encoder to turn your prompt into the numbers that steer the diffusion process from Day 12. Newer versions still include CLIP: in ComfyUI (a popular open-source interface for these models), the Stable Diffusion 3 text node takes three inputs, two CLIP encoders (`clip_l` and `clip_g`) plus a larger T5 text model. Used directly, as a component.
- **The "eyes" of chatbots that can see.** LLaVA, an influential open-source vision-language model, takes a CLIP ViT-L/14 image encoder, adds a small connector that translates its output into word-like tokens, and feeds those into a language model. Many open multimodal models follow this pattern: a contrastively trained vision encoder plus an LLM. Google's PaliGemma 2 (December 2024) uses SigLIP, a direct descendant of CLIP, as its vision encoder.
- **Photo and media search.** The open-source photo app Immich offers "smart search" that lets you type free-form descriptions to find photos, powered by CLIP-family models (including SigLIP and SigLIP 2 options). The same recipe (embed every image, store the vectors, embed the query text, return the nearest images) is a standard tutorial for vector databases like Pinecone.
- **Open replications.** LAION, a nonprofit, built open datasets of billions of image-text pairs and, with OpenCLIP, trained open CLIP models; its ViT-H/14 reached 78.0% zero-shot on ImageNet, above OpenAI's original. That made CLIP-style models freely available to anyone.
- **Data cleaning and scoring.** CLIP scores (how well an image matches its caption) are used to filter web datasets, rank images by aesthetics and guide image generation.

### How it ISN'T used

- **The original OpenAI CLIP weights are mostly superseded.** Newer contrastive models trained on more and better-filtered data have taken over: OpenCLIP, Google's SigLIP and SigLIP 2 (better multilingual support, better at locating things in an image, works at native aspect ratios), and Meta's Perception Encoder (2025), which still trains with contrastive vision-language learning, then adds video.
- **The exact loss changed.** SigLIP replaced CLIP's "pick the right one out of 32,768" softmax with a simpler yes-or-no (sigmoid) score for each image-caption pair, which is cheaper and doesn't depend as heavily on giant batches.
- **CLIP's text encoder alone isn't enough for complex prompts.** Image generators now pair it with, or replace it by, much larger language models such as T5, because CLIP's text side is small and handles long or carefully composed descriptions poorly (the SD3 setup above is an example).
- **Contrastive isn't the only way anymore.** Apple's AIMv2 (November 2024) trains vision encoders by generating image patches and text instead, arguing contrastive training mismatches what multimodal chatbots need. Both approaches are active.
- **Zero-shot classification as a product is less central.** Many people who once used CLIP to sort images into categories now just ask a multimodal chatbot, which, under the hood, often has a CLIP-descended encoder as its eyes.

### Lineage

word2vec embeddings (Day 4) + Transformers (Day 9) + GPT-style training on raw web data (Day 11) -> CLIP (2021) -> OpenCLIP, SigLIP, Perception Encoder -> the eyes of vision-language models like LLaVA and PaliGemma, the prompt encoder in Stable Diffusion, and "type to search your photos" features.

## Why it matters for Brendan

- **Standard Physics.** CLIP-style models are the natural way to *recognize* accessibility features from a phone scan without building a labeled dataset: grab bars, ramps, signage, door handles, stairs, all queryable by writing sentences, and you can add "accessible parking sign" tomorrow with no retraining. But the paper's limitations are a direct warning for your product: CLIP is weak at counting and distances, and ADA compliance is mostly about measurements (door widths, ramp slopes, turning radii). The realistic architecture is CLIP-family models for "what is this?" plus geometry from the 3D scan (depth, LiDAR, or the radiance fields of Day 13) for "how big is it?" There's research combining exactly these: LERF (Language Embedded Radiance Fields, 2023) embeds CLIP features into a NeRF so you can type "fire extinguisher" and have it light up in 3D.
- **CoMinds.** CLIP's core design, two different encoders trained so that things that belong together land close in one shared space, is the same pattern used for matching problems in general (people to roles, queries to documents). For CoMinds, one encoder could read a student's profile and another a team or project need, trained on past teams that worked well. The contrastive "pick the right partner out of many" game fits matchmaking naturally.

## Key terms

- **Contrastive learning**: training by asking a model to pick the correct match out of many wrong ones, pulling true pairs together and pushing mismatches apart.
- **Joint embedding space**: a shared space where different kinds of data (here, images and text) are represented as lists of numbers that can be compared directly.
- **Encoder**: a network that turns an input (an image or a sentence) into an embedding.
- **Zero-shot**: performing a task with no training examples for that task, just a description of it.
- **Prompt ensembling**: writing several phrasings of each label and averaging their embeddings for more reliable results.
- **Distribution shift**: when the data a model sees in use looks different from what it was trained on (sketches instead of photos, new lighting, new places).

## If you only have 10 more minutes

Look at **Figure 1** (the matching grid and the zero-shot recipe in one picture), then read **Section 2.3** ("Selecting an Efficient Pre-Training Method"), which explains why they abandoned caption-writing for the matching game, alongside **Figure 2**. If you have time left, skim **Section 3.3** on robustness and its figure comparing ImageNet accuracy to accuracy on sketches and renditions. Skip the long representation-learning tables in Section 3.2 and the appendices.

## One question to think about

CLIP lets anyone define a new category just by typing it, which also means anyone can define a harmful one. If you shipped a product where users write their own labels for what the camera should detect, what would you allow, what would you block, and who decides?

## Sources

- [Radford et al., Learning Transferable Visual Models From Natural Language Supervision, on arXiv](https://arxiv.org/abs/2103.00020)
- [The same paper as readable HTML (ar5iv)](https://ar5iv.labs.arxiv.org/html/2103.00020v1)
- [Wikipedia, Contrastive Language-Image Pre-training](https://en.wikipedia.org/wiki/Contrastive_Language-Image_Pre-training)
- [ComfyUI docs, CLIPTextEncodeSD3 node](https://docs.comfy.org/built-in-nodes/CLIPTextEncodeSD3)
- [Georgia Tech CS 8803 lecture slides on LLaVA](https://faculty.cc.gatech.edu/~zk15/teaching/AY2025_cs8803vlm_fall/L8_LLaVA.pdf)
- [Hugging Face blog, Welcome PaliGemma 2 (December 2024)](https://huggingface.co/blog/paligemma2)
- [Immich docs, Searching (smart search)](https://docs.immich.app/features/searching)
- [Pinecone, Text-to-image and image-to-image search using CLIP](https://www.pinecone.io/learn/clip-image-search/md/)
- [The Decoder, New CLIP model aims to make Stable Diffusion even better (OpenCLIP)](https://the-decoder.com/new-clip-model-aims-to-make-stable-diffusion-even-better/)
- [LearnOpenCV, SigLIP 2: DeepMind's multilingual vision-language model](https://learnopencv.com/?p=74011)
- [Bolya et al., Perception Encoder (Meta, 2025), on arXiv](https://arxiv.org/abs/2504.13181)
- [Apple Machine Learning Research, Multimodal Autoregressive Pre-Training of Large Vision Encoders (AIMv2)](https://machinelearning.apple.com/research/multimodal-autoregressive)
