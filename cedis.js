/* Ventas capturadas DENTRO del CEDIS (Willy, 21-nov-2026): coordenadas fijas de los CEDIS y radio de 20 m.
   Datos: ventas_cedis.json (analizar_hallazgos.py). Doble check con el GPS del camión cuando la ruta lo trae. */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const money = (v) => '$' + Math.round(v || 0).toLocaleString('es-MX');
  const dia = (s) => new Date(s + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const st = { ruta: 'todas', clase: 'ruta' };
  dash.draw('ventasCedis', (host) => {
    const d = dash.data('ventas_cedis'); host.replaceChildren();
    if (!d || d.status !== 'ok') { host.append(el('p', 'note', 'Cargando…')); return; }
    const T = d.data || [];
    const rutas = [...new Set(T.map((x) => x.ruta))].sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
    const chips = el('div', 'chips');
    ['todas'].concat(rutas).forEach((r) => { const b = el('button', 'chip', r === 'todas' ? 'Todas' : r); b.type = 'button'; b.setAttribute('aria-pressed', String(st.ruta === r)); b.addEventListener('click', () => { st.ruta = r; dash.draw('ventasCedis'); }); chips.append(b); });
    const chips2 = el('div', 'chips');
    [['ruta', 'Clientes de ruta'], ['todo', 'Todas (con cadenas y clientes del CEDIS)']].forEach(([k, t]) => { const b = el('button', 'chip', t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.clase === k)); b.addEventListener('click', () => { st.clase = k; dash.draw('ventasCedis'); }); chips2.append(b); });
    host.append(chips, chips2);
    const L = T.filter((x) => (st.ruta === 'todas' || x.ruta === st.ruta) && (st.clase === 'todo' || x.clase === 'Cliente de ruta' || x.clase === 'Venta a público en general'));
    const tot = L.reduce((a, x) => a + x.venta, 0);
    host.append(el('p', 'note', L.length + ' ventas · ' + money(tot) + ' · del mes en curso. Radio de 20 m alrededor de las coordenadas fijas del CEDIS.'));
    if (!L.length) { host.append(el('p', 'note', 'No hay ventas registradas dentro del CEDIS con este filtro.')); return; }
    const w = el('div', 'tblwrap'); const t = el('table', 'cpn-t'); const hr = el('tr');
    ['Fecha', 'Hora', 'Ruta', 'Vendedor', 'Cliente', 'Venta', 'CEDIS', 'Metros', 'Camión (GPS)', 'Tipo', 'Mapa'].forEach((h, i) => hr.append(el('th', i === 5 || i === 7 ? 'num' : null, h)));
    t.append(el('thead')); t.tHead.append(hr); const b = el('tbody');
    L.forEach((x) => {
      const tr = el('tr'); const a = el('a', null, 'ver'); a.href = 'https://www.google.com/maps?q=' + x.gps; a.target = '_blank'; a.rel = 'noopener';
      const tm = el('td'); tm.append(a);
      tr.append(el('td', null, dia(x.fecha)), el('td', null, x.hora), el('td', null, x.ruta), el('td', null, x.vendedor), el('td', null, cpnCli(x)), el('td', 'num', money(x.venta)), el('td', null, x.cedis), el('td', 'num', String(x.metros)), el('td', null, x.camion), el('td', x.gravedad === 'alta' ? 'bad' : '', x.clase), tm);
      b.append(tr);
    });
    t.append(b); w.append(t); host.append(w);
  });
})();
/* Liquidación día por día (21-nov-2026): cada día de venta con la(s) liquidación(es) de Power Sales que lo cubren,
   empatadas por importe exacto y por hora real de captura (no por la fecha que pone Power Sales). */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const money = (v) => '$' + Math.round(v || 0).toLocaleString('es-MX');
  const dia = (s) => new Date(s + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const st = { ruta: 'todas', solo: true };
  dash.draw('liqCruce', (host) => {
    const d = dash.data('liquidacion_cruce'); host.replaceChildren();
    if (!d || d.status !== 'ok') { host.append(el('p', 'note', 'Cargando…')); return; }
    const T = (d.data || []).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    const rutas = [...new Set(T.map((x) => x.ruta))].sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
    const chips = el('div', 'chips');
    ['todas'].concat(rutas).forEach((r) => { const b = el('button', 'chip', r === 'todas' ? 'Todas' : r); b.type = 'button'; b.setAttribute('aria-pressed', String(st.ruta === r)); b.addEventListener('click', () => { st.ruta = r; dash.draw('liqCruce'); }); chips.append(b); });
    const bs = el('button', 'chip', 'Solo días con algo que revisar'); bs.type = 'button'; bs.setAttribute('aria-pressed', String(st.solo)); bs.addEventListener('click', () => { st.solo = !st.solo; dash.draw('liqCruce'); }); chips.append(bs);
    host.append(chips);
    const raro = (x) => x.pendiente > 50 || (x.liquidaciones || []).some((l) => l.capturada.slice(0, 10) > x.fecha || l.fechaPS !== x.fecha) || (x.liquidaciones || []).length > 1;
    const L = T.filter((x) => (st.ruta === 'todas' || x.ruta === st.ruta) && (!st.solo || raro(x)));
    if (!L.length) { host.append(el('p', 'note', 'Todo cuadra: cada día se liquidó completo el mismo día.')); return; }
    const w = el('div', 'tblwrap'); const t = el('table', 'cpn-t'); const hr = el('tr');
    ['Día de venta', 'Ruta', 'Vendió', 'Liquidado', 'Pendiente', 'Liquidación (Power Sales)', 'Qué pasó'].forEach((h, i) => hr.append(el('th', i >= 2 && i <= 4 ? 'num' : null, h)));
    t.append(el('thead')); t.tHead.append(hr); const b = el('tbody');
    L.forEach((x) => {
      const ls = x.liquidaciones || [];
      const que = x.pendiente > 50 ? (x.liquidado > 50 ? 'Faltan ' + money(x.pendiente) : 'Sin liquidación que lo cubra') :
        ls.some((l) => l.capturada.slice(0, 10) > x.fecha) ? 'Se liquidó otro día (' + ls.map((l) => l.capturada.slice(8, 10) + '-' + l.capturada.slice(5, 7) + ' ' + l.capturada.slice(11)).join(', ') + ')' :
        ls.some((l) => l.fechaPS !== x.fecha) ? 'Se liquidó el mismo día; Power Sales le puso fecha ' + ls.map((l) => l.fechaPS.slice(8, 10) + '-' + l.fechaPS.slice(5, 7)).join(', ') : ls.length > 1 ? 'Liquidó en ' + ls.length + ' partes el mismo día' : 'Cuadra';
      const tr = el('tr');
      tr.append(el('td', null, dia(x.fecha)), el('td', null, x.ruta), el('td', 'num', money(x.venta)), el('td', 'num', money(x.liquidado)), el('td', 'num' + (x.pendiente > 50 ? ' bad' : ''), money(x.pendiente)),
        el('td', null, ls.map((l) => '#' + l.id + ' ' + money(l.monto) + ' capturada ' + l.capturada.slice(8, 10) + '-' + l.capturada.slice(5, 7) + ' ' + l.capturada.slice(11)).join(' · ') || '—'), el('td', x.pendiente > 50 ? 'bad' : '', que));
      b.append(tr);
    });
    t.append(b); w.append(t); host.append(w);
  });
})();
