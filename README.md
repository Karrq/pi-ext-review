# pi-ext-review

A [pi](https://github.com/badlogic/pi-mono) extension that generates structured, narrated walkthroughs of code changes with an interactive TUI.

## Features

- **`review` tool** - Spawns a narrator agent that inspects git/jj diffs, groups changes by logical concern, and produces a structured JSON review
- **Interactive TUI** - Summary view with section list and animated text overflow, detail view with scrollable code blocks, cursor highlighting, and horizontal scroll
- **`/review` command** - Reopens past reviews from session history
- **Text mode** - Optional markdown output directly in chat (`mode: "text"`)
- **Streaming** - Real-time progress as the narrator generates the review
- **Review skill** - Teaches the agent when and how to invoke the review tool

## Installation

### Quick install

```bash
pi install git:github.com/Karrq/pi-ext-review
```

### Try without installing

```bash
pi -e git:github.com/Karrq/pi-ext-review
```

### Project-local install

```bash
pi install -l git:github.com/Karrq/pi-ext-review
```

This writes to `.pi/settings.json` so the extension is shared with your team.

### Manual

Clone or copy the repo into your pi extensions directory:

```
~/.pi/agent/extensions/review/    # global
.pi/extensions/review/             # project-local
```

## Usage

### As a tool (LLM-invoked)

The agent can call the `review` tool after completing work. The included skill teaches it when and how.

### As a command

```
/review          # reopen a past review from session history
```

### Text mode

If you prefer inline markdown instead of the TUI:

```
review "Describe the auth refactor" --mode text
```

## TUI Navigation

### Summary view
- `j`/`k` or arrows - navigate section list
- `enter` - open section detail
- `esc` or `q` - close

### Detail view (walkthrough)
- `j`/`k` or arrows - vertical scroll
- `h`/`l` - horizontal scroll (code zone)
- `esc` - back to summary
- `q` - close

## License

MIT
