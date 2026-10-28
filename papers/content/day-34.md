---
day: 34
title: "DynaFlow: Learning Free-Form Multi-Agent Orchestration"
short_title: "DynaFlow (an AI manager that writes its own team plan, or skips the team)"
authors: "Ruhao Liu, Qi Li, Shizun Wang, Xinchao Wang (xML Lab, National University of Singapore)"
year: 2026
link: "https://arxiv.org/abs/2610.34467"
track: "Frontier"
section: "Frontier"
tldr: "DynaFlow trains a single \"manager\" AI to write a small program, fresh for each problem, that assigns work to a team of helper AIs and passes their results between them, and, just as important, to recognize when a problem is easy enough to answer alone."
---

# Day 34: DynaFlow: Learning Free-Form Multi-Agent Orchestration

Ruhao Liu, Qi Li, Shizun Wang and Xinchao Wang. xML Lab, National University of Singapore. Posted to arXiv on October 25, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.34467). Track: Frontier.

A note on why this paper: it was the fourth most upvoted paper on Hugging Face Daily Papers for October 27 (183 upvotes), and it is about the question at the center of Arbor and of nearly every agent product right now: when should one AI hand work to other AIs, and how? A note on accuracy: arXiv's full-text HTML page blocked my reader today, so this brief is built from the paper's abstract, a detailed paper summary on HyperAI, the official code repository, and a careful news analysis that read the full paper. Numbers below come from those sources; where they disagree or are unclear, I say so.

## TL;DR

Instead of giving a team of AI agents a fixed org chart, DynaFlow teaches the "boss" agent to write a custom team plan as code for each problem, read what the team sends back, and revise, and the trained boss ends up both more accurate and better at deciding when no team is needed at all.

## What it builds on

The Transformer (Day 9) and GPT-3 (Day 11) are the foundation of every model involved. InstructGPT (Day 16) introduced training a model on examples of good behavior, which is exactly how DynaFlow trains its manager. Chain-of-Thought (Day 17) is the "think before you act" step the manager does before writing its plan. ReAct (Day 18) is the direct ancestor: an agent that alternates thinking, acting, and observing results. Among frontier days, it connects to Day 29 (herding in AI agent crowds, which showed how agents copying each other goes wrong), Day 30 (VISAGENT's marketplace of voice agents), Day 31 (AW-0, which also writes its plan as code), and Day 32 (FilmFlow's AI crew with planner and reviewer roles).

## The world before this paper

A **multi-agent system** is a setup where several AI agents, often copies of the same model given different instructions, work together on one task: one researches, one checks, one writes. These systems can beat a single agent, but almost all of them use a **predefined collaboration structure**: a human designer decides in advance who talks to whom, in what order (for example, "solver, then critic, then reviser"). Some research systems search automatically for a good structure, but they usually find one structure per *type* of task and reuse it. Real problems vary. An easy question gets the full five-agent pipeline anyway and wastes money; a weird question gets a structure that does not fit. And when people tried simply giving a model the freedom to build its own team on the fly, it often did worse than just answering by itself. The missing piece was a manager that had actually *learned* how to orchestrate.

## Core ideas

### 1. The team plan is a small program, written fresh for each problem

**What it is.** DynaFlow has one **main agent** (the manager) and a pool of **sub-agents** (helpers). The manager has three kinds of moves it can make at each turn:

- call an ordinary **tool** (like a web search),
- give a **final answer**,
- or launch a **workflow**: write a short program in JavaScript that describes a team and run it.

A **workflow** here means a plan for a team: which helper roles exist ("independent solver," "verifier," "fact finder"), what each one is told, what order they run in, and which helper's output gets fed to which other helper.

**How it works, step by step.**

1. The manager reads the problem and thinks about it.
2. It writes the workflow program. Helpers that do not depend on each other run **in parallel** (at the same time); helpers that need someone else's result wait and receive it.
3. A runtime executes the program under a **budget**, a cap on how much work the team can do.
4. The manager gets back an **execution trace**: the program's output plus a record of every helper call, whether it succeeded, and what it said.
5. The manager looks at that and decides: answer now, call a tool, or write a *follow-up* workflow to fix gaps.

One rule matters a lot: once a workflow starts, the manager's job is coordinating, checking, and organizing. The real problem-solving belongs to the helpers.

