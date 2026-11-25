/* Mapa de mercado (Willy, 24-nov-2026): cada cliente en el mapa con cómo va, y el resumen por población y colonia.
   Colorea por: crecimiento del año · saturación del mes · canal · ruta. Filtros: ruta, canal, estado, solo los que caen,
   grandes sin saturación, los que no compran un producto foco. Pícale a un punto para la ficha.  data-draw="mercadoMapa" */
(function () {
  if (!window.dash) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const rows = (k) => { const d = dash.data(k); return d && d.status === 'ok' ? d.data : []; };
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX');
  const pc = (v) => (v == null ? '—' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%');
  const pp = (v) => (v == null ? '—' : Math.round(v * 1000) / 10 + '%');
  const RC = { 1: '#2C6FB3', 2: '#e5484d', 3: '#30a46c', 4: '#6B7280', 5: '#7C5CDB', 6: '#0EA5B7', 7: '#F08A24', 13: '#a855f7' };
  const CC = ['#2C6FB3', '#C98A0B', '#30a46c', '#B3262D', '#7C5CDB', '#0EA5B7'];
  const st = { color: 'crec', ruta: null, canal: null, filtro: 'todos', foco: null, agr: 'pob' };
  let mapa = null, capa = null;

  const colorDe = (x, canales) => {
    if (st.color === 'ruta') return RC[x.r] || '#888';
    if (st.color === 'canal') return CC[canales.indexOf(x.canal) % CC.length];
    if (st.color === 'sat') return x.sat == null ? '#8a8f98' : x.sat < 0.05 ? '#e5484d' : x.sat < 0.1 ? '#E9B949' : '#30a46c';
    return x.crec == null ? '#8a8f98' : x.crec <= -0.1 ? '#e5484d' : x.crec < 0 ? '#E9B949' : x.crec < 0.1 ? '#8fd19e' : '#30a46c';
  };
  const LEY = { crec: [['#e5484d', 'cae 10% o más'], ['#E9B949', 'cae menos de 10%'], ['#8fd19e', 'crece hasta 10%'], ['#30a46c', 'crece 10% o más'], ['#8a8f98', 'sin dato']],
    sat: [['#e5484d', 'saturación < 5%'], ['#E9B949', '5% a 10%'], ['#30a46c', '10% o más'], ['#8a8f98', 'sin compra este mes']] };

  dash.draw('mercadoMapa', (e) => {
    const M = rows('mercado'); if (!M.length) { e.replaceChildren(el('p', 'note', 'Sin datos del mapa todavía.')); return; }
    if (!window.L) { e.replaceChildren(el('p', 'note', 'No cargó el mapa.')); return; }
    e.replaceChildren();
    const canales = [...new Set(M.map((x) => x.canal))].filter(Boolean);
    const rutas = [...new Set(M.map((x) => x.r))].filter(Boolean).sort((a, b) => a - b);
    const focos = [...new Set(M.flatMap((x) => x.huecos || []))].sort();
    const go = () => dash.draw('mercadoMapa');
    const seg = (lista, actual, on) => { const g = el('div', 'cr-seg'); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); go(); }); g.append(b); }); return g; };
    const fil = el('div', 'hc-fil');
    const f1 = el('div', 'vc-bar'); f1.append(el('b', 'mm-lab', 'Color:'), seg([['crec', 'Crecimiento del año'], ['sat', 'Saturación'], ['canal', 'Canal'], ['ruta', 'Ruta']], st.color, (v) => { st.color = v; }));
    const f2 = el('div', 'vc-bar'); f2.append(seg([[null, 'Todas']].concat(rutas.map((r) => [r, 'R' + r])), st.ruta, (v) => { st.ruta = v; }), seg([[null, 'Todos los canales']].concat(canales.map((c) => [c, tit(c)])), st.canal, (v) => { st.canal = v; }));
    const f3 = el('div', 'vc-bar'); f3.append(seg([['todos', 'Todos'], ['caen', 'Solo los que caen'], ['crecen', 'Solo los que crecen'], ['sinsat', 'Grandes sin saturación'], ['riesgo', 'En riesgo o perdidos']], st.filtro, (v) => { st.filtro = v; }));
    if (focos.length) { const s = el('select', 'vc-sel'); s.append(new Option('No compran… (cualquier foco)', '')); focos.forEach((f) => { const o = new Option('No compran ' + f, f); o.selected = st.foco === f; s.append(o); }); s.addEventListener('change', () => { st.foco = s.value || null; go(); }); f3.append(s); }
    fil.append(f1, f2, f3); e.append(fil);

    const F = M.filter((x) => (!st.ruta || x.r === st.ruta) && (!st.canal || x.canal === st.canal) && (!st.foco || (x.huecos || []).includes(st.foco))
      && (st.filtro === 'todos' || (st.filtro === 'caen' && x.crec != null && x.crec < -0.05) || (st.filtro === 'crecen' && x.crec != null && x.crec > 0.05)
        || (st.filtro === 'sinsat' && x.hlMes >= 15 && (x.sat || 0) < 0.08) || (st.filtro === 'riesgo' && /riesgo|perdido/i.test(x.estado || ''))));
    const a25 = F.reduce((a, x) => a + x.a25, 0), a26 = F.reduce((a, x) => a + x.a26, 0);
    const tiles = el('div', 'pr-tiles'); const t = (k, v, s, c) => { const d = el('div', 'ht' + (c ? ' ' + c : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('Clientes en el mapa', String(F.length), 'de ' + M.length + ' con ubicación'); t('En el año', pc(a25 ? (a26 - a25) / a25 : null), n1(a26) + ' contra ' + n1(a25) + ' Hl', a26 < a25 ? 'bad' : 'ok');
    t('Caen', String(F.filter((x) => x.crec != null && x.crec < -0.05).length), 'clientes', 'warn'); t('Crecen', String(F.filter((x) => x.crec != null && x.crec > 0.05).length), 'clientes', 'ok');
    e.append(tiles);

    const caja = el('div', 'mm-mapa'); e.append(caja);
    const ley = el('div', 'pr-ley'); (LEY[st.color] || (st.color === 'ruta' ? rutas.map((r) => [RC[r] || '#888', 'Ruta ' + r]) : canales.map((c, i) => [CC[i % CC.length], tit(c)]))).forEach(([c, txt]) => { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, document.createTextNode(txt)); ley.append(s); }); e.append(ley);
    if (mapa) { mapa.remove(); mapa = null; }
    setTimeout(() => {
      mapa = L.map(caja, { zoomControl: true }); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
      capa = L.layerGroup().addTo(mapa); const pts = [];
      F.forEach((x) => { const ll = [x.lat, x.lng]; pts.push(ll); const r = Math.max(4, Math.min(14, Math.sqrt(x.a26 / Math.max(1, 10)) * 2.2));
        const m = L.circleMarker(ll, { radius: r, color: '#111', weight: 1, fillColor: colorDe(x, canales), fillOpacity: 0.85 }).addTo(capa);
        m.bindTooltip('#' + x.id + ' · ' + tit(x.n) + (x.p ? ' · ' + tit(x.p) : '') + '<br>R' + x.r + ' · ' + tit(x.canal) + ' · ' + tit(x.pob) + '<br>Año ' + n1(x.a26) + ' Hl (' + pc(x.crec) + ') · sat. ' + pp(x.sat));
        m.on('click', () => { if (window.CPN_CLIDET) window.CPN_CLIDET.abrir(x.id); }); });
      if (pts.length) mapa.fitBounds(pts, { padding: [20, 20] }); else mapa.setView([18.75, -96.15], 10);
    }, 30);

    // resumen por población / colonia
    const g2 = el('div', 'vc-bar'); g2.append(el('b', 'mm-lab', 'Resumen por:'), seg([['pob', 'Población'], ['col', 'Colonia'], ['canal', 'Canal'], ['r', 'Ruta']], st.agr, (v) => { st.agr = v; })); e.append(g2);
    const G = new Map(); F.forEach((x) => { const k = st.agr === 'r' ? 'Ruta ' + x.r : tit(x[st.agr]) || 'Sin dato'; const o = G.get(k) || { n: 0, a25: 0, a26: 0, caen: 0, sat: [], venta: 0 }; o.n++; o.a25 += x.a25; o.a26 += x.a26; o.venta += x.venta || 0; if (x.crec != null && x.crec < -0.05) o.caen++; if (x.sat != null) o.sat.push(x.sat); G.set(k, o); });
    const tb = el('table', 'cpn-t'); const h = el('tr'); ['', 'Clientes', 'Hl año', 'Año pasado', 'Crec.', 'Caen', 'Sat. prom.', 'Venta del mes'].forEach((x, i) => h.append(el('th', i ? 'num' : null, x))); tb.append(el('thead')); tb.tHead.append(h);
    const bd = el('tbody'); [...G.entries()].sort((a, b) => b[1].a26 - a[1].a26).forEach(([k, o]) => { const tr = el('tr'); const c = o.a25 ? (o.a26 - o.a25) / o.a25 : null; tr.append(el('td', null, k), el('td', 'num', String(o.n)), el('td', 'num', n1(o.a26)), el('td', 'num', n1(o.a25)), el('td', 'num ' + (c != null && c < 0 ? 'bad' : ''), pc(c)), el('td', 'num', String(o.caen)), el('td', 'num', pp(o.sat.length ? o.sat.reduce((a, b) => a + b, 0) / o.sat.length : null)), el('td', 'num', '$' + Math.round(o.venta).toLocaleString('es-MX'))); bd.append(tr); });
    tb.append(bd); const w = el('div', 'tblwrap'); w.append(tb); e.append(w);
  });
})();
