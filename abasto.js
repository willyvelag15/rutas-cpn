/* Abasto: pedido sugerido en tarimas completas por SKU (S+1 y S+2) contra lo programado y pronosticado. */
(function () {
  const F = window.CPN.fmt;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const st = { todos: false };
  const dm = (s) => { const d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()]; };
  dash.draw('abaResumen', (e) => {
    e.replaceChildren();
    const r = rows('abasto_res')[0]; if (!r) { e.append(el('p', 'note', 'Falta el inventario de almacén para calcular el pedido.')); return; }
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('S+1 (semana del ' + dm(r.S1) + ')', F.int(r.tarimasSugS1) + ' tarimas', 'sugeridas · programadas ' + F.int(r.tarimasProgS1), r.tarimasProgS1 > r.tarimasSugS1 + 3 ? 'bad' : '');
    t('S+2 (semana del ' + dm(r.S2) + ')', F.int(r.tarimasSugS2) + ' tarimas', 'sugeridas · pronosticadas ' + F.int(r.tarimasPronS2), r.tarimasPronS2 > r.tarimasSugS2 + 3 ? 'bad' : '');
    t('Producto de más', F.money(r.dineroDeMas), 'a costo, entre lo programado y lo pronosticado', r.dineroDeMas > 0 ? 'bad' : '');
    e.append(tiles);
    e.append(el('p', 'note', 'Inventario al ' + dm(r.fecha) + ' (almacén + camiones), venta promedio de ' + r.diasVenta + ' días de noviembre. Colchón al cierre de la semana: 3 días en lo que llega casi diario (XX cuarto, caguama) y ' + r.objetivo + ' días en lo demás. Solo tarimas completas.'));
  });
  dash.draw('abaTabla', (e) => {
    e.replaceChildren();
    const A = rows('abasto_sku'); if (!A.length) return;
    const L = A.filter((x) => st.todos || x.nota || x.sugS1 || x.sugS2);
    const seg = el('div', 'seg seg-sm');
    [[false, 'Lo que hay que mover'], [true, 'Todos los SKU']].forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.todos === v)); b.addEventListener('click', () => { st.todos = v; dash.draw('abaTabla'); }); seg.append(b); });
    e.append(seg);
    const ul = el('ol', 'acciones hal-lista');
    L.forEach((x) => {
      const li = el('li'); const izq = el('div', 'hal-izq');
      const mal = /de más|no pedir/.test(x.nota || ''); const corto = /Faltan|corto/.test(x.nota || '');
      izq.append(el('span', 'pill ' + (mal ? 'bad' : corto ? 'warn' : 'ok'), mal ? 'De más' : corto ? 'Corto' : 'Bien'));
      const c = el('div', 'hal-cuerpo');
      c.append(el('b', null, x.producto + ' (' + x.clave + ')'));
      c.append(el('span', null, 'S+1: programado ' + F.int(x.progS1) + ' → sugerido ' + F.int(x.sugS1) + ' tarimas · S+2: pronosticado ' + F.int(x.pronS2) + ' → sugerido ' + F.int(x.sugS2)));
      c.append(el('small', null, 'Vende ' + F.int(x.ventaDia) + ' cajas/día · hoy alcanza para ' + (x.diasHoy == null ? '—' : F.int(x.diasHoy)) + ' días · ' + F.int(x.cxt) + ' cajas por tarima' + (x.mesAnt != null ? ' · mes pasado ' + F.int(x.mesAnt) + ' cajas' : '')));
      if (x.nota) c.append(el('em', null, '→ ' + x.nota));
      li.append(izq, c); ul.append(li);
    });
    e.append(ul);
  });

  /* Carga sugerida por ruta para el siguiente día */
  const sc = { ruta: null };
  const color = (r) => (window.CPN.routeColor && window.CPN.routeColor[r]) || '#6B7280';
  dash.draw('cargaRuta', (e) => {
    e.replaceChildren();
    const R = rows('carga_ruta'); if (!R.length) return;
    e.append(el('p', 'note', 'Para el ' + R[0].dia + ' ' + dm(R[0].fecha) + '. "Carga de más" = lo que cargó en el mes contra lo que vendió (incluye lo que se queda en el camión).'));
    const t = el('table', 'cpn-t'); const hr = el('tr');
    [['Ruta', ''], ['Debe llevar', 'num'], ['Ya trae', 'num'], ['A cargar', 'num'], ['Pidió', 'num'], ['Carga de más (mes)', 'num']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr); const tb = el('tbody');
    R.forEach((x) => { const tr = el('tr'); tr.style.cursor = 'pointer'; const n = el('td', null, x.ruta); n.style.fontWeight = '600'; n.style.color = color(x.ruta);
      tr.append(n, el('td', 'num', F.int(x.sugerido)), el('td', 'num', F.int(x.sugerido - x.cargar)), el('td', 'num', F.int(x.cargar)), el('td', 'num' + (x.pedido > x.cargar * 1.2 + 10 ? ' bad' : ''), x.pedido ? F.int(x.pedido) : '—'), el('td', 'num' + (x.cargaDeMas > 0.2 ? ' bad' : x.cargaDeMas > 0.1 ? ' warn' : ''), x.cargaDeMas == null ? '—' : F.pct(x.cargaDeMas)));
      tr.addEventListener('click', () => { sc.ruta = x.ruta; dash.draw('cargaDetalle'); }); tb.append(tr); });
    t.append(tb); const w = el('div', 'tblwrap'); w.append(t); e.append(w);
  });
  dash.draw('cargaDetalle', (e) => {
    e.replaceChildren();
    const C = rows('carga'); if (!C.length) return;
    const rutas = [...new Set(C.map((x) => x.ruta))]; if (!sc.ruta || !rutas.includes(sc.ruta)) sc.ruta = rutas[0];
    const seg = el('div', 'seg seg-sm'); rutas.forEach((r) => { const b = el('button', null, r); b.type = 'button'; b.setAttribute('aria-pressed', String(sc.ruta === r)); b.addEventListener('click', () => { sc.ruta = r; dash.draw('cargaDetalle'); }); seg.append(b); }); e.append(seg);
    const L = C.filter((x) => x.ruta === sc.ruta && (x.cargar || x.pedido)).sort((a, b) => b.cargar - a.cargar);
    const t = el('table', 'cpn-t'); const hr = el('tr');
    [['Producto', ''], ['Debe llevar', 'num'], ['Ya trae', 'num'], ['A cargar', 'num'], ['Pidió', 'num']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr); const tb = el('tbody');
    L.forEach((x) => { const tr = el('tr'); tr.append(el('td', 'wrap', x.producto), el('td', 'num', F.int(x.sugerido)), el('td', 'num', F.int(x.enCamion)), el('td', 'num', F.int(x.cargar)), el('td', 'num' + (x.pedido > x.cargar + 5 ? ' bad' : ''), x.pedido ? F.int(x.pedido) : '—')); tb.append(tr); });
    if (!L.length) { const tr = el('tr'); tr.append(el('td', null, 'Con lo que trae le alcanza.')); tb.append(tr); }
    t.append(tb); const w = el('div', 'tblwrap'); w.append(t); e.append(w);
  });
  const TIT = { abasto: ['Abasto', 'Pedido sugerido en tarimas completas'] };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const t = TIT[b.getAttribute('data-vista')]; if (!t) return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
  }));
})();
