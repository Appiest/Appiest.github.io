---
day: 49
title: "World In-Context Learning for Agentic Robot Manipulation"
short_title: "World In-Context Learning (a robot that learns a task by practicing in a simulator and writing notes, not retraining)"
authors: "Heng Fang, Zehui Guo, Yuehan Zhang, Mingyang Du, Dingkang Liang, Xiang Bai"
year: 2026
link: "https://arxiv.org/abs/2611.12885"
track: "Frontier"
section: "Frontier"
tldr: "A frozen AI model watches one demonstration of a robot task, practices it in a simulator, and writes what it learns into a readable 'Task Memory' document instead of retraining, and on 50 two-armed robot tasks this beat a trained robot policy that needed 50 demonstrations each, especially when the scenes looked different from practice."
---

# Day 49: World In-Context Learning for Agentic Robot Manipulation

Heng Fang, Zehui Guo, Yuehan Zhang, Mingyang Du, Dingkang Liang and Xiang Bai (Huazhong University of Science and Technology and ArcheOne AI). Posted to arXiv November 9 to 10, 2026, with code released as RoboScript. [Read the paper](https://arxiv.org/abs/2611.12885). Track: Frontier.

A note on sources: arXiv was rate limiting full-PDF reads today, so this brief is built from the abstract, the project's GitHub README, and two detailed paper summaries (linked at the bottom) that reproduce its method, tables and limitations. The numbers below come from those.

## TL;DR

Instead of teaching a robot by changing its brain (retraining), let a smart general AI practice in a simulator and keep a notebook; the notebook turns out to be as good as retraining and travels better to new places.

## What it builds on

From the foundations track: RT-2 (Day 21) put a vision-language model directly in charge of a robot's movements, with skills baked into the weights; this paper is a deliberate alternative. ReAct (Day 18) is the think, act, observe loop the agent runs. GPT-3 (Day 11) showed **in-context learning** (a model picking up a new task from examples in its prompt, without retraining), and chain-of-thought (Day 17) gives the agent its step-by-step plans. Deep RL (Day 6) is the older idea of learning by trial and error in a simulated world. On the frontier track it sits next to GPT-6-Astra as a robot brain (Day 27), AW-0 (Day 31, a robot that writes its plan as code), The Trinity (Day 35, agents that build their own practice worlds), uni-robot-agent (Day 44, letting any AI model drive a robot), and Cortex (Day 23, which moves context into weights, the opposite direction from today's paper).

## The world before this paper

There are two ways to get a robot to do a new task. The dominant one is a **trained policy**: you record dozens or hundreds of human demonstrations, then adjust a neural network's weights until it imitates them. Big **vision-language-action models (VLAs)** like RT-2 and Google's Gemini Robotics work this way. They're good at what they've seen but get worse when the scene changes (different lighting, clutter, table color), and every new task needs new data and new training. The other way is **in-context learning**: hand a big general AI model like GPT a demonstration and let it figure out the task in its prompt, no training at all. That's cheap and flexible, but it has lagged behind trained policies, because a demonstration recorded somewhere else tells the model nothing about what actually happens when it tries the task here. It never gets corrected, so small mistakes pile up.

## Core ideas

### 1. What a model learns "in context" is meaning, not pixels

**What it is.** The paper's starting observation: when a language model learns a task from its context, what it keeps is semantic (the steps, which object plays which role, rough geometry like "grip the handle, place it to the left of the bowl"), not what things looked like.

**Why that matters.** Trained policies learn partly from appearance, which is why they stumble when the scene looks different. If an AI's knowledge of a task is stored as words and relationships, then experience gathered in one world (a clean simulator) should still apply in another (a cluttered simulator, or the real world).

**Analogy.** A film crew that memorized "the actor's mark is two steps left of the door" can shoot on any set. A crew that memorized "the mark is on the third floorboard from the blue rug" is stuck the moment the set is redressed. In-context knowledge is the first kind.

**The evidence.** The strongest test is the randomized scenes (new backgrounds, lighting, distracting objects). RoboScript's agents kept 95% to 101% of their clean-scene success there. The best trained policy kept at most 65%.

### 2. World In-Context Learning: practice in a world, learn in the notes

