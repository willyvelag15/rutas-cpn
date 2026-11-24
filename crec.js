/* ¿Qué productos crecen? Botón por botón (Willy, 24-nov-2026):
   Productos -> le picas a uno -> canales -> le picas a un canal -> clientes, contra el mismo mes del año pasado.
   Datos: crecimiento.json (megabase, Hl por cliente y producto).  window.CPN_CREC.render(cont, datos, { rutas }) */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (a, b) => (b > 0.0001 ? (a - b) / b : (a > 0 ? null : 0));
  const pctTxt = (a, b) => { const p = pct(a, b); if (p == null) return 'nuevo'; return (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(Math.round(p * 100)) + '%'; };
  const tono = (a, b) => (a - b > 0.05 ? 'up' : a - b < -0.05 ? 'down' : '');
  const canalBonito = (s) => s.charAt(0) + s.slice(1).toLowerCase();

  function render(cont, D, opts) {
    opts = opts || {};
    cont.replaceChildren();
    if (!D || !(D.filas || []).length) { cont.append(el('p', 'pp-mia', 'Todavía no hay datos de la megabase para comparar.')); return; }
    const st = cont._crec || (cont._crec = { per: D.default != null ? D.default : D.periodos[0].id, filtro: 'todos', prod: null, canal: null, ruta: null, todos: false });
    const rutasDatos = [...new Set(D.clientes.map((c) => c[1]))].sort((a, b) => a - b);
    const R = opts.rutas && opts.rutas.length ? opts.rutas : rutasDatos;
    const ia = 2 + st.per * 2, ib = ia + 1;   // a = año pasado, b = este año

    const filas = D.filas.filter((f) => { const r = D.clientes[f[0]][1]; return R.includes(r) && (!st.ruta || r === st.ruta); });
    const sumar = (lista, clave) => { const m = new Map(); lista.forEach((f) => { const k = clave(f); const x = m.get(k) || { k, a: 0, b: 0, n: 0 }; x.a += f[ia]; x.b += f[ib]; x.n++; m.set(k, x); }); return [...m.values()].filter((x) => x.a > 0.001 || x.b > 0.001); };
    const filtra = (L) => (st.filtro === 'crecen' ? L.filter((x) => x.b - x.a > 0.05) : st.filtro === 'caen' ? L.filter((x) => x.b - x.a < -0.05) : L);
    const ordena = (L) => L.sort((x, y) => (st.filtro === 'caen' ? (x.b - x.a) - (y.b - y.a) : st.filtro === 'crecen' ? (y.b - y.a) - (x.b - x.a) : y.b - x.b));
    const go = () => render(cont, D, opts);

    // ---- barra: periodo, crecen/caen, ruta ----
    const bar = el('div', 'cr-bar');
    const chips = (lista, actual, on, aria) => { const g = el('div', 'seg seg-sm cr-seg'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', aria); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); go(); }); g.append(b); }); return g; };
    bar.append(chips(D.periodos.map((p) => [p.id, p.etiqueta]), st.per, (v) => { st.per = v; }, 'Periodo'),
      chips([['todos', 'Todos'], ['crecen', 'Crecen'], ['caen', 'Caen']], st.filtro, (v) => { st.filtro = v; st.todos = false; }, 'Filtro'));
    if (R.length > 1) bar.append(chips([[null, 'Todas']].concat(R.map((r) => [r, 'R' + r])), st.ruta, (v) => { st.ruta = v; }, 'Ruta'));
    cont.append(bar, el('p', 'pp-mia', (D.periodos.find((p) => p.id === st.per) || D.periodos[0]).nota + '. Hl de la megabase al ' + D.corte + '.'));

    // ---- migas: Productos › producto › canal ----
    const mig = el('div', 'cr-mig');
    const miga = (t, on) => { const b = el('button', 'cr-miga', t); b.type = 'button'; if (on) b.addEventListener('click', () => { on(); go(); }); else b.disabled = true; mig.append(b); };
    miga('Productos', (st.prod != null) ? () => { st.prod = null; st.canal = null; st.todos = false; } : null);
    if (st.prod != null) { mig.append(el('span', null, '›')); miga(D.productos[st.prod][1], st.canal != null ? () => { st.canal = null; st.todos = false; } : null); }
    if (st.canal != null) { mig.append(el('span', null, '›')); miga(canalBonito(D.canales[st.canal]), null); }
    cont.append(mig);

    const tarjeta = (titulo, sub, a, b, on, extra) => {
      const c = el(on ? 'button' : 'div', 'cr-card ' + tono(b, a)); if (on) { c.type = 'button'; c.addEventListener('click', () => { on(); go(); window.scrollTo({ top: cont.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }); }
      const h = el('div', 'cr-cab'); h.append(el('b', null, titulo), el('span', 'cr-pct', pctTxt(b, a))); c.append(h);
      if (sub) c.append(el('small', 'cr-sub', sub));
      const nums = el('div', 'cr-nums'); nums.append(el('span', null, 'Este año ' + n1(b) + ' Hl'), el('span', null, 'Año pasado ' + n1(a) + ' Hl'), el('span', 'cr-dif', (b - a >= 0 ? '+' : '') + n1(b - a) + ' Hl')); c.append(nums);
      if (extra) c.append(el('small', 'cr-sub', extra));
      return c;
    };
    const grid = el('div', 'cr-grid');

    if (st.prod == null) {
      const L = ordena(filtra(sumar(filas, (f) => f[1])));
      const tot = sumar(filas, () => 0)[0] || { a: 0, b: 0 };
      const res = el('div', 'pr-tiles'); const t = (k, v, s, cls) => { const d = el('div', 'ht' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); res.append(d); };
      const all = sumar(filas, (f) => f[1]);
      t('Total', pctTxt(tot.b, tot.a), n1(tot.b) + ' Hl contra ' + n1(tot.a) + ' Hl', tono(tot.b, tot.a) === 'down' ? 'bad' : '');
      t('Productos que crecen', String(all.filter((x) => x.b - x.a > 0.05).length)); t('Productos que caen', String(all.filter((x) => x.b - x.a < -0.05).length), null, 'warn');
      cont.append(res, el('p', 'cr-ayuda', 'Pícale a un producto para ver en qué canal crece o cae.'));
      L.forEach((x) => grid.append(tarjeta(D.productos[x.k][1], 'Clave ' + D.productos[x.k][0], x.a, x.b, () => { st.prod = x.k; st.canal = null; st.todos = false; })));
    } else if (st.canal == null) {
      const F = filas.filter((f) => f[1] === st.prod);
      const L = ordena(filtra(sumar(F, (f) => D.clientes[f[0]][4])));
      cont.append(el('p', 'cr-ayuda', 'Pícale a un canal para ver los clientes.'));
      L.forEach((x) => { const cl = F.filter((f) => D.clientes[f[0]][4] === x.k); const caen = cl.filter((f) => f[ib] - f[ia] < -0.05).length; const dej = cl.filter((f) => f[ia] > 0.001 && f[ib] <= 0.001).length;
        grid.append(tarjeta(canalBonito(D.canales[x.k]), cl.length + ' clientes', x.a, x.b, () => { st.canal = x.k; st.todos = false; }, caen + ' bajaron' + (dej ? ' · ' + dej + ' ya no lo compran' : ''))); });
    } else {
      const lxc = D.productos[st.prod][2] || 0;
      const F = filas.filter((f) => f[1] === st.prod && D.clientes[f[0]][4] === st.canal);
      let L = filtra(sumar(F, (f) => f[0])).sort((x, y) => (st.filtro === 'crecen' ? (y.b - y.a) - (x.b - x.a) : (x.b - x.a) - (y.b - y.a)));
      const total = L.length; if (!st.todos) L = L.slice(0, 60);
      cont.append(el('p', 'cr-ayuda', total + ' clientes, primero los que más bajaron.'));
      L.forEach((x) => { const c = D.clientes[x.k]; const cajas = lxc ? ' · ≈ ' + n0(x.b * 100 / lxc) + ' cajas (antes ' + n0(x.a * 100 / lxc) + ')' : '';
        const tag = x.a > 0.001 && x.b <= 0.001 ? 'Ya no lo compra' : x.a <= 0.001 ? 'Cliente nuevo en este producto' : '';
        grid.append(tarjeta('#' + c[0] + ' · ' + (c[2] || '—') + (c[3] && c[3] !== c[2] ? ' · ' + c[3] : ''), 'Ruta ' + c[1] + cajas, x.a, x.b, null, tag)); });
      if (total > L.length) { const b = el('button', 'pr-add', 'Ver los ' + total + ' clientes'); b.type = 'button'; b.addEventListener('click', () => { st.todos = true; go(); }); cont.append(grid, b); return; }
    }
    if (!grid.children.length) grid.append(el('p', 'pp-mia', 'Nada con este filtro.'));
    cont.append(grid);
  }

  window.CPN_CREC = { render };
  // Página del admin: sección Productos
  if (window.dash && window.dash.draw) {
    window.dash.draw('crecimiento', (e) => { const d = window.dash.data('crecimiento'); render(e, d && d.status === 'ok' ? (Array.isArray(d.data) ? d.data[0] : d.data) : null, {}); });
  }
})();
