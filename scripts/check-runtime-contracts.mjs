import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const context = {
	document: {
		readyState: 'complete',
		addEventListener: () => {},
		getElementById: () => null,
		querySelector: () => null,
	},
	navigator: {},
	window: { requestAnimationFrame: (callback) => callback() },
	Element: class Element {},
};

runInNewContext(readFileSync(resolve('js/common.js'), 'utf8'), context);

if (!Object.isSealed(context.window.whale)) {
	throw new Error('The base Whale API must reject new and deleted properties.');
}

if (
	Reflect.defineProperty(context.window.whale, 'unexpected', { value: true }) ||
	Reflect.deleteProperty(context.window.whale, 'copyText') ||
	Reflect.deleteProperty(context.window, 'whale')
) {
	throw new Error(
		'Whale runtime contracts must be enforced by property descriptors.',
	);
}

runInNewContext(readFileSync(resolve('js/toc-utils.js'), 'utf8'), context);

if (
	!Object.isFrozen(context.window.whale) ||
	!Object.isFrozen(context.window.whale.tocUtils)
) {
	throw new Error('The complete Whale API and TOC utilities must be frozen.');
}

let rejectedInvalidCopy = false;
try {
	await context.window.whale.copyText(null);
} catch (error) {
	rejectedInvalidCopy = error?.name === 'TypeError';
}

if (!rejectedInvalidCopy) {
	throw new Error('Public helpers must reject invalid runtime argument types.');
}
