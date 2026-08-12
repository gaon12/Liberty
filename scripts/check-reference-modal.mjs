import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const relationAttributes = [
	'id',
	'aria-labelledby',
	'aria-describedby',
	'aria-controls',
	'for',
];

const splitSelectors = (selector) =>
	selector.split(',').map((item) => item.trim());

const matchesSimpleSelector = (element, selector) => {
	if (selector === '*') {
		return true;
	}

	const tagMatch = selector.match(/^[a-z][a-z0-9-]*/i);
	if (tagMatch && element.tagName !== tagMatch[0].toUpperCase()) {
		return false;
	}

	for (const match of selector.matchAll(/#([\w-]+)/g)) {
		if (element.id !== match[1]) {
			return false;
		}
	}

	for (const match of selector.matchAll(/\.([\w-]+)/g)) {
		if (!element.classList.contains(match[1])) {
			return false;
		}
	}

	for (const match of selector.matchAll(
		/\[([^\]^=\s]+)(?:([\^]?=)["']?([^\]"']*)["']?)?\]/g,
	)) {
		const [, name, operator, expected] = match;
		if (!element.hasAttribute(name)) {
			return false;
		}
		if (operator === '=' && element.getAttribute(name) !== expected) {
			return false;
		}
		if (operator === '^=' && !element.getAttribute(name).startsWith(expected)) {
			return false;
		}
	}

	return Boolean(
		tagMatch ||
			selector.includes('#') ||
			selector.includes('.') ||
			selector.includes('['),
	);
};

const matchesSelector = (element, selector) => {
	const parts = selector.trim().split(/\s+/);
	let current = element;

	if (!matchesSimpleSelector(current, parts.at(-1))) {
		return false;
	}

	for (let index = parts.length - 2; index >= 0; index--) {
		current = current.parentElement;
		while (current && !matchesSimpleSelector(current, parts[index])) {
			current = current.parentElement;
		}
		if (!current) {
			return false;
		}
	}

	return true;
};

class TestClassList {
	constructor(element) {
		this.element = element;
		this.items = new Set();
	}

	contains(name) {
		return this.items.has(name);
	}

	set(value) {
		this.items = new Set(String(value).split(/\s+/).filter(Boolean));
		this.element.attributes.class = [...this.items].join(' ');
	}
}

class TestElement {
	constructor(tagName, { className = '', id = '' } = {}) {
		this.tagName = tagName.toUpperCase();
		this.attributes = {};
		this.children = [];
		this.parentNode = null;
		this.classList = new TestClassList(this);
		this._textContent = '';

		if (className) {
			this.setAttribute('class', className);
		}
		if (id) {
			this.id = id;
		}
	}

	get id() {
		return this.getAttribute('id') || '';
	}

	set id(value) {
		this.setAttribute('id', value);
	}

	get href() {
		return this.getAttribute('href') || '';
	}

	set href(value) {
		this.setAttribute('href', value);
	}

	get parentElement() {
		return this.parentNode instanceof TestElement ? this.parentNode : null;
	}

	get textContent() {
		return (
			this._textContent +
			this.children.map((child) => child.textContent).join('')
		);
	}

	set textContent(value) {
		this._textContent = String(value);
		this.replaceChildren();
	}

	append(...nodes) {
		for (const node of nodes) {
			if (node.parentNode) {
				node.parentNode.children = node.parentNode.children.filter(
					(child) => child !== node,
				);
			}
			node.parentNode = this;
			this.children.push(node);
		}
	}

	replaceChildren(...nodes) {
		for (const child of this.children) {
			child.parentNode = null;
		}
		this.children = [];
		this.append(...nodes);
	}

	setAttribute(name, value) {
		this.attributes[name] = String(value);
		if (name === 'class') {
			this.classList.set(value);
		}
	}

	getAttribute(name) {
		return this.attributes[name] ?? null;
	}

	hasAttribute(name) {
		return Object.hasOwn(this.attributes, name);
	}

	removeAttribute(name) {
		delete this.attributes[name];
		if (name === 'class') {
			this.classList.set('');
		}
	}

	matches(selector) {
		return splitSelectors(selector).some((item) => matchesSelector(this, item));
	}

	closest(selector) {
		let current = this;
		while (current) {
			if (current.matches(selector)) {
				return current;
			}
			current = current.parentElement;
		}
		return null;
	}

	querySelector(selector) {
		return this.querySelectorAll(selector)[0] || null;
	}

