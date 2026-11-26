/* Inventarios (Willy, 25-nov-2026): en una sola pantalla los dos almacenes (Piedras Negras y Mixtequilla) y los camiones de cada ruta.
   Días de inventario, cuándo se acaba cada producto (días de venta, sin domingos) y semáforo: rojo < 7, naranja < 15, verde 15 o más.
   Fuentes: abasto_sku + abasto_res (Piedras Negras, inventario que sube Rubí), dias_mix (Mixtequilla, el que sube Joselin),
   inventario_ruta + inventario (camiones, Power Sales). data-draw="inventariosTodo" */
(function () {
  if (!window.dash) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const rows = (k) => { const d = dash.data(k); return d && d.status === 'ok' ? d.data : []; };
  const n0 = (v) => (v == null ? '—' : (Math.round(v) + 0).toLocaleString('es-MX'));
  const n1 = (v) => (v == null ? '—' : (Math.round(v * 10) / 10 + 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  const fd = (s) => { if (!s) return '—'; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const acaba = (f0, d) => { if (d == null || !f0) return '—'; const f = new Date(String(f0).slice(0, 10) + 'T12:00:00'); let n = Math.floor(d); while (n > 0) { f.setDate(f.getDate() + 1); if (f.getDay() !== 0) n--; } return f.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const sem = (d) => (d == null ? ['—', ''] : d <= 0 ? ['Agotado', 'iv-r'] : d < 7 ? ['Rojo', 'iv-r'] : d < 15 ? ['Naranja', 'iv-a'] : ['Verde', 'iv-v']);
  const st = { tab: 'pn', q: '', ruta: '' };

  function tabla(cols, filas, semCol) {
    const tw = el('div', 'tblwrap'); const t = el('table', 'cpn-t');
    const h = el('tr'); cols.forEach(([c, k]) => h.append(el('th', k || null, c))); t.append(el('thead')); t.tHead.append(h);
    const b = el('tbody'); filas.forEach((f) => { const tr = el('tr'); f.forEach((v, i) => { const td = el('td', cols[i][1] || null); if (i === semCol && Array.isArray(v)) { const s = el('span', 'iv-sem ' + v[1], v[0]); td.append(s); } else td.textContent = v; tr.append(td); }); b.append(tr); });
    if (!filas.length) { const tr = el('tr'); const td = el('td', 'note', 'Sin productos.'); td.colSpan = cols.length; tr.append(td); b.append(tr); }
    t.append(b); tw.append(t); return tw;
  }

  function almacen(F, f0, archivo, base) {
    const w = el('div');
    F = F.filter((x) => ((x.almacen || 0) + (x.camiones || 0)) > 0 || (x.ventaDia || 0) >= 1).sort((a, b) => (a.dias == null ? 9999 : a.dias) - (b.dias == null ? 9999 : b.dias));
    if (st.q) F = F.filter((x) => String(x.producto || '').toLowerCase().includes(st.q) || String(x.clave).includes(st.q));
    const ag = F.filter((x) => x.dias != null && x.dias <= 0), r = F.filter((x) => x.dias != null && x.dias > 0 && x.dias < 7), a = F.filter((x) => x.dias != null && x.dias >= 7 && x.dias < 15);
    const tl = el('div', 'pr-tiles'); const t = (k, v, s, c) => { const d = el('div', 'ht' + (c ? ' ' + c : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tl.append(d); };
    t('Inventario del', fd(f0), archivo || '');
    t('Agotados', n0(ag.length), ag.slice(0, 3).map((x) => x.producto).join(', ') || 'ninguno', ag.length ? 'bad' : 'ok');
    t('Se acaban en menos de 7 días', n0(r.length), r.slice(0, 3).map((x) => x.producto).join(', ') || 'ninguno', r.length ? 'bad' : 'ok');
    t('Entre 7 y 15 días', n0(a.length), '', a.length ? 'warn' : 'ok');
    w.append(tl, el('p', 'note', base + ' "Se acaba el" cuenta solo días de venta (sin domingos) y no incluye lo que viene en camino.'));
    w.append(tabla([['Producto'], ['Almacén', 'num'], ['En camiones', 'num'], ['Venta al día', 'num'], ['Días de inventario', 'num'], ['Se acaba el'], ['Semáforo']],
      F.map((x) => [x.producto, n0(x.almacen), n0(x.camiones), n1(x.ventaDia), n1(x.dias), acaba(f0, x.dias), sem(x.dias)]), 6));
    return w;
  }

  function rutas() {
    const w = el('div'); const IR = rows('inventario_ruta'); const I = rows('inventario');
    const tl = el('div', 'pr-tiles'); const t = (k, v, s, c) => { const d = el('div', 'ht' + (c ? ' ' + c : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tl.append(d); };
    const sinA = IR.filter((x) => (x.diasSinArqueo || 0) >= 2);
    t('Cajas a bordo (todas las rutas)', n0(IR.reduce((s, x) => s + (x.cajasTeoricas || 0), 0)), 'teórico de Power Sales');
    t('Rutas sin arqueo de 2 días o más', n0(sinA.length), sinA.map((x) => x.ruta).join(', ') || 'todas al día', sinA.length ? 'warn' : 'ok');
    t('Diferencias en arqueos del mes', n0(IR.reduce((s, x) => s + (x.diferenciasArqueo || 0), 0)), '', IR.some((x) => x.diferenciasArqueo) ? 'warn' : 'ok');
    w.append(tl, el('p', 'note', 'Teórico = último arqueo + cargas − ventas − devoluciones. Elige una ruta para ver qué trae por producto.'));
    w.append(tabla([['Ruta'], ['Vendedor'], ['Último arqueo'], ['Días sin arqueo', 'num'], ['Arqueos en el mes', 'num'], ['Diferencias', 'num'], ['Cajas a bordo', 'num'], ['Estado']],
      IR.map((x) => [x.ruta, x.vendedor || '', x.ultimoArqueo || 'sin arqueo', n0(x.diasSinArqueo), n0(x.arqueosMes), n0(x.diferenciasArqueo), n0(x.cajasTeoricas), x.estado || ''])));
    const bar = el('div', 'vc-bar'); const s = el('select', 'vc-sel'); s.append(new Option('Producto por producto: elige una ruta', ''));
    IR.forEach((x) => { const o = new Option(x.ruta + ' · ' + (x.vendedor || ''), x.ruta); o.selected = st.ruta === x.ruta; s.append(o); });
    s.addEventListener('change', () => { st.ruta = s.value; pintar(); }); bar.append(s); w.append(bar);
    if (st.ruta) {
      let D = I.filter((x) => x.ruta === st.ruta && (x.teorico || 0) !== 0).sort((a, b) => (b.teorico || 0) - (a.teorico || 0));
      if (st.q) D = D.filter((x) => String(x.producto || '').toLowerCase().includes(st.q));
      w.append(tabla([['Producto'], ['Último arqueo', 'num'], ['Cargas', 'num'], ['Ventas', 'num'], ['Devoluciones', 'num'], ['A bordo', 'num'], ['Hl', 'num']],
        D.map((x) => [x.producto, n0(x.arqueo), n0(x.cargas), n0(x.ventas), n0(x.devoluciones), n0(x.teorico), n1(x.hl)])));
    }
    return w;
  }

  let E = null;
  function pintar() {
    if (!E) return; E.replaceChildren();
    const res = rows('abasto_res')[0] || {}; const M = rows('dias_mix')[0] || {};
    const bar = el('div', 'vc-bar'); const tabs = el('div', 'iv-tabs');
    [['pn', 'Almacén Piedras Negras'], ['mix', 'Almacén Mixtequilla'], ['rutas', 'Camiones por ruta']].forEach(([k, txt]) => { const b = el('button', 'iv-tab' + (st.tab === k ? ' on' : ''), txt); b.type = 'button'; b.setAttribute('aria-pressed', st.tab === k); b.addEventListener('click', () => { st.tab = k; pintar(); }); tabs.append(b); });
    const q = el('input', 'vc-sel'); q.type = 'search'; q.placeholder = 'Buscar producto'; q.value = st.q; q.setAttribute('aria-label', 'Buscar producto');
    q.addEventListener('input', () => { st.q = q.value.trim().toLowerCase(); clearTimeout(q._t); q._t = setTimeout(() => { pintar(); const n = E.querySelector('input[type=search]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); });
    bar.append(tabs, q); E.append(bar);
    // (Willy, 25-nov-2026) los dos almacenes con el mismo reporte que imprimen Rubí y Joselin (último Excel subido, de más a menos venta);
    // se quitó de Almacén para no repetirlo. Los contenedores se guardan para no volver a bajar el Excel cada vez que se pinta.
    st.hosts = st.hosts || {};
    if (st.tab === 'pn' || st.tab === 'mix') {
      const k = st.tab === 'pn' ? 'almInv' : 'almInvMix';
      if (!st.hosts[k]) { st.hosts[k] = el('div'); st.hosts[k].setAttribute('data-draw', k); }
      E.append(el('p', 'note', st.tab === 'pn' ? 'Último inventario de Piedras Negras que subió Rubí, contra la venta diaria de toda la empresa en el mes.' : 'Último inventario de Mixtequilla que subió Joselin (o Rubí), contra la venta diaria de las rutas 4 y 6 en el mes (incluye el Oxxo y el 3B que surte la 4).'), st.hosts[k]);
      dash.draw(k);
    } else E.append(rutas());
  }

  dash.draw('inventariosTodo', (e) => { E = e; pintar(); });
})();
