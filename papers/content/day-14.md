---
day: 14
title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"
short_title: "RAG"
authors: "Lewis, Perez, Piktus, Petroni, Karpukhin, Goyal, Küttler, Lewis, Yih, Rocktäschel, Riedel & Kiela"
year: 2020
link: "https://arxiv.org/abs/2005.11401"
track: "Foundations"
section: "Generative and multimodal"
tldr: "Instead of forcing a language model to memorize every fact in its weights, give it a search engine over a library (Wikipedia) and train it to look things up first, then write its answer from what it found."
---

# Day 14: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel, Sebastian Riedel and Douwe Kiela (Facebook AI Research, University College London, New York University), 2020. Published at NeurIPS 2020. [Read the paper on arXiv](https://arxiv.org/abs/2005.11401). Track: Foundations 14/21.

## TL;DR

A language model writes better, more factual answers when it can first search a big external library and read the most relevant passages, and you can train the "searcher" and the "writer" together so they learn to cooperate, with no one ever telling the searcher which passage was the right one.

## How it builds on Day 13

NeRF (Day 13) packed an entire scene into a network's weights; RAG argues the opposite for facts: don't cram the world's knowledge into the weights, keep it in a separate library the model can search, swap and cite.

## The world before this paper

By 2020, models like BERT (Day 10), T5 and GPT-3 (Day 11) had shown that a big language model soaks up a surprising amount of world knowledge just from pre-training. Ask T5 "who wrote *Hamlet*?" and the answer is somewhere in its billions of weights. But that knowledge had three problems. First, it was **hard to access precisely**: models confidently made up wrong facts (what we now call **hallucination**). Second, it was **impossible to inspect**: there was no way to ask "where did you get that?" Third, it was **frozen**: if the world changed, you had to retrain. Meanwhile, a separate family of question-answering systems (like DPR and REALM, both from 2020) did search a library first, but they mostly worked by **extracting**: highlighting a span of text in the retrieved passage and returning it word for word. They couldn't write a fresh sentence, combine clues from several passages, or do tasks where the answer isn't sitting verbatim in the text. Nobody had a general recipe that combined "look it up" with "write freely".

## Core ideas

### 1. Two kinds of memory: parametric and non-parametric

**What it is.** The paper's central framing is that a model can store knowledge in two places.

- **Parametric memory** is knowledge baked into the model's **parameters** (its weights, the millions of numbers adjusted during training). This is how GPT-3 "knows" things. It's fast and flexible, but fuzzy, hidden and frozen.
- **Non-parametric memory** is knowledge kept outside the model, in a collection of documents it can look up. Here that's Wikipedia: a December 2018 snapshot chopped into about 21 million passages of 100 words each. It's explicit, readable and swappable.

RAG uses both. The writer (a pre-trained language model) brings grammar, reasoning and general knowledge from its weights. The library brings precise facts on demand.

**Analogy.** A closed-book exam versus an open-book exam. A closed-book student must memorize everything and will sometimes misremember with total confidence. An open-book student still needs to understand the subject (otherwise the book is useless), but can check the exact date or name before writing. RAG turns every exam into an open-book exam.

### 2. The retriever: search by meaning, not by keywords

**What it is.** The **retriever** is the part that finds relevant passages. RAG uses DPR (Dense Passage Retrieval, from Karpukhin et al., several of whom are co-authors here).

**How it works, step by step.**

1. **Turn every passage into a list of numbers.** A BERT model (Day 10), called the **document encoder**, reads each of the 21 million Wikipedia passages and produces an **embedding**: a list of several hundred numbers that captures what the passage is about. Passages with similar meaning get similar lists, the same "meaning as location" idea you met with word2vec on Day 4, but for whole paragraphs.
2. **Store them in an index.** All 21 million embeddings go into a **vector index**, a data structure built for one job: given a new list of numbers, quickly find the stored ones that are most similar. The paper uses FAISS, Facebook's open-source library for this. This step happens once, before training.
3. **Turn the question into a list of numbers too.** A second BERT, the **query encoder**, reads the input (say, a question) and produces its own embedding.
4. **Find the closest matches.** Similarity is measured with a **dot product** (multiply the two lists number by number and add up the results; a big total means they point in the same direction). Finding the passages with the biggest dot products is called **maximum inner product search (MIPS)**. The top 5 or 10 passages come back in milliseconds, even out of 21 million.

Because this is **dense retrieval** (matching meaning vectors) rather than keyword matching, a question about "the creator of Sherlock Holmes" can find a passage about "Arthur Conan Doyle's detective" even if the words barely overlap.

