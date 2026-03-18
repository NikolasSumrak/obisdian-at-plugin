import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, EditorView, MatchDecorator, WidgetType } from '@codemirror/view';
import { Extension } from '@codemirror/state';

interface AtInserterSettings {
	triggerSymbol: string;
	displayDateFormat: string;
	highlightDates: boolean;
}

const DEFAULT_SETTINGS: AtInserterSettings = {
	triggerSymbol: '@',
	displayDateFormat: 'YYYY-MM-DD',
	highlightDates: true,
};

interface DateOption {
	label: string;
	getDate: () => string;
	getRawDate: () => Date;
}

const DATE_OPTIONS: DateOption[] = [
	{
		label: 'Today',
		getDate: () => {
			const d = new Date();
			return formatDate(d);
		},
		getRawDate: () => new Date(),
	},
	{
		label: 'Tomorrow',
		getDate: () => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return formatDate(d);
		},
		getRawDate: () => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return d;
		},
	},
];

function formatDate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatDateDisplay(d: Date, fmt: string): string {
	const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const year = String(d.getFullYear());
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');

	let result = fmt;
	result = result.replace('YYYY', year);
	result = result.replace('MMMM', MONTH_NAMES_FULL[d.getMonth()] ?? '');
	result = result.replace('MMM', MONTH_NAMES_SHORT[d.getMonth()] ?? '');
	result = result.replace('MM', month);
	result = result.replace('DD', day);
	result = result.replace('dddd', DAY_NAMES_FULL[d.getDay()] ?? '');
	result = result.replace('ddd', DAY_NAMES_SHORT[d.getDay()] ?? '');

	return result;
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class DateSuggest extends EditorSuggest<DateOption> {
	plugin: AtInserterPlugin;

	constructor(plugin: AtInserterPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const sub = line.substring(0, cursor.ch);
		const symbol = escapeRegex(this.plugin.settings.triggerSymbol);
		const match = sub.match(new RegExp(symbol + '(\\w*)$'));
		if (!match) return null;

		return {
			start: { line: cursor.line, ch: cursor.ch - match[0].length },
			end: cursor,
			query: match[1] ?? '',
		};
	}

	getSuggestions(context: EditorSuggestContext): DateOption[] {
		const query = context.query.toLowerCase();
		return DATE_OPTIONS.filter(opt => opt.label.toLowerCase().includes(query));
	}

	renderSuggestion(option: DateOption, el: HTMLElement): void {
		const container = el.createDiv({ cls: 'at-date-suggestion' });
		container.createSpan({ text: option.label, cls: 'at-date-label' });
		container.createSpan({ text: formatDateDisplay(option.getRawDate(), this.plugin.settings.displayDateFormat), cls: 'at-date-value' });
	}

	selectSuggestion(option: DateOption, evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;

		const { editor, start, end } = this.context;
		const dateStr = option.getDate();
		editor.replaceRange(dateStr, start, end);
	}
}

class DateWidget extends WidgetType {
	constructor(readonly rawDate: string, readonly format: string) {
		super();
	}

	eq(other: DateWidget): boolean {
		return this.rawDate === other.rawDate && this.format === other.format;
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'at-date-highlight';
		span.setAttribute('data-date', this.rawDate);
		const [yearStr, monthStr, dayStr] = this.rawDate.split('-');
		const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
		span.textContent = formatDateDisplay(d, this.format);
		return span;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function showDatePicker(target: HTMLElement, view: EditorView) {
	const existing = document.querySelector('.at-date-picker-popup');
	if (existing) existing.remove();

	const rawDate = target.getAttribute('data-date');
	if (!rawDate) return;

	const pos = view.posAtDOM(target);
	const dateLen = 10; // YYYY-MM-DD

	const popup = document.createElement('div');
	popup.className = 'at-date-picker-popup';

	const input = document.createElement('input');
	input.type = 'date';
	input.value = rawDate;
	popup.appendChild(input);

	const rect = target.getBoundingClientRect();
	popup.style.position = 'fixed';
	popup.style.left = `${rect.left}px`;
	popup.style.top = `${rect.bottom + 4}px`;
	popup.style.zIndex = '1000';

	document.body.appendChild(popup);
	input.focus();
	input.showPicker();

	const cleanup = () => {
		popup.remove();
		document.removeEventListener('mousedown', onClickOutside);
	};

	const onClickOutside = (e: MouseEvent) => {
		if (!popup.contains(e.target as Node)) cleanup();
	};

	input.addEventListener('change', () => {
		const newDate = input.value;
		if (newDate && newDate !== rawDate) {
			view.dispatch({
				changes: { from: pos, to: pos + dateLen, insert: newDate },
			});
		}
		cleanup();
	});

	setTimeout(() => document.addEventListener('mousedown', onClickOutside), 0);
}

function isSourceMode(view: EditorView): boolean {
	return view.dom.closest('.is-source-mode.mod-cm6') !== null
		&& view.dom.closest('.is-live-preview') === null;
}

function createDateHighlightPlugin(format: string) {
	const decorator = new MatchDecorator({
		regexp: /\b\d{4}-\d{2}-\d{2}\b/g,
		decoration: (match) => Decoration.replace({
			widget: new DateWidget(match[0], format),
		}),
	});

	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = isSourceMode(view) ? Decoration.none : decorator.createDeco(view);
			}

			update(update: ViewUpdate) {
				if (isSourceMode(update.view)) {
					this.decorations = Decoration.none;
				} else {
					this.decorations = decorator.updateDeco(update, this.decorations);
				}
			}
		},
		{
			decorations: (v) => v.decorations,
			eventHandlers: {
				click: (e: MouseEvent, view: EditorView) => {
					const target = (e.target as HTMLElement).closest('.at-date-highlight') as HTMLElement | null;
					if (target) {
						e.preventDefault();
						showDatePicker(target, view);
						return true;
					}
					return false;
				},
			},
		}
	);
}

