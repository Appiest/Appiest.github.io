---
day: 1
title: "Computing Machinery and Intelligence"
short_title: "The imitation game"
authors: "Turing"
year: 1950
link: "https://doi.org/10.1093/mind/LIX.236.433"
track: "Foundations"
section: "Origins"
tldr: "Instead of arguing about whether machines can think, Turing proposed a test you could actually run: can a machine hold a conversation well enough to pass as a person?"
---

# Day 1: Computing Machinery and Intelligence

Alan Turing (University of Manchester), published in the philosophy journal Mind, 1950.

## The problem

"Can machines think?" was a question nobody could settle, because nobody agreed on what "think" meant. Turing argued that any answer built on the dictionary meaning of the words would turn into an opinion poll. He wanted a question with an answer you could check.

## Core ideas

### Replace the question with a game

Turing describes an imitation game with three players. An interrogator sits in a separate room and exchanges typed messages with two hidden players, then has to say which is which. Turing then asks what happens when a machine takes one of the hidden seats. If the interrogator can't reliably tell the machine from the person, he argues, we have as much reason to call the machine intelligent as we have for other people.

### A concrete prediction

Turing predicted that in about fifty years, computers with a storage capacity of about 10^9 would play the game so well that an average interrogator would have no more than a 70 per cent chance of making the right identification after five minutes of questioning.

### Answering the objections

A large part of the paper works through nine objections to thinking machines and answers each one. The best known comes from Ada Lovelace, who wrote that the Analytical Engine "has no pretensions to originate anything" and can only do what we order it to do. Turing replies that machines surprise him all the time, and that a machine able to learn could end up doing things its programmer never spelled out.

### Teach a child machine

Instead of programming an adult mind directly, Turing suggests building something like a child's mind and educating it with rewards and punishments. He framed intelligence as something a machine could learn rather than something an engineer would have to write down.

## Walkthrough: one round of the game

1. The interrogator types a question to each hidden player, for example "Please write me a sonnet on the subject of the Forth Bridge."
2. Each player answers in writing. The human tries to help the interrogator. The machine tries to sound human, which might mean saying "Count me out on this one. I never could write poetry."
3. The interrogator can ask anything. In Turing's sample dialogue the machine is asked to add 34957 to 70764, pauses about 30 seconds, and answers 105621. The right answer is 105721, so the machine slips the way a person might.
4. After the questioning, the interrogator names which player is the machine. Turing's measure of success is whether the interrogator guesses wrong as often as in the original version of the game, where the two hidden players are a man and a woman.

## Why it mattered

The paper gave the field a goal before the field had a name. The term "artificial intelligence" first appeared five years later, in the 1955 proposal for the Dartmouth summer workshop. The test itself is still argued about, but the move Turing made has lasted: judge a system by what it does, and treat learning as the route to intelligence.

## Key terms

- **Imitation game**: Turing's name for the test where an interrogator tries to tell a machine from a human through typed conversation. Today it's usually called the Turing test.
- **Interrogator**: the judge who asks the questions and has to identify the machine.
- **Lovelace's objection**: the claim that a machine can only do what it was explicitly told to do and can never originate anything.
- **Child machine**: Turing's proposal to build a simple learning machine and educate it, instead of programming adult intelligence by hand.