**Analogy.** A librarian who has read every book and filed each one on a giant map by topic. When you ask a question, the librarian figures out where your question lands on the map and grabs the five books shelved nearest to it.

### 3. The generator: write the answer while reading the passages

**What it is.** The **generator** is the writer. RAG uses BART-large (about 400 million parameters), a **sequence-to-sequence** model (the encoder-reads, decoder-writes design from Day 5, rebuilt on the Transformer from Day 9). BART was pre-trained by corrupting text and learning to restore it, which makes it good at producing fluent output from input text.

**How it works.** The trick is almost embarrassingly simple: RAG pastes the question and one retrieved passage together into one long input, and BART writes the answer from that. It does this separately for each of the top passages. Then it combines the results, weighting each by how confident the retriever was about that passage.

The paper offers two ways to combine them.

- **RAG-Sequence:** the model picks one passage to lean on for the whole answer. It generates a full answer from each passage, then blends them, trusting the answers based on more relevant passages more. Think of it as asking five experts, each holding one document, to write a full answer, then going with the weighted consensus.
- **RAG-Token:** the model can switch passages word by word. At each word it asks every passage "what should come next?" and blends their votes. This lets it stitch facts together: the title from passage 1, the date from passage 3. Think of one writer with five documents open on the desk, glancing at whichever one helps for the next word.

### 4. Training the searcher and the writer together, with no answer key for the search

**The problem.** Training data looks like (question, answer) pairs. Nobody labels which Wikipedia passage contains the answer. So how does the retriever learn what to fetch?

**The fix.** RAG treats "which passage did we use?" as a hidden choice (the paper calls it a **latent variable**: something the model has to infer rather than being told). The training goal is just: make the correct answer as likely as possible, averaged over the passages you retrieved. Here's the clever part, and it relies on backpropagation (Day 2):

1. The retriever fetches 5 passages and gives each a relevance score.
2. The generator tries to produce the correct answer from each one.
3. Say passage 3 made the correct answer very likely and passages 1, 2, 4 and 5 didn't help.
4. The math then pushes the retriever to score passage 3 higher next time for questions like this, and pushes the generator to make better use of good passages.

Over thousands of examples, the retriever learns what "useful" looks like purely from whether its picks helped the writer get the answer right.

**One shortcut.** Only the query encoder and the generator are trained. The document encoder and the 21-million-passage index are frozen, because re-computing every passage's embedding every time the model updated would be wildly expensive. The paper found this still worked well.

**Analogy.** A research assistant and a writer on a deadline. The assistant hands over five articles; the writer drafts the piece. The editor never tells the assistant which article was the good one. But each time the writer nails it using article 3, the assistant quietly notes "more like article 3", and over months the assistant's picks get sharp.

## Worked example: answering one question

Question: *"Who is the current President of Peru?"* (using the 2018 Wikipedia snapshot).

1. **Encode the question.** The query encoder turns it into a list of numbers.
2. **Search.** MIPS over 21 million passages returns the top 5. Passage A is from the article on Martín Vizcarra, saying he became President of Peru in March 2018 after Pedro Pablo Kuczynski resigned. Passage B is from the "President of Peru" article. Passages C to E are about Peruvian politics more loosely. The retriever scores A and B highest.
3. **Generate per passage.** BART reads "question + passage A" and leans toward "Martín Vizcarra". It reads "question + passage B" and also favors Vizcarra. The weaker passages produce shakier guesses.
4. **Combine.** Weighted by the retriever's confidence, the blended answer is "Martín Vizcarra".
5. **Hot-swap.** Now replace the index with a 2016 snapshot, without retraining anything. The same model now answers with whoever led Peru in that snapshot (Ollanta Humala or Pedro Pablo Kuczynski, depending on the month). The knowledge changed because the library changed, not the model.

The paper ran exactly this kind of test, described below.

## What they showed

The authors tested RAG on four kinds of "knowledge-intensive" tasks, meaning tasks a person couldn't do without looking something up.

