/* Rendimiento de clientes del mes (acumulado del 1 a hoy): venta, descuento, producto sin cargo, margen, costo de visitarlo,
   ganamos o perdemos, ritmo contra su promedio, saturación, oportunidades, riesgos y sus compras por producto y por día.
   Se usa en el admin (pantalla "Rendimiento de clientes") y en las páginas de Monse y Berenice. */
(function () {
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const dia = (s) => { if (!s) return '—'; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const mx = (v) => (v < 0 ? '−$' : '$') + Math.abs(Math.round(v || 0)).toLocaleString('es-MX');
  const pc = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
  const rnum = (r) => parseInt(String(r).replace(/\D/g, ''), 10) || 0;
  const COLS = ['#2E7D4F', '#E0A43A', '#3B82C4', '#C0392B', '#8E5BB5', '#16A3A3', '#D9653B', '#7A8B2E', '#9AA0A6'];
  const TONO = { 'Perdemos': 'bad', 'Dos tickets en lugares distintos': 'bad', 'Grande sin saturación': 'warn', 'Chico con mucha saturación': 'warn', 'Cayendo': 'warn', 'Creciendo': 'ok' };

  function dona(items, tot, centro, sub) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 200 200'); svg.setAttribute('class', 'rc-dona');
    let a0 = -Math.PI / 2;
    items.forEach(([n, v], i) => {
      if (!v) return;
      const a1 = a0 + (v / tot) * Math.PI * 2;
      const p = (r, a) => [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const [x1, y1] = p(92, a0), [x2, y2] = p(92, a1 - 0.0001), [x3, y3] = p(56, a1 - 0.0001), [x4, y4] = p(56, a0);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${x1},${y1}A92,92 0 ${big} 1 ${x2},${y2}L${x3},${y3}A56,56 0 ${big} 0 ${x4},${y4}Z`);
      path.setAttribute('fill', COLS[i % COLS.length]); path.setAttribute('stroke', 'var(--color-panel)'); path.setAttribute('stroke-width', '1.5');
      const t = document.createElementNS(NS, 'title'); t.textContent = n + ' ' + Math.round(v / tot * 100) + '%'; path.append(t);
      svg.append(path); a0 = a1;
    });
    const t1 = document.createElementNS(NS, 'text'); t1.setAttribute('x', 100); t1.setAttribute('y', 98); t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('class', 'rc-dona-v'); t1.textContent = centro;
    const t2 = document.createElementNS(NS, 'text'); t2.setAttribute('x', 100); t2.setAttribute('y', 118); t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('class', 'rc-dona-k'); t2.textContent = sub;
    svg.append(t1, t2);
    return svg;
  }

  function detalle(c, DET, dinero, mg, cerrar) {
    const w = el('div', 'rc-det');
    const cab = el('div', 'rc-det-cab');
    const tt = el('div'); tt.append(el('h4', null, cpnCli(c, 'id')), el('small', null, [c.ruta + ' · ' + c.vendedor, c.giro, c.poblacion, c.nivel].filter(Boolean).join(' · ')));
    const x = el('button', 'rc-x', 'Cerrar'); x.type = 'button'; x.addEventListener('click', cerrar);
    cab.append(tt, x); w.append(cab);
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, tono) => { const d = el('div', 'hal-tile' + (tono ? ' ' + tono : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('Hectolitros del mes', n1(c.hl), 'va para ' + n1(c.proyHl) + ' · promedio ' + n1(c.prom3Hl), c.ritmo >= 0.3 ? 'ok' : c.ritmo <= -0.3 ? 'warn' : '');
    if (dinero) t('Venta', mx(c.venta), n0(c.cajas) + ' cajas · ' + c.compras + ' compras');
    if (mg) {
      t('Descuento y sin cargo', mx(c.descuento + c.sinCargo), 'descuento ' + mx(c.descuento) + ' · sin cargo ' + mx(c.sinCargo), (c.descuento + c.sinCargo) / (c.venta || 1) > 0.12 ? 'warn' : '');
      t('Margen que nos deja', mx(c.margen), pc(c.margenPct) + ' de la venta');
      t(c.ganamos ? 'Ganamos' : 'Perdemos', mx(c.neto), 'margen − ' + mx(c.costoVisitas) + ' de visitarlo (' + c.visitas + ' días)', c.ganamos ? 'ok' : 'bad');
    }
    if (!dinero) t('Cajas', n0(c.cajas), c.compras + ' compras');
    t('Saturación', pc(c.saturacion), 'la ruta lleva ' + pc(c.rutaSat), c.banderas.includes('Grande sin saturación') || c.banderas.includes('Chico con mucha saturación') ? 'warn' : '');
    if (mg && c.gvBonif != null) t('Heineken (bonif. + promo)', mx((c.gvBonif || 0) + (c.gvPromo || 0)), mx(c.gvGastoHl) + '/Hl vs ' + mx(c.gvRutaGastoHl) + '/Hl la ruta · ' + (c.gvCorte || ''));
    w.append(tiles);
    // productos
    const P = c.productos || [];
    const totH = P.reduce((a, p) => a + p[2], 0) || P.reduce((a, p) => a + p[1], 0);
    const usa = P.reduce((a, p) => a + p[2], 0) ? 2 : 1;
    const top = P.slice(0, 8).map((p) => [p[0], p[usa]]); const resto = P.slice(8).reduce((a, p) => a + p[usa], 0); if (resto > 0) top.push(['Otros', resto]);
    const cuerpo = el('div', 'rc-mix');
    cuerpo.append(dona(top, totH, n1(c.hl), 'Hl del mes'));
    const tb = el('table', 'cpn-t'); const h = el('tr'); [['Producto', ''], ['Cajas', 'num'], ['Hl', 'num']].concat(dinero ? [['Venta', 'num']] : []).concat([['%', 'num']]).forEach(([a, b]) => h.append(el('th', b || null, a)));
    tb.append(el('thead')); tb.tHead.append(h); const bb = el('tbody');
    P.forEach((p, i) => { const tr = el('tr'); const td = el('td'); const sw = el('i', 'rc-sw'); sw.style.background = i < 8 ? COLS[i] : COLS[8]; td.append(sw, document.createTextNode(p[0])); tr.append(td, el('td', 'num', n1(p[1])), el('td', 'num', (Math.round(p[2] * 100) / 100).toLocaleString('es-MX'))); if (dinero) tr.append(el('td', 'num', mx(p[3]))); tr.append(el('td', 'num', pc(p[usa] / (totH || 1)))); bb.append(tr); });
    tb.append(bb); const wr = el('div', 'tblwrap'); wr.append(tb); cuerpo.append(wr); w.append(cuerpo);
    // oportunidades y riesgos
    const dos = el('div', 'rc-dos');
    const lista = (tit, L, tono) => { const b = el('div', 'rc-lista ' + tono); b.append(el('h5', null, tit)); const ul = el('ul'); (L.length ? L : ['Nada por ahora.']).forEach((x) => ul.append(el('li', null, x))); b.append(ul); return b; };
    dos.append(lista('Oportunidades', c.oportunidades || [], 'ok'), lista('Riesgos', c.riesgos || [], 'bad'));
    w.append(dos);
    // compras por día
    const D = DET.filter((d) => d[0] === c.id);
    if (D.length) {
      const porDia = {}; D.forEach((d) => { (porDia[d[1]] = porDia[d[1]] || []).push(d); });
      const t2 = el('table', 'cpn-t rc-dias'); const h2 = el('tr'); [['Día', ''], ['Qué compró', ''], ['Cajas', 'num']].concat(dinero ? [['Venta', 'num']] : []).forEach(([a, b]) => h2.append(el('th', b || null, a)));
      t2.append(el('thead')); t2.tHead.append(h2); const b2 = el('tbody');
      Object.keys(porDia).sort().reverse().forEach((f) => { const L = porDia[f]; const tr = el('tr'); tr.append(el('td', null, dia(f)), el('td', 'wrap', L.map((d) => n1(d[3]) + ' ' + d[2]).join(' · ')), el('td', 'num', n1(L.reduce((a, d) => a + d[3], 0)))); if (dinero) tr.append(el('td', 'num', mx(L.reduce((a, d) => a + d[5], 0)))); b2.append(tr); });
      t2.append(b2); const w2 = el('div', 'tblwrap'); w2.append(t2);
      const det = el('details'); det.open = true; det.append(el('summary', null, 'Sus compras del mes, día por día'), w2); w.append(det);
    }
    return w;
  }

  function render(cont, o) {
    const st = o.estado || (o.estado = {});
    const dinero = o.dinero !== false;
    const mg = dinero && !o.sinMargen;   // Berenice: con venta pero sin margen, bonificación ni Heineken
    const F0 = (o.filas || []).filter((x) => !o.okRuta || o.okRuta(x.ruta));
    const DET = o.det || [];
    cont.replaceChildren();
    if (!F0.length) { cont.append(el('p', 'pp-mia', 'Todavía no hay datos de clientes del mes.')); return; }
    st.q = st.q || ''; st.ruta = st.ruta || ''; st.f = st.f || 'todos'; st.ord = st.ord || (dinero ? 'venta' : 'hl'); st.n = st.n || 60;
    const rutas = [...new Set(F0.map((x) => x.ruta))].sort((a, b) => rnum(a) - rnum(b));
    // barra de filtros
    const bar = el('div', 'rc-bar');
    const q = el('input', 'envf-in'); q.type = 'search'; q.placeholder = 'Buscar cliente o número…'; q.value = st.q;
    const sR = el('select', 'envf-in'); [['', 'Todas las rutas']].concat(rutas.map((r) => [r, r])).forEach(([v, t]) => { const op = el('option', null, t); op.value = v; sR.append(op); }); sR.value = st.ruta;
    const sO = el('select', 'envf-in'); [['venta', 'Ordenar por venta'], ['hl', 'Por hectolitros'], ['margen', 'Por margen'], ['neto', 'Por lo que nos deja'], ['ritmo', 'Por crecimiento'], ['caida', 'Por caída'], ['sat', 'Por saturación (menos)']].filter((x) => (dinero || x[0] !== 'venta') && (mg || !['margen', 'neto'].includes(x[0]))).forEach(([v, t]) => { const op = el('option', null, t); op.value = v; sO.append(op); }); sO.value = st.ord;
    bar.append(q); if (rutas.length > 1) bar.append(sR); bar.append(sO);
    cont.append(bar);
    const chips = el('div', 'envf-rapido');
    const FIL = [['todos', 'Todos'], ['perdemos', 'Perdemos'], ['crece', 'Creciendo'], ['cae', 'Cayendo'], ['sinsat', 'Grandes sin saturación'], ['chicosat', 'Chicos con mucha saturación'], ['tickets', 'Dos tickets'], ['riesgo', 'Con riesgos']].filter((x) => mg || x[0] !== 'perdemos');
    FIL.forEach(([v, t]) => { const b = el('button', 'envf-chip', t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.f === v)); b.addEventListener('click', () => { st.f = v; st.n = 60; render(cont, o); }); chips.append(b); });
    cont.append(chips);
    let tmr; q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { st.q = q.value; st.n = 60; render(cont, o); const nq = cont.querySelector('input[type=search]'); if (nq) { nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } }, 250); });
    sR.addEventListener('change', () => { st.ruta = sR.value; render(cont, o); });
    sO.addEventListener('change', () => { st.ord = sO.value; render(cont, o); });

    const qq = st.q.trim().toUpperCase();
    let F = F0.filter((x) => (!st.ruta || x.ruta === st.ruta) && (!qq || x.cliente.toUpperCase().includes(qq) || x.id === qq));
    const fil = { perdemos: (x) => !x.ganamos, crece: (x) => (x.ritmo || 0) >= 0.3, cae: (x) => (x.ritmo || 0) <= -0.3, sinsat: (x) => x.banderas.includes('Grande sin saturación'), chicosat: (x) => x.banderas.includes('Chico con mucha saturación'), tickets: (x) => x.banderas.includes('Dos tickets en lugares distintos'), riesgo: (x) => (x.riesgos || []).length > 0 }[st.f];
    if (fil) F = F.filter(fil);
    const ORD = { venta: (a, b) => b.venta - a.venta, hl: (a, b) => b.hl - a.hl, margen: (a, b) => b.margen - a.margen, neto: (a, b) => a.neto - b.neto, ritmo: (a, b) => (b.ritmo ?? -9) - (a.ritmo ?? -9), caida: (a, b) => (a.ritmo ?? 9) - (b.ritmo ?? 9), sat: (a, b) => a.saturacion - b.saturacion || b.hl - a.hl };
    F.sort(ORD[st.ord] || ORD.venta);

    // resumen
    const S = (k) => F.reduce((a, x) => a + (x[k] || 0), 0);
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, tono) => { const d = el('div', 'hal-tile' + (tono ? ' ' + tono : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    const fechas = DET.map((d) => d[1]).sort();
    t('Clientes con compra', n0(F.length), fechas.length ? 'del ' + dia(fechas[0]) + ' al ' + dia(fechas[fechas.length - 1]) : '');
    t('Hectolitros', n1(S('hl')), n0(S('cajas')) + ' cajas');
    if (dinero) {
      t('Venta', mx(S('venta')), mg ? 'descuento ' + mx(S('descuento')) + ' · sin cargo ' + mx(S('sinCargo')) : '');
    }
    if (mg) {
      t('Margen', mx(S('margen')), pc(S('margen') / (S('venta') || 1)) + ' de la venta');
      const pierde = F.filter((x) => !x.ganamos);
      t('Clientes que no nos dejan', n0(pierde.length), pierde.length ? mx(pierde.reduce((a, x) => a + x.neto, 0)) + ' en contra' : 'todos dejan', pierde.length ? 'bad' : 'ok');
    }
    const satT = F.reduce((a, x) => a + x.hl * x.saturacion, 0) / (S('hl') || 1);
    t('Saturación', pc(satT), 'todo menos XX Lager');
    cont.append(tiles);

    // tabla
    const w = el('div', 'tblwrap'); const tb = el('table', 'cpn-t rc-t');
    const h = el('tr'); [['Cliente', ''], ['Hl', 'num'], ['Va para', 'num']].concat(mg ? [['Venta', 'num'], ['Desc. + sin cargo', 'num'], ['Margen', 'num'], ['Nos deja', 'num']] : dinero ? [['Venta', 'num'], ['Cajas', 'num']] : [['Cajas', 'num']]).concat([['Ritmo', 'num'], ['Saturación', 'num'], ['Señales', '']]).forEach(([a, b]) => h.append(el('th', b || null, a)));
    tb.append(el('thead')); tb.tHead.append(h);
    const bb = el('tbody');
    F.slice(0, st.n).forEach((x) => {
      const tr = el('tr', 'rc-fila' + (st.sel === x.id ? ' sel' : '')); tr.tabIndex = 0;
      const tc = el('td'); tc.append(el('b', null, cpnCli(x, 'id')), el('small', null, ' ' + x.ruta));
      tr.append(tc, el('td', 'num', n1(x.hl)), el('td', 'num', n1(x.proyHl)));
      if (mg) tr.append(el('td', 'num', mx(x.venta)), el('td', 'num', mx(x.descuento + x.sinCargo)), el('td', 'num', mx(x.margen)), el('td', 'num ' + (x.ganamos ? '' : 'neg'), mx(x.neto)));
      else if (dinero) tr.append(el('td', 'num', mx(x.venta)), el('td', 'num', n1(x.cajas)));
      else tr.append(el('td', 'num', n1(x.cajas)));
      tr.append(el('td', 'num ' + ((x.ritmo || 0) >= 0.3 ? 'ok' : (x.ritmo || 0) <= -0.3 ? 'warn' : ''), x.ritmo == null ? 'nuevo' : (x.ritmo > 0 ? '+' : '') + pc(x.ritmo)), el('td', 'num', pc(x.saturacion)));
      const tdS = el('td'); x.banderas.filter((b, i, a) => a.indexOf(b) === i).forEach((b) => tdS.append(el('span', 'pill ' + (TONO[b] || ''), b), document.createTextNode(' '))); tr.append(tdS);
      const ir = () => { st.sel = st.sel === x.id ? null : x.id; render(cont, o); const d = cont.querySelector('.rc-det'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      tr.addEventListener('click', ir); tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ir(); });
      bb.append(tr);
    });
    tb.append(bb); w.append(tb); w.classList.add('rc-full');
    // tarjetas para el teléfono
    const cards = el('div', 'rc-cards');
    F.slice(0, st.n).forEach((x) => {
      const b = el('button', 'rc-card' + (st.sel === x.id ? ' sel' : '')); b.type = 'button';
      const top = el('div', 'rc-card-top'); top.append(el('b', null, cpnCli(x, 'id')), el('small', null, x.ruta)); b.append(top);
      const nums = el('div', 'rc-card-num');
      [['Hl', n1(x.hl)], dinero ? ['Venta', mx(x.venta)] : ['Cajas', n1(x.cajas)], mg ? ['Nos deja', mx(x.neto)] : ['Va para', n1(x.proyHl)], ['Ritmo', x.ritmo == null ? 'nuevo' : (x.ritmo > 0 ? '+' : '') + pc(x.ritmo)]].forEach(([k, v]) => { const d = el('div'); d.append(el('small', null, k), el('b', null, v)); nums.append(d); });
      b.append(nums);
      const ban = x.banderas.filter((q, i, a) => a.indexOf(q) === i);
      if (ban.length) { const bd = el('div'); ban.forEach((q) => bd.append(el('span', 'pill ' + (TONO[q] || ''), q), document.createTextNode(' '))); b.append(bd); }
      b.addEventListener('click', () => { st.sel = st.sel === x.id ? null : x.id; render(cont, o); const d = cont.querySelector('.rc-det'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      cards.append(b);
    });
    const selC = st.sel && F.find((x) => x.id === st.sel);
    if (selC) cont.append(detalle(selC, DET, dinero, mg, () => { st.sel = null; render(cont, o); }));
    cont.append(w, cards);
    if (F.length > st.n) { const m = el('button', 'envf-chip', 'Ver ' + Math.min(60, F.length - st.n) + ' más (' + (F.length - st.n) + ' restantes)'); m.type = 'button'; m.addEventListener('click', () => { st.n += 60; render(cont, o); }); cont.append(m); }
    cont.append(el('p', 'pp-mia', 'Acumulado del mes con la venta de Power Sales. ' + (mg ? 'Margen = venta − costo de cada caja; "Nos deja" = margen − lo que cuesta visitarlo (diésel por visita de Motum). ' : '') + '"Va para" = Hl al cierre a este ritmo; Ritmo = contra su promedio de 3 meses. Saturación = todo menos XX Lager. Toca un cliente para ver su detalle.'));
  }

  /* Clientes en riesgo con su próxima visita (Willy, 17-nov-2026: Berenice y admin) */
  function riesgo(cont, o) {
    const st = o.estado || (o.estado = {});
    cont.replaceChildren();
    const F = (o.filas || []).filter((x) => x.enRiesgo && (!o.okRuta || o.okRuta(x.ruta)) && (!st.ruta || x.ruta === st.ruta));
    if (!F.length) { cont.append(el('p', 'pp-mia', 'Ningún cliente en riesgo con esos filtros.')); return; }
    const rutas = [...new Set((o.filas || []).filter((x) => x.enRiesgo && (!o.okRuta || o.okRuta(x.ruta))).map((x) => x.ruta))].sort((a, b) => rnum(a) - rnum(b));
    if (rutas.length > 1) { const sR = el('select', 'envf-in'); [['', 'Todas las rutas']].concat(rutas.map((r) => [r, r])).forEach(([v, t]) => { const op = el('option', null, t); op.value = v; sR.append(op); }); sR.value = st.ruta || ''; sR.style.maxWidth = '260px'; sR.addEventListener('change', () => { st.ruta = sR.value; riesgo(cont, o); }); cont.append(sR); }
    cont.append(el('p', 'pp-mia', F.length + ' clientes van cayendo 30% o más o llevan 10 días o más sin comprar. Ordenados por su próxima visita: ese día hay que ir a recuperarlos.'));
    const grupos = {};
    F.forEach((x) => { const k = x.proxVisita || 'sin'; (grupos[k] = grupos[k] || []).push(x); });
    Object.keys(grupos).sort().forEach((k) => {
      const g = el('div', 'rc-grupo');
      g.append(el('h4', null, k === 'sin' ? 'Sin día de visita programado' : 'Visita del ' + dia(k) + ' (' + grupos[k].length + ')'));
      const ul = el('ul', 'rc-riesgo');
      grupos[k].sort((a, b) => b.prom3Hl - a.prom3Hl).forEach((x) => {
        const li = el('li');
        const top = el('div', 'rc-card-top'); top.append(el('b', null, cpnCli(x, 'id')), el('small', null, ' ' + x.ruta));
        const mot = [];
        if ((x.ritmo || 0) <= -0.3) mot.push('va ' + Math.round(-x.ritmo * 100) + '% abajo: ' + n1(x.proyHl) + ' Hl contra ' + n1(x.prom3Hl) + ' de promedio');
        if (x.diasSinComprar >= 10) mot.push(x.diasSinComprar + ' días sin comprar');
        li.append(top, el('span', null, mot.join(' · ')), el('small', null, 'Le visitan: ' + (x.diasVisita.length ? x.diasVisita.join(', ') : '—') + ' · última compra ' + dia(x.ultimaCompra) + ((x.huecos || []).length ? ' · ofrecer ' + x.huecos.slice(0, 2).join(', ') : '')));
        ul.append(li);
      });
      g.append(ul); cont.append(g);
    });
  }

  /* Saturación semana a semana por ruta: grandes contra chicos, y seguimiento de los grandes sin saturación */
  function satSem(cont, o) {
    cont.replaceChildren();
    const SS = (o.sem || []).filter((x) => !o.okRuta || o.okRuta(x.ruta));
    if (!SS.length) { cont.append(el('p', 'pp-mia', 'Sin datos.')); return; }
    const semanas = [...new Set(SS.map((x) => x.semana))].sort();
    const w = el('div', 'tblwrap'); const t = el('table', 'cpn-t');
    const h = el('tr'); h.append(el('th', null, 'Ruta')); semanas.forEach((s0) => h.append(el('th', 'num', 'Sem. ' + dia(s0).replace(/^\S+\s/, '')))); h.append(el('th', null, '¿Se emparejó?'));
    t.append(el('thead')); t.tHead.append(h); const b = el('tbody');
    [...new Set(SS.map((x) => x.ruta))].sort((a, c) => rnum(a) - rnum(c)).forEach((r) => {
      const X = semanas.map((s0) => SS.find((x) => x.ruta === r && x.semana === s0) || {});
      const tr = el('tr'); tr.append(el('td', null, r));
      X.forEach((x) => { const td = el('td', 'num wrap'); td.append(el('b', null, pc(x.satRuta)), el('br'), el('small', null, 'grandes ' + pc(x.satGrandes) + ' · chicos ' + pc(x.satChicos))); tr.append(td); });
      const brecha = (x) => (x.satChicos != null && x.satGrandes != null ? x.satChicos - x.satGrandes : null);
      const a = brecha(X[0] || {}), z = brecha(X[X.length - 1] || {});
      tr.append(el('td', 'wrap', a == null || z == null ? '—' : Math.abs(z) < 0.02 ? 'Parejo' : z > 0 ? (z < a ? 'Mejorando: los chicos todavía llevan más' : 'No: los chicos llevan más que los grandes') : 'Los grandes llevan más'));
      b.append(tr);
    });
    t.append(b); w.append(t); cont.append(w);
    const casos = (o.filas || []).filter((x) => (x.banderas || []).includes('Grande sin saturación') && (!o.okRuta || o.okRuta(x.ruta))).sort((a, c) => c.hl - a.hl);
    if (casos.length) {
      cont.append(el('h4', 'rc-sub', 'Seguimiento: clientes grandes sin saturación'));
      const w2 = el('div', 'tblwrap'); const t2 = el('table', 'cpn-t'); const h2 = el('tr'); h2.append(el('th', null, 'Cliente'), el('th', null, 'Ruta'), el('th', 'num', 'Hl mes'));
      semanas.forEach((s0) => h2.append(el('th', 'num', 'Sem. ' + dia(s0).replace(/^\S+\s/, '')))); h2.append(el('th', 'num', 'Su ruta'));
      t2.append(el('thead')); t2.tHead.append(h2); const b2 = el('tbody');
      casos.forEach((x) => { const tr = el('tr'); tr.append(el('td', null, cpnCli(x, 'id')), el('td', null, x.ruta), el('td', 'num', n1(x.hl))); semanas.forEach((s0) => { const v = (x.satSem || []).find((q) => q[0] === s0); tr.append(el('td', 'num', v && v[1] != null ? pc(v[1]) : '—')); }); tr.append(el('td', 'num', pc(x.rutaSat))); b2.append(tr); });
      t2.append(b2); w2.append(t2); cont.append(w2);
    }
    cont.append(el('p', 'pp-mia', 'Saturación = todo menos XX Lager. Grandes = el 25% de los clientes que más compran en la ruta; chicos = el 40% que menos. Si después de hablar con el vendedor la saturación de un cliente grande sube, se ve aquí semana a semana.'));
  }

  window.CPN_CLI = { render, riesgo, satSem };
})();

/* Pantalla del admin */
(function () {
  if (!window.dash) return;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const est = {};
  dash.draw('rendCli', (e) => window.CPN_CLI.render(e, { filas: rows('clientes_mes'), det: rows('clientes_mes_det'), estado: est, dinero: true }));
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('data-vista') !== 'rendcli') return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = 'Rendimiento de clientes'; if (s) s.textContent = 'Acumulado del mes por cliente';
  }));
})();

/* Admin: calidad de datos de clientes (Power Sales) */
(function () {
  if (!window.dash) return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const st = { t: '', n: 40 };
  dash.draw('calidadCli', (e) => {
    e.replaceChildren();
    const Q = rows('calidad_clientes'); if (!Q.length) { e.append(el('p', 'note', 'Sin datos todavía.')); return; }
    const tipos = [...new Set(Q.map((q) => q.tipo))];
    const chips = el('div', 'envf-rapido');
    [['', 'Todos (' + Q.length + ')']].concat(tipos.map((t) => [t, t + ' (' + Q.filter((q) => q.tipo === t).length + ')'])).forEach(([v, t]) => { const b = el('button', 'envf-chip', t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.t === v)); b.addEventListener('click', () => { st.t = v; st.n = 40; dash.draw('calidadCli'); }); chips.append(b); });
    e.append(chips);
    const F = Q.filter((q) => !st.t || q.tipo === st.t);
    const w = el('div', 'tblwrap'); const t = el('table', 'cpn-t'); const h = el('tr'); ['Qué pasa', 'Ruta', 'Cliente', 'Detalle', 'Qué hacer'].forEach((x) => h.append(el('th', null, x)));
    t.append(el('thead')); t.tHead.append(h); const b = el('tbody');
    F.slice(0, st.n).forEach((q) => { const tr = el('tr'); tr.append(el('td', null, q.tipo), el('td', null, q.ruta), el('td', null, cpnCli(q, 'id')), el('td', 'wrap', q.detalle), el('td', 'wrap', q.sugerencia)); b.append(tr); });
    t.append(b); w.append(t); e.append(w);
    if (F.length > st.n) { const m = el('button', 'envf-chip', 'Ver más (' + (F.length - st.n) + ' restantes)'); m.type = 'button'; m.addEventListener('click', () => { st.n += 60; dash.draw('calidadCli'); }); e.append(m); }
  });
})();

(function () {
  if (!window.dash) return;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const e1 = {};
  dash.draw('riesgoCli', (e) => window.CPN_CLI.riesgo(e, { filas: rows('clientes_mes'), estado: e1 }));
  dash.draw('satSem', (e) => window.CPN_CLI.satSem(e, { sem: rows('saturacion_semanal'), filas: rows('clientes_mes') }));
})();