**What it is.** **World In-Context Learning (WICL)** is the paper's name for its method. A **frozen** model (its weights never change) starts from one demonstration, rehearses the task in a "world" (here a physics simulator), and writes the feedback into its context instead of its weights.

**How it works, step by step.**

1. **Imitate.** A "reader" role watches one demonstration and writes a first draft of the notes. An "actor" role tries the task on that same scene. A "reviewer" role looks at failures and revises the notes.
2. **Rehearse.** The actor practices on new random setups of the task in the simulator. After each failure the reviewer proposes a fix to the notes. The fix is only kept if a retry on a fresh setup succeeds. Bad advice can't sneak in.
3. **Freeze.** The finished notes become the **Task Memory**, locked in place.
4. **Deploy.** On a brand new scene the agent maps the memory onto what it sees, checks what it can reach, and acts. If a move fails, it backs off to a safe pose and keeps going rather than starting over.

**Analogy.** A stand-in actor watches one take of a stunt, then rehearses it ten times on a practice set while a coordinator watches and marks up the script. On shoot day the stand-in doesn't need retraining; they bring the marked-up script. That's the whole idea: the learning lives in the script, not in the actor's muscles.

**Why it's different from earlier in-context robotics.** Earlier methods gave the model a demonstration and hoped. WICL gives it a world to fail in first. The ablations (below) show that rehearsal is what makes the demonstration useful.

### 3. The Task Memory: a readable, checked document

**What it is.** The memory is a structured, human-readable document with: the roles of objects, the workflow (step order), relative grasp and placement specs ("approach from above, place centered on the pad"), fitted parameters (like how far to open the gripper), and lessons from failures.

**The clever guardrail.** A **linter** (an automatic checker, like spellcheck for rules) rejects any memory entry that contains absolute coordinates ("move to x=0.31"), simulator-only facts, or IDs for specific object instances. That forces the notes to stay general. Without it, the agent could cheat by writing a scene-specific script that breaks the moment anything moves.

**Honest information boundaries.** The acting agent only sees what a real robot could sense: color and depth cameras, its own joint positions, tool feedback, and the instruction. The simulator's perfect knowledge (exact object positions) is only available to the reviewer during learning, and only reaches the actor through the checked memory. Success is judged by the benchmark's official check, never by the agent saying "done."

**A mental picture.** Imagine an entry for "stack two bowls": *Roles: the larger bowl is the base. Workflow: grasp the smaller bowl at the rim with one arm, lift above the base, lower until contact, release. Lesson: grasping at the center fails because the gripper hits the bottom; grasp at the rim.* (This example is illustrative; the paper describes the structure, not this exact text.)

### 4. Reflection: getting better without retraining

After deployment, a separate reflection agent reviews batches of past episodes (what the robot observed and whether it succeeded), spots patterns in failures, and writes a guidance document for the next batch. It's still all text; no weights change. Over three rounds across the 50 tasks this rescued 18, then 7, then 1 additional episode. Useful, but with quickly shrinking returns.

## Walkthrough: one task from demo to real robot

1. **Skills first.** Before any task, the system builds a toolkit of reusable skills: grasp, place, reachability checks. It splits a demonstration into basic actions, notices missing skills, and has a coding agent write and test new ones. It uses off-the-shelf tools for seeing (GroundingDINO and SAM 3, which find and outline objects named in text) and for moving (cuRobo, a motion planner that computes collision-free arm paths). Every action returns a "receipt": where the arm was told to go, where it actually went, how open the gripper is, and whether it's holding something.
2. **One demo.** The model sees a single clean demonstration of, say, stacking two bowls.
3. **Rehearsal in simulation.** It practices on new random setups, fails, revises the notes, keeps only fixes that work.
4. **Freeze the Task Memory.**
5. **Test in randomized scenes.** Different backgrounds, lighting, clutter. The memory still works because it describes roles and steps, not appearance.
6. **Move to a real robot.** Memories learned on a simulated two-armed robot (ALOHA) were moved to a physical two-armed PiPER robot with only a lightweight adapter (remapping parameters for the different arms), no new demonstrations and no new rehearsal.

## What they showed

**The benchmark.** **RoboTwin 2.0**: 50 two-armed tabletop tasks in simulation, in "clean" and "randomized" settings, 10 episodes per task per setting.

