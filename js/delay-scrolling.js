(function () {
    'use strict';

    // Helper function to get an element from a hash, supporting plain IDs and IDs with '.'
    function getElementFromHash(hashString) {
        if (!hashString || hashString.charAt(0) !== '#') {
            return null;
        }
        let cleanHash = hashString.substring(1);
        // The original code `if (hash.indexOf('.') !== -1)` implies that if a dot is present,
        // it's part of an ID that jQuery's $() can handle directly (e.g. for characters that need escaping in CSS selectors but are valid in getElementById).
        // document.getElementById doesn't need such escaping.
        // So, `hash = document.getElementById(hash.replace('#',''))` was the jQuery pattern.
        // For pure JS, we just use the cleaned hash.
        return document.getElementById(cleanHash);
    }

    // Helper function to get element's top offset relative to the document
    function getElementDocumentOffsetTop(element) {
        if (!element) return 0;
        // getBoundingClientRect().top is relative to the viewport. Add scrollY to make it relative to document.
        return element.getBoundingClientRect().top + window.pageYOffset;
    }

    function smoothScrollTo(element, navHeight, duration = 350) { // duration is not directly used by scrollTo 'smooth'
        if (!element) return;
        const targetY = getElementDocumentOffsetTop(element) - navHeight - 10;
        window.scrollTo({
            top: targetY,
            behavior: 'smooth'
        });
    }

    function smoothScrollToY(yPosition, duration = 350) { // duration is not directly used by scrollTo 'smooth'
        window.scrollTo({
            top: yPosition,
            behavior: 'smooth'
        });
    }

    window.addEventListener('load', function () {
        const navWrapper = document.querySelector('.nav-wrapper');
        const navHeight = navWrapper ? navWrapper.offsetHeight : 0;
        let initialHash = window.location.hash;

        if (initialHash) {
            const targetElement = getElementFromHash(initialHash);
            if (targetElement) {
                // Delay slightly to ensure layout is fully stable after load
                setTimeout(() => {
                    smoothScrollTo(targetElement, navHeight);
                }, 100); // Small delay
            }
        }

        const selectorsToProcess = [
            '.toc ul li > a',
            '.mw-headline-number', // This scrolls to #toctitle
            '.mw-cite-backlink > a',
            '.mw-cite-backlink > * > a', // Handles elements like <span><a></a></span>
            '.reference > a',
            '#preftoc li > a'
        ];

        selectorsToProcess.forEach(function(selector) {
            const links = document.querySelectorAll(selector);
            links.forEach(function(link) {
                link.addEventListener('click', function(event) {
                    // For '.mw-headline-number', the target is fixed to '#toctitle'
                    if (selector === '.mw-headline-number') {
                        const tocTitleElement = document.getElementById('toctitle');
                        if (tocTitleElement) {
                            event.preventDefault();
                            smoothScrollTo(tocTitleElement, navHeight);
                        }
                        return; // Processed
                    }

                    // For '#preftoc li > a', original logic scrolls to top (0)
                    if (selector === '#preftoc li > a') {
                         const href = this.getAttribute('href');
                         if (href && href.charAt(0) === '#') { // Check if it's an anchor link
                            event.preventDefault();
                            smoothScrollToY(0); // Scroll to top of the page
                         }
                         return; // Processed
                    }

                    const href = this.getAttribute('href');
                    if (href && href.charAt(0) === '#') {
                        event.preventDefault();
                        const targetElement = getElementFromHash(href);
                        if (targetElement) {
                            smoothScrollTo(targetElement, navHeight, selector.includes('cite') || selector.includes('reference') ? 400 : 350);
                        }
                    }
                });
            });
        });
    });
})();
