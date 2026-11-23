---
day: 60
title: "ForceHarness: Turning Force into Action and Physics for Frozen Frontier Models"
short_title: "ForceHarness (giving a chatbot-style AI a sense of touch, without retraining it)"
authors: "Ke Sun, Kevin Yuchen Ma, Yike Zhang, Yanzhe Chen, Mike Zheng Shou (Show Lab, National University of Singapore)"
year: 2026
link: "https://arxiv.org/abs/2611.21099"
track: "Frontier"
section: "Frontier"
tldr: "Instead of retraining a big AI model to feel force, ForceHarness wraps an unchanged frontier model in a set of touch-aware tools that handle contact on their own and report back in plain physical terms like \"this bottle weighs 0.42 kg, give or take 0.03\", lifting GPT-6 Astra's success on real contact-heavy robot tasks from 3.3% to 90.0%."
---

# Day 60: ForceHarness: Turning Force into Action and Physics for Frozen Frontier Models

Ke Sun, Kevin Yuchen Ma, Yike Zhang, Yanzhe Chen and Mike Zheng Shou, from Show Lab at the National University of Singapore. Posted to arXiv in mid November 2026 (one news summary gives November 16). [Read the paper](https://arxiv.org/abs/2611.21099). Track: Frontier.

A note on sourcing: arXiv, the project page and the GitHub repo could not be opened from this run. This brief is built from hyper.ai's copy of the paper (abstract plus section text), a detailed explainer from explainx.ai, two short AI Weekly news posts, and primary pages for the related work. Where those sources disagree on a number, I say so.

## TL;DR

Frontier AI models can already steer a robot arm by looking at pictures, but pictures can't show weight, friction or how hard a screw is biting; ForceHarness gives the model a toolbox that feels those things for it and reports them as simple physics, and the model goes from almost always failing to almost always succeeding, with no retraining at all.

## What it builds on

From the foundations track, it is a direct descendant of **ReAct (Day 18)**: the model thinks, calls a tool, reads the result, and thinks again. It answers a question **RT-2 (Day 21)** left open: RT-2 showed web-trained models could steer robots, but only through vision. On the frontier track it continues **GPT-6-Astra as a robot brain (Day 27)** and **uni-robot-agent (Day 44)**, which both treated a frozen frontier model as a robot's planner, and it is the opposite bet from **ScaleVLA (Day 55)**, which trained a giant robot-specific model.

## The world before this paper

There are two ways to make an AI control a robot. One is to **train a robot policy**: collect hundreds of human demonstrations per task and teach a network to copy them. Vision-language-action models (VLAs) like π0.5 are the big version of this. The other is to take an **off-the-shelf frontier model** (the GPT and Gemini class, used through an API) and let it call robot functions like "move gripper here," with no robot training at all. The second approach got surprisingly good at tasks you can solve by looking. But a huge share of real manipulation is about **contact**: pushing a USB plug in until it seats, sorting bottles by weight, wiping a whiteboard hard enough to clean it but not so hard you snap something. A camera can't see force. And attempts to add force to trained policies were disappointing: the October 2026 ForceBench study found that the best way of feeding a wrist force sensor into a π0.5 policy reached only about 35% average success in simulation, and that whether force helped at all depended heavily on the design. Meanwhile, frontier models were "frozen": you can't retrain GPT-6 Astra to understand a stream of sensor numbers. So the question was whether you could give a frozen model a sense of touch purely through the tools around it.

## Core ideas

The paper names two problems and solves each with a layer, plus a bottom layer that gets clean force readings in the first place.

**Some terms first.**

- A **harness** is the software wrapped around an AI model: which tools it can call, what it sees, and what rules keep it safe. The model itself is unchanged.
- A **frozen model** is one whose internal weights are not changed by training. You only change its inputs and tools.
- **Force/torque (F/T)**: force is a push or pull in a direction (measured in newtons); torque is a twisting force (newton meters).
- **Zero-shot** means doing a task with no examples or practice on that task.

### 1. Feel force without a force sensor

**The problem.** Most force-aware robots use an expensive **wrist F/T sensor** between the arm and the gripper. The robot in this paper, a Franka FR3, has none.

**What they do instead.** The FR3 has a **torque sensor in each of its seven joints**, and Franka's own software already estimates outside forces from them. ForceHarness turns those joint readings into a single estimate of the push or pull at the hand. The math step (a least-squares solve using the arm's **Jacobian**, the table that links joint twisting to hand movement) is just "work backwards from how hard each joint is straining to what must be pushing on the hand."

