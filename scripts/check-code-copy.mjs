import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const splitSelectors = (selector) =>
	selector.split(',').map((item) => item.trim());

const matchesSimpleSelector = (element, selector) => {
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

	return Boolean(tagMatch || selector.includes('#') || selector.includes('.'));
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

	add(...names) {
		for (const name of names) {
			this.items.add(name);
		}
		this.syncAttribute();
	}

	contains(name) {
		return this.items.has(name);
	}

	set(value) {
		this.items = new Set(String(value).split(/\s+/).filter(Boolean));
		this.syncAttribute();
	}

	syncAttribute() {
		this.element.attributes.class = [...this.items].join(' ');
	}
}

class TestElement {
	constructor(tagName, { className = '', id = '', textContent = '' } = {}) {
		this.tagName = tagName.toUpperCase();
		this.attributes = {};
		this.children = [];
		this.parentNode = null;
		this.dataset = {};
		this.classList = new TestClassList(this);
		this._textContent = String(textContent);

		if (className) {
			this.className = className;
		}
		if (id) {
			this.id = id;
		}
	}

	get ariaLabel() {
		return this.getAttribute('aria-label') || '';
	}

	set ariaLabel(value) {
		this.setAttribute('aria-label', value);
	}

	get className() {
		return this.getAttribute('class') || '';
	}

	set className(value) {
		this.setAttribute('class', value);
	}

	get id() {
		return this.getAttribute('id') || '';
	}

