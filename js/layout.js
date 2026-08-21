(() => {
	document.documentElement.dataset.whaleLayoutRuntime = 'ready';

	const getMenuOwner = (toggle) =>
		toggle.closest('.whale-dropdown, .whale-btn-group');

	const closeDropdown = (owner) => {
		if (!owner) {
			return;
		}

		owner.classList.remove('is-open');
		owner
			.querySelector('[data-whale-toggle="dropdown"]')
			?.setAttribute('aria-expanded', 'false');
		owner.querySelectorAll('.whale-dropdown-menu.is-open').forEach((menu) => {
			menu.classList.remove('is-open');
			menu.style.display = '';
		});
		owner
			.querySelectorAll('.whale-dropdown-toggle-sub[aria-expanded="true"]')
			.forEach((toggle) => {
				toggle.setAttribute('aria-expanded', 'false');
			});
	};

	const closeAllDropdowns = (except) => {
		document
			.querySelectorAll('.whale-dropdown.is-open, .whale-btn-group.is-open')
			.forEach((owner) => {
				if (owner !== except) {
					closeDropdown(owner);
				}
			});
	};

	const toggleDropdown = (toggle) => {
		const owner = getMenuOwner(toggle);
		const menu = owner?.querySelector('.whale-dropdown-menu');

		if (!owner || !menu) {
			return;
		}

		if (owner.classList.contains('is-open')) {
			closeDropdown(owner);
			return;
		}

		closeAllDropdowns(owner);
		owner.classList.add('is-open');
		menu.classList.add('is-open');
		toggle.setAttribute('aria-expanded', 'true');
	};

	const getModal = (trigger) => {
		const selector =
			trigger.getAttribute('data-whale-target') || trigger.getAttribute('href');
		return selector?.startsWith('#') ? document.querySelector(selector) : null;
	};

	const initReadingProgress = () => {
		const skinRoot = document.querySelector('.Whale');

		if (
			!skinRoot ||
			!document.body.classList.contains('whale-reading-progress-enabled')
		) {
			return;
		}

		const progress = document.createElement('div');
		progress.className = 'whale-reading-progress';
		progress.setAttribute('role', 'progressbar');
		progress.setAttribute(
			'aria-label',
			mw.message('whale-reading-progress').text(),
		);
		progress.setAttribute('aria-valuemin', '0');
		progress.setAttribute('aria-valuemax', '100');
		progress.setAttribute('aria-valuenow', '0');
		skinRoot.append(progress);

		const update = () => {
			const scrollTop =
				window.scrollY || document.documentElement.scrollTop || 0;
			const scrollableHeight = Math.max(
				0,
				document.documentElement.scrollHeight - window.innerHeight,
			);
			const ratio =
				scrollableHeight === 0
					? 1
					: Math.min(1, Math.max(0, scrollTop / scrollableHeight));
			const percent = Math.round(ratio * 100);

			progress.style.transform = `scaleX(${ratio})`;
			progress.setAttribute('aria-valuenow', String(percent));
		};
		const scheduleUpdate = whale.rafThrottle(update);

		update();
		window.addEventListener('scroll', scheduleUpdate, { passive: true });
		window.addEventListener('resize', scheduleUpdate);
	};

	const getTocTarget = () =>
		document.getElementById('toc') ||
		document.querySelector('.toc, #toctitle') ||
		document.getElementById('mw-content-text');

	const setToggleState = (toggle, expanded) => {
		const targetId = toggle.getAttribute('aria-controls');
		const target = targetId ? document.getElementById(targetId) : null;
		const folding = toggle.closest('.whale-folding');
		const heading = toggle.closest('.whale-section-heading');
		const container = heading?.closest('.whale-section-container');
		const collapseLabel = toggle.getAttribute('data-collapse-label') || '';
		const expandLabel = toggle.getAttribute('data-expand-label') || '';

		if (!target) {
			return;
		}

		target.hidden = !expanded;
		toggle.setAttribute('aria-expanded', String(expanded));
		toggle.setAttribute('aria-label', expanded ? collapseLabel : expandLabel);
		folding?.classList.toggle('is-collapsed', !expanded);
		heading?.classList.toggle('is-collapsed', !expanded);
		container?.classList.toggle('is-collapsed', !expanded);
	};

	const toggleCollapsibleContent = (toggle) => {
		if (toggle.hasAttribute('disabled')) {
			return;
		}

		setToggleState(toggle, toggle.getAttribute('aria-expanded') !== 'true');
	};

	const getContentToggle = (target) =>
		whale.closest(target, '.whale-section-toggle, .whale-folding-toggle');
	const isInteractiveHeadingTarget = (target) =>
		Boolean(
			whale.closest(
				target,
				'a, button, input, select, textarea, label, .mw-editsection, .whale-heading-anchor',
			),
		);
	const getHeadingToggle = (target) => {
		if (isInteractiveHeadingTarget(target)) {
			return null;
		}

		const heading = whale.closest(target, '.whale-section-heading');
		return heading?.querySelector?.('.whale-section-toggle') || null;
	};

	let lastDirectToggle = null;
	let lastDirectToggleAt = 0;
	const DIRECT_TOGGLE_SUPPRESS_MS = 700;

	const handleDirectToggle = (event) => {
		if (event.pointerType === 'mouse') {
			return;
		}

		const contentToggle = getContentToggle(event.target);
		if (!contentToggle) {
			return;
		}

		event.preventDefault();
		event.stopPropagation?.();
		lastDirectToggle = contentToggle;
		lastDirectToggleAt = Date.now();
		toggleCollapsibleContent(contentToggle);
	};

	const initContentSkeleton = () => {
		if (!document.body.classList.contains('whale-content-skeleton-enabled')) {
			return;
		}

		const clear = () => {
			document.body.classList.remove('whale-content-skeleton-loading');
		};

		if (document.readyState === 'complete') {
			window.setTimeout(clear, 120);
			return;
		}

		window.addEventListener('load', clear, { once: true });
	};

	const LOGO_SAMPLE_SIZE = 256;
	const LOGO_ALPHA_THRESHOLD = 8;
	const normalizeBrandLogo = async () => {
		const logo = document.querySelector('.whale-navbar-brand-logo');
		const brand = logo?.closest('.whale-navbar-brand');
		if (!logo || !brand) {
			return false;
		}

		try {
			await logo.decode?.();
			if (!logo.naturalWidth || !logo.naturalHeight) {
				return false;
			}

			const scale = Math.min(
				1,
				LOGO_SAMPLE_SIZE / Math.max(logo.naturalWidth, logo.naturalHeight),
			);
			const width = Math.max(1, Math.round(logo.naturalWidth * scale));
			const height = Math.max(1, Math.round(logo.naturalHeight * scale));
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) {
				return false;
			}

			canvas.width = width;
			canvas.height = height;
			context.drawImage(logo, 0, 0, width, height);
			const pixels = context.getImageData(0, 0, width, height).data;
			let left = width;
			let top = height;
			let right = -1;
			let bottom = -1;

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					if (pixels[(y * width + x) * 4 + 3] <= LOGO_ALPHA_THRESHOLD) {
						continue;
					}
					left = Math.min(left, x);
					top = Math.min(top, y);
					right = Math.max(right, x);
					bottom = Math.max(bottom, y);
				}
			}

			if (right < left || bottom < top) {
				return false;
			}

			left = Math.max(0, left - 1);
			top = Math.max(0, top - 1);
			right = Math.min(width - 1, right + 1);
			bottom = Math.min(height - 1, bottom + 1);
			const visibleWidth = right - left + 1;
			const visibleHeight = bottom - top + 1;
			const widthRatio = visibleWidth / width;
			const heightRatio = visibleHeight / height;

			if (widthRatio > 0.94 && heightRatio > 0.94) {
				return true;
			}

			const naturalAspect = logo.naturalWidth / logo.naturalHeight;
			brand.style.setProperty(
				'--whale-logo-visible-aspect',
				String(visibleWidth / visibleHeight),
			);
			brand.style.setProperty(
				'--whale-logo-image-height-factor',
				String(1 / heightRatio),
			);
			brand.style.setProperty(
				'--whale-logo-image-left-factor',
				String(-((left / width) * naturalAspect) / heightRatio),
			);
			brand.style.setProperty(
				'--whale-logo-image-top-factor',
				String(-(top / height) / heightRatio),
			);
			brand.classList.add('whale-navbar-brand-normalized');
			return true;
		} catch {
			// Cross-origin and malformed images retain the safe contain fallback.
			return false;
		}
	};
	const initBrandLogo = async () => {
		if (await normalizeBrandLogo()) {
			return;
		}

		// Deferred script loaders can briefly race image decoding. Retry once after
		// the current loading work settles, then retain the safe contain fallback.
		window.setTimeout(normalizeBrandLogo, 250);
	};

	const MODAL_TRANSITION_MS = 300;
	const FOCUSABLE_SELECTOR = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled]):not([type="hidden"])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
	].join(',');
	let activeModal = null;
	let activeBackdrop = null;
	let activeModalTrigger = null;
	let modalTimer = null;

	const reserveModalScrollbar = () => {
		const hasStableScrollbarGutter = String(
			getComputedStyle(document.documentElement).scrollbarGutter || '',
		).includes('stable');
		const scrollbarWidth = hasStableScrollbarGutter
			? 0
			: Math.max(0, window.innerWidth - document.documentElement.clientWidth);
		document.body.style.setProperty(
			'--whale-modal-scrollbar-offset',
			scrollbarWidth > 0 ? `${scrollbarWidth}px` : '0',
		);
	};

	const clearModalScrollbar = () => {
		document.body.style.removeProperty('--whale-modal-scrollbar-offset');
	};

	const removeBackdrop = () => {
		activeBackdrop?.remove();
		activeBackdrop = null;
	};

	const hideModal = (modal) => {
		modal.classList.remove('is-open');
		modal.setAttribute('aria-hidden', 'true');
		modal.style.display = 'none';
		delete modal.dataset.whaleModalState;
	};

	const closeModal = (modal, options = {}) => {
		if (!modal) {
			return;
		}

		if (modal !== activeModal) {
			hideModal(modal);
			return;
		}

		modal.dataset.whaleModalState = 'closing';
		modal.classList.remove('is-open');
		activeBackdrop?.classList.remove('is-open');
		window.clearTimeout(modalTimer);

		modalTimer = window.setTimeout(() => {
			if (modal.dataset.whaleModalState !== 'closing') {
				return;
			}

			hideModal(modal);
			document.body.classList.remove('whale-modal-open');
			clearModalScrollbar();
			removeBackdrop();
			activeModal = null;
			const trigger =
				options.restoreFocus === false ? null : activeModalTrigger;
			activeModalTrigger = null;
			trigger?.focus?.();
		}, MODAL_TRANSITION_MS);
	};

	const openModal = (modal, trigger = null) => {
		if (!modal) {
			return;
		}

		if (
			modal.dataset.whaleModalState === 'opening' ||
			modal.dataset.whaleModalState === 'open'
		) {
			return;
		}

		let returnTrigger = trigger;
		if (activeModal && activeModal !== modal) {
			returnTrigger = activeModalTrigger || trigger;
			window.clearTimeout(modalTimer);
			hideModal(activeModal);
			activeModal = null;
			activeModalTrigger = null;
		}

		removeBackdrop();
		window.clearTimeout(modalTimer);

		modal.dataset.whaleModalState = 'opening';
		modal.style.display = 'block';
		modal.removeAttribute('aria-hidden');
		reserveModalScrollbar();
		document.body.classList.add('whale-modal-open');
		activeModal = modal;
		activeModalTrigger = returnTrigger;

		activeBackdrop = document.createElement('div');
		activeBackdrop.className = 'whale-modal-backdrop';
		activeBackdrop.addEventListener('click', () => closeModal(modal));
		document.body.append(activeBackdrop);

		window.requestAnimationFrame(() => {
			if (modal.dataset.whaleModalState !== 'opening') {
				return;
			}

			modal.classList.add('is-open');
			activeBackdrop?.classList.add('is-open');
			modal.dataset.whaleModalState = 'open';
			const autofocusTarget =
				modal.querySelector('[data-whale-modal-autofocus]') ||
				modal.querySelector(FOCUSABLE_SELECTOR);
			autofocusTarget?.focus();
			if (autofocusTarget?.matches?.('[readonly]')) {
				autofocusTarget.select?.();
			}
		});
	};

	const trapModalFocus = (event) => {
		if (!activeModal || event.key !== 'Tab') {
			return;
		}

		const focusable = [
			...activeModal.querySelectorAll(FOCUSABLE_SELECTOR),
		].filter((element) => element.offsetParent !== null);
		if (focusable.length === 0) {
			event.preventDefault();
			activeModal.focus();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const activeIndex = focusable.indexOf(document.activeElement);
		if (activeIndex === -1) {
			event.preventDefault();
			(event.shiftKey ? last : first).focus();
		} else if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	const focusSearchFromShortcut = (event) => {
		if (
			event.defaultPrevented ||
			event.key !== '/' ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey ||
			activeModal
		) {
			return false;
		}

		const entryTarget = whale.closest(
			event.target,
			'input, textarea, select, [contenteditable]',
		);
		if (
			entryTarget &&
			(!entryTarget.hasAttribute('contenteditable') ||
				entryTarget.getAttribute('contenteditable') !== 'false')
		) {
			return false;
		}

		const search = document.getElementById('searchInput');
		if (!search) {
			return false;
		}

		event.preventDefault();
		search.focus();
		search.select?.();
		return true;
	};

	whale.ready(() => {
		initBrandLogo();
		initContentSkeleton();
		initReadingProgress();

		document.addEventListener('click', (event) => {
			const scrollUp = whale.closest(event.target, '#whale-scrollup');
			if (scrollUp) {
				event.preventDefault();
				window.scrollTo({ top: 0, behavior: 'smooth' });
				return;
			}

			const scrollDown = whale.closest(event.target, '#whale-scrolldown');
			if (scrollDown) {
				event.preventDefault();
				window.scrollTo({
					top: document.documentElement.scrollHeight,
					behavior: 'smooth',
				});
				return;
			}

			const scrollToc = whale.closest(event.target, '#whale-scrolltoc');
			if (scrollToc) {
				event.preventDefault();
				if (
					document.body.classList.contains(
						'whale-mobile-floating-toc-enabled',
					) &&
					!window.matchMedia?.('(min-width: 1280px)').matches
				) {
					document.dispatchEvent(new CustomEvent('whale:toggleFloatingToc'));
					return;
				}

				whale.scrollToTarget(getTocTarget());
				return;
			}

			const dropdownToggle = whale.closest(
				event.target,
				'[data-whale-toggle="dropdown"]',
			);
			if (dropdownToggle) {
				event.preventDefault();
				event.stopPropagation();
				toggleDropdown(dropdownToggle);
				return;
			}

			const submenuToggle = whale.closest(
				event.target,
				'.whale-dropdown-toggle-sub',
			);
			if (submenuToggle) {
				event.preventDefault();
				event.stopPropagation();
				const submenu = submenuToggle.nextElementSibling;
				if (submenu?.classList.contains('whale-dropdown-menu')) {
					submenu.classList.toggle('is-open');
					const isOpen = submenu.classList.contains('is-open');
					submenu.style.display = isOpen ? 'block' : '';
					submenuToggle.setAttribute(
						'aria-expanded',
						isOpen ? 'true' : 'false',
					);
				}
				return;
			}

			const modalTrigger = whale.closest(
				event.target,
				'[data-whale-toggle="modal"]',
			);
			if (modalTrigger) {
				event.preventDefault();
				closeAllDropdowns();
				openModal(getModal(modalTrigger), modalTrigger);
				return;
			}

			if (event.target.classList?.contains('whale-modal')) {
				event.preventDefault();
				closeModal(event.target);
				return;
			}

			const dismiss = whale.closest(event.target, '[data-whale-dismiss]');
			if (dismiss?.getAttribute('data-whale-dismiss') === 'modal') {
				event.preventDefault();
				closeModal(dismiss.closest('.whale-modal'));
				return;
			}

			const noticeDismiss = whale.closest(
				event.target,
				'[data-whale-dismiss="notice"]',
			);
			if (noticeDismiss) {
				event.preventDefault();
				const notice = noticeDismiss.closest('.whale-notice');
				mw.cookie.set('disable-notice', true, {
					expires: 3600 * 24,
					secure: location.protocol === 'https:',
					sameSite: 'Lax',
				});
				notice?.remove();
				return;
			}

			const contentToggle = getContentToggle(event.target);
			if (contentToggle) {
				event.preventDefault();
				if (
					lastDirectToggle === contentToggle &&
					Date.now() - lastDirectToggleAt < DIRECT_TOGGLE_SUPPRESS_MS
				) {
					return;
				}
				toggleCollapsibleContent(contentToggle);
				return;
			}

			const headingToggle = getHeadingToggle(event.target);
			if (headingToggle) {
				event.preventDefault();
				toggleCollapsibleContent(headingToggle);
				return;
			}

			if (!whale.closest(event.target, '.whale-dropdown, .whale-btn-group')) {
				closeAllDropdowns();
				document
					.querySelectorAll('.whale-dropdown-submenu.is-open')
					.forEach((submenu) => {
						submenu.classList.remove('is-open');
						submenu.style.display = '';
						submenu.previousElementSibling?.setAttribute(
							'aria-expanded',
							'false',
						);
					});
			}
		});

		document.addEventListener('keydown', (event) => {
			if (focusSearchFromShortcut(event)) {
				return;
			}

			trapModalFocus(event);

			if (event.key === 'Escape') {
				closeAllDropdowns();
				closeModal(activeModal);
			}

			if (
				(event.key === 'Enter' || event.key === ' ') &&
				event.target?.classList?.contains('whale-folding-toggle')
			) {
				event.preventDefault();
				toggleCollapsibleContent(event.target);
			}
		});

		document.addEventListener('whale:openModal', (event) => {
			openModal(event.detail?.modal, event.detail?.trigger || null);
		});

		document.addEventListener('whale:closeModal', (event) => {
			closeModal(event.detail?.modal || activeModal, {
				restoreFocus: event.detail?.restoreFocus,
			});
		});

		document.addEventListener('pointerup', handleDirectToggle, {
			passive: false,
		});
		if (!window.PointerEvent) {
			document.addEventListener('touchend', handleDirectToggle, {
				passive: false,
			});
		}
	});
})();
