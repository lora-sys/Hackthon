# WishLive Specs

This directory is the delivery control surface for the WishLive hackathon build.
Every phase must update its spec, task tracker, and acceptance evidence before it
can be considered done.

## Source Of Truth

Implementation decisions must follow these project documents first:

- `AGENTS.md`
- `TASKS.md`
- `DECISIONS.md`
- `docs/**`

`RTK.md` is referenced by `AGENTS.md` but is not present in the repository. It is
not blocking until the file is restored.

## Required Spec Sections

Each phase spec must include:

- `Goal`
- `Scope`
- `Build Items`
- `Data Contracts`
- `Test Gate`
- `Browser Evidence`
- `Current Status`

## Status Values

Task status values are fixed:

- `TODO`
- `IN_PROGRESS`
- `BLOCKED`
- `REVIEW`
- `DONE`

A task cannot move to `DONE` unless its `TestGate` has measurable evidence in
`acceptance-matrix.md`.

## Testing Rules

- Backend work needs API or integration test evidence.
- Agent work needs Redis Streams or Registry evidence.
- Blockchain work needs Hardhat test or JSON-RPC evidence.
- Frontend work needs browser evidence, especially screenshots for Dashboard,
  Topology, Wish Pool, and Negotiation Panel.
- No new endpoint, page, contract, or dependency should be added unless it is
  allowed by the frozen docs.

