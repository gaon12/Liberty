// js/footnote-handler.js
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const footnoteLinks = document.querySelectorAll('a.mw-reference, sup a[href^="#cite_note-"], a[href^="#cite_ref-"]');
        const footnoteModalElement = document.getElementById('footnoteModal');

        if (!footnoteModalElement) {
            console.warn('Footnote modal element #footnoteModal not found. Footnote handler will not initialize.');
            return;
        }

        if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined' || typeof bootstrap.Tooltip === 'undefined') {
            console.error('Bootstrap Modal or Tooltip class not found. Footnote handler will not work.');
            return;
        }

        // Initialize modal instance once
        const footnoteModalInstance = new bootstrap.Modal(footnoteModalElement);
        const modalBody = footnoteModalElement.querySelector('#footnoteModalBody');
        const modalTitle = footnoteModalElement.querySelector('#footnoteModalLabel');

        if (!modalBody || !modalTitle) {
            console.error('Modal body or title element not found in #footnoteModal.');
            return;
        }

        // Update bootstrap theme according to prefers-color-scheme
        const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        function applyTheme() {
            const theme = themeQuery.matches ? 'dark' : 'light';
            document.body.setAttribute('data-bs-theme', theme);
            footnoteModalElement.setAttribute('data-bs-theme', theme);
        }

        applyTheme();
        themeQuery.addEventListener('change', applyTheme);

        function getFootnoteHtml(targetFootnoteId) {
            const footnoteElement = document.getElementById(targetFootnoteId);
            if (!footnoteElement) {
                console.warn('Footnote element with ID ' + targetFootnoteId + ' not found.');
                return '';
            }

            const referenceTextElement = footnoteElement.querySelector('.reference-text');
            if (referenceTextElement) {
                return referenceTextElement.innerHTML;
            }

            const clone = footnoteElement.cloneNode(true);
            const backlinks = clone.querySelectorAll('.mw-cite-backlink');
            backlinks.forEach(bl => bl.remove());
            return clone.innerHTML;
        }

        function showFootnoteModal(targetFootnoteId, linkTextContent) {
            const footnoteElement = document.getElementById(targetFootnoteId);
            if (footnoteElement) {
                let contentToDisplay = '';
                const referenceTextElement = footnoteElement.querySelector('.reference-text');

                if (referenceTextElement) {
                    contentToDisplay = referenceTextElement.innerHTML;
                } else {
                    const clone = footnoteElement.cloneNode(true);
                    const backlinks = clone.querySelectorAll('.mw-cite-backlink');
                    backlinks.forEach(bl => bl.remove());
                    contentToDisplay = clone.innerHTML;
                }

                modalBody.innerHTML = contentToDisplay;
                modalTitle.textContent = 'Footnote ' + (linkTextContent || '');
                footnoteModalInstance.show();
            } else {
                console.warn('Footnote element with ID ' + targetFootnoteId + ' not found.');
            }
        }

        const isDesktop = window.matchMedia('(hover: hover)').matches;

        footnoteLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.charAt(0) !== '#') {
                return; // Skip if not an internal anchor
            }
            const targetId = href.substring(1);
            const linkText = link.textContent.trim();

            if (isDesktop) {
                const tooltip = new bootstrap.Tooltip(link, {
                    container: 'body',
                    html: true,
                    sanitize: false,
                    trigger: 'hover focus',
                    title: () => getFootnoteHtml(targetId)
                });

                link.addEventListener('click', function (event) {
                    // Prevent jumping to the footnote when tooltip is used
                    event.preventDefault();
                    tooltip.show();
                });
            } else {
                link.addEventListener('click', function (event) {
                    event.preventDefault();
                    const content = getFootnoteHtml(targetId);
                    if (content) {
                        modalBody.innerHTML = content;
                        modalTitle.textContent = 'Footnote ' + linkText;
                        footnoteModalInstance.show();
                    }
                });
            }
        });
    });
})();
