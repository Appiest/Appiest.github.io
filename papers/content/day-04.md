---
day: 4
title: "Efficient Estimation of Word Representations in Vector Space"
short_title: "word2vec"
authors: "Mikolov et al."
year: 2013
link: "https://arxiv.org/abs/1301.3781"
track: "Foundations"
section: "Deep learning takes off"
tldr: "Two very simple models learn a vector for every word from raw text in under a day, and the vectors encode meaning well enough that king minus man plus woman lands near queen."
---

# Day 4: Efficient Estimation of Word Representations in Vector Space

Tomas Mikolov, Kai Chen, Greg Corrado and Jeffrey Dean (Google), 2013.

## The problem

Most language systems treated each word as an isolated symbol, so "hotel" and "motel" were as unrelated as "hotel" and "banana". Neural networks could learn word vectors that captured similarity, but the existing models were slow, so they could only be trained on a few hundred million words. Better vectors needed far more text, and that needed far cheaper models.

## Core ideas

### Strip the model down

Earlier neural language models had a large non-linear hidden layer, and that layer was where most of the computation went. The paper removes it. Both new models are log-linear: a word's vector feeds almost directly into a prediction. Each step is less expressive, but the model is so cheap that it can train on billions of words, and the extra data more than makes up for it.

### Continuous bag of words (CBOW)

CBOW averages the vectors of the surrounding words, say two before and two after, and uses the average to predict the word in the middle. Word order within the window is ignored, which is why it's called a bag of words.

### Skip-gram

Skip-gram flips the task around: it takes the middle word and predicts each of the surrounding words. It's slower than CBOW, but in the paper's tests it did noticeably better on the questions about meaning.

### Meaning shows up as directions

The paper's test asks analogy questions by doing arithmetic on vectors. Take vector("king") minus vector("man") plus vector("woman"), and the closest word vector is "queen". Many relationships, such as country to capital and singular to plural, became consistent directions in the space without anyone labelling them.

## Walkthrough: one skip-gram training step

Take the sentence "the quick brown fox jumps" with a window of two words on each side.

1. Pick the middle word, "brown", and look up its vector.
2. Its context words are "the", "quick", "fox" and "jumps". Each one becomes a separate prediction target.
3. For the pair ("brown", "fox"), the model scores every word in the vocabulary against the vector for "brown" and turns the scores into probabilities.
4. The model nudges the vector for "brown" so that "fox" gets a higher probability, and repeats for the other three context words.
5. After billions of such steps, words that appear in similar contexts, like "fox" and "wolf", end up with similar vectors.

## Why it mattered

The abstract reports learning high-quality vectors from a 1.6-billion-word dataset in less than a day. Pre-trained word vectors became a standard first layer for language systems for the next several years. The bigger lesson was that a simple model trained on far more data can beat a clever model trained on less, the same bet that later language models made at much larger scale.

## Key terms

- **Word vector**: a list of a few hundred numbers representing a word. Words used in similar ways get similar vectors.
- **Embedding**: another name for a learned vector representation of a word or other item.
- **Context window**: the words on either side of a target word that the model uses for prediction.
- **CBOW**: continuous bag of words, which predicts a word from the average of its neighbors' vectors.
- **Skip-gram**: the model that predicts the neighbors from the middle word.
