(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const content = document.querySelector('#content');
        const footer = document.querySelector('body > section > div > div > footer');

        if (!content || !footer) {
            console.warn('Can not found content or footer');
            return;
        }

        let prevContentWidth = null;

        function syncFooterWidth() {
            const contentWidth = content.offsetWidth;

            if (contentWidth !== prevContentWidth) {
                footer.style.width = contentWidth + 'px';
                console.log(`content width: ${contentWidth}px, footer width: ${footer.offsetWidth}px`);
                prevContentWidth = contentWidth;
            }

            requestAnimationFrame(syncFooterWidth);
        }

        syncFooterWidth(); // 시작
    });
})();
