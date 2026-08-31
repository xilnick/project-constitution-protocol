---
name: parallel
description: "Run independent work concurrently — several tool calls in one message, several subagents in one wave — instead of walking it one step per turn. Use whenever a task divides into parts that do not feed each other: multi-area research, reviews through different lenses, repairs in separate zones, or any batch of independent reads and queries."
---

# parallel

Sequential execution of independent work is the most expensive mistake an agent makes routinely, and
the cheapest to stop making. This skill is about noticing the opportunity, not about a tool.

## The mechanic that decides everything

**One message, one wave.** Tool calls placed in the same message run concurrently; the same calls
spread across replies run one after another, each paying a full round trip. So the question to ask
before every reply is not *what do I do next* but *what else can go now* — and independent reads,
searches, graph queries and agent dispatches almost always can.

## Where the wins actually are

- **Discovery.** Every independent read, glob, grep or graph query for a task goes out together. If
  you know three files matter, you never fetch them one per turn.
- **Lenses.** One reviewer per question-axis — correctness, security, drift from intent — beats one
  reviewer asked for everything, and they run at once.
- **Zones.** Repairs in non-overlapping directories are independent even though they are all edits.
- **Aggregation.** When an answer needs computation over many files rather than a look at a few, one
  script that prints its result beats a dozen tool calls; write it, run it, keep the output small.

## Splitting

Split by **question**, not by file count: area, layer, or lens. Zones must not overlap, or the
reports come back duplicated and you pay twice for one answer. As many workers as the work genuinely
divides into — a ceiling around five, no floor, and one is a perfectly good wave.

## Delegating without losing the thread

A subagent sees none of your conversation, so a brief carries its own context: the goal and why it
matters, the paths you already know, the exact shape of the answer you want, and an explicit *report
conclusions, not file contents*. Your own context is the resource being protected — that is the point
of delegating at all. Treat what comes back as evidence, not verdict: verify a claim before you act
on it.

## When not to

- One step's output feeds the next. Then it is a pipeline, and pretending otherwise costs a retry.
- Two workers would edit the same file. Give them separate zones, or separate worktrees.
- The action is irreversible or outward-facing — a push, a deploy, a message. That stays with you.
- The task is trivial. A wave has overhead; a one-line fix does not need one.

## Boundary

While the `steps` protocol is running, its own fan-out and ownership rules govern the wave; this
skill is the general case for everything else.