**Why code instead of a fixed diagram?** Code is "free-form": it can express any shape of team, including loops ("keep verifying until two solvers agree"), branches, and parallel fan-outs. A fixed menu of structures cannot.

**Analogy.** A film producer who, for every new project, writes a fresh call sheet: who is on set, which department waits on which, which footage goes to which editor. A music video gets a crew of three; a feature gets a full unit. Then the producer reads the dailies and schedules reshoots where needed.

### 2. Train only the manager, by copying good managers and then only the best of them

**What it is.** The helpers are **frozen**, meaning they are never changed. Only the manager is trained. This cleanly separates two skills: being good at the work (the helpers) and being good at organizing work (the manager). Any gain therefore comes from better orchestration, not from smarter helpers.

**How it works, in two stages.** Both stages use **supervised fine-tuning (SFT)**: taking an already trained model and training it further on examples of the behavior you want, so it learns to imitate them.

1. **Stage 1: distillation.** **Distillation** means using a bigger, stronger "teacher" model to produce examples that a smaller "student" learns from. A strong teacher (reported as GLM 5.3 Max) solved many problems by writing workflows. The authors kept only runs that got the right final answer *and* properly delegated work, about 2,031 examples. The student manager (Qwen3.5-27B, a 27-billion-parameter open model) trained on these.

2. **Stage 2: keep only clean teamwork.** Getting the right answer does not mean the teamwork was good; sometimes the teacher got lucky. So an AI judge filtered the Stage 1 examples for three kinds of bad management, leaving about 712:
   - **Premise injection:** the manager tells helpers something unverified as if it were a fact ("the answer is probably 42, confirm it").
   - **Verification defects:** the manager steers the checker toward an expected answer instead of letting it check independently.
   - **Information-flow defects:** context gets lost between steps, a helper cites the wrong upstream result, or the manager hardcodes a guess instead of using what a helper actually produced.

   Training then continued from Stage 1 on this smaller, cleaner set with a gentler learning rate.

**Analogy.** Training an assistant director. First, they shadow a veteran AD on 2,000 shoots that came in on time. Then you pull out the 700 shoots where the veteran also ran the set *well*: no leading the script supervisor, no notes lost between departments, and the trainee studies just those.

**A worked picture of a bad versus good handoff.** Bad: "Solver A, find the answer. Checker, confirm that the answer is 17." The checker is biased before it starts, and if A said 19, the manager ignored it. Good: "Solvers A and B, each solve independently. Checker, here are both full solutions; find any error and say which, if either, is right." The second version is what Stage 2 rewards.

### 3. Learning *whether* to delegate, not just how

**What it is.** DynaFlow runs in three modes:

- **Direct:** the manager answers alone, no tools.
- **Forced:** the manager must use a workflow every time.
- **Dynamic:** the manager decides for itself.

**Why it matters.** The surprising baseline finding: an *untrained* model given the choice (dynamic mode) did *worse* (about 65 percent) than the same model just answering directly (about 72 percent). Handing a model a team does not mean it knows when to use one; it over-delegates or delegates badly. After training, dynamic mode answered about 47 percent of questions directly, with no team at all, and still scored within 0.14 points of forced mode, while using roughly 41 percent fewer helper calls.

**Analogy.** A good manager does not call a meeting for every email. Knowing which tasks to just handle yourself is half the job.

### Walkthrough: one hard science question

This is an illustrative example built from the paper's described process; the specific question and dialogue are made up.

1. **Question:** a tricky multiple-choice chemistry question.
2. **Manager thinks:** "This has a subtle trap. I want independent attempts and an unbiased check."
3. **Manager writes a workflow:** three solver helpers run in parallel, each told to solve from scratch and show work. A fourth helper, the verifier, waits for all three and receives their full reasoning, not just their letters.
4. **Runtime executes it.** Two solvers say B, one says D.
5. **Trace comes back:** the verifier says solver 3's reasoning in step 2 used the wrong formula; B is correct.
6. **Manager decides:** the disagreement was explained by a specific error, so it answers B. If the verifier had been unsure, the manager could have written a second, smaller workflow aimed at that one step.

For an easy question ("what is 15 percent of 80?"), the trained manager in dynamic mode just answers 12. No team.

## What they showed

**The tests.** Six benchmarks, about 688 questions: three years of the AIME high school math competition (30 problems each), PolyMATH (multilingual math), GPQA-Diamond (graduate-level science questions written to be hard to look up), and HotpotQA (questions that require combining facts from multiple web pages).

