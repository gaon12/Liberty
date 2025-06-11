(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var content = document.getElementById('content');
        var footer = document.querySelector('body > section > div > div > footer');

        function updateWidth() {
            if (!content || !footer) {
                return;
            }
            var width = content.offsetWidth;
            footer.style.width = width + 'px';
            console.log('content width:', width, 'footer width:', footer.offsetWidth);
        }

        updateWidth();
        window.addEventListener('resize', updateWidth);
        setInterval(updateWidth, 500);
    });
})();
