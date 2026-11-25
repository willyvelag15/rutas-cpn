/* Retorno de la bonificación (Willy, 24-nov-2026): ¿al cliente que le damos bonificación y promoción sí nos compra más?
   Cruza bonifcli (bonificación + promoción por cliente, último corte de gasto variable) con el crecimiento de la megabase
   (enero al último mes completo contra el año pasado y últimos 3 meses contra los mismos del año pasado).
   Cuadrantes: Rinde · No rinde · Crece sin apoyo · Cae sin apoyo.  data-draw="bonRetorno" */
(function () {
  if (!window.dash) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const rows = (k) => { const d = dash.data(k); return d && d.status === 'ok' ? d.data : []; };
  const $ = (v) => '$' + Math.round(v || 0).toLocaleString('es-MX');
  const pc = (v) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%');
  const pp = (v) => (v == null ? '—' : Math.round(v * 1000) / 10 + '%');
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const Q = { rinde: ['Rinde', 'ok', 'Mucho apoyo y crece'], no: ['No rinde', 'bad', 'Mucho apoyo y cae: dinero que no regresa'], sin: ['Crece sin apoyo', 'ok', 'Poco apoyo y crece'], cae: ['Cae sin apoyo', 'warn', 'Poco apoyo y cae: oportunidad'], neutro: ['Parejo', '', 'Ni sube ni baja'] };
  const COL = { rinde: '#30a46c', no: '#e5484d', sin: '#2C6FB3', cae: '#E9B949', neutro: '#8a8f98' };
  const st = { q: null, ruta: null, orden: 'gasto', n: 40 };

  dash.draw('bonRetorno', (e) => {
    e.replaceChildren();
    const B = rows('bonifcli'); const CR = (rows('crecimiento') || [])[0] || {}; const info = CR.info || {};
    const CL = new Map(rows('clientes').map((c) => [String(c.id), c]));
    if (!B.length) { e.append(el('p', 'note', 'Sin datos de bonificación.')); return; }
    const mi = CR.concil ? Number(CR.concil.corte.slice(5, 7)) - 1 : 10;
    const L = B.filter((b) => b.ingreso > 0).map((b) => {
      const id = String(b.clienteId); const i = info[id]; const c = CL.get(id) || {};
      let ytd = null; if (i) { const a = i.m25.slice(0, mi).reduce((x, y) => x + y, 0), z = i.m26.slice(0, mi).reduce((x, y) => x + y, 0); ytd = a > 0.5 ? (z - a) / a : null; }
      const m3 = c.hlMes3_2025 > 0.3 ? (c.hlMes3 - c.hlMes3_2025) / c.hlMes3_2025 : null;
      const crec = ytd != null ? ytd : m3;
      return { id, b, c, ytd, m3, crec, gi: b.gi || 0 };
    }).filter((x) => x.crec != null);
    const gis = L.map((x) => x.gi).sort((a, b) => a - b); const med = gis[Math.floor(gis.length / 2)] || 0.15; const corte = Math.max(0.12, med);
    L.forEach((x) => { const alto = x.gi >= corte; x.q = x.crec >= 0.05 ? (alto ? 'rinde' : 'sin') : x.crec <= -0.05 ? (alto ? 'no' : 'cae') : 'neutro'; });

    e.append(el('p', 'note', 'Apoyo = bonificación + promoción entre lo que nos compró (corte ' + (B[0].corte || '') + '). "Mucho apoyo" = ' + pp(corte) + ' o más. Crecimiento = enero a ' + ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][mi - 1] + ' contra el año pasado (megabase).'));
    const tiles = el('div', 'pr-tiles');
    Object.keys(Q).forEach((k) => { const S = L.filter((x) => x.q === k); const g = S.reduce((a, x) => a + (x.b.gasto || 0), 0); const d = el('button', 'ht br-q' + (Q[k][1] ? ' ' + Q[k][1] : '')); d.type = 'button'; d.setAttribute('aria-pressed', String(st.q === k));
      d.append(el('span', null, Q[k][0]), el('b', null, String(S.length)), el('small', null, $(g) + ' de apoyo al mes · ' + Q[k][2])); d.addEventListener('click', () => { st.q = st.q === k ? null : k; st.n = 40; dash.draw('bonRetorno'); }); tiles.append(d); });
    e.append(tiles);

    // gráfica: apoyo (x) contra crecimiento (y)
    const NS = 'http://www.w3.org/2000/svg'; const W = 760, H = 300, P = 40; const xmax = Math.min(0.5, Math.max(0.3, Math.max(...L.map((x) => x.gi)))); const lim = 0.8;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'br-svg');
    const X = (v) => P + Math.min(v, xmax) / xmax * (W - P - 10), Y = (v) => H / 2 - Math.max(-lim, Math.min(lim, v)) / lim * (H / 2 - 20);
    const ln = (x1, y1, x2, y2, cls) => { const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2); l.setAttribute('class', cls); svg.append(l); };
    const tx = (x, y, s, a) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('class', 'br-eje'); if (a) t.setAttribute('text-anchor', a); t.textContent = s; svg.append(t); };
    ln(P, Y(0), W - 10, Y(0), 'br-l'); ln(X(corte), 10, X(corte), H - 10, 'br-l');
    tx(P, 18, '▲ crece'); tx(P, H - 6, '▼ cae'); tx(W - 12, Y(0) - 6, 'más apoyo →', 'end'); tx(X(corte) + 4, 18, pp(corte));
    L.forEach((x) => { if (st.ruta && x.b.rutaNum !== st.ruta) return; const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', X(x.gi)); c.setAttribute('cy', Y(x.crec)); c.setAttribute('r', Math.max(3, Math.min(10, Math.sqrt(x.b.hl || 1) * 1.4)));
      c.setAttribute('fill', COL[x.q]); c.setAttribute('fill-opacity', st.q && st.q !== x.q ? '0.12' : '0.8'); c.setAttribute('class', 'br-pt');
      const t = document.createElementNS(NS, 'title'); t.textContent = '#' + x.id + ' ' + tit(x.b.cliente) + ' · apoyo ' + pp(x.gi) + ' · ' + pc(x.crec); c.append(t);
      c.addEventListener('click', () => { if (window.CPN_CLIDET) window.CPN_CLIDET.abrir(x.id); }); svg.append(c); });
    e.append(svg);

    // filtros y lista
    const bar = el('div', 'vc-bar');
    const seg = (lista, actual, on) => { const g = el('div', 'cr-seg'); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); st.n = 40; dash.draw('bonRetorno'); }); g.append(b); }); return g; };
    const rutas = [...new Set(L.map((x) => x.b.rutaNum))].sort((a, b) => a - b);
    bar.append(seg([[null, 'Todas']].concat(rutas.map((r) => [r, 'R' + r])), st.ruta, (v) => { st.ruta = v; }), seg([['gasto', 'Más apoyo $'], ['gi', 'Más % de apoyo'], ['cae', 'Más caída'], ['crece', 'Más crecimiento']], st.orden, (v) => { st.orden = v; }));
    e.append(bar);
    let F = L.filter((x) => (!st.q || x.q === st.q) && (!st.ruta || x.b.rutaNum === st.ruta));
    F.sort((a, b) => st.orden === 'gasto' ? b.b.gasto - a.b.gasto : st.orden === 'gi' ? b.gi - a.gi : st.orden === 'cae' ? a.crec - b.crec : b.crec - a.crec);
    const tb = el('table', 'cpn-t'); const h = el('tr'); ['Cliente', 'Ruta', 'Cuadrante', 'Apoyo %', 'Apoyo $/mes', 'Gasto/Hl', 'Año', '3 meses', 'Hl/mes', 'Margen neto'].forEach((x, i) => h.append(el('th', i > 2 ? 'num' : null, x))); tb.append(el('thead')); tb.tHead.append(h);
    const bd = el('tbody');
    F.slice(0, st.n).forEach((x) => { const tr = el('tr', 'tk-row'); const nm = '#' + x.id + ' · ' + tit(x.b.cliente) + (x.b.prop && tit(x.b.prop) !== tit(x.b.cliente) ? ' · ' + tit(x.b.prop) : '');
      const qc = el('td'); qc.append(el('span', 'pill ' + Q[x.q][1], Q[x.q][0]));
      tr.append(el('td', 'vc-nom', nm), el('td', null, 'R' + x.b.rutaNum), qc, el('td', 'num', pp(x.gi)), el('td', 'num', $(x.b.gasto)), el('td', 'num', $(x.b.gastoHl)), el('td', 'num', pc(x.ytd)), el('td', 'num', pc(x.m3)), el('td', 'num', (Math.round((x.b.hl || 0) * 10) / 10).toLocaleString('es-MX')), el('td', 'num', $(x.b.margenNeto)));
      tr.addEventListener('click', () => { if (window.CPN_CLIDET) window.CPN_CLIDET.abrir(x.id); }); bd.append(tr); });
    tb.append(bd); const w = el('div', 'tblwrap'); w.append(tb); e.append(el('p', 'note', F.length + ' clientes. Pícale a uno para ver su ficha.'), w);
    if (F.length > st.n) { const m = el('button', 'pill hc-mas', 'Ver más (quedan ' + (F.length - st.n) + ')'); m.type = 'button'; m.addEventListener('click', () => { st.n += 40; dash.draw('bonRetorno'); }); e.append(m); }
  });
})();
