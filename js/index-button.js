(() => {
	const DESKTOP_QUERY = '(min-width: 1280px)';
	const MAX_ITEMS = 18;
	const MOBILE_EDGE_SWIPE_PX = 64;
	const MOBILE_SWIPE_DISTANCE_PX = 48;
	const MOBILE_SWIPE_MAX_VERTICAL_PX = 42;
	const SECTION_NUMBER_SELECTOR = '.whale-heading-number';
	const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
	let activeScrollUpdate = null;
	let mobileGestureStart = null;
	let mobileGesturesBound = false;

	const getTocLinks = () => [
		...document.querySelectorAll(
			'#toc li > a[href^="#"], .toc li > a[href^="#"]',
		),
	];

	const getContentHeadings = () => [
		...document.querySelectorAll(
			'.whale-content-main h1, .whale-content-main h2, .whale-content-main h3, .whale-content-main h4, .whale-content-main h5, .whale-content-main h6',
		),
	];

	const getTarget = (link) => whale.getAnchorTarget(link.getAttribute('href'));
	const getTargetHeading = (target) =>
		target?.matches?.(HEADING_SELECTOR)
			? target
			: target?.closest?.(HEADING_SELECTOR) || null;

	const getRawHeadingLevel = (heading) => {
		const headingLevel = Number(heading.tagName.match(/^H([1-6])$/)?.[1]);
		return Number.isInteger(headingLevel) ? headingLevel : 2;
	};

	const getHeadingLevel = (heading, baseLevel) =>
		Math.min(6, Math.max(1, getRawHeadingLevel(heading) - baseLevel + 1));
	const getHeadingBaseLevel = (headings = getContentHeadings()) => {
		const rawLevels = headings.map(getRawHeadingLevel);
		return rawLevels.length > 0 ? Math.min(...rawLevels) : 2;
	};

	const getHeadingHref = (heading) => {
		const id = heading.querySelector('.mw-headline')?.id || heading.id;
		return id ? `#${id}` : '#';
	};

	const getMaxScrollY = () =>
		Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

	const getTargetScrollY = (target) => {
		const rawScrollY =
			target.getBoundingClientRect().top +
			window.scrollY -
			whale.getNavHeight() -
			10;

		return Math.min(getMaxScrollY(), Math.max(0, rawScrollY));
	};

	const getTargetPositionRatio = (target) => {
		const targetTop = target.getBoundingClientRect().top + window.scrollY;
		const documentHeight = Math.max(
			1,
			document.documentElement.scrollHeight - whale.getNavHeight(),
		);

		return Math.min(1, Math.max(0, targetTop / documentHeight));
	};

	const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

	const isMobileFloatingTocEnabled = () =>
		document.body.classList.contains('whale-mobile-floating-toc-enabled');
	const isMobileTocOpen = () =>
		document.body.classList.contains('whale-floating-toc-open');

	const setMobileTocOpen = (open) => {
		const toc = document.querySelector('.whale-floating-toc');
		if (!open && toc?.contains(document.activeElement)) {
			const trigger = document.getElementById('whale-scrolltoc');
			if (trigger) {
				trigger.focus({ preventScroll: true });
			} else {
				document.activeElement?.blur?.();
			}
		}

		document.body.classList.toggle('whale-floating-toc-open', open);
		if (toc) {
			toc.inert = !open;
			toc.setAttribute('aria-hidden', String(!open));
		}
		const backdrop = document.querySelector('.whale-floating-toc-backdrop');
		if (backdrop) {
			backdrop.hidden = !open;
		}
	};

	const getFloatingTocItemsFromLinks = () => {
		const baseLevel = getHeadingBaseLevel();

		return getTocLinks()
			.map((link) => {
				const target = getTarget(link);
				const heading = getTargetHeading(target);
				const number = whale.tocUtils.getTocNumber(link);

				return {
					link,
					number,
					target,
					level: heading
						? getHeadingLevel(heading, baseLevel)
						: whale.tocUtils.getTocLevel(link),
					text: whale.tocUtils.getLinkText(link, target),
				};
			})
			.filter((item) => item.target && item.text)
			.slice(0, MAX_ITEMS);
	};

	const getFloatingTocItemsFromHeadings = () => {
		const counters = [];
		const headings = getContentHeadings();
		const baseLevel = getHeadingBaseLevel(headings);

		return headings
			.map((heading) => {
				const level = getHeadingLevel(heading, baseLevel);
				counters[level - 1] = (counters[level - 1] || 0) + 1;
				counters.length = level;

				const number = whale.tocUtils.formatTocNumber(counters.join('.'));
				const label = whale.tocUtils.getTargetText(heading);

				return {
					link: null,
					number,
					target: heading,
					href: getHeadingHref(heading),
					level,
					text: [number, label].filter(Boolean).join(' '),
				};
			})
			.filter((item) => item.target && item.text)
			.slice(0, MAX_ITEMS);
	};

	const getFloatingTocItems = () => {
		const linkItems = getFloatingTocItemsFromLinks();
		return linkItems.length > 0 ? linkItems : getFloatingTocItemsFromHeadings();
	};

	const syncHeadingNumbers = (links) => {
		links.forEach(({ target, number }) => {
			if (!number || !target) {
				return;
			}

			const label = target.querySelector?.('.mw-headline') || target;
			if (!label || label.querySelector?.(SECTION_NUMBER_SELECTOR)) {
				return;
			}

			const numberNode = document.createElement('span');
			numberNode.className = SECTION_NUMBER_SELECTOR.slice(1);
			numberNode.setAttribute('aria-hidden', 'true');
			numberNode.textContent = `${number} `;
			label.insertBefore(numberNode, label.firstChild);
		});
	};

	const removeFloatingToc = () => {
		document.querySelector('.whale-floating-toc')?.remove();
		document.querySelector('.whale-floating-toc-backdrop')?.remove();
		document.body.classList.remove('whale-floating-toc-hover');
		document.body.classList.remove('whale-floating-toc-open');
		if (activeScrollUpdate) {
			window.removeEventListener('scroll', activeScrollUpdate);
			activeScrollUpdate = null;
		}
	};

	const bindMobileGestures = () => {
		if (mobileGesturesBound) {
			return;
		}

		mobileGesturesBound = true;
		const startGesture = (event, point) => {
			const toc = document.querySelector('.whale-floating-toc');
			if (!point || isDesktop() || !isMobileFloatingTocEnabled()) {
				mobileGestureStart = null;
				return;
			}

			const startsAtEdge =
				point.clientX >= window.innerWidth - MOBILE_EDGE_SWIPE_PX;
			const startsInToc = toc?.contains(event.target);
			mobileGestureStart =
				startsAtEdge || startsInToc
					? { x: point.clientX, y: point.clientY, inToc: startsInToc }
					: null;
		};

		const moveGesture = (point) => {
			if (!mobileGestureStart || !point) {
				return;
			}

			const deltaX = point.clientX - mobileGestureStart.x;
			const deltaY = Math.abs(point.clientY - mobileGestureStart.y);
			if (deltaY > MOBILE_SWIPE_MAX_VERTICAL_PX || deltaY > Math.abs(deltaX)) {
				return;
			}

			if (deltaX <= -MOBILE_SWIPE_DISTANCE_PX) {
				setMobileTocOpen(true);
				mobileGestureStart = null;
			} else if (
				mobileGestureStart.inToc &&
				deltaX >= MOBILE_SWIPE_DISTANCE_PX
			) {
				setMobileTocOpen(false);
				mobileGestureStart = null;
			}
		};

		document.addEventListener(
			'touchstart',
			(event) => {
				startGesture(event, event.touches?.[0]);
			},
			{ passive: true },
		);

		document.addEventListener(
			'touchmove',
			(event) => {
				moveGesture(event.touches?.[0]);
			},
			{ passive: true },
		);

		document.addEventListener(
			'pointerdown',
			(event) => {
				if (event.pointerType === 'mouse') {
					return;
				}

				startGesture(event, event);
			},
			{ passive: true },
		);

		document.addEventListener(
			'pointermove',
			(event) => {
				if (event.pointerType === 'mouse') {
					return;
				}

				moveGesture(event);
			},
			{ passive: true },
		);

		document.addEventListener('touchend', () => {
			mobileGestureStart = null;
		});
		document.addEventListener('pointerup', () => {
			mobileGestureStart = null;
		});
		document.addEventListener('pointercancel', () => {
			mobileGestureStart = null;
		});

		document.addEventListener('whale:toggleFloatingToc', () => {
			if (!isDesktop() && isMobileFloatingTocEnabled()) {
				setMobileTocOpen(!isMobileTocOpen());
			}
		});

		document.addEventListener('keydown', (event) => {
			if (
				event.key === 'Escape' &&
				!isDesktop() &&
				isMobileFloatingTocEnabled() &&
				isMobileTocOpen()
			) {
				event.preventDefault();
				setMobileTocOpen(false);
			}
		});
	};

	const buildFloatingToc = () => {
		const desktop = isDesktop();
		const desktopEnabled = document.body.classList.contains(
			'whale-floating-toc-enabled',
		);
		const mobileEnabled = isMobileFloatingTocEnabled();
		const shouldRenderDesktop = desktop && desktopEnabled;
		const shouldRenderMobile = !desktop && mobileEnabled;

		bindMobileGestures();

		if (!desktopEnabled && !mobileEnabled) {
			removeFloatingToc();
			return;
		}

		const links = getFloatingTocItems();
		syncHeadingNumbers(links);

		if ((!shouldRenderDesktop && !shouldRenderMobile) || links.length < 1) {
			removeFloatingToc();
			return;
		}

		removeFloatingToc();

		const toc = document.createElement('nav');
		const list = document.createElement('ol');
		toc.className = shouldRenderMobile
			? 'whale-floating-toc is-mobile'
			: 'whale-floating-toc';
		toc.setAttribute('aria-label', mw.message('whale-floating-toc').text());
		toc.inert = shouldRenderMobile;
		toc.setAttribute('aria-hidden', String(shouldRenderMobile));
		toc.addEventListener('pointerover', (event) => {
			if (shouldRenderDesktop && toc.contains(event.target)) {
				document.body.classList.add('whale-floating-toc-hover');
			}
		});
		toc.addEventListener('pointerout', (event) => {
			if (!event.relatedTarget || !toc.contains(event.relatedTarget)) {
				document.body.classList.remove('whale-floating-toc-hover');
			}
		});
		toc.addEventListener('focusin', () => {
			if (shouldRenderDesktop) {
				document.body.classList.add('whale-floating-toc-hover');
			}
		});
		toc.addEventListener('focusout', (event) => {
			if (!event.relatedTarget || !toc.contains(event.relatedTarget)) {
				document.body.classList.remove('whale-floating-toc-hover');
			}
		});

		links.forEach(({ link, target, text, level, href }) => {
			const item = document.createElement('li');
			const anchor = document.createElement('a');
			item.className = `whale-floating-toc-level-${level}`;
			anchor.href = link?.getAttribute('href') || href;
			anchor.textContent = text;
			anchor.addEventListener('click', (event) => {
				event.preventDefault();
				setMobileTocOpen(false);
				whale.scrollToTarget(target);
			});
			item.append(anchor);
			list.append(item);
		});

		toc.append(list);
		if (shouldRenderMobile) {
			const backdrop = document.createElement('button');
			backdrop.type = 'button';
			backdrop.className = 'whale-floating-toc-backdrop';
			backdrop.setAttribute(
				'aria-label',
				mw.message('whale-floating-toc').text(),
			);
			backdrop.hidden = true;
			backdrop.addEventListener('click', () => setMobileTocOpen(false));
			document.body.append(backdrop);
		}
		document.body.append(toc);

		const anchors = [...toc.querySelectorAll('a')];
		const items = [...toc.querySelectorAll('li')];

		const updatePositions = () => {
			if (shouldRenderMobile) {
				links.forEach((item) => {
					item.scrollY = getTargetScrollY(item.target);
				});
				return;
			}

			const maxScrollY = getMaxScrollY();
			const minGap = Math.min(0.12, 1 / Math.max(1, links.length - 1));
			let previousRatio = -minGap;

			links.forEach((item, index) => {
				item.scrollY = getTargetScrollY(item.target);

				const ratio =
					maxScrollY === 0 || links.length === 1
						? index / Math.max(1, links.length - 1)
						: getTargetPositionRatio(item.target);
				const remainingItems = links.length - index - 1;
				const maxRatio = 1 - remainingItems * minGap;
				const safeRatio = Math.min(
					maxRatio,
					Math.max(previousRatio + minGap, ratio),
				);

				previousRatio = safeRatio;
				items[index].style.top =
					`${Math.min(1, Math.max(0, safeRatio)) * 100}%`;
			});
		};

		const updateActive = whale.rafThrottle(() => {
			updatePositions();

			const scrollY = Math.min(getMaxScrollY(), window.scrollY);
			let activeIndex = 0;

			links.forEach(({ scrollY: targetScrollY }, index) => {
				if (targetScrollY <= scrollY + 1) {
					activeIndex = index;
				}
			});

			anchors.forEach((anchor, index) => {
				anchor.classList.toggle('is-active', index === activeIndex);
			});
			items.forEach((item, index) => {
				item.classList.toggle('is-active', index === activeIndex);
			});
		});

		updateActive();
		activeScrollUpdate = updateActive;
		window.addEventListener('scroll', activeScrollUpdate, { passive: true });
	};

	whale.ready(() => {
		window.requestAnimationFrame(buildFloatingToc);
		window.addEventListener('load', buildFloatingToc, { once: true });
		mw.hook('wikipage.content').add(() => {
			window.requestAnimationFrame(buildFloatingToc);
		});
		window.addEventListener('resize', whale.rafThrottle(buildFloatingToc));
	});
})();
