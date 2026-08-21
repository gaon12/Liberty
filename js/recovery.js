(() => {
	const RECOVERY_DELAY = 3000;
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

	const recoverResourceLoader = async () => {
		if (window.mw?.loader || recoveryState.whaleResourceLoaderRecovery) {
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

		for (const snapshot of snapshots) {
			await replayScript({
				dataset: {},
				src: snapshot.src,
				text: snapshot.source,
				textContent: snapshot.source,
			});
		}
	};

	window.setTimeout(() => {
		recoverResourceLoader().catch(() => {});
	}, RECOVERY_DELAY);
})();
