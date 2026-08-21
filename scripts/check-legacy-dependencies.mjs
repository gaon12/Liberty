import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceExtensions = new Set([
	'.js',
	'.json',
	'.less',
	'.mustache',
	'.php',
]);
const ignoredDirectories = new Set(['.git', 'node_modules', 'vendor']);
const forbiddenClasses = new Set([
	'btn',
	'collapse',
	'col',
	'container',
	'container-fluid',
	'dropdown',
	'modal',
	'navbar',
	'row',
]);

const sourceFiles = [];
const collectFiles = (directory) => {
	for (const entry of readdirSync(directory)) {
		if (ignoredDirectories.has(entry)) {
			continue;
		}
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			collectFiles(path);
		} else if (sourceExtensions.has(extname(path))) {
			sourceFiles.push(path);
		}
	}
};

collectFiles(root);

const failures = [];
for (const path of sourceFiles) {
	const source = readFileSync(path, 'utf8');
	const displayPath = relative(root, path);

	if (/\bjQuery\b|(?:^|[^\w$])\$\s*\(/m.test(source)) {
		failures.push(`${displayPath}: jQuery API usage`);
	}

	if (
		/bootstrap(?:\.min)?\.(?:css|js)|from\s+['"]bootstrap|require\(['"]bootstrap/i.test(
			source,
		)
	) {
		failures.push(`${displayPath}: Bootstrap dependency`);
	}

	for (const match of source.matchAll(/class\s*=\s*["']([^"']+)["']/g)) {
		for (const className of match[1].split(/\s+/)) {
			if (
				forbiddenClasses.has(className) ||
				/^col-(?:xs|sm|md|lg|xl|xxl)-/.test(className)
			) {
				failures.push(`${displayPath}: Bootstrap class ${className}`);
			}
		}
	}

	if (extname(path) === '.less') {
		for (const match of source.matchAll(
			/(^|[^\w-])\.(container(?:-fluid)?|row|col-(?:xs|sm|md|lg|xl|xxl)-\d+|navbar|dropdown|modal|collapse|btn)(?![\w-])/gm,
		)) {
			failures.push(`${displayPath}: Bootstrap selector .${match[2]}`);
		}
	}
}

if (failures.length > 0) {
	throw new Error(
		`Legacy frontend dependency checks failed:\n${failures.join('\n')}`,
	);
}
