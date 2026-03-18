# Obsidian At Inserter Plugin

## Overview
An Obsidian plugin that shows a context menu when typing `@` (configurable) in the editor. Currently supports date insertion (Today/Tomorrow), designed to be expanded with other insertion types.

## Repo
- **GitHub**: `NikolasSumrak/obisdian-at-plugin`
- **Plugin ID**: `at-symbol-inserter`
- **Author**: NikolasSumrak

## Architecture
- **Trigger**: Configurable symbol (default `@`) opens an `EditorSuggest` popup with filterable options
- **Date pills**: CM6 `ViewPlugin` + `MatchDecorator` with `Decoration.replace` widget — visually replaces `YYYY-MM-DD` with formatted pill (e.g., `Mar 17, 2026`), raw text unchanged
- **Date picker**: Clicking a pill opens native `<input type="date">`, selection updates the document via CM6 transaction
- **Source mode**: Decorations disabled in source mode (`isSourceMode()` check), only active in Live Preview
- **Settings**: `AtInserterSettings` — trigger symbol, display date format, highlight toggle. Mutable extension array pattern for live toggle of CM6 decorations.

## Key Files
- `src/main.ts` — All plugin logic: `EditorSuggest`, `DateWidget`, `createDateHighlightPlugin()`, `showDatePicker()`, settings tab
- `styles.css` — Suggestion popup, date pill, hover effect, date picker popup styles
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
Recommended: symlink `build/` as the plugin directory:
```bash
ln -s /path/to/obisdian-at-plugin/build \
   "/path/to/vault/.obsidian/plugins/at-symbol-inserter"
```

Or copy files from a [release](https://github.com/NikolasSumrak/obisdian-at-plugin/releases/latest).

## Releasing
1. Update version in `manifest.json` and `versions.json`
2. Create GitHub release with tag matching the version (e.g., `1.0.0`)
3. Attach `build/main.js`, `build/manifest.json`, `build/styles.css` as release assets

## CSS Classes
- `.at-date-suggestion` — suggestion row (flex container)
- `.at-date-label` — option name (e.g., "Today")
- `.at-date-value` — date preview badge in popup
- `.at-date-highlight` — date pill in editor (rounded, bordered, clickable)
- `.at-date-picker-popup` — floating date picker container

## Conventions
- Inserted date format: always `YYYY-MM-DD`
- Display format: configurable via settings, supports tokens (YYYY, MM, DD, MMM, MMMM, ddd, dddd)
- All CSS uses Obsidian theme variables
- Plugin class: `AtInserterPlugin` (exported default)

## Future Expansion
The `@` context menu will support additional insertion types beyond dates. Keep the architecture modular so new suggestion providers can be added easily.
