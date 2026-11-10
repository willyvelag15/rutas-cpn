/* Dirección (IA): pronóstico de cierre, vendedores, oportunidades, bonificación, km por ruta y alertas de Hoy. */
(function () {
  const F = window.CPN.fmt;
  const rows = (id) => (dash.data(id).status === 'ok' ? dash.data(id).data : []);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const color = (r) => (window.CPN.routeColor && window.CPN.routeColor[r]) || '#6B7280';
  const RUTAS = ['Ruta 1', 'Ruta 2', 'Ruta 3', 'Ruta 4', 'Ruta 6', 'Ruta 7', 'Ruta 13'];
  const pct = (v) => (v == null ? '—' : F.pct(v));
  const hl = (v) => (v == null ? '—' : F.hl(v));
  const signo = (v) => (v == null ? '—' : (v >= 0 ? '+' : '') + F.pct(v));
  const kv = (parent, items) => { const g = el('div', 'kv'); items.forEach(([k, v, cls]) => { const d = el('div'); d.append(el('span', null, k), el('b', cls || null, v)); g.append(d); }); parent.append(g); };
  const rutaTag = (r) => { const s = el('span', 'hal-r', r); s.style.color = color(r); return s; };
  const tabla = (parent, cols, data, fila) => {
    const w = el('div', 'tabla-scroll'); const t = el('table', 'cpn-t'); const hr = el('tr');
    cols.forEach(([h, num]) => hr.append(el('th', num ? 'num' : null, h))); t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody'); data.forEach((r) => { const tr = el('tr'); fila(r).forEach(([v, num, cls, col]) => { const td = el('td', [num ? 'num' : '', cls || ''].join(' ').trim() || null, v); if (col) { td.style.color = col; td.style.fontWeight = '600'; } tr.append(td); }); tb.append(tr); });
    t.append(tb); w.append(t); parent.append(w);
  };
  // selector de ruta reutilizable
  const st = { ven: 'Ruta 1', opo: 'todas', bon: 'Recibe de más y no crece', masA: false, masP: false, masB: false, masS: false };
  const seg = (parent, opciones, actual, onPick) => {
    const s = el('div', 'seg seg-sm');
    opciones.forEach(([k, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === k)); b.addEventListener('click', () => onPick(k)); s.append(b); });
    parent.append(s);
  };
  const mas = (parent, total, mostrando, onClick) => {
    if (total > mostrando) { const b = el('button', 'hal-mas', 'Ver los ' + total); b.type = 'button'; b.addEventListener('click', onClick); parent.append(b); }
  };
  const item = (ol, tag, titulo, texto, meta, accion, cls) => {
    const li = el('li'); const izq = el('div', 'hal-izq');
    if (cls) izq.append(el('span', 'pill ' + cls[0], cls[1]));
    if (tag) izq.append(rutaTag(tag));
    const c = el('div', 'hal-cuerpo'); c.append(el('b', null, titulo)); if (texto) c.append(el('span', null, texto)); if (meta) c.append(el('small', null, meta)); if (accion) c.append(el('em', null, '→ ' + accion));
    li.append(izq, c); ol.append(li);
  };

  /* ================= PRONÓSTICO ================= */
  dash.draw('proResumen', (e) => {
    e.replaceChildren(); const t = rows('pronostico').find((p) => p.ruta === 'TOTAL'); if (!t) { e.append(el('p', 'note', 'Sin datos.')); return; }
    const llega = t.pronostico >= t.metaHl;
    e.append(el('h2', 'pro-tit', llega ? 'Vamos a llegar a la meta' : 'A este ritmo no llegamos a la meta'));
    e.append(el('p', 'take', 'Cerraríamos noviembre en ' + F.int(t.pronostico) + ' Hl (entre ' + F.int(t.bajo) + ' y ' + F.int(t.alto) + '). La meta es ' + F.int(t.metaHl) + ' Hl sin la Ruta 5. Faltan ' + t.diasRestan + ' días hábiles: hay que vender ' + hl(t.necesitaDia) + ' Hl por día y esta semana vamos en ' + hl(t.ritmoSemana) + '.'));
    const tiles = el('div', 'hal-tiles');
    const tt = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    tt('Pronóstico de cierre', F.int(t.pronostico) + ' Hl', pct(t.pronostico / t.metaHl) + ' de la meta', llega ? '' : 'bad');
    tt('Probabilidad de llegar', pct(t.probMeta), 'con lo que se ha vendido día a día', t.probMeta < 0.5 ? 'bad' : '');
    tt('Hay que vender por día', hl(t.necesitaDia) + ' Hl', 'hoy vamos en ' + hl(t.ritmoSemana), t.necesitaDia > t.ritmoSemana ? 'bad' : '');
    tt('Contra noviembre 2025', signo(t.vsNov25), F.int(t.nov25Hl) + ' Hl el año pasado');
    e.append(tiles);
  });
  dash.draw('proRutas', (e) => {
    e.replaceChildren(); const P = rows('pronostico').filter((p) => p.ruta !== 'TOTAL');
    const ol = el('ol', 'acciones');
    P.slice().sort((a, b) => a.probMeta - b.probMeta).forEach((p) => {
      const llega = p.pronostico >= p.metaHl;
      const rec = (p.recuperar || []).map((x) => x.cliente).join(', ');
      item(ol, p.ruta, p.vendedor + ': cierra en ' + F.int(p.pronostico) + ' de ' + F.int(p.metaHl) + ' Hl (' + pct(p.pronostico / p.metaHl) + ')',
        'Lleva ' + hl(p.hlMes) + ' Hl. Necesita ' + hl(Math.max(0, p.necesitaDia)) + ' Hl por día y esta semana vendió ' + hl(p.ritmoSemana) + '. Probabilidad de llegar: ' + pct(p.probMeta) + '.',
        llega ? null : (rec ? 'Clientes que ayudan a cerrar la diferencia: ' + rec + ' (' + hl(p.recuperarHl) + ' Hl si vuelven a comprar normal).' : null),
        null, llega ? ['ok', 'Llega'] : p.probMeta >= 0.3 ? ['warn', 'Apretado'] : ['bad', 'No llega']);
    });
    e.append(ol);
  });

  /* ================= VENDEDORES ================= */
  dash.draw('venRanking', (e) => {
    e.replaceChildren(); const V = rows('vendedores'); if (!V.length) return;
    const ol = el('ol', 'acciones');
    V.forEach((v) => {
      const li = el('li'); const izq = el('div', 'ven-score'); const n = el('b', null, String(v.calificacion)); n.style.color = v.calificacion >= 85 ? 'var(--color-ok)' : v.calificacion >= 70 ? 'var(--color-warn)' : 'var(--color-bad)';
      izq.append(n, el('small', null, '#' + v.lugar));
      const c = el('div', 'hal-cuerpo'); const t = el('b'); t.append(rutaTag(v.ruta), document.createTextNode(' ' + v.vendedor)); c.append(t);
      const barra = el('div', 'ven-barra');
      [['meta', 30, '#1F7A45'], ['efectividad', 20, '#2C6FB3'], ['cumplimiento', 15, '#0EA5B7'], ['chicos', 15, '#C98A0B'], ['puntualidad', 10, '#7C5CDB'], ['confianza', 10, '#B3262D']].forEach(([k, max, col]) => {
        const s = el('i'); s.style.flexGrow = String(max); const f = el('em'); f.style.width = Math.round(100 * (v.partes[k] || 0) / max) + '%'; f.style.background = col; s.title = k + ' ' + (v.partes[k] || 0) + ' de ' + max; s.append(f); barra.append(s);
      });
      c.append(barra);
      c.append(el('small', null, 'Va a ' + pct(v.pronosticoMeta) + ' de su meta · efectividad ' + pct(v.efectividad) + ' · cumple ' + pct(v.cumplimiento) + ' de su programa · visita ' + pct(v.coberturaChicos) + ' de sus clientes chicos · sale a las ' + (v.salidaMediana || '—') + (v.ventaDudosa ? ' · ' + pct(v.ventaDudosa) + ' de venta dudosa' : '') + (v.tendenciaSemana != null ? ' · semana ' + signo(v.tendenciaSemana) : '')));
      c.append(el('em', null, '→ Lo que más le falta: ' + v.mejorar));
      li.append(izq, c); ol.append(li);
    });
    e.append(ol);
    e.append(el('p', 'note', 'Calificación de 100: llegar a la meta 30, efectividad 20, cumplir su programa 15, visitar a los chicos 15, salir temprano 10, ventas confiables y liquidar a tiempo 10.'));
  });
  dash.draw('venAtencion', (e) => {
    e.replaceChildren(); const A = rows('atencion'); if (!A.length) return;
    const g = (r, t) => A.find((a) => a.ruta === r && a.tamano === t) || {};
    const cel = (a) => (a.clientes ? pct(a.cobertura7) + ' · ' + (a.minVisita == null ? '—' : a.minVisita + ' min') + ' · ' + pct(a.efectividad) : '—');
    tabla(e, [['Ruta'], ['Grandes', 1], ['Medianos', 1], ['Chicos', 1]], RUTAS, (r) => {
      const ch = g(r, 'chico'); return [[r, false, null, color(r)], [cel(g(r, 'grande')), 1], [cel(g(r, 'mediano')), 1], [cel(ch), 1, (ch.cobertura7 != null && ch.cobertura7 < 0.7) ? 'neg' : null]];
    });
    e.append(el('p', 'note', 'Cada celda: % de clientes visitados esta semana · minutos por visita · % de visitas con venta. Grande: 7 Hl al mes o más; mediano: 2.5 a 7; chico: menos de 2.5.'));
  });
  dash.draw('venSinVisita', (e) => {
    e.replaceChildren(); const S = rows('sinvisita');
    seg(e, RUTAS.map((r) => [r, r.replace('Ruta ', 'R')]), st.ven, (k) => { st.ven = k; st.masS = false; dash.draw('venSinVisita'); });
    const L = S.filter((s) => s.ruta === st.ven); const ol = el('ol', 'acciones hal-lista');
    const n = st.masS ? L.length : Math.min(12, L.length);
    L.slice(0, n).forEach((s) => item(ol, null, s.cliente + ' (' + s.clienteId + ')', 'Cliente ' + s.tamano + ', compra ' + hl(s.hlMes) + ' Hl al mes' + (s.colonia ? ' · ' + s.colonia : '') + '.',
      'Última visita: ' + (s.ultimaVisita ? F.dia(s.ultimaVisita) : 'no se ha visitado este mes') + ' · última compra: ' + (s.ultimaCompra ? F.dia(s.ultimaCompra) : '—'), null, s.tamano === 'chico' ? ['warn', 'Chico'] : s.tamano === 'grande' ? ['bad', 'Grande'] : ['ok', 'Mediano']));
    if (!L.length) ol.append(el('li', null, 'Visitó a todos sus clientes activos esta semana.'));
    e.append(el('p', 'note', L.length + (L.length === 1 ? ' cliente activo' : ' clientes activos') + ' de ' + st.ven + ' sin visita en los últimos 6 días hábiles.')); e.append(ol);
    mas(e, L.length, n, () => { st.masS = true; dash.draw('venSinVisita'); });
  });

  /* ================= OPORTUNIDADES ================= */
  dash.draw('opoAlejando', (e) => {
    e.replaceChildren(); const A = rows('alejandose');
    seg(e, [['todas', 'Todas']].concat(RUTAS.map((r) => [r, r.replace('Ruta ', 'R')])), st.opo, (k) => { st.opo = k; st.masA = false; st.masP = false; dash.draw('opoAlejando'); dash.draw('opoPotencial'); });
    const L = A.filter((a) => st.opo === 'todas' || a.ruta === st.opo); const ol = el('ol', 'acciones hal-lista');
    const n = st.masA ? L.length : Math.min(10, L.length);
    L.slice(0, n).forEach((a) => item(ol, a.ruta, a.cliente + ' · ' + a.diasSin + ' días sin comprar',
      'Normalmente compra cada ' + Math.round(a.cadaDias) + ' días (' + hl(a.hlMes) + ' Hl al mes, ' + F.money(a.margenMes) + ' de margen). Última compra: ' + F.dia(a.ultimaCompra) + '.',
      (a.visitadoSemana ? 'Sí lo visitaron esta semana' : 'No lo visitaron esta semana') + (a.motivo ? ' · motivo: ' + a.motivo.replace(/\s*-\s*$/, '').toLowerCase() : ''),
      a.visitadoSemana ? 'Ir con el vendedor y preguntar qué pasó (competencia, precio, crédito).' : 'Que el vendedor lo visite esta semana.', a.tamano === 'grande' ? ['bad', 'Grande'] : a.tamano === 'mediano' ? ['warn', 'Mediano'] : ['ok', 'Chico']));
    if (!L.length) ol.append(el('li', null, 'Ningún cliente se está alejando.'));
    e.append(ol); mas(e, L.length, n, () => { st.masA = true; dash.draw('opoAlejando'); });
  });
  dash.draw('opoPotencial', (e) => {
    e.replaceChildren(); const L = rows('crecercli').filter((a) => st.opo === 'todas' || a.ruta === st.opo); const ol = el('ol', 'acciones hal-lista');
    const n = st.masP ? L.length : Math.min(8, L.length);
    L.slice(0, n).forEach((c) => item(ol, c.ruta, c.cliente + ' · ' + c.giro, 'Compra ' + hl(c.hlMes) + ' Hl al mes; un ' + c.giro.toLowerCase() + ' normal compra ' + hl(c.hlGiro) + '. Si llega a lo normal deja ' + F.money(c.potencialMargen) + ' más de margen al mes.', c.ofrecer ? 'Ofrecer: ' + c.ofrecer : null, null, null));
    e.append(ol); mas(e, L.length, n, () => { st.masP = true; dash.draw('opoPotencial'); });
  });
  dash.draw('opoPoblacion', (e) => {
    e.replaceChildren(); const P = rows('crecerpob'); if (!P.length) return;
    tabla(e, [['Población'], ['Clientes', 1], ['Hl al mes', 1], ['Hl por cliente', 1], ['vs 2025', 1], ['Con productos foco', 1], ['Rutas']], P, (p) => [[p.poblacion], [F.int(p.clientes), 1], [hl(p.hlMes), 1], [hl(p.hlPorCliente), 1], [signo(p.vs2025), 1, p.vs2025 < 0 ? 'neg' : null], [pct(p.penetracionFoco), 1], [p.rutas]]);
  });

  /* ================= BONIFICACIÓN ================= */
  dash.draw('bonResumen', (e) => {
    e.replaceChildren(); const B = rows('bonifcli'); if (!B.length) { e.append(el('p', 'note', 'Falta el archivo de gasto variable.')); return; }
    const tot = B.reduce((a, b) => a + b.gasto, 0), th = B.reduce((a, b) => a + b.hl, 0);
    const s = B.slice().sort((a, b) => b.gasto - a.gasto); const n = Math.max(1, Math.round(s.length / 10));
    const top = s.slice(0, n).reduce((a, b) => a + b.gasto, 0), toph = s.slice(0, n).reduce((a, b) => a + b.hl, 0);
    const mal = B.filter((b) => b.veredicto === 'Recibe de más y no crece');
    e.append(el('p', 'take', 'Con el gasto variable de ' + B[0].corte + ': el 10% de los clientes (' + n + ') se lleva ' + pct(top / tot) + ' de la bonificación y promoción y compra ' + pct(toph / th) + ' del volumen. ' + mal.length + ' clientes reciben más que el promedio de su ruta y no están creciendo: ' + F.money(mal.reduce((a, b) => a + b.exceso, 0)) + ' al mes.'));
    kv(e, [['Bonificación + promoción', F.money(tot)], ['Por Hl', F.money(tot / th)], ['Clientes con apoyo', F.int(B.length)], ['De más y sin crecer', F.int(mal.length), mal.length ? 'neg' : null]]);
    e.append(el('p', 'note', 'Heineken lo reembolsa a 30 días, pero cuenta en tu indicador de gasto contra ingreso y lo financias un mes. Si un cliente recibe de más, sale en Hallazgos y no crece, puede estar revendiendo.'));
  });
  dash.draw('bonLista', (e) => {
    e.replaceChildren(); const B = rows('bonifcli');
    const OP = [['Recibe de más y no crece', 'De más, sin crecer'], ['Recibe de más pero sí crece', 'De más y crece'], ['Crece con poca bonificación', 'Crece con poco'], ['No deja: cuesta más visitarlo', 'No deja']];
    seg(e, OP, st.bon, (k) => { st.bon = k; st.masB = false; dash.draw('bonLista'); });
    const L = B.filter((b) => b.veredicto === st.bon).sort((a, b) => (st.bon === 'Crece con poca bonificación' ? a.exceso - b.exceso : b.exceso - a.exceso));
    const ol = el('ol', 'acciones hal-lista'); const n = st.masB ? L.length : Math.min(10, L.length);
    L.slice(0, n).forEach((b) => item(ol, b.ruta, b.cliente + ' (' + b.clienteId + ')',
      F.money(b.gasto) + ' de bonificación y promoción por ' + hl(b.hl) + ' Hl: ' + F.money(b.gastoHl) + ' por Hl contra ' + F.money(b.rutaGastoHl) + ' de su ruta (' + (b.exceso >= 0 ? F.money(b.exceso) + ' de más' : F.money(-b.exceso) + ' de menos') + ').',
      'Volumen ' + signo(b.tendencia) + ' (ago-oct contra ene-jul) · margen ' + F.money(b.margenMes) + ' al mes · ' + b.visitasMes + ' días con visita al mes' + (b.hallazgos ? ' · sale ' + b.hallazgos + (b.hallazgos === 1 ? ' vez' : ' veces') + ' en Hallazgos' : ''),
      st.bon === 'Recibe de más y no crece' ? 'Bajarle el apoyo o pedir que crezca; revisar a quién le vende.' : st.bon === 'No deja: cuesta más visitarlo' ? 'Pasarlo a visita cada 15 días o a pedido por teléfono.' : st.bon === 'Crece con poca bonificación' ? 'Cuidarlo: es buen cliente para premiar con promoción.' : null,
      b.hallazgos ? ['bad', 'Hallazgos'] : null));
    if (!L.length) ol.append(el('li', null, 'Ningún cliente en este grupo.'));
    e.append(ol); mas(e, L.length, n, () => { st.masB = true; dash.draw('bonLista'); });
  });
  dash.draw('bonRutas', (e) => {
    e.replaceChildren(); const B = rows('bonifcli'); if (!B.length) return;
    const g = {}; B.forEach((b) => { const x = g[b.ruta] || (g[b.ruta] = { gasto: 0, hl: 0, ing: 0, n: 0 }); x.gasto += b.gasto; x.hl += b.hl; x.ing += b.ingreso; x.n += 1; });
    const R = Object.entries(g).sort((a, b) => b[1].gasto / b[1].hl - a[1].gasto / a[1].hl);
    tabla(e, [['Ruta'], ['Clientes', 1], ['Bonif. + promo', 1], ['Por Hl', 1], ['Gasto / ingreso', 1]], R, ([r, x]) => [[r, false, null, color(r)], [F.int(x.n), 1], [F.money(x.gasto), 1], [F.money(x.gasto / x.hl), 1], [pct(x.ing ? x.gasto / x.ing : 0), 1]]);
  });

  /* ================= FLOTILLA: km por ruta y fuera de zona ================= */
  dash.draw('kmRutas', (e) => {
    e.replaceChildren(); const K = rows('rutakm'); if (!K.length) return;
    tabla(e, [['Ruta'], ['Km por día', 1], ['Km en el mes', 1], ['Km por Hl', 1], ['Diésel estimado', 1]], K.slice().sort((a, b) => (b.kmPorHl || 0) - (a.kmPorHl || 0)),
      (k) => [[k.ruta, false, null, color(k.ruta)], [hl(k.kmDia), 1], [F.int(k.kmMes), 1], [k.kmPorHl == null ? '—' : hl(k.kmPorHl), 1], [F.money(k.dieselEstimado), 1]]);
    e.append(el('p', 'note', 'Estimado con el GPS de cada visita en Power Sales: bodega → clientes en orden → bodega, ×1.3 por carretera. Sirve para comparar rutas, no para pagar diésel.'));
  });
  dash.draw('kmFuera', (e) => {
    e.replaceChildren(); const Z = rows('fuerazona'); const ol = el('ol', 'acciones');
    Z.forEach((z) => item(ol, z.ruta, z.cliente + ' (' + z.clienteId + ')', 'Está a ' + hl(z.kmMismaRuta) + ' km de los clientes de su ruta y a ' + F.int(z.mOtraRuta) + ' m de ' + z.vecinosOtraRuta + ' clientes de ' + z.rutaSugerida + '. Compra ' + hl(z.hlMes) + ' Hl al mes.', null, 'Valorar pasarlo a ' + z.rutaSugerida + '.', null));
    if (!Z.length) ol.append(el('li', null, 'Todos los clientes quedan en la zona de su ruta.'));
    e.append(ol);
  });

  /* ================= HOY: alertas de dirección dentro de "Qué hacer hoy" ================= */
  dash.draw('hoyAlertasDir', (ol) => {
    ol.replaceChildren();
    rows('alertasdir').slice(0, 4).forEach((a) => {
      const li = el('li'); const p = el('span', 'pill ' + (a.p >= 80 ? 'bad' : a.p >= 60 ? 'warn' : 'ok'), a.tag); if (a.tag.startsWith('Ruta')) p.style.color = color(a.tag);
      li.append(p, el('span', null, a.txt)); ol.append(li);
    });
  });

  /* ================= títulos de las vistas nuevas ================= */
  const TIT = { pronostico: ['Pronóstico', 'A dónde vamos a llegar'], vendedores: ['Vendedores', 'Calificación y atención a clientes'], oportunidades: ['Oportunidades', 'Clientes que se alejan y dónde crecer'], bonificacion: ['Bonificación', 'A quién apoyamos y qué deja'] };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const t = TIT[b.getAttribute('data-vista')]; if (!t) return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
  }));
})();
