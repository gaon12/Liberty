(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        const scrollUpButton = document.getElementById('liberty-scrollup');
        const scrollDownButton = document.getElementById('liberty-scrolldown');

        if (scrollUpButton) {
            scrollUpButton.addEventListener('click', function (event) {
                event.preventDefault(); // To prevent default anchor behavior if it were an <a> tag
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }

        if (scrollDownButton) {
            scrollDownButton.addEventListener('click', function (event) {
                event.preventDefault(); // To prevent default anchor behavior
                window.scrollTo({
                    top: document.documentElement.scrollHeight, // More reliable than $(document).height()
                    behavior: 'smooth'
                });
            });
        }
    });
})();
