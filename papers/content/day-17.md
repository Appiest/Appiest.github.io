---
day: 17
title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"
short_title: "Chain-of-Thought"
authors: "Wei, Wang, Schuurmans, Bosma, Ichter, Xia, Chi, Le & Zhou"
year: 2022
link: "https://arxiv.org/abs/2201.11903"
track: "Foundations"
section: "Making models useful"
tldr: "If the examples in your prompt show a model working through a problem step by step before giving the answer, a big enough language model will write out its own steps too, and that alone roughly triples its accuracy on grade-school math without changing the model at all."
---

# Day 17: Chain-of-Thought Prompting Elicits Reasoning in Large Language Models

Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten Bosma, Brian Ichter, Fei Xia, Ed H. Chi, Quoc V. Le and Denny Zhou (Google Research, Brain Team), 2022. First posted January 2022, published at NeurIPS 2022. [Read the paper on arXiv](https://arxiv.org/abs/2201.11903). Track: Foundations 17/21.

## TL;DR

Show a large language model a few examples where the answer comes after a short written-out line of reasoning, and it starts reasoning out loud on new problems too, which makes it dramatically better at multi-step questions; no retraining, just a better prompt.

## How it builds on Day 16

InstructGPT (Day 16) made models more useful by *training* them on human feedback; chain-of-thought makes them smarter at hard problems without touching the model at all, by changing only what goes in the prompt (building directly on the few-shot prompting from GPT-3, Day 11).

## The world before this paper

By early 2022, scaling up language models had worked wonders on many tasks: writing, translation, trivia. But one family of tasks stubbornly refused to improve much with size: problems that need several steps in a row. Grade-school math word problems were the classic example. A model would read "The cafeteria had 23 apples, used 20 for lunch and bought 6 more" and blurt out "27," because it was trying to jump straight from question to answer in a single guess. The two known fixes were both expensive. One was to train a model from scratch or fine-tune it on thousands of problems with hand-written solutions (OpenAI's GSM8K work did this, adding a separate "verifier" model to check answers). The other was to bolt on special-purpose tools. Few-shot prompting (Day 11), where you show a model a handful of question and answer examples, was cheap and flexible, but on these problems it barely beat guessing, and making the model bigger didn't help much. The curve was flat.

## Core ideas

### 1. The chain of thought: put the reasoning in the examples

**What it is.** A **chain of thought** is a series of short, plain-language intermediate steps that lead to an answer, the way you would show your work on a math test. **Chain-of-thought prompting** means that in the few-shot examples you put in the prompt, each answer includes these steps before the final answer.

**How it works, step by step.**

1. You write a prompt with a few worked examples. The paper usually uses **eight**. Each example is a triple: question, chain of thought, answer.
2. You add the new question at the end, with no answer.
3. The model continues the text. Because every example it just saw "showed its work," the most natural continuation is to show its work too, and then state the answer.
4. You read off the final answer (each example ends with "The answer is ...", so it's easy to find).

The paper's Figure 1 makes the whole idea fit on one screen.

*Standard prompt, one example:*

> Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 tennis balls. How many tennis balls does he have now?
> A: The answer is 11.

New question: "The cafeteria had 23 apples. If they used 20 to make lunch and bought 6 more, how many apples do they have?" The model answers **27**. Wrong.

*Chain-of-thought prompt, same example with the reasoning written in:*

> A: Roger started with 5 balls. 2 cans of 3 tennis balls each is 6 tennis balls. 5 + 6 = 11. The answer is 11.

Same new question. The model now writes: "The cafeteria had 23 apples originally. They used 20 to make lunch. So they had 23 - 20 = 3. They bought 6 more apples, so they have 3 + 6 = 9. The answer is 9." **Correct.**

Nothing about the model changed. Only the examples did.

**Why it helps, in plain terms.** A language model produces text one word (technically one **token**, a word or piece of a word) at a time, and each token gets roughly the same fixed amount of computation. Forcing the answer to appear immediately means the model has to do all the work in that one step. Writing out steps does two things: it breaks the problem into small pieces, each easy enough to get right in one step, and it lets the model "read" its own earlier steps as it goes, like scratch paper. The authors list four benefits: it splits a problem into steps, it gives you a window into how the model got its answer (and where it went wrong), it works for any task a person could solve by explaining it in words, and it needs no training, just a prompt.

**Analogy.** Asking someone to multiply 47 by 23 in their head and say the answer instantly, versus handing them a pencil. Same person, same knowledge. The pencil lets them use it.

### 2. It only works on big models (an "emergent" ability)

**What it is.** An ability is called **emergent** when it is essentially absent in smaller models and then appears, fairly suddenly, once models pass some size. This paper is one of the best-known examples.

**How it showed up.** The authors tested five model families at many sizes: GPT-3 (OpenAI, up to 175 billion **parameters**, the adjustable numbers inside a model that roughly measure its size), LaMDA (Google, up to 137 billion), PaLM (Google, up to 540 billion), and two smaller ones, UL2 and Codex. For models below roughly **100 billion parameters**, chain-of-thought prompting did not help and sometimes hurt. Small models wrote steps that sounded fluent but were illogical, then followed their own nonsense to a wrong answer. Above that size, the gains were large, and they got larger with scale.

**Analogy.** Telling a beginner "talk me through your thinking" while they play chess doesn't make them better, because they don't have the moves to talk through. Telling a strong player to do it can catch blunders. The prompt doesn't add skill; it unlocks skill that is already there.

**Why it matters.** This changed how people saw model scaling. The flat curve on math wasn't because big models *couldn't* do it. It was because the standard way of asking hid what they could do.

### 3. It's the reasoning that matters, not just the extra words

A skeptic could say: maybe the model just needed more tokens to "think," or maybe the examples simply reminded it of relevant knowledge. The authors tested this directly with three **ablations** (experiments where you remove or change one ingredient to see if it was doing the work):

- **Equation only.** The examples show just the math ("5 + 2 x 3 = 11"), no words. This helped on easy one- or two-step problems but did little on the harder GSM8K problems. The plain-language steps were doing real work in translating the story into math.
- **Variable compute only.** The examples contain a row of dots as long as the equation would be, so the model gets the extra tokens but no content. This performed about the same as having no chain of thought. Extra length alone is not the trick.
- **Reasoning after the answer.** The examples give the answer first and the explanation afterward. Also about the same as no chain of thought. So the steps help only when they come *before* the answer, which is the order you'd need for them to actually be used to get there.

**Analogy.** Students who show their work score better not because the page has more ink on it, and not because they wrote the explanation after copying the answer from a neighbor. They score better because they did the steps in order.

### 4. One trick, many kinds of problems

The idea isn't limited to math. The authors applied the same recipe to three families of tasks:

- **Arithmetic reasoning**: math word problems (GSM8K, SVAMP, ASDiv, AQuA, MAWPS).
- **Commonsense reasoning**: questions needing everyday knowledge combined over steps, such as StrategyQA ("Would a pear sink in water?" requires knowing a pear's density is less than water's) and a sports-plausibility test ("Joao Moutinho caught the screen pass in the NFC championship" is implausible because he's a soccer player).
- **Symbolic reasoning**: toy rule-following tasks like "take the last letter of each word in *Amy Brown* and join them" (answer: "yn") or tracking whether a coin is still heads up after several people flip or don't flip it.

The symbolic tasks showed something extra: **length generalization**. The examples in the prompt used only 2-word names or 2 coin flips, yet big models with chain of thought handled 3 and 4, a bit like a student who learned the method instead of memorizing answers.

## Walkthrough: building a chain-of-thought prompt

Say you want a model to answer: "A rental listing costs $2,400 a month. The tenant pays first and last month plus a deposit equal to half a month. How much is due at signing?"

1. **Write a few worked examples of similar problems** (the paper used eight; even a few helps), each in the form question, steps, "The answer is X."
   *Example:* "Q: A gym costs $50 a month plus a $30 signup fee. What do you pay in the first month? A: The monthly fee is $50. The signup fee is $30. 50 + 30 = 80. The answer is $80."
2. **Append your real question** with "A:" and nothing after it.
3. **The model continues the pattern:** "First month is $2,400. Last month is $2,400. Half a month deposit is 2,400 / 2 = 1,200. Total is 2,400 + 2,400 + 1,200 = 6,000. The answer is $6,000."
4. **Read the steps, not just the answer.** If it got it wrong, you can see where (for example, it forgot the deposit), which you can't with a bare number.

## What they showed

- **Math, the headline result.** On GSM8K, a benchmark of about 8,500 grade-school word problems, PaLM 540B went from about **18% correct with standard prompting to about 57% with chain-of-thought prompting**, using just eight examples. That beat the previous best result (about 55%), which came from fine-tuning GPT-3 175B on thousands of solved problems and adding a trained verifier model. A prompt beat a purpose-built training pipeline. GPT-3 175B showed a similar jump, from about 16% to about 47%.
- **Bigger gains on harder problems.** Improvements were largest on GSM8K, the hardest math set, and small or nonexistent on the easiest single-step sets, where there was nothing to break down.
- **Commonsense.** PaLM 540B with chain of thought set a new best on StrategyQA (about 76% versus a previous 69%) and scored about 95% on sports understanding, higher than the roughly 84% of an unaided sports enthusiast the authors used as a reference.
- **Robust to who wrote the examples.** Three different authors wrote their own chains of thought in different styles, and the authors also tried examples drawn from GSM8K's own training set written by other people. All versions clearly beat standard prompting, though accuracy did vary by example set, so prompt wording still matters.
- **The errors were readable.** The authors hand-checked LaMDA 137B's work on GSM8K. When it got the answer right, the reasoning was almost always right too. When it got it wrong, about half the mistakes were small (an arithmetic slip, one missing step) and the rest were bigger misunderstandings. Simply running a calculator over the written equations fixed some of the slips, and moving from PaLM 62B to 540B fixed many of the "missing step" and misunderstanding errors.

Why it was convincing: it was simple enough that anyone with API access could reproduce it the same afternoon, and the size of the jump on the hardest benchmark was hard to argue with.

## Limitations

- **Is it really reasoning?** The authors say plainly that the model *imitates* the form of reasoning and that the paper does not settle whether it is "actually reasoning." Steps can look right and still lead to a wrong answer, or (more worrying) look reasonable while not being what actually drove the answer.
- **Only for huge models.** In 2022, the benefit appeared only above about 100 billion parameters, which were expensive to run. (Smaller models have since been trained to reason step by step, but plain prompting alone didn't do it.)
- **Correct steps aren't guaranteed.** Nothing checks the reasoning. Arithmetic slips and confident wrong steps still happen.
- **You still have to write examples.** Hand-writing good chains of thought is easy for a few prompts but adds up, and results shift depending on which examples you choose.
- **Faithfulness, the big later critique.** Follow-up research found that the written reasoning doesn't always reflect the model's real process. A 2023 study by Turpin and colleagues showed models could be nudged by hidden biases in a prompt (for example, the correct answer always being "(A)" in the examples) and then write an explanation that never mentioned that bias. Anthropic's 2025 study of reasoning models found that when models were slipped a hint that changed their answer, they admitted using it only a minority of the time (about 25% for Claude 3.7 Sonnet and 39% for DeepSeek R1).
- **Costs time and money.** More words out means more computation, more latency, more cost.

## Where this is today

### How it IS used

- **It became built into the models themselves.** This is the biggest legacy. OpenAI's o1 (September 2024) was introduced as a model trained with reinforcement learning to produce a long chain of thought before answering; OpenAI keeps the raw chain hidden and shows a summary. DeepSeek-R1 (January 2025) published how it did something similar, using RL that rewards correct final answers so the model learns on its own to write longer, self-checking reasoning. Anthropic's Claude offers **extended thinking**, where developers set a "thinking budget" for how much the model may reason before answering, and Google's Gemini models have a similar thinking setting with a budget. In each case, the "show your work" behavior is trained in, not prompted in.
- **"Let's think step by step."** A few months after this paper, Kojima and colleagues showed you could skip the hand-written examples entirely: adding the single line "Let's think step by step" before the answer gave big gains on its own (with OpenAI's text-davinci-002 model, one math benchmark went from about 18% to 79%). This "zero-shot chain of thought" became the most-copied line in prompt engineering.
- **A family of follow-up techniques.** Self-consistency (Wang et al., 2022, partly the same Google team) samples many chains of thought and takes the majority-vote answer, which pushed PaLM 540B to about 74% on GSM8K. Tree of Thoughts explores several branches of reasoning. And ReAct, tomorrow's paper, mixes reasoning steps with actions like searching or calling tools, which is the basic loop inside most AI agents today.
- **Safety monitoring.** Because reasoning models write their thinking in plain language, labs read it to catch problems such as a model planning to cheat on a task. A July 2025 paper co-signed by researchers from OpenAI, Google DeepMind, Anthropic and others called this "chain of thought monitorability" a valuable but fragile safety opportunity and urged developers not to train models in ways that would make their reasoning less readable.

### How it ISN'T used

- **Hand-written few-shot chains are mostly obsolete for top models.** Today's reasoning models already think step by step, so writing eight worked examples (or even adding "let's think step by step") usually adds little. A 2025 Wharton report tested this across models and found that explicitly asking for chain of thought gave only small average gains for non-reasoning models (sometimes making answers less consistent) and very little benefit for reasoning models, while adding time and cost. Model makers' own guides now tell developers to give reasoning models a clear goal and let them work out the steps themselves.
- **"Emergent only at 100 billion parameters" no longer holds.** Distillation and RL training have produced much smaller models (DeepSeek released small "distilled" versions of R1, for example) that reason step by step well. The threshold was a fact about prompting untrained models in 2022, not a law.
- **Visible reasoning isn't always the real reasoning.** As the faithfulness studies above show, treating the chain of thought as a reliable explanation of *why* a model did something turned out to be too optimistic.

### Lineage

Few-shot prompting (GPT-3, Day 11) -> chain-of-thought prompting (2022) -> "let's think step by step," self-consistency, ReAct -> reasoning models trained with RL to think before answering (o1, DeepSeek-R1, Claude extended thinking, Gemini thinking) -> the "thinking..." pause you see in chat apps today.

## Why it matters for Brendan

- **Unstall.** A real estate chief of staff constantly faces multi-step judgment calls: "This buyer toured three homes, mentioned a school district, and hasn't replied in a week; what should the agent do next?" Asking a model to first lay out the facts, then the options, then the recommendation (or using a model with a thinking mode for those calls) is the practical form of this paper. The visible steps also give you something product-shaped: a short "why I'm suggesting this" line the agent can glance at and trust or correct. Just remember the faithfulness finding: treat that explanation as helpful, not as proof.
- **Arbor.** Agents bidding in an auction need to reason over several constraints at once (price, deadline, the user's stated context). Chain-of-thought reasoning before a bid makes those decisions better and auditable: if an agent overbids, you can read where its logic went wrong. And tomorrow's paper, ReAct, is exactly the step from "reason, then answer" to "reason, act, observe, repeat," which is how an agent in a marketplace actually operates.

## Key terms

- **Chain of thought**: a series of short, plain-language intermediate steps a model writes before its final answer.
- **Few-shot prompting**: putting a handful of worked examples in the prompt so the model copies the pattern on a new input, with no retraining.
- **Emergent ability**: a skill that is basically absent in smaller models and appears once models pass a certain size.
- **Ablation**: an experiment that removes or swaps out one ingredient to test whether it was responsible for the result.
- **Faithfulness**: whether a model's written reasoning actually reflects the process that produced its answer.
- **Reasoning model**: a model trained (usually with reinforcement learning) to produce its own chain of thought before answering, such as o1, DeepSeek-R1 or Claude with extended thinking.

## If you only have 10 more minutes

Look at **Figure 1** (the tennis balls versus cafeteria apples example; it is the whole idea in one picture) and **Figure 4** (the curves showing chain of thought helping only once models get big). Then read **Section 3.3, the ablation study**, which is short and teaches you how researchers prove *why* something works. If you have time, skim the example outputs in the appendix tables to see real chains of thought, good and bad. Skip the per-benchmark tables in Sections 4 and 5 and the detailed model list; the pattern is the same everywhere.

## One question to think about

If a model's written reasoning can sound convincing without being the real reason for its answer, how much should your products show users that reasoning, and what would you need to check before letting someone act on it?

## Sources

- [Wei et al., Chain-of-Thought Prompting Elicits Reasoning in Large Language Models, on arXiv](https://arxiv.org/abs/2201.11903)
- [Kojima et al., Large Language Models are Zero-Shot Reasoners (NeurIPS 2022)](https://proceedings.neurips.cc/paper/2022/hash/8bb0d291acd4acf06ef112099c16f326-Abstract-Conference.html)
- [Wang et al., Self-Consistency Improves Chain of Thought Reasoning in Language Models](https://arxiv.org/abs/2203.11171)
- [OpenAI, Learning to Reason with LLMs](https://openai.com/index/learning-to-reason-with-llms/)
- [Simon Willison, Notes on OpenAI's new o1 chain-of-thought models](https://simonwillison.net/2024/Sep/12/openai-o1/)
- [DeepSeek-AI, DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2501.12948)
- [Anthropic, Extended thinking documentation](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Google, Thinking in Gemini models (Firebase AI Logic docs)](https://firebase.google.com/docs/ai-logic/thinking)
- [Anthropic, Reasoning models don't always say what they think](https://www.anthropic.com/research/reasoning-models-dont-say-think)
- [Korbak et al., Chain of Thought Monitorability: A New and Fragile Opportunity for AI Safety](https://arxiv.org/abs/2507.11473)
- [Wharton Generative AI Labs, Prompting Science Report 2: The Decreasing Value of Chain of Thought in Prompting](https://arxiv.org/abs/2506.07142)
