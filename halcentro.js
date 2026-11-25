/* Centro de hallazgos (Willy, 24-nov-2026: "fíltrame mejor: hallazgos de ventas (tickets duplicados…), hallazgos Motum
   (alertas y discrepancias de tiempo y ubicación de la venta)… lo más limpio y filtrado posible").
   Junta en una sola pantalla, con los mismos filtros: periodo (día/semana/mes), ruta, categoría, tipo, gravedad, búsqueda y orden.
   Categorías: Ventas y tickets · Ubicación y hora de la venta (GPS) · Alertas Motum · Clientes y saturación · Liquidaciones.
   Admin: reemplaza las tarjetas hallazgosResumen/Lista/Gps.  Páginas: window.CPN_HAL.centro(cont, items, opts). */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const $ = (v) => '$' + n0(v);
  const fd = (s) => (s ? new Date(String(s).slice(0, 10) + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha');
  const rn = (r) => { if (r == null) return null; const n = Number(String(r).replace(/\D/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const ORD = { alta: 0, media: 1, baja: 2 };
  const GRAV = { alta: ['Urgente', 'bad'], media: ['Revisar', 'warn'], baja: ['Para saber', 'ok'] };
  const CATS = [
    ['ventas', 'Ventas y tickets', 'M4 7h16M4 12h16M4 17h10'],
    ['gps', 'Ubicación y hora', 'M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
    ['motum', 'Alertas Motum', 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
    ['clientes', 'Clientes y saturación', 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 19v-1a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8'],
    ['liq', 'Liquidaciones', 'M3 6h18v12H3zM3 10h18M7 15h4'],
    ['otros', 'Otros', 'M12 8v4M12 16h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'],
  ];
  const T_VENTAS = /simulada|dos tickets|duplicad|dos rutas|liquidó a la mañana/i;
  const T_GPS = /cedis|bodega|camión|gps|ubicaci|otra hora|nunca pasó|cerca/i;
  const T_MOTUM = /parada|motum|operador|dispositivo|vuelta|frenad|acelerac|velocidad|cámara|distra|cansancio|cinturón/i;
  const T_CLI = /cliente creciendo|saturaci|grande sin|chico|crece|cae/i;
  const T_LIQ = /liquid|faltante|sin liquidar/i;
  const catDe = (tipo) => (T_VENTAS.test(tipo) ? 'ventas' : T_GPS.test(tipo) ? 'gps' : T_MOTUM.test(tipo) ? 'motum' : T_CLI.test(tipo) ? 'clientes' : T_LIQ.test(tipo) ? 'liq' : 'otros');
  const svg = (d) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'hc-ic'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); s.append(p); return s; };

  // ---------- Datos del admin -> lista única ----------
  function deAdmin(g) {
    const it = [];
    g('hallazgos').forEach((h) => it.push({ cat: catDe(h.tipo), tipo: h.tipo, grav: h.gravedad || 'baja', fecha: h.fecha, ruta: rn(h.rutaNum || h.ruta), vendedor: h.vendedor,
      clienteId: h.clienteId, cliente: h.clienteId ? '#' + h.clienteId + ' · ' + tit(h.cliente) + (h.prop && tit(h.prop) !== tit(h.cliente) ? ' · ' + tit(h.prop) : '') : tit(h.cliente), monto: h.monto, detalle: h.detalle, accion: h.accion, extra: h.veces > 1 ? h.veces + ' veces en el mes' : '' }));
    const NOCONF = { 'Camión nunca pasó': 'alta', 'Camión en la bodega': 'alta', 'Camión pasó a otra hora': 'media', 'Cerca': 'baja' };
    const dm = (v) => (v == null ? '—' : v < 1000 ? n0(v) + ' m' : (Math.round(v / 100) / 10).toLocaleString('es-MX') + ' km');
    const MC = g('motum_cruce'); const veces = {}; MC.forEach((x) => { if (NOCONF[x.estado] && x.estado !== 'Cerca') veces[x.clienteId] = (veces[x.clienteId] || 0) + 1; });
    MC.forEach((x) => { if (!NOCONF[x.estado]) return;
      const h = x.hora ? 'A las ' + x.hora : 'A la hora del ticket';
      const tel = x.dCaptura == null ? '' : x.dCaptura <= 300 ? ' El teléfono del vendedor estaba junto al camión (a ' + dm(x.dCaptura) + ' de él), o sea que el ticket no se hizo en la tienda.' : ' El teléfono del vendedor estaba a ' + dm(x.dCaptura) + ' del camión (pudo bajarse a pie o ir en otro vehículo).';
      let det, acc;
      if (x.estado === 'Camión nunca pasó') { det = h + ', cuando se hizo el ticket, el camión estaba a ' + dm(x.dCamion) + ' del negocio.' + tel + ' En todo el día el camión no se acercó a menos de ' + dm(x.dDia) + ' del negocio.'; acc = 'Preguntarle a ' + (x.vendedor || 'el vendedor') + ' cómo entregó y llamar al cliente para confirmar que recibió el producto y cuánto.'; }
      else if (x.estado === 'Camión pasó a otra hora') { det = h + ', cuando se hizo el ticket, el camión estaba a ' + dm(x.dCamion) + ' del negocio, pero en otro momento del día sí pasó a ' + dm(x.dDia) + '.' + tel + ' Lo más probable: entregó a una hora y capturó a otra.'; acc = 'Pedir que el ticket se haga al momento de entregar, en la tienda.'; }
      else if (x.estado === 'Cerca') { det = h + ' el camión estaba a ' + dm(x.dCamion) + ' del negocio (se pudo estacionar a la vuelta).'; acc = 'Solo para saber; si se repite, revisar el punto del cliente en Motum.'; }
      else { det = h + ' el camión estaba en la bodega y se hizo el ticket.' + tel; acc = 'Llamar al cliente para confirmar que recibió el producto.'; }
      it.push({ cat: 'gps', tipo: x.estado, grav: NOCONF[x.estado], fecha: x.fecha, hora: x.hora, ruta: rn(x.rutaNum || x.ruta), vendedor: x.vendedor, clienteId: x.clienteId,
        cliente: '#' + x.clienteId + ' · ' + tit(x.cliente) + (x.prop && tit(x.prop) !== tit(x.cliente) ? ' · ' + tit(x.prop) : ''), monto: x.venta,
        detalle: det + (x.ubic === 'Motum' ? ' (ubicación del cliente: punto de Motum)' : x.ubic ? ' (ubicación del cliente: ' + x.ubic + ')' : ''), accion: acc,
        extra: veces[x.clienteId] > 1 && x.estado !== 'Cerca' ? veces[x.clienteId] + ' tickets de este cliente este mes con el camión lejos' : '' }); });
    g('motum_alertas').forEach((a) => it.push({ cat: 'motum', tipo: a.tipo, grav: a.gravedad === 'alta' || a.gravedad === 'Alta' ? 'alta' : a.gravedad === 'baja' || a.gravedad === 'Baja' ? 'baja' : 'media', fecha: a.fecha, hora: a.hora, ruta: rn(a.ruta),
      cliente: 'Unidad ' + (a.unidad || ''), detalle: [a.calle, a.velocidad != null ? a.velocidad + ' km/h' : ''].filter(Boolean).join(' · '), lat: a.lat, lng: a.lng, imgs: a.imgs || [] }));
    g('paradas').forEach((p) => it.push({ cat: 'motum', tipo: 'Parada sin cliente', grav: 'media', fecha: p.fecha, hora: p.inicio, ruta: rn(p.rutaNum || p.ruta), vendedor: p.vendedor,
      cliente: 'Parada de ' + n0(p.minutos) + ' min', detalle: 'De ' + p.inicio + ' a ' + p.fin + '. Lo más cercano: ' + (p.clienteCerca || '—') + (p.dCliente != null ? ' a ' + n0(p.dCliente) + ' m' : '') + '.', lat: p.lat, lng: p.lng }));
    g('liquidacion_cruce').forEach((l) => { if (!((l.pendiente || 0) > 50)) return; it.push({ cat: 'liq', tipo: 'Venta sin liquidar', grav: 'alta', fecha: l.fecha, ruta: rn(l.ruta), cliente: 'Ruta ' + rn(l.ruta),
      monto: l.pendiente, detalle: 'Vendió ' + $(l.venta) + ' y se liquidaron ' + $(l.liquidado) + '.', accion: 'Pedir la liquidación pendiente.' }); });
    return it;
  }
  // Páginas de cada puesto (vienen de Supabase: fecha, ruta, tipo, titulo, detalle, cliente, gravedad)
  const dePersona = (H) => H.map((h) => ({ cat: catDe(h.tipo || ''), tipo: h.tipo || 'Hallazgo', grav: h.gravedad || 'baja', fecha: h.fecha, ruta: rn(h.ruta), cliente: h.titulo || tit(h.cliente), detalle: h.detalle }));

  // ---------- Pantalla ----------
  function centro(cont, items, o) {
    o = o || {};
    const st = cont._hc || (cont._hc = { per: 'mes', cat: 'todo', tipo: null, grav: 'todas', orden: 'rec', q: '', n: 30 });
    const go = () => centro(cont, items, o);
    cont.replaceChildren(); cont.classList.add('hc');
    if (!items.length) { cont.append(el('p', 'note', 'Sin hallazgos.')); return; }

    // 1) filtros generales
    const fil = el('div', 'hc-fil');
    if (window.CPN_FILTRO) fil.append(window.CPN_FILTRO.barra(st, { fechas: items.map((x) => x.fecha), rutas: items.map((x) => x.ruta), onChange: () => { st.n = 30; go(); } }));
    const seg = (lista, actual, on, lab) => { const g = el('div', 'cr-seg'); g.setAttribute('aria-label', lab); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); st.n = 30; go(); }); g.append(b); }); return g; };
    const fila2 = el('div', 'vc-bar');
    fila2.append(seg([['todas', 'Toda gravedad'], ['alta', 'Urgentes'], ['media', 'Revisar'], ['baja', 'Para saber']], st.grav, (v) => { st.grav = v; }, 'Gravedad'),
      seg([['rec', 'Más recientes'], ['monto', 'Mayor monto'], ['grav', 'Más graves']], st.orden, (v) => { st.orden = v; }, 'Orden'));
    const q = el('input', 'vc-q hc-q'); q.type = 'search'; q.placeholder = 'Buscar cliente, número, vendedor o palabra'; q.value = st.q;
    fil.append(fila2, q); cont.append(fil);

    const base = items.filter((x) => (!window.CPN_FILTRO || window.CPN_FILTRO.pasa(st, x.fecha, x.ruta)));
    const conQ = (L) => { const qq = st.q.trim().toLowerCase(); return !qq ? L : L.filter((x) => [x.cliente, x.vendedor, x.tipo, x.detalle, x.clienteId].join(' ').toLowerCase().includes(qq)); };
    const conG = (L) => (st.grav === 'todas' ? L : L.filter((x) => x.grav === st.grav));

    // 2) categorías con conteo
    const B = conQ(conG(base));
    const tabs = el('div', 'hc-tabs'); tabs.setAttribute('role', 'tablist');
    const mkTab = (k, t, ic, n, urg) => { const b = el('button', 'hc-tab'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(st.cat === k)); if (ic) b.append(svg(ic)); b.append(el('span', null, t), el('b', null, n0(n))); if (urg) b.append(el('i', 'hc-urg', urg + ' urg.')); b.addEventListener('click', () => { st.cat = k; st.tipo = null; st.n = 30; go(); }); tabs.append(b); };
    mkTab('todo', 'Todo', null, B.length, B.filter((x) => x.grav === 'alta').length);
    CATS.forEach(([k, t, ic]) => { const L = B.filter((x) => x.cat === k); if (L.length || st.cat === k) mkTab(k, t, ic, L.length, L.filter((x) => x.grav === 'alta').length); });
    cont.append(tabs);

    let L = st.cat === 'todo' ? B : B.filter((x) => x.cat === st.cat);
    // 3) tipos de la categoría
    const tipos = new Map(); L.forEach((x) => tipos.set(x.tipo, (tipos.get(x.tipo) || 0) + 1));
    if (tipos.size > 1) { const g = el('div', 'hc-tipos'); [[null, 'Todos los tipos', L.length]].concat([...tipos.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, k, n])).forEach(([k, t, n]) => { const b = el('button', 'envf-chip', t + ' (' + n + ')'); b.type = 'button'; b.setAttribute('aria-pressed', String(st.tipo === k)); b.addEventListener('click', () => { st.tipo = k; st.n = 30; go(); }); g.append(b); }); cont.append(g); }
    if (st.tipo) L = L.filter((x) => x.tipo === st.tipo);

    // 4) resumen
    const tiles = el('div', 'pr-tiles'); const t = (k, v, s, cls) => { const d = el('div', 'ht' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    const urg = L.filter((x) => x.grav === 'alta').length; const monto = L.reduce((a, x) => a + (x.monto || 0), 0);
    t('Hallazgos', n0(L.length), window.CPN_FILTRO ? window.CPN_FILTRO.etiqueta(st) : ''); t('Urgentes', n0(urg), urg ? 'atender primero' : 'ninguno', urg ? 'bad' : '');
    if (monto) t('Monto en juego', $(monto), 'suma de los tickets');
    const pr = new Map(); L.forEach((x) => { if (x.ruta) pr.set(x.ruta, (pr.get(x.ruta) || 0) + 1); });
    const top = [...pr.entries()].sort((a, b) => b[1] - a[1])[0]; if (top) t('Ruta con más', 'Ruta ' + top[0], top[1] + ' hallazgos');
    cont.append(tiles);
    if (pr.size > 1 && st.ruta == null) { const g = el('div', 'hc-rutas'); [...pr.entries()].sort((a, b) => b[1] - a[1]).forEach(([r, n]) => { const u = L.filter((x) => x.ruta === r && x.grav === 'alta').length; const b = el('button', 'hc-ruta'); b.type = 'button'; b.append(el('b', null, 'R' + r), el('span', null, n + (u ? ' · ' + u + ' urg.' : ''))); b.addEventListener('click', () => { st.ruta = r; st.n = 30; go(); }); g.append(b); }); cont.append(g); }

    // 5) lista
    L = L.slice().sort((a, b) => st.orden === 'monto' ? (b.monto || 0) - (a.monto || 0) : st.orden === 'grav' ? (ORD[a.grav] - ORD[b.grav]) || String(b.fecha).localeCompare(String(a.fecha)) : String(b.fecha || '').localeCompare(String(a.fecha || '')) || String(b.hora || '').localeCompare(String(a.hora || '')) || ORD[a.grav] - ORD[b.grav]);
    const lista = el('div', 'hc-lista'); let dia0 = null;
    L.slice(0, st.n).forEach((x) => {
      if (st.orden === 'rec' && x.fecha !== dia0) { dia0 = x.fecha; lista.append(el('h4', 'hc-dia', fd(x.fecha))); }
      const c = el('article', 'hc-card ' + (GRAV[x.grav] || ['', ''])[1]);
      const cab = el('div', 'hc-cab'); const [g, cls] = GRAV[x.grav] || ['', ''];
      cab.append(el('span', 'pill ' + cls, g), el('span', 'hc-tipo', x.tipo)); if (x.ruta) cab.append(el('span', 'pill', 'Ruta ' + x.ruta));
      if (x.monto) cab.append(el('span', 'hc-monto', $(x.monto)));
      c.append(cab, el('h4', 'hc-tit', x.cliente || x.tipo));
      const meta = [st.orden !== 'rec' ? fd(x.fecha) : '', x.hora, x.vendedor, x.extra].filter(Boolean).join(' · '); if (meta) c.append(el('p', 'hc-meta', meta));
      if (x.detalle) c.append(el('p', 'hc-det', x.detalle));
      if (x.accion) { const a = el('p', 'hc-acc'); a.append(el('b', null, 'Qué hacer: '), document.createTextNode(x.accion)); c.append(a); }
      const acc = el('div', 'hc-btns');
      if (x.clienteId && o.ficha) { const b = el('button', 'pill', 'Ver ficha del cliente'); b.type = 'button'; b.addEventListener('click', () => o.ficha(x.clienteId)); acc.append(b); }
      if (x.lat && x.lng) { const a = el('a', 'pill', 'Ver en el mapa'); a.href = 'https://maps.google.com/?q=' + x.lat + ',' + x.lng; a.target = '_blank'; a.rel = 'noopener'; acc.append(a); }
      (x.imgs || []).slice(0, 3).forEach((src) => { if (!/^data:image\//.test(src)) return; const im = el('img', 'hc-foto'); im.src = src; im.alt = 'Foto de la cámara'; im.loading = 'lazy'; im.addEventListener('click', () => { const w = window.open(''); if (w) w.document.write('<img src="' + src + '" style="max-width:100%">'); }); acc.append(im); });
      if (acc.children.length) c.append(acc);
      lista.append(c);
    });
    if (!L.length) lista.append(el('p', 'note', 'Nada con estos filtros.'));
    cont.append(lista);
    if (L.length > st.n) { const m = el('button', 'pill hc-mas', 'Ver ' + Math.min(30, L.length - st.n) + ' más (quedan ' + (L.length - st.n) + ')'); m.type = 'button'; m.addEventListener('click', () => { st.n += 30; go(); }); cont.append(m); }
    q.addEventListener('input', () => { st.q = q.value; st.n = 30; clearTimeout(cont._t); cont._t = setTimeout(() => { go(); const nq = cont.querySelector('.hc-q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 250); });
  }

  window.CPN_HAL = { centro, dePersona, deAdmin, catDe };
  if (window.dash && window.dash.draw) {
    const g = (k) => { const d = window.dash.data(k); return d && d.status === 'ok' ? d.data : []; };
    window.dash.draw('hallazgosResumen', (e) => centro(e, deAdmin(g), { ficha: window.CPN_CLIDET ? (id) => window.CPN_CLIDET.abrir(id) : null }));
    window.dash.draw('hallazgosLista', (e) => e.replaceChildren());
    window.dash.draw('hallazgosGps', (e) => e.replaceChildren());
  }
})();
