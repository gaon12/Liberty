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
			if (name) {
				this.items.add(name);
			}
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

class TestElement {
	constructor(tagName, options = {}) {
		this.tagName = tagName.toUpperCase();
		this.attributes = {};
		this.children = [];
		this.parentNode = null;
		this.eventListeners = new Map();
		this.style = {};
		this.top = options.top || 0;
		this.hidden = Boolean(options.hidden);
		this.classList = new TestClassList(this);
		this.ownText = '';
		this.focused = false;

		if (options.id) {
			this.setAttribute('id', options.id);
		}
		if (options.className) {
			this.className = options.className;
		}
		if (options.text) {
			this.textContent = options.text;
		}
	}

	focus() {
		this.focused = true;
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

	get textContent() {
		return `${this.ownText}${this.children
			.map((child) => child.textContent)
			.join('')}`;
	}

	set textContent(value) {
		this.ownText = String(value);
		this.children = [];
	}

	append(...nodes) {
		for (const node of nodes) {
			node.parentNode = this;
			this.children.push(node);
		}
	}

	appendChild(node) {
		this.append(node);
		return node;
	}

	insertBefore(node, reference) {
		node.parentNode = this;
		const index = this.children.indexOf(reference);
		if (index === -1) {
			this.children.push(node);
		} else {
			this.children.splice(index, 0, node);
		}
		return node;
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
	}

	getAttribute(name) {
		return this.attributes[name] ?? null;
	}

	addEventListener(type, listener) {
		const listeners = this.eventListeners.get(type) || [];
		listeners.push(listener);
		this.eventListeners.set(type, listeners);
	}

	dispatch(type, event = {}) {
		for (const listener of this.eventListeners.get(type) || []) {
			listener({ target: this, ...event });
		}
	}

	contains(target) {
		if (target === this) {
			return true;
		}
		return this.children.some((child) => child.contains(target));
	}

	getBoundingClientRect() {
		return { top: this.top };
	}

	querySelector(selector) {
		return this.querySelectorAll(selector)[0] || null;
	}

	querySelectorAll(selector) {
		const selectors = selector.split(',').map((item) => item.trim());
		const matches = [];
		const visit = (node) => {
			for (const child of node.children) {
				if (selectors.some((item) => child.matchesSimpleSelector(item))) {
					matches.push(child);
				}
				visit(child);
			}
		};
		visit(this);
		return matches;
	}

	matchesSimpleSelector(selector) {
		if (selector.startsWith('.')) {
			return this.classList.contains(selector.slice(1));
		}
		if (selector.startsWith('#')) {
			return this.id === selector.slice(1);
		}
		return this.tagName.toLowerCase() === selector.toLowerCase();
	}

	matches(selector) {
		return selector
			.split(',')
			.map((item) => item.trim())
			.some((item) => this.matchesSimpleSelector(item));
	}

	closest(selector) {
		let node = this;
		while (node) {
			if (node.matches(selector)) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	}

	cloneNode(deep) {
		const clone = new TestElement(this.tagName, {
			className: this.className,
			id: this.id,
			text: this.ownText,
			top: this.top,
			hidden: this.hidden,
		});
		clone.attributes = { ...this.attributes };
		clone.className = this.className;
		if (deep) {
			for (const child of this.children) {
				clone.append(child.cloneNode(true));
			}
		}
		return clone;
	}
}

class TestDocument extends TestElement {
	constructor() {
		super('document');
		this.body = new TestElement('body');
		this.documentElement = new TestElement('html');
		this.documentElement.scrollHeight = 2000;
		this.append(this.body);
	}

	createElement(tagName) {
		return new TestElement(tagName);
	}

	querySelectorAll(selector) {
		if (selector.includes('.whale-content-main h')) {
			const content = this.querySelector('.whale-content-main');
			return content
				? content
						.querySelectorAll('h1,h2,h3,h4,h5,h6')
						.filter((heading) => /^H[1-6]$/.test(heading.tagName))
				: [];
		}
		if (selector.includes('#toc li > a')) {
			const toc = this.querySelector('#toc');
			return toc ? toc.querySelectorAll('a') : [];
		}
		return this.body.querySelectorAll(selector);
	}

	querySelector(selector) {
		if (selector === 'body') {
			return this.body;
		}
		return this.body.querySelector(selector);
	}

	getElementById(id) {
		return this.querySelector(`#${id}`);
	}
}

const read = (path) => readFileSync(resolve(path), 'utf8');

const createHeading = (tagName, title, top) => {
	const heading = new TestElement(tagName, { top });
	const label = new TestElement('span', {
		className: 'mw-headline',
		text: title,
	});
	label.setAttribute('id', title.toLowerCase());
	heading.append(label);
	return heading;
};

const createTocLink = ({ href, number, text, level }) => {
	const item = new TestElement('li', { className: `toclevel-${level}` });
	const link = new TestElement('a');
	link.setAttribute('href', href);
	link.append(
		new TestElement('span', { className: 'tocnumber', text: number }),
		new TestElement('span', { className: 'toctext', text }),
	);
	item.append(link);
	return item;
};

const createContext = ({ desktop, targetByHref = {} }) => {
	const document = new TestDocument();
	const readyCallbacks = [];
	const windowListeners = new Map();
	const documentListeners = new Map();

	document.addEventListener = (type, listener) => {
		const listeners = documentListeners.get(type) || [];
		listeners.push(listener);
		documentListeners.set(type, listeners);
	};
	document.dispatchEvent = (event) => {
		for (const listener of documentListeners.get(event.type) || []) {
			listener(event);
		}
	};

	const context = {
		document,
		console,
		CustomEvent: class CustomEvent {
			constructor(type) {
				this.type = type;
			}
		},
		mw: {
			hook: () => ({ add: () => {} }),
			message: (key) => ({ text: () => key }),
		},
		window: {
			innerHeight: 900,
			innerWidth: desktop ? 1366 : 390,
			scrollY: 0,
			addEventListener: (type, listener) => {
				const listeners = windowListeners.get(type) || [];
				listeners.push(listener);
				windowListeners.set(type, listeners);
			},
			matchMedia: () => ({ matches: desktop }),
			requestAnimationFrame: (callback) => callback(),
		},
	};

	context.window.whale = {
		getAnchorTarget: (href) => targetByHref[href] || null,
		getNavHeight: () => 0,
		rafThrottle: (callback) => callback,
		ready: (callback) => readyCallbacks.push(callback),
		scrollToTarget: (target) => {
			context.scrolledTo = target;
		},
		tocUtils: null,
	};
	context.whale = context.window.whale;
	runInNewContext(read('js/toc-utils.js'), context);

	return { context, document, readyCallbacks };
};

const mountHeadings = (
	document,
	headings = [
		{ tagName: 'h2', title: 'Alpha section', top: 200, key: 'alpha' },
		{ tagName: 'h3', title: 'Beta child', top: 500, key: 'beta' },
	],
) => {
	const toolbar = new TestElement('div', { id: 'whale-bottombtn' });
	const scrollToc = new TestElement('button', { id: 'whale-scrolltoc' });
	toolbar.append(scrollToc);
	const content = new TestElement('main', { className: 'whale-content-main' });
	const mountedHeadings = {};
	for (const heading of headings) {
		const node = createHeading(heading.tagName, heading.title, heading.top);
		mountedHeadings[heading.key] = node;
		content.append(node);
	}
	document.body.append(toolbar, content);
	return { toolbar, scrollToc, ...mountedHeadings };
};

const runFloatingToc = ({ desktop, headings, tocItems }) => {
	const targetByHref = {};
	const env = createContext({ desktop, targetByHref });
	const { document, readyCallbacks } = env;
	const mounted = mountHeadings(document, headings);
	for (const node of Object.values(mounted)) {
		const id = node.querySelector?.('.mw-headline')?.id;
		if (id) {
			targetByHref[`#${id}`] = node.querySelector('.mw-headline');
		}
	}

	if (tocItems) {
		const toc = new TestElement('div', { id: 'toc' });
		const list = new TestElement('ol');
		for (const item of tocItems) {
			list.append(createTocLink(item));
		}
		toc.append(list);
		document.body.append(toc);
	}

	if (desktop) {
		document.body.classList.add('whale-floating-toc-enabled');
	} else {
		document.body.classList.add('whale-mobile-floating-toc-enabled');
	}

	runInNewContext(read('js/index-button.js'), env.context);
	for (const callback of readyCallbacks) {
		callback();
	}

	return { ...env, ...mounted };
};

const desktopRun = runFloatingToc({ desktop: true });
const desktopToc = desktopRun.document.querySelector('.whale-floating-toc');
if (!desktopToc) {
	throw new Error('Desktop floating TOC should render from headings.');
}

const desktopLabels = desktopToc
	.querySelectorAll('a')
	.map((anchor) => anchor.textContent);
if (desktopLabels.join('|') !== '1. Alpha section|1.1 Beta child') {
	throw new Error(`Unexpected desktop TOC labels: ${desktopLabels.join('|')}`);
}

if (
	desktopRun.alpha.querySelector('.whale-heading-number')?.textContent !== '1. '
) {
	throw new Error('Top-level heading should receive a visible section number.');
}

if (
	desktopRun.beta.querySelector('.whale-heading-number')?.textContent !== '1.1 '
) {
	throw new Error('Nested heading should receive a dotted section number.');
}

desktopToc.dispatch('pointerover', { target: desktopToc });
if (!desktopRun.document.body.classList.contains('whale-floating-toc-hover')) {
	throw new Error('Desktop TOC hover should reveal floating TOC labels.');
}

desktopRun.toolbar.dispatch('pointerenter', { target: desktopRun.toolbar });
if (
	desktopRun.document.body.classList.contains(
		'whale-floating-toc-toolbar-hover',
	)
) {
	throw new Error(
		'Toolbar hover should not reintroduce legacy TOC hover state.',
	);
}

if (!desktopRun.document.body.classList.contains('whale-floating-toc-hover')) {
	throw new Error('Toolbar hover should not hide already revealed TOC labels.');
}

const mobileRun = runFloatingToc({ desktop: false });
const mobileToc = mobileRun.document.querySelector('.whale-floating-toc');
const backdrop = mobileRun.document.querySelector(
	'.whale-floating-toc-backdrop',
);
if (!mobileToc?.classList.contains('is-mobile') || !backdrop) {
	throw new Error(
		'Mobile floating TOC should render as a drawer with backdrop.',
	);
}

if (
	mobileToc.getAttribute('aria-hidden') !== 'true' ||
	mobileToc.inert !== true ||
	backdrop.hidden !== true
) {
	throw new Error('Mobile floating TOC should start closed.');
}

mobileRun.document.dispatchEvent({
	type: 'touchstart',
	target: mobileRun.document.body,
	touches: [{ clientX: 384, clientY: 240 }],
});
mobileRun.document.dispatchEvent({
	type: 'touchmove',
	target: mobileRun.document.body,
	touches: [{ clientX: 320, clientY: 246 }],
});
if (!mobileRun.document.body.classList.contains('whale-floating-toc-open')) {
	throw new Error('Mobile edge swipe should open the TOC drawer.');
}

mobileRun.document.dispatchEvent({
	type: 'touchstart',
	target: mobileToc,
	touches: [{ clientX: 300, clientY: 240 }],
});
mobileRun.document.dispatchEvent({
	type: 'touchmove',
	target: mobileToc,
	touches: [{ clientX: 360, clientY: 246 }],
});
if (mobileRun.document.body.classList.contains('whale-floating-toc-open')) {
	throw new Error('Mobile swipe right inside the drawer should close it.');
}

mobileRun.document.dispatchEvent(
	new mobileRun.context.CustomEvent('whale:toggleFloatingToc'),
);
if (!mobileRun.document.body.classList.contains('whale-floating-toc-open')) {
	throw new Error('Mobile TOC custom event should open the drawer.');
}

if (
	mobileToc.getAttribute('aria-hidden') !== 'false' ||
	mobileToc.inert !== false ||
	backdrop.hidden !== false
) {
	throw new Error(
		'Mobile TOC drawer should expose itself and backdrop when open.',
	);
}

const mobileTocLink = mobileToc.querySelector('a');
mobileRun.document.activeElement = mobileTocLink;
mobileTocLink.dispatch('click', {
	preventDefault: () => {},
});
if (
	mobileRun.document.body.classList.contains('whale-floating-toc-open') ||
	mobileToc.getAttribute('aria-hidden') !== 'true' ||
	mobileToc.inert !== true ||
	backdrop.hidden !== true ||
	!mobileRun.scrollToc.focused ||
	mobileRun.context.scrolledTo !== mobileRun.alpha
) {
	throw new Error('Mobile TOC links should close the drawer and scroll.');
}

mobileRun.document.dispatchEvent(
	new mobileRun.context.CustomEvent('whale:toggleFloatingToc'),
);
let escapePrevented = false;
mobileRun.document.dispatchEvent({
	type: 'keydown',
	key: 'Escape',
	preventDefault: () => {
		escapePrevented = true;
	},
});
if (
	!escapePrevented ||
	mobileRun.document.body.classList.contains('whale-floating-toc-open') ||
	mobileToc.getAttribute('aria-hidden') !== 'true' ||
	mobileToc.inert !== true ||
	backdrop.hidden !== true
) {
	throw new Error('Escape should close the open mobile TOC drawer.');
}

const singleHeadingRun = runFloatingToc({
	desktop: true,
	headings: [{ tagName: 'h2', title: 'Solo section', top: 200, key: 'solo' }],
});
const singleHeadingLabels = singleHeadingRun.document
	.querySelector('.whale-floating-toc')
	?.querySelectorAll('a')
	.map((anchor) => anchor.textContent);
if (singleHeadingLabels?.join('|') !== '1. Solo section') {
	throw new Error(
		`Single-heading pages should still render a TOC: ${singleHeadingLabels?.join('|')}`,
	);
}

const h3FirstRun = runFloatingToc({
	desktop: true,
	headings: [
		{
			tagName: 'h3',
			title: 'First nested-looking section',
			top: 200,
			key: 'first',
		},
		{ tagName: 'h4', title: 'Nested child', top: 500, key: 'child' },
	],
});
const h3FirstLabels = h3FirstRun.document
	.querySelector('.whale-floating-toc')
	?.querySelectorAll('a')
	.map((anchor) => anchor.textContent);
if (
	h3FirstLabels?.join('|') !==
	'1. First nested-looking section|1.1 Nested child'
) {
	throw new Error(
		`Fallback numbering should normalize skipped heading levels: ${h3FirstLabels?.join('|')}`,
	);
}

const tocBackedRun = runFloatingToc({
	desktop: true,
	headings: [
		{ tagName: 'h2', title: 'Toc parent', top: 200, key: 'parent' },
		{ tagName: 'h3', title: 'Toc child', top: 500, key: 'child' },
	],
	tocItems: [
		{ href: '#toc parent', number: '2', text: 'Wrong parent', level: 4 },
		{ href: '#toc child', number: '2.1', text: 'Wrong child', level: 5 },
	],
});
const tocBackedItems = tocBackedRun.document
	.querySelector('.whale-floating-toc')
	?.querySelectorAll('li');
const tocBackedLabels = tocBackedRun.document
	.querySelector('.whale-floating-toc')
	?.querySelectorAll('a')
	.map((anchor) => anchor.textContent);
if (tocBackedLabels?.join('|') !== '2. Toc parent|2.1 Toc child') {
	throw new Error(
		`TOC-backed labels should prefer real heading text: ${tocBackedLabels?.join('|')}`,
	);
}

if (
	!tocBackedItems?.[0]?.classList.contains('whale-floating-toc-level-1') ||
	!tocBackedItems?.[1]?.classList.contains('whale-floating-toc-level-2')
) {
	throw new Error(
		`TOC-backed levels should normalize from target headings: ${tocBackedItems
			?.map((item) => item.className)
			.join('|')}`,
	);
}
