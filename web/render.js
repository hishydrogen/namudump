/* 나무위키 덤프의 HTML을 안전하고 깔끔한 문서 DOM으로 바꾼다.
 *
 * 덤프의 HTML은 나무위키 웹페이지 전체이며, 크롤링 방지용 가짜 요소와
 * 무작위로 바뀌는 클래스 이름이 섞여 있다. 여기서는 클래스 이름 대신
 * 구조를 보고 본문, 문단 제목, 표, 각주, 이미지, 접기를 찾아낸다.
 * DOMParser로 만든 문서는 스크립트가 실행되지 않으며, 최종 결과는
 * 허용 목록에 있는 태그와 속성만 남긴다.
 */
(function (global) {
  'use strict';

  const HEX_CLASS = /^_[0-9a-f]{16}$|^_[0-9a-f]{32}$/;
  const FN_ID = /(^|-)fn-/;
  const RFN_ID = /(^|-)rfn-/;

  const KEEP_TAGS = new Set(('a abbr b bdi bdo blockquote br caption code col colgroup dd del details dfn div dl dt em ' +
    'figcaption figure h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark nav ol p pre q rp rt ruby s samp small span strike ' +
    'strong sub summary sup table tbody td tfoot th thead time tr tt u ul var wbr center font big section article button').split(' '));
  const DROP_TAGS = new Set('script style noscript template iframe frame frameset object embed applet form input textarea select option link meta base svg math canvas audio video source track param head title'.split(' '));
  const MATH_TAGS = new Set('math semantics mrow mi mo mn ms mtext mspace msup msub msubsup mfrac msqrt mroot mstyle mover munder munderover mtable mtr mtd mpadded mphantom menclose annotation mlabeledtr maligngroup malignmark mglyph merror'.split(' '));
  const SVG_TAGS = new Set('svg path line rect circle g polyline polygon use defs clippath'.split(' '));
  const GLOBAL_ATTRS = new Set(['id', 'title', 'lang', 'dir', 'colspan', 'rowspan', 'align', 'valign', 'width', 'height']);

  const hasDV = (el) => {
    const names = el.getAttributeNames();
    for (let i = 0; i < names.length; i++) if (names[i].charCodeAt(0) === 100 && names[i].startsWith('data-v-')) return true;
    return false;
  };
  const dvOf = (el) => el.getAttributeNames().find((n) => n.startsWith('data-v-'));
  const blankText = (s) => /^[\s ​]*$/.test(s);

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (e) {
      try { return decodeURI(s); } catch (e2) { return s; }
    }
  }

  function cleanStyle(s) {
    if (!s) return '';
    s = String(s).replace(/\/\*[\s\S]*?\*\//g, '');
    const bad = /url\s*\(|expression\s*\(|javascript:|behavior\s*:|-moz-binding|@import|position\s*:\s*fixed/i;
    if (bad.test(s)) s = s.split(';').filter((d) => !bad.test(d)).join(';');
    return s.trim();
  }

  /* 문서 안의 <style>(위키 CSS)을 본문 범위로 한정한다. */
  function scopeCss(css) {
    css = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
    if (/@import|expression\s*\(|javascript:|-moz-binding|behavior\s*:/i.test(css)) {
      css = css.replace(/@import[^;]*;?/gi, '');
    }
    css = css.replace(/url\s*\([^)]*\)/gi, 'none');
    css = css.replace(/position\s*:\s*fixed/gi, 'position:absolute');
    const scope = '.nd-content';
    const fixSel = (sel) => sel.split(',').map((s) => {
      s = s.trim();
      if (!s) return s;
      s = s.replace(/\.(?:\\.|[\w+-])+\[class\]/g, scope);
      s = s.replace(/^(html|body|:root)\b/, scope);
      return s.startsWith(scope) ? s : scope + ' ' + s;
    }).join(', ');
    let out = '';
    let i = 0;
    const n = css.length;
    while (i < n) {
      const open = css.indexOf('{', i);
      if (open < 0) break;
      const head = css.slice(i, open).trim();
      if (head.startsWith('@media') || head.startsWith('@supports')) {
        // 한 단계 중첩 블록
        let depth = 1, j = open + 1;
        while (j < n && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
        out += head + '{' + scopeCss(css.slice(open + 1, j - 1)) + '}';
        i = j;
        continue;
      }
      const close = css.indexOf('}', open);
      if (close < 0) break;
      const body = css.slice(open + 1, close);
      if (head.startsWith('@')) { if (/^@keyframes|^@font-face/i.test(head)) { /* 무시 */ } }
      else if (head) out += fixSel(head) + '{' + body + '}';
      i = close + 1;
    }
    return out;
  }

  function svgDims(src) {
    try {
      const b64 = src.split(',')[1] || '';
      const txt = atob(b64);
      const w = /width="([\d.]+)"/.exec(txt), h = /height="([\d.]+)"/.exec(txt);
      if (w && h) return [w[1], h[1]];
    } catch (e) { /* 무시 */ }
    return null;
  }

  function unwrap(el) {
    const p = el.parentNode;
    if (!p) return;
    while (el.firstChild) p.insertBefore(el.firstChild, el);
    p.removeChild(el);
  }

  function absUrl(u) {
    if (!u) return '';
    u = u.trim();
    if (u.startsWith('//')) return 'https:' + u;
    return u;
  }

  function mostCommon(counter) {
    let best = null, bn = -1;
    counter.forEach((n, k) => { if (n > bn) { bn = n; best = k; } });
    return best;
  }

  /* 본문 블록(B) 찾기: 라이선스 안내 바로 앞 형제 */
  function findBody(doc) {
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let hit = null, node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf('이 저작물은') >= 0) hit = node;
    }
    if (hit) {
      let lic = hit.parentElement;
      while (lic.parentElement && lic.parentElement !== doc.body &&
        lic.parentElement.textContent.trimStart().startsWith('이 저작물은')) lic = lic.parentElement;
      let b = lic.previousElementSibling;
      while (b && blankText(b.textContent) && !b.querySelector('img,table')) b = b.previousElementSibling;
      if (b) return b;
    }
    // 대체 경로: 첫 문단 제목의 조상 중 형제가 여럿인 곳
    const h = doc.querySelector('h2, h3, h4');
    if (h) {
      let e = h;
      while (e.parentElement && e.parentElement !== doc.body && e.parentElement.childElementCount < 3) e = e.parentElement;
      return e.parentElement || doc.body;
    }
    return doc.body;
  }

  function render(raw, opts) {
    opts = opts || {};
    const classMap = opts.classMap || { size: {}, align: {} };
    const out = {
      categories: [], toc: [], linkTitles: new Set(), css: '', hadBody: true,
    };
    // 이미지 안에 들어 있는 빈 /jump/ 링크는 바깥 링크 안에 겹쳐 있어서(링크 안의 링크),
    // HTML 파서가 바깥 링크를 거기서 끊어 버린다. 그러면 이미지 뒤의 글자가 링크 밖으로 밀려나
    // 틀 배치가 깨지므로, 파싱 전에 미리 지운다.
    raw = String(raw || '').replace(/<a\b[^>]*\bhref="\/jump\/[^"]*"[^>]*>\s*<\/a>/g, '');
    const doc = new DOMParser().parseFromString(raw, 'text/html');

    // 1) 크롤링 방지용 가짜 요소 제거
    doc.querySelectorAll('div[class]').forEach((el) => {
      if (el.childElementCount === 0 && !hasDV(el) && blankText(el.textContent)) el.remove();
    });

    // 2) 본문 블록
    const B = findBody(doc);
    out.hadBody = B !== doc.body;

    // 3) 위키 CSS 수집
    const cssParts = [];
    B.querySelectorAll('style').forEach((s) => { cssParts.push(s.textContent || ''); s.remove(); });
    out.css = cssParts.length ? scopeCss(cssParts.join('\n')) : '';

    // 4) 본문 Vue 컴포넌트 표식(data-v-...) 중 가장 흔한 것
    const dvCount = new Map();
    B.querySelectorAll('*').forEach((el) => {
      const d = dvOf(el);
      if (d) dvCount.set(d, (dvCount.get(d) || 0) + 1);
    });
    const mainV = mostCommon(dvCount);

    // 5) 분류 상자
    let catDone = false;
    B.querySelectorAll('span, div, strong').forEach((el) => {
      if (catDone || !el.isConnected || el.childElementCount !== 0) return;
      if (el.textContent.trim() !== '분류') return;
      const box = el.parentElement;
      if (!box || !box.querySelector('ul')) return;
      const links = box.querySelectorAll('a[href^="/w/"]');
      if (!links.length) return;
      const cats = [];
      links.forEach((a) => {
        const t = safeDecode(a.getAttribute('href').slice(3).split('#')[0]);
        if (t.startsWith('분류:')) cats.push({ title: t, name: a.textContent.trim() || t.slice(3) });
      });
      if (cats.length) { out.categories.push(...cats); box.remove(); catDone = true; }
    });

    // 6) 광고 제거
    const adWalker = doc.createTreeWalker(B, NodeFilter.SHOW_TEXT);
    const adNodes = [];
    let tn;
    while ((tn = adWalker.nextNode())) {
      const v = tn.nodeValue.trim();
      if (v === '파워링크' || v === '광고등록') adNodes.push(tn);
    }
    adNodes.forEach((t) => {
      let e = t.parentElement;
      if (!e || !e.isConnected) return;
      while (e.parentElement && e.parentElement !== B && !(mainV && e.parentElement.querySelector('[' + mainV + ']'))) e = e.parentElement;
      e.remove();
    });

    // 7) 빈 껍데기 제거 (가짜 id를 가진 빈 div 등)
    B.querySelectorAll('div').forEach((el) => {
      if (!el.isConnected) return;
      if (el.childElementCount === 0 && blankText(el.textContent) && !el.getAttribute('style')) el.remove();
    });
    // 속이 빈 div만 남은 껍데기도 반복해서 정리
    for (let pass = 0; pass < 4; pass++) {
      let removed = 0;
      B.querySelectorAll('div').forEach((el) => {
        if (!el.isConnected || el.getAttribute('style')) return;
        if (!el.querySelector('img, table, hr, iframe, br, input, video, audio, lite-youtube, .katex') && blankText(el.textContent) && !el.id.startsWith('category')) { el.remove(); removed++; }
      });
      if (!removed) break;
    }

    // 8) 같은 클래스로 겹겹이 싼 껍데기 벗기기
    const divs = Array.from(B.querySelectorAll('div')).reverse();
    divs.forEach((el) => {
      if (!el.isConnected) return;
      let p = el.parentElement;
      while (p && p !== B && p.tagName === 'DIV' && p.childElementCount === 1 && p.className === el.className &&
        !p.getAttribute('style') && !p.id && Array.from(p.childNodes).every((c) => c === el || (c.nodeType === 3 && blankText(c.nodeValue)) || c.nodeType === 8)) {
        const gp = p.parentElement;
        p.replaceWith(el);
        p = gp;
      }
    });

    // 9) 문단 클래스(P)와 구조 파악
    const divClassCount = new Map();
    B.querySelectorAll('div[class]').forEach((el) => {
      const c = el.className.trim();
      if (!c || c.indexOf(' ') >= 0 || HEX_CLASS.test(c)) return;
      if (mainV && !el.hasAttribute(mainV)) return;
      divClassCount.set(c, (divClassCount.get(c) || 0) + 1);
    });
    const P = mostCommon(divClassCount);

    // 9.5) 지연 로딩 유튜브(lite-youtube): 실제 iframe은 noscript 안에만 있다
    B.querySelectorAll('lite-youtube').forEach((ly) => {
      const id = ly.getAttribute('videoid') || '';
      const st = ly.getAttribute('style') || '';
      const wm = /(?:^|;)\s*width\s*:\s*([\d.]+(?:px|%)?)/i.exec(st);
      const hm = /(?:^|;)\s*height\s*:\s*([\d.]+(?:px|%)?)/i.exec(st);
      const f = doc.createElement('iframe');
      let src = 'https://www.youtube.com/embed/' + id;
      const inner = ly.querySelector('noscript');
      const fi = ly.querySelector('iframe[src]');
      if (fi) src = fi.getAttribute('src');
      else if (inner) { const m = /src="([^"]+)"/.exec(inner.innerHTML || inner.textContent || ''); if (m) src = m[1].replace(/&amp;/g, '&'); }
      f.setAttribute('src', src);
      if (wm) f.setAttribute('width', wm[1].replace('px', ''));
      if (hm) f.setAttribute('height', hm[1].replace('px', ''));
      ly.replaceWith(f);
    });

    // 10) 이미지
    B.querySelectorAll('noscript').forEach((n) => n.remove());
    B.querySelectorAll('img').forEach((img) => {
      if (!img.isConnected) return;
      const src = img.getAttribute('src') || '';
      if (src.startsWith('data:image/svg+xml')) {
        const dims = svgDims(src);
        const sibs = img.parentElement ? Array.from(img.parentElement.children) : [];
        const real = sibs.find((s) => s !== img && s.tagName === 'IMG' && !(s.getAttribute('src') || '').startsWith('data:'));
        if (real && dims) {
          if (!real.getAttribute('width') || real.getAttribute('width') === '100%') real.setAttribute('data-w', dims[0]);
          if (!real.getAttribute('height') || real.getAttribute('height') === '100%') real.setAttribute('data-h', dims[1]);
        }
        img.remove();
      }
    });
    B.querySelectorAll('img').forEach((img) => {
      const src = absUrl(img.getAttribute('data-src') || img.getAttribute('src') || '');
      if (!/^https?:\/\//i.test(src)) { img.remove(); return; }
      const w = img.getAttribute('data-w'), h = img.getAttribute('data-h');
      const fw = img.getAttribute('width'), fh = img.getAttribute('height');
      const fill = [];
      if (fw === '100%') fill.push('width:100%');
      if (fh === '100%') fill.push('height:100%');
      const alt = img.getAttribute('alt') || '';
      const n = doc.createElement('img');
      n.setAttribute('data-nd-src', src);
      n.setAttribute('alt', alt);
      n.setAttribute('loading', 'lazy');
      n.setAttribute('decoding', 'async');
      if (w && h) { n.setAttribute('width', w); n.setAttribute('height', h); }
      if (fill.length) n.setAttribute('style', fill.join(';'));
      else {
        if (fw && fw !== '100%') n.setAttribute('width', fw);
        if (fh && fh !== '100%') n.setAttribute('height', fh);
      }
      n.className = 'nd-img';
      img.replaceWith(n);
      const inner = n.parentElement;
      if (inner && inner.tagName === 'SPAN') {
        inner.classList.add('nd-imgin');
        const outer = inner.parentElement;
        if (outer && outer.tagName === 'SPAN' && outer.childElementCount === 1) outer.classList.add('nd-imgbox');
        else inner.classList.add('nd-imgbox');
      }
    });

    // 11) 링크
    B.querySelectorAll('a').forEach((a) => {
      if (!a.isConnected) return;
      const href = (a.getAttribute('href') || '').trim();
      if (!href) { if (!a.querySelector('img') && blankText(a.textContent)) a.remove(); else unwrap(a); return; }
      if (href.startsWith('/w/')) {
        let raw = href.slice(3);
        const hi = raw.indexOf('#');
        let pathPart = hi >= 0 ? raw.slice(0, hi) : raw;
        const qi = pathPart.indexOf('?');
        if (qi >= 0) pathPart = pathPart.slice(0, qi);
        const title = safeDecode(pathPart);
        const hash = hi >= 0 ? safeDecode(raw.slice(hi + 1)) : '';
        a.setAttribute('href', '/w/' + encodeURIComponent(title) + (hash ? '#' + encodeURIComponent(hash) : ''));
        a.setAttribute('data-title', title);
        if (hash) a.setAttribute('data-hash', hash);
        a.className = 'nd-wl';
        out.linkTitles.add(title);
        return;
      }
      if (href.startsWith('#')) { a.className = ''; return; }
      if (href.startsWith('/jump/')) {
        if (!a.querySelector('img') && blankText(a.textContent)) a.remove(); else unwrap(a);
        return;
      }
      const u = absUrl(href);
      if (/^https?:\/\//i.test(u)) {
        let host = '';
        try { host = new URL(u).hostname; } catch (e) { /* 무시 */ }
        if (/(^|\.)namu\.wiki$/.test(host)) {
          try {
            const p = new URL(u).pathname;
            if (p.startsWith('/w/')) {
              const title = safeDecode(p.slice(3));
              a.setAttribute('href', '/w/' + encodeURIComponent(title));
              a.setAttribute('data-title', title);
              a.className = 'nd-wl';
              out.linkTitles.add(title);
              return;
            }
          } catch (e) { /* 무시 */ }
        }
        a.setAttribute('href', u);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.className = a.querySelector('img') ? 'nd-ext nd-ext-img' : 'nd-ext';
        return;
      }
      if (/^mailto:/i.test(href)) { a.className = 'nd-ext'; return; }
      unwrap(a);
    });

    // 12) 문단 제목
    const toc = out.toc;
    B.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      if (!h.isConnected) return;
      const num = h.querySelector('a[id^="s-"]');
      h.querySelectorAll('a[href^="/edit/"]').forEach((e) => { const s = e.parentElement; e.remove(); if (s && s !== h && blankText(s.textContent)) s.remove(); });
      // 편집 링크가 이미 풀려 [편집] 글자만 남은 경우
      h.querySelectorAll('span').forEach((s) => { if (s.textContent.trim() === '[편집]') s.remove(); });
      const level = +h.tagName[1];
      if (!num) { h.classList.add('nd-h'); h.setAttribute('data-level', level); return; }
      const id = num.id;
      const numText = num.textContent.trim();
      num.remove();
      const nh = doc.createElement('h' + Math.min(6, Math.max(2, level)));
      nh.className = 'nd-h';
      nh.id = id;
      nh.setAttribute('data-level', level);
      const numA = doc.createElement('a');
      numA.className = 'nd-secnum';
      numA.setAttribute('href', '#toc');
      numA.textContent = numText;
      const txt = doc.createElement('span');
      txt.className = 'nd-htext';
      // 앵커 id(문단 이름)를 가진 span의 내용을 옮긴다
      const inner = Array.from(h.childNodes);
      inner.forEach((c) => txt.appendChild(c));
      nh.appendChild(numA);
      nh.appendChild(doc.createTextNode(' '));
      nh.appendChild(txt);
      h.replaceWith(nh);
      // 제목 하나만 든 껍데기 벗기기
      let p = nh.parentElement;
      while (p && p !== B && p.tagName === 'DIV' && p.childElementCount === 1 && blankText(p.textContent.replace(nh.textContent, ''))) {
        const gp = p.parentElement;
        p.replaceWith(nh);
        p = gp;
      }
      const tclone = txt.cloneNode(true);
      tclone.querySelectorAll('a[href^="#"]').forEach((x) => { if (FN_ID.test(x.getAttribute('href').slice(1))) x.remove(); });
      toc.push({ id, num: numText.replace(/\.$/, ''), text: tclone.textContent.replace(/\s+/g, ' ').trim(), level });
    });

    // 13) 본문 목차(원래 자리) → 새 목차 자리표시
    const tocLinks = Array.from(B.querySelectorAll('a[href^="#s-"]')).filter((a) => a.parentElement && a.parentElement.tagName === 'SPAN');
    if (tocLinks.length) {
      let box = tocLinks[0].parentElement.parentElement;
      for (let k = 0; k < 4 && box.parentElement && box.parentElement !== B; k++) {
        const p = box.parentElement;
        if (p.tagName === 'DETAILS' || (p.childElementCount === 1 && blankText(p.textContent.replace(box.textContent, '')))) box = p; else break;
      }
      const ph = doc.createElement('div');
      ph.className = 'nd-toc-slot';
      box.replaceWith(ph);
    }

    // 14) 각주
    B.querySelectorAll('a[href^="#"]').forEach((a) => {
      const target = a.getAttribute('href').slice(1);
      if (FN_ID.test(target) && !RFN_ID.test(target)) {
        a.className = 'nd-fnref';
        a.setAttribute('data-fn', safeDecode(target));
        const s = a.querySelector('span[id]');
        if (s) { if (!a.id) a.id = s.id; s.remove(); }
      } else if (RFN_ID.test(target)) {
        a.className = 'nd-fnback';
      }
    });
    B.querySelectorAll('span[id]').forEach((s) => {
      if (!FN_ID.test(s.id) || RFN_ID.test(s.id)) return;
      const item = s.parentElement;
      if (!item || item.tagName !== 'SPAN') return;
      item.classList.add('nd-fn');
      item.id = s.id;
      s.remove();
      const list = item.parentElement;
      if (list && list.tagName === 'DIV') list.classList.add('nd-fnlist');
    });

    // 15) 표
    B.querySelectorAll('table').forEach((t) => {
      t.classList.add('nd-table');
      const w = t.parentElement;
      if (w && w.tagName === 'DIV' && w.firstElementChild === t) {
        const cls = Array.from(w.classList).filter((c) => !HEX_CLASS.test(c));
        let align = '';
        for (const c of cls.slice(1)) if (classMap.align[c]) { align = classMap.align[c]; break; }
        if (!align && cls.length > 1 && !cls.slice(1).some((c) => c.startsWith('nd-'))) align = 'center';
        w.classList.add('nd-tw');
        if (align) w.classList.add('nd-tw-' + align);
      }
    });

    // 16) 들여쓰기, 문단 내용 칸
    const cand = new Map();
    B.querySelectorAll('div[class]').forEach((el) => {
      const c = Array.from(el.classList).filter((x) => !x.startsWith('nd-'));
      if (c.length !== 1) return;
      const k = c[0];
      if (k === P || HEX_CLASS.test(k) || el.getAttribute('style')) return;
      const first = el.firstElementChild;
      if (!first) return;
      const blocky = first.tagName === 'DIV' || first.tagName === 'UL' || first.tagName === 'OL' || first.tagName === 'BLOCKQUOTE';
      if (!blocky) return;
      if (!cand.has(k)) cand.set(k, { n: 0, top: 0, inQuote: 0, els: [] });
      const r = cand.get(k);
      r.n++; r.els.push(el);
      let depth = 0, e = el;
      while (e.parentElement && e.parentElement !== B && depth < 4) { e = e.parentElement; depth++; }
      if (depth <= 2) r.top++;
      if (el.parentElement && el.parentElement.tagName === 'BLOCKQUOTE') r.inQuote++;
    });
    let sectionClass = null, bestTop = 0;
    cand.forEach((r, k) => { if (r.top > bestTop) { bestTop = r.top; sectionClass = k; } });
    cand.forEach((r, k) => {
      if (k === sectionClass) { r.els.forEach((e) => e.classList.add('nd-sec')); return; }
      if (r.top > r.n / 2) return;
      r.els.forEach((e) => {
        if (e.classList.contains('nd-tw') || e.classList.contains('nd-fnlist')) return;
        if (e.querySelector(':scope > span.nd-fn')) return;
        e.classList.add('nd-indent');
      });
    });

    // 17) 글자 크기 등 무늬만 남은 span
    B.querySelectorAll('span[class]').forEach((s) => {
      Array.from(s.classList).forEach((c) => {
        const v = classMap.size[c];
        if (v) s.classList.add('nd-fs-' + v);
      });
    });

    // 18) 동영상, 지도 등 내장 요소
    const boxSize = (wAttr, hAttr) => {
      const wv = String(wAttr || '').trim(), hv = String(hAttr || '').trim();
      const wPct = /%$/.test(wv), hPct = /%$/.test(hv);
      const w = parseFloat(wv), h = parseFloat(hv);
      let css = '';
      if (wPct && w > 0) css += 'width:' + Math.min(100, w) + '%;min-width:min(300px,100%);';
      else if (w > 0) css += 'width:' + w + 'px;';
      else css += 'width:640px;';
      if (!wPct && w > 0 && !hPct && h > 0) css += 'aspect-ratio:' + w + '/' + h + ';';
      else css += 'aspect-ratio:16/9;';
      return css + 'max-width:100%;';
    };
    const PLAYABLE = [
      [/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/, 'YouTube 동영상'],
      [/player\.vimeo\.com\/video\/(\d+)/, 'Vimeo 동영상'],
      [/embed\.nicovideo\.jp\/watch\/(\w+)/, '니코니코 동화'],
      [/(tv\.naver\.com|serviceapi\.(?:rmc)?nmv\.naver\.com)/, '네이버 TV 동영상'],
      [/play-tv\.kakao\.com/, '카카오TV 동영상'],
    ];
    B.querySelectorAll('iframe').forEach((f) => {
      const src = absUrl(f.getAttribute('src') || '');
      const box = doc.createElement('div');
      box.className = 'nd-embed';
      box.setAttribute('style', boxSize(f.getAttribute('width'), f.getAttribute('height')));
      const yt = /youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/.exec(src);
      if (yt) {
        const qs = (src.split('?')[1] || '').replace(/(^|&)(autoplay|null)(=[^&]*)?/g, '').replace(/^&+/, '');
        box.setAttribute('data-embed', 'https://www.youtube.com/embed/' + yt[1] + (qs ? '?' + qs : ''));
        box.setAttribute('data-kind', 'YouTube 동영상');
        box.setAttribute('data-link', 'https://www.youtube.com/watch?v=' + yt[1]);
        box.setAttribute('data-thumb', 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg');
      } else if (/google\.com\/maps/.test(src)) {
        const q = /[?&]q=([^&]+)/.exec(src);
        box.setAttribute('data-kind', '지도');
        box.setAttribute('data-link', 'https://www.google.com/maps/search/?api=1&query=' + (q ? q[1] : ''));
        box.classList.add('nd-embed-map');
        box.removeAttribute('style');
      } else {
        const hit = PLAYABLE.find(([re]) => re.test(src));
        box.setAttribute('data-kind', hit ? hit[1] : '외부 콘텐츠');
        if (/^https:\/\//.test(src) && hit) box.setAttribute('data-embed', src);
        box.setAttribute('data-link', /^https?:/.test(src) ? src : '');
      }
      f.replaceWith(box);
    });
    B.querySelectorAll('video').forEach((v) => {
      const src = absUrl(v.getAttribute('src') || (v.querySelector('source') || { getAttribute: () => '' }).getAttribute('src') || '');
      const box = doc.createElement('div');
      box.className = 'nd-embed';
      box.setAttribute('style', boxSize(v.getAttribute('width'), v.getAttribute('height')));
      box.setAttribute('data-kind', '동영상');
      if (/^https?:\/\//.test(src)) { box.setAttribute('data-video', src); box.setAttribute('data-link', src); }
      v.replaceWith(box);
    });

    // 19) 그 밖의 구조 표시
    B.querySelectorAll('blockquote').forEach((q) => q.classList.add('nd-quote'));
    B.querySelectorAll('details').forEach((d) => d.classList.add('nd-fold'));
    B.querySelectorAll('[id^="category-"]').forEach((c) => c.classList.add('nd-catlist'));
    B.querySelectorAll('ul, ol').forEach((l) => l.classList.add('nd-list'));
    B.querySelectorAll('[data-onclick]').forEach((e) => {
      const v = e.getAttribute('data-onclick');
      if (/^((add|remove|toggle)-class,[\w-]+,[\w-]+;?)+$/.test(v)) e.setAttribute('data-nd-onclick', v);
    });
    if (P) B.querySelectorAll('div.' + CSS.escape(P)).forEach((d) => d.classList.add('nd-p'));

    // 20) 허용 목록 정리
    sanitize(B, doc);

    // 21) 결과 조립
    const frag = document.createDocumentFragment();
    const root = document.importNode(B, true);
    // 바깥 껍데기는 버리고 내용만
    while (root.firstChild) frag.appendChild(root.firstChild);
    out.fragment = frag;
    out.linkTitles = Array.from(out.linkTitles);
    return out;
  }

  function sanitize(root, doc) {
    const all = [];
    const tw = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
    let n;
    const comments = [];
    while ((n = tw.nextNode())) {
      if (n.nodeType === 8) comments.push(n); else all.push(n);
    }
    comments.forEach((c) => c.remove());
    for (let i = all.length - 1; i >= 0; i--) {
      const el = all[i];
      if (!el.isConnected) continue;
      const tag = el.localName;
      const inKatex = !!(el.closest && el.closest('.katex'));
      if (inKatex && (MATH_TAGS.has(tag) || SVG_TAGS.has(tag) || tag === 'span')) { cleanAttrs(el, tag, true); continue; }
      if (DROP_TAGS.has(tag)) { el.remove(); continue; }
      if (!KEEP_TAGS.has(tag)) { unwrap(el); continue; }
      if (tag === 'button') { const s = doc.createElement('span'); while (el.firstChild) s.appendChild(el.firstChild); copyAttrs(el, s); el.replaceWith(s); cleanAttrs(s, 'span', false); continue; }
      cleanAttrs(el, tag, false);
    }
  }

  function copyAttrs(from, to) {
    Array.from(from.attributes).forEach((a) => { try { to.setAttribute(a.name, a.value); } catch (e) { /* 무시 */ } });
  }

  function cleanAttrs(el, tag, katex) {
    const names = el.getAttributeNames();
    for (const name of names) {
      const v = el.getAttribute(name);
      let keep = false;
      if (name === 'class') {
        if (katex) keep = true;
        else {
          const cls = v.split(/\s+/).filter((c) => c.startsWith('nd-') || HEX_CLASS.test(c) || c === 'katex' || c === 'katex-display');
          if (cls.length) { el.setAttribute('class', cls.join(' ')); } else el.removeAttribute('class');
          continue;
        }
      } else if (name === 'style') {
        const s = cleanStyle(v);
        if (s) el.setAttribute('style', s); else el.removeAttribute('style');
        continue;
      } else if (name === 'data-dark-style') {
        const s = cleanStyle(v);
        if (s) el.setAttribute('data-dark-style', s); else el.removeAttribute(name);
        continue;
      } else if (name.startsWith('data-nd-') || name === 'data-title' || name === 'data-hash' || name === 'data-fn' ||
        name === 'data-w' || name === 'data-h' || name === 'data-embed' || name === 'data-video' || name === 'data-kind' || name === 'data-link' || name === 'data-thumb' || name === 'data-level') {
        keep = true;
      } else if (GLOBAL_ATTRS.has(name)) {
        keep = true;
      } else if (tag === 'a' && (name === 'href' || name === 'target' || name === 'rel')) {
        keep = !(name === 'href' && /^\s*(javascript|data|vbscript):/i.test(v));
      } else if (tag === 'img' && (name === 'alt' || name === 'loading' || name === 'decoding')) {
        keep = true;
      } else if (tag === 'details' && name === 'open') {
        keep = true;
      } else if ((tag === 'ol' && (name === 'start' || name === 'type')) || (tag === 'li' && name === 'value')) {
        keep = true;
      } else if (tag === 'font' && (name === 'color' || name === 'size' || name === 'face')) {
        keep = true;
      } else if (katex && (tag !== 'span') && !/^on/i.test(name) && name !== 'href' && name !== 'xlink:href' && name !== 'src') {
        keep = true; // MathML, SVG 속성
      } else if (katex && name === 'aria-hidden') {
        keep = true;
      }
      if (!keep) el.removeAttribute(name);
    }
  }

  global.NamuRender = { render, cleanStyle, scopeCss };
})(window);
