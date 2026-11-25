/* Cierre del mes (Willy, 24-nov-2026): el estado del mes en una hoja, para cualquier mes del año.
   Venta contra meta y contra el año pasado (megabase / METAS REALES), por ruta, margen y gasto variable, clientes nuevos,
   perdidos, los que más crecen y caen, y el Programa de Franquicias si es el mes en curso. Se imprime o se baja en PDF.
   data-draw="cierreMes" */
(function () {
  if (!window.dash) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const rows = (k) => { const d = dash.data(k); return d && d.status === 'ok' ? d.data : []; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const $ = (v) => '$' + n0(v);
  const pc = (v) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%');
  const pp = (v) => (v == null || !isFinite(v) ? '—' : Math.round(v * 100) + '%');
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const st = { mes: null };

  dash.draw('cierreMes', (e) => {
    e.replaceChildren();
    const E = rows('empresa'); const ER = rows('empresa_ruta'); const GV = rows('gastovar_mes'); const CR = (rows('crecimiento') || [])[0] || {}; const info = CR.info || {};
    const corteMes = CR.corte ? Number(CR.corte.slice(5, 7)) : (new Date().getMonth() + 1);
    const meses = [...new Set(E.filter((r) => r.real != null).map((r) => r.mes))].sort((a, b) => a - b);
    if (!meses.length) { e.append(el('p', 'note', 'Sin datos.')); return; }
    if (st.mes == null) st.mes = meses.includes(corteMes - 1) ? corteMes - 1 : meses[meses.length - 1];
    const m = st.mes; const parcial = m >= corteMes;
    const bar = el('div', 'vc-bar no-print'); const s = el('select', 'vc-sel'); meses.slice().reverse().forEach((x) => { const o = new Option(tit(MES[x - 1]) + ' 2026' + (x >= corteMes ? ' (en curso)' : ''), x); o.selected = x === m; s.append(o); }); s.addEventListener('change', () => { st.mes = Number(s.value); dash.draw('cierreMes'); });
    const pr = el('button', 'pill', 'Imprimir / PDF'); pr.type = 'button'; pr.addEventListener('click', () => imprimir(e, m)); bar.append(s, pr); e.append(bar);
    e.append(el('h2', 'ci-tit', 'Cierre de ' + MES[m - 1] + ' 2026' + (parcial ? ' · al ' + (CR.corte || '').slice(8) + ' (en curso)' : '')));

    // 1) venta contra meta y año pasado (las dos fuentes de METAS REALES: Real y Híbrida)
    const R = E.find((r) => r.mes === m && r.tipo === 'Real') || {}; const Hb = E.find((r) => r.mes === m && r.tipo === 'Híbrida') || {};
    const real = R.real != null ? R.real : Hb.real; const meta = R.meta || Hb.meta; const y25 = R.y2025;
    const tiles = el('div', 'pr-tiles'); const t = (k, v, s2, c) => { const d = el('div', 'ht' + (c ? ' ' + c : '')); d.append(el('span', null, k), el('b', null, v)); if (s2) d.append(el('small', null, s2)); tiles.append(d); };
    t('Venta del mes', n1(real) + ' Hl', 'meta ' + n0(meta) + ' Hl · ' + pp(meta ? real / meta : null) + ' de la meta', meta && real < meta ? 'bad' : 'ok');
    if (y25) t('Contra el año pasado', pc(real / y25 - 1), n0(y25) + ' Hl en ' + MES[m - 1] + ' 2025' + (parcial ? ' (mes completo)' : ''), real < y25 ? 'warn' : 'ok');
    if (Hb.real != null) t('Comprado a Heineken (embarcado)', n1(Hb.real) + ' Hl', 'meta del Programa ' + n0(Hb.meta) + ' Hl');
    const ytdR = E.filter((r) => r.tipo === 'Real' && r.mes <= m && r.real != null); const yr = ytdR.reduce((a, r) => a + r.real, 0), yy = ytdR.reduce((a, r) => a + (r.y2025 || 0), 0), ym = ytdR.reduce((a, r) => a + (r.meta || 0), 0);
    t('Año a la fecha', n0(yr) + ' Hl', pc(yy ? yr / yy - 1 : null) + ' contra 2025 · ' + pp(ym ? yr / ym : null) + ' de la meta');
    const G = GV.find((g) => g.anio === 2026 && g.mes === m);
    if (G) { t('Gasto variable', $(G.gasto), pp(G.ingreso ? G.gasto / G.ingreso : null) + ' de lo vendido · ' + $(G.hl ? G.gasto / G.hl : 0) + ' por Hl'); }
    e.append(tiles);

    // 2) por ruta
    const RR = ER.filter((r) => r.mes === m && r.real != null);
    if (RR.length) { const tb = el('table', 'cpn-t'); const h = el('tr'); ['Ruta', 'Hl', 'Meta', 'Avance', '2025', 'Contra 2025'].forEach((x, i) => h.append(el('th', i ? 'num' : null, x))); tb.append(el('thead')); tb.tHead.append(h);
      const bd = el('tbody'); RR.slice().sort((a, b) => (b.real / (b.meta || 1)) - (a.real / (a.meta || 1))).forEach((r) => { const tr = el('tr'); const av = r.meta ? r.real / r.meta : null; tr.append(el('td', null, r.ruta), el('td', 'num', n1(r.real)), el('td', 'num', n0(r.meta)), el('td', 'num ' + (av != null && av < 0.9 ? 'bad' : ''), pp(av)), el('td', 'num', n1(r.real2025)), el('td', 'num', pc(r.real2025 ? r.real / r.real2025 - 1 : null))); bd.append(tr); });
      tb.append(bd); const w = el('div', 'tblwrap'); w.append(tb); e.append(el('h4', 'ci-sub', 'Por ruta'), w); }

    // 3) clientes: nuevos, perdidos, crecen y caen en el mes (megabase)
    const ids = Object.keys(info); const i0 = m - 1;
    const C = ids.map((id) => { const x = info[id]; const ant3 = (x.m26[i0 - 1] || 0) + (x.m26[i0 - 2] || 0) + (x.m26[i0 - 3] || 0); return { id, x, ahora: x.m26[i0] || 0, ant: x.m25[i0] || 0, ant3 }; });
    const cliN = new Map((rows('clientes') || []).map((c) => [String(c.id), c]));
    const nom = (id) => { const c = cliN.get(id) || {}; const p = (info[id] || {}).prop; return '#' + id + ' · ' + (c.negocio || '') + (p ? ' · ' + tit(p) : '') + (c.ruta ? ' (' + c.ruta.replace('Ruta ', 'R') + ')' : ''); };
    if (!parcial) {
      const nuevos = C.filter((c) => c.ahora > 0.05 && c.ant3 < 0.05 && c.ant < 0.05); const perd = C.filter((c) => c.ahora < 0.05 && c.ant3 / 3 >= 1);
      const crecen = C.filter((c) => c.ant > 1).map((c) => Object.assign(c, { d: c.ahora - c.ant })).sort((a, b) => b.d - a.d).slice(0, 8);
      const caen = C.filter((c) => c.ant > 1).map((c) => Object.assign(c, { d: c.ahora - c.ant })).sort((a, b) => a.d - b.d).slice(0, 8);
      const t2 = el('div', 'pr-tiles'); const tt = (k, v, s2, c) => { const d = el('div', 'ht' + (c ? ' ' + c : '')); d.append(el('span', null, k), el('b', null, v)); if (s2) d.append(el('small', null, s2)); t2.append(d); };
      tt('Clientes que compraron', String(C.filter((c) => c.ahora > 0.05).length), 'en ' + MES[m - 1]); tt('Nuevos o que regresaron', String(nuevos.length), n1(nuevos.reduce((a, c) => a + c.ahora, 0)) + ' Hl', 'ok');
      tt('Dejaron de comprar', String(perd.length), 'compraban ' + n1(perd.reduce((a, c) => a + c.ant3 / 3, 0)) + ' Hl al mes', 'bad');
      e.append(el('h4', 'ci-sub', 'Clientes'), t2);
      const lista = (titulo, L, f) => { const d = el('div', 'ci-col'); d.append(el('b', null, titulo)); const ul = el('ul', 'tk-lin'); L.forEach((c) => { const li = el('li'); li.append(el('span', null, nom(c.id)), el('b', null, f(c))); li.style.cursor = 'pointer'; li.addEventListener('click', () => window.CPN_CLIDET && window.CPN_CLIDET.abrir(c.id)); ul.append(li); }); d.append(ul); return d; };
      const g = el('div', 'ci-grid'); g.append(lista('Los que más crecieron contra ' + MES[m - 1] + ' 2025', crecen, (c) => '+' + n1(c.d) + ' Hl'), lista('Los que más cayeron', caen, (c) => n1(c.d) + ' Hl'));
      if (perd.length) g.append(lista('Dejaron de comprar', perd.sort((a, b) => b.ant3 - a.ant3).slice(0, 8), (c) => 'antes ' + n1(c.ant3 / 3) + ' Hl/mes'));
      if (nuevos.length) g.append(lista('Nuevos o regresaron', nuevos.sort((a, b) => b.ahora - a.ahora).slice(0, 8), (c) => n1(c.ahora) + ' Hl'));
      e.append(g);
    } else e.append(el('p', 'note', 'El detalle de clientes nuevos, perdidos y los que más crecen sale cuando el mes cierra (la megabase trae el mes completo).'));

    // 4) Programa (mes en curso)
    const P = (rows('programa') || [])[0];
    if (P && parcial) { const t3 = el('div', 'pr-tiles'); const tt = (k, v, s2, c) => { const d = el('div', 'ht' + (c ? ' ' + c : '')); d.append(el('span', null, k), el('b', null, v)); if (s2) d.append(el('small', null, s2)); t3.append(d); };
      tt('Programa: embarcado', n0(P.embarcado) + ' Hl', pp(P.cumplimiento) + ' de ' + n0(P.meta) + ' Hl'); tt('Por llegar', n0(P.pendienteHl || (P.noPreliberado + P.preliberado)) + ' Hl', P.comentario || ''); tt('Lugar', String(P.lugar || '—'), 'de ' + (P.franquicias || '—') + ' franquicias');
      e.append(el('h4', 'ci-sub', 'Programa de Franquicias'), t3); }
  });

  function imprimir(e, m) {
    const w = window.open('', '_blank'); if (!w) return;
    const css = '<style>body{font-family:Calibri,Arial,sans-serif;color:#111;padding:16px}h2{color:#1F5E3B}.no-print{display:none}.pr-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.ht{border:1px solid #ccc;border-radius:8px;padding:8px}.ht span{display:block;font-size:11px;color:#555}.ht b{font-size:18px}.ht small{display:block;font-size:11px;color:#555}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ddd;padding:3px 6px}th{background:#1F5E3B;color:#fff}.num{text-align:right}.ci-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.tk-lin{list-style:none;padding:0;font-size:12px}.tk-lin li{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:2px 0}</style>';
    w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cierre de ' + MES[m - 1] + ' 2026</title>' + css + '</head><body>' + e.innerHTML + '<script>window.onload=function(){window.print()}<\/script></body></html>'); w.document.close();
  }
})();
