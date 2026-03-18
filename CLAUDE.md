# Obsidian At Inserter Plugin

## Overview
An Obsidian plugin that shows a context menu when typing `@` (configurable) in the editor. Currently supports date insertion (Today/Tomorrow), designed to be expanded with other insertion types.

## Architecture
- **Trigger**: Configurable symbol (default `@`) opens an `EditorSuggest` popup with filterable options
- **Date highlighting**: CodeMirror 6 `ViewPlugin` with `MatchDecorator` highlights YYYY-MM-DD dates as pills in the editor
- **Settings**: `AtInserterSettings` with configurable trigger symbol via settings tab
- **Extensible**: The suggest system is designed to support multiple option types beyond dates

## Key Files
- `src/main.ts` — Plugin entry point, `EditorSuggest` for trigger, CM6 date highlighting, settings tab
- `styles.css` — Suggestion popup styling and date pill styles
- `manifest.json` — Plugin metadata (id: `at-symbol-inserter`)
- `esbuild.config.mjs` — Build config; outputs to `build/`, copies manifest.json + styles.css there

## Build & Dev
```bash
npm install        # install deps
npm run dev        # watch mode (auto-rebuild into build/)
npm run build      # production build into build/
```

Build outputs to `build/` directory: `main.js`, `manifest.json`, `styles.css`.

## Installing in a Vault
Symlink the `build/` directory contents into the vault's plugin folder:
```bash
VAULT="/path/to/vault"
mkdir -p "$VAULT/.obsidian/plugins/at-symbol-inserter"
ln -sf "$(pwd)/build/main.js" "$VAULT/.obsidian/plugins/at-symbol-inserter/main.js"
ln -sf "$(pwd)/build/manifest.json" "$VAULT/.obsidian/plugins/at-symbol-inserter/manifest.json"
ln -sf "$(pwd)/build/styles.css" "$VAULT/.obsidian/plugins/at-symbol-inserter/styles.css"
```

## CSS Classes
- `.at-date-suggestion` — suggestion row (flex container)
- `.at-date-label` — option name (e.g., "Today")
- `.at-date-value` — date preview badge with muted background
- `.at-date-highlight` — inline date pill in editor (rounded, bordered)

## Conventions
- Date format: `YYYY-MM-DD`
- All CSS uses Obsidian theme variables (`var(--background-secondary)`, `var(--text-muted)`, etc.)
- Plugin class: `AtInserterPlugin` (exported default)
- Trigger symbol configurable via settings tab (default: `@`)

## Future Expansion
The `@` context menu will support additional insertion types beyond dates. Keep the architecture modular so new suggestion providers can be added easily.