	querySelectorAll(selector) {
		const matches = [];
		const visit = (node) => {
			for (const child of node.children) {
				if (child.matches(selector)) {
					matches.push(child);
				}
				visit(child);
			}
		};
		visit(this);
		return matches;
	}

	cloneNode(deep = false) {
		const clone = new TestElement(this.tagName);
		for (const [name, value] of Object.entries(this.attributes)) {
			clone.setAttribute(name, value);
		}
		clone._textContent = this._textContent;
		if (deep) {
			clone.append(...this.children.map((child) => child.cloneNode(true)));
		}
		return clone;
	}
}

class TestDocument extends TestElement {
	constructor() {
		super('document');
		this.body = new TestElement('body');
		this.listeners = new Map();
		this.events = [];
		this.append(this.body);
	}

	addEventListener(type, listener) {
		const listeners = this.listeners.get(type) || [];
		listeners.push(listener);
		this.listeners.set(type, listeners);
	}

	dispatchEvent(event) {
		this.events.push(event);
		for (const listener of this.listeners.get(event.type) || []) {
			listener(event);
		}
		return !event.defaultPrevented;
	}

	dispatchClick(target, overrides = {}) {
		let preventDefaultCalls = 0;
		const event = {
			type: 'click',
			target,
			button: 0,
			defaultPrevented: false,
			metaKey: false,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			preventDefault: () => {
				preventDefaultCalls++;
				event.defaultPrevented = true;
			},
			...overrides,
		};
		this.dispatchEvent(event);
		return { event, preventDefaultCalls };
	}

	getElementById(id) {
		return this.querySelector(`#${id}`);
	}
}

const appendText = (element, text) => {
	element._textContent = text;
	return element;
};

const setRelations = (element, suffix) => {
	element.id = `copied-${suffix}`;
	element.setAttribute('aria-labelledby', `label-${suffix}`);
	element.setAttribute('aria-describedby', `description-${suffix}`);
	element.setAttribute('aria-controls', `controls-${suffix}`);
	element.setAttribute('for', `field-${suffix}`);
};

const addReference = (
	document,
	{ marker, href, referenceClass, listClass, targetId, textClass },
) => {
	const markerContainer = new TestElement('sup', {
		className: referenceClass,
	});
	const link = new TestElement('a');
	link.setAttribute('href', href);
	const markerText = appendText(new TestElement('span'), `[${marker}]`);
	link.append(markerText);
	markerContainer.append(link);

	const list = new TestElement('ol', { className: listClass });
	const target = new TestElement('li', { id: targetId });
	const referenceText = new TestElement('span', { className: textClass });
	setRelations(referenceText, `${marker}-root`);
	const label = appendText(new TestElement('label'), `Footnote ${marker}`);
	setRelations(label, `${marker}-child`);
	referenceText.append(label);
	target.append(referenceText);
	list.append(target);
	document.body.append(markerContainer, list);

	return { label, link, markerText, referenceText, target };
};