- **Open-domain question answering.** Four benchmarks of real questions with short answers (Natural Questions, TriviaQA, WebQuestions, CuratedTrec), scored by **exact match** (did the answer match the reference exactly?). On Natural Questions, RAG-Sequence scored 44.5, beating the giant T5-11B with no retrieval (34.5 to 36.6), REALM (40.4) and DPR's extract-a-span system (41.5). That is the headline: a 400-million-parameter writer plus a library beat an 11-billion-parameter model that relied on memory alone. RAG set new records on three of the four benchmarks. A neat detail: in 11.8% of cases where the exact answer wasn't in any retrieved passage, RAG still got it right, by combining clues with its own knowledge, something extractive systems can't do at all.
- **Abstractive question answering (MS MARCO).** Questions needing full-sentence answers. RAG beat BART alone and came close to systems that were handed the correct passages, even though RAG had to find its own.
- **Jeopardy question generation.** Given an answer ("The World Cup"), write a Jeopardy-style clue. Human judges compared RAG and plain BART on 452 pairs: RAG was judged more factual 42.7% of the time versus 7.1% for BART, and more specific 37.4% versus 16.8%.
- **Fact verification (FEVER).** Decide whether a claim is supported, refuted or unverifiable using Wikipedia. RAG scored 72.5% on the three-way version, within about 4 points of systems trained with hand-labeled evidence, while RAG got no evidence labels at all. Its top retrieved passage came from a correct article 71% of the time anyway.
- **The hot-swap test.** For 82 world leaders who changed between 2016 and 2018, RAG with the 2016 index got 70% of 2016 leaders right, and with the 2018 index got 68% of 2018 leaders right. Mismatched indexes dropped to 4% to 12%. You can update what the model knows by swapping its library.

Why it was convincing: it beat both camps (pure memorizers and pure extractors) with one general recipe, and the hot-swap result showed something weights alone can never do. Why it was surprising: the retriever learned to find relevant passages with zero supervision about relevance.

## Limitations

- **Retrieval collapse.** On some tasks the retriever learned to return the same passages no matter the input, and RAG degenerated into plain BART. The paper flags this but doesn't fix it.
- **The library is frozen during training.** The document encoder isn't updated, so passages are represented however the original DPR saw them.
- **Heavy infrastructure.** The Wikipedia index needed about 100 GB of memory (36 GB compressed), a real cost in 2020.
- **Garbage in, garbage out.** RAG is only as good as its library. The authors note Wikipedia itself has errors and biases, and a model grounded in a bad source confidently repeats it.
- **No guarantee the writer uses the evidence.** Retrieval reduces hallucination but doesn't eliminate it: the generator can still ignore or misread a passage. This remains the central complaint about RAG systems today.
- **Old-fashioned retrieval sometimes wins.** On FEVER, classic keyword search (BM25) beat the learned dense retriever, because claims full of names are well served by exact word matching.

## Where this is today

The name stuck. "RAG" is now the everyday term for any system that looks things up before a model answers, even though most of those systems differ from this paper's design in an important way.

### How it IS used

- **The idea is everywhere, in a simpler form.** Today's typical RAG pipeline (chop documents into chunks, embed them, store them in a vector index, retrieve the top matches, paste them into the prompt of a large model like GPT, Claude or Gemini) is a direct descendant of this paper. What changed: modern systems usually do **not** train the retriever and generator together. They plug a ready-made embedding model into a ready-made chatbot, which turns out to work well enough and is much easier to build.
- **Built into major AI platforms.** OpenAI's API offers a hosted "file search" tool: you upload files into a vector store, and the model decides when to search them, using semantic and keyword search, and returns answers with file citations. That's RAG as a product feature.
- **A company founded by one of the authors.** Douwe Kiela, the paper's last author, co-founded Contextual AI, which sells a "RAG 2.0" platform for enterprises. Its pitch goes back to this paper's core idea: tune the retriever, the embedding model and the language model together as one system rather than gluing off-the-shelf parts. It names Qualcomm as a customer.
- **Extensions for harder questions.** Microsoft open-sourced GraphRAG in July 2024. Plain RAG struggles with whole-collection questions like "what are the main themes across these 10,000 documents?", because no single chunk holds the answer. GraphRAG first uses a language model to build a map of entities and relationships, then summarizes clusters of it.
- **Coding tools.** Cursor builds a semantic index of your codebase, a classic RAG setup, and treats fast, shareable indexing as a selling point.

### How it ISN'T used

