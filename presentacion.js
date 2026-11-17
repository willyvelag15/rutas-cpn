/* Presentación: una diapositiva por ruta, semanal o mensual, para mandarla por WhatsApp (pedido de Willy 17-nov-2026).
   Datos: presentacion.json (03 Scripts/presentacion.py, se recalcula cada noche). */
(function () {
  const data = () => { const d = dash.data('presentacion'); return d && d.status === 'ok' ? (Array.isArray(d.data) ? d.data[0] : d.data) : null; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const color = (r) => (window.CPN.routeColor && window.CPN.routeColor[r]) || '#0E5A33';
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const fd = (s) => { if (!s) return '—'; const d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + MES[d.getMonth()]; };
  const fdd = (s) => { const d = new Date(s + 'T12:00:00'); return DIA[d.getDay()] + ' ' + d.getDate(); };
  const n0 = (v) => (v == null ? '—' : Math.round(v).toLocaleString('es-MX'));
  const n1 = (v) => (v == null ? '—' : (Math.round(v * 10) / 10).toLocaleString('es-MX', { maximumFractionDigits: 1 }));
  const n2 = (v) => (v == null ? '—' : (Math.round(v * 100) / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 }));
  const pc = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
  const mx = (v) => (v == null ? '—' : '$' + Math.round(v).toLocaleString('es-MX'));
  const st = { tipo: 'semana', periodo: null, ruta: 'todas' };

  const css = `
  .pz-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .pz-ctl select{font:inherit;padding:7px 10px;border-radius:10px;border:1px solid var(--color-border-line);background:var(--color-panel);color:var(--color-fg)}
  .pz-ctl .seg button[aria-pressed=true]{background:#0E5A33;color:#fff;border-color:#0E5A33}
  .pz-btn{font:inherit;border:1px solid #0E5A33;background:#0E5A33;color:#fff;border-radius:999px;padding:7px 14px;cursor:pointer}
  .pz-btn.sec{background:transparent;color:var(--color-fg);border-color:var(--color-border-line)}
  .pz-list{display:flex;flex-direction:column;align-items:center;gap:22px}
  .pz-wrap{display:flex;flex-direction:column;gap:8px;align-items:center;max-width:100%;overflow-x:auto}
  .pz{width:540px;flex:none;background:#fff;color:#1d2420;font-family:var(--font-anthropic-sans),system-ui,sans-serif;border-radius:18px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.12);font-size:12px;line-height:1.35}
  .pz *{box-sizing:border-box}
  .pz-hd{padding:16px 20px 14px;color:#fff;display:flex;justify-content:space-between;gap:10px;align-items:flex-end}
  .pz-hd b{font-family:var(--font-anthropic-serif),Georgia,serif;font-weight:400;font-size:27px;line-height:1.05;display:block}
  .pz-hd small{display:block;opacity:.92;font-size:12.5px;margin-top:3px}
  .pz-hd .pz-per{text-align:right;font-size:12px;opacity:.95}
  .pz-hd .pz-per b{font-family:inherit;font-size:14px;font-weight:600}
  .pz-bd{padding:14px 18px 16px;display:flex;flex-direction:column;gap:12px}
  .pz-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .pz-t{background:#F4F6F3;border-radius:11px;padding:8px 9px}
  .pz-t span{display:block;font-size:10.5px;color:#5c675f}
  .pz-t b{display:block;font-size:19px;font-weight:650;font-variant-numeric:tabular-nums;margin-top:1px}
  .pz-t small{display:block;font-size:10.5px;color:#5c675f}
  .pz-t.up b{color:#16803c}.pz-t.down b{color:#C2362F}
  .pz h4{margin:0 0 5px;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:#0E5A33}
  .pz-bar{height:11px;background:#E7ECE8;border-radius:6px;position:relative;overflow:hidden}
  .pz-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px}
  .pz-bar em{position:absolute;top:-2px;bottom:-2px;width:2px;background:#1d2420}
  .pz-row{display:flex;justify-content:space-between;font-size:11.5px;margin:3px 0 7px;color:#3d4741}
  .pz-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .pz-sc{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
  .pz-sc div{background:#F4F6F3;border-radius:8px;padding:5px 7px}
  .pz-sc span{display:block;font-size:10px;color:#5c675f}
  .pz-sc b{font-size:14px;font-variant-numeric:tabular-nums}
  .pz-sc .bad b{color:#C2362F}.pz-sc .ok b{color:#16803c}
  .pz table{width:100%;border-collapse:collapse;font-size:11px}
  .pz td,.pz th{padding:3px 4px;border-bottom:1px solid #EEF1EE;text-align:left;vertical-align:top}
  .pz th{font-size:10px;color:#5c675f;font-weight:500}
  .pz td.n,.pz th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .pz-mix{display:flex;height:14px;border-radius:7px;overflow:hidden;margin-bottom:5px}
  .pz-leg{display:flex;flex-wrap:wrap;gap:3px 10px;font-size:10.5px}
  .pz-leg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px}
  .pz-lost{background:#FFF4E5;border-radius:12px;padding:10px 12px}
  .pz-lost .pz-tiles{grid-template-columns:repeat(4,1fr)}
  .pz-lost .pz-t{background:#fff}
  .pz-al{display:flex;flex-direction:column;gap:4px}
  .pz-al div{border-radius:8px;padding:5px 8px;font-size:11.5px;background:#FDECEA;color:#7d1f19}
  .pz-al div.media{background:#FFF4E5;color:#7a4b00}
  .pz-al div b{font-weight:650;margin-right:4px}
  .pz ul{margin:0;padding-left:16px}.pz li{margin:2px 0;font-size:11.5px}
  .pz-op{background:#EAF5EE;border-radius:12px;padding:9px 12px}
  .pz-rg{background:#FDECEA;border-radius:12px;padding:9px 12px}
  .pz-rg h4{color:#9b2a22}
  .pz-ft{display:flex;justify-content:space-between;font-size:10px;color:#7a847d;padding:8px 18px 12px;border-top:1px solid #EEF1EE}
  .pz-msg{width:540px;max-width:100%;background:var(--color-panel);border:1px solid var(--color-border-line);border-radius:14px;padding:10px 12px;font-size:13.5px;line-height:1.45;white-space:pre-wrap}
  .pz-msg b{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#0E5A33;margin-bottom:4px}
  .pz-bn{display:flex;flex-direction:column;gap:6px}
  .pz-bn .pz-row{margin:0 0 2px}
  `;
  const sty = document.createElement('style'); sty.textContent = css; document.head.append(sty);

  const PALETA = ['#0E5A33', '#C98A0B', '#146EF9', '#E5484D', '#7C5CDB', '#0EA5B7', '#F08A24', '#6B7280', '#16A34A', '#B4436C'];

  function grafica(s) {
    const W = 504, H = 120, pad = { l: 26, r: 6, t: 10, b: 20 };
    const S = s.serie; if (!S.length) return el('div');
    const max = Math.max(...S.map((x) => x.hl), S[0].meta || 0) * 1.12 || 1;
    const bw = (W - pad.l - pad.r) / S.length;
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const add = (t, a, txt) => { const e = document.createElementNS(ns, t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); if (txt != null) e.textContent = txt; svg.append(e); return e; };
    [0, max / 2].forEach((v) => { add('line', { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), stroke: '#E7ECE8' }); add('text', { x: pad.l - 4, y: y(v) + 3, 'text-anchor': 'end', 'font-size': 9, fill: '#7a847d' }, n1(v)); });
    const c = color(s.ruta);
    S.forEach((x, i) => {
      const bx = pad.l + i * bw + bw * 0.18, w = bw * 0.64;
      add('rect', { x: bx, y: y(x.hl), width: w, height: Math.max(0, y(0) - y(x.hl)), rx: 3, fill: x.hl >= x.meta ? '#16A34A' : c });
      if (S.length <= 8) add('text', { x: bx + w / 2, y: y(x.hl) - 3, 'text-anchor': 'middle', 'font-size': 9.5, fill: '#1d2420' }, n1(x.hl));
      if (S.length <= 8 || i % 2 === 0) add('text', { x: bx + w / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 9, fill: '#5c675f' }, S.length <= 8 ? fdd(x.fecha) : fd(x.fecha));
    });
    const m = S[0].meta; if (m) { add('line', { x1: pad.l, x2: W - pad.r, y1: y(m), y2: y(m), stroke: '#C98A0B', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }); add('text', { x: W - pad.r, y: y(m) - 3, 'text-anchor': 'end', 'font-size': 9, fill: '#C98A0B' }, 'meta diaria ' + n1(m)); }
    return svg;
  }

  function tile(k, v, sub, cls) { const d = el('div', 'pz-t' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (sub) d.append(el('small', null, sub)); return d; }
  function barra(val, max, col, marca) { const b = el('div', 'pz-bar'); const i = el('i'); i.style.width = Math.min(100, (val / (max || 1)) * 100) + '%'; i.style.background = col; b.append(i); if (marca != null) { const m = el('em'); m.style.left = Math.min(99.5, marca * 100) + '%'; b.append(m); } return b; }

  function slide(s, P, corte) {
    const box = el('div', 'pz'); box.dataset.ruta = s.ruta;
    const c = color(s.ruta);
    const hd = el('div', 'pz-hd'); hd.style.background = 'linear-gradient(120deg,' + c + ',#0E5A33)';
    const a = el('div'); a.append(el('b', null, s.ruta), el('small', null, s.vendedor));
    const b = el('div', 'pz-per'); b.append(el('b', null, P.etiqueta)); b.append(el('div', null, P.tipo === 'mes' ? 'Del 1 al ' + fd(P.hasta) + ' · ' + P.dias + ' días de venta' : (P.completa ? P.dias + ' días de venta' : 'En curso, al ' + fd(P.hasta))));
    hd.append(a, b); box.append(hd);
    const bd = el('div', 'pz-bd'); box.append(bd);
    const K = s.kpi;
    const tiles = el('div', 'pz-tiles');
    tiles.append(tile('Hectolitros', n1(K.hl), 'meta ' + n1(K.metaPeriodo)));
    const sd = !!s.sinDinero;
    tiles.append(sd ? tile('Cajas', n0(K.cajas), 'vendidas') : tile('Venta', mx(K.venta), n0(K.cajas) + ' cajas'));
    tiles.append(tile('Avance meta', pc(K.avance), P.tipo === 'mes' ? 'debería ir en ' + pc(P.dias / 25) : 'de la meta semanal', K.avance != null && K.avance >= (P.tipo === 'mes' ? P.dias / 25 : 1) ? 'up' : 'down'));
    const cmp = K.comparaciones && K.comparaciones[0];
    const flecha = K.tendencia === 'creciendo' ? '▲ ' : K.tendencia === 'cayendo' ? '▼ ' : '';
    tiles.append(tile('Va ' + (K.tendencia === 'igual' ? 'parejo' : K.tendencia), cmp && cmp.cambio != null ? flecha + (cmp.cambio > 0 ? '+' : '') + pc(cmp.cambio) : '—', cmp ? 'vs ' + cmp.contra + ' (por día)' : 'sin semana anterior', K.tendencia === 'creciendo' ? 'up' : K.tendencia === 'cayendo' ? 'down' : ''));
    bd.append(tiles);

    // avance de meta
    const av = el('div'); av.append(el('h4', null, 'Avance de la meta'));
    if (P.tipo === 'semana') {
      const r = el('div', 'pz-row'); r.append(el('span', null, 'Esta semana: ' + n1(K.hl) + ' de ' + n1(K.metaPeriodo) + ' Hl'), el('b', null, pc(K.avance))); av.append(r, barra(K.hl, K.metaPeriodo, c));
    }
    const M = s.mes;
    const r2 = el('div', 'pz-row'); r2.style.marginTop = '7px'; r2.append(el('span', null, 'Mes al ' + fd(corte) + ': ' + n1(M.hlMes) + ' de ' + n0(M.metaHl) + ' Hl'), el('b', null, pc(M.avance))); av.append(r2, barra(M.hlMes, M.metaHl, '#0E5A33', null));
    if (M.pronostico != null) { const r3 = el('div', 'pz-row'); r3.style.marginTop = '5px'; r3.append(el('span', null, 'A este ritmo cierras en ' + n1(M.pronostico) + ' Hl (' + pc(M.pronostico / M.metaHl) + ')'), el('span', null, 'Necesitas ' + n1(M.necesitaDia) + ' Hl diarios')); av.append(r3); }
    bd.append(av);

    const g = el('div'); g.append(el('h4', null, 'Hectolitros por día')); g.append(grafica(s)); bd.append(g);

    // scorecard
    const S = s.score; const sc = el('div'); sc.append(el('h4', null, 'Scorecard'));
    const grid = el('div', 'pz-sc');
    const it = (k, v, cls) => { const d = el('div', cls || ''); d.append(el('span', null, k), el('b', null, v)); grid.append(d); };
    it('Visitas programadas', n0(S.visProg)); it('Programadas hechas', n0(S.progHechas)); it('Cumplimiento', pc(S.cumplimiento), S.cumplimiento < 0.85 ? 'bad' : 'ok');
    it('Visitas hechas', n0(S.visHechas)); it('Con pedido', n0(S.conPedido)); it('Efectividad', pc(S.efectividad), S.efectividad < 0.6 ? 'bad' : 'ok');
    it('Sin venta', n0(S.sinVenta)); if (sd) { it('Clientes que compraron', n0(S.clientesCompra)); it('Días de venta', n0(S.dias)); } else { it('Ticket promedio', mx(S.dropsize)); it('Precio por Hl', mx(K.precioHl)); }
    it('Salida (mediana)', S.salida || '—', S.salida > '10:00' ? 'bad' : ''); it('Días que salió tarde', S.diasTarde + ' de ' + S.dias, S.diasTarde ? 'bad' : 'ok'); it('Min por visita', n1(S.minServicio));
    sc.append(grid);
    if (S.motivos && S.motivos.length) { const p = el('div', null); p.style.cssText = 'font-size:11px;margin-top:5px;color:#3d4741'; p.textContent = 'Por qué no compraron: ' + S.motivos.map((m) => m.motivo.toLowerCase() + ' (' + m.visitas + ')').join(', '); sc.append(p); }
    bd.append(sc);

    // mezcla
    const mz = el('div', 'pz-2');
    const mk = el('div'); mk.append(el('h4', null, 'Mezcla por marca'));
    const bar = el('div', 'pz-mix'); const leg = el('div', 'pz-leg');
    s.marcas.slice(0, 7).forEach((m, i) => { const seg = el('i'); seg.style.cssText = 'width:' + (m.pct * 100) + '%;background:' + PALETA[i % 10]; bar.append(seg); const l = el('span'); const sw = el('i'); sw.style.background = PALETA[i % 10]; l.append(sw, document.createTextNode(m.marca + ' ' + pc(m.pct))); leg.append(l); });
    mk.append(bar, leg);
    const bn = el('div', 'pz-bn'); bn.style.marginTop = '10px'; bn.append(el('h4', null, 'Bonos del mes'));
    s.bonos.forEach((x) => { const r = el('div', 'pz-row'); r.append(el('span', null, x.nombre + ': ' + n2(x.cajasMes) + ' de ' + x.minimo), el('b', null, x.falta > 0 ? 'faltan ' + n2(x.falta) : 'ya entró')); bn.append(r, barra(x.cajasMes, x.minimo, x.falta > 0 ? '#C98A0B' : '#16A34A')); });
    if ((s.bonos || []).length) mk.append(bn);
    const pr = el('div'); pr.append(el('h4', null, 'Productos vendidos (' + s.nProductos + ')'));
    const t = el('table'); const th = el('tr'); [['Producto', ''], ['Cajas', 'n'], ['% venta', 'n']].forEach(([h, cl]) => th.append(el('th', cl, h))); t.append(th);
    s.productos.slice(0, 10).forEach((p) => { const tr = el('tr'); tr.append(el('td', null, p.producto), el('td', 'n', n2(p.cajas)), el('td', 'n', (Math.round(p.pct * 1000) / 10) + '%')); t.append(tr); });
    pr.append(t); mz.append(mk, pr); bd.append(mz);

    // venta que se dejó de hacer
    const L = s.perdida; const lo = el('div', 'pz-lost');
    lo.append(el('h4', null, 'Venta que se dejó de hacer · clientes sin compra'));
    const lt = el('div', 'pz-tiles');
    lt.append(tile('Clientes sin compra', L.clientes + ' de ' + L.cartera), tile('Hectolitros', n1(L.hl)), tile('Cajas', n0(L.cajas))); if (!sd) lt.append(tile('Pesos', mx(L.pesos))); else lt.style.gridTemplateColumns = 'repeat(3,1fr)';
    lo.append(lt);
    if (L.lista.length) {
      const tt = el('table'); tt.style.marginTop = '6px'; const h = el('tr'); [['Cliente', ''], ['Última compra', ''], ['Cajas', 'n']].concat(sd ? [] : [['Pesos', 'n']]).forEach(([x, cl]) => h.append(el('th', cl, x))); tt.append(h);
      L.lista.slice(0, 8).forEach((x) => { const tr = el('tr'); tr.append(el('td', null, x.cliente), el('td', null, x.ultimaCompra ? fd(x.ultimaCompra) + (x.dias != null ? ' (' + x.dias + ' días)' : '') : 'sin compra'), el('td', 'n', n1(x.cajas))); if (!sd) tr.append(el('td', 'n', mx(x.pesos))); tt.append(tr); });
      lo.append(tt);
    }
    bd.append(lo);

    if (s.alertas.length) { const al = el('div'); al.append(el('h4', null, 'Alertas')); const box2 = el('div', 'pz-al'); s.alertas.slice(0, 7).forEach((x) => { const d = el('div', x.nivel === 'alta' ? '' : 'media'); d.append(el('b', null, x.tipo + ':'), document.createTextNode(x.txt)); box2.append(d); }); al.append(box2); bd.append(al); }

    const or = el('div', 'pz-2');
    const op = el('div', 'pz-op'); op.append(el('h4', null, 'Para la semana que entra')); const u1 = el('ul'); (s.oportunidades.length ? s.oportunidades : ['Mantener el ritmo y visitar a todos los clientes.']).forEach((x) => u1.append(el('li', null, x))); op.append(u1);
    const rg = el('div', 'pz-rg'); rg.append(el('h4', null, 'Riesgos para lo que resta')); const u2 = el('ul'); (s.riesgos.length ? s.riesgos : ['Sin riesgos fuertes por ahora.']).forEach((x) => u2.append(el('li', null, x))); rg.append(u2);
    or.append(op, rg); bd.append(or);

    const ft = el('div', 'pz-ft'); ft.append(el('span', null, 'Comercializadora de Piedras Negras · Rutas CPN'), el('span', null, 'Datos al ' + fd(corte))); box.append(ft);
    return box;
  }

  async function imagen(node) {
    if (!window.html2canvas) await new Promise((ok, mal) => { const sc = document.createElement('script'); sc.src = 'html2canvas.min.js'; sc.onload = ok; sc.onerror = () => mal(new Error('no cargó html2canvas')); document.head.append(sc); });
    const cv = await window.html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }
  const nombre = (s, P) => (s.ruta.replace(' ', '') + '_' + (P.tipo === 'mes' ? P.id.slice(1) : 'semana_' + P.inicio) + '.png');
  async function bajar(node, s, P, compartir) {
    const blob = await imagen(node); const f = new File([blob], nombre(s, P), { type: 'image/png' });
    if (compartir && navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: s.ruta + ' · ' + P.etiqueta }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  dash.draw('pzCtl', (e) => {
    e.replaceChildren(); const X = data(); if (!X) { e.append(el('p', 'note', 'Todavía no hay datos de la presentación. Se generan en la actualización de la noche.')); return; }
    const per = X.periodos.filter((p) => p.tipo === st.tipo);
    if (!st.periodo || !per.find((p) => p.id === st.periodo)) {
      // por defecto: la última semana completa (la que se manda el lunes) o el mes
      const comp = per.filter((p) => p.completa); st.periodo = (comp.length ? comp[comp.length - 1] : per[per.length - 1]).id;
    }
    const w = el('div', 'pz-ctl');
    const seg = el('div', 'seg'); [['semana', 'Semanal'], ['mes', 'Mensual']].forEach(([k, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.tipo === k)); b.onclick = () => { st.tipo = k; st.periodo = null; dash.draw('pzCtl'); dash.draw('pzSlides'); }; seg.append(b); });
    const sp = el('select'); sp.setAttribute('aria-label', 'Periodo');
    per.slice().reverse().forEach((p) => { const o = el('option', null, p.etiqueta + (p.tipo === 'mes' ? ' (al ' + fd(p.hasta) + ')' : p.completa ? '' : ' (en curso)')); o.value = p.id; o.selected = p.id === st.periodo; sp.append(o); });
    sp.onchange = () => { st.periodo = sp.value; dash.draw('pzSlides'); };
    const sr = el('select'); sr.setAttribute('aria-label', 'Ruta');
    const rutas = [...new Set(X.slides.map((s) => s.ruta))].sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
    [['todas', 'Todas las rutas']].concat(rutas.map((r) => [r, r])).forEach(([v, t]) => { const o = el('option', null, t); o.value = v; o.selected = v === st.ruta; sr.append(o); });
    sr.onchange = () => { st.ruta = sr.value; dash.draw('pzSlides'); };
    const all = el('button', 'pz-btn sec', 'Guardar todas'); all.type = 'button';
    all.onclick = async () => { all.disabled = true; all.textContent = 'Guardando…'; const P = X.periodos.find((p) => p.id === st.periodo); for (const n of document.querySelectorAll('#pz-slides .pz')) { const s = X.slides.find((x) => x.periodo === st.periodo && x.ruta === n.dataset.ruta); await bajar(n, s, P, false); await new Promise((r) => setTimeout(r, 400)); } all.disabled = false; all.textContent = 'Guardar todas'; };
    w.append(seg, sp, sr, all); e.append(w);
    e.append(el('p', 'note', 'Se recalcula todas las noches con la venta del día. Por defecto aparece la última semana completa, que es la que se manda el lunes. "Compartir" abre WhatsApp en el celular; en la computadora guarda la imagen.'));
  });

  dash.draw('pzSlides', (e) => {
    e.replaceChildren(); const X = data(); if (!X) return;
    const P = X.periodos.find((p) => p.id === st.periodo); if (!P) return;
    const S = X.slides.filter((s) => s.periodo === P.id && (st.ruta === 'todas' || s.ruta === st.ruta)).sort((a, b) => a.rutaNum - b.rutaNum);
    const list = el('div', 'pz-list'); list.id = 'pz-slides';
    S.forEach((s) => {
      const w = el('div', 'pz-wrap'); const node = slide(s, P, X.corte);
      const bt = el('div', 'pz-ctl');
      const b1 = el('button', 'pz-btn', 'Compartir'); b1.type = 'button'; b1.onclick = async () => { b1.disabled = true; try { await bajar(node, s, P, true); } catch (err) { alert('No se pudo crear la imagen: ' + err.message); } b1.disabled = false; };
      const b2 = el('button', 'pz-btn sec', 'Guardar imagen'); b2.type = 'button'; b2.onclick = async () => { b2.disabled = true; try { await bajar(node, s, P, false); } catch (err) { console.log(err); } b2.disabled = false; };
      bt.append(b1, b2);
      if (s.mensaje) {
        const mg = el('div', 'pz-msg'); mg.append(el('b', null, 'Mensaje para ' + s.vendedor.split(' ')[0] + ' (cópialo y pégalo en WhatsApp)'), document.createTextNode(s.mensaje));
        const b3 = el('button', 'pz-btn sec', 'Copiar mensaje'); b3.type = 'button';
        b3.onclick = async () => { try { await navigator.clipboard.writeText(s.mensaje); b3.textContent = 'Copiado'; } catch (e) { const r = document.createRange(); r.selectNodeContents(mg.lastChild.parentNode); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b3.textContent = 'Selecciónalo y copia'; } setTimeout(() => { b3.textContent = 'Copiar mensaje'; }, 2000); };
        bt.append(b3); w.append(node, bt, mg);
      } else w.append(node, bt);
      list.append(w);
    });
    if (!S.length) list.append(el('p', 'note', 'No hay datos de esa ruta en el periodo.'));
    e.append(list);
  });

  window.CPN_PZ = { slide };
  window.addEventListener('cpn-ir', (ev) => { if (ev.detail.vista !== 'presentacion') return; if (ev.detail.ruta) st.ruta = ev.detail.ruta; dash.draw('pzCtl'); dash.draw('pzSlides'); });
  const TIT = { presentacion: ['Presentación', 'Rendimiento por ruta para mandar por WhatsApp'] };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const t = TIT[b.getAttribute('data-vista')]; if (!t) return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
  }));
})();
