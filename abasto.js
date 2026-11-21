/* Abasto: S+1 fija (lo que se pronosticó, ya no se cambia) y pronóstico sugerido S+2 en tarimas completas por SKU. */
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
    t('S+1 (semana del ' + dm(r.S1) + ')', F.int(r.tarimasProgS1) + ' tarimas', 'fija, ya no se cambia' + (r.fuenteS1 === 'pronóstico' ? ' (lo pronosticado; falta la hoja de programación)' : ''), '');
    if (r.tarimasMetaS2 != null) t('Pronóstico S+2 por meta (semana del ' + dm(r.S2) + ')', F.int(r.tarimasMetaS2) + ' tarimas', F.int(r.hlMetaS2) + ' Hl = ' + r.viajesMetaS2 + ' viajes completos (' + (r.viajes18 || 0) + ' de 18 y ' + (r.viajes16 || 0) + ' de 16 tarimas) · meta ' + F.int(r.metaSemanaHl) + ' Hl por semana', 'ok');
    t('Solo por días de inventario', F.int(r.tarimasSugS2) + ' tarimas', 'lo mínimo para cerrar la S+2 con ' + r.objetivo + ' días · pronosticadas ' + F.int(r.tarimasPronS2), '');
    e.append(tiles);
    e.append(el('p', 'note', 'Inventario al ' + dm(r.fecha) + ' (almacén + camiones), venta promedio de ' + r.diasVenta + ' días de noviembre. Colchón al cierre de la semana: 3 días en lo que llega casi diario (XX cuarto, caguama) y ' + r.objetivo + ' días en lo demás. Solo tarimas completas.'));
  });
  dash.draw('abaTabla', (e) => {
    e.replaceChildren();
    const A = rows('abasto_sku'); if (!A.length) return;
    const L = A.filter((x) => st.todos || x.nota || x.sugS2 || x.metaS2).sort((a, b) => (b.metaS2Hl || 0) - (a.metaS2Hl || 0));
    const seg = el('div', 'seg seg-sm');
    [[false, 'Lo que va primero en S+2'], [true, 'Todos los SKU']].forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.todos === v)); b.addEventListener('click', () => { st.todos = v; dash.draw('abaTabla'); }); seg.append(b); });
    e.append(seg);
    const ul = el('ol', 'acciones hal-lista');
    L.forEach((x) => {
      const li = el('li'); const izq = el('div', 'hal-izq');
      const urge = /prioridad/.test(x.nota || ''); const falta = /le faltan/.test(x.nota || ''); const raro = /no se ha vendido/i.test(x.nota || '');
      izq.append(el('span', 'pill ' + (urge ? 'bad' : falta ? 'warn' : raro ? 'warn' : 'ok'), urge ? 'Prioridad' : falta ? 'Va primero' : raro ? 'Revisar' : 'Bien'));
      const c = el('div', 'hal-cuerpo');
      c.append(el('b', null, x.producto + ' (' + x.clave + ')'));
      c.append(el('span', null, 'S+1 (fija): ' + F.int(x.progS1) + ' tarimas, cierra la semana con ' + (x.diasFinS1 == null ? '—' : F.int(Math.max(0, x.diasFinS1))) + ' días · S+2: pronosticado ' + F.int(x.pronS2) + ' → sugerido ' + F.int(x.sugS2)));
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

  // Pronóstico S+2 editable (Willy, 20-nov-2026)
  dash.draw('pronEditable', (host) => {
    const d = dash.data('pron_rubi'); const P = d && d.status === 'ok' && d.data && d.data.length ? d.data[0] : null;
    if (!window.CPN_PRON) return; if (host._pron === P) return; host._pron = P; window.CPN_PRON.render(host, P, {});
  });

  // Pronósticos que Rubí confirmó desde su página (Willy, 20-nov-2026): se leen del Excel que ella guarda
  const elx = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const nf1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const cuando = (s) => (s ? new Date(s).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  let libX = null;
  const xlsx = () => { if (window.XLSX && window.XLSX.read) return Promise.resolve(window.XLSX); if (!libX) libX = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'xlsx-style.min.js'; s.onload = () => ok(window.XLSX); s.onerror = () => mal(new Error('no se pudo cargar el lector de Excel')); document.head.append(s); }); return libX; };
  function leerPron(X, b64) {
    const wb = X.read(b64, { type: 'base64' });
    let nom = wb.SheetNames.find((n) => { const c = wb.Sheets[n].B1; return c && /PRON[OÓ]STICO S\+2/i.test(String(c.v)); });
    if (!nom) nom = wb.SheetNames.filter((n) => /^SEMANA DEL/i.test(n)).pop();
    if (!nom) return null;
    const ws = wb.Sheets[nom]; const v = (r) => (ws[r] ? ws[r].v : null);
    const viajes = []; const sku = new Map();
    for (let k = 0; k < 10; k++) {
      const h = 27 + 13 * k; const lin = [];
      for (let r = h + 1; r <= h + 12; r++) {
        const s = v('B' + r); const hl = Number(v('D' + r)) || 0; if (!s || typeof s !== 'number' || hl <= 0) continue;
        const t = Number(v('G' + r)) || 0; const cj = Number(v('I' + r)) || 0; const co = Number(v('J' + r)) || 0; const d = String(v('C' + r) || '').replace(/^\d+-/, '');
        lin.push({ sku: s, desc: d, hl, t, cj });
        const a = sku.get(s) || { sku: s, desc: d, hl: 0, t: 0, cj: 0, co: 0 }; a.hl += hl; a.t += t; a.cj += cj; a.co += co; sku.set(s, a);
      }
      if (lin.length) viajes.push(lin);
    }
    const S = [...sku.values()].sort((a, b) => b.hl - a.hl);
    const tot = S.reduce((a, x) => ({ hl: a.hl + x.hl, t: a.t + x.t, cj: a.cj + x.cj, co: a.co + x.co }), { hl: 0, t: 0, cj: 0, co: 0 });
    const inv = wb.Sheets['INVENTARIO Y DIAS']; const m = inv && inv.A1 && String(inv.A1.v).match(/objetivo (\d+)/);
    return { hoja: nom.replace(/\s*·.*$/, ''), viajes, S, tot, dias: m ? +m[1] : null };
  }
  dash.draw('pronConfirmados', async (host) => {
    if (host._cargando || host._listo) return;
    const clave = window.CPN && window.CPN.sbAdmin; if (!clave || !window.cpnRpc) { host.textContent = 'La conexión con las páginas llega con la actualización de la noche.'; return; }
    host._cargando = true; host.replaceChildren(elx('p', 'note', 'Cargando los pronósticos que confirmó Rubí…'));
    try {
      const L = (await window.cpnRpc('mis_inventarios', { p_clave: clave })).filter((x) => x.almacen === 'Pronóstico S+2').slice(0, 12);
      const X = await xlsx(); const filas = [];
      for (const x of L) {
        let d = null, f = null;
        try { f = await window.cpnRpc('admin_inventario', { p_clave: clave, p_id: x.id }); if (/\.xls/i.test(f.nombre || x.nombre)) d = leerPron(X, f.contenido); } catch (e) { d = null; }
        filas.push({ x, f, d });
      }
      host.replaceChildren();
      if (!filas.length) { host.append(elx('p', 'note', 'Rubí todavía no ha confirmado ningún pronóstico desde su página.')); host._listo = true; return; }
      const t = elx('table', 'cpn-t'); const hr = elx('tr');
      ['Semana', 'Confirmado', 'Hl', 'Tarimas', 'Viajes', 'Días objetivo', ''].forEach((h, i) => hr.append(elx('th', i >= 2 && i <= 5 ? 'num' : null, h)));
      t.append(elx('thead')); t.tHead.append(hr); const b = elx('tbody'); const det = elx('div');
      filas.forEach(({ x, f, d }, i) => {
        const tr = elx('tr');
        tr.append(elx('td', null, d ? d.hoja : x.nombre), elx('td', null, cuando(x.subido_en)), elx('td', 'num', d ? nf1(d.tot.hl) : '—'), elx('td', 'num', d ? nf0(d.tot.t) : '—'), elx('td', 'num', d ? String(d.viajes.length) : '—'), elx('td', 'num', d && d.dias ? String(d.dias) : '—'));
        const td = elx('td'); td.style.whiteSpace = 'nowrap';
        if (d) { const bv = elx('button', 'pill', 'Ver'); bv.type = 'button'; bv.addEventListener('click', () => verDet(det, d, x)); td.append(bv, document.createTextNode(' ')); }
        const bd = elx('button', 'pill', 'Excel'); bd.type = 'button';
        bd.addEventListener('click', () => { const bin = atob(f.contenido); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u])); a.download = f.nombre || x.nombre; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); });
        if (f) td.append(bd);
        tr.append(td); b.append(tr);
        if (i === 0 && d) verDet(det, d, x);
      });
      t.append(b); const w = elx('div', 'tblwrap'); w.append(t); host.append(w, det);
      host._listo = true;
    } catch (e) { host.replaceChildren(elx('p', 'note', 'No se pudieron leer los pronósticos: ' + e.message)); }
    host._cargando = false;
  });
  function verDet(det, d, x) {
    det.replaceChildren();
    det.append(elx('h4', 'pr-h', d.hoja + ' · confirmado ' + cuando(x.subido_en)));
    const t = elx('table', 'cpn-t'); const hr = elx('tr'); ['SKU', 'Producto', 'Tarimas', 'Hl', 'Cajas', 'Costo'].forEach((h, i) => hr.append(elx('th', i > 1 ? 'num' : null, h)));
    t.append(elx('thead')); t.tHead.append(hr); const b = elx('tbody');
    d.S.forEach((s) => { const tr = elx('tr'); tr.append(elx('td', null, String(s.sku)), elx('td', null, s.desc), elx('td', 'num', nf0(s.t)), elx('td', 'num', nf1(s.hl)), elx('td', 'num', nf0(s.cj)), elx('td', 'num', '$' + nf0(s.co))); b.append(tr); });
    const tt = elx('tr'); tt.style.fontWeight = '700'; tt.append(elx('td'), elx('td', null, 'Totales'), elx('td', 'num', nf0(d.tot.t)), elx('td', 'num', nf1(d.tot.hl)), elx('td', 'num', nf0(d.tot.cj)), elx('td', 'num', '$' + nf0(d.tot.co))); b.append(tt);
    t.append(b); const w = elx('div', 'tblwrap'); w.append(t); det.append(w);
    const vv = elx('div', 'pr-viajes');
    d.viajes.forEach((lin, i) => { const c = elx('div', 'pr-viaje'); const tar = lin.reduce((a, l) => a + l.t, 0); const hl = lin.reduce((a, l) => a + l.hl, 0);
      const h = elx('div', 'pr-vcab'); h.append(elx('b', null, 'Viaje ' + (i + 1)), elx('span', 'pr-vtot ' + (tar === 16 || tar === 18 ? 'ok' : 'bad'), tar + ' tar · ' + nf1(hl) + ' Hl')); c.append(h);
      lin.forEach((l) => { const r = elx('div', 'pr-lin'); r.style.gridTemplateColumns = 'minmax(0,1fr) 40px 70px'; r.append(elx('span', null, l.desc), elx('b', 'num', String(l.t)), elx('span', 'pr-hl', nf1(l.hl) + ' Hl')); c.append(r); });
      vv.append(c); });
    det.append(vv);
  }
})();
