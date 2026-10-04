---
day: 2
title: "Learning Representations by Back-propagating Errors"
short_title: "Backpropagation"
authors: "Rumelhart, Hinton & Williams"
year: 1986
link: "https://doi.org/10.1038/323533a0"
track: "Foundations"
section: "Origins"
tldr: "By sending the output error backward through a network with the chain rule, you can train the hidden layers too, and they learn useful features on their own."
---

# Day 2: Learning Representations by Back-propagating Errors

David Rumelhart, Geoffrey Hinton and Ronald Williams, published in Nature, 1986.

## The problem

Single-layer networks like the perceptron can only learn simple input-to-output rules, and they famously can't learn XOR. Adding hidden layers between input and output would fix that, but nobody had a practical, widely used way to decide how each hidden unit's weights should change. The training data says what the output should be. It says nothing about what a hidden unit should do.

## Core ideas

### Measure the error at the output

The network runs forward and produces an output. The error is the sum of squared differences between that output and the desired output. Training means nudging every weight in the direction that makes this error smaller.

### Send the error backward

The chain rule from calculus says how a small change in any weight affects the final error. The paper computes this one layer at a time, starting at the output and moving back toward the input. Each hidden unit receives a share of the blame in proportion to how strongly it connects to the units that got things wrong. One forward pass and one backward pass give the gradient for every weight in the network.

### Hidden units invent their own features

The most important result is what the hidden units end up doing. In one experiment the network learned family trees for two families, one English and one Italian. Nobody told it about nationality or generation, yet individual hidden units came to encode exactly those features, because they helped predict the answers.

### Momentum smooths the path

Each weight update adds a fraction of the previous update. This keeps training moving through flat regions and damps oscillation across narrow valleys in the error surface.

## Walkthrough: one weight update

Take a tiny network with one input x, one hidden unit h and one output y, with weights w1 (input to hidden) and w2 (hidden to output).

1. Forward pass: h = f(w1 · x) and y = f(w2 · h), where f is the S-shaped logistic function.
2. Compare: the error is E = ½ (y − target)².
3. Backward through the output: the gradient for w2 is (y − target) · f′ · h. If y overshot, w2 moves down in proportion to how active h was.
4. Backward through the hidden unit: the blame passed to h is (y − target) · f′ · w2. Multiply by h's own slope and by x to get the gradient for w1.
5. Update both weights a small step against their gradients, then repeat on the next example.

## Why it mattered

The general technique had appeared earlier, in work by Seppo Linnainmaa (1970) and Paul Werbos (1974). This paper made it famous by showing that the hidden layers learn meaningful internal representations. Every network in this series, up to and including today's language models, is trained with backpropagation.

## Key terms

- **Hidden unit**: a neuron that is neither an input nor an output. Its job is learned rather than specified.
- **Gradient**: the direction and size of the change in each weight that would most quickly increase the error. Training steps the opposite way.
- **Chain rule**: the calculus rule for the derivative of a function of a function. Backpropagation applies it layer by layer.
- **Momentum**: carrying part of the previous weight change into the next one, so training builds up speed in a consistent direction.