**The fiddly but essential part: calibration.** Joint sensors drift. So the harness re-zeroes ("tares," like a kitchen scale) whenever the arm is at rest, re-zeroes again before each empty-handed move, waits for the arm to settle before averaging, and reports **changes** relative to a reference taken within the same episode, rather than absolute numbers.

**Analogy.** You don't need a scale in your palm to feel that a suitcase is heavy; your shoulder and elbow tell you. The harness reads the robot's "shoulder and elbow."

### 2. Let fast reflexes live under the slow brain: self-terminating force primitives

**The problem.** A frontier model called through an API takes **several seconds** to decide each step. Contact happens in milliseconds. If the model had to say "push 1 mm more... now 1 mm more" while pressing a plug into a port, it would be far too slow, and it might jam something before the next instruction arrived.

**What a primitive is.** A **primitive** is a small, pre-written skill the model can call by name, like a reflex. ForceHarness offers **twelve of them in five groups**: approach and make contact, hold a force, search and seat (for insertion), turn under load (for screws and knobs), and measure. Coverage names examples like search, wiggle, screw, slide and lift.

**How a primitive runs, step by step.**

1. The model calls, say, "press down until contact."
2. The primitive runs a fast control loop on the robot itself. It uses the arm's built-in **impedance controller**, which makes the arm behave like a spring: aim the target slightly past where the hand is, and the gap times the spring stiffness equals the force applied. To hold a chosen force, it nudges the target faster or slower depending on how far off the force is (an **admittance** law).
3. The primitive **ends itself** when something meaningful happens: contact is made, the motion stalls, resistance suddenly drops (the plug seated, the latch gave), the goal is reached, or a safety cap is hit. It does **not** end on a timer.
4. Control returns to the model with a report of what happened.

Under all of this, a fixed **guard** enforces force, speed and workspace limits no matter what the model asks for.

**Analogy.** A film director doesn't tell the stunt driver how to move the steering wheel each millisecond. They say "drive until you hit the mark, then stop," and the stunt driver's trained reflexes handle the rest. The model is the director; the primitives are the stunt team.

### 3. Translate force into physics the model can reason about

**The problem.** Even if you hand a language model a list of force readings ("Fz: -4.11, -4.13, -4.09..."), it can't reliably interpret them. The paper's ablations show this is especially true of smaller models.

**What the physics translation layer does.** After a primitive runs, simple, fixed estimators turn the force trace into **named physical quantities, each with an uncertainty**, and return those as the tool result. Examples:

- **Mass**: average vertical force divided by gravity.
- **Friction coefficient**: average sideways force divided by average pressing force.
- **Center-of-mass offset**: how lopsided an object is.
- **Contact height**: where a surface actually is.
- **Stiffness**: how much something gives when pressed (firm versus soft).
- **Insertion advance**: how far a plug or peg actually went in.

Each comes with status flags but **no task-specific thresholds**. The layer never says "this is the heavy bottle." It says the measurement, and the model decides.

**Worked example (illustrative numbers, not from the paper).** Task: sort two identical-looking bottles by weight. The model calls "lift and measure" on bottle A. The arm lifts, settles, averages its readings, and the tool returns: mass 0.42 kg, uncertainty 0.03 kg. It does the same for bottle B: 0.71 kg, uncertainty 0.03 kg. The model can now reason in plain language: "B is clearly heavier, the gap is far bigger than the uncertainty, put B on the right." Without force, the model was guessing from pixels, which is why GPT-6 Astra scored zero on this task without the harness.

**Why uncertainty matters.** If the two masses had come back 0.42 and 0.44 with uncertainty 0.03, a sensible model would measure again rather than commit. Giving it error bars lets it know when it doesn't know.

### 4. A test where the key fact is hidden: HiddenPhys

To measure this fairly, the authors built **HiddenPhys**, a seven-task simulated benchmark in **MuJoCo** (a standard physics simulator): Weight, CoM (center of mass), Wipe, Stack, Peg, Latch and Lock. In each task, one physical variable that matters (mass, center of mass, surface height, how stiff a mechanism is) is **hidden** and randomized each episode within a stated range. You cannot succeed by looking; you have to feel. The benchmark also counts **damage**: pressing a handle harder than a set threshold counts as breaking it.

## What they showed

**Real robot (the headline).** On a Franka FR3 with no wrist sensor, six real tasks (USB insertion, screw driving, eggplant peeling, whiteboard wiping, bottle weight sorting and firmness probing), 10 tries each:

- GPT-6 Astra without force: **2 of 60 (3.3%)**, and zero on bottle sorting and firmness probing.
- GPT-6 Astra with ForceHarness: **54 of 60 (90.0%)**.
- A second frontier model, reported as GPT-6.1 Sol, with ForceHarness: **47 of 60 (78.3%)**.

