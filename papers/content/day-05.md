---
day: 5
title: "Sequence to Sequence Learning with Neural Networks"
short_title: "Seq2seq"
authors: "Sutskever et al."
year: 2014
link: "https://arxiv.org/abs/1409.3215"
track: "Foundations"
section: "Deep learning takes off"
tldr: "One network reads a sentence into a single vector and a second network writes the translation out of it, and this simple setup matched phrase-based translation systems."
---

# Day 5: Sequence to Sequence Learning with Neural Networks

Ilya Sutskever, Oriol Vinyals and Quoc V. Le (Google), 2014.

## The problem

Deep networks had become very good at mapping a fixed-size input to a fixed-size output, such as an image to a label. Translation doesn't fit that shape: the input and output are sequences of different lengths, and the words don't line up one to one. The best translation systems were phrase-based pipelines with many hand-built parts.

## Core ideas

### An encoder and a decoder

One LSTM, the encoder, reads the source sentence one word at a time and ends with a single fixed-size vector. A second LSTM, the decoder, starts from that vector and generates the translation one word at a time, feeding each word it produces back in as the next input, until it outputs an end-of-sentence token.

### LSTMs remember across long gaps

A plain recurrent network forgets early inputs quickly, because its gradients shrink as they pass back through many steps. A Long Short-Term Memory unit has gates that decide what to keep, what to overwrite and what to output, so information can survive across a whole sentence. The authors used deep LSTMs with four layers each.

### Reverse the source sentence

The most surprising trick is to feed the source sentence in backwards. The first words of the source then sit close to the first words of the translation, which creates many short-range dependencies and makes the optimization much easier. The abstract says this improved performance markedly.

### Search for the best output

At each step the decoder keeps a small number of the most likely partial translations and extends each one, instead of committing to its single best guess. This is called beam search.

## Walkthrough: translating one sentence

Take the English sentence "I am happy" going to French.

1. Reverse it to "happy am I" and feed those words into the encoder one at a time.
2. The encoder's final state is a vector that has to hold everything the decoder needs to know about the sentence.
3. The decoder starts from that vector and predicts the first French word, "je".
4. It feeds "je" back in and predicts "suis", then feeds "suis" back in and predicts "heureux".
5. It predicts the end-of-sentence token and stops, giving "je suis heureux".

## Why it mattered

On the WMT'14 English to French test set the LSTM scored 34.8 BLEU, against 33.3 for a phrase-based system. Using the LSTM to rerank the phrase-based system's top 1,000 candidates raised the score to 36.5. The encoder and decoder pattern became the template for neural translation, summarization and speech recognition. Squeezing a whole sentence into one vector was also its weak point. Attention, which Bahdanau, Cho and Bengio introduced for translation the same year, lets the decoder look back at every source word instead, and Day 9 builds an entire model out of it.

## Key terms

- **Encoder**: the network that reads the input sequence and compresses it into a vector.
- **Decoder**: the network that generates the output sequence from that vector, one token at a time.
- **LSTM**: Long Short-Term Memory, a recurrent unit with gates that control what it remembers.
- **BLEU**: a translation score that measures how many word sequences in the output also appear in human reference translations.
- **Beam search**: decoding that keeps several of the best partial outputs at each step instead of only one.
