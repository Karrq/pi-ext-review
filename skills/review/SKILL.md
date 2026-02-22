---
name: review
description: Generate structured reviews of code changes. Use after completing implementation work or when the user explicitly requests a review of their changes.
---

# Review

Generate a structured review of recent code changes using the narrator agent.

## When to Use

Use this skill in these situations:

- After completing implementation work (new features, bug fixes, refactoring)
- When the user explicitly asks for a review of their changes
- Before committing significant changes to help identify issues

**Do not** use for simple one-line edits or documentation-only changes unless specifically requested.

## How It Works

The `review` tool spawns a separate narrator agent that:

1. Inspects recent file changes using git/jj
2. Analyzes code quality, potential bugs, and architectural concerns
3. Returns a structured review with sections for summary, concerns, and recommendations

The review is automatically presented to the user via the TUI. **Do not repeat or rephrase the review contents** - the user has already seen the full review.

## Usage

### Structured Mode (Default)

Generates a JSON review displayed in the TUI:

```bash
review "Context: Refactored authentication to use JWT tokens instead of sessions for better scalability"
review "Motivation: User requested real-time updates, so I added WebSocket support"
review "Background: Fixed the pagination bug where the last page wasn't loading correctly"
```

After the tool executes, simply acknowledge completion. Do **not** repeat the review content.

Example response:
```
Review complete. See the structured review above for details.
```

### Text Mode

If the user prefers inline chat output instead of the TUI, use text mode:

```bash
review "Context: Major refactor to improve test coverage" --mode text
```

In text mode, the review is returned as markdown prose in the chat.

## Parameters

- `task` (required): Context for the review. Provide background on why changes were made, design intent, or motivation. The narrator discovers what changed via git/jj. **Do not** list specific files or tell the narrator what to focus on unless the user explicitly requested a scoped review.
- `mode` (optional): Either "structured" (default, returns JSON for TUI) or "text" (returns markdown prose).

## What to Pass in `task`

**Good examples** (context and motivation):
- "Context: Refactored auth to use JWT tokens for better scalability"
- "Motivation: User reported pagination bug on the last page"
- "Background: Added caching layer to improve performance"
- "Design intent: Simplified error handling to reduce boilerplate"

**Bad examples** (directives and file lists):
- "Review the authentication changes in src/auth/"
- "Check src/api/client.ts and src/types.ts"
- "Focus on the new API endpoints"

**Exception:** If the user explicitly asks for a scoped review ("review just the auth changes"), then it's appropriate to pass that scope in the task parameter.

The narrator agent discovers all changes via git/jj diff and decides what to include. Your job is to provide helpful context about **why** the changes were made, not **what** to look at.

## Important Notes

- The narrator agent has its own context and uses read, grep, find, ls, and bash tools
- Reviews are generated from scratch each time - there is no persistent state
- The user sees the review immediately via TUI - **never repeat the review contents back to them**
- If the review fails, the error message will indicate what went wrong
