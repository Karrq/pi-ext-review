# pi-ext-review

A [pi](https://github.com/mariozechner/pi-coding-agent) extension that generates structured, narrated walkthroughs of code changes with an interactive TUI.

## Features

- **`review` tool** - Spawns a narrator agent that inspects git/jj diffs, groups changes by logical concern, and produces a structured JSON review
- **Interactive TUI** - Summary view with section list and animated text overflow, detail view with scrollable code blocks, cursor highlighting, and horizontal scroll
- **`/review` command** - Reopens past reviews from session history
- **Text mode** - Optional markdown output directly in chat (`mode: "text"`)
- **Streaming** - Real-time progress as the narrator generates the review

## Installation

### With Nix flakes

Add as a flake input:

```nix
# flake.nix
inputs.pi-ext-review = {
  url = "github:Karrq/pi-ext-review";
  flake = false;
};
```

Then in your pi configuration:

```nix
review = {
  src = inputs.pi-ext-review;
  installScript = ''
    mkdir -p "$out/agents"
    for f in "$src"/agents/*.md; do
      ln -sfn "$f" "$out/agents/$(basename "$f")"
    done

    mkdir -p "$out/extensions/review"
    for f in "$src"/*.ts; do
      ln -sfn "$f" "$out/extensions/review/$(basename "$f")"
    done

    mkdir -p "$out/skills"
    if [ -d "$src/skills" ]; then
      for d in "$src"/skills/*; do
        if [ -d "$d" ]; then
          ln -sfn "$d" "$out/skills/$(basename "$d")"
        fi
      done
    fi
  '';
};
```

### Manual

Copy the extension files into your pi extensions directory and ensure the `agents/` and `skills/` subdirectories are symlinked to the appropriate locations.

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

## Dependencies

All dependencies are pi built-ins (no npm install needed):

- `@mariozechner/pi-coding-agent`
- `@mariozechner/pi-ai`
- `@mariozechner/pi-tui`
- `@sinclair/typebox`

## License

MIT
