---
day: 29
title: "LLM Multi-Agent Systems Are Vulnerable to Herding and Runaway Cascades"
short_title: "Herding in AI agent crowds"
authors: "Farnoosh Hashemi, Shiyu Ji, Joice Chen, Michael W. Macy (Cornell University and Stanford University)"
year: 2026
link: "https://arxiv.org/abs/2610.30769"
track: "Frontier"
section: "Frontier"
tldr: "When AI agents can see what earlier agents chose, they pile onto early favorites far more than people do, so a crowd of agents can crown an arbitrary winner and, unlike human crowds, rarely corrects itself."
---

# Day 29: LLM Multi-Agent Systems Are Vulnerable to Herding and Runaway Cascades

Farnoosh Hashemi, Shiyu Ji and Michael W. Macy (Cornell University) and Joice Chen (Stanford University). Posted to arXiv on October 22, 2026 (yesterday). [Read the paper on arXiv](https://arxiv.org/abs/2610.30769). Track: Frontier.

A note on why this paper: Michael Macy is a well-known Cornell sociologist who studies how opinions spread, and this paper takes one of the most famous experiments in social science and reruns it with about 168,000 AI agents. It goes straight at a question your Arbor protocol depends on: what happens when agents make choices after seeing what other agents chose? I read the full paper for this brief, so the numbers below come from the paper itself. Disclosure: I am Claude, made by Anthropic, and two of the 13 models tested (Claude Sonnet 4.6 and Claude Haiku 4.5) are Anthropic models.

## TL;DR

Show AI agents a popularity counter and they stampede toward whatever got lucky early, more than humans do and with much less ability to course-correct, so any system where agents see each other's choices needs to be designed against herding.

## What it builds on

GPT-3 (Day 11) showed that whatever you put in a model's prompt steers its answer, which is exactly the channel this paper exploits: the popularity counts are just text in the prompt. InstructGPT and RLHF (Day 16) trained models to be agreeable, which is one suspected root of **sycophancy** (a model's tendency to go along with what it is shown or told). Chain-of-thought (Day 17) is the ancestor of the "reasoning models" tested here, which think before answering, and ReAct (Day 18) is the ancestor of the agents that now act in sequence inside larger systems. The authors also point to RAG (Day 14) as an example of the same bottleneck their experiment builds in: a model can only judge what got picked for it to look at.

## The world before this paper

In 2006, sociologists Matthew Salganik, Peter Dodds and Duncan Watts ran the **Music Lab** experiment, published in *Science*. About 14,000 people visited a website with 48 songs by unknown bands. Some visitors saw how many times each song had been downloaded; others saw no counts. The twist: the visitors who saw counts were split into eight separate "worlds" that each started from zero. The same song could become a hit in one world and a flop in another, purely because of who happened to download it first. Success was more unequal and much less predictable when people could see each other's choices. But a later reanalysis found something hopeful: over time, the human crowds partly **self-corrected**, drifting back toward the songs people liked on their own merits. Fast forward to 2026. AI agents increasingly read other agents' outputs: rankings, ratings, votes, reviews. Researchers had shown that a single model bends toward a majority answer you paste into its prompt. What nobody had cleanly tested was the full loop: agents creating the very signal that later agents react to, at the scale of thousands, with a human benchmark to compare against.

## Core ideas

### 1. The setup: Music Lab, rebuilt for AI agents

The authors kept Music Lab's structure and swapped in AI.

**The songs.** They generated 48 brand new songs with Suno v4.5, an AI music app. New songs matter: if they had used famous songs, the models might already "know" which ones are popular from their training data, which would contaminate the experiment. Agents saw each song as a title plus lyrics (131 to 172 words), with no audio.

**The agents.** Each agent was one call to a language model, given a **persona**: an age, a gender, a country, and a favorite and second favorite music genre (from a list like Jazz, Hip-Hop/Rap, Country, Metal). Personas make the crowd varied, the way a real audience is varied, instead of 1,000 copies of the same listener.

**One agent's turn, in two stages:**

1. **Select.** The agent sees all 48 titles and must pick exactly 4 to look at more closely. (Four matches how many songs the average Music Lab visitor sampled.)
2. **Recommend.** It reads the lyrics of those 4 and says yes or no to recommending each one. Every "yes" adds 1 to that song's count. Then the next agent goes.

**Three conditions:**

- **Independent:** titles in random order, no counts. This measures each song's **intrinsic appeal**: how much agents like it with no social pressure.
- **Weak influence:** counts shown next to each title, but titles still in random order.
- **Strong influence:** counts shown *and* titles sorted from most to least recommended, with the prompt saying so.

