---
day: 9
title: "Attention Is All You Need"
short_title: "Transformer"
authors: "Vaswani et al."
year: 2017
link: "https://arxiv.org/abs/1706.03762"
track: "Foundations"
section: "The Transformer era"
tldr: "Drop recurrence entirely and let every word look at every other word at once, and translation gets better and much faster to train."
---

# Day 9: Attention Is All You Need

Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser and Illia Polosukhin (Google Brain, Google Research and the University of Toronto), 2017.

## The problem

In 2017 the best translation systems read a sentence one word at a time with recurrent networks. Each step had to wait for the step before it, so training couldn't use the full parallel power of a GPU, and information from early words had to survive a long chain of updates to reach later ones.

## Core ideas

### Self-attention replaces recurrence

Every word builds a query, a key and a value. A word's query is compared with every word's key, the scores are turned into weights with a softmax, and the word's new representation is the weighted sum of the values. Every position is processed at the same time, so a whole sentence becomes a few matrix multiplications.

### Many heads look for different things

The model runs eight attention operations side by side, each with its own learned projections. One head can track which noun a pronoun refers to while another tracks word order, and their outputs are concatenated.

### Position has to be added back in

Attention by itself ignores word order. The authors add a positional encoding, built from sine and cosine waves of different frequencies, to each word's embedding so the model can tell "dog bites man" from "man bites dog".

## Walkthrough: one attention step

Take the sentence "the cat sat". Each word's embedding is multiplied by three learned matrices to get its query, key and value vectors.

1. For "sat", take the dot product of its query with the keys of "the", "cat" and "sat".
2. Divide each score by the square root of the key length, which keeps the softmax from saturating when vectors are long.
3. Apply a softmax so the three weights add up to 1. Suppose "cat" gets most of the weight.
4. The new vector for "sat" is the weighted sum of the three value vectors, so it now carries information about who sat.

## Why it mattered

The Transformer reached 28.4 BLEU on WMT 2014 English to German, beating every earlier model including ensembles, and trained in 3.5 days on eight GPUs. Its design became the base for BERT, GPT and almost every large language model that followed.

## Key terms

- **Attention**: a weighted average where the weights come from how well a query matches each key.
- **Self-attention**: attention where the queries, keys and values all come from the same sequence.
- **Multi-head attention**: several attention operations run in parallel with different learned projections.
- **Positional encoding**: a vector added to each embedding that tells the model where the word sits in the sequence.
