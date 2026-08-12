(() => {
	const RECOVERY_DELAY = 1200;
	const FALLBACK_DELAY = 3200;
	const DEFAULT_LIMIT = 10;

	const isWhaleReady = () => Boolean(window.whale?.ready);
	const hasResourceLoaderStarted = () => Boolean(window.mw?.loader);

	const ensureLocalStorage = () => {
		const isStorageUsable = () => {
			try {
				const key = '__whale_storage_test__';
				window.localStorage.setItem(key, key);
				window.localStorage.removeItem(key);
				return true;
			} catch {
				return false;
			}
		};

		if ('localStorage' in window && isStorageUsable()) {
			return;
		}

		let storage = {};
		try {
			Object.defineProperty(window, 'localStorage', {
				configurable: true,
				value: {
					get length() {
						return Object.keys(storage).length;
					},
					clear() {
						storage = {};
					},
					getItem(key) {
						key = String(key);
						return Object.hasOwn(storage, key) ? storage[key] : null;
					},
					key(index) {
						return Object.keys(storage)[index] || null;
					},
					removeItem(key) {
						delete storage[String(key)];
					},
					setItem(key, value) {
						storage[String(key)] = String(value);
					},
				},
			});
		} catch {}
	};

	const isRocketScript = (script) =>
		/-text\/javascript$/.test(script.getAttribute('type') || '');

	const isActiveResourceLoaderScript = (script) =>
		!isRocketScript(script) &&
		Boolean(script.src) &&
		/\/load\.php\?/.test(script.src) &&
		/[?&]only=scripts/.test(script.src);

	const hasActiveResourceLoaderScript = () =>
		Array.from(document.querySelectorAll('script')).some(
			isActiveResourceLoaderScript,
		);

	const isResourceLoaderScript = (script) => {
		if (script.dataset.whaleRecovery === 'true' || !isRocketScript(script)) {
			return false;
		}

		if (script.src) {
			return (
				/\/load\.php\?/.test(script.src) && /[?&]only=scripts/.test(script.src)
			);
		}

		const text = script.text || script.textContent || '';
		return (
			text.includes('RLCONF=') ||
			text.includes('RLSTATE=') ||
			text.includes('RLPAGEMODULES=') ||
			text.includes('RLQ=window.RLQ') ||
			text.includes('mw.config.set')
		);
	};

	const replayInlineScript = (script) => {
		const replacement = document.createElement('script');
		replacement.text = script.text || script.textContent || '';
		if (isRocketScript(script)) {
			script.remove();
		}
		document.head.append(replacement);
		replacement.remove();
	};

	const replayExternalScript = async (script) => {
		try {
			const response = await fetch(script.src, { credentials: 'same-origin' });
			if (response.ok) {
				const replacement = document.createElement('script');
				replacement.text = await response.text();
				if (isRocketScript(script)) {
					script.remove();
				}
				document.head.append(replacement);
				replacement.remove();
				return;
			}
		} catch {}

		return new Promise((resolve) => {
			const replacement = document.createElement('script');
			replacement.src = script.src;
			replacement.async = false;
			replacement.onload = resolve;
			replacement.onerror = resolve;
			if (isRocketScript(script)) {
				script.remove();
			}
			document.head.append(replacement);
		});
	};

	const replayResourceLoader = () => {
		if (
			isWhaleReady() ||
			hasResourceLoaderStarted() ||
			hasActiveResourceLoaderScript() ||
			document.documentElement.dataset.whaleResourceLoaderRecovery ===
				'attempted'
		) {
			return;
		}

		const scripts = Array.from(document.querySelectorAll('script')).filter(
			isResourceLoaderScript,
		);
		if (scripts.length === 0) {
			return;
		}

		document.documentElement.dataset.whaleResourceLoaderRecovery = 'attempted';
		ensureLocalStorage();
		scripts.reduce(
			(chain, script) =>
				chain.then(() => {
					if (hasResourceLoaderStarted()) {
						return null;
					}

					return script.src
						? replayExternalScript(script)
						: replayInlineScript(script);
				}),
			Promise.resolve(),
		);
	};

	const ready = (callback) => {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true });
			return;
		}

		callback();
	};

	const toggleSection = (button) => {
		const body = document.getElementById(button.getAttribute('aria-controls'));
		if (!body) {
			return;
		}

		const expanded = button.getAttribute('aria-expanded') === 'true';
		button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
		button.setAttribute(
			'aria-label',
			expanded
				? button.dataset.expandLabel || button.getAttribute('aria-label') || ''
				: button.dataset.collapseLabel ||
						button.getAttribute('aria-label') ||
						'',
		);
		body.toggleAttribute('hidden', expanded);
		button
			.closest('.whale-section-container')
			?.classList.toggle('is-collapsed', expanded);
		button
			.closest('.whale-section-heading')
			?.classList.toggle('is-collapsed', expanded);
	};

	const initSectionFallback = () => {
		if (document.documentElement.dataset.whaleSectionFallback === 'ready') {
			return;
		}

		document.documentElement.dataset.whaleSectionFallback = 'ready';
		document.addEventListener('click', (event) => {
			const heading = event.target.closest?.('.whale-section-heading');
			if (!heading || event.target.closest('a, input, select, textarea')) {
				return;
			}

			const button = heading.querySelector('.whale-section-toggle');
			if (!button) {
				return;
			}

			event.preventDefault();
			toggleSection(button);
		});
	};

	const getUrl = (title) => {
		if (window.mw?.util?.getUrl) {
			return mw.util.getUrl(title);
		}

		return `/w/${String(title).split('/').map(encodeURIComponent).join('/')}`;
	};

	const formatRelativeTime = (timestamp) => {
		const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
		if (seconds < 60) {
			return `${seconds}초 전`;
		}

		const minutes = Math.round(seconds / 60);
		if (minutes < 60) {
			return `${minutes}분 전`;
		}

		const hours = Math.round(minutes / 60);
		if (hours < 24) {
			return `${hours}시간 전`;
		}

		const days = Math.round(hours / 24);
		return `${days}일 전`;
	};

	const createNoDataRow = () => {
		const item = document.createElement('li');
		const text = document.createElement('span');
		const message = window.mw?.message
			? mw.message('whale-live-recent-no-data').text()
			: '';

		item.className = 'live-recent-no-data';
		text.className = 'live-recent-no-data-text';
		text.textContent =
			message && !message.includes('⧼') ? message : '표시할 내용이 없습니다';

		item.append(text);

		return item;
	};

	const createChangeRow = (change) => {
		const timestamp = new Date(change.timestamp).getTime();
		const item = document.createElement('li');
		const link = document.createElement('a');
		const title = document.createElement('span');
		const time = document.createElement('time');

		item.className = 'live-recent-row';
		link.className = 'recent-item';
		link.href = getUrl(change.title);
		link.title = change.title;
		title.className = 'recent-item-title';
		title.textContent = change.title;
		time.className = 'recent-item-time';
		time.dateTime = change.timestamp;
		time.textContent = formatRelativeTime(timestamp);
		link.append(title, time);
		item.append(link);

		return item;
	};

	const fetchRecentChanges = async (feed) => {
		const params = new URLSearchParams({
			action: 'query',
			list: 'recentchanges',
			rcprop: 'title|timestamp',
			rcshow: '!bot|!redirect',
			rctype: 'edit|new',
			rclimit: String(
				Number(feed.closest('.live-recent')?.dataset.limit) || DEFAULT_LIMIT,
			),
			format: 'json',
			rcnamespace: feed.dataset.namespaces || '',
			rctoponly: '1',
		});
		const fetchWithTimeout = (url) => {
			const controller = new AbortController();
			const timeout = window.setTimeout(() => controller.abort(), 6000);

			return fetch(url, {
				credentials: 'same-origin',
				signal: controller.signal,
			}).finally(() => {
				window.clearTimeout(timeout);
			});
		};
		let response = await fetchWithTimeout(`/w/api.php?${params.toString()}`);

		if (!response.ok) {
			params.delete('rctoponly');
			response = await fetchWithTimeout(`/w/api.php?${params.toString()}`);
		}

		if (!response.ok) {
			throw new Error('Recent changes request failed.');
		}

		return (await response.json()).query?.recentchanges || [];
	};

	const initLiveRecentFallback = () => {
		document.querySelectorAll('.live-recent-feed').forEach(async (feed) => {
			const list = feed.querySelector('.live-recent-list');
			if (
				!list ||
				list.dataset.whaleRecovery === 'ready' ||
				feed.offsetParent === null
			) {
				return;
			}

			list.dataset.whaleRecovery = 'ready';
			list.replaceChildren(createNoDataRow());
			list.setAttribute('aria-busy', 'false');

			try {
				const changes = await fetchRecentChanges(feed);
				if (changes.length > 0) {
					list.replaceChildren(...changes.map(createChangeRow));
				}
			} catch {}
		});
	};

	const installFallbacks = () => {
		if (isWhaleReady()) {
			return;
		}

		initSectionFallback();
		initLiveRecentFallback();
	};

	ensureLocalStorage();
	window.setTimeout(replayResourceLoader, RECOVERY_DELAY);
	ready(() => {
		window.setTimeout(installFallbacks, FALLBACK_DELAY);
	});
})();
