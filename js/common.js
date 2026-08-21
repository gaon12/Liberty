(() => {
	if (window.whale?.ready) {
		return;
	}

	let apiPromise = null;
	const requireFunction = (value, name) => {
		if (typeof value !== 'function') {
			throw new TypeError(`${name} must be a function.`);
		}
		return value;
	};

	const ready = (callback) => {
		requireFunction(callback, 'callback');
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true });
			return;
		}

		callback();
	};

	const rafThrottle = (callback) => {
		requireFunction(callback, 'callback');
		let scheduled = false;

		return (...args) => {
			if (scheduled) {
				return;
			}

			scheduled = true;
			window.requestAnimationFrame(() => {
				scheduled = false;
				callback(...args);
			});
		};
	};

	const getAnchorTarget = (href) => {
		if (!href?.startsWith('#')) {
			return null;
		}

		const rawId = href.slice(1);
		let decodedId = rawId;

		try {
			decodedId = decodeURIComponent(rawId);
		} catch {
			decodedId = rawId;
		}

		const target =
			document.getElementById(decodedId) || document.getElementById(rawId);

		if (target) {
			return target;
		}

		try {
			return document.querySelector(href);
		} catch {
			return null;
		}
	};

	const getNavHeight = () =>
		document.querySelector('.whale-nav-wrapper')?.offsetHeight || 0;

	const scrollToTarget = (target, options = {}) => {
		if (!target) {
			return;
		}

		window.scrollTo({
			top:
				target.getBoundingClientRect().top +
				window.scrollY -
				(options.offset ?? getNavHeight()) -
				(options.gap ?? 10),
			behavior: options.behavior ?? 'smooth',
		});
	};

	const fallbackCopyText = (text) => {
		if (typeof document.execCommand !== 'function') {
			return false;
		}

		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.setAttribute('readonly', 'readonly');
		textarea.style.position = 'fixed';
		textarea.style.top = '-9999px';
		textarea.style.opacity = '0';
		document.body.append(textarea);
		textarea.select();
		textarea.setSelectionRange?.(0, textarea.value.length);

		try {
			return document.execCommand('copy');
		} finally {
			textarea.remove();
		}
	};

	const copyText = async (text) => {
		if (typeof text !== 'string') {
			throw new TypeError('text must be a string.');
		}
		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				return fallbackCopyText(text);
			}
		}

		return fallbackCopyText(text);
	};

	const onMediaChange = (mediaQuery, callback) => {
		if (!mediaQuery || typeof mediaQuery !== 'object') {
			throw new TypeError('mediaQuery must be an object.');
		}
		requireFunction(callback, 'callback');
		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', callback);
			return;
		}

		mediaQuery.addListener(callback);
	};

	const getApi = async () => {
		apiPromise ??= mw.loader.using('mediawiki.api').then(() => new mw.Api());
		return apiPromise;
	};

	const closest = (target, selector) =>
		target instanceof Element
			? target.closest(selector)
			: target?.parentElement?.closest(selector) || null;

	const whaleApi = Object.seal({
		ready,
		rafThrottle,
		getAnchorTarget,
		getNavHeight,
		scrollToTarget,
		copyText,
		onMediaChange,
		getApi,
		closest,
		tocUtils: null,
	});
	Object.defineProperty(window, 'whale', {
		configurable: false,
		enumerable: true,
		value: whaleApi,
		writable: false,
	});
})();