**Headline result.** With GPT-6.1-Sol as the brain and one demonstration per task: 83.6% clean, 83.2% randomized, 83.4% mean. The strongest trained policy they compare against (4D-WAM, trained on 50 demonstrations per task) scored 81.5% clean but only 41.8% randomized, 61.7% mean. So: roughly tied on familiar scenes, and about twice as good on unfamiliar ones, with one fiftieth of the demonstrations.

**It works with other models too.** DeepSeek-V4.1-Flash reached 78.1% and GPT-5.6-Luna 77.9%. Better base models do better, which suggests the method rides on general AI progress for free.

**Ablations** (removing pieces, on a 10-task subset):

- Full frozen memory: 78.5%.
- Notes written from the demo with no practice in the world: 69.0%. Practice matters.
- Practice without the demonstration: 56.5% (versus 86.0% for the matched version with the demo). The demo gives a workable plan, and the simulator tests and fixes it. Neither is enough alone.
- No recovery after failed moves: 69.0%. Recovering mid-task is one of the most important parts.
- Removing the simulator's privileged information from the reviewer: 86.5% vs. 86.0%, no real difference. The gains don't come from "cheating" with perfect knowledge.

**Real robot.** Click a bell: 10/10. Grab a roller: 7/10. Move a playing card away: 7/10. Stack two bowls: 6/10. Most failures were gripper misalignment and depth-camera errors.

**Cost and speed.** Learning plus evaluating all 50 tasks cost about $1,911 in API fees with GPT-6.1-Sol, $739 with DeepSeek, and $308 with GPT-5.6-Luna. An evaluation episode took about 55 model calls and 2.3 million tokens; the median episode took 6.4 minutes, about 80% of it waiting for the model.

**Why it's convincing.** It covers every task in a standard benchmark, not a handpicked few, and the clean-vs-randomized gap is a direct test of the paper's central claim.

**Why it's surprising.** The robotics field has been betting heavily on training ever-bigger action models. This says a general model with no robot-specific training, plus practice and good notes, can match them on familiar scenes and beat them on unfamiliar ones.

## Limitations

- **Slow and expensive.** Six-plus minutes and millions of tokens per attempt is far from a robot that reacts in real time. Trained policies run in milliseconds on local hardware.
- **Depends on commercial APIs.** The authors note that changes in API service quality can move scores by several points, and you can't run it offline.
- **The comparison isn't perfectly controlled.** The trained-policy numbers come from previously reported results, not rerun in the same session, so the 21.7-point gap is suggestive, not airtight.
- **Hard physical skills are unsolved.** Floppy objects (cloth, cables) and tightly coordinated two-hand contact are out of reach. Trained policies like Gemini Robotics 2.5 are now folding pants and tying bows.
- **The agent overrates itself.** In 28 to 29% of failures, the agent's own completion check said it had succeeded. That's why the official check matters.
- **Tiny real-world test.** Four tasks, 40 episodes, simple objects.
- **It needs a good simulator.** WICL only works if the practice world is faithful enough to the real one. Building that for every new environment is real work.

## Where this is today

### How it IS used

- **LLMs as robot "planners that write code" are real.** Google's Gemini models have been shown to write task code against a robot's control API without extra training, and to do dexterous tasks on an ALOHA robot from about 10 in-context demonstrations. That's the direct ancestor of this paper's "learn in context" approach.
- **Coding-agent harnesses for robots are an active research line.** MAESTRO (University of Pennsylvania, CoRL 2026) has a vision-language coding agent assemble perception, planning and control tools into a robot policy and replan on failure; it matched or beat state-of-the-art VLAs zero-shot. RoboScript is in the same family, with rehearsal and a persistent Task Memory added.
- **Simulation as a practice space is going mainstream.** Gemini Robotics 2.5 (Google DeepMind, November 10, 2026) uses Gemini 4 Argon as a simulation engine that builds digital twins from real camera scenes and generates practice runs. Different method (it feeds training), same instinct: let the robot fail in a world before the real one.
- **The code is open.** RoboScript is on GitHub (pre-1.0, validated only on two-armed tabletop tasks).

### How it ISN'T used

