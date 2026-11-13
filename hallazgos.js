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
  window.addEventListener('cpn-ir', (ev) => { const r = ev.detail.ruta; if (!r || ev.detail.vista !== 'hoy') return; st.ruta = r; st.todos = false; st.gpsTodos = false; st.grav = 'importantes'; ['hallazgosResumen', 'hallazgosLista', 'hallazgosGps'].forEach((n) => dash.draw(n)); });

  function lista() {
    return rows('hallazgos').slice().sort((a, b) => ORD[a.gravedad] - ORD[b.gravedad] || (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : 0) || b.monto - a.monto);
  }

  dash.draw('hallazgosResumen', (e) => {
    e.replaceChildren();
    const H = rows('hallazgos'); const R = rows('hallazgos_ruta');
    if (!H.length && !R.length) { e.append(el('p', 'note', 'No hay hallazgos en los últimos 7 días.')); return; }
    const altas = H.filter((h) => h.gravedad === 'alta').length;
    const porLiq = R.reduce((a, r) => a + Math.max(0, r.porLiquidar || 0), 0);
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    const sim = H.filter((h) => h.tipo === 'Posible venta simulada');
    const vsim = R.reduce((a, r) => a + (r.ventaSospechosa || 0), 0);
    t('Ventas que pueden ser simuladas', F.money(vsim), sim.length + ' clientes por confirmar', vsim > 0 ? 'bad' : '');
    t('Urgentes', F.int(altas), 'de ' + F.int(H.length) + ' hallazgos de los últimos 7 días', altas ? 'bad' : '');
    t('Venta sin liquidar', F.money(porLiq), 'según liquidaciones de Power Sales', porLiq > 0 ? 'bad' : '');
    const peor = R.slice().sort((a, b) => (b.pctSospechosa || 0) - (a.pctSospechosa || 0) || b.puntaje - a.puntaje)[0];
    if (peor) t('Ruta a revisar primero', peor.ruta, peor.vendedor + ' · ' + F.pct(peor.pctSospechosa || 0) + ' de su venta es dudosa', '');
    e.append(tiles);
    const tabla = el('div', 'hal-rutas');
    R.slice().sort((a, b) => (b.ventaSospechosa || 0) - (a.ventaSospechosa || 0) || b.puntaje - a.puntaje).forEach((r) => {
      const b = el('button', 'hal-ruta'); b.type = 'button'; b.setAttribute('aria-pressed', String(st.ruta === r.ruta));
      const n = el('b', null, r.ruta); n.style.color = color(r.ruta);
      b.append(n, el('span', null, (r.ventaSospechosa ? F.money(r.ventaSospechosa) + ' dudosas (' + F.pct(r.pctSospechosa || 0) + ' de su venta)' : 'sin ventas dudosas') + (r.porLiquidar > 50 ? ' · ' + F.money(r.porLiquidar) + ' sin liquidar' : '')));
      b.addEventListener('click', () => { st.ruta = st.ruta === r.ruta ? 'todas' : r.ruta; st.todos = false; st.gpsTodos = false; dash.draw('hallazgosResumen'); dash.draw('hallazgosLista'); dash.draw('hallazgosGps'); });
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
      q.addEventListener('click', () => { st.ruta = 'todas'; dash.draw('hallazgosResumen'); dash.draw('hallazgosLista'); dash.draw('hallazgosGps'); });
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

  /* Cruce del GPS de los camiones (Motum) contra donde Power Sales registró cada venta. */
  const NOCONF = { 'Camión nunca pasó': 'bad', 'Camión pasó a otra hora': 'warn', 'Camión en la bodega': 'bad' };
  const km = (m) => (m == null ? '—' : m >= 1000 ? (m / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + ' km' : Math.round(m) + ' m');
  dash.draw('hallazgosGps', (e) => {
    e.replaceChildren();
    const X = rows('motum_cruce'); const R = rows('hallazgos_ruta');
    if (!X.length) { e.append(el('p', 'note', 'Todavía no hay recorridos de Motum para cruzar.')); return; }
    const caja = el('div', 'hal-gps');
    R.slice().sort((a, b) => a.rutaNum - b.rutaNum).forEach((r) => {
      if (st.ruta !== 'todas' && st.ruta !== r.ruta) return;
      const b = el('div', 'hal-ruta'); const n = el('b', null, r.ruta); n.style.color = color(r.ruta);
      let txt;
      if (r.gpsVentas) txt = F.pct(r.gpsPct) + ' confirmadas (' + F.int(r.gpsConfirmadas) + ' de ' + F.int(r.gpsVentas) + ')' + (r.gpsNoConf ? ' · ' + F.int(r.gpsNoConf) + ' sin camión: ' + F.money(r.gpsVentaNoConf) : '');
      else if (r.gpsEstado === 'Camión sin moverse') txt = 'el GPS de su camión no se movió en la semana';
      else txt = (r.gpsEstado || 'sin datos').replace('Sin GPS en el camión', 'su camión no tiene GPS');
      const s1 = el('span', null, txt); if (r.gpsVentas && r.gpsPct < 0.8) s1.className = 'bad';
      b.append(n, s1); caja.append(b);
    });
    e.append(caja);
    let L = X.filter((x) => NOCONF[x.estado] && (st.ruta === 'todas' || x.ruta === st.ruta)).sort((a, b) => b.venta - a.venta);
    const ul = el('ol', 'acciones hal-lista');
    const n = st.gpsTodos ? L.length : Math.min(8, L.length);
    L.slice(0, n).forEach((x) => {
      const li = el('li'); const izq = el('div', 'hal-izq');
      const p = el('span', 'pill ' + NOCONF[x.estado], x.estado.replace('Camión ', ''));
      const r = el('span', 'hal-r', x.ruta); r.style.color = color(x.ruta); izq.append(p, r);
      const c = el('div', 'hal-cuerpo');
      c.append(el('b', null, x.cliente + ' (' + x.clienteId + ') · ' + F.money(x.venta)));
      let d;
      if (x.estado === 'Camión en la bodega') d = 'A la hora de la venta el camión estaba en la bodega' + (x.dCamion != null ? ', a ' + km(x.dCamion) + ' del cliente.' : '.');
      else if (x.estado === 'Camión pasó a otra hora') d = 'Durante la visita el camión estaba a ' + km(x.dCamion) + ' del cliente; pasó por ahí a otra hora del día.';
      else d = 'Ese día el camión nunca pasó a menos de ' + km(x.dDia) + ' del cliente.';
      if (x.dCaptura != null) d += ' Power Sales registró la venta a ' + km(x.dCaptura) + ' de donde estaba el camión.';
      c.append(el('span', null, d), el('small', null, F.dia(x.fecha) + ' · ' + x.hora + ' · ' + x.vendedor));
      c.append(el('em', null, '→ Llamar al cliente y confirmar que recibió el pedido ese día y a qué precio.'));
      li.append(izq, c); ul.append(li);
    });
    if (!L.length) ul.append(el('li', null, 'Todas las ventas con GPS cuadran con el camión.'));
    e.append(ul);
    if (L.length > n) { const m = el('button', 'hal-mas', 'Ver las ' + L.length + ' ventas sin camión'); m.type = 'button'; m.addEventListener('click', () => { st.gpsTodos = true; dash.draw('hallazgosGps'); }); e.append(m); }
  });
})();
