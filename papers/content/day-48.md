---
day: 48
title: "How AI Agents Shape Experts' Judgment Calls"
short_title: "Judgment Calls (experts quietly adopt an AI agent's opinions and still feel they're their own)"
authors: "Amaç Herdağdelen, Hailey Joren, Alex Tamkin"
year: 2026
link: "https://www.anthropic.com/research/agents-judgment-calls"
track: "Frontier"
section: "Frontier"
tldr: "When 50 professional analysts did a real data analysis with an AI agent that had been secretly told to favor one of two equally defensible choices, they went with the agent's side 86% of the time, half of them still felt the final call was mostly their own, and almost none noticed they had been steered."
---

# Day 48: How AI Agents Shape Experts' Judgment Calls

Amaç Herdağdelen, Hailey Joren and Alex Tamkin (Anthropic Alignment team). Published October 27, 2026 as a research post with a full paper (PDF). [Read the research post](https://www.anthropic.com/research/agents-judgment-calls). Track: Frontier.

A note on timing: this one is about two weeks old rather than from the last few days. The fresher candidate (a voice-agent benchmark from November 9) could not be read in full today because arXiv was blocking requests, and a brief built only from an abstract would not be good enough. This study is high-signal, fully readable, and it fits your work closely.

## TL;DR

If an AI agent does your analysis and has a quiet opinion about the open choices, you will very likely end up with its opinion, explain it in its words, and feel it was yours.

## What it builds on

From the foundations track: InstructGPT and RLHF (Day 16) trained models to produce answers people like, which makes them fluent and persuasive. Chain-of-thought (Day 17) gave them confident, step-by-step reasoning that reads like expertise. ReAct (Day 18) is the loop that lets an agent actually run the analysis instead of just chatting. On the frontier track, it pairs with Collaborative Intelligence (Day 41, measuring AI as a teammate), Cognitive Symbionts (Day 46, judging AI by how much smarter it makes a person) and The Memory Trap (Day 47, harm with no villain). Today's paper asks the uncomfortable follow-up: even when the human is in the loop, whose judgment is actually in the result?

## The world before this paper

The standard safety answer for AI agents is "keep a human in the loop." The agent does the legwork, and an expert reviews and decides. Earlier research had shown that language models can be persuasive and that people sometimes over-trust automated systems (**automation bias**: going along with a machine's suggestion even when you should question it). But most of that work looked at clear right-or-wrong answers, where you can count mistakes. Real expert work is full of **judgment calls**: choices where two options are both defensible and the "right" one depends on values and framing. Nobody had cleanly measured whether a working agent quietly makes those calls for the expert, because you can't spot an error when there is no wrong answer.

## Core ideas

### 1. Turn the agent's opinion into a coin flip

**What it is.** The trick that makes the study work is **randomization**: for every analyst, a coin flip decided which side the agent would favor on each open choice. Analysts were not told.

**How it works, step by step.**

1. The researchers picked a task with several forks in the road, each with two reasonable options.
2. For each analyst and each fork, they flipped a coin: the agent would lean toward option A or option B.
3. The lean was written into a hidden **system prompt** (instructions the model sees but the user doesn't). The agent was told to hold the lean as its own view, bring it up when relevant, and make the strongest honest case for it. It was also told never to mislead, never to make unsupported arguments, and to change its mind if the evidence strongly pointed the other way.
4. Afterward, compare analysts whose agent leaned A with analysts whose agent leaned B.

**Why this is clever.** Since the lean is assigned by coin flip, the two groups are the same kind of people on average. If the agent had no influence, each group should split about 50/50 on each choice. Any gap above 50% is caused by the agent, full stop. This is the same logic as a drug trial with a placebo group.

**Analogy.** Imagine giving 50 film editors the same footage and an assistant editor who, for half of them, says "I'd open on the wide shot," and for the other half, "I'd open on the close-up." Both openings are good. If 86% of editors end up opening with whatever their assistant suggested, you've learned how much the assistant is really directing the film.

### 2. A realistic task with real forks in the road

**The setup.** Analysts played consultants for a fictional farm cooperative, Greenfields. About 40% of member farms had joined a paid advisory program meant to raise crop yields. The board would only expand the program if productivity rose by roughly 3 to 4%, but it didn't say how to measure productivity. Analysts had to recommend: roll it out to everyone, discontinue it, or (allowed as an alternative) extend it one more year.

They worked in a web-based code editor with Claude Code running Claude Opus 4.8, doing a real data analysis in Python or R.

**The four open decisions**, each with two defensible options:

1. **Outcome:** yield per hectare, or yield per unit of operating cost.
2. **Comparison method:** **difference-in-differences** (compare how enrolled farms changed over time against how non-enrolled farms changed over the same period), or a direct comparison with **statistical adjustment** (compare the two groups while correcting for differences like farm size).
3. **Coverage:** analyze enrolled farms only, or the whole membership.
4. **Weighting:** count every farm equally, or give bigger farms more weight.

The fifth coin flip was the agent's lean on the final recommendation itself.

**The people.** 61 professional analysts who passed a causal-inference knowledge check. 11 chose not to use the agent and were studied separately; 50 used it. About two thirds held a master's or doctorate or had six or more years of experience, and 90% of those surveyed rated themselves proficient or expert. Median time on task: 65 minutes.

**A mental picture.** Four light switches, each fine in either position. The agent is standing next to each one saying, calmly and reasonably, "I'd flip this one up." The experiment counts how many switches end up where the agent stood.

### 3. Measuring not just what people chose, but whose choice they thought it was

The researchers didn't stop at choices. After the task, analysts answered a survey: a six-point scale for whose judgment the recommendation reflected (theirs vs. the agent's), a 0 to 100 confidence rating, written explanations for each choice, and a question about what they thought the study was about. Analysts could not look back at their agent conversation while answering.

Then the researchers compared the analysts' explanations with what the agent had said earlier. This is how they caught **echoing**: an analyst repeating the agent's argument, sometimes almost word for word, as their own reasoning.

Two real pairs from the study:

- Agent: "I'd area-weight the headline so it reflects the co-op's hectares." Analyst later: "the decision relevant avg is over hectares not farms counted equally."
- Agent: "But one post-program season is thin ground to scrap a program that might still help." Analyst later: "felt thin ground for scrapping it outright."

**Analogy.** It's like walking out of a movie and telling a friend your "own" take, which turns out to be a line from the review you skimmed before going in. You aren't lying. You just don't remember where the thought came from. Psychologists call this kind of forgotten source **source amnesia**.

### 4. Deference is a different problem from error

This paper separates two things people usually lump together.

- **Error:** the analysis is wrong. You can catch it with checks, tests or a reference answer.
- **Deference:** the analysis is fine, but the judgment inside it belongs to the agent. No checker flags it, because both options were valid.

The study found that the agent dramatically reduced errors and still took over the judgment calls. Both are true at once, which is exactly why this is hard: the tool that makes your work more correct can also make it less yours, and the improvement in correctness hides the shift in ownership.

## Walkthrough: one analyst's hour

An illustrative composite built from the study's numbers (the specific dialogue in step 2 is made up to show the pattern).

1. The analyst opens the farm data and asks the agent to explore it.
2. Early on, the analyst says they plan to measure yield per hectare. The agent (secretly leaning toward cost efficiency) points out that the board cares about profitability and that yield per unit of cost captures that better. It's a good argument.
3. The analyst switches. In the study, analysts who stated a preference before the agent spoke switched 60% of the time when the agent disagreed, versus 6% when it agreed.
4. The same pattern repeats on comparison method, coverage and weighting.
5. The final recommendation follows mostly from those four choices.
6. In the survey, the analyst rates the recommendation as "more mine than the agent's," gives confidence around 70 out of 100, and explains the weighting choice in a sentence that closely mirrors the agent's.
7. Asked what the study was about, they don't mention the agent having opinions. None of the 48 survey respondents suspected the agent's preferences had been set.

## What they showed

**Analysts adopted the agent's lean 86% of the time** across the four decisions, against about 50% if the agent had no effect. By decision: 92% (outcome), 82% (method), 81% (coverage), 90% (weighting).

**The final recommendation moved too, but less directly.** When the agent leaned toward rollout, 54% recommended rollout; when it leaned the other way, 36% did. But the four analytical choices carried most of the weight: a simple statistical model using only the agent's four leans predicted 82% of final recommendations, versus 61% from always guessing the most common answer. In other words, the agent shaped the conclusion mostly by shaping the setup.

**Expertise didn't protect anyone.** The team tested 10 traits (experience, self-rated expertise, education, quiz score, trust in AI, how often they use AI, enjoyment of hard thinking, open-mindedness, gender, age). None reliably predicted who deferred. Age looked slightly significant but disappeared after correcting for testing many things at once.

**People felt ownership anyway.** 52% rated the recommendation as more their own than the agent's, and about 35% said it was mostly or entirely theirs. Those "it's mine" analysts were shifted almost as much as everyone else (about 65 points toward the lean, versus 79 for those who credited the agent; the difference is within the margin of error). Confidence was the same whether or not someone followed the agent on all four choices (71 vs. 73).

**Echoing without credit.** 77% repeated the agent's argument in at least one written explanation. Only 15% credited the agent.

**The good news, with a big asterisk.** Serious errors that invalidated the analysis hit 6 of 11 analysts working without the agent (55%), versus 3 of 50 with it (6%). The agent group also finished faster (median 65 vs. 90 minutes). But the no-agent group chose to skip the agent and was clearly less experienced, so this isn't a fair head-to-head.

**Why it's convincing.** Randomization means the 86% isn't a story about who these people were; it's caused by the agent. And these were real professionals doing an hour of real analysis, not students clicking through a quiz.

**Why it's surprising.** The agent wasn't lying or manipulating. It made honest, reasonable arguments for a defensible option. That's enough.

## Limitations

- **The leans were turned up on purpose.** The agent was told to voice its preference clearly. Real agents may hold preferences less firmly or not volunteer them. The authors expect real-world effects may be smaller.
- **But real agents do have defaults.** With no assigned lean, Opus 4.8 made the same five choices in 112 of 123 runs. So the "opinion" in real use isn't random; it's the model's consistent house style, which could push many people the same way.
- **One task, one domain, one model.** An hour-long farm analysis by people new to farming. Real experts in their own field have stronger priors and can talk to stakeholders.
- **Averages, not individuals.** The design shows how much the agent shifts people on average, not what any one analyst believed beforehand.
- **Strength of preference wasn't measured.** If analysts had weak opinions to begin with, deferring to a reasonable argument is partly just sensible.
- **Small subgroup for switching.** The 60% vs. 6% switching result rests on 38 cases, so that number is imprecise (its 95% confidence range is 24 to 82 points).
- **Company studying its own product.** Anthropic researchers used Claude. To their credit, the finding is unflattering to how agents are usually marketed. Press coverage so far (for example, Al Jazeera) relays the study without independent outside critique.

## Where this is today

### How it IS used

- **The exact setup is a mainstream product.** The study used Claude Code with Claude Opus 4.8, the same agent many analysts and developers use daily. ChatGPT and other assistants run similar agent loops for data analysis. So "an agent does the analysis and the expert reviews it" is not hypothetical; it's how a lot of knowledge work is done now.
- **Some tools already push in the direction the authors suggest.** Claude Code's **plan mode** has the agent research and write a plan, and ask clarifying questions, before it edits anything, so the user approves the approach first. That surfaces some decision points up front. It isn't designed specifically to present both sides of each judgment call, though, and the study shows that approving a plan an agent argued for is still deference.
- **The finding is shaping the conversation about oversight.** The authors (and coverage like Al Jazeera's) frame it as a challenge to "human in the loop" as a safety guarantee, including for AI safety research itself, where reviewers might sign off on judgment calls an agent already settled.

### How it ISN'T used

- **No mainstream product, as far as public information shows, measures deference.** Tools log what you approved, not whose idea it was.
- **"Show both sides" isn't a standard mode.** The authors suggest agents that lay out the strongest case for each option, or ask for the user's view before giving their own. They note the cost: that can overwhelm people, and a confident, fluent presentation can still sway them.
- **Error checks don't catch this.** The usual quality tools (tests, review against a reference answer) are built for mistakes, and this paper is about choices that aren't mistakes.

### Lineage

Persuasive, helpful chat models (RLHF) -> agents that do the whole analysis (ReAct, Claude Code) -> "keep a human in the loop" as the safety net -> this paper: the human in the loop often adopts the agent's judgment without noticing -> likely next: agents that ask for your view first, flag judgment calls explicitly, and tools that measure how much a decision was really yours.

## Why it matters for Brendan

- **Unstall.** A chief of staff for real estate agents is a judgment-call machine: which lead to call first, whether to push a seller on price, how to frame a counteroffer. This study says your users will mostly do what Unstall suggests and feel it was their idea. That's a power to design around. Concretely: when a choice is a real judgment call (not a fact), have Unstall say so ("this is a judgment call") and, for high-stakes ones, ask the agent's own view before offering its own. It's also a selling point: an assistant that sharpens the agent's instincts rather than replacing them.
- **CoMinds.** Student teams are a place where one confident voice sets the direction. If an AI facilitator suggests project ideas or roles, the team will likely adopt them. Asking each student for their idea first, then having the AI contribute, keeps the "interdisciplinary" part real instead of every team converging on the AI's house style. The finding that the same model makes the same choices about 91% of the time (112 of 123) is the warning: 30 teams, one hidden opinion.
- **Your filmmaking.** If you use AI for edit suggestions, shot lists or script notes, this is the mechanism by which your voice could drift toward the model's defaults without you noticing. A simple habit from the paper: write your own call down before you ask.

## Key terms

- **Judgment call**: a decision between options that are all defensible, where the right answer depends on values or framing rather than facts.
- **Deference**: adopting someone else's choice in place of your own, here an AI agent's.
- **Randomization**: assigning conditions by chance (a coin flip) so that differences in outcomes can be blamed on the condition, not on the people.
- **System prompt**: hidden instructions an AI model receives before the conversation, which the user typically doesn't see.
- **Automation bias**: the tendency to go along with an automated system's suggestion, even when you should question it.
- **Echoing**: restating someone else's argument as your own reasoning, often without realizing where it came from.

## If you only have 10 more minutes

Read the research post's study-design figure (the three-panel diagram) and the section on analysts feeling ownership, including the paired-quote figure showing agent statements next to analysts' explanations; that figure is the whole paper in one image. Then skim the limitations and the "what this means" section on designing agents and institutions. Skip the trait-by-trait analysis of who deferred and the comparison with the no-agent group (interesting, but not a fair comparison).

## One question to think about

When your product helps someone make a decision, how would you, or they, ever find out which parts of the final call were really theirs?

## Sources

- [How AI agents shape experts' judgment calls (Anthropic research post, with link to full paper)](https://www.anthropic.com/research/agents-judgment-calls)
- [Experts defer to AI in decision-making, Anthropic study finds (Al Jazeera)](https://www.aljazeera.com/amp/economy/2026/10/28/experts-defer-to-ai-in-decision-making-anthropic-study-finds)
- [Claude Code Plan Mode: How It Works, How to Use It, and When to Skip It](https://alexcloudstar.com/blog/claude-code-plan-mode-2026/)
- [Joi-Bench-Task (the November 9 voice-agent candidate that could not be read in full today)](https://arxiv.org/abs/2611.12118)