**The parallel worlds.** For each model, there was one independent world of 1,440 agents, eight weak-influence worlds of 720 agents, and eight strong-influence worlds of 720 agents. Each world started at zero and evolved on its own, with no knowledge of the others. That is 12,960 agents per model, and they did it for 13 models, for 168,480 agents in total.

**The models.** Five **reasoning models** (models that write out hidden step-by-step thinking before answering): GPT-5, GPT-5 nano, Gemini 3 Flash, DeepSeek-R1 and Claude Sonnet 4.6. And eight **non-reasoning models** (answer directly): GPT-4o, GPT-4o mini, Gemma 3 in 4B, 12B and 27B sizes, DeepSeek-V3.1, Claude Haiku 4.5 and Qwen3-Next 80B.

**Analogy:** Imagine running the same film festival in 17 identical towns on the same weekend. In one town, the audience gets no buzz at all. In the other 16, each screening's ticket count is posted on a board outside, and in half of those the board is also the program order. If the same film wins everywhere, quality is driving the result. If every town crowns a different winner, buzz is.

### 2. Three ways to measure a stampede

The paper uses three yardsticks. Each answers a different question.

**Divergence: did the crowd drift away from honest taste?** Each song's **market share** is its fraction of all recommendations in a world. The independent world gives the "honest taste" shares. **KL divergence** (Kullback-Leibler divergence) is a standard formula for how different two sets of percentages are. Zero means identical; bigger means more different. Here it measures how far each influence world's shares moved away from the honest-taste shares.

**Unpredictability: would you get the same winners if you reran history?** For each song, compare its market share across every pair of the eight parallel worlds (28 pairs) and average the gaps. Then average over all 48 songs. If every world agrees, unpredictability is near zero. If a song is a hit in World 3 and ignored in World 6, it is high. This is the exact measure Music Lab used, which is what lets the authors compare against humans.

**Self-correction: does the crowd find its way back?** Split each world's history into a first half and a second half. In each half, check how well the ranking of songs matches the honest-taste ranking, using a **Spearman correlation** (a score from -1 to 1 for how well two rankings line up). If the second half lines up better than the first, the crowd is correcting itself.

**Mental picture:** divergence is how far the herd wandered from the river. Unpredictability is whether different herds wander to different places. Self-correction is whether they start walking back toward the river once they get thirsty.

### 3. The core finding: agents herd harder than people and do not walk back

Put together, the result has three parts.

**Agents herd.** In every one of the 13 models, under both influence conditions, recommendations moved away from honest taste (statistically significant every time). On average, LLM crowds diverged about **9 times as far as humans** under weak influence and **4 times as far** under strong influence.

**Early luck decides the winner.** In the independent condition, unpredictability was close to zero for every model: with no social signal, agents agree on which songs are good. Once counts appeared, parallel worlds split apart. Non-reasoning models were more than twice as unpredictable as humans. The authors also checked directly how much the first 30 agents mattered: the songs those first 30 agents favored predicted later popularity better than intrinsic appeal did, in 12 of 13 models under weak influence and all 13 under strong influence. Among humans, early movers beat intrinsic appeal only under strong influence.

**No walking back.** Human Music Lab crowds self-corrected in 15 of 16 worlds. The match between popularity and honest appeal rose from 0.633 to 0.773 under weak influence and from 0.575 to 0.660 under strong influence. LLM crowds went every which way: some worlds corrected a little, some got worse, and under strong influence the average change was close to zero. The authors call this a **runaway cascade**: a self-reinforcing departure from independent judgment that does not fix itself, at least over 720 agents.

Why would agents be worse than people here? The paper does not prove a cause, but the data offer clues. DeepSeek-R1, whose reasoning is visible, mentioned song popularity in *every* reasoning log in both influence conditions. In other words, the agents openly treat the count as evidence. Humans, by contrast, have their own ears and their own moods, which keep pulling them back toward what they actually like.

### 4. Smarter models resist better, but are not immune

The authors split the results two ways.

**Reasoning vs. non-reasoning.** Non-reasoning models diverged 2.4 times as far as reasoning models under weak influence and 3.2 times as far under strong influence, and were about twice as unpredictable. Under strong influence, four of the five reasoning models diverged less than every non-reasoning model (GPT-5 nano was the exception). GPT-5 came close to the human level. Gemma 3 4B, the smallest model, diverged more than 8 times as far as GPT-5.

**A continuous "intelligence" score.** They used the **Artificial Analysis Intelligence Index**, a public composite benchmark covering coding, agent tasks and science reasoning. Higher-scoring models herded less. The rank correlation between intelligence and divergence was -0.85 under strong influence (a strong link), and about -0.72 to -0.73 for unpredictability in both conditions.

**But.** Even the models that resisted herding best did not reliably self-correct. And the authors add a warning that cuts against the comforting reading: their task was simple and had no talking, no incentives, and no peer pressure. If tasks get harder as models get smarter, and agents start persuading or rewarding each other, susceptibility could go up, not down.

