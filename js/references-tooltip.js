(function () {
  // 참조 링크는 sup.reference 안의 a[href^="#cite_note"]
  const REF_SELECTOR = 'sup.reference > a[href^="#cite_note"], a[href^="#cite_note"]';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let desktopTooltip = null, hideTimer = null, modalOverlay = null;

  // 원본 <li> 복제 후 id·백링크 제거, innerHTML 반환
  function extractContent(refNode) {
    const clone = refNode.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('.mw-cite-backlink').forEach(el => el.remove());
    return clone.innerHTML;
  }

  // — PC 툴팁
  function showDesktopTooltip(link) {
    clearTimeout(hideTimer);
    if (desktopTooltip) return;  // 이미 떠 있으면 재생성 안 함

    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    const html = extractContent(refNode);
    const tip = document.createElement('div');
    tip.className = 'mw-ref-tooltip';
    tip.innerHTML = html;

    // 스타일 (인라인)
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

    // 툴팁에 마우스 올라가면 사라지지 않도록
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

  // — 모바일 모달
  function showMobileModal(link) {
    if (modalOverlay) return;
    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    // 배경 오버레이
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position:   'fixed', top:0, left:0, right:0, bottom:0,
      background: 'rgba(0,0,0,0.5)', zIndex:9998,
      display:    'flex', alignItems:'center', justifyContent:'center'
    });
    document.body.appendChild(overlay);
    modalOverlay = overlay;

    // 모달 박스
    const modal = document.createElement('div');
    modal.className = 'mw-ref-modal';
    const html = extractContent(refNode);
    modal.innerHTML = `<button class="mw-ref-modal-close">닫기</button>
                       <div class="mw-ref-modal-content">${html}</div>`;
    Object.assign(modal.style, {
      background:   '#fff',
      color:        '#111',
      borderRadius: '0.5rem',
      maxWidth:     '90vw',
      maxHeight:    '80vh',
      overflowY:    'auto',
      padding:      '1rem',
      position:     'relative',
      boxShadow:    '0 6px 16px rgba(0,0,0,0.2)',
      boxSizing:    'border-box'
    });
    overlay.appendChild(modal);

    // 닫기 버튼
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

  // — 링크 바인딩 (중복 방지)
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

  // — 초기화 & 무한스크롤 대응
  mw.hook('wikipage.content').add(function ($content) {
    hideDesktopTooltip();
    hideMobileModal();

    // $content 가 jQuery 객체면 [0] 사용
    const root = $content[0] || $content;
    if (!root.querySelectorAll) return;

    root.querySelectorAll(REF_SELECTOR).forEach(bindLink);
  });
})();
