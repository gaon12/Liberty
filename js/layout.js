(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        /* Dropdown fade in/out */
        const dropdowns = document.querySelectorAll('.dropdown, .btn-group');
        dropdowns.forEach(function (dropdown) {
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) {
                dropdown.addEventListener('show.bs.dropdown', function () {
                    menu.style.display = 'block';
                    menu.style.opacity = '0';
                    void menu.offsetWidth;
                    menu.style.transition = 'opacity 200ms ease-in-out';
                    menu.style.opacity = '1';
                });

                dropdown.addEventListener('hide.bs.dropdown', function () {
                    menu.style.transition = 'opacity 200ms ease-in-out';
                    menu.style.opacity = '0';
                    setTimeout(() => {
                        if (!menu.classList.contains('show')) {
                             menu.style.display = 'none';
                        }
                        else {
                            menu.style.display = 'none';
                        }
                    }, 200);
                });
            }
        });

        /* Modal Focus */
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.addEventListener('shown.bs.modal', function () {
                const wpNameInput = document.getElementById('wpName1');
                if (wpNameInput) {
                    wpNameInput.focus();
                }
            });
        }

        /* Sub menu */
        let currentlyOpenSubmenu = null;
        let currentlyOpenSubmenuToggle = null;
        const subMenuToggles = document.querySelectorAll('.dropdown-toggle-sub');

        subMenuToggles.forEach(function (toggle) {
            toggle.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();

                let subMenu = this.nextElementSibling;
                while(subMenu && !(subMenu.classList && subMenu.classList.contains('dropdown-menu'))) {
                    subMenu = subMenu.nextElementSibling;
                }

                if (subMenu) {
                    if (currentlyOpenSubmenu && currentlyOpenSubmenu !== subMenu) {
                        currentlyOpenSubmenu.style.display = 'none';
                    }

                    if (window.getComputedStyle(subMenu).display === 'none') {
                        subMenu.style.display = 'block';
                        currentlyOpenSubmenu = subMenu;
                        currentlyOpenSubmenuToggle = this;
                    } else {
                        subMenu.style.display = 'none';
                        if (currentlyOpenSubmenu === subMenu) {
                           currentlyOpenSubmenu = null;
                           currentlyOpenSubmenuToggle = null;
                        }
                    }
                }
            });
        });

        document.documentElement.addEventListener('click', function (event) {
            if (currentlyOpenSubmenu && currentlyOpenSubmenuToggle) {
                if (!currentlyOpenSubmenuToggle.contains(event.target) &&
                    !currentlyOpenSubmenu.contains(event.target)) {
                    currentlyOpenSubmenu.style.display = 'none';
                    currentlyOpenSubmenu = null;
                    currentlyOpenSubmenuToggle = null;
                }
            }
        });
    });
})();
