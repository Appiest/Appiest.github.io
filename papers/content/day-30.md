---
day: 30
title: "VISAGENT: An Agent-Based End-to-End Voice Interaction System"
short_title: "VISAGENT (a phone line run by a marketplace of voice agents)"
authors: "Xiang Wang, Zhaoxiang Liu, Xiang Chen, Liqiang He, Kai Wang, Shiguo Lian (China Unicom)"
year: 2026
link: "https://arxiv.org/abs/2610.26168"
track: "Frontier"
section: "Frontier"
tldr: "China Unicom replaced the press-1-for-this phone menu on a national hotline with one natural voice that listens while it talks, picks the right specialist AI agent out of hundreds in under a second, and hands that agent what it already knows about you."
---

# Day 30: VISAGENT: An Agent-Based End-to-End Voice Interaction System

Xiang Wang, Zhaoxiang Liu, Xiang Chen, Liqiang He, Kai Wang and Shiguo Lian, Data Science and Artificial Intelligence Research Institute and Unicom Data Intelligence, China Unicom. Posted to arXiv on October 19, 2026. [Read the paper on arXiv](https://arxiv.org/abs/2610.26168). Track: Frontier.

A note on why this paper: the last few frontier days were lab studies. This one is a systems paper from a giant phone carrier describing something that is actually running on a real public hotline. It touches three of your projects at once: a voice-first agent (Unstall), a marketplace that picks which agent serves a request (Arbor), and per-person memory carried between conversations (Amelia and your relationship-continuity ideas). I read the full paper for this brief, so the numbers come from the paper itself.

## TL;DR

The future of a phone line is not one giant AI that does everything, but one good listener at the front door that routes you, with your context, to the right specialist agent from an open marketplace, and this paper is a working blueprint of that design.

## What it builds on

Sequence to sequence (Day 5) and the Transformer (Day 9) are the backbone of the speech model that hears and talks. BERT (Day 10) is used almost exactly as published, as the fast first-stage classifier that sorts calls into domains. Whisper (Day 19) is the ancestor of the speech-understanding half. RAG (Day 14) is the pattern behind the memory system: look up only the relevant stored facts and add them to the prompt. ReAct (Day 18) is the ancestor of the specialist agents that call tools to book things. And Day 28 (MemoryTax) is a useful counterweight: that paper asked whether agent memory pays for itself, and this one ships memory without measuring it.

## The world before this paper

China's 114 hotline is the national phone directory and information service, roughly the equivalent of 411 in the US. Like most service lines, it ran on **IVR** (interactive voice response: the recorded "press 1 for billing" menu). IVR has three problems. Menus are rigid, so callers must translate what they want into the menu's categories. Services are siloed, so moving from, say, a train ticket to a hotel means starting over. And adding a new service means redesigning the menu tree. Meanwhile, two separate waves of progress had arrived. Voice AI got good enough to hold a natural conversation, and companies started building lots of narrow text-based **agents** (AI programs that can take actions, like booking a courier, by calling software tools). What was missing was the plumbing that connects one natural voice to hundreds of independently built agents, quickly and with context, at the scale of a national phone line.

## Core ideas

### 1. One voice that listens while it talks (full-duplex speech)

**What it is.** Most voice assistants are **half-duplex**, like a walkie-talkie: you speak, it waits until you stop, then it speaks, and while it speaks it is deaf. VISAGENT is **full-duplex**, like a normal phone call: it keeps listening while it is talking, so you can interrupt ("no, the 5 pm train") and it adjusts mid-sentence.

**How it works, step by step.**

1. Your voice comes in over the ordinary phone line.
2. **Echo cancellation** strips out the system's own voice from what the microphone picks up, so it does not hear itself and think you are talking.
3. **Voice activity detection (VAD)** decides, moment to moment, whether a human is speaking. When you start talking over the system, VAD notices and the system can stop or change course.
4. An **end-to-end speech-to-speech model** does the actual conversation. "End-to-end" means one model goes from your audio to its audio, instead of a chain of three separate programs (speech-to-text, then a language model, then text-to-speech). Inside it are an **audio encoder** (turns sound into a compact numerical summary), an **adapter** (translates that summary into the format the language model understands), a 14-billion-parameter **language model** (the brain), a **streaming audio decoder** (produces speech piece by piece so it can start talking before it has finished thinking), and a **vocoder** (turns the decoder's output into an actual sound wave).
5. A side branch called **CTC** (connectionist temporal classification, a classic technique for turning audio into text without needing word-by-word alignment) also writes out a text transcript. The talking happens in audio, but the text is what the routing system and the specialist agents read.

**How they trained it.** In three phases, like teaching a band one section at a time. First they trained only the adapter, with the ears and brain frozen, so the brain learns to "hear." Then only the voice decoder, so it learns to "speak." Then they fine-tuned the adapter, brain and decoder together. The data: about 64,000 hours of public Mandarin speech, 10,000 hours of public English, and 1,000 hours of private Chinese speech.

**One more detail that matters.** Many specialist agents are text-only. The platform gives them a voice: a provider can pick from more than 40 preset voice styles or clone a voice from a short recording.

**Analogy.** A great restaurant host does not stand frozen until you finish a sentence, then recite a script. They nod, catch "actually, make it four people," and adjust while still talking. That is full-duplex.

### 2. Two-level routing: a receptionist, then a department head

**The problem it solves.** Imagine the marketplace has 319 agents: several courier companies, several hotel bookers, legal info, government services and so on. The obvious approach is to give a large language model (LLM) the caller's request plus descriptions of all 319 agents and ask "which one?" That works, but the prompt gets huge, and huge prompts are slow. On a phone call, a 10-second pause feels broken.

**How it works.**

1. **Level 1, the receptionist.** A small, fast **BERT-based intent classifier** (BERT is the Day 10 model; an **intent classifier** sorts a sentence into one of a fixed set of categories) decides the caller's domain: is this just chat, or is it travel, shopping, government affairs, law, finance and so on? If it is unclear, the system simply keeps chatting and re-checks after the next thing the caller says. Level 1 deliberately does not collect details like dates or addresses; it only sorts.
2. **Level 2, the department head.** Now an LLM chooses among only the agents registered in that one domain. Its prompt includes the request, the conversation so far, each candidate agent's description, and any relevant user memory (idea 4).
3. The platform calls the chosen agent's registered web address and passes along the request and the context. From there, the provider's own agent does the work.

**Worked example.** A caller says, "I need to send a package to my daughter in Chengdu tomorrow." Level 1 tags it "logistics" in a fraction of a second. Level 2 now looks at, say, 12 courier agents instead of 319. Memory says this caller usually uses a particular courier, which tips the choice. The courier's agent gets the request plus the caller's saved address and starts asking for what is missing.

**Analogy.** A hospital does not have one doctor who reads every specialist's resume for each patient. Triage sends you to cardiology; cardiology picks the right cardiologist.

### 3. A marketplace where agents register like apps

**What it is.** Instead of the phone company building every service itself, any provider (the platform or a third party) can register an agent, similar to publishing an app in an app store.

**What a registration contains.** The provider's identity, the agent's domain, a plain-language description, its capabilities, service tags, which regions it covers, the web address the platform should call, and **function specifications** (a precise list of what inputs the agent needs, like pickup address and weight, and what it returns, like a tracking number). The paper's appendix walks through a courier agent's registration.

**The gate.** Before an agent can be found by callers, it must pass a security review and operational testing.

**The key move.** Registration turns a text-only task agent into a voice agent without the provider doing any voice work. The platform handles listening, talking, routing and memory. The provider handles business logic and is responsible for actually completing the task.

**Analogy.** It is like a food court with one shared ordering kiosk that speaks every language. Each restaurant just has to post its menu and cook.

### 4. Memory that follows the caller, but only the relevant slice

**Three kinds of memory.**

- **Explicit preference memory:** things you said outright that apply generally ("I always use SF Express").
- **Behavioral preference memory:** patterns inferred from what you keep doing (you always pick the aisle seat).
- **Context memory:** recent, task-specific facts (you have a hotel booking active right now).

**What gets stored.** Not the full call recording or transcript. After each interaction the system writes a compact **execution summary**: domain, agent used, task, services, constraints, and outcome. Think of it as a receipt, not a tape.

**How it is retrieved.** Preferences are looked up with **structured retrieval** (exact lookups, like a database query for "this caller's courier preference"). Recent context is looked up with **semantic retrieval** (finding records that are similar in meaning to what you are asking now, the RAG idea from Day 14). Only records relevant to the current domain are passed on, so the hotel agent does not see your legal question from last week.

**Two places it is used.** The Level 2 selector uses it to choose between agents, but memory "does not override explicit requirements": if you say "use a different courier this time," that wins. Then the chosen agent uses it to do the task without asking you to repeat yourself. The memory service itself just stores and hands over records; it does not interpret them.

**Analogy.** A good concierge keeps a short card on each regular guest, not a recording of every conversation. When you call about dinner, they glance at the restaurant notes, not your laundry history.

### Walkthrough: one call, start to finish

1. You dial 114 and say, in plain Mandarin, "Can you book me a hotel near the Shanghai train station for Friday?"
2. Echo cancellation and VAD are already running. The speech model hears you and produces both a spoken reply and a text transcript.
3. Level 1 BERT tags the request "travel/hotel."
4. Memory returns two things relevant to hotels: you prefer non-smoking rooms (explicit) and you usually book with one particular platform (behavioral).
5. Level 2 compares the hotel agents in the travel domain and, nudged by memory, picks the platform you usually use.
6. The hotel agent receives your request plus "non-smoking." It asks the system to say, in its assigned voice, "One night or two?"
7. Halfway through the question you cut in: "Two nights." Full-duplex handling catches it; the agent updates.
8. Booking done. The system writes a compact summary: domain hotel, agent X, Shanghai, two nights, success. Next time you call about a taxi to that hotel, context memory has it.

## What they showed

**Conversation quality.** On URO-Bench, a set of 16 public Chinese spoken-conversation tests, the 14B VISAGENT speech model averaged 71.5 on the basic tests and 66.5 on the harder "pro" tests. That beat Step-Audio-mini (70.9 and 58.6), Qwen3-Omni with 30B parameters (65.5 and 60.1), and MiMo-Audio (53.3 and 51.1). The basic-test lead is tiny; the pro-test lead (about 6 points) is the meaningful one, and it beat a model twice its size.

**Speed.** In about 40 live test rounds, VISAGENT averaged 1.05 seconds from when you stop talking to when it answers, and 800 milliseconds of that is a deliberate wait to be sure you finished. Three big Chinese commercial assistants (iFlytek Spark, Baidu's ERNIE and ByteDance's Doubao) took 2.2 to 2.5 seconds. Caveat from the authors: they could not control the commercial systems' hardware. On theoretical model latency, VISAGENT (300 ms) is actually slower than research systems like Moshi (200 ms) and LLaMA-Omni (226 ms).

**Voice quality.** On a standard Chinese text-to-speech test, it placed second on both accuracy (character error rate 1.36%, where fish-speech scored 1.34%) and naturalness (3.491 out of 5, where CosyVoice 2 scored 3.500). In short: about as good as the best open systems, not better.

**Routing, the most interesting result.** They tested 100 caller requests against marketplaces of 50, 100 and 319 agents across 15 domains, using three different LLMs as the selector (DeepSeek V3, Qwen3 and Kimi K2). With single-level routing (the LLM sees every agent), accuracy stayed high (98 to 99% at 319 agents) but time ballooned to 8 to 10 seconds. With two-level routing, every selector hit 100% and stayed under 1 second at every size. That is the paper's clearest evidence: splitting the decision into "which department" then "which agent" keeps a growing marketplace fast.

**Deployment.** The system is live on China's 114 hotline across several service domains.

## Limitations

- **Thin evaluation for a system this big.** Routing was tested on just 100 requests and at most 319 agents. 100% on 100 questions does not tell you how it fails on the 10,000th odd request.
- **No deployment numbers.** The paper does not report call volume, which domains are live in production, task completion rates, or caller satisfaction. The 15-domain marketplace in the routing test is a test setup, not a description of what is running.
- **Memory was not evaluated at all.** The authors say they do not yet have enough interaction data, and that memory's effect is tangled up with how each downstream agent uses it. So the most novel-sounding piece is untested.
- **Routing is not finishing.** Picking the right agent does not mean the task gets done; that depends on each provider.
- **Unfair speed comparisons.** The commercial systems ran on unknown hardware, and the comparison set is small (about 40 rounds).
- **Chinese only.** All speech benchmarks are Chinese.
- **What the paper does not discuss:** who gets ranked first when several agents could serve a request, whether providers can pay for placement, and how a caller can see or delete what memory holds about them. Those are design questions any real marketplace faces.
- **A preprint**, five days old, with no outside replication or critique yet.

## Where this is today

### How it IS used

- **The architecture itself is in production.** By the authors' account, VISAGENT runs on China's 114 hotline. That is the most direct use.
- **Phone voice agents replacing IVR are a mainstream industry.** Platforms like Retell AI, PolyAI, Bland AI, Sierra, Replicant and Synthflow sell AI phone agents for contact centers, many advertising sub-second response times. Most of them still chain speech-to-text, an LLM and text-to-speech rather than using one end-to-end model. Huawei announced next-generation voice virtual agents for its AI contact center at MWC in March 2026, aimed at carriers, finance and government, claiming a 20% improvement in self-service resolution.
- **Full-duplex speech-to-speech went mainstream this fall.** OpenAI's GPT-Live-1, opened to developers on September 10, 2026, listens and speaks at the same time in one model, and can hand harder reasoning and tool calls off to a separate text model while the conversation continues. That is the same split as VISAGENT: a voice front end, with the real work delegated behind it. Named users include Yelp (reservation and food-order calls) and Speak (language tutoring). Its predecessor line, GPT-Realtime-2 (May 2026), is used by Zillow among others.
- **Agent registration and discovery are being standardized.** The A2A (agent-to-agent) protocol, now at version 1.0, has agents publish an **Agent Card**: a document listing name, provider, skills, endpoints and security requirements. That is very close to VISAGENT's registration record, which suggests the industry is converging on the "agents register like apps" idea.

### How it ISN'T used (or not yet)

- **The cascade is not dead.** Many production voice agents still use the older three-step pipeline because it is easier to debug, swap parts in, and audit, even though end-to-end models are smoother. VISAGENT itself keeps a text transcript for exactly that reason.
- **Flat routing does not scale.** The paper's own numbers show "put every agent in one prompt" falls apart on speed past about 100 agents. Hierarchical routing, or search over agent descriptions, is what replaces it.
- **No public open marketplace of voice agents** at this scale that I could verify outside this paper. Most commercial voice platforms let one company build its own agents rather than letting third parties plug in. I could not find independent reporting on VISAGENT's deployment, so its scale is unconfirmed.

### Lineage

Touch-tone IVR menus (1970s onward) -> speech recognition plus scripted dialogs -> LLM voice agents built as a speech-to-text, LLM, text-to-speech chain (2023 to 2025) -> full-duplex speech-to-speech models (Moshi 2024, GPT-Live-1 2026) -> VISAGENT: one voice front end routing to a registered marketplace of agents with shared memory (today).

## Why it matters for Brendan

**Arbor.** VISAGENT is effectively a non-auction version of Arbor: a request comes in, and the platform picks one agent from a registry, using context about the user. Two concrete takeaways. First, the two-level design is a practical answer to "how do I choose among thousands of agents fast": narrow the field cheaply, then decide carefully among a few. Arbor's auction could run only in the second stage, among the shortlisted agents. Second, the paper never says how ties are broken or whether providers compete on price, quality or placement. That gap is exactly where Arbor's context-aware auction would plug in, and it is worth thinking about how memory ("this user prefers X") should interact with bids without letting a sponsor override what the user asked for. Note the paper's rule that memory "does not override explicit requirements"; you will want an equivalent rule for bids.

**Unstall.** A real estate agent's day is the same shape as a hotline call: one voice front door, many specialized jobs behind it (scheduling showings, drafting offers, pulling comps, following up with leads). VISAGENT's lesson is to keep the voice layer separate from the task agents, so you can add a new skill by registering it rather than retraining the voice. Its 1-second response time, including an 800 ms "are you done?" wait, is a good concrete target for how Unstall should feel.

**Amelia and relationship memory.** Their choice to store a compact summary per interaction instead of full transcripts, and to pass on only the slice relevant to the current task, is a privacy-friendly pattern worth borrowing for permissioned memory. But they did not test it, so you would be building on a sensible design, not a proven one.

## Key terms

- **Full-duplex**: a voice system that listens and speaks at the same time, so you can interrupt it.
- **End-to-end speech-to-speech model**: one model that goes from your audio to its spoken reply, instead of chaining separate transcription, reasoning and speech programs.
- **IVR (interactive voice response)**: the classic "press 1 for billing" phone menu.
- **Intent classifier**: a small, fast model that sorts a request into one of a fixed set of categories.
- **Hierarchical routing**: choosing in stages (domain first, then specific agent) so each decision looks at a small list.
- **Agent registration**: the record a provider submits so the platform can find, describe and call its agent; similar to an A2A Agent Card.

## If you only have 10 more minutes

Read the Introduction for the motivation, then look at the system overview figure in Section 3 to see how the speech model, router, marketplace and memory connect. Then read the routing subsection and the routing results table in the experiments section; that is the paper's strongest, cleanest evidence. Skim the user memory subsection for the three memory types. Skip the speech benchmark tables and training details unless you are building a speech model yourself.

## One question to think about

When one company controls the front door that decides which agent you are routed to, it controls which businesses get your request. Should that choice be made by memory of what you liked before, by an auction among providers, or by something you can see and override, and how would you prove to a caller which one is happening?

## Sources

- [VISAGENT: An Agent-Based End-to-End Voice Interaction System (arXiv)](https://arxiv.org/abs/2610.26168)
- [VISAGENT full text (arXiv HTML)](https://arxiv.org/html/2610.26168)
- [Introducing GPT-Live-1 in the API (OpenAI)](https://openai.com/es-419/index/introducing-gpt-live-1-in-the-api/)
- [GPT-Realtime-2: OpenAI's voice model gets GPT-5-class reasoning (dsebastien.net)](https://www.dsebastien.net/2026-05-07-gpt-realtime-2-openais-voice-model-gets-gpt-5-class-reasoning/)
- [Top 10 AI Voice Agent Platforms Guide 2026 (Vellum)](https://www.vellum.ai/blog/ai-voice-agent-platforms-guide)
- [Huawei launches next-generation voice virtual agents for its AI contact center (Huawei)](https://www.huawei.com/en/news/2026/3/mwc-voice-interaction-aicc)
- [A2A Protocol 1.0 at the Gateway: Identity, Tenant Routing, and Signed Agent Cards (API7)](https://api7.ai/blog/a2a-protocol-gateway-layer)
