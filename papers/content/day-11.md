---
day: 11
title: "Language Models are Few-Shot Learners"
short_title: "GPT-3"
authors: "Brown et al."
year: 2020
link: "https://arxiv.org/abs/2005.14165"
track: "Foundations"
section: "The Transformer era"
tldr: "Make a next-word predictor big enough (175 billion parameters) and it can pick up new tasks from a few examples written into its prompt, with no retraining at all."
---

# Day 11: Language Models are Few-Shot Learners

Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared Kaplan, Prafulla Dhariwal and 25 other authors (OpenAI), 2020. Published at NeurIPS 2020. [Read the paper on arXiv](https://arxiv.org/abs/2005.14165). Track: Foundations 11/21.

## TL;DR

If you make a next-word-predicting Transformer enormous (175 billion parameters) and train it on a large slice of the internet, you can teach it a new task just by showing it a few examples in its prompt, with no retraining.

## How it builds on Day 10

BERT showed that one pre-trained model could handle many tasks, but each task still needed a fine-tuned copy and a labeled dataset; GPT-3 asks whether you can skip fine-tuning entirely and just describe the task in plain text.

## The world before this paper

After BERT, the standard recipe was "pre-train, then fine-tune": take a big model, then train a copy on thousands of labeled examples for each job. That worked, but it had three problems. First, you need a labeled dataset for every new task, which is slow and costly. Second, fine-tuned models can latch onto quirks of their narrow dataset and look better on the benchmark than they really are. Third, it is nothing like how people learn: a person can do a new task after reading one instruction and seeing two examples. OpenAI's earlier GPT-2 (2019, 1.5 billion parameters) had hinted that a big enough language model could do some tasks with zero examples, but the results were mostly far behind fine-tuned systems.

## Core ideas

### 1. In-context learning: the prompt is the lesson

**What it is.** **In-context learning** means the model "learns" a task from text placed in its input (its **context**, the text it can see at once), without any change to its internal weights. A **prompt** is that input text.

**How it works, step by step.**

1. You write a short task description, like "Translate English to French:".
2. You optionally add a few worked examples: "sea otter => loutre de mer", "cheese => fromage".
3. You add the new case with the answer left blank: "peppermint =>".
4. The model does the only thing it was ever trained to do: predict the most likely next words. Given the pattern above it, the most likely continuation is the French word.

Nothing is saved. Close the prompt and the model has learned nothing permanent. The "learning" lives entirely in what it's reading right now.

**The three settings the paper tests.**

- **Zero-shot**: only the instruction, no examples.
- **One-shot**: the instruction plus one example.
- **Few-shot**: the instruction plus as many examples as fit, usually 10 to 100. GPT-3 could read 2,048 tokens at once (a token is a word or word piece), which is roughly 1,500 words.

**Analogy.** Handing a talented session musician a lead sheet with two bars written out and saying "keep going in this style". They don't go back to music school; they pattern-match on the spot from everything they already know.

**Why it's surprising.** The model was never trained on "follow the examples". It was trained only to continue internet text. The authors' interpretation is that during pre-training the model saw so many repeated patterns inside documents (lists, Q and A pages, translations side by side) that it picked up a general skill of continuing patterns, which shows up at test time as learning from examples.

### 2. Scale is the main ingredient

**What it is.** GPT-3 uses essentially the same design as GPT-2 (a decoder-only Transformer, meaning it reads left to right and predicts the next token, the opposite of BERT's fill-in-the-blank) but makes it more than 100 times bigger.

**The numbers.** The largest model has 175 billion **parameters** (the adjustable numbers inside the network), 96 layers, and was trained on about 300 billion tokens. The training text was a weighted mix: a filtered version of Common Crawl (a huge public scrape of the web) made up about 60% of what the model saw, with the rest from a curated web set called WebText2, two book collections and English Wikipedia. Higher-quality sources were sampled more often than their size alone would suggest.

**The experiment design.** Crucially, the team trained eight models of increasing size, from 125 million to 175 billion parameters, on the same data. That lets them draw a curve: for each task, how does performance change as the model grows?

**What the curves showed.** For most tasks, performance rose smoothly with size, and the gap between zero-shot and few-shot widened as models got bigger. In other words, bigger models aren't just better; they are better at learning from the prompt. This connects to OpenAI's "scaling laws" paper from earlier in 2020 (several of the same authors), which found that a language model's error falls predictably as you add parameters, data and compute.

**Analogy.** Like film resolution: the same camera design, but each jump in sensor size reveals detail that simply wasn't visible before.

### 3. One model, no fine-tuning, measured honestly

**What it is.** The paper deliberately evaluates a single frozen model on more than two dozen benchmarks without fine-tuning on any of them. The point is to measure general ability, not how well the model can be tuned to each test.

**How it works.** For each benchmark, examples are drawn from the training split and pasted into the prompt, then the model answers the test question. For multiple choice, they compare how likely the model thinks each answer is. For free answers, they let it write and compare the text.

**The catch they had to deal with: contamination.** Because GPT-3 trained on so much of the web, some benchmark test questions might have been in its training data, which would be like seeing the exam beforehand. The authors tried to filter overlaps, found that a bug meant some were missed, and couldn't afford to retrain. So they built "clean" versions of each benchmark with overlapping items removed and checked whether scores dropped. For most benchmarks the effect was small, and they flagged the ones where it might matter.

## Worked example: a few-shot prompt

Suppose you want GPT-3 to fix grammar, and you've never trained it to. You write:

```
Poor English input: I eated the purple berries.
Good English output: I ate the purple berries.
Poor English input: Thank you for picking me as your designer. I'd appreciate it.
Good English output: Thank you for choosing me as your designer. I appreciate it.
Poor English input: The patient was died.
Good English output:
```

1. The model reads all of it at once, attending over every token, like the Transformer from Day 9.
2. It notices the repeated structure: a flawed sentence, then a corrected one.
3. It predicts the next token after the final "Good English output:". The most likely continuation, given the pattern and everything it absorbed about English, is "The patient died."
4. It keeps predicting tokens until it hits a line break, which matches the pattern's ending.

That's the whole trick. Change the examples and the same model becomes a translator, a classifier or a formatter. This is the ancestor of every prompt you've written for a chatbot.

## What they showed

- **Some tasks matched or beat fine-tuned systems.** On TriviaQA (trivia questions with no reference document), few-shot GPT-3 scored 71.2%, matching or beating the best systems at the time that were fine-tuned for open-domain questions. On LAMBADA (predict the last word of a paragraph, which needs long-range understanding) it hit 86.4% few-shot, more than 18 points above the previous record.
- **Some were close but not there.** On SuperGLUE, a tough suite of understanding tests, few-shot GPT-3 scored around 71.8, a bit above a fine-tuned BERT-Large but far below the best fine-tuned systems at about 89. On CoQA (conversational questions about a passage) it reached 85.0 F1, a few points short of the fine-tuned record.
- **New skills appeared with size.** Small models were useless at arithmetic. The 175B model, few-shot, got two-digit addition essentially perfect and three-digit addition right about 80% of the time. It could also unscramble letters in words and use a made-up word in a sentence after one definition.
- **Translation without training on translation pairs.** Few-shot, it beat earlier unsupervised translation systems when translating into English, though it was weaker translating out of English.
- **Fake news articles were hard to spot.** Human judges trying to tell real news articles from ones GPT-3 wrote (given only a title and subtitle) were right only about 52% of the time for the largest model, close to a coin flip.

Why it was convincing: the clean, steady improvement across eight sizes and dozens of tasks made it hard to dismiss as a fluke. Why it was surprising: nobody had shown that you could get competitive results on so many tasks without any task-specific training at all.

## Limitations

The authors were unusually frank, and critics added more:

- **Weak on some reasoning tasks.** GPT-3 was near chance on WiC (does a word mean the same thing in two sentences?) and struggled on ANLI (adversarially designed logic questions) and some reading comprehension sets like RACE and QuAC. The authors suspected the left-to-right design hurt on tasks that need comparing two passages, exactly where BERT's bidirectionality helps.
- **Loses the thread in long text.** Generated passages could repeat themselves, contradict themselves, or drift off topic.
- **No grounding in the world.** It only knows text. It has no notion of whether what it writes is true, and it states falsehoods confidently.
- **Cost.** Training took an enormous amount of compute. One outside estimate put it at roughly $4.6 million and 355 years if done on a single GPU. Running it was also expensive, so only a few organizations could build such models.
- **Unclear what "learning" is happening.** The authors admit they can't tell whether the model truly learns new tasks from the prompt or mostly recognizes tasks it already saw during training.
- **Bias and misuse.** The paper's own analysis found gender, race and religion biases in the outputs (for example, associating certain religions with violence). It also warned that convincing generated text could be used for spam, phishing and misinformation.
- **Undertrained, as it turned out.** DeepMind's 2022 Chinchilla paper found that for the compute spent, GPT-3 was too big for too little data, and that a smaller model trained on more tokens does better.

## Where this is today

### How it IS used

- **Prompting is how everyone uses AI now.** The idea that you steer a model by writing instructions and examples in its input, rather than retraining it, is the foundation of every chatbot and AI API. "Few-shot prompting" is still a standard technique in production apps.
- **The GPT-3 line led to ChatGPT.** OpenAI opened GPT-3 through a paid API in June 2020, which kicked off a wave of startups built on someone else's model. In September 2020 Microsoft got an exclusive license to the underlying model, while others could still use the API. In January 2022 the default API model became InstructGPT, a GPT-3 variant further trained with human feedback to follow instructions. In November 2022 OpenAI launched ChatGPT on what it called the GPT-3.5 series, a direct descendant.
- **Scale as a strategy.** GPT-3 is the paper that convinced the industry that making models bigger keeps paying off, which drove the race of the following years across OpenAI, Anthropic, Google, Meta and others.

### How it ISN'T used

- **The original models are retired.** OpenAI shut down the original GPT-3 API models (davinci, curie, babbage, ada and the text-davinci series) on January 4, 2024.
- **Raw next-word prediction is no longer the product.** Pure GPT-3 needed careful prompt crafting and often went off the rails. Today's assistants add instruction tuning and reinforcement learning from human feedback on top of pre-training, so you can just ask instead of setting up a pattern.
- **"Just make it bigger" got refined.** After Chinchilla, labs trained smaller models on far more data. Newer progress also comes from techniques like reasoning models that think before answering and tool use, not raw parameter count alone.
- **The 2,048 token window is tiny by today's standards.** Current frontier models read hundreds of thousands of tokens or more, which makes in-context learning far more powerful (you can paste in whole documents as "examples").

### Lineage

Transformer decoder (Day 9) -> GPT and GPT-2 -> GPT-3's scale plus in-context learning -> InstructGPT and human feedback -> ChatGPT, Claude, Gemini and the prompt-driven apps you use today.

## Why it matters for Brendan

- **Unstall, Amelia and memory startups.** In-context learning is why "memory" for an AI product can be as simple as putting the right past facts into the prompt. A chief of staff that remembers a client's preferences, or Amelia recalling what a specific person said last week, mostly works by retrieving the relevant notes and placing them in the model's context at the moment of the request. Day 10 (BERT-style search) finds the notes; Day 11 (in-context learning) is how the model uses them without retraining.
- **Arbor.** If agents bid in an auction based on context, each agent's behavior is largely defined by what's in its prompt: its goals, constraints and examples of good bids. This paper is the reason that works at all, and its limitations (confident errors, sensitivity to how examples are phrased) are exactly the failure modes a marketplace protocol has to guard against.

## Key terms

- **Decoder-only model**: a Transformer that reads left to right and generates text one token at a time by predicting the next one.
- **In-context learning**: picking up a task from instructions and examples in the prompt, with no change to the model's weights.
- **Zero-shot, one-shot, few-shot**: giving the model zero, one, or several worked examples in the prompt.
- **Parameters**: the adjustable numbers inside a neural network; GPT-3 has 175 billion.
- **Data contamination**: when test questions leaked into the training data, which can make scores look better than they should.
- **Scaling**: making the model, data and compute bigger, and studying how performance changes as you do.

## If you only have 10 more minutes

Read **Section 1 (Introduction)**, especially **Figures 1.1 to 1.3**, which explain in-context learning and show the key curves of performance rising with model size and number of examples. Then skim **Section 5 (Limitations)**, which is short and honest. Skip the many per-benchmark subsections in Section 3; the figures summarize them.

## One question to think about

GPT-3 "learns" a task from a few examples but forgets it the moment the prompt is gone. Is that a weakness to fix with permanent memory, or a feature (privacy, control, no lasting side effects), and how would your answer change for a product that holds people's relationship history?

## Sources

- [Brown et al., Language Models are Few-Shot Learners, on arXiv](https://arxiv.org/abs/2005.14165)
- [GPT-3 paper on Hugging Face Papers](https://huggingface.co/papers/2005.14165)
- [GPT-3 paper, HTML version on ar5iv](https://ar5iv.labs.arxiv.org/html/2005.14165)
- [Wikipedia: GPT-3 (API launch, Microsoft license, GPT-3.5 lineage, criticisms)](https://en.wikipedia.org/wiki/GPT-3)
- [OpenAI Developer Community: older OpenAI models shut down January 4, 2024](https://community.openai.com/t/psa-older-openai-models-will-be-shut-down-in-1-week/574580)
- [Hoffmann et al., Training Compute-Optimal Large Language Models (Chinchilla), on arXiv](https://arxiv.org/abs/2203.15556)
- [Ouyang et al., Training language models to follow instructions with human feedback (InstructGPT), on arXiv](https://arxiv.org/abs/2203.02155)