**Headline numbers** (all with the same Qwen3.5-27B model as the base):

| Setup | Overall accuracy |
| --- | --- |
| Base model, answering directly | about 71.5% |
| Base model, given the dynamic choice | about 65.1% |
| Base model, forced to use workflows | 75.87% |
| Strongest outside baseline method | about 77.2% |
| DynaFlow, dynamic mode | 87.94% |
| DynaFlow, forced mode | 88.08% |

So training the manager added about 12 points over the untrained manager in forced mode, and DynaFlow beat the best competing method by 10.9 points. It got all 90 AIME problems right in forced mode. On HotpotQA it beat a search-enabled base model by 6 to 7 points (84.5 versus 77.5 percent in dynamic mode).

**Where it lost.** On GPQA-Diamond (84.85 percent), it improved on its own base model but trailed two older methods: **Self-Refine** (one model critiques and rewrites its own answer) and **AFlow** (automatic search for a fixed workflow). The authors trace remaining science failures to verification and final-answer selection.

**Better teamwork, measured.** The authors analyzed the generated programs and found that after each training stage, more of them explicitly passed upstream results to later steps, verified them, and refined them. Their main conclusion is that **cross-stage information flow** (making sure what one helper learned actually reaches the next) is a key, underrated part of orchestration.

**Why it is convincing.** Same model, same helpers, same tools; the only thing that changed was the manager's training. That isolates orchestration skill well.

## Limitations

- **Narrow tasks.** Math, science questions, and multi-hop lookup all have one checkable right answer. Open-ended work (writing, design, negotiation, long software projects) is untested.
- **Small test sets.** A perfect score on 90 AIME problems is impressive but small; it does not guarantee new problems.
- **Cost is not fully measured.** "41 percent fewer helpers" is not "41 percent cheaper." Fewer calls can come with longer reasoning per call, and speed depends on how much runs in parallel. Real token costs and latency were not the focus.
- **The Stage 2 filter is not isolated.** The news analysis notes there was no control comparing the filtered 712 examples against 712 random ones, so we do not know how much the filter itself helped versus simply training longer.
- **Running AI-written code has risks.** Executing generated programs needs a sandbox; correct-looking code can still have side effects.
- **Trained weights not confirmed public.** The code repository (MIT license) runs the three modes against any compatible model API, but plugging in a different model will not reproduce the paper's numbers, and the repo's "success" check only means answers came back in the right format, not that they were correct.
- **All helpers are the same model.** It does not test mixing specialists from different providers, which is what a real marketplace would look like.

## Where this is today

### How it IS used

- **Orchestrator-worker is the dominant production pattern.** Anthropic's Research feature uses a lead agent that plans, spawns parallel subagents to search, and synthesizes their findings. Anthropic reported that this beat a single agent by 90.2 percent on its internal research evaluation, but used about 15 times the tokens of a normal chat, and warned it is a poor fit when agents must share all context or have many dependencies. DynaFlow is essentially a way to *train* that lead agent rather than prompt it.
- **Coding agents use narrow versions.** Cognition (makers of Devin) wrote in April 2026 that what works is "map-reduce-and-manage": a manager Devin splitting work among child Devins, a separate reviewer agent with a clean context, and a cheap model escalating hard problems to a smarter one, while keeping a single agent responsible for actually writing changes. That matches DynaFlow's rule that the manager coordinates and verifies.
- **Frameworks let developers hand-build the structure.** OpenAI's Agents SDK (handoffs between agents), LangGraph (agents as nodes in a graph), CrewAI (role-based crews), Microsoft's AutoGen/AG2 (group chats), Google's ADK (agent trees), and Anthropic's Claude Agent SDK (agents calling other agents as tools) are the common tools. In all of them, a human mostly designs the team in advance, which is the "predefined structure" DynaFlow argues against.
- **Learned orchestrators are a live research race.** Sakana AI's Conductor (April 2026, ICLR 2026) is a small 7B model trained with reinforcement learning to route work across frontier models like GPT-5, Gemini, and Claude, writing natural-language workflows; it also learned to use one model call for easy questions. DynaFlow's twist is writing the workflow as executable code and training with filtered imitation instead.

### How it ISN'T used (or not yet)

