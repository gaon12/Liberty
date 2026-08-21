(() => {
	const PASS_STATUS = 'PASS';
	let loginInFlight = null;

	const setPending = (form, pending) => {
		const submit = form.querySelector('.whale-login-submit');
		const label = submit?.querySelector('.whale-login-submit-label');
		const pendingLabel = submit?.querySelector('.whale-login-submit-pending');

		form.setAttribute('aria-busy', String(pending));
		if (submit) {
			submit.disabled = pending;
		}
		if (label) {
			label.hidden = pending;
		}
		if (pendingLabel) {
			pendingLabel.hidden = !pending;
		}
	};

	const hideLoginError = (form) => {
		const alert = form
			.closest('.whale-login-modal')
			?.querySelector('.whale-alert');
		alert?.classList.add('whale-alert-hidden');
	};

	const showLoginError = (form, message) => {
		const alert = form
			.closest('.whale-login-modal')
			?.querySelector('.whale-alert');

		if (!alert) {
			return;
		}

		alert.classList.add('whale-alert-warning');
		alert.classList.remove('whale-alert-hidden');
		alert.textContent = message || form.dataset.errorMessage || '';
		alert.focus?.({ preventScroll: true });
	};

	const redirectAfterLogin = () => {
		if (mw.config.get('wgNamespaceNumber') === -1) {
			location.assign(mw.config.get('wgArticlePath').replace('$1', ''));
			return;
		}

		location.reload();
	};

	const login = async (form) => {
		if (loginInFlight) {
			return loginInFlight;
		}

		loginInFlight = (async () => {
			setPending(form, true);
			hideLoginError(form);

			try {
				const api = await whale.getApi();
				const tokenResult = await api.post(
					Object.freeze({
						action: 'query',
						meta: 'tokens',
						type: 'login',
					}),
				);
				const loginToken = tokenResult?.query?.tokens?.logintoken;
				if (typeof loginToken !== 'string' || loginToken === '') {
					throw new TypeError('Missing login token.');
				}

				const result = await api.post(
					Object.freeze({
						action: 'clientlogin',
						loginreturnurl: location.href,
						username: form.elements.wpName.value,
						password: form.elements.wpPassword.value,
						rememberMe: form.elements.wpRemember.checked ? 1 : 0,
						logintoken: loginToken,
					}),
				);
				const response = result?.clientlogin;

				if (response?.status !== PASS_STATUS) {
					showLoginError(form, response?.message);
					return false;
				}

				redirectAfterLogin();
				return true;
			} catch {
				showLoginError(form, form.dataset.errorMessage);
				return false;
			} finally {
				setPending(form, false);
				loginInFlight = null;
			}
		})();

		return loginInFlight;
	};

	const bindPasswordToggle = (form) => {
		const password = form.elements.wpPassword;
		const toggle = form.querySelector('.whale-login-password-toggle');

		if (!(password instanceof HTMLInputElement) || !toggle) {
			return;
		}

		toggle.addEventListener('click', () => {
			const shouldShow = password.type === 'password';
			password.type = shouldShow ? 'text' : 'password';
			toggle.setAttribute('aria-pressed', String(shouldShow));
			toggle.setAttribute(
				'aria-label',
				shouldShow ? toggle.dataset.hideLabel : toggle.dataset.showLabel,
			);
			password.focus({ preventScroll: true });
		});
	};

	whale.ready(() => {
		const form = document.getElementById('whale-login-form');

		if (!(form instanceof HTMLFormElement)) {
			return;
		}

		bindPasswordToggle(form);
		form.addEventListener('input', () => hideLoginError(form));
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			if (form.reportValidity()) {
				void login(form);
			}
		});
	});
})();