- **Production robots still run trained VLAs.** The headline commercial systems, like Gemini Robotics 2.5 in Apptronik's Apollo humanoid at a Mercedes-Benz parts-packing pilot (96% success), store skill in weights because they need speed and fine dexterity. Nothing public shows a deployed product running a WICL-style loop.
- **Pure in-context control is too slow for live motion.** Systems that use LLMs in robotics generally use them as the planner and hand off the actual movement to fast specialized tools or a VLA, as RoboScript itself does with cuRobo.
- **This is days old.** No independent replication yet.

### Lineage

Learning by trial and error in simulation (deep RL) + learning from examples in a prompt (GPT-3) + think-act-observe agents (ReAct) -> LLMs that write robot code -> agent harnesses that orchestrate robot tools (MAESTRO) -> this paper: practice in a simulator and keep a checked, reusable notebook -> likely next: hybrids where an agent's notebook guides a fast trained VLA, and notebooks get distilled back into weights.

## Why it matters for Brendan

- **Standard Physics.** Your app scans a real space with a phone. This paper's whole method depends on having a faithful "world" to practice in, and its memory rules (no absolute coordinates, relative geometry only, check reachability before acting) are exactly the kind of representation you'd want for accessibility checks. A rule like "a 36-inch clear path from the door to the counter" is a semantic, transferable fact, the same kind of knowledge this paper shows travels across scenes. The bigger opportunity: a scan of a space is the raw material for the digital twins robots will practice in.
- **Your memory and continuity startups, and Amelia.** This is a strong, measurable case for the idea you keep circling: an AI can get better at a job by writing and curating a readable memory instead of being retrained. Three design patterns worth stealing: only keep a memory update if it actually improves the next attempt; run a linter that blocks overly specific memories (in your world, things that shouldn't be stored or shouldn't generalize); and keep the memory human-readable so a person can inspect and correct it.
- **Arbor.** If agents carry Task Memories that work across robots and scenes, those memories become tradeable assets. "A verified Task Memory for stacking bowls on a PiPER" is a plausible thing for one agent to sell or license to another.

## Key terms

- **In-context learning**: a model picking up a new task from examples or notes in its prompt, without changing its weights.
- **Frozen model**: a model whose weights are not updated; all learning happens in what you feed it.
- **Trained policy / VLA**: a neural network that maps camera images and instructions directly to robot movements, with the skill stored in its weights after training on demonstrations.
- **Task Memory**: RoboScript's readable document of object roles, steps, relative grasp specs and lessons, learned through practice and then frozen.
- **Rehearsal**: practicing the task in a simulator and only keeping note changes that lead to success on a fresh try.
- **Linter**: an automatic rule checker; here it blocks memories that mention exact coordinates or scene-specific details.

## If you only have 10 more minutes

Read the introduction and look at the framework figure (the four-stage pipeline: skills, imitate, rehearse, deploy and reflect). Then read the main results table, focusing on the gap between clean and randomized for RoboScript vs. the trained policies, since that one comparison carries the paper's argument. Skim the ablation table. Skip the cost table details and the skill-building implementation unless you plan to run the code.

## One question to think about

If an AI's skill lives in a readable notebook instead of hidden weights, who owns that notebook, and what would it take to trust one that another agent wrote?

## Sources

- [World In-Context Learning for Agentic Robot Manipulation (arXiv)](https://arxiv.org/abs/2611.12885)
- [Paper summary with tables and limitations (ArXivSignals)](https://arxivsignals.io/papers/2611.12885)
- [Paper summary with method details (HyperAI)](https://hyper.ai/en/papers/2611.12885)
- [RoboScript code and README (GitHub)](https://github.com/ArcheOne-AI/RoboScript)
- [Gemini Robotics 2.5 accelerates real-world physical intelligence (Google DeepMind)](https://deepmind.google/blog/gemini-robotics-2-5-accelerates-real-world-physical-intelligence/)
- [Gemini 2.5 for robotics and embodied intelligence (Google Developers Blog)](https://developers.googleblog.com/en/gemini-25-for-robotics-and-embodied-intelligence/)
- [MAESTRO: Orchestrating Robotics Modules with Coding Agents (University of Pennsylvania)](https://www.engineering.upenn.edu/~dineshj/publication/shi-2026-maestro/)
- [RoboTwin 2.0 benchmark (arXiv)](https://arxiv.org/html/2506.18088v1)
