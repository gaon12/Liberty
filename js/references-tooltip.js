(function () {
  // 참조 링크 선택자: sup.reference 내부의 <a> 또는 독립된 a[href^="#cite_note"]
  const REF_SELECTOR = 'sup.reference > a[href^="#cite_note"], a[href^="#cite_note"]';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let desktopTooltip = null,
      hideTimer = null,
      modalOverlay = null;

  // ——————————————————————————————————————————
  // 원본 <li>에서 id·백링크 제거 후 innerHTML 반환
  function extractContent(refNode) {
    const clone = refNode.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('.mw-cite-backlink').forEach(el => el.remove());
    return clone.innerHTML;
  }

  // ——————————————————————————————————————————
  // PC: 링크 호버 시 툴팁 표시
  function showDesktopTooltip(link) {
    clearTimeout(hideTimer);
    if (desktopTooltip) return;

    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    const html = extractContent(refNode);
    const tip = document.createElement('div');
    tip.className = 'mw-ref-tooltip';
    tip.innerHTML = html;

    // 인라인 스타일
    Object.assign(tip.style, {
      position:     'absolute',
      maxWidth:     '300px',
      padding:      '0.6rem',
      background:   '#fff',
      color:        '#111',
      border:       '1px solid #ccc',
      borderRadius: '0.5rem',
      boxShadow:    '0 4px 12px rgba(0,0,0,0.15)',
      fontSize:     '0.9rem',
      lineHeight:   '1.4',
      zIndex:       9999,
      boxSizing:    'border-box'
    });

    document.body.appendChild(tip);
    desktopTooltip = tip;

    // 위치 계산: 링크 바로 아래
    const rect = link.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    tip.style.top  = (rect.bottom + scrollY + 5) + 'px';
    tip.style.left = rect.left + 'px';

    // 툴팁 위 마우스 유지 시 사라지지 않도록
    tip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    tip.addEventListener('mouseleave', scheduleHide);
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideDesktopTooltip, 150);
  }

  function hideDesktopTooltip() {
    clearTimeout(hideTimer);
    if (desktopTooltip) {
      desktopTooltip.remove();
      desktopTooltip = null;
    }
  }

  // ——————————————————————————————————————————
  // 모바일: 클릭하면 모달 표시
  function showMobileModal(link) {
    if (modalOverlay) return;

    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    // 1) 배경 오버레이
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position:   'fixed',
      top:        0,
      left:       0,
      right:      0,
      bottom:     0,
      background: 'rgba(0,0,0,0.5)',
      zIndex:     9998,
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    document.body.appendChild(overlay);
    modalOverlay = overlay;

    // 2) 모달 박스 (flex column)
    const modal = document.createElement('div');
    modal.className = 'mw-ref-modal';
    Object.assign(modal.style, {
      background:   '#fff',
      color:        '#111',
      borderRadius: '0.5rem',
      width:        '90vw',
      maxWidth:     '400px',
      maxHeight:    '80vh',
      display:      'flex',
      flexDirection:'column',
      boxShadow:    '0 6px 16px rgba(0,0,0,0.2)',
      boxSizing:    'border-box',
      overflow:     'hidden'
    });
    overlay.appendChild(modal);

    // 3) 내용 영역
    const contentDiv = document.createElement('div');
    contentDiv.className = 'mw-ref-modal-content';
    contentDiv.innerHTML = extractContent(refNode);
    Object.assign(contentDiv.style, {
      padding:   '1rem',
      overflowY: 'auto',
      flex:      '1 1 auto'
    });
    modal.appendChild(contentDiv);

    // 4) 구분선
    const hr = document.createElement('hr');
    Object.assign(hr.style, {
      margin:     '0',
      border:     'none',
      borderTop:  '1px solid #ddd'
    });
    modal.appendChild(hr);

    // 5) 버튼 영역
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding:   '0.75rem',
      textAlign: 'center',
      flex:      '0 0 auto'
    });
    const btn = document.createElement('button');
    btn.className = 'mw-ref-modal-close';
    btn.textContent = '닫기';
    Object.assign(btn.style, {
      padding:      '0.5rem 1.5rem',
      fontSize:     '1rem',
      border:       'none',
      borderRadius: '0.3rem',
      background:   '#f0f0f0',
      cursor:       'pointer'
    });
    btn.addEventListener('click', hideMobileModal);
    footer.appendChild(btn);
    modal.appendChild(footer);

    // 6) 배경 클릭 시 닫기
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

  // ——————————————————————————————————————————
  // 링크에 이벤트 바인딩 (중복 방지)
  function bindLink(link) {
    if (link.dataset.refTooltipBound) return;
    link.dataset.refTooltipBound = '1';

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

  // ——————————————————————————————————————————
  // 초기화 & 무한 스크롤 대응
  mw.hook('wikipage.content').add(function ($content) {
    hideDesktopTooltip();
    hideMobileModal();

    const root = $content[0] || $content;
    if (!root.querySelectorAll) return;
    root.querySelectorAll(REF_SELECTOR).forEach(bindLink);
  });
})();
