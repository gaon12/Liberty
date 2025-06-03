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

        if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
            console.error('Bootstrap Modal class not found. Footnote handler will not work.');
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

        let hideModalTimer = null;
        const HOVER_DELAY = 200; // milliseconds before hiding modal

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

        function startHideTimer() {
            clearTimeout(hideModalTimer);
            hideModalTimer = setTimeout(() => {
                footnoteModalInstance.hide();
            }, HOVER_DELAY);
        }

        function clearHideTimer() {
            clearTimeout(hideModalTimer);
        }

        const isDesktop = window.matchMedia("(min-width: 992px)").matches; // Example breakpoint for desktop (Bootstrap's lg)

        footnoteLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.charAt(0) !== '#') {
                return; // Skip if not an internal anchor
            }
            const targetId = href.substring(1);
            const linkText = link.textContent.trim();

            // Click behavior for all devices (as per original Phase 1)
            link.addEventListener('click', function (event) {
                event.preventDefault();
                clearHideTimer(); // Clear any pending hide from hover
                showFootnoteModal(targetId, linkText);
            });

            // Hover behavior for desktop
            if (isDesktop) {
                link.addEventListener('mouseenter', function () {
                    clearHideTimer(); // Clear any existing hide timer
                    // Small delay before showing on hover to avoid accidental popups
                    setTimeout(() => {
                        // Check if modal is already shown by a click or another hover
                        if (!footnoteModalElement.classList.contains('show')) {
                            showFootnoteModal(targetId, linkText);
                        }
                    }, 150); // Short delay before showing
                });

                link.addEventListener('mouseleave', function () {
                    startHideTimer();
                });
            }
        });

        // Keep modal open if mouse enters the modal itself
        if (isDesktop) {
            footnoteModalElement.addEventListener('mouseenter', function () {
                clearHideTimer();
            });

            footnoteModalElement.addEventListener('mouseleave', function () {
                startHideTimer();
            });
        }
    });
})();
