/* Envase: adeudo de envase por ruta (cajas retornables vendidas contra envase devuelto al almacén en Power Sales). */
(function () {
  const F = window.CPN.fmt;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const color = (r) => (window.CPN.routeColor && window.CPN.routeColor[r]) || '#6B7280';
  const cj = (v) => (Math.round((v || 0) * 100) / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 });
  const EST = { 'Cuadra': 'ok', 'Debe envase': 'bad', 'Devolvió de más': 'warn', 'Sin devolución en el mes': 'warn' };
  const st = { ruta: null };

  dash.draw('envResumen', (e) => {
    e.replaceChildren();
    const E = rows('envase'); if (!E.length) { e.append(el('p', 'note', 'Todavía no hay datos de envase.')); return; }
    const debe = E.filter((x) => x.adeudo > 2);
    const rutas = [...new Set(E.map((x) => x.ruta))];
    const malas = new Set(E.filter((x) => x.estado !== 'Cuadra').map((x) => x.ruta));
    const pend = E.reduce((a, x) => a + (x.pendiente || 0), 0);
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('Cajas de envase que se deben', cj(debe.reduce((a, x) => a + x.adeudo, 0)), debe.length ? debe.map((x) => x.ruta + ' ' + x.tipo.toLowerCase()).join(' · ') : 'ninguna ruta debe envase', debe.length ? 'bad' : '');
    t('Rutas que cuadran', F.int(rutas.length - malas.size) + ' de ' + F.int(rutas.length), 'vendido contra devuelto hasta su última devolución', '');
    t('Por devolver (venta reciente)', cj(pend), 'cajas vendidas después de su última devolución', '');
    e.append(tiles);
  });

  dash.draw('envTabla', (e) => {
    e.replaceChildren();
    const E = rows('envase'); if (!E.length) return;
    const t = el('table', 'cpn-t');
    const hr = el('tr');
    [['Ruta', ''], ['Envase', ''], ['Vendido', 'num'], ['Devuelto', 'num'], ['Debe', 'num'], ['Por devolver', 'num'], ['Última dev.', ''], ['Estado', '']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody');
    E.slice().sort((a, b) => a.rutaNum - b.rutaNum).forEach((x, i, arr) => {
      const tr = el('tr'); tr.style.cursor = 'pointer';
      const n = el('td', null, i && arr[i - 1].ruta === x.ruta ? '' : x.ruta); n.style.fontWeight = '600'; n.style.color = color(x.ruta);
      const d = el('td', 'num ' + (x.adeudo > 2 ? 'bad' : x.adeudo < -2 ? 'warn' : ''), cj(x.adeudo));
      const s = el('td'); s.append(el('span', 'pill ' + (EST[x.estado] || ''), x.estado));
      tr.append(n, el('td', null, x.tipo), el('td', 'num', cj(x.vendido)), el('td', 'num', cj(x.devuelto)), d, el('td', 'num', cj(x.pendiente)), el('td', null, x.ultimaDev ? F.dia(x.ultimaDev) : '—'), s);
      tr.addEventListener('click', () => { st.ruta = x.ruta; dash.draw('envRutas'); dash.draw('envMov'); const m = document.getElementById('env-mov'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      tb.append(tr);
    });
    t.append(tb); e.append(t);
  });

  dash.draw('envRutas', (e) => {
    e.replaceChildren();
    const E = rows('envase'); if (!E.length) return;
    const rutas = [...new Set(E.map((x) => x.ruta))].sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
    if (!st.ruta || !rutas.includes(st.ruta)) st.ruta = (E.find((x) => x.estado === 'Debe envase') || E[0]).ruta;
    const seg = el('div', 'seg seg-sm');
    rutas.forEach((r) => { const b = el('button', null, r); b.type = 'button'; b.setAttribute('aria-pressed', String(st.ruta === r)); b.addEventListener('click', () => { st.ruta = r; dash.draw('envRutas'); dash.draw('envMov'); }); seg.append(b); });
    e.append(seg);
  });

  dash.draw('envMov', (e) => {
    e.replaceChildren();
    const M = rows('envase_mov').filter((x) => x.ruta === st.ruta); if (!M.length) return;
    const t = el('table', 'cpn-t');
    const hr = el('tr');
    [['Fecha', ''], ['Envase', ''], ['Vendido', 'num'], ['Devuelto', 'num'], ['Saldo', 'num'], ['Documento de devolución', '']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody');
    M.slice().sort((a, b) => (a.tipo > b.tipo ? 1 : a.tipo < b.tipo ? -1 : a.fecha > b.fecha ? 1 : -1)).forEach((x) => {
      const tr = el('tr');
      tr.append(el('td', null, F.dia(x.fecha)), el('td', null, x.tipo), el('td', 'num', cj(x.vendido)), el('td', 'num' + (x.devuelto ? ' ok' : ''), x.devuelto ? cj(x.devuelto) : '—'), el('td', 'num ' + (x.saldo > 2 ? 'bad' : ''), cj(x.saldo)), el('td', null, x.docs || ''));
      tb.append(tr);
    });
    t.append(tb); e.append(t);
  });

  const TIT = { envase: ['Envase', 'Adeudo de envase por ruta'] };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const t = TIT[b.getAttribute('data-vista')]; if (!t) return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
  }));
})();
