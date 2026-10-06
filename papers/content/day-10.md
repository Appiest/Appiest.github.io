---
day: 10
title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
short_title: "BERT"
authors: "Devlin et al."
year: 2018
link: "https://arxiv.org/abs/1810.04805"
track: "Foundations"
section: "The Transformer era"
tldr: "Teach one Transformer to understand language by filling in hidden words using context from both sides, then lightly retrain that same model for almost any language task and beat specialized systems."
---

# Day 10: BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding

Jacob Devlin, Ming-Wei Chang, Kenton Lee and Kristina Toutanova (Google AI Language), 2018. Published at NAACL 2019. [Read the paper on arXiv](https://arxiv.org/abs/1810.04805). Track: Foundations 10/21.

## TL;DR

Train one big Transformer to fill in blanked-out words using the words on both sides of each blank, then reuse that same model, with a tiny add-on, for nearly any language task, and it beats systems that were custom-built for each task.

## How it builds on Day 9

BERT takes the encoder half of yesterday's Transformer (the part that reads a sentence with self-attention) and throws away the decoder, then finds a new way to train it on huge amounts of unlabeled text.

## The world before this paper

In 2018, every language task (answering questions, spotting names, judging whether one sentence follows from another) mostly needed its own model trained on its own labeled dataset, and labeled data is slow and expensive to make. People had started to "pre-train" on raw text first. ELMo learned word meanings in context, and OpenAI's first GPT pre-trained a Transformer by predicting the next word. But both had a blind spot: they read text in one direction. GPT only ever looked left, at the words already seen. ELMo glued a left-to-right reader to a separate right-to-left reader, but the two never looked at each other while forming their understanding. Real understanding often needs both sides at once. In "she went to the bank to deposit her check", you need "deposit" (to the right) to know which "bank" is meant.

## Core ideas

### 1. Masked language modeling: fill in the blank

**What it is.** A pre-training game where the model hides some words and learns to guess them back. The authors call it a "masked language model", inspired by the old "cloze test" that teachers use (a passage with blanks).

**Why it was needed.** You can't simply let a Transformer look at both sides while predicting the next word, because then each word could "see itself" through the layers and the task becomes trivial cheating. Hiding the word removes the answer from view, so the model is free to look in both directions.

**How it works, step by step.**

1. Take a sentence from Wikipedia or a book.
2. Pick 15% of its tokens at random. (A **token** is a word or a piece of a word; BERT splits rare words into common pieces with a method called WordPiece, using a vocabulary of about 30,000 pieces.)
3. Of those picked tokens, replace 80% with a special `[MASK]` symbol, swap 10% for a random word, and leave 10% unchanged. The mix matters: later, when BERT is used on real tasks, there are no `[MASK]` symbols, so the model must not learn to only pay attention when it sees one.
4. Feed the whole sentence through the Transformer encoder. Every word attends to every other word, left and right, at every layer.
5. At each picked position, the model outputs a guess over the whole vocabulary. It is scored on how much probability it gave the true word, and its weights are nudged to do better next time.

**Analogy.** Think of a script supervisor reading a scene with a few lines blacked out. To fill in a missing line, they use what came before and what the other character says after. Practicing this millions of times forces deep knowledge of how dialogue, grammar and the world fit together.

**Mental picture.** "The man went to the `[MASK]` to buy a gallon of `[MASK]`." To guess "store" and "milk", the model has to use "buy a gallon" (to the right of the first blank) and "store" (to the left of the second). A left-to-right model would have to guess the first blank before ever seeing "gallon".

### 2. Next sentence prediction: learning how sentences relate

**What it is.** A second, simpler pre-training game. The model is shown two chunks of text, A and B, and must say whether B really came right after A in the original document.

**How it works.** Half the time B is the true next sentence, half the time it is a random sentence from elsewhere in the corpus. A special `[CLS]` ("classification") token is placed at the very start of the input, and a `[SEP]` ("separator") token marks the boundary between A and B. The model's final output at the `[CLS]` position is used to answer "next" or "not next".

**Why.** Many real tasks are about pairs of sentences: does this answer fit this question, does this sentence contradict that one. The authors wanted the model to practice relating two pieces of text, not just single words.

**Analogy.** An editor shuffling two shots and asking: do these cut together, or is the second one from a different scene?

(Spoiler from later research: this second game turned out to matter less than the paper suggested. See Limitations.)

### 3. One model, many jobs: fine-tuning with almost no new parts

**What it is.** **Fine-tuning** means taking the already pre-trained model and continuing to train all of it, briefly, on a small labeled dataset for one specific task.

**How it works.** BERT's input format is the same for every task: `[CLS] sentence A [SEP] sentence B [SEP]`. To adapt it:

- **Classification** (is this review positive?): feed the text, then put one small new layer on top of the `[CLS]` output that picks a label.
- **Sentence pairs** (does sentence B follow logically from A?): feed both, again classify from `[CLS]`.
- **Question answering** (find the answer span in a paragraph): feed question as A and paragraph as B, and add two tiny vectors that score every paragraph token as the likely "start" and "end" of the answer.
- **Tagging** (which words are person or place names?): put a small classifier on each token's output.

Everything else stays identical. Fine-tuning took at most about an hour on one Google Cloud TPU (a TPU is Google's custom AI chip) for each benchmark task in the paper, versus days to pre-train.

**Analogy.** Pre-training is film school: years of general craft. Fine-tuning is a week of prep for a specific shoot. You don't rebuild the director; you brief them.

### 4. Bigger is better, even for small tasks

The paper released two sizes. **BERT-Base**: 12 layers, 110 million **parameters** (the adjustable numbers inside the network). **BERT-Large**: 24 layers, 340 million parameters. Large beat Base on every task, including tasks with only a few thousand labeled examples. Before this, people feared that big models would just memorize small datasets. BERT showed that if the model is pre-trained well, size helps even when your own labeled data is tiny. That idea sets up tomorrow's paper.

## Worked example: answering a question with BERT

Suppose a fine-tuned BERT gets:

- Question: "Where did the Lakers move from?"
- Paragraph: "The Lakers began in Minneapolis and moved to Los Angeles in 1960."

1. The input becomes `[CLS] where did the lakers move from ? [SEP] the lakers began in minneapolis and moved to los angeles in 1960 . [SEP]`.
2. All tokens pass through 24 layers of self-attention. In each layer, every token blends in information from every other token, so "minneapolis" ends up carrying information like "this is the place where something began" and "the question asks about an origin".
3. For each paragraph token, the "start" scorer gives a score. "minneapolis" scores highest.
4. The "end" scorer also gives "minneapolis" the highest score.
5. The answer is the span from start to end: "Minneapolis".

Nothing in the core model was designed for questions. Only the two little start and end scorers are new.

## What they showed

The authors pre-trained on BooksCorpus (about 800 million words) and English Wikipedia (about 2.5 billion words), then fine-tuned on eleven standard tasks. BERT set new records on all eleven:

- **GLUE**, a suite of nine language understanding tests, rose to 80.5, a 7.7 point jump. Benchmarks usually move by one or two points a year, so this was a leap.
- **MultiNLI** (does sentence B follow from, contradict, or have nothing to do with sentence A?) rose to 86.7% accuracy, up 4.6 points.
- **SQuAD v1.1** (find the answer span in a Wikipedia paragraph) reached 93.2 F1, up 1.5 points, ahead of the human performance figure reported on the leaderboard at the time. F1 is a score that balances getting the right words against including wrong ones.
- **SQuAD v2.0**, a harder version where some questions have no answer in the paragraph, reached 83.1 F1, up 5.1 points.
- **SWAG** (pick the most sensible next event in a scene) also jumped well past previous systems.

Why it was convincing: the same model, with trivially small add-ons, beat many separately engineered systems at once. The paper also ran **ablations** (experiments that remove one ingredient to see what it contributed). A left-to-right version of the same model did clearly worse, especially on question answering, which supported the core claim that seeing both sides matters.

## Limitations

- **It can't write.** BERT is an encoder: it produces understanding, not text. It cannot generate a paragraph or hold a conversation. That's a different design, which tomorrow's paper pushes to the extreme.
- **Short reading window.** Inputs are capped at 512 tokens, roughly a page or two. Long documents had to be chopped up.
- **Next sentence prediction was oversold.** Follow-up work, notably RoBERTa from Facebook AI in 2019, found that dropping it and simply training longer on more data did as well or better.
- **Mask mismatch.** The `[MASK]` symbol appears in training but never in real use. The 80/10/10 trick softens this but doesn't remove it. ELECTRA (2020) later proposed a more efficient game that avoids it.
- **Still needs labeled data per task.** You fine-tune a separate copy for each job. That's cheap, but it's not "just ask it", which is the gap GPT-3 attacks.
- **Bias.** Like any model trained on web and book text, BERT absorbs the social biases in that text, a problem later papers documented in detail.

## Where this is today

### How it IS used

- **Google Search.** Google announced in October 2019 that BERT was helping with about 1 in 10 English searches in the US, with examples like understanding that "to" matters in "2019 brazil traveler to usa need a visa". By the Search On event in 2020, Google said BERT was used on almost every English query. Google has layered newer models on since, and how much of the original BERT remains inside Search today isn't public.
- **Still one of the most downloaded models anywhere.** In December 2024 Hugging Face and Answer.AI reported that BERT was the second most downloaded model on the Hugging Face Hub, with more than 68 million downloads a month, and that encoder-only models together topped a billion monthly downloads, about three times more than decoder-only (GPT-style) models. These numbers are from late 2024; I couldn't verify a newer figure.
- **Search, retrieval and classification behind the scenes.** The BERT design (encoder, masked-word pre-training, `[CLS]` summary vector) is the basis of many embedding models and rerankers used in retrieval-augmented generation, spam and content filters, and entity extraction. They're used because they are small, fast and cheap compared with chatbot-scale models.
- **ModernBERT (Answer.AI and LightOn, December 2024)** is a direct descendant: same encoder idea and masked-word training, but with an 8,192 token window (16 times BERT's), newer architecture parts, a higher masking rate (30% instead of 15%), and 2 trillion training tokens including code.

### How it ISN'T used

- **Not for chat or generation.** The assistants you use (ChatGPT, Claude, Gemini) are decoder-only models trained to predict the next word, in the GPT line, not BERT's fill-in-the-blank line.
- **Next sentence prediction is gone.** Most successors dropped it.
- **"Fine-tune a copy per task" lost ground.** For many tasks, people now just prompt a large generative model instead. Fine-tuned encoders survive where speed, cost or privacy matter.
- **Original BERT checkpoints are dated.** For new projects, people usually pick a newer encoder (RoBERTa, DeBERTa, ModernBERT or a dedicated embedding model) rather than the 2018 weights.

### Lineage

Transformer encoder (Day 9) -> BERT's fill-in-the-blank pre-training plus fine-tuning -> RoBERTa, DeBERTa, sentence embedding models -> ModernBERT and the embedding and reranking models inside today's search and RAG systems.

## Why it matters for Brendan

- **Arbor and AI startups built on memory.** Any system that has to find "the relevant past context" (which listing, which earlier conversation, which agent offer matches this request) usually does it by turning text into vectors with a BERT-style encoder and comparing them. When you hear "embeddings" or "semantic search" in a RAG pipeline, this paper is the root. Knowing that encoders are cheap and fast, while generative models are slow and expensive, is a real product design lever.
- **Unstall and Amelia.** Sorting voice-transcribed requests into intents ("schedule a showing", "send comps"), or pulling out names, addresses and dates from a transcript, is exactly the classification and tagging work fine-tuned encoders still do well, often on-device or at a fraction of the cost of calling a big model for each sentence.

## Key terms

- **Encoder**: the part of a Transformer that reads input and turns each token into a context-aware vector; it doesn't generate text.
- **Bidirectional**: using words on both the left and right of a position at the same time.
- **Masked language model**: a model trained to guess hidden words from their surroundings.
- **Pre-training**: a long, general training phase on unlabeled text, done once.
- **Fine-tuning**: a short extra training phase on a small labeled dataset to specialize the model for one task.
- **[CLS] token**: a special token at the start of the input whose final vector is used as a summary of the whole input.

## If you only have 10 more minutes

Read **Section 3.1 (Pre-training BERT)**, which explains the masked word game and the 80/10/10 trick in about a page, and look at **Figure 1**, which shows pre-training and fine-tuning side by side. Skip the detailed per-task setups in Section 4 and the appendix on hyperparameters.

## One question to think about

BERT learned grammar, facts and some reasoning from nothing but a fill-in-the-blank game. What does that suggest about how much "understanding" is hiding in the simple statistics of what words tend to appear together, and where do you think that approach would break down?

## Sources

- [Devlin et al., BERT, on arXiv](https://arxiv.org/abs/1810.04805)
- [BERT in the ACL Anthology (NAACL 2019)](https://aclanthology.org/N19-1423/)
- [BERT abstract on Hugging Face Papers](https://huggingface.co/papers/1810.04805)
- [Google: Understanding searches better than ever before (October 2019)](https://blog.google/products/search/search-language-understanding-bert/)
- [Search Engine Land: Google says BERT is now used on almost every English query (2020)](https://searchengineland.com/google-bert-used-on-almost-every-english-query-342193)
- [Hugging Face: Finally, a Replacement for BERT: Introducing ModernBERT (December 2024)](https://huggingface.co/blog/modernbert)
- [Answer.AI: ModernBERT announcement](https://www.answer.ai/posts/2024-12-19-modernbert.html)
