---
day: 7
title: "Generative Adversarial Nets"
short_title: "GANs"
authors: "Goodfellow et al."
year: 2014
link: "https://arxiv.org/abs/1406.2661"
track: "Foundations"
section: "Deep learning takes off"
tldr: "Train a forger and a detective against each other, and the forger learns to produce samples that look like the real data."
---

# Day 7: Generative Adversarial Nets

Ian Goodfellow, Jean Pouget-Abadie, Mehdi Mirza, Bing Xu, David Warde-Farley, Sherjil Ozair, Aaron Courville and Yoshua Bengio (Université de Montréal), 2014.

## The problem

Deep networks were good at telling things apart, such as cat versus dog. Generating new examples was much harder. Generative models of the time needed slow sampling procedures like Markov chains, or approximations of probabilities that couldn't be computed exactly, and they produced blurry results.

## Core ideas

### Two networks with opposite goals

The generator G takes random noise and turns it into a sample, such as an image. The discriminator D looks at a sample and outputs the probability that it came from the real training data rather than from G. D is trained to tell real from fake. G is trained to make D wrong. The paper compares G to a team of counterfeiters and D to the police.

### A game with a known answer

The two networks play a minimax game: D tries to maximize the same objective that G tries to minimize. The authors prove that, if both networks are flexible enough, the game has a unique solution. At that point G's samples follow exactly the same distribution as the real data, and D can do no better than a coin flip, outputting 1/2 for everything.

### Only backpropagation needed

When G and D are ordinary neural networks, the whole system trains with backpropagation from Day 2. Generating a sample is a single forward pass through G, with no Markov chain and no inference step.

### A practical fix for early training

Early on, G's samples are obviously fake and D rejects them with total confidence. In that situation the original objective gives G almost no gradient to learn from. The paper suggests training G to maximize the log of D(G(z)) instead, which has the same end point but much stronger gradients at the start.

## Walkthrough: one round of training

1. Draw a batch of real images from the training set and a batch of random noise vectors.
2. Run the noise through G to get a batch of fake images.
3. Update D to output values near 1 for the real batch and near 0 for the fake batch.
4. Draw fresh noise, run it through G, and pass the results to D.
5. Update G, holding D fixed, so that D's outputs for these fakes move toward 1.
6. Repeat. As D gets better at spotting fakes, G has to get better at making them.

## Why it mattered

The paper's own samples, on handwritten digits, faces and small photos, were modest. The idea took off: within a few years GAN variants were generating photorealistic faces, and for most of the late 2010s GANs were the leading way to generate images. Diffusion models (Day 12) later overtook them, partly because adversarial training is notoriously unstable. The idea of training one network against another to judge quality still appears throughout modern AI.

## Key terms

- **Generator**: the network that turns random noise into synthetic samples.
- **Discriminator**: the network that estimates whether a sample is real or generated.
- **Minimax game**: a two-player setup where one player maximizes the objective the other minimizes.
- **Latent noise**: the random input vector the generator starts from. Different noise gives different samples.
- **Mode collapse**: a common failure where the generator produces only a few kinds of output that fool the discriminator.
