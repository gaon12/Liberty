import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = realpathSync.native(fileURLToPath(new URL('..', import.meta.url)));
const tests = [
	'check-js.mjs',
	'check-copy-helper.mjs',
	'check-code-copy.mjs',
	'check-external-link-warning.mjs',
	'check-reference-modal.mjs',
	'check-share-button.mjs',
	'check-short-url-copy.mjs',
	'check-toc-utils.mjs',
	'check-theme-toggle.mjs',
	'check-runtime-contracts.mjs',
	'check-recovery.mjs',
	'check-legacy-dependencies.mjs',
	'check-ui-features.mjs',
	'check-floating-toc-behavior.mjs',
	'check-layout-interactions.mjs',
];

const wait = (milliseconds) => {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};

for (const test of tests) {
	let result;
	for (let attempt = 1; attempt <= 3; attempt++) {
		result = spawnSync(process.execPath, [`scripts/${test}`], {
			cwd: root,
			encoding: 'utf8',
			stdio: 'pipe',
		});

		if (
			result.status === 0 ||
			!result.stderr?.includes('MODULE_NOT_FOUND') ||
			attempt === 3
		) {
			break;
		}

		wait(500);
	}

	if (result.stdout) {
		process.stdout.write(result.stdout);
	}
	if (result.stderr) {
		process.stderr.write(result.stderr);
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}
