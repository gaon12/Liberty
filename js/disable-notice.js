(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const noticeElement = document.querySelector('.liberty-notice');

        if (noticeElement) {
            // Bootstrap 5 uses the same event name 'closed.bs.alert'
            noticeElement.addEventListener('closed.bs.alert', function () {
                // Assuming mw.cookie.set is a global function provided by MediaWiki environment
                if (typeof mw !== 'undefined' && mw.cookie && typeof mw.cookie.set === 'function') {
                    mw.cookie.set('disable-notice', true, { expires: 3600 * 24 }); // `secure: false` is default or handled by mw.cookie
                } else {
                    console.error('MediaWiki mw.cookie.set function not available.');
                }
            });
        }
    });
})();
