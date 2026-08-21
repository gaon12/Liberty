(() => {
	const RECOVERY_CHECKS = [
		{ delay: 3000, force: false },
		{ delay: 6500, force: true },
	];
	const recoveryState = document.documentElement.dataset;
	const requiredModules = (
		document.currentScript?.dataset.whaleModules || 'skins.whale.layoutjs'
	)
		.split(',')
		.filter(Boolean);
	recoveryState.whaleResourceLoaderRecoveryScript = 'loaded';
	const hasHealthyRuntime = () =>
		Boolean(
			window.mw?.loader &&
				requiredModules.every(
					(moduleName) => window.mw.loader.getState(moduleName) === 'ready',
				),
		);

	const isResourceLoaderScript = (script) => {
		if (script.dataset.whaleRecovery === 'true') {
			return false;
		}

		if (script.src) {
			return (
				/\/load\.php\?/.test(script.src) && /[?&]only=scripts/.test(script.src)
			);
		}

		const source = script.text || script.textContent || '';
		return /(?:RLCONF|RLSTATE|RLPAGEMODULES|RLQ|mw\.config\.set)=?/.test(
			source,
		);
	};

	const evaluateSource = (source) => {
		const replacement = document.createElement('script');
		replacement.text = source;
		document.head.append(replacement);
		replacement.remove();
	};

	const replayScript = async (script) => {
		const source = script.src
			? await fetch(script.src, { credentials: 'same-origin' }).then(
					(response) => {
						if (!response.ok) {
							throw new Error('ResourceLoader recovery request failed.');
						}
						return response.text();
					},
				)
			: script.text || script.textContent || '';
		evaluateSource(source);
	};

	const recoverResourceLoader = async (force) => {
		if (
			hasHealthyRuntime() ||
			recoveryState.whaleResourceLoaderRecovery ||
			(!force && window.mw?.loader)
		) {
			return;
		}

		const scripts = [...document.querySelectorAll('script')].filter(
			isResourceLoaderScript,
		);
		if (scripts.length === 0) {
			return;
		}

		recoveryState.whaleResourceLoaderRecovery = 'attempted';
		const snapshots = scripts.map((script) => ({
			script,
			source: script.text || script.textContent || '',
			src: script.src,
		}));

		// Detach every Rocket Loader placeholder before awaiting a fetch. Leaving
		// it mounted lets Cloudflare execute the original while the replacement
		// is downloading, which implements every ResourceLoader module twice.
		scripts.forEach((script) => {
			script.remove();
		});
		// Discard the partial loader and its callback queue before evaluating a
		// fresh startup. Keeping either registry reimplements core modules.
		delete window.mw;
		delete window.mediaWiki;
		window.RLQ = [];

		for (const snapshot of snapshots) {
			await replayScript({
				dataset: {},
				src: snapshot.src,
				text: snapshot.source,
				textContent: snapshot.source,
			});
		}
		if (!window.mw?.loader) {
			throw new Error('ResourceLoader startup did not initialize.');
		}
		await window.mw.loader.using(requiredModules);
		recoveryState.whaleResourceLoaderRecovery = 'complete';
	};
	const recordRecoveryError = (error) => {
		recoveryState.whaleResourceLoaderRecovery = 'failed';
		recoveryState.whaleResourceLoaderRecoveryError =
			error instanceof Error ? error.name : 'UnknownError';
	};

	RECOVERY_CHECKS.forEach(({ delay, force }) => {
		window.setTimeout(() => {
			recoverResourceLoader(force).catch(recordRecoveryError);
		}, delay);
	});
})();