- **Joint end-to-end training is rare.** The paper's signature move (backpropagating from the answer into the retriever) is mostly not what people deploy. Off-the-shelf retrievers plus very large models won on convenience.
- **"Agentic search" is replacing one-shot retrieval in some products.** Instead of retrieving once and answering, modern agents search repeatedly with tools: run a search, read, decide what to look up next. Boris Cherny of Anthropic's Claude Code team has said early versions of Claude Code used a local vector database, but the team "found pretty quickly that agentic search generally works better" (letting the model use tools like file search and grep on its own), citing simplicity and avoiding stale indexes. Note that Cursor went the other way, so this is a live debate, not a settled verdict.
- **Long context windows took some of RAG's job.** Models can now read hundreds of thousands of words at once, so for a single contract or a few reports you can often skip retrieval and paste the whole thing in. But research such as "Lost in the Middle" (Liu et al., 2023) found models use information at the start and end of a long input much better than information buried in the middle, so retrieval that puts the right passage up front still helps. For truly large collections (a company's entire drive), retrieval remains necessary.
- **The specific parts are outdated.** BART and DPR have been replaced by much larger language models and stronger embedding models, and "hybrid search" (combining dense meaning search with keyword search like BM25) is common, which echoes the paper's own FEVER finding.

### Lineage

Search engines + seq2seq models (Day 5) + BERT embeddings (Day 10) -> DPR and REALM (2020) -> RAG (2020) -> "chunk, embed, retrieve, prompt" pipelines on top of GPT-style models (2023) -> GraphRAG, hosted file search and agents that search with tools (2024 to today).

## Why it matters for Brendan

- **Amelia and your relationship-memory startups.** RAG is the standard architecture for "the AI remembers you". A model can't retrain itself every time you have a conversation, so per-person memory almost always means: store notes and transcripts outside the model, retrieve the relevant ones when that person shows up, and put them in the prompt. Two lessons from this paper map directly onto your product. First, the hot-swap result: knowledge in a library can be updated, deleted or scoped per person without touching the model, which is exactly what "permissioned" memory requires (if someone revokes permission, you delete their entries from the index and the model genuinely can't recall them). Knowledge baked into weights can't be cleanly revoked. Second, provenance: retrieval lets the system say *which* earlier conversation a memory came from, which builds trust.
- **Unstall.** A chief of staff for real estate agents needs facts that change daily: listings, client preferences, showing schedules. That's the paper's argument in miniature: fast-changing facts belong in a searchable store, not in a model's memory. Your design question is the modern one from "Where this is today": one retrieval step before answering, or an agent that searches the CRM and calendar repeatedly with tools?

## Key terms

- **Retrieval-augmented generation (RAG)**: a model that searches an external collection of documents and writes its answer using what it found.
- **Parametric memory**: knowledge stored inside a model's weights; fast but hidden, fuzzy and hard to update.
- **Non-parametric memory**: knowledge stored outside the model in a searchable collection that can be read, edited or swapped.
- **Embedding**: a list of numbers representing the meaning of a piece of text, so that similar meanings have similar numbers.
- **Dense retrieval (and MIPS)**: finding documents whose embeddings best match the query's embedding, using maximum inner product search over a vector index.
- **Hallucination**: when a model states something false or made up with full confidence.

## If you only have 10 more minutes

Look at **Figure 1** (the whole system in one picture: query encoder, index, top passages, generator) and read **Section 2.1** on RAG-Sequence versus RAG-Token, which is short. Then read the index hot-swapping part of **Section 4.5** (Additional Results), the most memorable result in the paper. Skip the decoding details in Section 2.5 and the per-dataset setup in Section 3 unless you want specifics.

## One question to think about

If a memory product can only "remember" what's in its retrieval library, then deleting an entry truly erases it. Is that a feature you would advertise to users ("we forget when you ask"), and how would you prove to a skeptical person that the model hasn't secretly learned it some other way?

## Sources

- [Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks, on arXiv](https://arxiv.org/abs/2005.11401)
- [OpenAI API docs, File search](https://developers.openai.com/api/docs/guides/tools-file-search)
- [SiliconANGLE, Contextual AI launches RAG 2.0 platform (January 2025)](https://siliconangle.com/2025/01/15/contextual-ai-launches-rag-2-0-platform-aid-development-domain-specific-ai-agents/)
- [PureAI, Microsoft open-sources GraphRAG (July 2024)](https://pureai.com/articles/2024/07/12/microsoft-open-sources-ai-tool.aspx)
- [SmartScope, Why Claude Code dropped vector DB RAG for agentic search (quotes Boris Cherny)](https://smartscope.blog/en/ai-development/practices/rag-debate-agentic-search-code-exploration/)
- [Boris Cherny on X, on Claude Code and agentic search](https://x.com/bcherny/status/2017824286489383315)
- [Cursor blog, Secure codebase indexing](https://cursor.com/blog/secure-codebase-indexing)
- [Liu et al., Lost in the Middle: How Language Models Use Long Contexts, on arXiv](https://arxiv.org/abs/2307.03172)
