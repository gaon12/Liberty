(() => {
	const RECOVERY_CHECKS = [
		{ delay: 3000, force: false },
		{ delay: 6500, force: true },
	];
	const recoveryState = document.documentElement.dataset;
	recoveryState.whaleResourceLoaderRecoveryScript = 'loaded';

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
			recoveryState.whaleLayoutRuntime === 'ready' ||
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
		// A failed startup can leave RLQ.push bound to its discarded module
		// registry. Queue bootstrap callbacks for the fresh startup instead.
		window.RLQ = [];

		for (const snapshot of snapshots) {
			await replayScript({
				dataset: {},
				src: snapshot.src,
				text: snapshot.source,
				textContent: snapshot.source,
			});
		}
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
