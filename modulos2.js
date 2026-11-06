/* Empresa, gráficas de pastel, selector de bono y navegación empresarial. */
(function () {
  const F = window.CPN.fmt;
  const D = (id) => dash.data(id);
  const rows = (id) => (D(id).status === 'ok' ? D(id).data : []);
  const one = (id, ruta) => rows(id).find((r) => r.ruta === ruta);
  const RUTAS7 = ['Ruta 1', 'Ruta 2', 'Ruta 3', 'Ruta 4', 'Ruta 6', 'Ruta 7', 'Ruta 13'];
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const tile = (parent, k, v, s, cls) => { const d = el('div', 'ht'); d.append(el('span', null, k), el('b', cls || null, v)); if (s) d.append(el('small', null, s)); parent.append(d); };
  const pct = (v) => F.pct(v);
  const sign = (v) => (v >= 0 ? '+' : '') + F.pct(v);
  const rc = (r) => window.CPN.routeColor[r] || '#6B7280';
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ---------- Gráfica de pastel (dona) ---------- */
  window.CPN.donut = (host, items, centro, sub) => {
    host.replaceChildren();
    const tot = items.reduce((a, x) => a + x.value, 0); if (!tot) { host.append(el('p', 'note', 'Sin datos.')); return; }
    const wrap = el('div', 'donut'); host.append(wrap);
    const S = 200, R = 92, r = 58;
    const svg = d3.select(wrap).append('svg').attr('viewBox', `0 0 ${S} ${S}`).attr('width', '100%').style('max-width', '220px');
    const g = svg.append('g').attr('transform', `translate(${S / 2},${S / 2})`);
    const arcs = d3.pie().sort(null).value((d) => d.value)(items);
    const arc = d3.arc().innerRadius(r).outerRadius(R).padAngle(0.012).cornerRadius(2);
    const tip = d3.select(wrap).append('div').attr('class', 'tip').style('opacity', 0);
    g.selectAll('path').data(arcs).join('path').attr('d', arc).attr('fill', (d) => d.data.color).attr('stroke', 'var(--color-panel)').attr('stroke-width', 1.5)
      .on('mousemove', (ev, d) => { const [x, y] = d3.pointer(ev, wrap); tip.style('opacity', 1).style('left', Math.min(x + 10, 150) + 'px').style('top', (y - 28) + 'px').text(d.data.label + ' · ' + pct(d.data.value / tot)); })
      .on('mouseleave', () => tip.style('opacity', 0));
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em').attr('font-size', 22).attr('font-family', 'var(--font-anthropic-serif)').attr('fill', 'var(--color-fg)').text(centro);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.4em').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text(sub || '');
    const lg = el('ul', 'dlegend'); wrap.append(lg);
    items.slice().sort((a, b) => b.value - a.value).forEach((x) => { const li = el('li'); const i = el('i'); i.style.background = x.color; li.append(i, el('span', null, x.label), el('b', null, pct(x.value / tot))); lg.append(li); });
  };

  /* ---------- EMPRESA ---------- */
  window.CPN.empTipo = window.CPN.empTipo || 'Real';
  const emp = () => rows('empresa').filter((r) => r.tipo === window.CPN.empTipo);
  const novEnCurso = () => { const m = one('mesRuta', 'TOTAL'); return m ? m.proyeccion : null; };
  function resumenEmp() {
    const e = emp(); if (!e.length) return null;
    const con = e.filter((r) => r.real != null && r.meta);
    const real = con.reduce((a, r) => a + r.real, 0), meta = con.reduce((a, r) => a + r.meta, 0);
    const c25 = e.filter((r) => r.real != null && r.y2025);
    const r25 = c25.reduce((a, r) => a + r.y2025, 0), rr = c25.reduce((a, r) => a + r.real, 0);
    const metaAnual = e.reduce((a, r) => a + (r.meta || 0), 0);
    const ult = con[con.length - 1];
    return { real, meta, cump: meta ? real / meta : 0, vs25: r25 ? rr / r25 - 1 : 0, metaAnual, meses: con.length, ult };
  }
  dash.draw('empTitulo', (x) => { const r = resumenEmp(); x.textContent = r ? (window.CPN.empTipo === 'Real' ? 'Venta real' : 'Venta híbrida') + ': ' + pct(r.cump) + ' de la meta en el año' : '—'; });
  dash.draw('empTake', (x) => {
    const r = resumenEmp(); if (!r) { x.textContent = '—'; return; }
    x.textContent = 'De enero a ' + MES[r.ult.mes - 1] + ' llevamos ' + F.int(r.real) + ' Hl contra ' + F.int(r.meta) + ' de meta (' + sign(r.cump - 1) + ') y ' + sign(r.vs25) + ' contra el mismo periodo de 2025. ' + (r.ult ? MES[r.ult.mes - 1].replace(/^./, (c) => c.toUpperCase()) + ' cerró en ' + pct(r.ult.real / r.ult.meta) + ' de su meta.' : '');
  });
  dash.draw('empTiles', (x) => {
    x.replaceChildren(); const r = resumenEmp(); if (!r) return;
    tile(x, 'Acumulado 2026', F.int(r.real) + ' Hl', r.meses + ' meses cerrados');
    tile(x, 'Cumplimiento', pct(r.cump), 'de ' + F.int(r.meta) + ' Hl de meta');
    tile(x, 'Contra 2025', sign(r.vs25), 'mismo periodo');
    tile(x, 'Meta anual', F.int(r.metaAnual) + ' Hl', 'faltan ' + F.int(Math.max(0, r.metaAnual - r.real)));
    if (window.CPN.empTipo === 'Real') { const nv = novEnCurso(); if (nv) tile(x, 'Noviembre (en curso)', F.int(nv) + ' Hl', 'proyección 7 rutas, sin la 5'); }
  });
  dash.draw('empChart', (host) => {
    host.replaceChildren(); const e = emp(); if (!e.length) return;
    const W = Math.max(300, host.clientWidth || 640), H = 260, m = { t: 18, r: 10, b: 26, l: 44 };
    const svg = d3.select(host).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleBand(e.map((r) => r.mes), [m.l, W - m.r]).padding(0.28);
    const ymax = d3.max(e, (r) => Math.max(r.real || 0, r.meta || 0, r.y2025 || 0)) * 1.12;
    const y = d3.scaleLinear([0, ymax], [H - m.b, m.t]);
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', m.l - 6).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((v) => F.int(v));
    const tip = d3.select(host).append('div').attr('class', 'tip').style('opacity', 0);
    const nv = window.CPN.empTipo === 'Real' ? novEnCurso() : null;
    const bars = e.map((r) => ({ ...r, val: r.real != null ? r.real : (r.mes === 11 && nv ? nv : null), proy: r.real == null && r.mes === 11 && nv }));
    svg.append('g').selectAll('rect').data(bars.filter((r) => r.val != null)).join('rect')
      .attr('x', (r) => x(r.mes)).attr('width', x.bandwidth()).attr('y', (r) => y(r.val)).attr('height', (r) => y(0) - y(r.val)).attr('rx', 3)
      .attr('fill', (r) => r.proy ? 'color-mix(in srgb, var(--g) 35%, transparent)' : (r.meta && r.val >= r.meta ? 'var(--g)' : 'color-mix(in srgb, var(--color-bad) 75%, var(--color-panel))'))
      .attr('stroke', (r) => r.proy ? 'var(--g)' : 'none').attr('stroke-dasharray', '3 2')
      .on('mousemove', (ev, r) => { const [px, py] = d3.pointer(ev, host); tip.style('opacity', 1).style('left', Math.min(px + 10, W - 170) + 'px').style('top', (py - 30) + 'px').text(MES[r.mes - 1] + ': ' + F.int(r.val) + ' Hl' + (r.meta ? ' · meta ' + F.int(r.meta) + ' (' + pct(r.val / r.meta) + ')' : '') + (r.proy ? ' · proyección' : '')); })
      .on('mouseleave', () => tip.style('opacity', 0));
    const line = d3.line().defined((r) => r.v != null).x((r) => x(r.mes) + x.bandwidth() / 2).y((r) => y(r.v));
    svg.append('path').attr('d', line(e.map((r) => ({ mes: r.mes, v: r.meta })))).attr('fill', 'none').attr('stroke', 'var(--gold)').attr('stroke-width', 2.5);
    svg.append('g').selectAll('circle').data(e.filter((r) => r.meta)).join('circle').attr('cx', (r) => x(r.mes) + x.bandwidth() / 2).attr('cy', (r) => y(r.meta)).attr('r', 3).attr('fill', 'var(--gold)');
    svg.append('path').attr('d', line(e.map((r) => ({ mes: r.mes, v: r.y2025 })))).attr('fill', 'none').attr('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 2).attr('stroke-dasharray', '4 4');
    svg.append('g').selectAll('text').data(e).join('text').attr('x', (r) => x(r.mes) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((r) => MES[r.mes - 1]);
    const lg = d3.select(host).append('div').attr('class', 'legend');
    [['2026 llegó a la meta', 'var(--g)'], ['2026 abajo de la meta', 'color-mix(in srgb, var(--color-bad) 75%, var(--color-panel))'], ['Meta 2026', 'var(--gold)'], ['2025', 'var(--cds-chart-muted)']].concat(nv ? [['Noviembre en curso (proyección)', 'color-mix(in srgb, var(--g) 35%, transparent)']] : []).forEach(([t, c]) => { const s = lg.append('span'); s.append('i').style('background', c); s.append('span').text(t); });
  });
  dash.draw('empCump', (host) => {
    host.replaceChildren(); const e = emp().filter((r) => r.real != null && r.meta); if (!e.length) return;
    e.forEach((r) => {
      const v = r.real / r.meta; const row = el('div', 'cumrow');
      row.append(el('span', null, MES[r.mes - 1]));
      const bar = el('div', 'cumbar'); const f = el('i'); f.style.width = Math.min(100, v / 1.3 * 100) + '%'; f.style.background = v >= 1 ? 'var(--color-ok)' : v >= 0.9 ? 'var(--color-warn)' : 'var(--color-bad)';
      const mk = el('em'); mk.style.left = (1 / 1.3 * 100) + '%'; bar.append(f, mk);
      row.append(bar, el('b', v >= 1 ? 'ok' : v >= 0.9 ? 'warn' : 'bad', pct(v))); host.append(row);
    });
    host.append(el('p', 'note', 'La raya es el 100% de la meta. Verde: la pasó; amarillo: 90-99%; rojo: menos de 90%.'));
  });
  dash.draw('empTabla', (host) => {
    host.replaceChildren(); const e = emp(); if (!e.length) return;
    const t = el('table', 'cpn-t'); const hr = el('tr');
    const cols = window.CPN.empTipo === 'Real' ? ['Mes', 'Meta', 'Real 2026', '% meta', '2025', 'vs 2025', '2024', '2023'] : ['Mes', 'Meta', 'Híbrida 2026', '% meta', '2025', 'vs 2025'];
    cols.forEach((c, i) => hr.append(el('th', i ? 'num' : null, c))); t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody');
    e.forEach((r) => {
      const tr = el('tr'); const f = (v) => (v == null ? '—' : F.int(v));
      tr.append(el('td', null, MES[r.mes - 1]), el('td', 'num', f(r.meta)), el('td', 'num', f(r.real)));
      const pm = r.real != null && r.meta ? r.real / r.meta : null; tr.append(el('td', 'num ' + (pm == null ? '' : pm >= 1 ? 'ok' : pm >= 0.9 ? 'warn' : 'bad'), pm == null ? '—' : pct(pm)));
      tr.append(el('td', 'num', f(r.y2025)));
      const v = r.real != null && r.y2025 ? r.real / r.y2025 - 1 : null; tr.append(el('td', 'num ' + (v == null ? '' : v >= 0 ? 'ok' : 'bad'), v == null ? '—' : sign(v)));
      if (window.CPN.empTipo === 'Real') tr.append(el('td', 'num', f(r.y2024)), el('td', 'num', f(r.y2023)));
      tb.append(tr);
    });
    t.append(tb); host.append(t);
  });
  dash.draw('empRutas', (host) => {
    host.replaceChildren(); const er = rows('empresa_ruta').filter((r) => r.real != null && r.meta); if (!er.length) return;
    const meses = [...new Set(er.map((r) => r.mes))].sort((a, b) => a - b); const rutas = ['Ruta 1', 'Ruta 2', 'Ruta 3', 'Ruta 4', 'Ruta 5', 'Ruta 6', 'Ruta 7', 'Ruta 13'];
    const t = el('table', 'cpn-t heat'); const hr = el('tr'); hr.append(el('th', null, 'Ruta')); meses.forEach((m) => hr.append(el('th', 'num', MES[m - 1]))); hr.append(el('th', 'num', 'Año')); t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody');
    rutas.forEach((ru) => {
      const tr = el('tr'); const n = el('td', null, ru); n.style.fontWeight = '600'; n.style.color = rc(ru); tr.append(n);
      let sr = 0, sm = 0;
      meses.forEach((m) => {
        const r = er.find((x) => x.ruta === ru && x.mes === m); const v = r ? r.real / r.meta : null; if (r) { sr += r.real; sm += r.meta; }
        const td = el('td', 'num', v == null ? '—' : pct(v)); if (v != null) { td.style.background = v >= 1 ? 'color-mix(in srgb, var(--color-ok) ' + Math.min(60, 15 + (v - 1) * 120) + '%, transparent)' : 'color-mix(in srgb, var(--color-bad) ' + Math.min(60, 10 + (1 - v) * 120) + '%, transparent)'; }
        tr.append(td);
      });
      const v = sm ? sr / sm : null; const td = el('td', 'num', v == null ? '—' : pct(v)); td.style.fontWeight = '700'; tr.append(td);
      tb.append(tr);
    });
    t.append(tb); host.append(t);
  });
  document.querySelectorAll('[data-emp]').forEach((b) => b.addEventListener('click', () => {
    window.CPN.empTipo = b.getAttribute('data-emp');
    document.querySelectorAll('[data-emp]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    ['empTitulo', 'empTake', 'empTiles', 'empChart', 'empCump', 'empTabla'].forEach((n) => dash.draw(n));
  }));

  /* ---------- PRODUCTOS: cartera (pastel) ---------- */
  window.CPN.carteraRuta = window.CPN.carteraRuta || '';
  window.CPN.carteraFuente = window.CPN.carteraFuente || 'mes';
  dash.draw('carteraPie', (host) => {
    const ru = window.CPN.carteraRuta, src = window.CPN.carteraFuente; const by = {};
    if (src === 'mes') rows('marcas').filter((r) => (!ru || r.ruta === ru) && RUTAS7.includes(r.ruta)).forEach((r) => { by[r.marca] = (by[r.marca] || 0) + r.hl; });
    else rows('productos').filter((r) => (!ru || r.ruta === ru) && RUTAS7.includes(r.ruta)).forEach((r) => { by[r.marca] = (by[r.marca] || 0) + r.hlMes3; });
    let items = Object.entries(by).filter(([, v]) => v > 0).map(([k, v]) => ({ label: k, value: v, color: window.CPN.brandColor[k] || '#9AA0A6' })).sort((a, b) => b.value - a.value);
    if (items.length > 8) { const o = items.slice(8).reduce((a, x) => a + x.value, 0); items = items.slice(0, 8).concat([{ label: 'Otras', value: o, color: '#9AA0A6' }]); }
    const tot = items.reduce((a, x) => a + x.value, 0);
    window.CPN.donut(host, items, F.hl(tot), src === 'mes' ? 'Hl en el mes' : 'Hl al mes');
  });
  const bindSel = (attr, key, draw) => document.querySelectorAll('[' + attr + ']').forEach((b) => b.addEventListener('click', () => {
    window.CPN[key] = b.getAttribute(attr);
    document.querySelectorAll('[' + attr + ']').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw.forEach((n) => dash.draw(n));
  }));
  bindSel('data-cartera', 'carteraRuta', ['carteraPie']);
  bindSel('data-cfuente', 'carteraFuente', ['carteraPie']);

  /* ---------- CLIENTES y CANALES: pasteles ---------- */
  dash.draw('cliPie', (host) => {
    const ru = (document.getElementById('cli-ruta') || {}).value || '';
    const cl = rows('clientes').filter((c) => (!ru || c.ruta === ru) && c.estado !== 'Inactivo');
    const col = { Creciendo: 'var(--color-ok)', Estable: '#7FA88E', Nuevo: '#2C6FB3', 'En riesgo': 'var(--color-warn)', Perdido: 'var(--color-bad)' };
    const items = Object.keys(col).map((k) => ({ label: k, value: cl.filter((c) => c.estado === k).length, color: col[k] })).filter((x) => x.value);
    window.CPN.donut(host, items, F.int(cl.length), 'clientes');
  });
  dash.draw('cliRiesgoRuta', (host) => {
    host.replaceChildren(); const cl = rows('clientes').filter((c) => ['En riesgo', 'Perdido'].includes(c.estado) && RUTAS7.includes(c.ruta)); if (!cl.length) return;
    const rr = RUTAS7.map((r) => ({ ruta: r, v: cl.filter((c) => c.ruta === r).reduce((a, c) => a + (c.ventaPerdidaMes || 0), 0), n: cl.filter((c) => c.ruta === r).length })).sort((a, b) => b.v - a.v);
    window.CPN.bars(host, rr, 'ruta', 'v', { fmt: (v) => '$' + F.int(v / 1000) + 'k', label: (r) => r.ruta.replace('Ruta ', 'R'), color: 'var(--color-bad)' });
  });
  ['cli-ruta'].forEach((id) => { const x = document.getElementById(id); if (x) x.addEventListener('change', () => dash.draw('cliPie')); });
  dash.draw('canPie', (host) => {
    const can = rows('canales').filter((c) => c.hlMes3 > 0);
    const pal = ['#0E5A33', '#C98A0B', '#2C6FB3', '#B3262D', '#7C5CDB', '#6B7280'];
    window.CPN.donut(host, can.map((c, i) => ({ label: c.canal, value: c.hlMes3, color: pal[i % pal.length] })), F.int(can.reduce((a, c) => a + c.hlMes3, 0)), 'Hl al mes');
  });
  dash.draw('canMargenPie', (host) => {
    const can = rows('canales').filter((c) => c.utilMes > 0);
    const pal = ['#0E5A33', '#C98A0B', '#2C6FB3', '#B3262D', '#7C5CDB', '#6B7280'];
    window.CPN.donut(host, can.map((c, i) => ({ label: c.canal, value: c.utilMes, color: pal[i % pal.length] })), '$' + F.int(can.reduce((a, c) => a + c.utilMes, 0) / 1000) + 'k', 'margen al mes');
  });

  /* ---------- HOY: gráfica de días ---------- */
  dash.draw('hoyDias', (host) => {
    const g = rows('porDia'); if (!g.length) { host.replaceChildren(); return; }
    window.CPN.bars(host, g, 'fecha', 'hl', { fmt: F.hl, label: (r) => F.dia(r.fecha).split(' ').slice(0, 2).join(' '), ref: (one('mesRuta', 'TOTAL') || {}).metaDia });
  });
  dash.draw('hoyRutasPie', (host) => {
    const t = rows('resumenDia').filter((r) => r.ruta !== 'TOTAL');
    window.CPN.donut(host, t.map((r) => ({ label: r.ruta, value: r.hl, color: rc(r.ruta) })), F.hl(t.reduce((a, r) => a + r.hl, 0)), 'Hl ayer');
  });

  /* ---------- BONO: selector de producto ---------- */
  bindSel('data-bono', 'bonoSel', ['bonoProd', 'bonoTitulo', 'bonoTake', 'bonoTiles', 'bonoCarrera']);

  /* ---------- Navegación ---------- */
  const TIT = { hoy: ['Hoy', 'Hoja del día'], empresa: ['Empresa', 'Cómo vamos mes con mes'], global: ['Rutas', 'Último día y avance del mes'], ruta: ['Ruta por ruta', 'Detalle de cada vendedor'], semana: ['Semana', 'Resumen y ranking'], temporada: ['Temporada', '2026 contra 2025'], clientes: ['Clientes', 'En riesgo, perdidos y qué ofrecer'], foco: ['Productos', 'Cartera, penetración y foco'], canales: ['Canales', 'Dónde se vende y cuánto deja'], utilidad: ['Margen', 'Cuánto deja cada ruta y marca'], bono: ['Bono', 'Carrera del mes'], mapa: ['Mapa', 'Visitas con GPS'], flotilla: ['Flotilla', 'Motum'] };
  const side = document.getElementById('side'); const veil = document.getElementById('veil');
  const cerrar = () => { if (side) side.classList.remove('open'); if (veil) veil.hidden = true; };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute('data-vista'); const t = TIT[v] || [v, ''];
    window.CPN.vista = v;
    document.querySelectorAll('[data-vista-sec]').forEach((s) => { s.hidden = s.getAttribute('data-vista-sec') !== v; });
    document.querySelectorAll('[data-vista]').forEach((x) => x.setAttribute('aria-pressed', String(x.getAttribute('data-vista') === v)));
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
    cerrar(); window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }));
  const mb = document.getElementById('btn-menu'); if (mb) mb.addEventListener('click', () => { side.classList.add('open'); veil.hidden = false; });
  const mas = document.getElementById('btn-mas'); if (mas) mas.addEventListener('click', () => { side.classList.add('open'); veil.hidden = false; });
  if (veil) veil.addEventListener('click', cerrar);
})();
