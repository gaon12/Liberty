(() => {
	const anchorSelector = [
		'.toc ul li > a[href^="#"]',
		'#fixed-toc ul li > a[href^="#"]',
		'.mw-cite-backlink > a[href^="#"]',
		'.mw-cite-backlink > * > a[href^="#"]',
		'#preftoc li > a[href^="#"]',
	].join(',');

	window.addEventListener('load', () => {
		whale.scrollToTarget(whale.getAnchorTarget(window.location.hash));
	});

	document.addEventListener('click', (event) => {
		const headlineNumber = whale.closest(event.target, '.mw-headline-number');
		if (headlineNumber) {
			event.preventDefault();
			whale.scrollToTarget(document.getElementById('toctitle'));
			return;
		}

		const link = whale.closest(event.target, anchorSelector);
		const target = whale.getAnchorTarget(link?.getAttribute('href'));

		if (!target) {
			return;
		}

		event.preventDefault();

		if (link.closest('#preftoc')) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}

		whale.scrollToTarget(target);
	});
})();
