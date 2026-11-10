/* Hallazgos: análisis de la IA sobre la venta del mes (liquidaciones, duplicados, GPS, precios). */
(function () {
  const F = window.CPN.fmt;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const color = (r) => (window.CPN.routeColor && window.CPN.routeColor[r]) || '#6B7280';
  const ORD = { alta: 0, media: 1, baja: 2 };
  const NOM = { alta: 'Urgente', media: 'Revisar', baja: 'Para saber' };
  const CLS = { alta: 'bad', media: 'warn', baja: 'ok' };
  const st = { grav: 'importantes', ruta: 'todas', todos: false };

  function lista() {
    return rows('hallazgos').slice().sort((a, b) => ORD[a.gravedad] - ORD[b.gravedad] || (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : 0) || b.monto - a.monto);
  }

  dash.draw('hallazgosResumen', (e) => {
    e.replaceChildren();
    const H = rows('hallazgos'); const R = rows('hallazgos_ruta');
    if (!H.length && !R.length) { e.append(el('p', 'note', 'Todavía no hay hallazgos para este mes.')); return; }
    const altas = H.filter((h) => h.gravedad === 'alta').length;
    const porLiq = R.reduce((a, r) => a + Math.max(0, r.porLiquidar || 0), 0);
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('Urgentes', F.int(altas), 'de ' + F.int(H.length) + ' hallazgos del mes', altas ? 'bad' : '');
    t('Venta sin liquidar', F.money(porLiq), 'según liquidaciones de Power Sales', porLiq > 0 ? 'bad' : '');
    const peor = R.slice().sort((a, b) => b.puntaje - a.puntaje)[0];
    if (peor) t('Ruta a revisar primero', peor.ruta, peor.vendedor + ' · ' + peor.altas + ' urgentes', '');
    e.append(tiles);
    const tabla = el('div', 'hal-rutas');
    R.slice().sort((a, b) => b.puntaje - a.puntaje).forEach((r) => {
      const b = el('button', 'hal-ruta'); b.type = 'button'; b.setAttribute('aria-pressed', String(st.ruta === r.ruta));
      const n = el('b', null, r.ruta); n.style.color = color(r.ruta);
      b.append(n, el('span', null, r.altas + ' urgentes · ' + r.medias + ' revisar' + (r.porLiquidar > 50 ? ' · ' + F.money(r.porLiquidar) + ' sin liquidar' : '')));
      b.addEventListener('click', () => { st.ruta = st.ruta === r.ruta ? 'todas' : r.ruta; st.todos = false; dash.draw('hallazgosResumen'); dash.draw('hallazgosLista'); });
      tabla.append(b);
    });
    e.append(tabla);
  });

  dash.draw('hallazgosLista', (e) => {
    e.replaceChildren();
    const seg = el('div', 'seg seg-sm');
    [['importantes', 'Urgentes y revisar'], ['alta', 'Solo urgentes'], ['todas', 'Todos']].forEach(([k, t]) => {
      const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.grav === k));
      b.addEventListener('click', () => { st.grav = k; st.todos = false; dash.draw('hallazgosLista'); });
      seg.append(b);
    });
    e.append(seg);
    if (st.ruta !== 'todas') {
      const q = el('button', 'hal-quitar', 'Mostrando ' + st.ruta + ' · ver todas las rutas'); q.type = 'button';
      q.addEventListener('click', () => { st.ruta = 'todas'; dash.draw('hallazgosResumen'); dash.draw('hallazgosLista'); });
      e.append(q);
    }
    let H = lista();
    if (st.ruta !== 'todas') H = H.filter((h) => h.ruta === st.ruta);
    if (st.grav === 'importantes') H = H.filter((h) => h.gravedad !== 'baja');
    else if (st.grav === 'alta') H = H.filter((h) => h.gravedad === 'alta');
    const ul = el('ol', 'acciones hal-lista');
    const n = st.todos ? H.length : Math.min(10, H.length);
    H.slice(0, n).forEach((h) => {
      const li = el('li');
      const izq = el('div', 'hal-izq');
      const p = el('span', 'pill ' + CLS[h.gravedad], NOM[h.gravedad]);
      const r = el('span', 'hal-r', h.ruta); r.style.color = color(h.ruta);
      izq.append(p, r);
      const c = el('div', 'hal-cuerpo');
      const tit = el('b', null, h.tipo + (h.cliente ? ' · ' + h.cliente + (h.clienteId && h.clienteId.indexOf(',') < 0 ? ' (' + h.clienteId + ')' : '') : ''));
      c.append(tit, el('span', null, h.detalle));
      const meta = el('small', null, F.dia(h.fecha) + (h.vendedor ? ' · ' + h.vendedor : '') + (h.monto ? ' · ' + F.money(h.monto) : ''));
      c.append(meta);
      if (h.accion) c.append(el('em', null, '→ ' + h.accion));
      li.append(izq, c); ul.append(li);
    });
    if (!H.length) ul.append(el('li', null, 'Sin hallazgos con este filtro.'));
    e.append(ul);
    if (H.length > n) {
      const m = el('button', 'hal-mas', 'Ver los ' + H.length + ' hallazgos'); m.type = 'button';
      m.addEventListener('click', () => { st.todos = true; dash.draw('hallazgosLista'); });
      e.append(m);
    }
  });
})();
