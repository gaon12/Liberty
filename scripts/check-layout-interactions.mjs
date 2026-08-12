import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

class TestClassList {
	constructor(element) {
		this.element = element;
		this.items = new Set();
	}

	add(...names) {
		for (const name of names) {
			this.items.add(name);
		}
		this.sync();
	}

	remove(...names) {
		for (const name of names) {
			this.items.delete(name);
		}
		this.sync();
	}

	contains(name) {
		return this.items.has(name);
	}

	toggle(name, force) {
		const shouldAdd = force ?? !this.items.has(name);
		if (shouldAdd) {
			this.items.add(name);
		} else {
			this.items.delete(name);
		}
		this.sync();
		return shouldAdd;
	}

	sync() {
		this.element.attributes.class = [...this.items].join(' ');
	}
}

class TestStyle {
	constructor() {
		this.values = new Map();
	}

	setProperty(name, value) {
		this.values.set(name, String(value));
	}

	removeProperty(name) {
		this.values.delete(name);
	}

	getPropertyValue(name) {
		return this.values.get(name) || '';
	}
}

class TestElement {
	constructor(tagName, { className = '', id = '' } = {}) {
		this.tagName = tagName.toUpperCase();
		this.attributes = {};
		this.children = [];
		this.parentNode = null;
		this.classList = new TestClassList(this);
		this.dataset = {};
		this.hidden = false;
		this.listeners = new Map();
		this.style = new TestStyle();

		if (className) {
			this.className = className;
		}
		if (id) {
			this.id = id;
		}
	}

	get className() {
		return this.attributes.class || '';
	}

	set className(value) {
		this.classList.items = new Set(String(value).split(/\s+/).filter(Boolean));
		this.classList.sync();
	}

	get id() {
		return this.attributes.id || '';
	}

	set id(value) {
		this.setAttribute('id', value);
	}

	append(...nodes) {
		for (const node of nodes) {
			node.parentNode = this;
			this.children.push(node);
		}
	}

	addEventListener(type, listener) {
		const listeners = this.listeners.get(type) || [];
		listeners.push(listener);
		this.listeners.set(type, listeners);
	}

	remove() {
		if (!this.parentNode) {
			return;
		}

		this.parentNode.children = this.parentNode.children.filter(
			(child) => child !== this,
		);
		this.parentNode = null;
	}

	setAttribute(name, value) {
		this.attributes[name] = String(value);
		if (name === 'class') {
			this.className = value;
		}
		if (name.startsWith('data-')) {
			const key = name
				.slice(5)
				.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
			this.dataset[key] = String(value);
		}
	}

	getAttribute(name) {
		return this.attributes[name] ?? null;
	}

	removeAttribute(name) {
		delete this.attributes[name];
		if (name.startsWith('data-')) {
			const key = name
				.slice(5)
				.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
			delete this.dataset[key];
		}
	}

	hasAttribute(name) {
		return Object.hasOwn(this.attributes, name);
	}

	querySelector(selector) {
		return this.querySelectorAll(selector)[0] || null;
	}

	querySelectorAll(selector) {
		const selectors = selector.split(',').map((item) => item.trim());
		const matches = [];
		const visit = (node) => {
			for (const child of node.children) {
				if (selectors.some((item) => child.matches(item))) {
					matches.push(child);
				}
				visit(child);
			}
		};
		visit(this);
		return matches;
	}

