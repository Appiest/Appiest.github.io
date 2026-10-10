---
day: 16
title: "Training language models to follow instructions with human feedback"
short_title: "InstructGPT (RLHF)"
authors: "Ouyang, Wu, Jiang, Almeida, Wainwright, Mishkin, Zhang, Agarwal, Slama, Ray, Schulman, Hilton, Kelton, Miller, Simens, Askell, Welinder, Christiano, Leike & Lowe"
year: 2022
link: "https://arxiv.org/abs/2203.02155"
track: "Foundations"
section: "Making models useful"
tldr: "A giant language model trained only to predict internet text is not the same as a helpful assistant; show it some human-written examples, have people rank its answers, train a scorer on those rankings, and use reinforcement learning to chase that score, and a model 100 times smaller ends up preferred over the giant."
---

# Day 16: Training language models to follow instructions with human feedback

Long Ouyang, Jeff Wu, Xu Jiang, Diogo Almeida, Carroll L. Wainwright, Pamela Mishkin, Chong Zhang, Sandhini Agarwal, Katarina Slama, Alex Ray, John Schulman, Jacob Hilton, Fraser Kelton, Luke Miller, Maddie Simens, Amanda Askell, Peter Welinder, Paul Christiano, Jan Leike and Ryan Lowe (OpenAI), 2022. Published at NeurIPS 2022. This is the **InstructGPT** paper, the clearest public description of **RLHF** (reinforcement learning from human feedback), the recipe that turned GPT-3 into the kind of model behind ChatGPT. [Read the paper on arXiv](https://arxiv.org/abs/2203.02155). Track: Foundations 16/21.

## TL;DR

Being good at predicting the next word on the internet is a different goal from doing what a person asks, so OpenAI added three cheap steps after pretraining (imitate human examples, learn what humans prefer, then optimize for it), and people preferred the result over a model 100 times bigger.

## How it builds on Day 15

CLIP (Day 15) and GPT-3 (Day 11) showed how much a model can absorb from raw web data; InstructGPT shows the missing piece: raw web data teaches a model what people *write*, and a small amount of human feedback is what teaches it what people *want*.

## The world before this paper

GPT-3 (Day 11) was astonishing, but awkward to use. It was trained on one objective: given some text, predict the next word. So it behaved like a very well-read autocomplete, not an assistant. Ask it "Explain the moon landing to a 6 year old" and it might continue with three more similar questions, as if it were completing a quiz list it had seen online. To get useful output you had to trick it with carefully staged prompts and examples (the "few-shot" prompting from Day 11). It also confidently made things up and could produce toxic text, because the internet contains plenty of both. The authors named the core problem **misalignment**: the training goal ("predict web text") is not the goal users have ("help me, truthfully, without harm"). Some earlier work had tried fixing this by fine-tuning on big collections of rewritten academic NLP tasks (Google's FLAN and the T0 project), and OpenAI researchers had already shown in 2017 and 2020 that human preference feedback could train models on narrow tasks like summarization. Nobody had shown it working across the messy range of things real people actually ask a language model to do.

## Core ideas

The method has three steps, shown in the paper's famous Figure 2. Each step uses a different kind of human input, and each is cheaper for humans than the last.

### 1. Step one: show it how (supervised fine-tuning)

**What it is.** **Fine-tuning** means taking a model that has already been trained (here GPT-3) and training it a bit more on a smaller, targeted dataset. **Supervised fine-tuning (SFT)** means the targeted dataset has correct answers written by people.

**How it works.**

1. OpenAI collected real prompts that customers had sent to its API (with filtering to remove personal information), plus prompts written by its labelers. The mix was broad: about 46% open-ended generation ("write a story about..."), then open questions, brainstorming, chat, rewriting, summarization, classification and more.
2. A team of about 40 hired contractors, chosen through a screening test for how well they judged sensitive content, wrote ideal responses to these prompts.
3. GPT-3 was fine-tuned on roughly 13,000 of these (prompt, ideal answer) pairs.

**Analogy.** A new hire who has read every book in the library but has never worked a front desk. Step one is shadowing: you show them a few thousand examples of "customer asks this, you say that." They already know the content; they are learning the job.

**Why not stop here?** Writing perfect answers is slow and expensive, so you can't get many. And imitation has a ceiling: the model learns to copy, but it never learns *why* one answer is better than another.

### 2. Step two: learn what people prefer (the reward model)

**What it is.** A **reward model** is a separate neural network that reads a prompt and an answer and outputs a single number: how much a human would like this answer. It is a learned judge.

**How it works.**

1. For a prompt, the model from step one generates several different answers (between 4 and 9).
2. A labeler reads them all and **ranks** them from best to worst. Ranking is much faster than writing, and people are more consistent at comparing ("B is better than A") than at scoring on an absolute scale ("this is a 6 out of 10").
3. Each ranking is broken into pairs. Ranking 4 answers gives 6 pairs, ranking 9 gives 36. Each pair says "the winner should score higher than the loser."
4. The reward model (6 billion parameters; they found the 175-billion version unstable to train) is trained so that, for every pair, the preferred answer gets the higher number. The data came from about 33,000 prompts.

**Analogy.** Instead of asking a film critic to write the perfect movie, you show them pairs of cuts and ask "which is better?" thousands of times. Eventually you can train an apprentice critic who predicts their taste on cuts they have never seen. That apprentice is the reward model.

### 3. Step three: practice against the judge (reinforcement learning with PPO)

**What it is.** **Reinforcement learning (RL)** is learning by trial and reward rather than from correct answers, the same family as DQN learning Atari from the score on Day 6. Here, the "game" is answering prompts, and the score comes from the reward model. The specific algorithm is **PPO** (Proximal Policy Optimization), an RL method from OpenAI (2017) designed to update a model in small, safe steps so training doesn't go off the rails.

**How it works, step by step.**

1. Take a new prompt (about 31,000 prompts, all from real API customers).
2. The model (starting from the step-one model) writes an answer.
3. The reward model scores it.
4. PPO nudges the model's settings so answers like the high-scoring ones become more likely and low-scoring ones less likely.
5. Repeat many times. No human is needed in this loop, which is why it scales.

**Two important safety rails.**

- **The leash (KL penalty).** If you let a model chase a learned score freely, it finds loopholes: weird outputs the judge happens to love but humans would not. This is called **reward hacking**. To prevent it, each step also subtracts a penalty for drifting too far from the step-one model's normal way of writing. (KL divergence is just a measure of how different two models' word choices are.) Think of it as: "get better scores, but stay recognizably yourself."
- **Don't forget your schooling (PPO-ptx).** After RL, the model got worse on some standard academic tests, such as reading comprehension and translation. The authors call this cost of making a model behave better the **alignment tax**. Their fix: during RL, keep mixing in a little of the original next-word-prediction training on GPT-3's pretraining data. This variant, called PPO-ptx, is what they call InstructGPT. It recovered most of the lost test performance without hurting how much humans liked the answers.

**Analogy.** A comedian (the model) workshopping a set every night, with a seasoned club owner (the reward model) who has learned what audiences laugh at. The comedian tries variations and keeps what lands. The leash keeps them from discovering that one weird noise always gets the owner laughing and doing only that for an hour.

### 4. The quiet big idea: alignment is cheap compared to pretraining

Training the 175-billion-parameter InstructGPT took about 60 petaflop/s-days of compute (a unit of total computation), while pretraining GPT-3 took about 3,640. So the alignment steps cost under 2% of the original training, yet changed how useful the model felt more than making it 100 times bigger. That finding is why every major lab adopted some version of this recipe.

## Walkthrough: one prompt through all three steps

Take the paper's own example prompt: **"Explain the moon landing to a 6 year old."**

1. **Raw GPT-3.** Might reply with "Explain the theory of gravity to a 6 year old. Explain the theory of relativity to a 6 year old..." It is completing a pattern, not answering.
2. **Step one (SFT).** A labeler writes: "Some people went to the moon in a big rocket, walked around, and came back to tell everyone about it..." After training on thousands of examples like this, the model learns that a prompt like this is a request to be answered.
3. **Step two (reward model).** The step-one model now produces four answers: A is accurate but uses words like "trajectory"; B is simple and warm; C is simple but says the astronauts stayed for a year (wrong); D is a single dry sentence. The labeler ranks B > A > D > C. That becomes 6 pairs (B beats A, B beats D, B beats C, A beats D, A beats C, D beats C). The reward model learns from this that simple, accurate and kind beats technical, which beats terse, which beats wrong.
4. **Step three (PPO).** On thousands of new prompts the model has never seen ("explain taxes to a teenager", "write a thank-you note to my landlord"), it writes answers, the reward model scores them, and PPO shifts the model toward the qualities that score well. The general lessons (actually answer, match the audience, don't invent facts) transfer across topics.

## What they showed

- **Smaller but preferred.** Labelers preferred answers from the 1.3-billion-parameter InstructGPT over the 175-billion-parameter GPT-3, despite it having over 100 times fewer parameters. That is the headline.
- **Big margins at the same size.** The 175-billion InstructGPT's answers were preferred over GPT-3's about 85% of the time, and over GPT-3 given a carefully crafted few-shot prompt about 71% of the time.
- **It generalized to people who weren't in the loop.** A separate group of labelers who never contributed training data preferred InstructGPT at about the same rate, so it hadn't just learned the quirks of its own trainers. Agreement between any two labelers was only around 73 to 77%, which is a reminder that "what people prefer" is fuzzy to begin with.
- **More truthful, fewer made-up facts.** On TruthfulQA, a test built around common misconceptions, InstructGPT gave truthful and informative answers about twice as often as GPT-3. On tasks like summarizing a given text, it invented facts not in the source about 21% of the time versus 41% for GPT-3.
- **Somewhat less toxic.** When told to be respectful, it produced about 25% fewer toxic outputs than GPT-3.
- **Beat the academic-dataset approach.** GPT-3 fine-tuned on the FLAN and T0 collections of academic tasks did worse than InstructGPT; labelers preferred InstructGPT about 78 to 79% of the time. The likely reason: academic benchmarks are mostly classification and short-answer questions, while real users mostly ask for open-ended writing and brainstorming.
- **It followed instructions it barely saw.** Less than 4% of the training data was non-English and very little was code, yet InstructGPT often followed instructions in other languages and answered questions about code, suggesting it had learned the general skill of following instructions rather than memorizing task types.

Why convincing: the test prompts came from real customers, not a lab benchmark, and a 100 times size advantage losing to a cheap post-training recipe was impossible to ignore.

## Limitations

- **"Aligned to whom?"** The authors are unusually direct about this (Section 5.2). The model was shaped by about 40 contractors, mostly English speakers in the US and Southeast Asia, following instructions written by OpenAI researchers, on prompts from OpenAI's paying customers. That is not "humanity's values." It is one specific group's judgment.
- **Still makes simple mistakes.** It could still invent facts, accept false premises in a question (asked why something false is true, it would explain why), hedge excessively on easy questions, and struggle with instructions containing several constraints.
- **Bias did not improve.** On tests of social bias (Winogender and CrowS-Pairs), InstructGPT was no better than GPT-3.
- **Better at following instructions, including bad ones.** When explicitly told to write something toxic, InstructGPT produced more toxic output than GPT-3, and the authors note it generally complies with harmful requests. Their labelers were told to prioritize helpfulness to the user during training.
- **The reward model is a proxy.** Optimizing a learned score can teach the model to look good rather than be good: confident tone, longer answers, agreeing with the user. Critics have pointed this out since, and later research documented RLHF models' tendency toward **sycophancy** (telling people what they want to hear). OpenAI itself rolled back a GPT-4o update in April 2025 for being overly flattering and said an extra reward signal based on users' thumbs-up and thumbs-down ratings had contributed.
- **PPO is finicky.** The RL step needs several large models running at once (the model being trained, a frozen copy for the leash, the reward model, and a value estimator), and it is notoriously sensitive to settings.

## Where this is today

The three-step shape of InstructGPT (pretrain, then supervised examples, then preference-based training) became the standard pipeline for every major chatbot. The exact parts inside steps two and three have changed a lot.

### How it IS used

- **ChatGPT.** When OpenAI launched ChatGPT in November 2022, it described it as a sibling model to InstructGPT, trained with RLHF using the same methods with slightly different data collection (human trainers wrote and ranked conversations instead of single answers). This is the paper's direct descendant.
- **Every major assistant uses preference training.** Meta's Llama 3 paper (2024) describes post-training as rounds of supervised fine-tuning, a trained reward model used to pick the best of many candidate answers ("rejection sampling"), and preference optimization. Anthropic's Constitutional AI (2022) keeps the reward-model-plus-RL structure but has an AI, guided by a written list of principles, produce many of the preference labels instead of humans; this is called RLAIF (RL from AI feedback).
- **Open-source tooling.** Hugging Face's TRL library packages these steps as ready-made trainers (supervised fine-tuning, reward modeling, DPO, GRPO and others), so a small team can run a version of this pipeline on an open model.
- **Your thumbs-up button.** The rating buttons in chat apps exist partly to collect the kind of preference signal this paper introduced, though the GPT-4o episode above shows the risk of leaning on it too directly.

### How it ISN'T used

- **PPO with a separate reward model is no longer the default for preferences.** DPO (Direct Preference Optimization, Stanford, 2023) showed you can skip the separate reward model and the RL loop and train the model directly on "A is better than B" pairs with a simple formula. It is cheaper and more stable, and many open models adopted it (Llama 3 used DPO for its preference step; AI2's fully open Tulu 3 uses DPO too).
- **For reasoning, verifiable rewards replaced human taste.** The 2025 reasoning-model wave (DeepSeek-R1, published in Nature in 2025, and similar models) runs RL where the reward is a checkable fact: did the math answer match, did the code pass its tests. No learned judge to fool on those tasks. DeepSeek used a PPO variant called GRPO; AI2 calls the idea RLVR (RL with verifiable rewards). Human or AI preference models are still used for open-ended qualities like helpfulness and tone.
- **Humans write fewer labels.** Much preference data is now generated or judged by other AI models (RLAIF, AI judges), with humans writing guidelines and spot-checking, rather than 40 contractors ranking every output.

### Lineage

Deep RL (Day 6) + GPT-3 (Day 11) + learning from human preferences (OpenAI, 2017 and 2020) -> InstructGPT and RLHF (2022) -> ChatGPT, Constitutional AI and RLAIF, DPO -> today's pipeline of supervised fine-tuning plus preference training plus RL with verifiable rewards in nearly every assistant you use.

## Why it matters for Brendan

- **Unstall.** A chief of staff for real estate agents lives or dies on taste: tone of a follow-up text, which leads to flag, how pushy to be. This paper's key insight applies directly: you don't need agents to write perfect examples (expensive, they won't do it), you need them to make quick choices. Every time an agent picks one of two drafted replies, edits a draft, or ignores a suggestion, that is a preference pair. Collected over time, that becomes per-agent preference data you could train on with DPO. The paper's limitations are also your product risk: an assistant trained on approval drifts toward sycophancy, and a chief of staff who only tells the agent what they want to hear ("great listing price!") is worse than useless. Reward the outcome (did the deal move?) where you can, not just the thumbs-up.
- **Arbor.** In an auction where agents compete to serve a user's request, something has to decide which agent's offer is best for that user. That is a reward model problem. The paper's practical lesson, that comparisons ("this offer beats that one") are more consistent than absolute scores, suggests asking users to compare rather than rate when you collect the data that teaches Arbor's ranking. And reward hacking is the warning: once agents compete for a learned score, they will optimize for whatever the scorer rewards, so the scorer needs a leash and periodic human checks.

## Key terms

- **Alignment**: getting a model to do what its users and builders actually intend (helpful, truthful, harmless), not just what its training objective literally rewards.
- **Supervised fine-tuning (SFT)**: further training a pretrained model on examples of prompts paired with human-written ideal answers.
- **Reward model**: a learned judge that reads a prompt and answer and outputs a score predicting how much a human would like it, trained from human rankings.
- **RLHF**: reinforcement learning from human feedback; improving a model by having it generate answers, scoring them with a reward model built from human preferences, and updating it toward higher scores.
- **PPO and the KL penalty**: the RL algorithm used to make small, stable updates, plus a penalty that stops the model drifting too far from its starting behavior and gaming the reward model.
- **Alignment tax**: the drop in other abilities (like benchmark scores) that can come from training a model to behave better.

## If you only have 10 more minutes

Look at **Figure 2** (the three-step diagram, the single most reproduced picture in modern AI) and **Figure 1** (the chart where small InstructGPT beats big GPT-3). Then read **Section 5.2, "Who are we aligning to?"**, which is short, readable and still the right question to ask of any AI product. If time remains, skim **Section 4.3** for real example outputs comparing GPT-3 and InstructGPT. Skip the hyperparameter appendices and the labeler-instruction details in Appendix B unless you are designing a labeling process yourself (in which case they are gold).

## One question to think about

InstructGPT learned the taste of about 40 people. If you trained a model on the preferences of your own users, it would get better for them, and possibly worse at telling them uncomfortable truths. Where in your products would you want the AI to optimize for what users prefer, and where would you want it to deliberately resist?

## Sources

- [Ouyang et al., Training language models to follow instructions with human feedback, on arXiv](https://arxiv.org/abs/2203.02155)
- [The same paper at NeurIPS 2022](https://neurips.cc/virtual/2022/poster/52886)
- [OpenAI, Introducing ChatGPT](https://openai.com/index/chatgpt/)
- [Grattafiori et al. (Meta), The Llama 3 Herd of Models](https://arxiv.org/abs/2407.21783)
- [Anthropic, Constitutional AI: Harmlessness from AI Feedback](https://www.anthropic.com/news/constitutional-ai-harmlessness-from-ai-feedback)
- [Rafailov et al., Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290)
- [AI2, Tulu 3: Pushing Frontiers in Open Language Model Post-Training](https://arxiv.org/abs/2411.15124)
- [DeepSeek-AI, DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948)
- [Hugging Face, TRL documentation](https://huggingface.co/docs/trl/index)
- [OpenAI, Sycophancy in GPT-4o: what happened and what we're doing about it](https://openai.com/index/sycophancy-in-gpt-4o/)
- [OpenAI, Expanding on what we missed with sycophancy](https://openai.com/index/expanding-on-sycophancy/)