class AtInserterSettingTab extends PluginSettingTab {
	plugin: AtInserterPlugin;

	constructor(app: App, plugin: AtInserterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Trigger symbol')
			.setDesc('Character that triggers the insertion menu (default: @)')
			.addText(text => text
				.setPlaceholder('@')
				.setValue(this.plugin.settings.triggerSymbol)
				.onChange(async (value) => {
					this.plugin.settings.triggerSymbol = value || '@';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Display date format')
			.setDesc('Format for dates shown in the suggestion popup (e.g. YYYY-MM-DD, DD/MM/YYYY, MMM DD YYYY). Inserted date is always YYYY-MM-DD.')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.displayDateFormat)
				.onChange(async (value) => {
					this.plugin.settings.displayDateFormat = value || 'YYYY-MM-DD';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Highlight dates')
			.setDesc('Render YYYY-MM-DD dates as highlighted pills in the editor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.highlightDates)
				.onChange(async (value) => {
					this.plugin.settings.highlightDates = value;
					await this.plugin.saveSettings();
				}));
	}
}

export default class AtInserterPlugin extends Plugin {
	settings: AtInserterSettings;
	dateHighlightExt: Extension[] = [];

	async onload() {
		await this.loadSettings();
		this.registerEditorSuggest(new DateSuggest(this));
		this.registerEditorExtension(this.dateHighlightExt);
		this.updateDateHighlight();
		this.addSettingTab(new AtInserterSettingTab(this.app, this));
	}

	updateDateHighlight() {
		this.dateHighlightExt.length = 0;
		if (this.settings.highlightDates) {
			this.dateHighlightExt.push(createDateHighlightPlugin(this.settings.displayDateFormat));
		}
		this.app.workspace.updateOptions();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<AtInserterSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateDateHighlight();
	}
}
