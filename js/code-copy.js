(() => {
	const RESET_DELAY_MS = 2000;
	let feedbackSequence = 0;

	const getMessage = (key) => mw.message(key).text();

	const setButtonLabel = (button, label) => {
		button.textContent = label;
		button.setAttribute('aria-label', label);
	};

	const createCopyButton = () => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'whale-code-copy';
		button.setAttribute('aria-live', 'polite');
		setButtonLabel(button, getMessage('whale-code-copy'));
		return button;
	};

	const prepareCodeBlock = (pre) => {
		if (pre.dataset.whaleCodeCopyReady === 'true') {
			return;
		}

		let wrapper = pre.closest('.mw-highlight');
		if (wrapper) {
			wrapper.classList.add('whale-code-block');
		} else {
			if (!pre.parentNode) {
				return;
			}

			wrapper = document.createElement('div');
			wrapper.className = 'whale-code-block';
			pre.parentNode.insertBefore(wrapper, pre);
			wrapper.append(pre);
		}

		wrapper.prepend(createCopyButton());
		pre.dataset.whaleCodeCopyReady = 'true';
	};

	const prepareCodeBlocks = (root) => {
		if (!root) {
			return;
		}

		if (root.matches?.('pre')) {
			prepareCodeBlock(root);
		}
		root.querySelectorAll?.('pre').forEach(prepareCodeBlock);
	};

	const showCopyResult = (button, messageKey) => {
		const token = String(++feedbackSequence);
		button.dataset.whaleCodeCopyFeedback = token;
		setButtonLabel(button, getMessage(messageKey));

		window.setTimeout(() => {
			if (button.dataset.whaleCodeCopyFeedback !== token) {
				return;
			}

			delete button.dataset.whaleCodeCopyFeedback;
			setButtonLabel(button, getMessage('whale-code-copy'));
		}, RESET_DELAY_MS);
	};

	whale.ready(() => {
		prepareCodeBlocks(document.getElementById('mw-content-text') || document);

		mw.hook?.('wikipage.content')?.add(($content) => {
			prepareCodeBlocks($content?.[0] || document);
		});

		document.addEventListener('click', async (event) => {
			const button = whale.closest(event.target, '.whale-code-copy');
			if (!button) {
				return;
			}

			const pre = button.closest('.whale-code-block')?.querySelector('pre');
			if (!pre) {
				return;
			}

			let copied = false;
			try {
				copied = await whale.copyText(pre.textContent || '');
			} catch {
				copied = false;
			}

			showCopyResult(
				button,
				copied ? 'whale-code-copied' : 'whale-code-copy-failed',
			);
		});
	});
})();