**Analogy:** A seasoned film critic is less swayed by a sold-out sign than a first-time moviegoer. But put the critic in a room where every other critic is raving, and give them a reason to agree, and the sign starts to matter again.

### Walkthrough: one strong-influence world, agent by agent

1. **Agent 1** (persona: 34, Brazil, likes Rock then Folk) sees 48 titles, all at 0, in random order (ties are broken randomly). It picks 4, reads the lyrics, recommends 2: say "Velvet Web" and "Compass Ink." Counts: Velvet Web 1, Compass Ink 1.
2. **Agent 2** now sees those two titles at the top of the list, with a count of 1. It is told the list is sorted by recommendations. It is more likely to pick them to read, simply because they are first and labeled popular.
3. **Having picked them,** it reads the lyrics knowing others liked them, which nudges its yes or no. Popularity therefore helps a song twice: once in getting looked at, once in getting a yes.
4. **By agent 100,** Velvet Web might sit at 41, far ahead, while a song that independent agents liked more never got picked enough to catch up, because nobody chose it to read.
5. **In a parallel world,** agent 1 happened to recommend "Neon Garden" instead, and that world crowns Neon Garden. Same songs, same model, same rules, different winner.
6. **The second half** of each world looks a lot like the first. The leader stays the leader. That is the runaway part.

## What they showed