**ForceBench (someone else's benchmark).** On the public ForceBench simulation tasks (eight tasks, including weight sorting and drawer pulling), ForceHarness adds **17.5 percentage points** per the abstract. The summaries I read put the frontier model with the harness at roughly 82 to 88%, versus about 35% for the best force-aware policy trained on 200 demonstrations per task in the original ForceBench paper. A striking side note: the frozen model **without** force already beat the trained policies, and with force one task (Drawer Pull) went from 0 of 10 to 10 of 10.

**HiddenPhys.** GPT-6 Astra goes from **62.1% to 96.4%** (135 of 140) with the harness, with **zero** damaged handles. A hand-written expert controller, built specifically for each task, scored about the same (136 of 140, with one damage). Trained policies (Diffusion Policy, π0.5 and ForceVLA, each given about 200 expert demonstrations per task) did worse and damaged handles often, and adding wrist force to them gave no consistent gain. When the hidden values were pushed outside the training range, ForceHarness degraded less.

**Ablations (what each piece is worth).**

- The self-terminating primitives alone, even without the physics feedback, improved contact success and sharply cut damage.
- For smaller models, getting physical quantities beat getting raw force numbers or force plots.
- Turn-by-turn feedback helped the model recover after failures.

**Why it's convincing.** The result isn't just "bigger number." It's a frozen, general model with zero demonstrations matching an expert's hand-tuned controller and beating policies trained on hundreds of demos, on a benchmark built so that vision alone cannot win. And the real-robot jump (3% to 90%) is large enough that it isn't noise; explainx reports a significance test with p below 0.01.

## Limitations

- **Slow and pay-per-step.** Every decision is an API call taking seconds and costing money, which caps how long an episode can be. Fine for sorting bottles; not for catching something.
- **Hand-designed toolbox.** The twelve primitives and the physics estimators were written by people. A task needing a skill not on the menu (say, kneading dough) would need new tools. The model's generality is only as wide as its toolbox.
- **Benchmark caveat.** Per explainx, the ForceBench seeds used while developing the tools were not all held out; the project page reportedly labels which rows are held out. And reported ForceBench per-model numbers differ between the summaries I read (82.5% versus 87.5% for the same model), so wait for the paper's own table before quoting them.
- **Smaller models still struggle** on some tasks even with translated physics.
- **Sensing in simulation is easier.** In the simulated benchmarks, object positions were given to the model as noisy text, not images, so vision was partly bypassed there.
- **One robot, small trial counts.** Real results are 10 tries per task on one Franka arm. Joint-torque estimates are good on Franka because it has torque sensors in every joint; cheaper arms without them would need something like FACTR 2's learned estimator (below).
- I could not read the paper's own limitations section from this run.

## Where this is today

### How it IS used

- **The "frontier model as robot brain" pattern is a real product.** Google DeepMind's **Gemini Robotics ER 2** (July 2026) is publicly available to developers through the Gemini API and Google AI Studio. Google describes it as a high-level "brain" that hands motor control to lower-level models, and says developers can declare low-level control interfaces, like VLA models or navigation APIs, as tools it calls. That is the same architecture ForceHarness uses. Google's post does not mention force or contact sensing, which is exactly the gap this paper fills.
- **The hardware already supports it.** Franka's FR3 spec lists "7 integrated torque sensors," and its software exposes estimated external forces and torques at 1,000 times a second. ForceHarness uses that existing signal rather than buying a wrist sensor.
- **The code is open.** Per explainx, the code is on GitHub under an MIT license, with a dataset of 1,423 expert episodes on Hugging Face, so anyone with an FR3 or the simulator can try it.
- **Sensorless force is a live research line.** FACTR 2 (June 2026) estimates outside force on commodity arms with a small learned model trained on about 10 minutes of free motion, even on a cheap arm with no torque sensors at all. Pair that with a harness like this one and force-aware agents could reach inexpensive robots.

### How it ISN'T used

- **Not the mainstream way robots learn force yet.** Most force research still trains policies on demonstrations. A survey of 53 force- and touch-aware robot learning papers (August 2026) found the field concentrated on peg-in-hole, wiping and pick-and-place, and named expensive, hard-to-simulate force data as a major bottleneck. ForceHarness sidesteps the data problem, but it is one paper, days old.
- **Raw-sensor-in, action-out for frozen models is out.** Feeding a frozen model raw numbers or force plots is what this paper argues against, and its ablations back that.
- **Not for fast, dynamic tasks.** Anything needing sub-second decisions from the top-level model (catching, balancing, fast assembly lines) still belongs to trained low-level controllers.

### Lineage

Hand-coded force control in factories (decades old, one task per program) -> learned force-aware policies trained on demonstrations (ForceVLA, ForceBench designs, around 35% average in sim) -> frozen frontier models calling vision-based robot tools (Gemini Robotics ER, Day 27, Day 44) -> ForceHarness: the same frozen models calling touch-aware tools that speak physics -> what you might use: a general AI that can be told "tighten that until it's snug" and actually feel when it's snug.

## Why it matters for Brendan

**Arbor, and agent tool design in general.** The paper's deepest lesson isn't about robots: **the biggest gains came from redesigning the tools, not the model.** Two rules stand out. First, put fast loops under the slow model and have tools return when something meaningful happens, not on a timer. Second, return **interpreted quantities with uncertainty** ("0.42 kg, plus or minus 0.03") instead of raw data. In Arbor, an agent bidding in an auction shouldn't receive a raw stream of bids; it should get tools like "watch this lot and return when the price moves more than 5% or a new bidder enters," reporting "estimated clearing price $X, confidence range Y." Same pattern, different physics.

**Standard Physics.** Your app measures a space visually, but some ADA rules are about force, not geometry: the ADA Standards limit the force needed to open many interior doors and to operate hardware. A camera can't measure that. This paper is a sketch of how a future version could: a simple force reading (a handheld gauge or even a phone's sensors, which is a separate engineering question) turned into a physical quantity with an uncertainty, which an AI then checks against the rule and flags "measure again" when the error bar straddles the limit.