const createHarness = ({ includeModal = true } = {}) => {
	const document = new TestDocument();
	const readyCallbacks = [];
	const messageCalls = [];
	const actionLog = [];
	let modal = null;
	let content = null;
	let title = null;
	let jump = null;

	if (includeModal) {
		modal = new TestElement('div', { id: 'whale-reference-modal' });
		title = new TestElement('h2');
		title.setAttribute('data-whale-reference-title', '');
		content = new TestElement('div');
		content.setAttribute('data-whale-reference-content', '');
		jump = new TestElement('a');
		jump.setAttribute('data-whale-reference-jump', '');
		jump.setAttribute('href', '#stale-reference');
		const jumpLabel = appendText(new TestElement('span'), 'Jump');
		jump.append(jumpLabel);
		modal.append(title, content, jump);
		document.body.append(modal);
	}

	const currentUrl = new URL('https://wiki.example/wiki/Page');
	const getAnchorTargetCalls = [];
	const whale = {
		closest: (target, selector) => target?.closest(selector) || null,
		getAnchorTarget: (href) => {
			getAnchorTargetCalls.push(href);
			return document.getElementById(href.replace(/^#/, ''));
		},
		ready: (callback) => readyCallbacks.push(callback),
		scrollToTarget: (target) => {
			actionLog.push({ action: 'scroll', target });
		},
	};
	const context = {
		CustomEvent: class CustomEvent {
			constructor(type, init = {}) {
				this.type = type;
				this.detail = init.detail;
				this.defaultPrevented = false;
			}
		},
		document,
		Element: TestElement,
		location: {
			href: currentUrl.href,
			origin: currentUrl.origin,
			pathname: currentUrl.pathname,
			search: currentUrl.search,
		},
		mw: {
			message: (...messageArguments) => ({
				text: (...textArguments) => {
					messageCalls.push({ messageArguments, textArguments });
					return `${messageArguments.join('|')}::${textArguments.join('|')}`;
				},
			}),
		},
		URL,
		whale,
		window: {
			location: {
				href: currentUrl.href,
				origin: currentUrl.origin,
				pathname: currentUrl.pathname,
				search: currentUrl.search,
			},
			whale,
		},
	};

	document.addEventListener('whale:closeModal', (event) => {
		actionLog.push({ action: 'close', event });
	});

	runInNewContext(
		readFileSync(resolve('js/reference-modal.js'), 'utf8'),
		context,
	);

	if (readyCallbacks.length !== 1) {
		throw new Error(
			'Reference modal should initialize once through whale.ready without mw.hook.',
		);
	}
	readyCallbacks[0]();

	return {
		actionLog,
		content,
		context,
		document,
		getAnchorTargetCalls,
		jump,
		messageCalls,
		modal,
		title,
	};
};

const assertCloneWasSanitized = (clone, original) => {
	if (
		!clone ||
		clone === original ||
		clone.textContent !== original.textContent
	) {
		throw new Error('Reference text should be deep-cloned into the modal.');
	}

	for (const element of [clone, ...clone.querySelectorAll('*')]) {
		for (const attribute of relationAttributes) {
			if (element.hasAttribute(attribute)) {
				throw new Error(
					`Cloned reference text should remove ${attribute} attributes.`,
				);
			}
		}
	}

	if (
		relationAttributes.some((attribute) => !original.hasAttribute(attribute))
	) {
		throw new Error('Sanitizing the clone should not mutate source footnotes.');
	}
};

const main = createHarness();
const legacy = addReference(main.document, {
	marker: '1',
	href: '#cite_note-legacy',
	referenceClass: 'reference',
	listClass: 'references',
	targetId: 'cite_note-legacy',
	textClass: 'reference-text',
});
const parsoid = addReference(main.document, {
	marker: '2',
	href: './Page#cite_note-parsoid',
	referenceClass: 'mw-ref',
	listClass: 'mw-references',
	targetId: 'cite_note-parsoid',
	textClass: 'mw-reference-text',
});

let openEventsBefore = main.document.events.filter(
	(event) => event.type === 'whale:openModal',
).length;
const legacyClick = main.document.dispatchClick(legacy.markerText);
if (legacyClick.preventDefaultCalls !== 1) {
	throw new Error('Legacy footnote links should open the modal.');
}

let openEvents = main.document.events.filter(
	(event) => event.type === 'whale:openModal',
);
if (
	openEvents.length !== openEventsBefore + 1 ||
	openEvents.at(-1).detail?.modal !== main.modal ||
	openEvents.at(-1).detail?.trigger !== legacy.link
) {
	throw new Error('Opening a footnote should dispatch the modal request.');
}
if (
	main.getAnchorTargetCalls.at(-1) !== '#cite_note-legacy' ||
	new URL(main.jump.getAttribute('href'), main.context.location.href).hash !==
		'#cite_note-legacy'
) {
	throw new Error('Legacy footnote target and jump URL should stay in sync.');
}
if (main.title.textContent !== 'whale-reference-title-numbered|1::') {
	throw new Error('Legacy marker should be interpolated into the modal title.');
}
assertCloneWasSanitized(main.content.children[0], legacy.referenceText);

openEventsBefore = openEvents.length;
const parsoidClick = main.document.dispatchClick(parsoid.markerText);
if (parsoidClick.preventDefaultCalls !== 1) {
	throw new Error('Parsoid relative footnote links should open the modal.');
}

openEvents = main.document.events.filter(
	(event) => event.type === 'whale:openModal',
);
if (
	openEvents.length !== openEventsBefore + 1 ||
	main.getAnchorTargetCalls.at(-1) !== '#cite_note-parsoid' ||
	main.content.children.length !== 1 ||
	new URL(main.jump.getAttribute('href'), main.context.location.href).hash !==
		'#cite_note-parsoid'
) {
	throw new Error(
		'Parsoid footnotes should replace stale content and update their target.',
	);
}
if (main.title.textContent !== 'whale-reference-title-numbered|2::') {
	throw new Error(
		'Parsoid marker should be interpolated into the modal title.',
	);
}
assertCloneWasSanitized(main.content.children[0], parsoid.referenceText);

if (
	main.messageCalls.length !== 2 ||
	main.messageCalls.some(
		(call) =>
			call.messageArguments.length !== 2 || call.textArguments.length !== 0,
	)
) {
	throw new Error(
		'Reference titles should pass the marker to mw.message(key, marker).text().',
	);
}

main.actionLog.length = 0;
const jumpChild = main.jump.children[0];
const jumpClick = main.document.dispatchClick(jumpChild);
if (
	jumpClick.preventDefaultCalls !== 1 ||
	main.actionLog.length !== 2 ||
	main.actionLog[0].action !== 'close' ||
	main.actionLog[0].event.detail?.modal !== main.modal ||
	main.actionLog[0].event.detail?.restoreFocus !== false ||
	main.actionLog[1].action !== 'scroll' ||
	main.actionLog[1].target !== parsoid.target
) {
	throw new Error(
		'Jump action should close without restoring focus before scrolling to the active footnote.',
	);
}

const fallbackCases = [];
const addFallbackLink = ({ href, referenceClass = 'reference', target }) => {
	const container = new TestElement('sup', { className: referenceClass });
	const link = appendText(new TestElement('a'), '[x]');
	link.setAttribute('href', href);
	container.append(link);
	main.document.body.append(container);
	if (target) {
		main.document.body.append(target);
	}
	fallbackCases.push(link);
	return link;
};

addFallbackLink({ href: 'https://other.example/wiki/Page#cite_note-legacy' });
addFallbackLink({ href: '/wiki/Other#cite_note-legacy' });
addFallbackLink({ href: '/wiki/Page?printable=yes#cite_note-legacy' });
addFallbackLink({ href: '#missing-note' });
addFallbackLink({
	href: '#cite_note-wrong-tag',
	target: new TestElement('div', { id: 'cite_note-wrong-tag' }),
});
addFallbackLink({
	href: '#cite_note-outside-list',
	target: new TestElement('li', { id: 'cite_note-outside-list' }),
});

const emptyList = new TestElement('ol', { className: 'references' });
const emptyTarget = new TestElement('li', { id: 'cite_note-without-text' });
emptyList.append(emptyTarget);
main.document.body.append(emptyList);
addFallbackLink({ href: '#cite_note-without-text' });

const ordinaryLink = appendText(new TestElement('a'), 'ordinary');
ordinaryLink.setAttribute('href', '#cite_note-legacy');
main.document.body.append(ordinaryLink);
fallbackCases.push(ordinaryLink);

openEventsBefore = main.document.events.filter(
	(event) => event.type === 'whale:openModal',
).length;
for (const link of fallbackCases) {
	if (main.document.dispatchClick(link).preventDefaultCalls !== 0) {
		throw new Error(
			'Invalid reference links should retain default navigation.',
		);
	}
}

const modifiedClicks = [
	{ button: 1 },
	{ ctrlKey: true },
	{ metaKey: true },
	{ shiftKey: true },
	{ altKey: true },
	{ defaultPrevented: true },
];
for (const overrides of modifiedClicks) {
	if (
		main.document.dispatchClick(legacy.link, overrides).preventDefaultCalls !==
		0
	) {
		throw new Error(
			'Modified reference clicks should retain browser behavior.',
		);
	}
}

if (
	main.document.events.filter((event) => event.type === 'whale:openModal')
		.length !== openEventsBefore
) {
	throw new Error('Fallback clicks should not request the reference modal.');
}

const withoutModal = createHarness({ includeModal: false });
const missingModalReference = addReference(withoutModal.document, {
	marker: '3',
	href: '#cite_note-missing-modal',
	referenceClass: 'reference',
	listClass: 'references',
	targetId: 'cite_note-missing-modal',
	textClass: 'reference-text',
});
if (
	withoutModal.document.dispatchClick(missingModalReference.link)
		.preventDefaultCalls !== 0 ||
	withoutModal.document.events.some((event) => event.type === 'whale:openModal')
) {
	throw new Error(
		'Missing modal markup should fail safely and preserve default navigation.',
	);
}
