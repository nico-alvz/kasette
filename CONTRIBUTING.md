# Contributing to Sonora

Thanks for your interest in contributing.

## Issues and pull requests

- File bugs and feature requests as GitHub Issues. Include steps to
  reproduce, expected vs. actual behavior, and your browser/OS when relevant.
- For pull requests, branch off `main` and name branches
  `feature/<short-description>` or `fix/<short-description>`.
- Keep pull requests focused on a single change; unrelated cleanups belong in
  their own PR.

## Language

All code, comments, commit messages, and documentation must be written in
English.

## Comment policy

Comments should explain **why**, not **what**. Don't restate what the next
line of code obviously does. A comment earns its place when it captures a
non-obvious reason, such as a browser quirk being worked around, a schema
decision, or a constraint from a platform API, not when it narrates the code.

## Dependencies

Sonora's web app has zero runtime dependencies by design. Don't add a new
dependency (including dev tooling beyond what's already configured) without
opening an issue to discuss it first.