## Key terms

- **Harness**: the tools, inputs and safety rules wrapped around an unchanged AI model.
- **Frozen frontier model**: a top general-purpose AI used as-is through an API, with no retraining.
- **Force primitive**: a small built-in robot skill (press, wiggle, screw, lift) that runs its own fast control loop and stops itself when contact or a goal is reached.
- **Physics translation layer**: code that turns raw force readings into named quantities like mass, friction or stiffness, each with an uncertainty.
- **Joint-torque force estimation**: working out the push at the robot's hand from how hard each joint motor is straining, instead of using a wrist sensor.
- **HiddenPhys**: the paper's seven-task simulated benchmark where the key physical fact is hidden, so you must feel to succeed.

## If you only have 10 more minutes

Read the **Introduction**, which states the two problems (contact is faster than the model; the model can't read raw force) and the three-layer answer cleanly, then the **method section on the physics translation layer**, which is the transferable idea. Glance at the real-robot results table. Skip the impedance and admittance control equations and the calibration details unless you plan to run it on a robot.

## One question to think about

ForceHarness got its biggest gains by deciding what the model should **not** see (raw numbers) and what it should see instead (physics with error bars). For an AI agent you're building, what is the "raw force stream" it's currently being fed, and what would the translated, uncertainty-labeled version of it look like?

## Sources

- [ForceHarness paper (arXiv 2611.21099)](https://arxiv.org/abs/2611.21099)
- [ForceHarness on hyper.ai (abstract and paper text)](https://hyper.ai/en/papers/2611.21099)
- [explainx.ai: ForceHarness explainer](https://explainx.ai/blog/forceharness-frozen-frontier-models-force-robot-harness-2026)
- [AI Weekly: NUS ForceHarness lifts frozen GPT-6 Astra robot success from 3.3% to 90.0%](https://aiweekly.co/editors-blog/found-first-nus-forceharness-lifts-frozen-gpt-6-astra-robot-success-from-3-3-to)
- [AI Weekly: ForceHarness takes frozen GPT-6 Astra from 3.3% to 90.0% on a real robot arm](https://aiweekly.co/editors-blog/found-first-forceharness-takes-frozen-gpt-6-astra-from-3-3-to-90-0-on-a-real)
- [ForceHarness code (Show Lab, GitHub)](https://github.com/showlab/ForceHarness)
- [Google: Introducing Gemini Robotics ER 2](https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/)
- [Franka Research 3 product page](https://franka.de/products/franka-research-3)
- [ForceBench: Benchmarking Force Integration for Robotic Manipulation](https://arxiv.org/pdf/2610.19604)
- [FACTR 2: Learning External Force Sensing for Commodity Robot Arms](https://arxiv.org/pdf/2606.12406)
- [Learning Physical Interaction: A Survey of Tactile- and Force-aware Robot Learning](https://arxiv.org/pdf/2608.07558)
- [Hugging Face Daily Papers, November 2026](https://huggingface.co/papers/month/2026-11)
