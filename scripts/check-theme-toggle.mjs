import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

class TestClassList {
	constructor() {
		this.classes = new Set();
	}

	toggle(className, enabled) {
		if (enabled) {
			this.classes.add(className);
		} else {
			this.classes.delete(className);
		}
	}

	has(className) {
		return this.classes.has(className);
	}
}

class TestMeta {
	constructor(name) {
		this.name = name;
		this.content = '';
	}

	setAttribute(name, value) {
		if (name === 'content') {
			this.content = value;
		}
	}
}

class TestToggleButton {
	constructor() {
		this.attributes = {};
		this.isToggle = true;
	}

	setAttribute(name, value) {
		this.attributes[name] = value;
	}

	querySelector(selector) {
		if (selector !== '[data-whale-theme-toggle-label]') {
			return null;
		}

		return {
			replaceChildren: (node) => {
				this.label = node.textContent;
			},
		};
	}

	querySelectorAll(selector) {
		return selector === '.whale-theme-toggle-icon' ? [] : [];
	}
}

const source = readFileSync(resolve('js/theme-toggle.js'), 'utf8');
const bodyClassList = new TestClassList();
const metas = [
	new TestMeta('theme-color'),
	new TestMeta('msapplication-navbutton-color'),
];
const toggleButton = new TestToggleButton();
let storedCookie = null;
let clickHandler = null;

const context = {
	document: {
		body: { classList: bodyClassList },
		documentElement: { style: {} },
		addEventListener: (type, handler) => {
			if (type === 'click') {
				clickHandler = handler;
			}
		},
		createTextNode: (text) => ({ textContent: text }),
		querySelector: (selector) => (selector === '.Whale' ? {} : null),
		querySelectorAll: (selector) => {
			if (selector.includes('theme-color')) {
				return metas;
			}

			return selector === '[data-whale-theme-toggle]' ? [toggleButton] : [];
		},
	},
	getComputedStyle: () => ({
		getPropertyValue: (property) => {
			if (property !== '--whale-main-color') {
				return '';
			}

			return '#0b67d1';
		},
	}),
	location: { protocol: 'https:' },
	mw: {
		cookie: {
			get: () => storedCookie,
			set: (_name, value) => {
				storedCookie = value;
			},
		},
		message: (key) => ({
			text: () => key,
		}),
	},
	whale: {
		closest: (target, selector) =>
			selector === '[data-whale-theme-toggle]' && target?.isToggle
				? target
				: null,
		onMediaChange: () => {},
		ready: (callback) => callback(),
	},
	window: {
		localStorage: {
			getItem: () => null,
			setItem: () => {},
		},
		matchMedia: () => ({ matches: true }),
	},
};

runInNewContext(source, context);

if (!bodyClassList.has('whale-dark') || !bodyClassList.has('whale-auto-dark')) {
	throw new Error(
		'System dark mode should apply Whale dark and auto-dark classes.',
	);
}

if (context.document.documentElement.style.colorScheme !== 'dark') {
	throw new Error('System dark mode should set root color-scheme to dark.');
}

if (!metas.every((meta) => meta.content === '#0b67d1')) {
	throw new Error(
		'Browser theme metadata should follow the dark Whale palette.',
	);
}

clickHandler({
	preventDefault: () => {},
	target: toggleButton,
});

if (bodyClassList.has('whale-dark') || bodyClassList.has('whale-auto-dark')) {
	throw new Error(
		'Explicit light mode should remove dark and auto-dark classes.',
	);
}

if (context.document.documentElement.style.colorScheme !== 'light') {
	throw new Error('Explicit light mode should set root color-scheme to light.');
}

if (!metas.every((meta) => meta.content === '#0b67d1')) {
	throw new Error(
		'Browser theme metadata should return to the light Whale palette.',
	);
}
