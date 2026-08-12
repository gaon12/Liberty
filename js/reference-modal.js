(() => {
	const ID_REFERENCE_ATTRIBUTES = [
		'id',
		'for',
		'aria-controls',
		'aria-describedby',
		'aria-labelledby',
		'aria-owns',
	];
	let activeReferenceTarget = null;

	const getModalParts = () => {
		const modal = document.getElementById('whale-reference-modal');
		return {
			modal,
			title: modal?.querySelector('[data-whale-reference-title]'),
			content: modal?.querySelector('[data-whale-reference-content]'),
			jump: modal?.querySelector('[data-whale-reference-jump]'),
		};
	};

	const getReferenceTarget = (link) => {
		const href = link.getAttribute('href');
		if (!href) {
			return null;
		}

		try {
			const url = new URL(href, window.location.href);
			const currentUrl = new URL(window.location.href);
			if (
				!url.hash ||
				url.origin !== currentUrl.origin ||
				url.pathname !== currentUrl.pathname ||
				url.search !== currentUrl.search
			) {
				return null;
			}

			const target = whale.getAnchorTarget(url.hash);
			if (
				!target?.matches('li[id^="cite_note"]') ||
				!target.closest('.references, .mw-references')
			) {
				return null;
			}

			return { hash: url.hash, target };
		} catch {
			return null;
		}
	};

	const removeIdReferences = (root) => {
		for (const node of [root, ...root.querySelectorAll('*')]) {
			for (const attribute of ID_REFERENCE_ATTRIBUTES) {
				node.removeAttribute(attribute);
			}
		}
	};

	const openReference = (link) => {
		const resolved = getReferenceTarget(link);
		if (!resolved) {
			return false;
		}

		const source = resolved.target.querySelector(
			'.reference-text, .mw-reference-text',
		);
		const { modal, title, content, jump } = getModalParts();
		if (!source || !modal || !title || !content || !jump) {
			return false;
		}

		const referenceContent = source.cloneNode(true);
		removeIdReferences(referenceContent);
		content.replaceChildren(referenceContent);

		const marker = (link.textContent || '')
			.trim()
			.replace(/^\[\s*|\s*\]$/g, '');
		title.textContent = marker
			? mw.message('whale-reference-title-numbered', marker).text()
			: mw.message('whale-reference-title').text();
		jump.setAttribute('href', resolved.hash);
		activeReferenceTarget = resolved.target;

		document.dispatchEvent(
			new CustomEvent('whale:openModal', {
				detail: { modal, trigger: link },
			}),
		);
		return true;
	};

	whale.ready(() => {
		document.addEventListener('click', (event) => {
			const jump = whale.closest(event.target, '[data-whale-reference-jump]');
			if (jump && activeReferenceTarget) {
				event.preventDefault();
				document.dispatchEvent(
					new CustomEvent('whale:closeModal', {
						detail: {
							modal: getModalParts().modal,
							restoreFocus: false,
						},
					}),
				);
				whale.scrollToTarget(activeReferenceTarget);
				return;
			}

			if (
				event.defaultPrevented ||
				(event.button !== undefined && event.button !== 0) ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}

			const link = whale.closest(event.target, 'a[href]');
			if (
				!link ||
				link.closest('#whale-reference-modal') ||
				!link.closest('.reference, .mw-ref')
			) {
				return;
			}

			if (openReference(link)) {
				event.preventDefault();
			}
		});
	});
})();