	matches(selector) {
		const excludedSelectors = [...selector.matchAll(/:not\(([^)]+)\)/g)].map(
			(match) => match[1],
		);
		if (excludedSelectors.length > 0) {
			const baseSelector = selector.replace(/:not\([^)]+\)/g, '');
			return (
				this.matches(baseSelector) &&
				excludedSelectors.every((excluded) => !this.matches(excluded))
			);
		}

		const attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
		if (attrMatch) {
			const [, name, value] = attrMatch;
			return value === undefined
				? this.hasAttribute(name)
				: this.getAttribute(name) === value;
		}
		if (selector.startsWith('.')) {
			return this.classList.contains(selector.slice(1));
		}
		if (selector.startsWith('#')) {
			return this.id === selector.slice(1);
		}
		const tagAttributeMatch = selector.match(/^([a-z][a-z0-9-]*)(\[.+\])$/i);
		if (tagAttributeMatch) {
			return (
				this.tagName.toLowerCase() === tagAttributeMatch[1].toLowerCase() &&
				this.matches(tagAttributeMatch[2])
			);
		}
		return this.tagName.toLowerCase() === selector.toLowerCase();
	}

	closest(selector) {
		const selectors = selector.split(',').map((item) => item.trim());
		let node = this;
		while (node) {
			if (selectors.some((item) => node.matches(item))) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	}

	contains(node) {
		let current = node;
		while (current) {
			if (current === this) {
				return true;
			}
			current = current.parentNode;
		}
		return false;
	}

	focus() {
		if (document.activeElement) {
			document.activeElement.focused = false;
		}
		this.focused = true;
		document.activeElement = this;
	}

	select() {
		this.selected = true;
	}
}

class TestDocument extends TestElement {
	constructor() {
		super('document');
		this.body = new TestElement('body');
		this.documentElement = new TestElement('html');
		this.documentElement.clientWidth = 1180;
		this.readyState = 'complete';
		this.listeners = new Map();
		this.append(this.body);
		this.activeElement = this.body;
	}

	createElement(tagName) {
		return new TestElement(tagName);
	}

	addEventListener(type, listener) {
		const listeners = this.listeners.get(type) || [];
		listeners.push(listener);
		this.listeners.set(type, listeners);
	}

	dispatch(type, event) {
		for (const listener of this.listeners.get(type) || []) {
			listener(event);
		}
	}

	getElementById(id) {
		return this.querySelector(`#${id}`);
	}
}

const document = new TestDocument();
const readyCallbacks = [];
let rootScrollbarGutter = 'auto';
const context = {
	document,
	console,
	getComputedStyle: () => ({ scrollbarGutter: rootScrollbarGutter }),
	mw: {
		cookie: { set: () => {} },
		message: (key) => ({ text: () => key }),
	},
	window: {
		clearTimeout,
		innerWidth: 1200,
		matchMedia: () => ({ matches: true }),
		PointerEvent: function PointerEvent() {},
		requestAnimationFrame: (callback) => callback(),
		scrollTo: () => {},
		setTimeout: (callback) => callback(),
	},
};

context.whale = {
	closest: (target, selector) => target.closest(selector),
	getNavHeight: () => 0,
	rafThrottle: (callback) => callback,
	ready: (callback) => readyCallbacks.push(callback),
	scrollToTarget: () => {},
};
context.window.whale = context.whale;
document.body.classList.add(
	'whale-content-skeleton-enabled',
	'whale-content-skeleton-loading',
);

const container = new TestElement('div', {
	className: 'whale-section-container is-collapsed',
});
const heading = new TestElement('h2', {
	className: 'whale-section-heading is-collapsed',
});
const toggle = new TestElement('button', {
	className: 'whale-section-toggle',
});
toggle.setAttribute('aria-controls', 'section-body');
toggle.setAttribute('aria-expanded', 'false');
toggle.setAttribute('data-expand-label', 'Expand');
toggle.setAttribute('data-collapse-label', 'Collapse');
const body = new TestElement('div', { id: 'section-body' });
body.hidden = true;
const headline = new TestElement('span', { className: 'mw-headline' });
const editSection = new TestElement('span', { className: 'mw-editsection' });
const editLink = new TestElement('a');
headline.textContent = 'Heading';
editSection.append(editLink);
heading.append(toggle, headline, editSection);
container.append(heading, body);
document.body.append(container);

const searchInput = new TestElement('input', { id: 'searchInput' });
const editorInput = new TestElement('input');
document.body.append(searchInput, editorInput);