- **Fixed, hand-designed pipelines for every query** are what DynaFlow and Conductor both show to be wasteful: easy questions do not need a team.
- **Unstructured swarms** of agents all editing the same thing in parallel have largely not worked in production; Cognition calls them "mostly a distraction." Day 29's herding paper showed one reason why.
- **DynaFlow itself** is not in any product I could find. It is a week-old research result with 7 stars on GitHub as of this writing.

### Lineage

ReAct (one agent: think, act, observe) -> hand-designed multi-agent pipelines and frameworks (AutoGen, CrewAI, LangGraph) -> automatic workflow search (AFlow) -> learned orchestrators that write a custom team per problem and skip it when unneeded (Conductor, DynaFlow) -> what you will likely see next: assistants that quietly decide, on every request, whether to spin up helpers at all.

## Why it matters for Brendan

**Arbor.** This is the clearest research signal yet on Arbor's core question from the buyer's side. An orchestrator deciding which helper gets which subtask is a market without prices. DynaFlow's findings translate directly: (1) the "whether to delegate" decision is learnable and saves about 40 percent of calls, so Arbor buyers will often choose *not* to post a job, and the protocol should make "do it yourself" a cheap, normal outcome; (2) the biggest failure modes are informational: buyers leaking their guess to the verifier, and context lost between handoffs. A protocol that standardizes what context travels with a task, and keeps verifiers independent of the buyer's prior, is addressing exactly what this paper says matters most. The gap: DynaFlow's helpers are identical and free; Arbor's are heterogeneous and priced, which is the interesting unsolved version.

**Unstall.** A chief of staff is an orchestrator. Most agent requests ("what time is the Henderson showing?") should be answered directly; a few ("prep me for tomorrow's listing appointment") deserve a mini-team: pull comps, check the calendar, draft talking points, verify facts. The paper's three bad-management patterns are a ready-made checklist for reviewing Unstall's internal handoffs.
## Key terms

- **Multi-agent system**: several AI agents, often the same model with different instructions, working together on one task.
- **Orchestrator (main agent)**: the agent that decides how work is split among helpers and combines their results.
- **Workflow**: a plan for a team of agents: roles, order, and which results go where. In DynaFlow, written as a small JavaScript program.
- **Distillation**: training a smaller "student" model on examples produced by a stronger "teacher" model.
- **Supervised fine-tuning (SFT)**: further training an existing model on examples of desired behavior so it imitates them.
- **Cross-stage information flow**: making sure what one helper produces actually reaches, and is used and checked by, later helpers.

## If you only have 10 more minutes

Read the method section that defines the main agent's three actions and the workflow tool (it is short and is the whole design), then the Stage 2 description of the three defect types, which is the most transferable idea in the paper. Then look at the execution-mode analysis (Table 2: dynamic versus forced, and how often it answers directly). Skip the loss function and the per-benchmark baseline tables.

## One question to think about

DynaFlow's manager learned that almost half of problems need no team. If helpers in Arbor cost real money and the manager is rewarded for getting answers right cheaply, what stops it from under-delegating on hard problems to save cost, and how would a marketplace let a buyer know, before paying, that bringing in a helper is worth it?

## Sources

- [DynaFlow: Learning Free-Form Multi-Agent Orchestration (arXiv)](https://arxiv.org/abs/2610.34467)
- [DynaFlow on Hugging Face Papers](https://huggingface.co/papers/2610.34467)
- [Hugging Face Daily Papers, October 27, 2026](https://huggingface.co/papers/date/2026-10-27)
- [DynaFlow paper summary (HyperAI)](https://hyper.ai/en/papers/2610.34467)
- [DynaFlow official code repository (GitHub)](https://github.com/amiya-special/Dynaflow)
- [DynaFlow analysis (AI Post Hub, in Chinese)](https://www.aiposthub.com/dynaflow-learned-multi-agent-workflow-orchestration/)
- [How we built our multi-agent research system (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Multi-Agents: What's Actually Working (Cognition)](https://cognition.com/blog/multi-agents-working)
- [Don't Build Multi-Agents (Cognition)](https://cognition.com/blog/dont-build-multi-agents)
- [Best Multi-Agent Frameworks in 2026 (GuruSup)](https://gurusup.com/blog/best-multi-agent-frameworks-2026)
- [Learning to Orchestrate Agents in Natural Language with the Conductor (Sakana AI)](https://sakana.ai/learning-to-orchestrate/)