	set id(value) {
		this.setAttribute('id', value);
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

	get type() {
		return this.getAttribute('type') || '';
	}

	set type(value) {
		this.setAttribute('type', value);
	}

	append(...nodes) {
		for (const node of nodes) {
			this.detach(node);
			node.parentNode = this;
			this.children.push(node);
		}
	}

	prepend(...nodes) {
		for (const node of [...nodes].reverse()) {
			this.detach(node);
			node.parentNode = this;
			this.children.unshift(node);
		}
	}

	insertBefore(node, referenceNode) {
		const referenceIndex = this.children.indexOf(referenceNode);
		if (referenceIndex === -1) {
			throw new Error('insertBefore reference node is not a child.');
		}

		this.detach(node);
		node.parentNode = this;
		this.children.splice(referenceIndex, 0, node);
		return node;
	}

	detach(node) {
		if (!node.parentNode) {
			return;
		}

		node.parentNode.children = node.parentNode.children.filter(
			(child) => child !== node,
		);
		node.parentNode = null;
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
}

class TestDocument extends TestElement {
	constructor() {
		super('document');
		this.body = new TestElement('body');
		this.listeners = new Map();
		this.append(this.body);
	}

	createElement(tagName) {
		return new TestElement(tagName);
	}

	getElementById(id) {
		return this.querySelector(`#${id}`);
	}

	addEventListener(type, listener) {
		const listeners = this.listeners.get(type) || [];
		listeners.push(listener);
		this.listeners.set(type, listeners);
	}

	async dispatchClick(target) {
		const event = {
			type: 'click',
			target,
			defaultPrevented: false,
			preventDefault() {
				this.defaultPrevented = true;
			},
		};

		for (const listener of this.listeners.get('click') || []) {
			await listener(event);
		}
		return event;
	}
}

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

const document = new TestDocument();
const content = new TestElement('main', { id: 'mw-content-text' });
const plainContainer = new TestElement('section');
const plainPre = new TestElement('pre', {
	textContent: 'const answer = 42;\nconsole.log(answer);',
});
plainContainer.append(plainPre);

const highlight = new TestElement('div', { className: 'mw-highlight' });
const highlightedPre = new TestElement('pre', {
	textContent: 'printf "highlighted\\n";',
});
highlight.append(highlightedPre);
content.append(plainContainer, highlight);
document.body.append(content);

const readyCallbacks = [];
const hookCallbacks = [];
const copyResults = [];
const copiedTexts = [];
const timers = [];
let nextTimerId = 1;

const setTimeout = (callback, delay) => {
	const id = nextTimerId++;
	timers.push({ callback, delay, id });
	return id;
};

const whale = {
	closest: (target, selector) => target?.closest(selector) || null,
	copyText: async (text) => {
		copiedTexts.push(text);
		const result = copyResults.shift();
		if (result instanceof Error) {
			throw result;
		}
		return result;
	},
	ready: (callback) => readyCallbacks.push(callback),
};

const mw = {
	hook: (name) => {
		assert(
			name === 'wikipage.content',
			'Code copy should only subscribe to the wikipage.content hook.',
		);
		return {
			add: (callback) => hookCallbacks.push(callback),
		};
	},
	message: (key) => ({ text: () => key }),
	msg: (key) => key,
};

runInNewContext(readFileSync(resolve('js/code-copy.js'), 'utf8'), {
	console,
	document,
	mw,
	setTimeout,
	whale,
	window: { setTimeout },
});

assert(
	readyCallbacks.length === 1,
	'Code copy should initialize through whale.ready exactly once.',
);
for (const callback of readyCallbacks) {
	await callback();
}

const plainWrapper = plainPre.parentElement;
assert(
	plainWrapper !== plainContainer &&
		plainWrapper?.classList.contains('whale-code-block'),
	'A plain pre should be wrapped in a new .whale-code-block element.',
);
assert(
	plainWrapper.parentElement === plainContainer &&
		plainContainer.children[0] === plainWrapper,
	'The new code wrapper should replace the pre at its original position.',
);

const plainButton = plainWrapper.querySelector('.whale-code-copy');
assert(
	plainButton &&
		plainWrapper.children[0] === plainButton &&
		plainWrapper.children[1] === plainPre,
	'The copy button should be prepended before the plain pre.',
);
assert(
	plainButton.type === 'button' &&
		plainButton.textContent === 'whale-code-copy' &&
		plainButton.getAttribute('aria-label') === 'whale-code-copy' &&
		plainButton.getAttribute('aria-live') === 'polite',
	'The copy button should have the expected type, message, and live-region attributes.',
);
assert(
	plainPre.dataset.whaleCodeCopyReady === 'true',
	'Prepared pre elements should carry the idempotency marker.',
);

assert(
	highlightedPre.parentElement === highlight &&
		highlight.classList.contains('mw-highlight') &&
		highlight.classList.contains('whale-code-block'),
	'An existing .mw-highlight container should be reused as the code wrapper.',
);
const highlightButton = highlight.querySelector('.whale-code-copy');
assert(
	highlightButton && highlight.children[0] === highlightButton,
	'The reused highlight container should receive a prepended copy button.',
);

assert(
	hookCallbacks.length === 1,
	'Code copy should register one wikipage.content hook callback.',
);
hookCallbacks[0]([content]);
assert(
	plainWrapper.querySelectorAll('.whale-code-copy').length === 1 &&
		highlight.querySelectorAll('.whale-code-copy').length === 1 &&
		plainPre.parentElement === plainWrapper &&
		highlightedPre.parentElement === highlight,
	'Reprocessing content should not create duplicate wrappers or buttons.',
);

const dynamicContainer = new TestElement('section');
const dynamicPre = new TestElement('pre', {
	textContent: 'dynamic hook content',
});
dynamicContainer.append(dynamicPre);
document.body.append(dynamicContainer);
hookCallbacks[0]([dynamicPre]);
const dynamicWrapper = dynamicPre.parentElement;
assert(
	dynamicWrapper !== dynamicContainer &&
		dynamicWrapper?.classList.contains('whale-code-block') &&
		dynamicWrapper.querySelector('.whale-code-copy'),
	'The hook should prepare a pre passed directly as its content root.',
);

const dynamicButton = dynamicWrapper.querySelector('.whale-code-copy');
const originalPlainText = plainPre.textContent;
copyResults.push(true);
await document.dispatchClick(plainButton);
assert(
	copiedTexts.at(-1) === originalPlainText &&
		!copiedTexts.at(-1).includes('whale-code-copy'),
	'Copying should use only pre.textContent, excluding the button label.',
);
assert(
	plainButton.textContent === 'whale-code-copied' &&
		plainButton.getAttribute('aria-label') === 'whale-code-copied',
	'A successful copy should update both visible and accessible labels.',
);
assert(
	timers.at(-1)?.delay === 2000,
	'Copy feedback should be restored after 2000 milliseconds.',
);
timers.shift().callback();
assert(
	plainButton.textContent === 'whale-code-copy' &&
		plainButton.getAttribute('aria-label') === 'whale-code-copy',
	'Success feedback should restore both original labels.',
);

copyResults.push(false);
await document.dispatchClick(highlightButton);
assert(
	highlightButton.textContent === 'whale-code-copy-failed' &&
		highlightButton.getAttribute('aria-label') === 'whale-code-copy-failed',
	'A false copy result should show accessible failure feedback.',
);
assert(
	timers.at(-1)?.delay === 2000,
	'False-result feedback should use the standard restoration delay.',
);
timers.shift().callback();
assert(
	highlightButton.textContent === 'whale-code-copy' &&
		highlightButton.getAttribute('aria-label') === 'whale-code-copy',
	'False-result feedback should restore both original labels.',
);

copyResults.push(new Error('Clipboard rejected the write.'));
await document.dispatchClick(dynamicButton);
assert(
	dynamicButton.textContent === 'whale-code-copy-failed' &&
		dynamicButton.getAttribute('aria-label') === 'whale-code-copy-failed',
	'A rejected copy should be caught and show accessible failure feedback.',
);
assert(
	timers.at(-1)?.delay === 2000,
	'Rejection feedback should use the standard restoration delay.',
);
timers.shift().callback();
assert(
	dynamicButton.textContent === 'whale-code-copy' &&
		dynamicButton.getAttribute('aria-label') === 'whale-code-copy',
	'Rejection feedback should restore both original labels.',
);

assert(
	timers.length === 0,
	'All copy feedback timers should be accounted for by the test.',
);
