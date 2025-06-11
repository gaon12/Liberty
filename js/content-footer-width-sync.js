(function () {
  'use strict';

  function waitForElementsAndSync() {
    const content = document.querySelector('#content');
    const footer = document.querySelector('body > section > div > div > footer');
    const header = document.querySelector('.liberty-content-header');

    if (!content || !footer || !header) {
      // 요소가 아직 안 보이면 다음 루프에서 다시 시도
      requestAnimationFrame(waitForElementsAndSync);
      return;
    }

    let prevContentWidth = null;

    function syncElementsWidth() {
      const contentWidth = content.offsetWidth;

      if (contentWidth !== prevContentWidth) {
        const widthPx = contentWidth + 'px';
        footer.style.width = widthPx;
        header.style.width = widthPx;
        // console.log(`[SYNC] content width: ${contentWidth}px`);
        prevContentWidth = contentWidth;
      }

      requestAnimationFrame(syncElementsWidth);
    }

    // 동기화 루프 시작
    syncElementsWidth();
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
