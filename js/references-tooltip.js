(function () {
  const REF_SELECTOR = 'sup.reference, a[href^="#cite_note"]';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let desktopTooltip = null;
  let hideTimer = null;
  let modalOverlay = null;

  // -- 공통: 원본 <li>에서 불필요한 부분 제거하고 HTML 꺼내기
  function extractContent(refNode) {
    refNode = refNode.cloneNode(true);
    // ID, 백링크(↑) 제거
    refNode.removeAttribute('id');
    refNode.querySelectorAll('.mw-cite-backlink').forEach(el => el.remove());
    // 이제 남은 innerHTML 리턴
    return refNode.innerHTML;
  }

  // -- PC용 툴팁 보여주기
  function showDesktopTooltip(link) {
    clearTimeout(hideTimer);
    hideDesktopTooltip();

    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    const html = extractContent(refNode);
    const tip = document.createElement('div');
    tip.className = 'mw-ref-tooltip';
    tip.innerHTML = html;

    // 인라인 스타일
    Object.assign(tip.style, {
      position:      'absolute',
      maxWidth:      '300px',
      padding:       '0.6rem',
      background:    '#fff',
      color:         '#111',
      border:        '1px solid #ccc',
      borderRadius:  '0.5rem',
      boxShadow:     '0 4px 12px rgba(0,0,0,0.15)',
      fontSize:      '0.9rem',
      lineHeight:    '1.4',
      zIndex:        9999,
      boxSizing:     'border-box'
    });

    document.body.appendChild(tip);
    desktopTooltip = tip;

    // 위치 계산
    const rect = link.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    tip.style.top  = (rect.bottom + scrollY + 5) + 'px';
    tip.style.left = (rect.left) + 'px';

    // 툴팁에 올라가도 유지되도록 이벤트
    tip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    tip.addEventListener('mouseleave', hideDesktopTooltip);
  }

  function scheduleHide() {
    hideTimer = setTimeout(hideDesktopTooltip, 150);
  }

  function hideDesktopTooltip() {
    if (desktopTooltip) {
      desktopTooltip.remove();
      desktopTooltip = null;
    }
  }

  // -- 모바일용 모달 보여주기
  function showMobileModal(link) {
    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    // 오버레이
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position:   'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 9998,
      display:    'flex', justifyContent: 'center', alignItems: 'center'
    });
    document.body.appendChild(overlay);
    modalOverlay = overlay;

    // 모달 박스
    const modal = document.createElement('div');
    modal.className = 'mw-ref-modal';
    const html = extractContent(refNode);
    modal.innerHTML = `
      <button class="mw-ref-modal-close">닫기</button>
      <div class="mw-ref-modal-content">${html}</div>
    `;
    Object.assign(modal.style, {
      background:    '#fff',
      color:         '#111',
      borderRadius:  '0.5rem',
      maxWidth:      '90vw',
      maxHeight:     '80vh',
      overflowY:     'auto',
      padding:       '1rem',
      position:      'relative',
      boxShadow:     '0 6px 16px rgba(0,0,0,0.2)',
      boxSizing:     'border-box'
    });
    overlay.appendChild(modal);

    // 닫기 버튼 스타일
    const btn = modal.querySelector('.mw-ref-modal-close');
    Object.assign(btn.style, {
      position:   'absolute',
      top:        '0.5rem',
      right:      '0.5rem',
      border:     'none',
      background: 'transparent',
      fontSize:   '1rem',
      cursor:     'pointer'
    });

    // 닫기 로직
    btn.addEventListener('click', hideMobileModal);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) hideMobileModal();
    });
  }

  function hideMobileModal() {
    if (modalOverlay) {
      modalOverlay.remove();
      modalOverlay = null;
    }
  }

  // -- 링크에 이벤트 붙이기
  function bindLink(link) {
    if (isTouch) {
      link.addEventListener('click', e => {
        e.preventDefault();
        showMobileModal(link);
      }, { passive: false });
    } else {
      link.addEventListener('mouseenter', () => showDesktopTooltip(link));
      link.addEventListener('mouseleave', scheduleHide);
    }
  }

  // -- 초기화 & 무한 스크롤 대응
  mw.hook('wikipage.content').add($content => {
    hideDesktopTooltip();
    hideMobileModal();
    $content.querySelectorAll(REF_SELECTOR).forEach(bindLink);
  });
})();
