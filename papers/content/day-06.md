---
day: 6
title: "Human-level Control through Deep Reinforcement Learning"
short_title: "DQN"
authors: "Mnih et al."
year: 2015
link: "https://doi.org/10.1038/nature14236"
track: "Foundations"
section: "Deep learning takes off"
tldr: "One network, seeing only the screen pixels and the score, learned to play 49 different Atari games, many of them at or above the level of a professional human tester."
---

# Day 6: Human-level Control through Deep Reinforcement Learning

Volodymyr Mnih, Koray Kavukcuoglu, David Silver and colleagues (DeepMind), published in Nature, 2015.

## The problem

Reinforcement learning trains an agent by trial and error. The agent acts, gets rewards, and learns which actions pay off. It had worked on small problems where the state could be described with a few hand-picked numbers. Combining it with a neural network that reads raw pixels was known to be unstable: training would often diverge instead of improving.

## Core ideas

### Learn the value of each action

The agent learns a Q-function: for the current screen, an estimate of the total future score for each possible action. It plays by picking the action with the highest estimate, and sometimes picks a random one so it keeps exploring.

### Read the screen with a convolutional network

The input is the last four frames of the game, shrunk to 84 by 84 pixels in grayscale, so the network can see motion. A convolutional network like Day 3's turns these frames into one Q-value for each joystick action.

### Experience replay

The agent stores each step it plays (screen, action, reward, next screen) in a large memory, and trains on random samples from that memory. This breaks up the strong correlation between consecutive frames and lets each experience be learned from many times.

### A target network that changes slowly

The training target for each Q-value depends on the network's own predictions, which makes the target move every time the network updates. DQN computes the targets with a frozen copy of the network and refreshes that copy only every few thousand steps. That gives the learner a stable target to aim at.

## Walkthrough: one Q-learning update

Say the agent is in Breakout, moves the paddle left, and the ball breaks a brick worth 1 point.

1. Store the step: the screen before, the action "left", reward 1, and the screen after.
2. Later, sample this step from memory along with a batch of other random steps.
3. Ask the frozen target network for the best Q-value on the screen after. Suppose it's 4.
4. The training target is the reward plus the discounted future: 1 + 0.99 × 4 = 4.96.
5. If the main network currently predicts 3.5 for "left" on the screen before, nudge it toward 4.96.

## Why it mattered

The same architecture and settings, trained separately on each of 49 games, worked across all of them, and on more than half of them it reached at least 75% of a professional tester's score. It showed that deep learning and reinforcement learning could be combined, and DeepMind's AlphaGo combined the two again a year later. The idea of a reward signal driving a neural network returns on Day 16, where it's used to make language models follow instructions.

## Key terms

- **Reinforcement learning**: learning which actions to take from rewards, rather than from labelled examples.
- **Q-value**: the expected total future reward from taking a given action in a given state and playing well afterward.
- **Experience replay**: storing past experiences and training on random samples of them.
- **Target network**: a periodically updated copy of the network used to compute stable training targets.
- **Discount factor**: a number just below 1 that makes rewards further in the future count for less.
