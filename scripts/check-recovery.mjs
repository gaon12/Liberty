import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('js/recovery.js'), 'utf8');
const removalIndex = source.indexOf('scripts.forEach((script) => {');
const replayIndex = source.indexOf('for (const snapshot of snapshots)');

if (removalIndex === -1 || replayIndex === -1 || removalIndex > replayIndex) {
	throw new Error(
		'Recovery must detach every Rocket Loader placeholder before replay.',
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
