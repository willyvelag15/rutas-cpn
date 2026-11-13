/* Reportes Motum (alertas con fotos, paradas, ventas tras regresar), Inventario (conteo sorpresa) y Decisiones de hoy. */
(function () {
  const F = window.CPN.fmt;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const color = (r) => (window.CPN.routeColor && window.CPN.routeColor[r]) || '#6B7280';
  const CLS = { alta: 'bad', media: 'warn', baja: 'ok' };
  const st = { ruta: 'todas', grupo: 'todas', todas: false, par: false, reg: false, regRuta: 'todas', parRuta: 'todas' };
  const sti = { ruta: null };

  /* Ir a otra pantalla ya filtrada por ruta (desde Decisiones de hoy). Cada módulo escucha 'cpn-ir'. */
  window.CPN.ir = (vista, ruta, ancla) => {
    window.dispatchEvent(new CustomEvent('cpn-ir', { detail: { vista, ruta } }));
    const b = document.querySelector('[data-vista="' + vista + '"]'); if (b && window.CPN.vista !== vista) b.click();
    setTimeout(() => {
      const t = ancla && document.querySelector('[data-draw="' + ancla + '"]');
      const c = t ? (t.closest('.card') || t) : document.getElementById('v-' + vista);
      if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };
  window.addEventListener('cpn-ir', (ev) => {
    const r = ev.detail.ruta; if (!r) return;
    st.ruta = r; st.todas = false; st.regRuta = r; st.reg = false; st.parRuta = r; st.par = false; sti.ruta = r;
    ['motLista', 'motRegreso', 'motParadas', 'invDetalle'].forEach((n) => dash.draw(n));
  });
  const segRutas = (rutas, actual, fn) => {
    const seg = el('div', 'seg seg-sm');
    ['todas', ...rutas].forEach((r) => { const b = el('button', null, r === 'todas' ? 'Todas' : r); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === r)); b.addEventListener('click', () => fn(r)); seg.append(b); });
    return seg;
  };
  const ordRuta = (a, b) => (parseInt(a.slice(5)) || 99) - (parseInt(b.slice(5)) || 99);
  const mapa = (lat, lng) => { const a = el('a', 'mot-map', 'Ver en mapa'); a.href = 'https://www.google.com/maps?q=' + lat + ',' + lng; a.target = '_blank'; a.rel = 'noopener'; return a; };

  /* ---------- Decisiones de hoy (pantalla Hoy) ---------- */
  dash.draw('hoyDecisiones', (e) => {
    e.replaceChildren();
    const Dd = rows('decisiones'); if (!Dd.length) { e.append(el('p', 'note', 'Sin pendientes fuertes para hoy.')); return; }
    const ol = el('ol', 'acciones');
    Dd.slice(0, 6).forEach((d) => {
      const li = el('li'); const p = el('span', 'pill ' + (d.p >= 85 ? 'bad' : d.p >= 70 ? 'warn' : 'ok'), d.tag); if (d.tag.startsWith('Ruta')) p.style.color = color(d.tag);
      const c = el('div', 'hal-cuerpo'); c.append(el('span', null, d.txt)); if (d.accion) c.append(el('em', null, '→ ' + d.accion));
      if (d.periodo) c.append(el('small', null, d.periodo));
      li.append(p, c);
      if (d.ver) {
        li.classList.add('dec-link'); li.tabIndex = 0; li.setAttribute('role', 'button');
        li.append(el('span', 'dec-ver', 'Ver detalle ›'));
        const go = () => window.CPN.ir(d.ver, d.ruta, d.ancla);
        li.addEventListener('click', go); li.addEventListener('keydown', (k) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); go(); } });
      }
      ol.append(li);
    });
    e.append(ol);
  });

  /* ---------- Reportes Motum ---------- */
  dash.draw('motResumen', (e) => {
    e.replaceChildren();
    const R = rows('motum_resumen'); if (!R.length) { e.append(el('p', 'note', 'Todavía no hay alertas de Motum.')); return; }
    const fechas = [...new Set(R.map((x) => x.fecha))].sort(); const ult = fechas[fechas.length - 1];
    const d7 = new Date(ult + 'T12:00:00'); d7.setDate(d7.getDate() - 6); const desde = d7.toISOString().slice(0, 10);
    const sem = R.filter((x) => x.fecha >= desde && x.grupo !== 'Tiempo detenido');
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    const sum = (f) => sem.filter(f).reduce((a, x) => a + x.n, 0);
    const hoyA = R.filter((x) => x.fecha === ult && x.gravedad === 'alta').reduce((a, x) => a + x.n, 0);
    t('Alertas graves del ' + F.dia(ult), F.int(hoyA), 'celular, fatiga y seguridad del equipo', hoyA ? 'bad' : '');
    t('Celular / distracción (7 días)', F.int(sum((x) => x.grupo === 'Celular / distracción')), null, '');
    t('Manejo brusco (7 días)', F.int(sum((x) => x.grupo === 'Manejo brusco' || x.grupo === 'Exceso de velocidad')), 'vueltas, frenadas, velocidad', '');
    t('Sin cinturón (7 días)', F.int(sum((x) => x.grupo === 'Cinturón')), null, '');
    e.append(tiles);
    // tabla ruta x grupo (7 días)
    const grupos = [...new Set(sem.map((x) => x.grupo))];
    const rutas = [...new Set(sem.map((x) => x.ruta))].sort((a, b) => (parseInt(a.slice(5)) || 99) - (parseInt(b.slice(5)) || 99));
    if (rutas.length) {
      const tb = el('table', 'cpn-t'); const hr = el('tr'); hr.append(el('th', null, 'Últimos 7 días')); grupos.forEach((g) => hr.append(el('th', 'num', g))); tb.append(el('thead')); tb.tHead.append(hr);
      const body = el('tbody');
      rutas.forEach((r) => { const tr = el('tr'); const n = el('td', null, r); n.style.fontWeight = '600'; n.style.color = color(r); tr.append(n);
        grupos.forEach((g) => { const v = sem.filter((x) => x.ruta === r && x.grupo === g).reduce((a, x) => a + x.n, 0); const g0 = sem.find((x) => x.grupo === g); tr.append(el('td', 'num ' + (v && g0 && g0.gravedad === 'alta' ? 'bad' : ''), v ? F.int(v) : '—')); });
        body.append(tr); });
      tb.append(body); const w = el('div', 'tblwrap'); w.append(tb); e.append(w);
    }
  });

  dash.draw('motLista', (e) => {
    e.replaceChildren();
    const A = rows('motum_alertas'); if (!A.length) { e.append(el('p', 'note', 'Sin alertas con evidencia en los últimos 7 días.')); return; }
    const rutas = ['todas', ...new Set(A.map((x) => x.ruta))];
    const seg = el('div', 'seg seg-sm');
    rutas.forEach((r) => { const b = el('button', null, r === 'todas' ? 'Todas' : r); b.type = 'button'; b.setAttribute('aria-pressed', String(st.ruta === r)); b.addEventListener('click', () => { st.ruta = r; st.todas = false; dash.draw('motLista'); }); seg.append(b); });
    e.append(seg);
    const L = A.filter((x) => st.ruta === 'todas' || x.ruta === st.ruta);
    const n = st.todas ? L.length : Math.min(10, L.length);
    const ul = el('ol', 'acciones hal-lista');
    L.slice(0, n).forEach((a) => {
      const li = el('li'); const izq = el('div', 'hal-izq');
      izq.append(el('span', 'pill ' + CLS[a.gravedad], a.grupo)); const r = el('span', 'hal-r', a.ruta); r.style.color = color(a.ruta); izq.append(r);
      const c = el('div', 'hal-cuerpo');
      c.append(el('b', null, a.tipo.replace(/^DSC /, '')));
      c.append(el('small', null, F.dia(a.fecha) + ' · ' + a.hora + (a.velocidad != null ? ' · ' + a.velocidad + ' km/h' : '') + (a.calle ? ' · ' + a.calle : '')));
      if (a.imgs && a.imgs.length) { const f = el('div', 'mot-fotos'); a.imgs.forEach((src) => { const im = el('img'); im.src = src; im.alt = 'Foto de la cámara'; im.loading = 'lazy'; im.addEventListener('click', () => { const w = window.open(); if (w) { const i2 = w.document.createElement('img'); i2.src = src; i2.style.maxWidth = '100%'; w.document.body.append(i2); } }); f.append(im); }); c.append(f); }
      if (a.lat) c.append(mapa(a.lat, a.lng));
      li.append(izq, c); ul.append(li);
    });
    e.append(ul);
    if (L.length > n) { const m = el('button', 'hal-mas', 'Ver las ' + L.length + ' alertas'); m.type = 'button'; m.addEventListener('click', () => { st.todas = true; dash.draw('motLista'); }); e.append(m); }
  });

  dash.draw('motRegreso', (e) => {
    e.replaceChildren();
    const T0 = rows('tras_regreso'); if (!T0.length) { e.append(el('p', 'note', 'Ninguna venta registrada después de que el camión regresó.')); return; }
    const rutas = [...new Set(T0.map((x) => x.ruta))].sort(ordRuta);
    if (st.regRuta !== 'todas' && !rutas.includes(st.regRuta)) { e.append(segRutas(rutas, st.regRuta, (r) => { st.regRuta = r; st.reg = false; dash.draw('motRegreso'); })); e.append(el('p', 'note', st.regRuta + ' no tiene ventas después de regresar este mes.')); return; }
    e.append(segRutas(rutas, st.regRuta, (r) => { st.regRuta = r; st.reg = false; dash.draw('motRegreso'); }));
    const T = T0.filter((x) => st.regRuta === 'todas' || x.ruta === st.regRuta).sort((a, b) => (b.fecha + b.hora > a.fecha + a.hora ? 1 : -1));
    // resumen del mes y desglose por día
    const tot = T.reduce((a, x) => a + x.venta, 0); const cli = new Set(T.map((x) => x.clienteId));
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, sm) => { const d = el('div', 'hal-tile'); d.append(el('span', null, k), el('b', null, v)); if (sm) d.append(el('small', null, sm)); tiles.append(d); };
    const dset = [...new Set(T.map((x) => x.fecha))].sort();
    t('Ventas en el mes', F.int(T.length), st.regRuta === 'todas' ? 'todas las rutas' : st.regRuta); t('Monto', F.money(tot)); t('Clientes distintos', F.int(cli.size)); t('Días con casos', F.int(dset.length));
    e.append(tiles);
    const g = new Map(); T.forEach((x) => { const k = x.fecha + '|' + x.ruta; if (!g.has(k)) g.set(k, { fecha: x.fecha, ruta: x.ruta, n: 0, venta: 0, cli: [] }); const o = g.get(k); o.n++; o.venta += x.venta; if (!o.cli.includes(x.cliente)) o.cli.push(x.cliente); });
    const tb = el('table', 'cpn-t reg-dias'); const hr = el('tr'); [['Día', ''], ['Ruta', ''], ['Ventas', 'num'], ['Monto', 'num']].forEach(([h, c]) => hr.append(el('th', c, h))); tb.append(el('thead')); tb.tHead.append(hr);
    const body = el('tbody');
    [...g.values()].sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : ordRuta(a.ruta, b.ruta))).forEach((o) => { const tr = el('tr', 'reg-dia'); const r = el('td', null, o.ruta); r.style.color = color(o.ruta); r.style.fontWeight = '600';
      tr.append(el('td', null, F.dia(o.fecha)), r, el('td', 'num', F.int(o.n)), el('td', 'num', F.money(o.venta)));
      const tr2 = el('tr', 'reg-cli'); const c2 = el('td', null, 'Clientes: ' + o.cli.join(', ')); c2.colSpan = 4; tr2.append(c2); body.append(tr, tr2); });
    tb.append(body); const w = el('div', 'tblwrap'); w.append(tb); e.append(w);
    // lista venta por venta
    e.append(el('p', 'note', 'Venta por venta, de la más reciente a la más vieja:'));
    const ul = el('ol', 'acciones hal-lista'); const n = st.reg ? T.length : Math.min(8, T.length);
    T.slice(0, n).forEach((x) => { const li = el('li'); const izq = el('div', 'hal-izq'); const r = el('span', 'hal-r', x.ruta); r.style.color = color(x.ruta); izq.append(el('span', 'pill bad', 'Tras regresar'), r);
      const c = el('div', 'hal-cuerpo'); c.append(el('b', null, x.cliente + ' (' + x.clienteId + ') · ' + F.money(x.venta)));
      c.append(el('span', null, 'El camión llegó a la bodega a las ' + x.regreso + ' y la venta se registró a las ' + x.hora + (x.dCaptura != null && x.dCaptura < 150 ? ', con el teléfono en la bodega (' + x.dCaptura + ' m).' : '.')));
      c.append(el('small', null, F.dia(x.fecha) + ' · ' + x.vendedor)); li.append(izq, c); ul.append(li); });
    e.append(ul);
    if (T.length > n) { const m = el('button', 'hal-mas', 'Ver las ' + T.length); m.type = 'button'; m.addEventListener('click', () => { st.reg = true; dash.draw('motRegreso'); }); e.append(m); }
  });

  dash.draw('motParadas', (e) => {
    e.replaceChildren();
    const P0 = rows('paradas'); if (!P0.length) { e.append(el('p', 'note', 'Sin paradas largas fuera de clientes.')); return; }
    const rutasP = [...new Set(P0.map((x) => x.ruta))].sort(ordRuta);
    e.append(segRutas(rutasP, st.parRuta, (r) => { st.parRuta = r; st.par = false; dash.draw('motParadas'); }));
    const P = P0.filter((x) => st.parRuta === 'todas' || x.ruta === st.parRuta);
    if (!P.length) { e.append(el('p', 'note', st.parRuta + ' no tiene paradas largas sin cliente.')); return; }
    const ul = el('ol', 'acciones hal-lista'); const n = st.par ? P.length : Math.min(8, P.length);
    P.slice(0, n).forEach((p) => { const li = el('li'); const izq = el('div', 'hal-izq'); const r = el('span', 'hal-r', p.ruta); r.style.color = color(p.ruta); izq.append(el('span', 'pill ' + (p.minutos >= 30 ? 'bad' : 'warn'), p.minutos + ' min'), r);
      const c = el('div', 'hal-cuerpo'); c.append(el('b', null, F.dia(p.fecha) + ' · de ' + p.inicio + ' a ' + p.fin));
      c.append(el('span', null, 'No hay cliente ahí: el más cercano es ' + (p.clienteCerca || '—') + ' a ' + p.dCliente + ' m. ' + (p.visitasPS ? 'Power Sales registró ' + p.visitasPS + ' visita(s) en ese rato en otro lugar.' : 'No registró visitas en ese rato.')));
      c.append(mapa(p.lat, p.lng)); li.append(izq, c); ul.append(li); });
    e.append(ul);
    if (P.length > n) { const m = el('button', 'hal-mas', 'Ver las ' + P.length + ' paradas'); m.type = 'button'; m.addEventListener('click', () => { st.par = true; dash.draw('motParadas'); }); e.append(m); }
  });

  /* ---------- Inventario: conteo sorpresa ---------- */
  dash.draw('invResumen', (e) => {
    e.replaceChildren();
    const R = rows('inventario_ruta'); if (!R.length) return;
    const t = el('table', 'cpn-t'); const hr = el('tr');
    [['Ruta', ''], ['Debe traer (cajas)', 'num'], ['Último arqueo', ''], ['Arqueos en el mes', 'num'], ['Diferencias', 'num'], ['Estado', '']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr); const tb = el('tbody');
    R.forEach((x) => { const tr = el('tr'); tr.style.cursor = 'pointer'; const n = el('td', null, x.ruta); n.style.fontWeight = '600'; n.style.color = color(x.ruta);
      const s = el('td'); s.append(el('span', 'pill ' + (x.estado === 'Al día' ? 'ok' : x.estado === 'Arqueo viejo' ? 'warn' : 'bad'), x.estado));
      tr.append(n, el('td', 'num', x.cajasTeoricas ? F.int(x.cajasTeoricas) : '—'), el('td', null, x.ultimoArqueo ? F.dia(x.ultimoArqueo.slice(0, 10)) + ' ' + x.ultimoArqueo.slice(11, 16) : '—'), el('td', 'num', F.int(x.arqueosMes)), el('td', 'num', F.int(x.diferenciasArqueo)), s);
      tr.addEventListener('click', () => { sti.ruta = x.ruta; dash.draw('invDetalle'); }); tb.append(tr); });
    t.append(tb); e.append(t);
  });
  dash.draw('invDetalle', (e) => {
    e.replaceChildren();
    const I = rows('inventario'); if (!I.length) return;
    const rutas = [...new Set(I.map((x) => x.ruta))];
    const sinArq = sti.ruta && !rutas.includes(sti.ruta) ? sti.ruta : null;
    if (!sti.ruta || (!rutas.includes(sti.ruta) && !sinArq)) sti.ruta = rutas[0];
    const seg = el('div', 'seg seg-sm'); rutas.forEach((r) => { const b = el('button', null, r); b.type = 'button'; b.setAttribute('aria-pressed', String(sti.ruta === r)); b.addEventListener('click', () => { sti.ruta = r; dash.draw('invDetalle'); }); seg.append(b); }); e.append(seg);
    if (sinArq) { e.append(el('p', 'note', sinArq + ' no tiene ningún arqueo este mes, así que no hay lista de lo que debe traer. Hay que contar el camión completo y capturar el arqueo en Power Sales; a partir de ahí aparece aquí.')); return; }
    const L = I.filter((x) => x.ruta === sti.ruta && Math.abs(x.teorico) > 0.01).sort((a, b) => b.teorico - a.teorico);
    const t = el('table', 'cpn-t'); const hr = el('tr');
    [['Producto', ''], ['Debe traer', 'num'], ['Arqueo', 'num'], ['+ Cargas', 'num'], ['− Ventas', 'num'], ['− Devol.', 'num']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr); const tb = el('tbody');
    L.forEach((x) => { const tr = el('tr'); tr.append(el('td', 'wrap', x.producto), el('td', 'num' + (x.teorico < 0 ? ' bad' : ''), F.int(x.teorico)), el('td', 'num', F.int(x.arqueo)), el('td', 'num', F.int(x.cargas)), el('td', 'num', F.int(x.ventas)), el('td', 'num', F.int(x.devoluciones))); tb.append(tr); });
    t.append(tb); const w = el('div', 'tblwrap'); w.append(t); e.append(w);
  });

  const TIT = { motum: ['Reportes Motum', 'Alertas de cámara y del camión'], inventario: ['Inventario', 'Lo que debe traer cada camión'] };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const t = TIT[b.getAttribute('data-vista')]; if (!t) return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
  }));
})();
