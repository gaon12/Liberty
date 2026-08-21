(() => {
	const normalizeText = (text) => text?.trim().replace(/\s+/g, ' ') || '';

	const formatTocNumber = (number) => {
		const cleanNumber = normalizeText(number).replace(/\.$/, '');

		if (!cleanNumber) {
			return '';
		}

		return cleanNumber.includes('.') ? cleanNumber : `${cleanNumber}.`;
	};

	const getTocNumber = (link) =>
		formatTocNumber(link.querySelector('.tocnumber')?.textContent);

	const getTocLevel = (link) => {
		const item = link.closest('li');
		const levelClass = [...(item?.classList || [])].find((className) =>
			/^toclevel-\d+$/.test(className),
		);
		const level = Number(levelClass?.replace('toclevel-', ''));

		return Number.isInteger(level) && level > 0 ? Math.min(level, 6) : 1;
	};

	const getTargetText = (target) => {
		if (!target) {
			return '';
		}

		const label = target.querySelector?.('.mw-headline') || target;
		const clone = label.cloneNode(true);
		clone
			.querySelectorAll?.(
				'.whale-heading-anchor, .whale-heading-number, .mw-editsection',
			)
			.forEach((node) => {
				node.remove();
			});

		return normalizeText(clone.textContent);
	};

	const getLinkText = (link, target) => {
		const number = getTocNumber(link);
		const targetText = getTargetText(target);
		if (targetText) {
			return [number, targetText].filter(Boolean).join(' ');
		}

		const text = normalizeText(link.querySelector('.toctext')?.textContent);
		if (text) {
			return [number, text].filter(Boolean).join(' ');
		}

		const clone = link.cloneNode(true);
		clone.querySelectorAll?.('.tocnumber').forEach((node) => {
			node.remove();
		});

		return [number, normalizeText(clone.textContent)].filter(Boolean).join(' ');
	};

	const tocUtils = Object.freeze({
		formatTocNumber,
		getLinkText,
		getTargetText,
		getTocLevel,
		getTocNumber,
	});
	if (!window.whale) {
		Object.defineProperty(window, 'whale', {
			configurable: false,
			enumerable: true,
			value: Object.seal({ tocUtils: null }),
			writable: false,
		});
	}
	window.whale.tocUtils = tocUtils;
	Object.freeze(window.whale);
})();
