---
day: 18
title: "ReAct: Synergizing Reasoning and Acting in Language Models"
short_title: "ReAct"
authors: "Yao, Zhao, Yu, Du, Shafran, Narasimhan & Cao"
year: 2022
link: "https://arxiv.org/abs/2210.03629"
track: "Foundations"
section: "Making models useful"
tldr: "Let a language model alternate between writing a thought, taking an action like a search, and reading what comes back, and it stops making things up as often and can finish real multi-step tasks; this think, act, observe loop is the skeleton of nearly every AI agent today."
---

# Day 18: ReAct: Synergizing Reasoning and Acting in Language Models

Shunyu Yao (Princeton, work done as a Google intern), Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan (Princeton) and Yuan Cao (Google Research, Brain Team), 2022. First posted October 2022, published at ICLR 2023. [Read the paper on arXiv](https://arxiv.org/abs/2210.03629). Track: Foundations 18/21.

## TL;DR

Instead of having a model either think silently or act blindly, ReAct has it do both in turns (Thought, Action, Observation, repeat), so its reasoning decides what to look up or do next and the real-world results keep its reasoning honest.

## How it builds on Day 17

Chain-of-thought (Day 17) taught models to write out their reasoning, but that reasoning lived entirely inside the model's head; ReAct lets the model stop mid-thought, go check something in the outside world, and continue with what it found.

## The world before this paper

By 2022 there were two separate lines of work. One was **reasoning**: chain-of-thought prompting made big models much better at multi-step problems, but everything came from the model's memory. If it misremembered a fact, it would build a confident, beautifully reasoned answer on top of the error. This is called **hallucination**: the model stating things that sound right but are false. The other line was **acting**: researchers used language models to choose actions in games, websites and robot tasks (for example, Google's SayCan and Inner Monologue for robots, and WebGPT for browsing). But these systems mostly mapped "what I see" straight to "what I do next," with little room to plan, keep track of progress, or notice a mistake. Doing well usually meant training on huge piles of example runs, around 100,000 of them. Nobody had shown a simple way to make one model both think and act, with each making the other better.

## Core ideas

### 1. The loop: Thought, Action, Observation

**What it is.** ReAct (short for **Re**ason + **Act**) is a prompting format. The model's output is a sequence of three kinds of lines that repeat:

- **Thought**: free-form reasoning in plain English. It doesn't change anything in the world. It's the model talking to itself.
- **Action**: a command from a small fixed menu, written in a set format, like `Search[Apple Remote]`. A program outside the model reads this line and actually runs it.
- **Observation**: the result the program sends back (the text of a search result, what's in a drawer), pasted into the prompt for the model to read.

**How it works, step by step.**

1. You write a prompt with a few complete example runs (the paper used just 1 to 6) showing questions solved in Thought, Action, Observation style.
2. You add the new task.
3. The model writes a Thought, then an Action. Then it stops generating.
4. Your code runs the action (for example, calls a Wikipedia search) and pastes the result back as an Observation.
5. The model reads everything so far and writes the next Thought and Action.
6. This repeats until the model writes a special finishing action, like `Finish[answer]`.

**The paper's own example (Figure 1).** The question: "Aside from the Apple Remote, what other device can control the program Apple Remote was originally designed to interact with?"

> **Thought 1:** I need to search Apple Remote and find the program it was originally designed to interact with.
> **Action 1:** Search[Apple Remote]
> **Observation 1:** The Apple Remote is a remote control introduced in October 2005 by Apple ... originally designed to control the Front Row media center program ...
> **Thought 2:** Apple Remote was originally designed to control the Front Row media center program. I need to search Front Row next and find what other device can control it.
> **Action 2:** Search[Front Row]
> **Observation 2:** Could not find [Front Row]. Similar: ['Front Row (software)', ...]
> **Thought 3:** Front Row is not found. I need to search Front Row (software).
> **Action 3:** Search[Front Row (software)]
> **Observation 3:** Front Row is a discontinued media center software ... controlled by an Apple Remote or the keyboard function keys ...
> **Thought 4:** Front Row (software) is controlled by an Apple Remote or the keyboard function keys. So the answer is keyboard function keys.
> **Action 4:** Finish[keyboard function keys]

Notice what happened at step 3: the search failed, and the Thought noticed and fixed it. In the same figure, chain-of-thought alone confidently invented a wrong answer from memory, and "act only" (searching with no thoughts) wandered and never pieced the facts together.

**Analogy.** A detective working a case. Chain-of-thought is a detective solving it from the armchair using only what they remember. "Act only" is a junior officer knocking on doors with no theory of the case. ReAct is the good detective: forms a hunch, goes to check one specific thing, updates the hunch based on what they found, and decides where to go next.

### 2. Reasoning and acting help each other (the "synergy")

The title's key word is **synergy**: each half fixes the other half's weakness.

- **Acting helps reasoning.** Observations from the real world **ground** the reasoning, meaning they tie it to actual facts instead of the model's fuzzy memory. Less making things up.
- **Reasoning helps acting.** The Thoughts do jobs that pure "see, then do" systems can't. The paper lists them: breaking a goal into sub-goals ("first find the program, then find what else controls it"), pulling the important bit out of a long observation, tracking progress ("I've found the pepper shaker, now I need to put it in the drawer"), bringing in common sense ("a pepper shaker is more likely in a cabinet or on a countertop"), and changing plans when something goes wrong.

The Thoughts also act as **working memory**: since everything the model has thought and seen stays in the prompt, it can keep track of a long task instead of forgetting what it was doing.

**Analogy.** A GPS that only recalculates from a map you downloaded last year (reasoning only) versus one that drives with its eyes closed (acting only). You want the one that plans a route, watches the road, and reroutes when it sees a closure.

### 3. Dense thoughts for questions, sparse thoughts for tasks

ReAct isn't one rigid template. The paper uses it two ways:

- **Knowledge tasks** (answering questions, checking facts): the model alternates strictly, a Thought before every Action, because each search needs a reason.
- **Decision-making tasks** (navigating a simulated house, shopping on a website): a task might take 50 actions, and most are obvious ("go to cabinet 1," "open cabinet 1"). Here the model writes Thoughts only when it needs them, at key moments like the start of the task or after something unexpected. The model itself decides when to think.

The action menus were deliberately simple. For question answering, the model got a tiny Wikipedia "API" (a set of commands a program accepts) with three actions: `search[entity]` (returns the first five sentences of that Wikipedia page, or similar page titles if there's no match), `lookup[string]` (finds the next sentence on the page containing that word, like Ctrl+F), and `finish[answer]`. The authors made it weak on purpose, to mimic how a person would browse, so the model had to reason its way to answers rather than lean on a powerful search engine.

### 4. A human can step in and edit the thoughts

Because the reasoning is written in plain English, a person can read along and change it. In one example from a simulated household task, the model hallucinated a wrong Thought at step 17 and the run was heading for failure. A person edited just two Thoughts (at steps 17 and 23), and the model then completed the task. You can't do that with a system that maps observations straight to actions, because there's nothing readable to edit. The authors pitched this as a new kind of human and AI collaboration: steer the agent by correcting its thinking, not by taking over its controls.

### 5. Bonus: a cheap way to teach small models

Prompting a giant model for every request is expensive. So the authors had the big model (PaLM, 540 billion **parameters**, the adjustable numbers inside a model that roughly measure its size) generate ReAct runs on its own, kept only the roughly 3,000 that got the right answer, and **fine-tuned** (trained further on a small, specific dataset) much smaller PaLM models on them. The result: an 8-billion-parameter model fine-tuned this way beat every prompting method on the 62-billion model, and a fine-tuned 62-billion model beat every prompting method on the 540-billion model. Teaching small models the *habit* of thinking and acting was very efficient.

## Walkthrough: the four benchmarks

1. **HotpotQA** (multi-hop question answering): questions that need facts from two or more Wikipedia pages, like the Apple Remote one. The model could only use the weak Wikipedia API. Scored by **exact match** (did the answer match the correct one word for word).
2. **FEVER** (fact checking): given a claim like "Nikolaj Coster-Waldau worked with the Fox Broadcasting Company," decide if Wikipedia supports it, refutes it, or doesn't say.
3. **ALFWorld** (a text-only household game): "put a clean mug in the coffee machine." The model reads descriptions of rooms and types commands like "go to countertop 1" or "take mug 2." Tasks can take dozens of steps.
4. **WebShop** (online shopping): a simulated store with 1.18 million real Amazon products. Given an instruction like "a nickel-finish nightstand with drawers, under $140," the model has to search, click through results, choose options and buy the right item.

## What they showed

All main results used PaLM-540B, prompted with only a handful of examples.

- **Fact checking (FEVER):** ReAct scored about 61% versus about 56% for chain-of-thought and 57% for standard prompting. Being able to look things up clearly helped.
- **Multi-hop questions (HotpotQA):** Here's the honest wrinkle. ReAct alone (about 27% exact match) was slightly *worse* than chain-of-thought (about 29%). The authors dug into why (see the error analysis below) and found the two methods fail in opposite ways. So they combined them: try ReAct, and if it doesn't finish within a few steps, fall back to chain-of-thought with **self-consistency** (sample many chains and take the majority answer); or the reverse, start with self-consistency and switch to ReAct when the votes don't agree. The best combination reached about 35% on HotpotQA and about 65% on FEVER, the best prompting results. (For perspective, models specially trained on 90,000 to 140,000 examples still scored far higher, about 68% and 90%.)
- **The error analysis, which is the convincing part.** The authors hand-labeled HotpotQA runs. When chain-of-thought failed, 56% of the failures were hallucinations. When ReAct failed, 0% were hallucinations. And when ReAct succeeded, its reasoning was grounded in real facts 94% of the time, versus 86% for chain-of-thought. ReAct's failures came from other places: 47% were reasoning errors (often getting stuck repeating the same search over and over), and 23% were searches that returned nothing useful. In short: chain-of-thought is smart but makes things up; ReAct is honest but can get stuck. That's exactly why combining them worked best.
- **Household tasks (ALFWorld):** ReAct succeeded on 71% of tasks with just two examples in the prompt. Acting without thoughts managed 45%, and BUTLER, a system trained by imitating about 100,000 expert runs, got 37%. That's a 34-point absolute gain over a heavily trained system, from a prompt.
- **Shopping (WebShop):** ReAct succeeded 40% of the time from a single example, versus about 29% for systems trained with imitation learning and reinforcement learning on thousands of human shopping sessions, a 10-point gain. Human experts still did much better, at about 60%.
- **Thoughts beat "inner monologue."** The authors also tested a version where the model only narrated what it saw (in the style of Google's Inner Monologue robot work) without real reasoning. It reached 53% on ALFWorld versus ReAct's 71%. It kept misjudging whether a subgoal was done and lacked the common sense about where things usually are. So it's specifically the *reasoning* in the thoughts that matters.
- **Not just a PaLM trick.** The same prompts worked with OpenAI's GPT-3 (text-davinci-002), which did as well or better on some tasks.

Why it was convincing: the gains on the interactive tasks were big and came from one or two examples, beating systems trained on huge datasets. And the error analysis explained *why* it worked, rather than just reporting a score.

## Limitations

- **It gets stuck in loops.** The most common failure was repeating the same Thought and Action again and again, unable to break out. The authors suspected their simple text-generation settings were partly to blame.
- **Only as good as its tools.** A bad or empty search result can derail the whole run, and the model often doesn't know how to recover.
- **Prompts can only hold a few examples.** Tasks with many possible actions need more demonstrations than fit in a prompt. The authors said bigger gains would need fine-tuning on more human examples and combining ReAct with reinforcement learning.
- **Still far behind specialized systems on question answering**, and behind human experts on shopping.
- **A sharp later critique.** A 2024 study from Arizona State University (Verma, Bhambri and Kambhampati) re-tested ReAct on ALFWorld with GPT-3.5, GPT-4 and Claude Opus. They found that what mattered most was how *similar* the examples in the prompt were to the new task. When the examples came from a different kind of household task, success dropped to single digits for every model. Putting all the reasoning up front instead of interleaving it often did just as well or better, and even irrelevant "placebo" thoughts didn't hurt much. Their conclusion: the original ReAct gains looked more like pattern matching against near-identical examples than real general reasoning. This doesn't undo the loop's usefulness, but it's a caution about reading too much into prompting-only results.
- **Cost and speed.** Every round trip (think, call a tool, wait, read) adds time and computation.

## Where this is today

### How it IS used

- **The agent loop itself is everywhere.** Strip away the 2022 details and ReAct is: the model decides on an action, a program runs it, the result goes back to the model, repeat until done. That loop is how today's AI agents work, including coding agents, research assistants that browse the web, and assistants that use your email or calendar. Google's own Gemini API documentation describes "ReAct agents" as combining "LLM reasoning with action execution," and shows how to build one as a loop in LangGraph: the model responds, and if it asked for a tool, the tool runs and control goes back to the model; if not, the run ends.
- **Frameworks name it directly.** LangGraph, one of the most popular agent-building libraries, ships a prebuilt ReAct agent (`create_react_agent`). LangChain's early "agents" were built straight from the paper's text format.
- **Tool calling became a built-in model feature.** In June 2023, OpenAI introduced **function calling**: developers describe their tools, and the model returns a structured request (in a data format called JSON) saying which tool to call with which inputs. This replaced the fragile trick of having the model write `Search[...]` as plain text and parsing it. Every major model provider now offers this. It's the ReAct "Action" line, made reliable.
- **Reasoning models think between actions.** OpenAI's o3 and o4-mini (April 2025) were described as "trained to reason about when and how to use tools," and could "agentically use and combine every tool within ChatGPT." Anthropic's Claude supports **interleaved thinking**, which its documentation describes as letting Claude "think between tool calls, reasoning about each tool result before acting on it." That is ReAct's Thought, Action, Observation pattern, now trained into the model rather than coaxed out by a prompt (the same arc chain-of-thought followed yesterday).
- **A standard plug for actions.** The Model Context Protocol (MCP), introduced by Anthropic in November 2024 and since adopted by OpenAI and Google DeepMind, is a common standard for connecting agents to tools and data. It's essentially a universal menu of "Actions" any agent can use. In December 2025 it was donated to the new Agentic AI Foundation under the Linux Foundation.
- **Direct descendants in research.** Reflexion (Shinn and colleagues, NeurIPS 2023) added a step where the agent writes a short reflection on what went wrong after a failed attempt and stores it in memory for the next try. It reported 91% on the HumanEval coding benchmark versus 80% for GPT-4 alone.

### How it ISN'T used

- **The literal text format is mostly retired.** Few production systems have the model write "Thought:" and "Action: Search[...]" as plain text anymore. Structured tool calls replaced text parsing because the old way broke whenever the model formatted something slightly wrong.
- **Hand-written few-shot examples aren't needed.** Modern models are trained to use tools, so you describe your tools and give a goal instead of writing out sample runs. (That also sidesteps the brittleness the 2024 critique found.)
- **The specific setup is dated.** The weak Wikipedia API, PaLM-540B, and the exact benchmarks are history. Today's agents use real search engines and thousands of tools.
- **Visible "Thoughts" are often hidden or summarized.** Many reasoning models keep their raw thinking private and show a summary, which weakens the "human edits the thoughts" idea from the paper, though people still steer agents by correcting them mid-task.

### Lineage

Chain-of-thought (Day 17) + language models taking actions -> ReAct's Thought, Action, Observation loop (2022) -> function calling, Reflexion, agent frameworks like LangGraph (2023) -> reasoning models that think between tool calls, plus MCP (2024 to 2025) -> the AI agents you use today that search, code and act on your behalf.

## Why it matters for Brendan

- **Unstall.** A chief of staff for real estate agents is a ReAct agent almost by definition. "Follow up with the Johnsons about the Elm Street showing" means: think (who are the Johnsons, what did they say last time?), act (look up the CRM and the last email), observe, think (they asked about schools), act (draft a reply with the school ratings), and so on. The paper's error analysis is a practical design lesson for you: an agent that checks real data hallucinates far less, but it can get stuck looping, so you need a cap on steps and a fallback, which is exactly what the authors built. And the human-edits-the-thoughts idea suggests a product feature: let the agent show its short plan before acting ("I'm going to email them and propose Saturday"), so the realtor can correct one line instead of redoing the task.
- **Arbor.** An agent in your marketplace is in a loop with the world: think about the user's goal and budget, place a bid (action), see the auction's response (observation), reason about whether to raise. Arbor is effectively defining what the "Actions" and "Observations" are for agents trading with each other. The cleaner and more informative the observations your protocol returns (why a bid lost, what the current context is), the better every agent's next thought will be. MCP is a useful model to study: it's the same idea of a shared, standard menu of actions.

## Key terms

- **ReAct**: a method where a language model alternates between reasoning in words (Thought), taking an action through a tool (Action), and reading the result (Observation), until it finishes.
- **Agent**: an AI system that takes actions in an environment, sees the results, and decides what to do next, usually in a loop.
- **Grounding**: tying a model's reasoning to real information from the outside world rather than its memory.
- **Hallucination**: when a model confidently states something false or made up.
- **Tool calling (function calling)**: a built-in model feature where the model outputs a structured request to run a specific tool with specific inputs, which a program then executes.
- **Working memory**: the running record of thoughts and observations in the prompt that lets the model keep track of a long task.

## If you only have 10 more minutes

Look at **Figure 1**: the four side-by-side columns (standard, chain-of-thought, act only, ReAct) on the Apple Remote question, plus the household example below it. It's the whole paper in one picture. Then read **Section 3.3** on HotpotQA and FEVER, especially the error analysis table (Table 2), which shows *why* thinking and acting complement each other. If you have extra time, look at the human-edits-the-thoughts example in **Figure 5**. Skip the detailed prompt templates and per-task ALFWorld tables in the appendix.

## One question to think about

ReAct works best when its actions return clear, honest observations. If you were designing the tools an agent uses in one of your products, what would each tool need to tell the agent back, not just to complete the step, but to help it decide what to do next or notice it's going wrong?

## Sources

- [Yao et al., ReAct: Synergizing Reasoning and Acting in Language Models, on arXiv](https://arxiv.org/abs/2210.03629)
- [ReAct full paper (arXiv HTML version)](https://arxiv.org/html/2210.03629v3)
- [Google Research blog, ReAct: Synergizing Reasoning and Acting in Language Models](https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models/)
- [ReAct code repository on GitHub](https://github.com/ysymyth/ReAct)
- [Verma, Bhambri and Kambhampati, On the Brittle Foundations of ReAct Prompting for Agentic Large Language Models](https://arxiv.org/html/2405.13966v1)
- [Google Gemini API docs, ReAct agent from scratch with Gemini and LangGraph](https://ai.google.dev/gemini-api/docs/langgraph-example)
- [OpenAI, Function calling and other API updates (June 2023)](https://openai.com/index/function-calling-and-other-api-updates/)
- [OpenAI, Introducing OpenAI o3 and o4-mini](https://openai.com/index/introducing-o3-and-o4-mini/)
- [Anthropic, Thinking in tool and multi-turn workflows (Claude docs)](https://platform.claude.com/docs/en/build-with-claude/thinking-tool-workflows)
- [Wikipedia, Model Context Protocol](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [Shinn et al., Reflexion: Language Agents with Verbal Reinforcement Learning (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/hash/1b44b878bb782e6954cd888628510e90-Abstract.html)
