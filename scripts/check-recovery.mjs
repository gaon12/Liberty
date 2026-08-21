import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('js/recovery.js'), 'utf8');
const removalIndex = source.indexOf('scripts.forEach((script) => {');
const replayIndex = source.indexOf('for (const snapshot of snapshots)');
const queueResetIndex = source.indexOf('window.RLQ = []');
const loaderResetIndex = source.indexOf('delete window.mw');

if (
	removalIndex === -1 ||
	loaderResetIndex === -1 ||
	queueResetIndex === -1 ||
	replayIndex === -1 ||
	removalIndex > queueResetIndex ||
	removalIndex > loaderResetIndex ||
	loaderResetIndex > queueResetIndex ||
	queueResetIndex > replayIndex
) {
	throw new Error(
		'Recovery must detach placeholders and reset the stale queue before replay.',
	);
}

if (
	source.includes('initSectionFallback') ||
	source.includes('initLiveRecentFallback')
) {
	throw new Error('Recovery must not duplicate feature implementations.');
}

if (!source.includes('window.mw?.loader')) {
	throw new Error('Recovery must stop after ResourceLoader starts.');
}

if (source.includes('isRocketScript')) {
	throw new Error(
		'Recovery must detect restored text/javascript placeholders after Rocket Loader finishes.',
	);
}

if (
	!source.includes('{ delay: 6500, force: true }') ||
	!source.includes('requiredModules.every')
) {
	throw new Error(
		'Recovery must force a recheck unless every requested module is ready.',
	);
}

const layoutSource = readFileSync(resolve('js/layout.js'), 'utf8');
if (!layoutSource.includes("dataset.whaleLayoutRuntime = 'ready'")) {
	throw new Error('Layout must publish its healthy runtime marker.');
}

if (
	!source.includes("whaleResourceLoaderRecovery = 'complete'") ||
	!source.includes("whaleResourceLoaderRecovery = 'failed'") ||
	!source.includes('whaleResourceLoaderRecoveryMessage') ||
	!source.includes('await window.mw.loader.using(requiredModules)')
) {
	throw new Error(
		'Recovery must await requested modules before exposing a terminal state.',
	);
}