- **Scale:** 13 models, 168,480 agents, 48 songs, 17 parallel worlds per model, compared against the original human Music Lab data using the same formulas.
- **Herding everywhere:** all 13 models drifted from independent taste under both influence types.
- **Sorting makes it worse:** putting popular songs at the top (strong influence) raised divergence in 12 of 13 models, by 65% on average (excluding Claude Sonnet 4.6, the one exception), and raised unpredictability in 12 of 13 (Gemini 3 Flash the exception).
- **Inequality rose:** the **Gini coefficient** (a 0 to 1 score of how concentrated something is; 1 means one song gets everything) increased in all 13 models under strong influence.
- **Not a position quirk:** you might suspect agents just pick whatever is listed first. With random order and no counts, most models picked fairly evenly across positions (Gemma 3 4B and GPT-4o mini showed a slight top bias). Humans actually showed much stronger position bias, which suggests the gap between humans and AI may be even bigger than reported.
- **Robust to settings:** lowering the **temperature** (a dial for how random a model's answers are) from 1.0 to 0.7 did not reduce herding in non-reasoning models. Letting agents read 12 songs instead of 4 reduced herding but kept the same pattern across models.

Why it is convincing: the parallel-worlds design is clean. Same model, same songs, same personas procedure, only the history differs, so differences between worlds can only come from social feedback. And comparing against the real human data gives a yardstick most AI herding studies lack.

## Limitations

- **Not a perfectly matched human comparison.** Humans listened to audio and downloaded; agents read lyrics and recommended. Humans chose how many songs to sample; agents had to pick exactly 4. Humans saw a grid; agents saw a list. The authors themselves say the human numbers are a qualitative benchmark, and that a matched human replication is needed.
- **Lyrics are not music.** Judging a song from lyrics alone is a much weaker "intrinsic appeal" signal than hearing it. A weaker personal signal makes it easier to lean on the crowd. The authors explain why they chose text (cost across 160,000 agents, and evidence that audio models often ignore audio anyway), but it may inflate herding.
- **Same-model crowds.** Every world was one model talking to copies of itself. Real systems mix models and mix humans with AI.
- **No talking, no money.** Agents only saw counts. Real multi-agent systems involve messages, persuasion, rewards and penalties, which could make herding stronger.
- **Short horizon.** 720 agents per world. The authors say they cannot rule out that LLM crowds would correct over much longer runs.
- **A preprint.** It was posted yesterday and is under review, so there has been no outside replication or critique yet.

## Where this is today

This is a one-day-old warning paper, not a technique, so "use" here means: where does the loop it describes already exist, and is anyone designing against it?

### How it IS used

- **AI shopping agents already react strongly to crowd signals.** A 2025 Columbia Business School study, "What Is Your AI Agent Buying?", built a simulated marketplace and found that a +0.1 star rating raised a product's selection chance from 10% to between 15% and 20% depending on the model, and an "Overall Pick" badge raised it to as much as 42.6% for Gemini. Telling agents to ignore list position did not meaningfully remove position effects. That is the single-agent half of this paper's loop. As agentic commerce spreads (Google has published a Universal Commerce Protocol and an Agent Payments Protocol for agents that shop and pay), more of those ratings will be written by agents and then read by other agents, which closes the loop.
- **Agent social networks.** Moltbook, launched in January 2026, is a Reddit-style site where only AI agents post and upvote; it had more than 37,000 agents within a week. A study of it (MoltNet) found agents posted more after their most upvoted post and drifted away from their stated personas afterward, and that each community converged on template-like posts. That is the same kind of popularity feedback this paper isolates in the lab.
- **Automated evaluation.** Using one model to grade another's output ("LLM-as-a-judge") is now standard in AI development and in many products. The paper flags that if judges see earlier scores, the same cascades can form.
- **Recommender systems.** Researchers have long documented that recommendation feedback loops homogenize what people consume and amplify popularity. LLM-based recommenders inherit that, and this paper suggests they may amplify it more.

I did not find any product that cites this specific paper yet; it is too new.

### How it ISN'T used (or not yet)

- **No standard fix.** The paper measures the problem but does not test a remedy. The design lessons are implicit in its setup (collect independent judgments before showing counts; do not sort by popularity; let agents look at more options), but these are my reading of the results, not tested interventions.
- **"Use a smarter model" is only a partial answer.** The best reasoning models herded less but still did not self-correct, and the authors expect harder tasks with incentives to push susceptibility back up.

### Lineage

Herding theory (economists, 1992) -> Music Lab with humans (2006) -> LLMs conforming to a pasted-in majority (2023 to 2025) -> this paper: AI crowds generating their own cascades (2026) -> agent marketplaces and agent social networks where agents read each other's ratings (today).

## Why it matters for Brendan

**Arbor.** This is the most directly relevant paper you have read so far for Arbor. An auction or marketplace protocol for agents is precisely a place where agents see signals created by other agents: bids, prior winners, ratings, "most chosen" lists. This paper says those signals can crown arbitrary winners and lock them in. Concrete design questions it raises: Should Arbor show agents other agents' choices at all before they evaluate? Can you use **sealed bids** (each agent commits without seeing others, a classic auction format) or a blind first pass? Should listings be shuffled rather than ranked by popularity, given that sorting made herding worse in 12 of 13 models? And the Columbia shopping study tells you sellers will optimize for whatever signals agents over-weight.

**Your filmmaker side.** The original Music Lab is one of the best pieces of evidence that hits in cultural markets are partly luck: the same song can win or lose depending on early buzz. This paper suggests that as AI agents start curating and recommending films, music and videos, that luck factor could get stronger, not weaker. For a creator, the first 30 viewers (or agents) matter more than ever.

**CoMinds.** If students or their agents can see which teams or projects are "filling up," you will likely get the same pile-on. Showing popularity after people state their own preferences, not before, is the lesson.

## Key terms

- **Herding**: discounting your own judgment to follow what others chose.
- **Information cascade**: a chain where each person follows the previous ones, so early choices snowball regardless of quality.
- **Intrinsic appeal**: how much a song is liked when nobody sees anyone else's choices; here, measured in the independent world.
- **KL divergence**: a number for how different two sets of percentages are; zero means identical.
- **Unpredictability**: how much the same song's success varies across parallel worlds that started identically.
- **Self-correction**: a crowd drifting back toward intrinsic appeal over time after an early wrong turn.

## If you only have 10 more minutes

Read the Introduction (page 1 to 2) for the Music Lab background and the seven research questions, then look at Figure 1 on page 4, which shows the whole design in one picture including a single agent's turn. Then read Section 3.4 and Figure 5 on self-correction, the most striking human vs. AI contrast, and the one-page Discussion (Section 4). Skip the formulas in Section 2.4 and the appendix unless you want to replicate it.

## One question to think about

In a marketplace run by agents, early luck turns into lasting advantage. Is that a bug you should engineer away, or a feature that real markets have always had, and who should decide which one Arbor is?

## Sources

- [LLM Multi-Agent Systems Are Vulnerable to Herding and Runaway Cascades (arXiv)](https://arxiv.org/abs/2610.30769)
- [Salganik, Dodds and Watts, Experimental Study of Inequality and Unpredictability in an Artificial Cultural Market (2006, PDF)](https://pdodds.w3.uvm.edu/research/papers/years/2006/salganik2006a.pdf)
- [What Is Your AI Agent Buying? Evaluation, Implications, and Emerging Questions for Agentic E-Commerce (arXiv)](https://arxiv.org/pdf/2508.02630v2)
- [The rise of agent-to-agent commerce: When AI starts shopping for AI (Stacker)](https://stacker.com/stories/shopping/rise-agent-agent-commerce-when-ai-starts-shopping-ai)
- [Moltbook, a social network for AI agents (NBC Washington)](https://www.nbcwashington.com/news/tech/moltbook-ai-social-network/4052050/)
- [MoltNet: Understanding Social Behavior of AI Agents in the Agent-Native MoltBook (arXiv)](https://www.arxiv.org/pdf/2602.13458)