const modalTrigger = new TestElement('button');
modalTrigger.setAttribute('data-whale-toggle', 'modal');
modalTrigger.setAttribute('data-whale-target', '#test-modal');
const modal = new TestElement('div', {
	className: 'whale-modal',
	id: 'test-modal',
});
const modalDialog = new TestElement('div', { className: 'whale-modal-dialog' });
const modalAutofocus = new TestElement('h2');
modalAutofocus.setAttribute('tabindex', '-1');
modalAutofocus.setAttribute('data-whale-modal-autofocus', '');
const modalDismiss = new TestElement('button');
modalDismiss.setAttribute('data-whale-dismiss', 'modal');
const modalJump = new TestElement('a');
modalJump.setAttribute('href', '#reference-target');
modalDialog.append(modalAutofocus, modalDismiss, modalJump);
modal.append(modalDialog);
const replacementTrigger = new TestElement('button');
replacementTrigger.setAttribute('data-whale-toggle', 'modal');
replacementTrigger.setAttribute('data-whale-target', '#replacement-modal');
const replacementModal = new TestElement('div', {
	className: 'whale-modal',
	id: 'replacement-modal',
});
const replacementDialog = new TestElement('div', {
	className: 'whale-modal-dialog',
});
const replacementDismiss = new TestElement('button');
replacementDismiss.setAttribute('data-whale-dismiss', 'modal');
replacementDialog.append(replacementDismiss);
replacementModal.append(replacementDialog);
document.body.append(modalTrigger, modal, replacementTrigger, replacementModal);

runInNewContext(readFileSync(resolve('js/layout.js'), 'utf8'), context);
for (const callback of readyCallbacks) {
	callback();
}

if (document.body.classList.contains('whale-content-skeleton-loading')) {
	throw new Error('Content skeleton loading state should clear after ready.');
}

document.dispatch('click', {
	target: toggle,
	preventDefault: () => {},
});

if (body.hidden) {
	throw new Error('Section body should become visible after clicking toggle.');
}

if (
	toggle.getAttribute('aria-expanded') !== 'true' ||
	toggle.getAttribute('aria-label') !== 'Collapse'
) {
	throw new Error('Section toggle ARIA state should switch to expanded.');
}

if (
	heading.classList.contains('is-collapsed') ||
	container.classList.contains('is-collapsed')
) {
	throw new Error(
		'Section heading and container should clear collapsed state.',
	);
}

document.dispatch('click', {
	target: toggle,
	preventDefault: () => {},
});

if (
	!body.hidden ||
	toggle.getAttribute('aria-expanded') !== 'false' ||
	!heading.classList.contains('is-collapsed') ||
	!container.classList.contains('is-collapsed')
) {
	throw new Error(
		'Section toggle should collapse body, heading, and container.',
	);
}

document.dispatch('pointerup', {
	target: toggle,
	pointerType: 'touch',
	preventDefault: () => {},
	stopPropagation: () => {},
});

if (
	body.hidden ||
	toggle.getAttribute('aria-expanded') !== 'true' ||
	heading.classList.contains('is-collapsed') ||
	container.classList.contains('is-collapsed')
) {
	throw new Error('Touch pointerup should expand the section immediately.');
}

document.dispatch('click', {
	target: toggle,
	preventDefault: () => {},
});

if (body.hidden || toggle.getAttribute('aria-expanded') !== 'true') {
	throw new Error(
		'Synthetic click after touch pointerup should be suppressed.',
	);
}

document.dispatch('click', {
	target: headline,
	preventDefault: () => {},
});

if (
	!body.hidden ||
	toggle.getAttribute('aria-expanded') !== 'false' ||
	!heading.classList.contains('is-collapsed') ||
	!container.classList.contains('is-collapsed')
) {
	throw new Error('Clicking the section heading should collapse the section.');
}

document.dispatch('click', {
	target: editLink,
	preventDefault: () => {
		throw new Error('Section edit links should keep their default behavior.');
	},
});

if (
	!body.hidden ||
	toggle.getAttribute('aria-expanded') !== 'false' ||
	!heading.classList.contains('is-collapsed') ||
	!container.classList.contains('is-collapsed')
) {
	throw new Error('Section edit links should not toggle the section.');
}

document.dispatch('click', {
	target: modalTrigger,
	preventDefault: () => {},
	stopPropagation: () => {},
});

if (
	!document.body.classList.contains('whale-modal-open') ||
	document.body.style.getPropertyValue('--whale-modal-scrollbar-offset') !==
		'20px'
) {
	throw new Error('Opening a modal should reserve the scrollbar width.');
}

