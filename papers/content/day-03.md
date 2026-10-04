---
day: 3
title: "ImageNet Classification with Deep Convolutional Neural Networks"
short_title: "AlexNet"
authors: "Krizhevsky et al."
year: 2012
link: "https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html"
track: "Foundations"
section: "Deep learning takes off"
tldr: "A big convolutional network trained on two gaming GPUs cut the ImageNet error rate from 26% to 15%, and computer vision switched to deep learning almost overnight."
---

# Day 3: ImageNet Classification with Deep Convolutional Neural Networks

Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton (University of Toronto), NeurIPS 2012.

## The problem

ImageNet's 2012 challenge asked systems to sort 1.2 million training photos into 1,000 categories, from container ships to specific dog breeds. The leading systems used features that people designed by hand, such as edge and texture statistics, fed into a separate classifier. Neural networks that learned their own features were believed to be too slow to train at this scale and too prone to memorizing the training set.

## Core ideas

### Go big and deep

The network has five convolutional layers and three fully connected layers, with 60 million parameters and 650,000 neurons. Convolutional layers slide the same small filters across the whole image, so a filter that detects an edge in one corner also detects it everywhere else. Early layers learned edge and color detectors, and deeper layers learned combinations of them.

### Use ReLU instead of S-shaped activations

Each neuron outputs max(0, x), now called a rectified linear unit. Its gradient doesn't shrink toward zero for large inputs the way the logistic and tanh curves do. On a small test, a four-layer network with ReLUs reached 25% training error on CIFAR-10 six times faster than the same network with tanh.

### Train on GPUs

The authors wrote fast GPU code for convolution and split the network across two NVIDIA GTX 580 cards with 3 GB of memory each. Training took five to six days. Without GPUs, a network this size would have taken months.

### Fight overfitting

With 60 million parameters and 1.2 million images, the network could easily memorize. Two tricks held it back. Data augmentation trained on random crops, mirror images and slight color shifts of each photo. Dropout switched off each hidden neuron in the first two fully connected layers with probability 0.5 on every training step, so no neuron could rely on any particular partner.

## Why it mattered

On the 2012 test set the network's top-5 error was 15.3%, against 26.2% for the second-best entry. The gap was so large that within two years nearly every competitive vision system was a deep convolutional network. The recipe of a big network, lots of labelled data and GPUs is the starting point for everything in the rest of this series.

## Key terms

- **Convolutional layer**: a layer that applies the same small set of learned filters at every position in the image.
- **ReLU**: the rectified linear unit, max(0, x). It trains faster than S-shaped activations because its gradient doesn't fade for large inputs.
- **Dropout**: randomly switching off neurons during training so the network can't depend on any single one.
- **Data augmentation**: making extra training examples by cropping, flipping or recoloring the originals.
- **Top-5 error**: the share of test images whose correct label is missing from the model's five most confident guesses.
