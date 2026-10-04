---
day: 8
title: "Deep Residual Learning for Image Recognition"
short_title: "ResNet"
authors: "He et al."
year: 2015
link: "https://arxiv.org/abs/1512.03385"
track: "Foundations"
section: "Deep learning takes off"
tldr: "Let each block of layers learn only a correction added to its own input, and networks can grow to 152 layers and keep getting better."
---

# Day 8: Deep Residual Learning for Image Recognition

Kaiming He, Xiangyu Zhang, Shaoqing Ren and Jian Sun (Microsoft Research), 2015.

## The problem

Deeper networks should be at least as good as shallower ones. A deep network could, in principle, copy the shallow one and make its extra layers do nothing. In practice, adding layers past a point made results worse, and not because of overfitting. On CIFAR-10, a plain 56-layer network had higher error than a 20-layer one on the training set itself. The authors called this the degradation problem: the optimizer couldn't find good settings for very deep stacks.

## Core ideas

### Learn the residual

A block of layers normally has to learn the whole mapping from its input x to its output. A residual block instead learns F(x) and outputs F(x) + x. If the best thing a block can do is nothing, it only has to push F toward zero, which is much easier than learning to copy its input exactly through several layers.

### Shortcut connections cost nothing

The + x is a shortcut that skips around the block. It adds no parameters and almost no computation. It also gives gradients a direct path back to earlier layers during backpropagation, so the signal doesn't fade over dozens of layers.

### Bottleneck blocks for very deep networks

For the 50, 101 and 152-layer versions, each block first shrinks the number of channels with a 1×1 convolution, does a 3×3 convolution on the smaller representation, then expands back with another 1×1 convolution. This keeps very deep networks affordable.

## Walkthrough: why the shortcut helps

1. Suppose a 20-layer network already works well, and you add 10 more layers on top.
2. In a plain network, those 10 layers have to learn the identity function, passing their input through unchanged, before they can stop hurting. That turns out to be hard to learn.
3. In a residual network, each new block outputs F(x) + x. If F's weights are near zero, the block already passes x through unchanged.
4. Training then starts from "the extra layers do no harm" and only has to find useful corrections, so the deeper network can only match or improve on the shallower one.

## Why it mattered

The 152-layer network is 8 times deeper than VGG, the previous year's standout, yet needs less computation. An ensemble of residual networks reached 3.57% top-5 error on ImageNet and won the 2015 classification challenge, along with first place in ImageNet detection and localization and in COCO detection and segmentation. Residual connections are now everywhere. Every layer of the Transformer (Day 9) wraps its attention and feed-forward steps in exactly this kind of shortcut.

## Key terms

- **Residual block**: a few layers whose output is added to the block's own input, so they learn a correction rather than a full mapping.
- **Shortcut connection**: the path that carries the input around the block unchanged.
- **Degradation problem**: deeper plain networks getting worse training error than shallower ones.
- **Identity mapping**: a function that returns its input unchanged.
- **Bottleneck block**: a residual block that shrinks, processes and re-expands the channels to save computation.
