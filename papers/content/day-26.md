---
day: 26
title: "3DCodeVerse: Exploring 3D Worlds as Code"
short_title: "3DCodeVerse (3D worlds built as code)"
authors: "Yipeng Gao, Ziyao Zeng, Jinfa Huang, Yijiang Li and others, led from USC (Laurent Itti's iLab)"
year: 2026
link: "https://arxiv.org/abs/2610.22341"
track: "Frontier"
section: "Frontier"
tldr: "Instead of having AI paint 3D objects as frozen meshes or point clouds, have coding agents write short programs that build them, then check those programs by running them, measuring the parts and looking at renders: a USC-led team releases a 2-million-example dataset and a self-checking agent harness that beat Claude Design's 3D objects in 90% of blind human comparisons."
---

# Day 26: 3DCodeVerse: Exploring 3D Worlds as Code

Yipeng Gao (project lead), Ziyao Zeng, Jinfa Huang, Yijiang Li (equal contribution) and 15 others, with Laurent Itti as senior author. Most of the team is at the University of Southern California, joined by Yale, Rochester, UC San Diego, Columbia, NTU Singapore, UC Santa Cruz, Google DeepMind and Philo Labs. Submitted October 15, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.22341). Project page: [3dcodeverse.com](https://3dcodeverse.com/). Code: [github.com/gaoypeng/3dcodeverse](https://github.com/gaoypeng/3dcodeverse). Track: Frontier. It sits on Hugging Face's trending list this week with over 100 upvotes, and it comes out of your future campus.

## TL;DR

A 3D object written as a program can be edited, reused, measured and checked in ways a pile of triangles cannot; 3DCodeVerse gives coding agents the data and the self-checking workflow to build 3D that way, and shows it works much better than letting a model write the code in one shot.

## What it builds on

The Transformer (Day 9) and GPT-3 (Day 11) are the engines that write the code. CLIP (Day 15) started the line of models that understand images and text together, which is how this system's "judge" looks at renders and says what is wrong. ReAct (Day 18) is the loop underneath: plan, act, observe, fix. NeRF (Day 13) and 3D Gaussian Splatting (Day 20) are the rival approach, where 3D is learned as millions of numbers rather than written as instructions; this paper is a bet on the other side. RT-2 (Day 21) is why the robotics section matters: robots need simulated objects whose hinges actually work. And yesterday's OpenGCUA (Day 25) makes the same move in a different domain: have the model write a program instead of making one tiny move at a time, and let execution tell it whether it worked.

## The world before this paper

There are two broad ways to get AI to make 3D things. The popular one is **neural or mesh generation**: a model outputs a **mesh** (a surface made of thousands of small triangles) or a set of splats, the way an image generator outputs pixels. It looks good fast, but the result is frozen. If you want the table two inches taller, or the drawer to slide open, you are mostly starting over. The other way is **3D as code**: write a short program, in a tool like Blender's Python scripting or a CAD language, that builds the object step by step ("make a box this wide, cut a hole here, attach four legs"). Change one number and the object updates. Engineers and technical artists have worked this way for decades. Language models can write such code, but they were bad at it: the programs often crashed, parts floated in mid-air or passed through each other, and nobody had a big, clean training set. The data that did exist was scattered across formats and mostly covered static objects, and every team built its own one-off checking setup. This paper tries to give the field a common foundation.

## Core ideas

### 1. Treat 3D as code, across many "dialects"

The paper's starting belief: a program is a better container for 3D than a mesh, because a program is **editable** (change a number), **composable** (reuse a chair function in a hundred rooms), **inspectable** (you can read why the leg is where it is) and **verifiable** (you can run it and measure the result).

3D code comes in several **dialects**, different languages each good at a different job. The paper covers these:

- **Blender Python**: scripts that drive Blender, the free 3D software used in film and games. Good for artistic objects with materials and lighting.
- **CadQuery** and **OpenSCAD**: CAD languages for precise, manufacturable parts with exact dimensions. Think brackets, gears, enclosures for 3D printing.
- **URDF**: a description format for robots and other **articulated** objects (things with moving joints, like a door, a laptop lid or a robot arm). It says which part connects to which, and how far each joint can bend.
- **Three.js**: a JavaScript library that draws 3D scenes in a web browser.
- **GLSL**: a language for **shaders**, small programs that run on a graphics card to compute colors and effects pixel by pixel.

These cover four "tracks" of content: single objects, articulated objects, whole scenes, and graphics effects.

**Analogy:** a mesh is a photograph of a building; a program is the architect's drawing set. You can admire a photo, but only the drawing set lets you move a wall, count the doors, or hand it to a builder.

### 2. A 2-million-example training set, assembled and verified

The first big contribution is **3DCodeVerse-2M**, a dataset of runnable 3D programs paired with descriptions. The name rounds up a specific structure: about **270,000 distinct programs**, expanded into about **2.03 million training pairs** (the same program paired with different descriptions, conditions and views). Every program comes packaged with its assets (textures, meshes it needs), text captions, and **verification records**, a log proving it actually runs and produces what it claims.

They got the programs three ways:

1. **Collect what is open.** About 120,000 shaders from Shadertoy (a public site where people share GLSL effects) and about 1,200 OpenSCAD models from Thingiverse (a 3D-printing community).
2. **Convert specialized formats into code.** The biggest chunk comes from DeepCAD, a research dataset that stores CAD parts as a custom list of "draw a sketch, then extrude it" steps. They wrote a translator that turned about 178,000 of those into CadQuery programs, then threw out anything that failed to compile, wasn't a closed solid, or duplicated something else. That left about 128,000 unique programs, and the rebuilt shapes matched the originals almost perfectly (an average overlap score of 0.985 out of 1).
3. **Have agents write new code**, then keep only what passed the harness's checks.

The verification is the point. A training set of code that does not run teaches a model to write code that does not run.

**Mental picture:** a cookbook where every recipe has been test-cooked, photographed from four angles, and tagged with what it is, versus a shoebox of handwritten recipe cards, some missing steps.

### 3. A self-checking agent team (the "harness")

A **harness** is the scaffolding around a model: what it sees, what tools it can use, and how its output gets checked. The 3DCodeVerse Harness is a team of agents organized as a **DAG** (directed acyclic graph: a to-do list where some tasks must wait for others, and tasks with no dependency can run at the same time).

Here is one request, "a wooden stool with three legs and a round seat," step by step:

1. **Plan.** A planner agent turns the request into a structured spec: named parts (seat, three legs, maybe a footrest ring), a rough bounding box for each, materials, how parts relate ("legs touch the underside of the seat"), and an **acceptance checklist**. Each checklist item says how it will be checked (by measurement, by looking, or by moving a joint) and whether it is a must or a should.
2. **Build in parallel.** Coding agents write the parts. Each agent owns specific files, so they do not overwrite each other. Big objects (8 or more top-level parts) are built in small sub-assemblies, then combined.
3. **Check, in three layers, cheapest first:**
   - **Execution check:** does the program even run? If not, that crash log is the only feedback this round, and the agent gets up to three targeted repair attempts.
   - **Spatial measurements:** code measures the result. Which parts exist? Where are their bounding boxes? Do the legs actually touch the seat, or is there a gap? Do any parts pass through each other? For things with joints, it swings every joint through its full range and tries eight random poses to make sure nothing collides. Errors come back with numbers attached ("leg 2 is 1.4 cm below the seat").
   - **Visual judge:** a **vision-language model** (an AI that reads images and text; here Google's Gemini 3.1 Pro) looks at renders from several angles and compares them to the request and checklist. It writes down what it sees before it scores, and it never sees the coding agent's reasoning, so it cannot be talked into agreeing.
4. **Measurements outrank opinions.** If the judge says "the legs look detached" but the measurement proves they touch, the measurement wins and vetoes that complaint. The project page says it directly: a visual judge alone is not enough.
5. **Fix and repeat.** Feedback is boiled down to at most six prioritized fix tasks per round: crashes first, then unchecked must-haves, then visual polish. A fix agent applies them. This repeats for up to four rounds (or 60 minutes), and the best-scoring round wins, not necessarily the last one.

In the paper's worked example, a stool went from a score of 0.41 to 0.84 to 0.93 over two rounds of fixes, using 21 model calls and costing about 74 cents.

Every success, failure and repair gets saved, which turns the harness into a **data engine**: it produces more verified training examples as it runs. About 15,700 of the dataset's programs came from it.

**Analogy:** a film production, not a lone animator. A director breaks the script into a shot list with clear "done when" criteria, departments build in parallel, a continuity supervisor measures that the coffee cup is in the same spot in every take, a fresh pair of eyes watches the cut without hearing the excuses, and if the tape measure and the reviewer disagree, the tape measure wins.

### 4. Teaching small open models the craft

The last idea is simple: train smaller, free models on the dataset and see if they get better at 3D code. They used **fine-tuning** (continuing to train an existing model on new examples) with **LoRA** (a cheap fine-tuning trick that trains a small add-on instead of the whole model) on two open Qwen models, one with 9 billion parameters and one with 27 billion.

## What they showed

**The harness vs. models working on their own.** On 3D objects, people shown two results side by side preferred the harness's output 69% to 89% of the time, depending on which model powered it, and the judge's score rose 11 to 25 points. Example: Google's Gemini 3.8 Flash went from 61 to 87 out of 100. For articulated objects, scenes and graphics, human preference was 78% to 88%.

**The headline: vs. Claude Design.** Claude Design is Anthropic's visual-creation product, launched in April 2026. With Claude Opus 5.5 inside the 3DCodeVerse harness, people preferred the harness's 3D objects over Claude Design's in **90%** of blind comparisons, and the judge scored them about 87 vs. 37 (59 wins, 1 loss out of 60 prompts). Even against plain Opus 5.5 writing the code without the harness, the harness added about 9 points. One important asterisk: Claude Design's results were taken from its released reference outputs, not regenerated by the authors.

**Fine-tuning works, especially for small models.** The share of programs that actually run:

| Task | Qwen 9B before → after | Qwen 27B before → after |
|---|---|---|
| 3DCodeBench (Blender tasks) | 0% → 85% | 52% → 93% |
| CadQuery | 11% → 99% | 66% → 99% |
| OpenSCAD | 50% → 86% | 80% → 90% |
| GLSL shaders | 33% → 56% | 57% → 72% |
| Three.js | 73% → 75% | 73% → 93% |

The 9-billion-parameter model went from never producing a working Blender program to producing one 85% of the time. That is a small, cheap model learning a skill almost from scratch.

**But "runs" is not "right."** The paper also measures how closely the generated shape matches the target. These scores improved but stay modest: on 3DCodeBench the 9B model's shape match went from 0.00 to about 0.32 on a 0 to 1 scale. So the models learned to write code that runs far faster than they learned to write code that builds exactly the right thing.

**Quality costs money.** With Gemini Flash, one object costs about 3.5 cents without the harness and about $3.31 with it, roughly 95 times more, even though about 94% of the input was served from cache. Every program now runs (100% vs. 93%), and they look much better, but you pay for all those checks.

**Not every model benefits everywhere.** With Claude Sonnet 5, results on graphics and scenes were mixed: slightly worse on graphics, flat on scenes. The harness helps most when the base model is weaker or faster.

**Early applications.** In 12 robot-simulation test cases (doors with handles in MuJoCo, a physics simulator), the code-built objects passed a geometry check 12 out of 12 times, while a neural world model's predictions passed 7 out of 36. They also used code-built scenes as layout guides for video generators like Seedance, though that part is shown only with examples, not measured.

## Limitations

- **Graded by an AI.** Much of the scoring comes from a single vision-language judge (Gemini 3.1 Pro) using rubrics the authors wrote. Human preference tests back it up, but the judge and the harness were tuned together, so the system may be good at pleasing that specific judge.
- **Small samples in places.** The scenes and graphics comparisons use only 7 to 11 prompts each, so those numbers are rough.
- **The Claude Design comparison is not apples to apples.** It used saved outputs rather than fresh runs.
- **Running is easier than being correct.** Execution rates jump; shape accuracy improves much less.
- **Expensive.** The harness multiplies cost by roughly 100x on cheap models. Fine for a hero asset, painful at scale.
- **Unbalanced data.** Most programs are CAD parts and shaders. There are only about 300 Three.js programs and about 7,000 Blender programs, which helps explain why those areas improved less for some models.
- **Licensing.** The code is open (Apache 2.0), but the datasets are marked non-commercial (CC BY-NC-SA). A startup can learn from it but should not ship a product trained on it without checking terms.
- **Very new.** Released five days ago, no independent replication yet, and the robotics and video results are explicitly preliminary.

## Where this is today

### How it IS used

- **Agents driving Blender through code is already a real workflow.** The open-source Blender MCP connects Claude and other assistants to Blender, so you describe a change and the AI writes and runs the Blender Python that makes it. Designers write about using it for parametric, code-driven iteration rather than mesh generation. 3DCodeVerse is essentially a much more rigorous version of that loop, with measurement and review built in.
- **Text-to-CAD tools are a startup category.** Zoo, AdamCAD (Y Combinator W25, $4.1M seed) and others turn descriptions into editable CAD, and AdamCAD exports OpenSCAD code. A June 2026 hands-on test of seven such tools found them good for simple parts and prototyping but inconsistent on complex ones (a 24-tooth gear, a manifold block). That gap is exactly what the paper's measurement checks target.
- **Parametric output is already how phone scanning works.** Apple's RoomPlan, the iPhone LiDAR room-scanning API, outputs a parametric model with walls, doors and furniture as labeled boxes with dimensions, not a raw mesh. Same philosophy: structure you can measure and edit.
- **Claude Design** exists as a product for prototypes, slides and visual assets, and the paper uses its 3D object outputs as the main baseline.
- **Released and usable.** The harness, evaluation code, data tools and fine-tuning recipes are on GitHub, and the dataset is on Hugging Face (with the non-commercial caveat above).

### How it ISN'T used

- **Not replacing neural 3D for realism.** For photoreal capture of real places, Gaussian splats and learned world models still lead. World Labs' Marble, for example, generates persistent worlds and exports them as splats or meshes. World Labs itself argues for a hybrid where structured 3D acts like code and learned rendering adds the realism, which suggests the future is both, not one winning.
- **Not cheap enough for mass generation.** At around $3 per object on a fast model, the full harness is for quality, not for filling a game with ten thousand props.
- **One-shot "just ask the model for code" is fading** for anything complex. The paper's own numbers show single-shot generation lags well behind the check-and-fix loop.
- **I could not find a shipping consumer product built on 3DCodeVerse itself yet.** It is five days old.

### Lineage

CAD programs and procedural modeling (decades old) -> language models that can write code (GPT-3, 2020) -> agents that write, run and fix their own code (ReAct, 2022, and coding agents) -> 3DCodeVerse (agents that build 3D as code and check it by running, measuring and looking) -> what you will likely use next: describe a room, object or robot part in words and get an editable, measurable, simulation-ready model back.

## Why it matters for Brendan

**Standard Physics.** This is the closest paper yet to your project. An ADA check is a list of measurable rules: door clear width at least 32 inches, a 60-inch turning circle, counter heights, ramp slopes. A raw mesh from a phone scan makes those hard to check reliably. A structured, code-like model of the space (like what RoomPlan already outputs) makes them almost trivial to check. Two lessons transfer directly. First, the harness's acceptance checklist, where every item is tied to how it will be verified, is basically what an accessibility report is. Second, the rule that **measurements outrank the visual judge** is the right design for compliance: let an AI look at the scan and flag "this hallway looks tight," but let geometry make the call. The joint-sweep idea even maps onto doors: swing the door through its range and check clearances, the way the paper swings robot joints.

**AR/XR and generative video.** Three.js is one of the six dialects, which means objects that run in any web browser and can be dropped into WebXR scenes. And the paper's use of code-built scenes as layout guides for video models is a filmmaker's dream workflow: block out a scene as editable 3D (camera, set, props in exact positions), then let a video generator paint the final look on top. It is previs that a video model can follow.

## Key terms

- **3D as code**: building a 3D object by writing a program that constructs it, so you can edit it by changing numbers.
- **Mesh**: the standard way to store a 3D surface, as many small connected triangles. Easy to render, hard to edit meaningfully.
- **Articulated object**: something with moving parts and joints, like a door, drawer or robot arm. URDF is the common format for describing them.
- **Harness**: the scaffolding around an AI model that plans its work, runs its output and feeds back what went wrong.
- **VLM judge**: a vision-language model used to look at rendered images and grade them against a request.
- **Fine-tuning (LoRA)**: continuing to train an existing model on new examples; LoRA is a cheap version that trains a small add-on instead of the whole model.

## If you only have 10 more minutes

Read Section 4, on the harness, and look at its main diagram. It is the clearest picture of how plan, build, measure, look and fix fit together, and it is the part most reusable for your own projects. Then skim Figure 5 for before-and-after examples of refinement fixing floating parts. Skip the dataset construction details in Section 3 and the long appendix on training runs unless you plan to train a model yourself.

## One question to think about

If a phone scan of a room could be turned into an editable program instead of a frozen 3D model, what else besides an ADA report could you generate from that same program: a renovation quote, a VR walkthrough, a robot's map, a film set?

## Sources

- [3DCodeVerse: Exploring 3D Worlds as Code (arXiv)](https://arxiv.org/abs/2610.22341)
- [3DCodeVerse full text (arXiv HTML)](https://arxiv.org/html/2610.22341v1)
- [3DCodeVerse project page](https://3dcodeverse.com/)
- [3DCodeVerse code (GitHub)](https://github.com/gaoypeng/3dcodeverse)
- [3DCodeVerse dataset (Hugging Face)](https://huggingface.co/datasets/ilabai/3dcodeverse)
- [Trending papers (Hugging Face)](https://huggingface.co/papers/trending)
- [3DCodeVerse opens 2.03M executable 3D code pairs (AI Weekly)](https://aiweekly.co/alerts/3dcodeverse-opens-203m-executable-3d-code-pairs-across-six-languages-90-win)
- [3D Design With AI in 2026: Agents, Blender and the Open-Source Wave (Pardesco)](https://pardesco.com/blogs/technology-art-design/3d-design-with-ai)
- [We tested 7 text-to-CAD tools (Wevolver)](https://www.wevolver.com/article/we-tested-7-text-to-cad-tools-are-they-actually-useful-for-engineers)
- [AdamCAD review (Pasquale Pillitteri)](https://pasqualepillitteri.it/en/news/3372/adamcad-text-to-cad-ai-review-2026)
- [Anthropic launches Claude Design (Unite.AI)](https://www.unite.ai/anthropic-launches-claude-design-for-visual-prototyping-and-presentations/)
- [Introducing RoomPlan (Apple Developer)](https://developer.apple.com/augmented-reality/roomplan)
- [3D as code (World Labs)](https://worldlabs.ai/blog/3d-as-code)
