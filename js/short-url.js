(() => {
	const setButtonState = (button, label) => {
		const original = button.dataset.originalLabel || button.textContent;
		button.dataset.originalLabel = original;
		button.textContent = label;
		window.setTimeout(() => {
			button.textContent = original;
		}, 1600);
	};

	const setStatus = (button, message) => {
		const status = button
			.closest('.whale-short-url-modal')
			?.querySelector('[data-whale-short-url-status]');
		if (!status) {
			return;
		}

		status.textContent = message;
		status.hidden = message === '';
	};

	whale.ready(() => {
		document.addEventListener('click', async (event) => {
			const value = whale.closest(event.target, '.whale-short-url-value');
			if (value) {
				value.select();
				return;
			}

			const button = whale.closest(event.target, '.whale-short-url-copy');
			if (!button) {
				return;
			}

			event.preventDefault();
			const input = document.querySelector('.whale-short-url-value');
			if (!input) {
				return;
			}

			setStatus(button, '');
			input.select();
			try {
				if (await whale.copyText(input.value)) {
					setButtonState(button, mw.msg('whale-short-url-copied'));
					return;
				}
			} catch (error) {
				console.error('Short URL copy failed: ', error);
			}

			setStatus(button, mw.msg('whale-short-url-copy-failed'));
			input.focus();
			input.select();
		});
	});
})();
