/* Tickets (Willy, 24-nov-2026): cada ticket de Power Sales, por ruta, por cliente, por día, semana y mes.
   Lo ven el admin (Ventas › Tickets), Monse y Bere. Datos: tickets.json
   {t ticket, f fecha, r ruta, c cliente, n negocio, p propietario, v vendedor, h llegada, s salida, m $, cj cajas, hl, g GPS, d tickets ese día, l líneas}
   window.CPN_TK.render(cont, tickets, { ficha }) */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const $ = (v) => '$' + n0(v);
  const fd = (s) => new Date(s + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const cliTxt = (t) => '#' + t.c + ' · ' + tit(t.n) + (t.p && tit(t.p) !== tit(t.n) ? ' · ' + tit(t.p) : '');
  const GPS_OK = { Confirmada: ['✓ camión ahí', 'ok'], Cerca: ['camión cerca', 'ok'], 'Camión pasó a otra hora': ['camión a otra hora', 'warn'], 'Camión nunca pasó': ['camión nunca pasó', 'bad'], 'Camión en la bodega': ['en la bodega', 'bad'] };

  function render(cont, T, o) {
    o = o || {};
    cont.replaceChildren();
    if (!T || !T.length) { cont.append(el('p', 'note', 'Todavía no hay tickets del mes.')); return; }
    const st = cont._tk || (cont._tk = { per: 'mes', vista: 'ticket', q: '', n: 50, abierto: null, solo2: false });
    const go = () => render(cont, T, o);
    const fil = el('div', 'hc-fil');
    if (window.CPN_FILTRO) fil.append(window.CPN_FILTRO.barra(st, { fechas: T.map((t) => t.f), rutas: T.map((t) => t.r), onChange: () => { st.n = 50; go(); } }));
    const fila = el('div', 'vc-bar');
    const seg = (lista, actual, on) => { const g = el('div', 'cr-seg'); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); st.n = 50; go(); }); g.append(b); }); return g; };
    fila.append(seg([['ticket', 'Por ticket'], ['cliente', 'Por cliente'], ['dia', 'Por día'], ['ruta', 'Por ruta']], st.vista, (v) => { st.vista = v; }));
    const d2 = el('button', 'envf-chip', 'Solo clientes con 2+ tickets el mismo día'); d2.type = 'button'; d2.setAttribute('aria-pressed', String(st.solo2)); d2.addEventListener('click', () => { st.solo2 = !st.solo2; go(); }); fila.append(d2);
    const q = el('input', 'vc-q hc-q'); q.type = 'search'; q.placeholder = 'Buscar ticket, cliente, número, propietario o vendedor'; q.value = st.q;
    fil.append(fila, q); cont.append(fil);

    const qq = st.q.trim().toLowerCase();
    const F = T.filter((t) => (!window.CPN_FILTRO || window.CPN_FILTRO.pasa(st, t.f, t.r)) && (!st.solo2 || t.d > 1) && (!qq || [t.t, t.c, t.n, t.p, t.v].join(' ').toLowerCase().includes(qq)));
    const S = F.reduce((a, t) => { a.m += t.m; a.cj += t.cj; a.hl += t.hl; return a; }, { m: 0, cj: 0, hl: 0 });
    const tiles = el('div', 'pr-tiles'); const tl = (k, v, s, cls) => { const d = el('div', 'ht' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    tl('Tickets', n0(F.length), window.CPN_FILTRO ? window.CPN_FILTRO.etiqueta(st) : ''); tl('Venta', $(S.m), n0(S.cj) + ' cajas · ' + n1(S.hl) + ' Hl');
    tl('Ticket promedio', $(F.length ? S.m / F.length : 0), n1(F.length ? S.cj / F.length : 0) + ' cajas por ticket'); tl('Clientes', n0(new Set(F.map((t) => t.c)).size));
    const dup = F.filter((t) => t.d > 1).length; if (dup) tl('Con 2+ tickets el mismo día', n0(dup), 'revisar si es duplicado', 'warn');
    const sinCam = F.filter((t) => t.g === 'Camión nunca pasó' || t.g === 'Camión en la bodega').length; if (sinCam) tl('Sin camión en el lugar', n0(sinCam), 'según Motum', 'bad');
    cont.append(tiles);

    const tabla = (cols, filas, onRow) => { const tb = el('table', 'cpn-t'); const h = el('tr'); cols.forEach(([t, c]) => h.append(el('th', c || null, t))); tb.append(el('thead')); tb.tHead.append(h); const b = el('tbody'); filas.forEach((r) => b.append(r)); tb.append(b); const w = el('div', 'tblwrap'); w.append(tb); return w; };
    const mas = (total) => { if (total > st.n) { const m = el('button', 'pill hc-mas', 'Ver más (quedan ' + (total - st.n) + ')'); m.type = 'button'; m.addEventListener('click', () => { st.n += 50; go(); }); cont.append(m); } };

    if (st.vista === 'ticket') {
      const L = F.slice().sort((a, b) => (b.f + (b.h || '')).localeCompare(a.f + (a.h || '')) || b.m - a.m);
      const filas = [];
      L.slice(0, st.n).forEach((t) => {
        const tr = el('tr', 'tk-row'); tr.tabIndex = 0;
        const gp = GPS_OK[t.g]; const gcell = el('td'); if (gp) gcell.append(el('span', 'pill ' + gp[1], gp[0])); else gcell.textContent = t.g ? t.g : '—';
        const cc = el('td', 'vc-nom'); cc.append(document.createTextNode(cliTxt(t))); if (t.d > 1) cc.append(el('span', 'pill warn tk-dup', t.d + ' tickets ese día'));
        tr.append(el('td', null, t.t), el('td', null, fd(t.f) + (t.h ? ' · ' + t.h : '')), el('td', null, 'R' + t.r), cc, el('td', 'num', n0(t.cj)), el('td', 'num', $(t.m)), gcell);
        tr.addEventListener('click', () => { st.abierto = st.abierto === t.t ? null : t.t; go(); }); filas.push(tr);
        if (st.abierto === t.t) {
          const dr = el('tr', 'tk-det'); const td = el('td'); td.colSpan = 7;
          const box = el('div', 'tk-box'); box.append(el('p', 'hc-meta', 'Vendedor: ' + (t.v || '—') + (t.h ? ' · llegó ' + t.h + (t.s ? ', salió ' + t.s : '') : '') + ' · ' + n1(t.hl) + ' Hl'));
          const ul = el('ul', 'tk-lin'); t.l.forEach((x) => { const li = el('li'); li.append(el('span', null, tit(x[0])), el('b', null, n0(x[1]) + ' · ' + $(x[2]))); ul.append(li); }); box.append(ul);
          if (o.ficha) { const b = el('button', 'pill', 'Ver ficha del cliente'); b.type = 'button'; b.addEventListener('click', (ev) => { ev.stopPropagation(); o.ficha(t.c); }); box.append(b); }
          td.append(box); dr.append(td); filas.push(dr);
        }
      });
      cont.append(tabla([['Ticket'], ['Fecha y hora'], ['Ruta'], ['Cliente'], ['Cajas', 'num'], ['Monto', 'num'], ['Camión (Motum)']], filas)); mas(L.length);
    } else if (st.vista === 'cliente') {
      const M = new Map(); F.forEach((t) => { const x = M.get(t.c) || { t0: t, n: 0, m: 0, cj: 0, dias: new Set(), ult: '' }; x.n++; x.m += t.m; x.cj += t.cj; x.dias.add(t.f); if (t.f > x.ult) x.ult = t.f; M.set(t.c, x); });
      const L = [...M.values()].sort((a, b) => b.m - a.m);
      const filas = L.slice(0, st.n).map((x) => { const tr = el('tr', 'tk-row'); const cc = el('td', 'vc-nom', cliTxt(x.t0)); tr.append(cc, el('td', null, 'R' + x.t0.r), el('td', 'num', n0(x.n)), el('td', 'num', n0(x.dias.size)), el('td', 'num', n0(x.cj)), el('td', 'num', $(x.m)), el('td', 'num', $(x.m / x.n)), el('td', null, fd(x.ult)));
        tr.addEventListener('click', () => { st.q = String(x.t0.c); st.vista = 'ticket'; go(); }); return tr; });
      cont.append(el('p', 'note', 'Pícale a un cliente para ver sus tickets.'), tabla([['Cliente'], ['Ruta'], ['Tickets', 'num'], ['Días', 'num'], ['Cajas', 'num'], ['Monto', 'num'], ['Promedio', 'num'], ['Último']], filas)); mas(L.length);
    } else if (st.vista === 'dia') {
      const M = new Map(); F.forEach((t) => { const x = M.get(t.f) || { n: 0, m: 0, cj: 0, cl: new Set() }; x.n++; x.m += t.m; x.cj += t.cj; x.cl.add(t.c); M.set(t.f, x); });
      const L = [...M.entries()].sort((a, b) => b[0].localeCompare(a[0]));
      const filas = L.map(([f, x]) => { const tr = el('tr', 'tk-row'); tr.append(el('td', null, fd(f)), el('td', 'num', n0(x.n)), el('td', 'num', n0(x.cl.size)), el('td', 'num', n0(x.cj)), el('td', 'num', $(x.m)), el('td', 'num', $(x.m / x.n)));
        tr.addEventListener('click', () => { st.per = 'dia'; st.dia = f; st.vista = 'ticket'; go(); }); return tr; });
      cont.append(el('p', 'note', 'Pícale a un día para ver sus tickets.'), tabla([['Día'], ['Tickets', 'num'], ['Clientes', 'num'], ['Cajas', 'num'], ['Monto', 'num'], ['Promedio', 'num']], filas));
    } else {
      const M = new Map(); F.forEach((t) => { const x = M.get(t.r) || { n: 0, m: 0, cj: 0, cl: new Set(), v: t.v }; x.n++; x.m += t.m; x.cj += t.cj; x.cl.add(t.c); M.set(t.r, x); });
      const g = el('div', 'vc-rutas');
      [...M.entries()].sort((a, b) => b[1].m - a[1].m).forEach(([r, x]) => { const b = el('button', 'vc-ruta'); b.type = 'button'; b.append(el('b', null, 'Ruta ' + r + ' · ' + (x.v || '')), el('strong', null, $(x.m)), el('small', null, n0(x.n) + ' tickets · ' + x.cl.size + ' clientes · promedio ' + $(x.m / x.n))); b.addEventListener('click', () => { st.ruta = r; st.vista = 'ticket'; go(); }); g.append(b); });
      cont.append(el('p', 'note', 'Pícale a una ruta para ver sus tickets.'), g);
    }
    q.addEventListener('input', () => { st.q = q.value; st.n = 50; clearTimeout(cont._t); cont._t = setTimeout(() => { go(); const nq = cont.querySelector('.hc-q'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 250); });
  }

  window.CPN_TK = { render };
  if (window.dash && window.dash.draw) {
    window.dash.draw('ticketsCentro', (e) => { const d = window.dash.data('tickets'); render(e, d && d.status === 'ok' ? d.data : [], { ficha: window.CPN_CLIDET ? (id) => window.CPN_CLIDET.abrir(id) : null }); });
  }
})();
