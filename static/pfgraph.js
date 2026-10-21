/* Pseudo-Formal proof graph: the blocks of a PF laid out as a layered DAG on a
   pannable, zoomable canvas, with the selected block shown in full below.
   Shared by index.html (the example proof) and oai.html (the OpenAI papers).

     const g = PFGraph({graph, zoom, detail, typeset, extra});
     g.show(blocks, edges, firstIndex);

   blocks: [{label, statement, proof, snippet?, orig?, found?}]  (HTML strings)
   edges:  [[from, to, kind?], ...] from a block to the block that uses it
   extra(b): optional HTML appended to a block's detail panel */
window.PFGraph = function (opt) {
  const { graph, zoom, detail } = opt;
  const typeset = opt.typeset || (() => {});
  const extra = opt.extra || (() => '');
  const esc = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const NW = 136, NH = 58, GX = 18, GY = 62, PAD = 30;
  const MAXW = 12;            // a wider layer wraps onto extra lines

  graph.innerHTML = '<div class="world"></div><div class="gstat"></div>';
  const world = graph.querySelector('.world');
  const stat = graph.querySelector('.gstat');
  const zpct = zoom.querySelector('.zpct');

  // node text when the data gives none: the statement's first sentence,
  // inline math only
  const firstSentence = html => {
    const d = document.createElement('div');
    d.innerHTML = html;
    let t = d.textContent.replace(/\\\[([\s\S]*?)\\\]/g, '\\($1\\)')
      .replace(/--/g, '–').replace(/\s+/g, ' ').trim();
    const masked = t.replace(/\\\([\s\S]*?\\\)/g, m => '#'.repeat(m.length));
    const end = masked.search(/\.(\s|$)/);
    return end > 0 ? t.slice(0, end + 1) : t;
  };
  const arrow = id => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5"
    markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0 1L9 5L0 9z" fill="${id === 'ah-on' ? '#1f4e5f' : '#a9a69e'}"/></marker>`;

  let B = [], E = [], ins = [], outs = [], px = [], py = [], WW = 0, WH = 0;
  let nodes = [], paths = [];

  /* -- layout: layer = longest path down to a block nothing uses (a main
     theorem), drawn at the bottom; rows ordered and spaced by a few
     barycenter sweeps so each block sits near the blocks it connects to -- */
  function layout() {
    const N = B.length, rank = new Array(N);
    const rk = (i, seen) => {
      if (rank[i] != null) return rank[i];
      if (seen.has(i)) return 0;              // guard against a citation cycle
      seen.add(i);
      return rank[i] = outs[i].length ? 1 + Math.max(...outs[i].map(j => rk(j, seen))) : 0;
    };
    B.forEach((b, i) => rk(i, new Set()));
    const top = Math.max(0, ...rank);
    const rows = Array.from({ length: top + 1 }, () => []);
    B.forEach((b, i) => rows[rank[i]].push(i));
    const x = new Array(N);
    rows.forEach(row => row.forEach((i, k) => x[i] = (k - (row.length - 1) / 2) * (NW + GX)));
    const relax = (r, nr) => {
      const row = rows[r];
      const want = new Map(row.map(i => {
        const nb = [...ins[i], ...outs[i]].filter(j => rank[j] === nr);
        return [i, nb.length ? nb.reduce((s, j) => s + x[j], 0) / nb.length : x[i]];
      }));
      row.sort((a, b) => want.get(a) - want.get(b) || x[a] - x[b]);
      const pos = [];
      row.forEach((i, k) => pos.push(k ? Math.max(want.get(i), pos[k - 1] + NW + GX) : want.get(i)));
      const shift = row.reduce((s, i, k) => s + want.get(i) - pos[k], 0) / row.length;
      row.forEach((i, k) => x[i] = pos[k] + shift);
    };
    for (let it = 0; it < 8; it++) {
      for (let r = top - 1; r >= 0; r--) relax(r, r + 1);
      for (let r = 1; r <= top; r++) relax(r, r - 1);
    }
    const lines = [];
    for (let r = top; r >= 0; r--) {
      const row = rows[r];
      if (row.length <= MAXW) { lines.push(row); continue; }
      for (let s = 0; s < row.length; s += MAXW) {
        const chunk = row.slice(s, s + MAXW);
        chunk.forEach((i, k) => x[i] = (k - (chunk.length - 1) / 2) * (NW + GX));
        lines.push(chunk);
      }
    }
    py = new Array(N);
    lines.forEach((line, L) => line.forEach(i => py[i] = L * (NH + GY) + PAD));
    const minX = Math.min(...x);
    px = x.map(v => v - minX + PAD);
    WW = Math.max(...px) + NW + PAD;
    WH = (lines.length - 1) * (NH + GY) + NH + 2 * PAD;
  }

  function render() {
    world.style.width = WW + 'px'; world.style.height = WH + 'px';
    world.innerHTML = `<svg width="${WW}" height="${WH}"><defs>${arrow('ah')}${arrow('ah-on')}</defs>${
      E.map(e => {
        const x1 = px[e.from] + NW / 2, y1 = py[e.from] + NH;
        const x2 = px[e.to] + NW / 2,   y2 = py[e.to] - 1;
        const dy = (y2 - y1) / 2;
        return `<path class="edge" marker-end="url(#ah)"
          d="M${x1} ${y1}C${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}"/>`;
      }).join('')}</svg>` + B.map((b, i) => `
      <button class="node${b.found ? ' found' : ''}" data-i="${i}"
        style="left:${px[i]}px;top:${py[i]}px">
        <span class="k">${esc(b.label)}${b.found ? ' &middot; error found' : ''}</span>
        <span class="t">${esc(b.snippet != null ? b.snippet : firstSentence(b.statement))}</span>
      </button>`).join('');
    nodes = world.querySelectorAll('.node');
    paths = world.querySelectorAll('.edge');
    stat.textContent = `${B.length} blocks · ${E.length} connections`;
  }

  /* -- pan and zoom -- */
  let k = 1, tx = 0, ty = 0, touched = false;
  const apply = () => {
    world.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;
    let s = 18 * k;
    while (s < 12) s *= 2;
    while (s > 36) s /= 2;
    graph.style.backgroundSize = `${s}px ${s}px`;
    graph.style.backgroundPosition = `${tx}px ${ty}px`;
    zpct.textContent = Math.round(k * 100) + '%';
  };
  const zoomAt = (f, cx, cy) => {
    const nk = Math.min(2.5, Math.max(0.05, k * f));
    tx = cx - (cx - tx) * nk / k; ty = cy - (cy - ty) * nk / k; k = nk;
    touched = true; apply();
  };
  const fit = () => {
    const r = graph.getBoundingClientRect();
    if (!r.width || !WW) return;
    k = Math.min(r.width / WW, r.height / WH, 1.25);
    tx = (r.width - WW * k) / 2; ty = (r.height - WH * k) / 2;
    apply();
  };
  const centerOn = i => {
    const r = graph.getBoundingClientRect();
    // too far out to read a block: come in to a legible zoom first
    if (k < 0.6) k = 0.8;
    tx = r.width / 2 - (px[i] + NW / 2) * k; ty = r.height / 2 - (py[i] + NH / 2) * k;
    touched = true; apply();
  };
  zoom.querySelectorAll('button[data-z]').forEach(b => b.addEventListener('click', () => {
    const r = graph.getBoundingClientRect();
    if (b.dataset.z === 'fit') { touched = false; fit(); }
    else zoomAt(b.dataset.z === 'in' ? 1.25 : 0.8, r.width / 2, r.height / 2);
  }));
  // plain wheel keeps scrolling the page; pinch (ctrl+wheel on trackpads) zooms
  graph.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = graph.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  const ptrs = new Map();
  let moved = 0, pinch = 0;
  graph.addEventListener('pointerdown', e => {
    if (e.button) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) moved = 0;
    pinch = 0;
  });
  window.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    if (ptrs.size === 1) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 4) {
        tx += dx; ty += dy; touched = true; apply();
        graph.classList.add('dragging');
      }
    }
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = graph.getBoundingClientRect();
      if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = d; moved = 99;
    }
  });
  const up = e => {
    ptrs.delete(e.pointerId);
    if (!ptrs.size) graph.classList.remove('dragging');
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  new ResizeObserver(() => { if (!touched) fit(); }).observe(graph);

  /* -- selection: highlight the block and its edges, show it in full below -- */
  const rel = (name, is) => !is.length ? '' :
    `<span>${name}</span>${is.map(j =>
      `<button data-i="${j}">${esc(B[j].label)}</button>`).join('')} `;
  function pick(i, math) {
    nodes.forEach((n, j) => n.classList.toggle('sel', j === i));
    paths.forEach((p, j) => {
      const on = E[j].from === i || E[j].to === i;
      p.classList.toggle('on', on);
      p.setAttribute('marker-end', on ? 'url(#ah-on)' : 'url(#ah)');
    });
    const b = B[i];
    // a PF block whose proof is literally "None" needs no proof of its own
    const proof = b.proof && !/^<p>\s*None\s*<\/p>$/.test(b.proof.trim()) ? b.proof : '';
    detail.innerHTML = `
      <span class="lbl">Block detail</span>
      <h3>${esc(b.label)}${b.found ? '<span class="tag">Error found</span>' : ''}</h3>
      <div class="rel">${b.orig ? `<span>Original label</span> ${esc(b.orig)} &nbsp;` : ''}${
        rel('Uses', ins[i])}${rel('Used by', outs[i])}</div>
      ${/^\s*<span class="lbl sub">/.test(b.statement) ? '' : '<span class="lbl">Statement</span>'}${b.statement}
      ${proof ? `<div class="pf"><span class="lbl">Proof</span>${proof}</div>` : ''}
      ${extra(b)}`;
    if (math) typeset(detail);
  }
  world.addEventListener('click', e => {
    const n = e.target.closest('.node');
    if (n && (e.detail === 0 || moved <= 4)) pick(+n.dataset.i, true);
  });
  detail.addEventListener('click', e => {
    const b = e.target.closest('.rel button');
    if (b) { pick(+b.dataset.i, true); centerOn(+b.dataset.i); }
  });

  return {
    show(blocks, edges, first) {
      B = blocks;
      E = edges.map(e => Array.isArray(e) ? { from: e[0], to: e[1] } : e);
      ins = B.map(() => []); outs = B.map(() => []);
      E.forEach(e => { outs[e.from].push(e.to); ins[e.to].push(e.from); });
      layout(); render();
      pick(first || 0, true);
      touched = false; fit();
      // a big graph fit to the canvas is unreadable: start on the selected block
      if (k < 0.5) centerOn(first || 0);
      typeset(world);
    },
    fit() { if (!touched) fit(); },
  };
};
