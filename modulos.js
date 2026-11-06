/* Módulos de decisión: Hoy, Clientes, Productos, Canales, Utilidad, Bono, Temporada, mapa del mes y costo de flotilla. */
(function () {
  const F = window.CPN.fmt;
  const D = (id) => dash.data(id);
  const ok = (id) => D(id).status === 'ok';
  const rows = (id) => (ok(id) ? D(id).data : []);
  const one = (id, ruta) => rows(id).find((r) => r.ruta === ruta);
  const RUTAS7 = ['Ruta 1', 'Ruta 2', 'Ruta 3', 'Ruta 4', 'Ruta 6', 'Ruta 7', 'Ruta 13'];
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const kv = (parent, items) => items.forEach(([k, v, cls]) => { const d = el('div'); d.append(el('span', null, k)); const b = el('b', cls || null, v); d.append(b); parent.append(d); });
  const tile = (parent, k, v, s) => { const d = el('div', 'ht'); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); parent.append(d); };
  const money = (v) => F.money(v);
  const pct = (v) => F.pct(v);
  const hl = (v) => F.hl(v);
  const sign = (v) => (v >= 0 ? '+' : '') + F.pct(v);
  const rutaColor = (r) => window.CPN.routeColor[r] || '#6B7280';

  /* ---------- cálculos compartidos ---------- */
  dash.calc('bonoRuta', {
    inputs: ['diario', 'bono', 'metas'],
    fn: (diario, bono, metas) => {
      const n = new Set(diario.map((r) => r.fecha)).size;
      const all = [];
      bono.forEach((b) => {
        const out = RUTAS7.map((ru) => {
          const cajas = diario.filter((r) => r.ruta === ru).reduce((a, r) => a + (r[b.campo] || 0), 0);
          const proy = n ? cajas / n * 25 : 0;
          const m = metas.find((x) => x.ruta === ru) || {};
          return { id: b.id, ruta: ru, vendedor: m.vendedor || '', cajas, proyeccion: proy, minimo: b.minimo, normal: b.normal[ru] || 0, falta: Math.max(0, b.minimo - cajas), llega: proy >= b.minimo };
        }).sort((a, b2) => b2.cajas - a.cajas || b2.normal - a.normal);
        out.forEach((r, i) => { r.lugar = i + 1; });
        all.push(...out);
      });
      return all;
    },
  });

  dash.calc('margenMes', {
    inputs: ['diario', 'utilruta'],
    fn: (diario, utilruta) => {
      const u = {}; utilruta.forEach((r) => { u[r.ruta] = r.utilHl; });
      return diario.map((r) => ({ fecha: r.fecha, ruta: r.ruta, hl: r.hl, margen: r.hl * (u[r.ruta] || 800) }));
    },
  });

  /* ---------- HOY ---------- */
  function datosHoy() {
    const t = one('resumenDia', 'TOTAL'), m = one('mesRuta', 'TOTAL');
    if (!t || !m) return null;
    const dia = rows('resumenDia').filter((r) => r.ruta !== 'TOTAL');
    const margenAyer = rows('margenMes').filter((r) => r.fecha === t.fecha).reduce((a, r) => a + r.margen, 0);
    return { t, m, dia, margenAyer };
  }

  dash.draw('hoyFecha', (e) => { const x = datosHoy(); e.textContent = x ? 'venta del ' + F.largo(x.t.fecha) : '—'; });
  dash.draw('hoyTitulo', (e) => {
    const x = datosHoy(); if (!x) { e.textContent = '—'; return; }
    const r = x.m.proyeccion / x.m.metaHl;
    e.textContent = r >= 1 ? 'Vamos para la meta del mes' : r >= 0.95 ? 'Vamos casi en la meta del mes' : 'Vamos atrás de la meta del mes';
  });
  dash.draw('hoyTake', (e) => {
    const x = datosHoy(); if (!x) { e.textContent = '—'; return; }
    e.textContent = 'Ayer se vendieron ' + hl(x.t.hl) + ' Hl (' + money(x.t.venta) + ') con un margen estimado de ' + money(x.margenAyer) + '. Al ritmo actual cerramos noviembre en ' + hl(x.m.proyeccion) + ' Hl, ' + pct(x.m.proyeccion / x.m.metaHl) + ' de la meta.';
  });
  dash.draw('hoyTiles', (e) => {
    const x = datosHoy(); e.replaceChildren(); if (!x) return;
    tile(e, 'Venta de ayer', money(x.t.venta), hl(x.t.hl) + ' Hl');
    tile(e, 'Margen estimado ayer', money(x.margenAyer), 'antes de gastos');
    tile(e, 'Avance del mes', pct(x.m.avance), 'debería ir en ' + pct(x.m.esperado));
    tile(e, 'Hay que vender por día', hl(x.m.faltaPorDia) + ' Hl', 'para llegar a ' + F.int(x.m.metaHl) + ' Hl');
  });

  dash.draw('hoyAcciones', (ol) => {
    ol.replaceChildren();
    const x = datosHoy(); if (!x) return;
    const acc = [];
    // 1. Rutas con problemas ayer
    x.dia.forEach((r) => {
      if (r.visHechas && r.efectividad < 0.5) acc.push({ p: 90 + (0.5 - r.efectividad) * 20, tag: r.ruta, txt: 'Hablar con ' + r.vendedor + ': ayer vendió en ' + r.conPedido + ' de ' + r.visHechas + ' visitas (' + pct(r.efectividad) + '). Revisar por qué no le compran.' });
      if (r.visProg && r.cumplimiento < 0.7) acc.push({ p: 85, tag: r.ruta, txt: r.vendedor + ' hizo ' + r.progHechas + ' de ' + r.visProg + ' visitas programadas. Confirmar que hoy termine su ruta completa.' });
      if (r.inicio && r.inicio > '10:00') acc.push({ p: 60, tag: r.ruta, txt: r.vendedor + ' salió a las ' + r.inicio + '. Pedir que salga antes de las 9:00.' });
    });
    // 2. Ruta más atrasada contra su meta
    const mr = rows('mesRuta').filter((r) => r.ruta !== 'TOTAL');
    if (mr.length) {
      const peor = mr.slice().sort((a, b) => a.avance / a.esperado - b.avance / b.esperado)[0];
      if (peor.avance < peor.esperado * 0.9) acc.push({ p: 80, tag: peor.ruta, txt: 'Es la ruta más atrasada: lleva ' + pct(peor.avance) + ' de su meta y debería ir en ' + pct(peor.esperado) + '. Necesita ' + hl(peor.faltaPorDia) + ' Hl por día para llegar.' });
    }
    // 3. Clientes en riesgo que más dinero dejan de dar
    rows('clientes').filter((c) => c.estado === 'En riesgo' && RUTAS7.includes(c.ruta)).sort((a, b) => b.perdidaMes - a.perdidaMes).slice(0, 3).forEach((c) => {
      acc.push({ p: 70 + Math.min(20, c.perdidaMes / 500), tag: c.ruta, txt: 'Visitar a ' + c.negocio + ': bajó de ' + hl(c.hlMesAntes) + ' a ' + hl(c.hlMes3) + ' Hl al mes: se dejan de vender ' + money(c.ventaPerdidaMes || 0) + ' al mes (' + money(c.perdidaMes) + ' de margen).' });
    });
    // 4. Bono
    const bcfg0 = rows('bono')[0]; const bono = bcfg0 ? rows('bonoRuta').filter((r) => r.id === bcfg0.id) : [];
    if (bono.length && bcfg0) {
      const lider = bono[0]; const lejos = bono.filter((r) => !r.llega).sort((a, b) => a.proyeccion - b.proyeccion)[0];
      acc.push({ p: 55, tag: 'Bono', txt: 'Bono ' + bcfg0.producto + ': va ganando ' + lider.ruta + ' (' + lider.vendedor + ') con ' + F.hl(lider.cajas) + ' cajas.' + (lejos ? ' ' + lejos.ruta + ' no llegaría al mínimo de ' + bcfg0.minimo + ' cajas a este ritmo.' : '') });
    }
    // 5. Hueco de producto más grande
    const act = rows('clientes').filter((c) => !['Inactivo', 'Perdido'].includes(c.estado) && RUTAS7.includes(c.ruta));
    if (act.length) {
      const cnt = {}; act.forEach((c) => c.huecosFoco.forEach((h) => { const k = c.ruta + '|' + h; cnt[k] = (cnt[k] || 0) + 1; }));
      const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (best) { const [ru, prod] = best[0].split('|'); acc.push({ p: 50, tag: ru, txt: best[1] + ' clientes activos de ' + ru + ' no compran ' + prod + '. Darle al vendedor la lista (sección Productos) para ofrecerlo.' }); }
    }
    acc.sort((a, b) => b.p - a.p).slice(0, 7).forEach((a) => {
      const li = el('li'); const p = el('span', 'pill ' + (a.p >= 80 ? 'bad' : a.p >= 60 ? 'warn' : 'ok'), a.tag); if (a.tag.startsWith('Ruta')) { p.style.color = rutaColor(a.tag); }
      li.append(p, el('span', null, a.txt)); ol.append(li);
    });
    if (!ol.children.length) ol.append(el('li', null, 'Todo en orden: ninguna ruta tuvo alertas ayer.'));
  });

  dash.draw('hoySemana', (ul) => {
    ul.replaceChildren();
    const s = rows('semana'); if (!s.length) return;
    const t = s.find((r) => r.ruta === 'TOTAL'); const rr = s.filter((r) => r.ruta !== 'TOTAL');
    const add = (txt) => ul.append(el('li', null, txt));
    add('Semana del ' + F.dia(t.inicio) + ': ' + hl(t.hl) + ' Hl de ' + hl(t.metaSemana) + ' de meta (' + pct(t.avance) + ') con ' + t.dias + ' de 6 días.');
    add('Mejor ruta: ' + rr[0].ruta + ' (' + rr[0].vendedor + ') con ' + pct(rr[0].avance) + ' de su meta semanal.');
    const u = rr[rr.length - 1]; add('Más atrasada: ' + u.ruta + ' (' + u.vendedor + ') con ' + pct(u.avance) + '. Revisar con él su programación.');
    const cl = rows('clientes').filter((c) => RUTAS7.includes(c.ruta));
    const ries = cl.filter((c) => c.estado === 'En riesgo'); const per = cl.filter((c) => c.estado === 'Perdido');
    if (cl.length) add(ries.length + ' clientes en riesgo y ' + per.length + ' perdidos en las 7 rutas; juntos son unos ' + money(ries.concat(per).reduce((a, c) => a + c.perdidaMes, 0)) + ' de margen al mes. Repartir la lista por vendedor.');
  });

  dash.draw('hoyMes', (ul) => {
    ul.replaceChildren();
    const m = one('mesRuta', 'TOTAL'); if (!m) return;
    const add = (txt) => ul.append(el('li', null, txt));
    add('Proyección de noviembre: ' + hl(m.proyeccion) + ' Hl contra ' + F.int(m.metaHl) + ' de meta y ' + hl(m.nov25Hl) + ' de noviembre 2025 (' + sign(m.proyeccion / m.nov25Hl - 1) + ').');
    const tp = rows('temporada').filter((r) => r.serie === 'Empresa');
    const dic = tp.find((r) => r.mes === 12), nov = tp.find((r) => r.mes === 11);
    if (dic && nov) add('Diciembre 2025 fue ' + F.int(dic.hl2025) + ' Hl, ' + sign(dic.hl2025 / nov.hl2025 - 1) + ' contra noviembre. Preparar pedido y viajes para ese salto.');
    const can = rows('canales').filter((c) => c.hlMes3 > 0 && c.activos >= 10);
    const caida = can.filter((c) => c.hlMes3_2025 > 0).sort((a, b) => a.hlMes3 / a.hlMes3_2025 - b.hlMes3 / b.hlMes3_2025)[0];
    if (caida) add('Canal con más caída: ' + caida.canal + ', ' + sign(caida.hlMes3 / caida.hlMes3_2025 - 1) + ' contra el mismo periodo de 2025 (' + caida.perdidos + ' clientes perdidos).');
    const pr = rows('productos'); const fam = {};
    pr.filter((p) => RUTAS7.includes(p.ruta)).forEach((p) => { const f = fam[p.marca] || (fam[p.marca] = { hl: 0, u: 0 }); f.hl += p.hlMes3; f.u += p.utilMes; });
    const top = Object.entries(fam).filter(([, v]) => v.hl > 5).map(([k, v]) => [k, v.u / v.hl]).sort((a, b) => b[1] - a[1])[0];
    if (top) add('La marca que más deja por hectolitro es ' + top[0] + ' (' + money(top[1]) + '/Hl). Es la mejor para promociones y para el bono.');
  });

  /* ---------- CLIENTES ---------- */
  const filtrosCli = () => ({ ruta: (document.getElementById('cli-ruta') || {}).value || '', estado: (document.getElementById('cli-estado') || {}).value || 'riesgo', q: ((document.getElementById('cli-buscar') || {}).value || '').trim().toLowerCase() });
  dash.draw('cliNota', (e) => { const mm = rows('megameta')[0]; e.textContent = mm ? 'Megabase al ' + mm.corte.split('-').reverse().join('/') + '. Compara el promedio de ' + mm.mesesUlt3.join('-') + ' contra ' + mm.mesesAntes[0] + '-' + mm.mesesAntes[mm.mesesAntes.length - 1] + '. En riesgo: no compró el último mes o bajó más de 40%. Perdido: dejó de comprar los últimos 2 meses.' : '—'; });
  dash.draw('cliKpis', (e) => {
    e.replaceChildren(); const f = filtrosCli();
    const cl = rows('clientes').filter((c) => !f.ruta || c.ruta === f.ruta); if (!cl.length) return;
    const n = (s) => cl.filter((c) => c.estado === s).length;
    kv(e, [['Activos', F.int(cl.filter((c) => !['Inactivo', 'Perdido'].includes(c.estado)).length)], ['Creciendo', F.int(n('Creciendo')), 'ok'], ['En riesgo', F.int(n('En riesgo')), 'warn'], ['Perdidos', F.int(n('Perdido')), 'bad'], ['Nuevos', F.int(n('Nuevo'))],
      ['Margen en riesgo al mes', money(cl.filter((c) => ['En riesgo', 'Perdido'].includes(c.estado)).reduce((a, c) => a + c.perdidaMes, 0)), 'bad']]);
  });
  dash.draw('cliLista', (e) => {
    e.replaceChildren(); const f = filtrosCli();
    let cl = rows('clientes').filter((c) => (!f.ruta || c.ruta === f.ruta));
    if (f.estado === 'riesgo') cl = cl.filter((c) => ['En riesgo', 'Perdido'].includes(c.estado)).sort((a, b) => b.perdidaMes - a.perdidaMes);
    else if (f.estado === 'top') cl = cl.filter((c) => c.estado !== 'Inactivo').sort((a, b) => b.utilMes - a.utilMes);
    else if (f.estado) cl = cl.filter((c) => c.estado === f.estado).sort((a, b) => b.hlMes3 - a.hlMes3);
    else cl = cl.slice().sort((a, b) => b.hlMes3 - a.hlMes3);
    if (f.q) cl = cl.filter((c) => (c.negocio + ' ' + c.id).toLowerCase().includes(f.q));
    e.append(el('p', 'note', cl.length + ' clientes' + (cl.length > 60 ? ' · se muestran los primeros 60' : '')));
    const cls = { 'En riesgo': 'warn', Perdido: 'bad', Creciendo: 'ok', Nuevo: 'ok', Estable: '', Inactivo: '' };
    cl.slice(0, 60).forEach((c) => {
      const card = el('div', 'cli');
      const top = el('div', 'cli-top');
      const nom = el('div'); nom.append(el('b', null, c.negocio), el('small', null, c.ruta + ' · #' + c.id + ' · ' + c.giro + (c.colonia ? ' · ' + c.colonia : '')));
      top.append(nom, el('span', 'pill ' + (cls[c.estado] || ''), c.estado));
      const nums = el('div', 'cli-nums');
      [['Antes', hl(c.hlMesAntes) + ' Hl/mes'], ['Ahora', hl(c.hlMes3) + ' Hl/mes'], ['Margen', money(c.utilMes) + '/mes'], ['Última compra', c.ultimaCompra ? c.ultimaCompra.split('-').reverse().join('/') : '—']].forEach(([k, v]) => { const d = el('div'); d.append(el('span', null, k), el('b', null, v)); nums.append(d); });
      card.append(top, nums);
      const ofrecer = [...new Set([...(c.huecosFoco || []), ...(c.huecos || [])])].filter((h) => !(h === 'Miller' && (c.huecosFoco || []).includes('Miller 4x6')) && !(h === 'Amstel Ultra' && (c.huecosFoco || []).some((x) => x.startsWith('Amstel'))));
      if (ofrecer.length && c.estado !== 'Inactivo') card.append(el('p', 'cli-of', 'Ofrecer: ' + ofrecer.join(', ')));
      if (c.perdidaMes > 0 && ['En riesgo', 'Perdido'].includes(c.estado)) card.append(el('p', 'cli-pe', 'Se dejan de vender unos ' + money(c.ventaPerdidaMes || 0) + ' al mes · margen que se pierde: ' + money(c.perdidaMes)));
      e.append(card);
    });
  });
  ['cli-ruta', 'cli-estado', 'cli-buscar'].forEach((id) => { const x = document.getElementById(id); if (x) x.addEventListener(id === 'cli-buscar' ? 'input' : 'change', () => { dash.draw('cliKpis'); dash.draw('cliLista'); }); });

  /* ---------- PRODUCTOS ---------- */
  dash.draw('penTabla', (e) => {
    e.replaceChildren(); const pr = rows('productos').filter((p) => RUTAS7.includes(p.ruta)); if (!pr.length) return;
    const fam = {}; pr.forEach((p) => { fam[p.marca] = (fam[p.marca] || 0) + p.hlMes3; });
    const marcas = Object.entries(fam).filter(([k, v]) => v > 1 && k !== 'Otras').sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    const t = el('table', 'cpn-t pen'); const th = el('tr'); th.append(el('th', null, 'Marca')); RUTAS7.forEach((r) => th.append(el('th', 'num', r.replace('Ruta ', 'R')))); t.append(el('thead')); t.tHead.append(th);
    const tb = el('tbody');
    marcas.forEach((mk) => {
      const tr = el('tr'); const n = el('td', null, mk); n.style.fontWeight = '600'; tr.append(n);
      RUTAS7.forEach((ru) => { const p = pr.find((x) => x.ruta === ru && x.marca === mk); const v = p ? p.penetracion : 0; const td = el('td', 'num', v ? pct(v) : '—'); td.style.background = 'color-mix(in srgb, var(--g) ' + Math.round(v * 85) + '%, transparent)'; if (v > 0.55) td.style.color = '#fff'; td.title = p ? p.clientesCompran + ' de ' + p.clientesActivos + ' clientes' : ''; tr.append(td); });
      tb.append(tr);
    });
    t.append(tb); e.append(t);
  });
  dash.draw('huecosTabla', (e) => {
    e.replaceChildren(); const act = rows('clientes').filter((c) => !['Inactivo', 'Perdido'].includes(c.estado) && RUTAS7.includes(c.ruta)); if (!act.length) return;
    const focos = ['Miller 4x6', 'Amstel Ultra lata 12 oz', 'Amstel Ultra 24 oz'];
    const t = el('table', 'cpn-t'); const hr = el('tr'); ['Ruta', 'Vendedor', 'Clientes activos'].concat(focos.map((f) => 'No compran ' + f)).forEach((h, i) => hr.append(el('th', i >= 2 ? 'num' : null, h))); t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody');
    RUTAS7.forEach((ru) => {
      const a = act.filter((c) => c.ruta === ru); const m = rows('metas').find((x) => x.ruta === ru) || {};
      const tr = el('tr'); const k = el('td', null, ru); k.style.color = rutaColor(ru); k.style.fontWeight = '600'; tr.append(k, el('td', null, m.vendedor || ''), el('td', 'num', String(a.length)));
      focos.forEach((f) => { const n = a.filter((c) => c.huecosFoco.includes(f)).length; tr.append(el('td', 'num', n + ' (' + pct(a.length ? n / a.length : 0) + ')')); });
      tb.append(tr);
    });
    t.append(tb); e.append(t);
    e.append(el('p', 'note', 'Para ver los nombres: sección Clientes, filtra por ruta y en cada cliente aparece "Ofrecer".'));
  });

  /* ---------- CANALES ---------- */
  dash.draw('canNota', (e) => { const mm = rows('megameta')[0]; e.textContent = mm ? 'Según el canal que Heineken tiene registrado en la megabase (al ' + mm.corte.split('-').reverse().join('/') + '). Hectolitros al mes = promedio de ' + mm.mesesUlt3.join('-') + '.' : '—'; });
  dash.draw('canCards', (e) => {
    e.replaceChildren();
    rows('canales').filter((c) => c.clientes > 0).forEach((c) => {
      const card = el('div', 'can'); card.append(el('h4', null, c.canal));
      const g = el('div', 'kv'); const d = c.hlMes3_2025 ? c.hlMes3 / c.hlMes3_2025 - 1 : 0;
      kv(g, [['Hl al mes', hl(c.hlMes3)], ['vs 2025', sign(d), d >= 0 ? 'ok' : 'bad'], ['Clientes activos', F.int(c.activos)], ['Hl por cliente', hl(c.hlPorCliente)], ['Margen al mes', money(c.utilMes)], ['Margen por Hl', money(c.utilHl)], ['En riesgo', F.int(c.enRiesgo), c.enRiesgo ? 'warn' : ''], ['Perdidos', F.int(c.perdidos), c.perdidos ? 'bad' : '']]);
      card.append(g); e.append(card);
    });
  });
  dash.draw('girosTabla', (e) => {
    e.replaceChildren(); const g = rows('giros').filter((x) => x.clientes >= 2).slice(0, 25); if (!g.length) return;
    const t = el('table', 'cpn-t'); const hr = el('tr'); ['Giro', 'Canal', 'Clientes', 'Hl al mes', 'Hl por cliente', 'Margen al mes'].forEach((h, i) => hr.append(el('th', i >= 2 ? 'num' : null, h))); t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody'); g.forEach((x) => { const tr = el('tr'); tr.append(el('td', null, x.giro), el('td', null, x.canal), el('td', 'num', String(x.clientes)), el('td', 'num', hl(x.hlMes3)), el('td', 'num', hl(x.hlPorCliente)), el('td', 'num', money(x.utilMes))); tb.append(tr); });
    t.append(tb); e.append(t);
  });

  /* ---------- UTILIDAD ---------- */
  dash.draw('utKpis', (e) => {
    e.replaceChildren(); const mm = rows('margenMes'); const m = one('mesRuta', 'TOTAL'); if (!mm.length || !m) return;
    const tot = mm.reduce((a, r) => a + r.margen, 0); const n = m.diasTrans;
    kv(e, [['Margen del mes a hoy', money(tot)], ['Proyección al cierre', money(n ? tot / n * 25 : 0)], ['Margen por día', money(n ? tot / n : 0)], ['Margen por Hl', money(m.hlMes ? tot / m.hlMes : 0)]]);
  });
  dash.draw('utRutas', (e) => {
    e.replaceChildren(); const u = rows('utilruta').filter((r) => RUTAS7.includes(r.ruta)).sort((a, b) => b.utilMes - a.utilMes); if (!u.length) return;
    const max = d3.max(u, (r) => r.utilMes);
    u.forEach((r) => { const row = el('div', 'brandrow'); const n = el('span', 'chip'); const sw = el('i'); sw.style.background = rutaColor(r.ruta); n.append(sw, el('span', null, r.ruta)); const bar = el('div', 'bar'); const f = el('i'); f.style.width = (r.utilMes / max * 100) + '%'; f.style.background = rutaColor(r.ruta); bar.append(f); const v = el('span', null, money(r.utilMes)); v.style.textAlign = 'right'; row.append(n, bar, v); e.append(row); const s = el('p', 'note', money(r.utilHl) + ' por Hl · ' + hl(r.hlMes3) + ' Hl al mes'); s.style.margin = '-4px 0 6px'; e.append(s); });
  });
  dash.draw('utMarcas', (e) => {
    e.replaceChildren(); const pr = rows('productos').filter((p) => RUTAS7.includes(p.ruta)); if (!pr.length) return;
    const fam = {}; pr.forEach((p) => { const f = fam[p.marca] || (fam[p.marca] = { hl: 0, u: 0 }); f.hl += p.hlMes3; f.u += p.utilMes; });
    const rr = Object.entries(fam).filter(([k, v]) => v.hl > 1 && k !== 'Otras').map(([k, v]) => ({ marca: k, uhl: v.u / v.hl, hl: v.hl, u: v.u })).sort((a, b) => b.uhl - a.uhl);
    const max = d3.max(rr, (r) => r.uhl);
    rr.forEach((r) => { const row = el('div', 'brandrow'); const n = el('span', 'chip'); const sw = el('i'); sw.style.background = window.CPN.brandColor[r.marca] || '#888'; n.append(sw, el('span', null, r.marca)); const bar = el('div', 'bar'); const f = el('i'); f.style.width = (r.uhl / max * 100) + '%'; f.style.background = window.CPN.brandColor[r.marca] || '#888'; bar.append(f); const v = el('span', null, money(r.uhl)); v.style.textAlign = 'right'; row.append(n, bar, v); e.append(row); });
    e.append(el('p', 'note', 'Pesos de margen por hectolitro. Ojo: una marca puede dejar mucho por Hl pero venderse poco.'));
  });

  /* ---------- BONO ---------- */
  window.CPN.bonoSel = window.CPN.bonoSel || 'miller';
  const bcfg = () => rows('bono').find((b) => b.id === window.CPN.bonoSel) || rows('bono')[0];
  const bonoRows = () => { const b = bcfg(); return b ? rows('bonoRuta').filter((r) => r.id === b.id) : []; };
  dash.draw('bonoProd', (e) => { const b = bcfg(); e.textContent = b ? b.producto + ' · mínimo ' + b.minimo + ' cajas por ruta' + (b.minimoFuente === 'sugerido' ? ' (sugerido)' : '') : '—'; });
  dash.draw('bonoTitulo', (e) => { const r = bonoRows(); e.textContent = !r.length ? '—' : r[0].cajas > 0 ? 'Va ganando ' + r[0].ruta + ': ' + r[0].vendedor : 'Nadie lo ha vendido este mes'; });
  dash.draw('bonoTake', (e) => {
    const r = bonoRows(), b = bcfg(); if (!r.length || !b) { e.textContent = '—'; return; }
    const tot = r.reduce((a, x) => a + x.proyeccion, 0), normal = r.reduce((a, x) => a + x.normal, 0);
    const bolsa = Math.max(0, tot - normal) * b.utilCaja * b.pctBolsa;
    e.textContent = 'Si siguen a este ritmo, las 7 rutas venderían ' + F.hl(tot) + ' cajas contra ' + F.hl(normal) + ' de venta normal. La bolsa del 1er lugar sería de unos ' + money(bolsa) + ' (' + pct(b.pctBolsa) + ' del margen extra). ' + r.filter((x) => x.llega).length + ' de 7 rutas llegarían al mínimo.';
  });
  dash.draw('bonoTiles', (e) => {
    e.replaceChildren(); const r = bonoRows(), b = bcfg(); if (!r.length || !b) return;
    const tot = r.reduce((a, x) => a + x.cajas, 0);
    tile(e, 'Cajas vendidas', F.hl(tot), 'las 7 rutas en el mes'); tile(e, 'Líder', F.hl(r[0].cajas) + ' cajas', r[0].ruta); tile(e, 'Ya pasaron el mínimo', r.filter((x) => x.cajas >= b.minimo).length + ' de 7', b.minimo + ' cajas'); tile(e, 'Margen por caja', money(b.utilCaja), 'lo que deja cada caja');
  });
  dash.draw('bonoCarrera', (e) => {
    e.replaceChildren(); const r = bonoRows(), b = bcfg(); if (!r.length || !b) return;
    const max = Math.max(b.minimo * 1.5, d3.max(r, (x) => x.cajas) * 1.1);
    r.forEach((x) => {
      const row = el('div', 'carrera');
      const n = el('div', 'car-n'); n.append(el('b', null, x.lugar + '. ' + x.ruta), el('small', null, x.vendedor + ' · normal ' + F.hl(x.normal)));
      const g = el('div', 'gauge'); const f = el('i'); f.style.width = Math.min(100, x.cajas / max * 100) + '%'; f.style.background = rutaColor(x.ruta); const m = el('em'); m.style.left = (b.minimo / max * 100) + '%'; g.append(f, m);
      const v = el('div', 'car-v'); v.append(el('b', null, F.hl(x.cajas)), el('small', x.llega ? 'ok' : 'bad', 'proy. ' + F.hl(x.proyeccion)));
      row.append(n, g, v); e.append(row);
    });
  });

  /* ---------- TEMPORADA ---------- */
  dash.draw('tempNota', (e) => { const mm = rows('megameta')[0]; e.textContent = mm ? 'Hectolitros de toda la empresa por mes (megabase). En 2026 vamos ' + sign(mm.crecimientoYTD) + ' contra 2025 de enero a ' + mm.mesesUlt3[2] + '. La línea punteada es la proyección: lo del año pasado por ese crecimiento.' : '—'; });
  dash.draw('tempChart', (e) => {
    e.replaceChildren(); const t = rows('temporada').filter((r) => r.serie === 'Empresa'); if (!t.length) return;
    const nov = one('mesRuta', 'TOTAL');
    const W = Math.max(300, e.clientWidth || 600), H = 240, mg = { t: 16, r: 14, b: 26, l: 44 };
    const svg = d3.select(e).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const x = d3.scaleLinear([1, 12], [mg.l, W - mg.r]); const y = d3.scaleLinear([0, d3.max(t, (r) => Math.max(r.hl2025, r.hl2026 || 0, r.proyeccion || 0)) * 1.12], [H - mg.b, mg.t]);
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', mg.l - 6).attr('y', (v) => y(v) + 4).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((v) => F.int(v));
    svg.append('g').selectAll('text').data(t).join('text').attr('x', (r) => x(r.mes)).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((r) => r.mesNombre);
    const line = d3.line().x((r) => x(r.mes)).y((r) => y(r.v));
    svg.append('path').attr('d', line(t.map((r) => ({ mes: r.mes, v: r.hl2025 })))).attr('fill', 'none').attr('stroke', 'var(--cds-chart-muted)').attr('stroke-width', 2);
    const r26 = t.filter((r) => r.hl2026 != null).map((r) => ({ mes: r.mes, v: r.hl2026 }));
    svg.append('path').attr('d', line(r26)).attr('fill', 'none').attr('stroke', 'var(--g)').attr('stroke-width', 2.5);
    const pr = t.filter((r) => r.proyeccion != null).map((r) => ({ mes: r.mes, v: r.proyeccion }));
    if (r26.length && pr.length) svg.append('path').attr('d', line([r26[r26.length - 1]].concat(pr))).attr('fill', 'none').attr('stroke', 'var(--gold)').attr('stroke-width', 2).attr('stroke-dasharray', '5 4');
    if (nov) svg.append('circle').attr('cx', x(11)).attr('cy', y(nov.proyeccion)).attr('r', 5).attr('fill', 'var(--gold)').attr('stroke', 'var(--g)').attr('stroke-width', 2);
    const lg = d3.select(e).append('div').attr('class', 'legend');
    [['2025', 'var(--cds-chart-muted)'], ['2026', 'var(--g)'], ['Proyección', 'var(--gold)'], ['Noviembre al ritmo de Power Sales (7 rutas)', 'var(--gold)']].forEach(([a, c]) => { const s = lg.append('span'); s.append('i').style('background', c); s.append('span').text(a); });
  });
  dash.draw('tempTabla', (e) => {
    e.replaceChildren(); const t = rows('temporada').filter((r) => r.serie === 'Empresa' && r.proyeccion != null); if (!t.length) return;
    const all = rows('temporada').filter((r) => r.serie === 'Empresa');
    const tb = el('table', 'cpn-t'); const hr = el('tr'); ['Mes', 'Hl 2025', 'Proyección 2026', 'vs mes anterior 2025'].forEach((h, i) => hr.append(el('th', i ? 'num' : null, h))); tb.append(el('thead')); tb.tHead.append(hr);
    const body = el('tbody');
    t.concat(all.filter((r) => r.mes <= 2).map((r) => Object.assign({}, r, { sig: true }))).forEach((r) => {
      const prev = all.find((x) => x.mes === (r.mes === 1 ? 12 : r.mes - 1));
      const tr = el('tr'); tr.append(el('td', null, r.mesNombre + (r.sig ? ' 2027' : '')), el('td', 'num', F.int(r.hl2025)), el('td', 'num', r.proyeccion != null ? F.int(r.proyeccion) : '—'), el('td', 'num', prev ? sign(r.hl2025 / prev.hl2025 - 1) : '—'));
      body.append(tr);
    });
    tb.append(body); e.append(tb);
    e.append(el('p', 'note', 'Incluye todas las rutas de la megabase (también la 5, eventos y la 12).'));
  });

  /* ---------- FLOTILLA: costo por caja ---------- */
  dash.draw('fCosto', (e) => {
    const f = rows('flotilla')[0]; const d = rows('diario'); if (!f || !d.length) { e.textContent = '—'; return; }
    const ini = f.inicio; const fin = new Date(new Date(ini + 'T12:00:00').getTime() + 6 * 864e5).toISOString().slice(0, 10);
    const gps = ['Ruta 1', 'Ruta 3', 'Ruta 6', 'Ruta 7', 'Ruta 13'];
    const cajas = d.filter((r) => r.fecha >= ini && r.fecha <= fin && gps.includes(r.ruta)).reduce((a, r) => a + r.cajas, 0);
    e.textContent = cajas ? money(f.costoDiesel / cajas) + ' por caja' : 'sin cajas de esa semana';
  });
})();
