( function () {
  // ————— 설정 —————
  const REF_SELECTOR = 'sup.reference, a[href^="#cite_note"]';  // 참조 링크 선택자
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let activeTooltip = null;  // 현재 표시 중인 툴팁

  // 다크/라이트 모드 컬러 계산
  function getColors() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      bg:    dark ? '#2e2e2e' : '#ffffff',
      fg:    dark ? '#f0f0f0' : '#111111',
      border:dark ? '#555555' : '#cccccc'
    };
  }

  // 툴팁 제거
  function hideTooltip() {
    if (activeTooltip) {
      document.body.removeChild(activeTooltip);
      activeTooltip = null;
    }
  }

  // 툴팁 생성 및 표시
  function showTooltip(link) {
    hideTooltip();

    // href에서 ID 추출 (#cite_note-1 → cite_note-1)
    const refId = link.getAttribute('href').slice(1);
    const refNode = document.getElementById(refId);
    if (!refNode) return;

    // 참조 내용을 복제
    const clone = refNode.cloneNode(true);

    // 툴팁 엘리먼트
    const tooltip = document.createElement('div');
    tooltip.className = 'mw-ref-tooltip';
    tooltip.appendChild(clone);

    // 스타일 인라인 설정
    const { bg, fg, border } = getColors();
    Object.assign(tooltip.style, {
      position:      'absolute',
      maxWidth:      '90vw',
      padding:       '0.6rem',
      background:    bg,
      color:         fg,
      border:        `1px solid ${border}`,
      borderRadius:  '0.3rem',
      boxShadow:     '0 2px 8px rgba(0,0,0,0.15)',
      fontSize:      '0.9rem',
      lineHeight:    '1.4',
      zIndex:        9999,
      boxSizing:     'border-box',
      overflow:      'auto',
      maxHeight:     '50vh'
    });

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // 위치 계산: 링크 바로 아래·왼쪽 정렬
    const rect = link.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    tooltip.style.top  = (rect.bottom + scrollY + 5) + 'px';
    tooltip.style.left = (rect.left) + 'px';
  }

  // 이벤트 위임 핸들러 등록 (단 한 번)
  function setupDelegation() {
    if (isTouch) {
      // 모바일: 클릭 토글, 바깥 클릭 시 닫기
      document.addEventListener('click', e => {
        const link = e.target.closest(REF_SELECTOR);
        if (link) {
          e.preventDefault();
          activeTooltip ? hideTooltip() : showTooltip(link);
        } else if (activeTooltip && !e.target.closest('.mw-ref-tooltip')) {
          hideTooltip();
        }
      }, { passive: true });
    } else {
      // PC: 마우스 호버
      document.addEventListener('mouseover', e => {
        const link = e.target.closest(REF_SELECTOR);
        if (link) showTooltip(link);
      }, { passive: true });
      document.addEventListener('mouseout', e => {
        const link = e.target.closest(REF_SELECTOR);
        if (link) hideTooltip();
      }, { passive: true });
    }

    // 다크/라이트 모드 변경 감지 시 툴팁 색상 갱신
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (activeTooltip) {
        const { bg, fg, border } = getColors();
        Object.assign(activeTooltip.style, {
          background: bg,
          color: fg,
          border: `1px solid ${border}`
        });
      }
    });
  }

  // 미디어위키 컨텐츠 로드 후(무한 스크롤 등)에도 동작하게 하기
  mw.hook('wikipage.content').add(() => {
    // 최초 한 번만 이벤트 위임 설정
    if (!window._mwRefTooltipInitialized) {
      setupDelegation();
      window._mwRefTooltipInitialized = true;
    }
  });
}() );
