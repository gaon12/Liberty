(function () {
  'use strict';

  function waitForElementsAndSync() {
    const content = document.querySelector('#content');
    const footer = document.querySelector('body > section > div > div > footer');

    if (!content || !footer) {
      // 요소가 아직 안 보이면 다음 루프에서 다시 시도
      requestAnimationFrame(waitForElementsAndSync);
      return;
    }

    let prevContentWidth = null;

    function syncFooterWidth() {
      const contentWidth = content.offsetWidth;

      if (contentWidth !== prevContentWidth) {
        footer.style.width = contentWidth + 'px';
        // console.log(`[SYNC] content width: ${contentWidth}px, footer width: ${footer.offsetWidth}px`);
        prevContentWidth = contentWidth;
      }

      requestAnimationFrame(syncFooterWidth);
    }

    // 동기화 루프 시작
    syncFooterWidth();
  }

  // DOM 완전히 준비된 후 시작
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    requestAnimationFrame(waitForElementsAndSync);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      requestAnimationFrame(waitForElementsAndSync);
    });
  }
})();
