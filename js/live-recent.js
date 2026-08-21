(() => {
	const DEFAULT_REFRESH_INTERVAL = 60 * 1000;
	const RELATIVE_TIME_INTERVAL = 30 * 1000;
	const feedCache = new Map();
	const relativeTimeFormatter = new Intl.RelativeTimeFormat(
		mw.config.get('wgUserLanguage') || document.documentElement.lang || 'ko',
		{ numeric: 'always' },
	);

	const formatRelativeTime = (timestamp) => {
		const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

		if (seconds < 60) {
			return relativeTimeFormatter.format(-seconds, 'second');
		}

		const minutes = Math.round(seconds / 60);
		if (minutes < 60) {
			return relativeTimeFormatter.format(-minutes, 'minute');
		}

		const hours = Math.round(minutes / 60);
		if (hours < 24) {
			return relativeTimeFormatter.format(-hours, 'hour');
		}

		const days = Math.round(hours / 24);
		if (days < 7) {
			return relativeTimeFormatter.format(-days, 'day');
		}

		const date = new Date(timestamp);
		return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
	};

	const createPlaceholderRow = () => {
		const listItem = document.createElement('li');
		const placeholder = document.createElement('span');
		const title = document.createElement('span');
		const time = document.createElement('span');

		listItem.className = 'live-recent-row live-recent-empty';
		listItem.setAttribute('aria-hidden', 'true');
		placeholder.className = 'recent-item recent-item-placeholder';
		title.className = 'recent-item-placeholder-title is-loading';
		time.className = 'recent-item-placeholder-time is-loading';
		placeholder.append(title, time);
		listItem.append(placeholder);

		return listItem;
	};

	const createNoDataRow = () => {
		const listItem = document.createElement('li');
		const visual = document.createElement('span');
		const paper = document.createElement('span');
		const bubble = document.createElement('span');
		const text = document.createElement('span');

		listItem.className = 'live-recent-no-data';
		visual.className = 'live-recent-no-data-visual';
		visual.setAttribute('aria-hidden', 'true');
		paper.className = 'live-recent-no-data-paper';
		bubble.className = 'live-recent-no-data-bubble';
		text.className = 'live-recent-no-data-text';
		text.textContent = mw.message('whale-live-recent-no-data').text();

		visual.append(paper, bubble);
		listItem.append(visual, text);

		return listItem;
	};

	const createChangeRow = (item) => {
		const timestamp = new Date(item.timestamp).getTime();
		const listItem = document.createElement('li');
		const link = document.createElement('a');
		const title = document.createElement('span');
		const time = document.createElement('time');

		listItem.className = 'live-recent-row';
		link.className = 'recent-item';
		link.href = mw.util.getUrl(item.title);
		link.title = item.title;
		title.className = 'recent-item-title';
		time.className = 'recent-item-time';
		time.dateTime = item.timestamp;
		time.dataset.timestamp = String(timestamp);
		time.textContent = formatRelativeTime(timestamp);

		if (item.type === 'new') {
			const badge = document.createElement('span');
			badge.className = 'new';
			badge.textContent = `${mw.message('whale-feed-new').text()} `;
			title.append(badge);
		}

		title.append(item.title);
		link.append(title, time);
		listItem.append(link);

		return listItem;
	};

	const fillRows = (list, count, rowFactory) => {
		const fragment = new DocumentFragment();

		for (let index = 0; index < count; index++) {
			fragment.append(rowFactory(index));
		}

		list.replaceChildren(fragment);
	};

	const stopProgress = (feed) => {
		feed.progressBar?.classList.remove('is-running');
	};

	const restartProgress = (feed) => {
		if (!feed.progressBar) {
			return;
		}

		stopProgress(feed);
		feed.progressBar.style.animation = 'none';
		void feed.progressBar.offsetHeight;
		feed.progressBar.style.animation = '';
		feed.progressBar.classList.add('is-running');
	};

	const renderFeed = (feed, changes) => {
		const visibleChanges = changes.slice(0, feed.limit);
		feed.list.classList.toggle(
			'live-recent-list-no-data',
			visibleChanges.length === 0,
		);

		if (visibleChanges.length === 0) {
			feed.list.replaceChildren(createNoDataRow());
		} else {
			fillRows(feed.list, visibleChanges.length, (index) =>
				createChangeRow(visibleChanges[index]),
			);
		}

		feed.list.setAttribute('aria-busy', 'false');
		feed.loaded = true;
		restartProgress(feed);
	};

	const showSkeletonRows = (feed) => {
		feed.list.classList.remove('live-recent-list-no-data');
		feed.list.setAttribute('aria-busy', 'true');
		fillRows(feed.list, Math.min(feed.limit, 3), createPlaceholderRow);
	};

	const showNoDataRows = (feed) => {
		feed.list.classList.add('live-recent-list-no-data');
		feed.list.setAttribute('aria-busy', 'false');
		feed.list.replaceChildren(createNoDataRow());
		feed.loaded = true;
		restartProgress(feed);
	};

	const refreshFeed = async (
		feed,
		{ force = false, showLoading = false } = {},
	) => {
		const cached = feedCache.get(feed.namespaces);

		if (
			cached &&
			!force &&
			Date.now() - cached.fetchedAt < feed.refreshInterval
		) {
			renderFeed(feed, cached.changes);
			return;
		}

		const currentRequestId = ++feed.requestId;

		if (showLoading && !feed.loaded) {
			showSkeletonRows(feed);
		}

		try {
			const api = await whale.getApi();
			const params = {
				action: 'query',
				list: 'recentchanges',
				rcprop: 'title|timestamp',
				rcshow: '!bot|!redirect',
				rctype: 'edit|new',
				rclimit: feed.limit,
				format: 'json',
				rcnamespace: feed.namespaces,
				rctoponly: true,
			};
			let data;

			try {
				data = await api.get(params);
			} catch (error) {
				if (params.rctoponly !== true) {
					throw error;
				}

				const { rctoponly: _rctoponly, ...compatParams } = params;
				data = await api.get(compatParams);
			}

			if (currentRequestId !== feed.requestId) {
				return;
			}

			const changes = data.query?.recentchanges ?? [];
			feedCache.set(feed.namespaces, {
				changes,
				fetchedAt: Date.now(),
			});
			renderFeed(feed, changes);
		} catch {
			if (currentRequestId === feed.requestId) {
				showNoDataRows(feed);
			}
		}
	};

	const updateRelativeTimes = (root) => {
		root
			.querySelectorAll('.recent-item-time[data-timestamp]')
			.forEach((time) => {
				time.textContent = formatRelativeTime(Number(time.dataset.timestamp));
			});
	};

	const isRootVisible = (root) => root.offsetParent !== null;

	const createFeed = (root, element) => {
		const feed = {
			element,
			list: element.querySelector('.live-recent-list'),
			limit: Number(root.dataset.limit) || 10,
			namespaces: element.dataset.namespaces,
			progressBar: element.querySelector('.live-recent-progress-bar'),
			refreshInterval:
				Number(root.dataset.refreshInterval) || DEFAULT_REFRESH_INTERVAL,
			loaded: false,
			requestId: 0,
		};

		feed.progressBar?.addEventListener('animationend', () => {
			if (isRootVisible(root)) {
				refreshFeed(feed, { force: true });
			}
		});

		return feed;
	};

	const createRootController = (root) => {
		const feeds = [...root.querySelectorAll('.live-recent-feed')]
			.map((element) => createFeed(root, element))
			.filter((feed) => feed.list && feed.namespaces);

		if (feeds.length === 0) {
			return null;
		}

		let relativeTimeInterval = null;
		let running = false;
		const tabs = [...root.querySelectorAll('[role="tab"]')];
		let activeFeed = feeds.find((feed) => !feed.element.hidden) ?? feeds[0];

		const selectFeed = (nextFeed, focusTab = false) => {
			activeFeed = nextFeed;
			feeds.forEach((feed) => {
				const isActive = feed === nextFeed;
				feed.element.hidden = !isActive;
				feed.element.classList.toggle('is-active', isActive);
			});
			tabs.forEach((tab) => {
				const isActive =
					tab.getAttribute('aria-controls') === nextFeed.element.id;
				tab.classList.toggle('is-active', isActive);
				tab.setAttribute('aria-selected', String(isActive));
				tab.tabIndex = isActive ? 0 : -1;
				if (isActive && focusTab) {
					tab.focus();
				}
			});

			if (running && !nextFeed.loaded) {
				refreshFeed(nextFeed, { showLoading: true });
			}
		};

		tabs.forEach((tab, index) => {
			tab.addEventListener('click', () => {
				const nextFeed = feeds.find(
					(feed) => feed.element.id === tab.getAttribute('aria-controls'),
				);
				if (nextFeed) {
					selectFeed(nextFeed);
				}
			});
			tab.addEventListener('keydown', (event) => {
				if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
					return;
				}
				event.preventDefault();
				const nextIndex =
					event.key === 'Home'
						? 0
						: event.key === 'End'
							? tabs.length - 1
							: (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
								tabs.length;
				const nextFeed = feeds.find(
					(feed) =>
						feed.element.id === tabs[nextIndex].getAttribute('aria-controls'),
				);
				if (nextFeed) {
					selectFeed(nextFeed, true);
				}
			});
		});

		const stop = () => {
			if (!running) {
				return;
			}

			running = false;
			window.clearInterval(relativeTimeInterval);
			relativeTimeInterval = null;
			feeds.forEach((feed) => {
				stopProgress(feed);
			});
		};

		const start = () => {
			if (!isRootVisible(root)) {
				stop();
				return;
			}

			if (running) {
				return;
			}

			running = true;
			relativeTimeInterval = window.setInterval(() => {
				updateRelativeTimes(root);
			}, RELATIVE_TIME_INTERVAL);

			refreshFeed(activeFeed, { showLoading: true });
		};

		return { start, stop };
	};

	whale.ready(() => {
		const controllers = [...document.querySelectorAll('.live-recent')]
			.map(createRootController)
			.filter(Boolean);

		if (controllers.length === 0) {
			return;
		}

		const startControllers = () => {
			controllers.forEach((controller) => {
				controller.start();
			});
		};
		const syncControllers = whale.rafThrottle(startControllers);

		const scheduleInitialSync =
			window.requestIdleCallback ||
			((callback) => window.setTimeout(callback, 300));

		startControllers();
		scheduleInitialSync(syncControllers);
		window.addEventListener('resize', syncControllers);
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				controllers.forEach((controller) => {
					controller.stop();
				});
				return;
			}

			syncControllers();
		});
	});
})();