if (!modalAutofocus.focused) {
	throw new Error('Opening a modal should honor its explicit focus target.');
}

const assertModalTabFocus = ({ from, to, shiftKey, description }) => {
	from.focus();
	let prevented = false;
	document.dispatch('keydown', {
		target: from,
		key: 'Tab',
		defaultPrevented: false,
		metaKey: false,
		ctrlKey: false,
		shiftKey,
		altKey: false,
		preventDefault: () => {
			prevented = true;
		},
	});

	if (!prevented || document.activeElement !== to) {
		throw new Error(description);
	}
};

assertModalTabFocus({
	from: modalAutofocus,
	to: modalDismiss,
	shiftKey: false,
	description:
		'Tab from a non-tabbable modal autofocus target should move to the first focusable element.',
});
assertModalTabFocus({
	from: modalAutofocus,
	to: modalJump,
	shiftKey: true,
	description:
		'Shift+Tab from a non-tabbable modal autofocus target should move to the last focusable element.',
});
assertModalTabFocus({
	from: modalDismiss,
	to: modalJump,
	shiftKey: true,
	description:
		'Shift+Tab from the first modal control should wrap to the last control.',
});
assertModalTabFocus({
	from: modalJump,
	to: modalDismiss,
	shiftKey: false,
	description:
		'Tab from the last modal control should wrap to the first control.',
});

document.dispatch('click', {
	target: replacementTrigger,
	preventDefault: () => {},
	stopPropagation: () => {},
});

if (
	modal.style.display !== 'none' ||
	modal.getAttribute('aria-hidden') !== 'true' ||
	replacementModal.style.display !== 'block'
) {
	throw new Error(
		'Replacing a modal should immediately hide the previous one.',
	);
}

document.dispatch('click', {
	target: replacementDismiss,
	preventDefault: () => {},
});

if (
	document.body.classList.contains('whale-modal-open') ||
	document.body.style.getPropertyValue('--whale-modal-scrollbar-offset') !== ''
) {
	throw new Error('Closing a modal should clear scrollbar compensation.');
}

if (!modalTrigger.focused || replacementTrigger.focused) {
	throw new Error(
		'Replacing a modal should preserve the original focus return target.',
	);
}

modalTrigger.focused = false;
document.dispatch('click', {
	target: modalTrigger,
	preventDefault: () => {},
	stopPropagation: () => {},
});
document.dispatch('whale:closeModal', {
	detail: { modal, restoreFocus: false },
});

if (modalTrigger.focused || modal.style.display !== 'none') {
	throw new Error(
		'Programmatic modal close should support suppressing focus restoration.',
	);
}

rootScrollbarGutter = 'stable';
document.dispatch('click', {
	target: modalTrigger,
	preventDefault: () => {},
	stopPropagation: () => {},
});

if (
	document.body.style.getPropertyValue('--whale-modal-scrollbar-offset') !== '0'
) {
	throw new Error(
		'A stable root scrollbar gutter should not receive duplicate modal compensation.',
	);
}

document.dispatch('whale:closeModal', {
	detail: { modal, restoreFocus: false },
});

let searchPrevented = false;
document.dispatch('keydown', {
	target: document.body,
	key: '/',
	defaultPrevented: false,
	metaKey: false,
	ctrlKey: false,
	shiftKey: false,
	altKey: false,
	preventDefault: () => {
		searchPrevented = true;
	},
});

if (!searchPrevented || !searchInput.focused || !searchInput.selected) {
	throw new Error('Slash shortcut should focus and select the search input.');
}

searchInput.focused = false;
searchInput.selected = false;
document.dispatch('keydown', {
	target: editorInput,
	key: '/',
	defaultPrevented: false,
	metaKey: false,
	ctrlKey: false,
	shiftKey: false,
	altKey: false,
	preventDefault: () => {
		throw new Error('Slash typed in a form field should remain untouched.');
	},
});

if (searchInput.focused || searchInput.selected) {
	throw new Error('Slash typed in a form field should not focus search.');
}
