/* Ventas por cliente (Willy, 24-nov-2026): cuánto le ha comprado cada cliente a cada ruta, en pesos, cajas y Hl,
   filtrando por día, semana o mes y por ruta. Lo ven el admin, Rubí, Monse, Bere, Joselin, Dalia y cada vendedor (su ruta).
   Datos: clientes_mes_det [id, fecha, producto, cajas, hl, $] y clientes_mes (nombre, propietario, ruta).
   window.CPN_VCLI.render(cont, { det, clientes, ficha }) */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const $ = (v) => '$' + n0(v);
  const fd = (s) => { const d = new Date(s + 'T12:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const lunes = (s) => { const d = new Date(s + 'T12:00'); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());

  function render(cont, o) {
    cont.replaceChildren();
    const DET = (o.det || []).filter((r) => r && r[1]);
    if (!DET.length) { cont.append(el('p', 'note', 'Todavía no hay ventas del mes.')); return; }
    const CL = new Map((o.clientes || []).map((c) => [String(c.id), c]));
    const st = cont._vc || (cont._vc = { per: 'mes', dia: null, sem: null, ruta: null, q: '', todos: false });
    const fechas = [...new Set(DET.map((r) => r[1]))].sort();
    const semanas = [...new Set(fechas.map(lunes))].sort();
    if (!st.dia || !fechas.includes(st.dia)) st.dia = fechas[fechas.length - 1];
    if (!st.sem || !semanas.includes(st.sem)) st.sem = semanas[semanas.length - 1];
    const rutaDe = (id) => { const c = CL.get(String(id)); return c ? Number(c.rutaNum) || null : null; };
    const rutas = [...new Set(DET.map((r) => rutaDe(r[0])).filter(Boolean))].sort((a, b) => a - b);
    const go = () => render(cont, o);

    // ---- filtros ----
    const bar = el('div', 'vc-bar');
    const seg = (lista, actual, on) => { const g = el('div', 'cr-seg'); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); st.todos = false; go(); }); g.append(b); }); return g; };
    bar.append(seg([['dia', 'Día'], ['sem', 'Semana'], ['mes', 'Mes']], st.per, (v) => { st.per = v; }));
    if (st.per === 'dia') { const s = el('select', 'vc-sel'); fechas.slice().reverse().forEach((f) => { const op = el('option', null, fd(f)); op.value = f; if (f === st.dia) op.selected = true; s.append(op); }); s.addEventListener('change', () => { st.dia = s.value; go(); }); bar.append(s); }
    if (st.per === 'sem') { const s = el('select', 'vc-sel'); semanas.slice().reverse().forEach((f) => { const fin = new Date(f + 'T12:00'); fin.setDate(fin.getDate() + 5); const op = el('option', null, 'Semana del ' + fd(f) + ' al ' + fd(fin.toISOString().slice(0, 10))); op.value = f; if (f === st.sem) op.selected = true; s.append(op); }); s.addEventListener('change', () => { st.sem = s.value; go(); }); bar.append(s); }
    if (rutas.length > 1) bar.append(seg([[null, 'Todas']].concat(rutas.map((r) => [r, 'R' + r])), st.ruta, (v) => { st.ruta = v; }));
    cont.append(bar);

    const F = DET.filter((r) => (st.per === 'mes' || (st.per === 'dia' ? r[1] === st.dia : lunes(r[1]) === st.sem)) && (!st.ruta || rutaDe(r[0]) === st.ruta));
    const sum = (L) => L.reduce((a, r) => { a.v += r[5] || 0; a.c += r[3] || 0; a.h += r[4] || 0; return a; }, { v: 0, c: 0, h: 0 });
    const T = sum(F);
    const porCli = new Map(); F.forEach((r) => { const k = String(r[0]); const x = porCli.get(k) || { id: k, v: 0, c: 0, h: 0, dias: new Set(), ult: '' }; x.v += r[5] || 0; x.c += r[3] || 0; x.h += r[4] || 0; x.dias.add(r[1]); if (r[1] > x.ult) x.ult = r[1]; porCli.set(k, x); });

    const tiles = el('div', 'pr-tiles'); const t = (k, v, s) => { const d = el('div', 'ht'); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    const lbl = st.per === 'dia' ? fd(st.dia) : st.per === 'sem' ? 'semana del ' + fd(st.sem) : 'mes al ' + fd(fechas[fechas.length - 1]);
    t('Venta', $(T.v), lbl); t('Cajas', n0(T.c), n1(T.h) + ' Hl'); t('Clientes que compraron', n0(porCli.size), 'ticket promedio ' + $(porCli.size ? T.v / [...porCli.values()].reduce((a, x) => a + x.dias.size, 0) : 0));
    cont.append(tiles);

    // ---- por ruta ----
    if (!st.ruta && rutas.length > 1) {
      const pr = new Map(); F.forEach((r) => { const k = rutaDe(r[0]); const x = pr.get(k) || { v: 0, c: 0, h: 0, cl: new Set() }; x.v += r[5] || 0; x.c += r[3] || 0; x.h += r[4] || 0; x.cl.add(r[0]); pr.set(k, x); });
      const g = el('div', 'vc-rutas');
      [...pr.entries()].sort((a, b) => b[1].v - a[1].v).forEach(([k, x]) => { const b = el('button', 'vc-ruta'); b.type = 'button'; b.append(el('b', null, 'Ruta ' + k), el('strong', null, $(x.v)), el('small', null, n0(x.c) + ' cajas · ' + n1(x.h) + ' Hl · ' + x.cl.size + ' clientes')); b.addEventListener('click', () => { st.ruta = k; go(); }); g.append(b); });
      cont.append(g);
    }

    // ---- clientes ----
    const q = el('input', 'vc-q'); q.type = 'search'; q.placeholder = 'Buscar cliente por número, negocio o propietario'; q.value = st.q;
    const lista = el('div', 'vc-lista');
    const pinta = () => {
      lista.replaceChildren(); const qq = st.q.trim().toLowerCase();
      let L = [...porCli.values()].map((x) => { const c = CL.get(x.id) || {}; return Object.assign(x, { neg: c.cliente || '', prop: c.prop || '', ruta: Number(c.rutaNum) || '' }); })
        .filter((x) => !qq || (x.id + ' ' + x.neg + ' ' + x.prop).toLowerCase().includes(qq)).sort((a, b) => b.v - a.v);
      const tot = L.length; if (!st.todos) L = L.slice(0, 80);
      const tb = el('table', 'cpn-t vc-t'); const h = el('tr'); ['Cliente', 'Ruta', 'Venta', 'Cajas', 'Hl', 'Días que compró', 'Última'].forEach((x, i) => h.append(el('th', i > 1 ? 'num' : null, x))); tb.append(el('thead')); tb.tHead.append(h);
      const bd = el('tbody');
      L.forEach((x) => { const tr = el('tr'); const nm = '#' + x.id + ' · ' + tit(x.neg) + (x.prop && tit(x.prop) !== tit(x.neg) ? ' · ' + tit(x.prop) : '');
        const c0 = el('td', 'vc-nom'); if (o.ficha) { const a = el('button', 'vc-link', nm); a.type = 'button'; a.addEventListener('click', () => o.ficha(x.id)); c0.append(a); } else c0.textContent = nm;
        tr.append(c0, el('td', null, x.ruta ? 'R' + x.ruta : ''), el('td', 'num', $(x.v)), el('td', 'num', n0(x.c)), el('td', 'num', n1(x.h)), el('td', 'num', String(x.dias.size)), el('td', 'num', fd(x.ult))); bd.append(tr); });
      tb.append(bd); const w = el('div', 'tblwrap'); w.append(tb); lista.append(el('p', 'note', tot + ' clientes, de mayor a menor venta.'), w);
      if (tot > L.length) { const m = el('button', 'pill', 'Ver los ' + tot); m.type = 'button'; m.addEventListener('click', () => { st.todos = true; pinta(); }); lista.append(m); }
    };
    q.addEventListener('input', () => { st.q = q.value; pinta(); });
    cont.append(q, lista); pinta();
  }

  window.CPN_VCLI = { render };
  if (window.dash && window.dash.draw) {
    window.dash.draw('ventasCli', (e) => { const g = (k) => { const d = window.dash.data(k); return d && d.status === 'ok' ? d.data : []; };
      render(e, { det: g('clientes_mes_det'), clientes: g('clientes_mes'), ficha: window.CPN_CLIDET ? (id) => window.CPN_CLIDET.abrir(id) : null }); });
  }
})();
