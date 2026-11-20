/* Envase con filtros de fechas, ruta y tipo de envase, y la cuenta paso a paso de cada número.
   Se usa en la página de cada puesto (persona.js) y en la pantalla Envase del admin.
   mov: [{fecha, ruta, tipo, cargado, vendido, devuelto, docs}] día por día (cajas). */
(function () {
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const dia = (s) => { if (!s) return '—'; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const iso = (d) => d.toISOString().slice(0, 10);
  const mas = (s, k) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + k); return iso(d); };
  const lunes = (s) => { const d = new Date(s + 'T12:00:00'); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
  const rnum = (r) => parseInt(String(r).replace(/\D/g, ''), 10) || 0;
  const ORD_T = { 'Cuarto 190 ml': 1, 'Media 20/2': 2, 'Caguama 1.2 L': 3 };
  const TOL = 2;

  /* La cuenta de una ruta y un envase entre dos fechas.
     Igual que analizar_envase.py: se cobra lo vendido hasta el corte de devoluciones (último día en que la
     mayoría de las rutas ya tiene su devolución capturada) o hasta su última entrega, lo que sea más tarde. */
  function cuenta(M, desde, hasta, corteDev) {
    const antes = M.filter((x) => x.fecha < desde);
    const ini = antes.reduce((a, x) => a + (x.vendido || 0) - (x.devuelto || 0) - (x.arqueo || 0), 0);   // arqueo 20-nov: ajuste que deja en 0
    const R = M.filter((x) => x.fecha >= desde && x.fecha <= hasta);
    const V = R.reduce((a, x) => a + (x.vendido || 0), 0);
    const D = R.reduce((a, x) => a + (x.devuelto || 0) + (x.arqueo || 0), 0);
    const ents = R.filter((x) => (x.devuelto || 0) > 0);
    const ult = ents.length ? ents[ents.length - 1] : null;
    // Regla 20-nov-2026 (Willy lo revisó con los técnicos de Power Sales): se cuenta solo hasta la ÚLTIMA ENTREGA DE LA
    // PROPIA RUTA; lo vendido después es "por entregar" (la Ruta 7 entrega por semana). Aviso si lleva 3+ días sin entregar.
    const lim = ult ? ult.fecha : '';
    const ref = corteDev ? (corteDev < hasta ? corteDev : hasta) : hasta;
    const vEnt = ult ? R.filter((x) => x.fecha <= ult.fecha).reduce((a, x) => a + (x.vendido || 0), 0) : 0;
    const vHasta = lim ? R.filter((x) => x.fecha <= lim).reduce((a, x) => a + (x.vendido || 0), 0) : 0;
    const faltaEnt = ult ? ini + vEnt - D : 0;              // lo que no completó el día que entregó
    const noEntrego = vHasta - vEnt + (ult ? 0 : ini);       // lo que vendió después y ya tocaba entregar
    const debe = lim ? ini + vHasta - D : 0;
    const pend = V - vHasta;
    const diasSin = R.filter((x) => (!ult || x.fecha > ult.fecha) && x.fecha <= ref && (x.vendido || 0) > 0).length;
    let estado = 'Cuadra', tono = 'ok';
    if (debe > TOL) { estado = 'Debe envase'; tono = 'bad'; }
    else if (debe < -TOL) { estado = 'Entregó de más'; tono = 'warn'; }
    else if (ult && pend > TOL && diasSin >= 3) { estado = 'Lleva ' + diasSin + ' días sin entregar'; tono = 'warn'; }
    else if (!ult && V > 0) { estado = 'Sin entregas en estas fechas'; tono = 'warn'; }
    else if (!V && !D) { estado = 'Sin movimiento'; tono = ''; }
    return { ini, V, D, ult, lim, vEnt, vHasta, faltaEnt, noEntrego, debe, pend, diasSin, estado, tono, dias: R };
  }

  function render(cont, o) {
    const MOV = (o.mov || []).filter((x) => !o.okRuta || o.okRuta(x.ruta)).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    cont.replaceChildren();
    if (!MOV.length) { cont.append(el('p', 'pp-mia', 'Todavía no hay movimientos de envase.')); return; }
    const f0 = MOV[0].fecha, f1 = MOV[MOV.length - 1].fecha;
    const rutas = [...new Set(MOV.map((x) => x.ruta))].sort((a, b) => rnum(a) - rnum(b));
    const tipos = [...new Set(MOV.map((x) => x.tipo))].sort((a, b) => (ORD_T[a] || 9) - (ORD_T[b] || 9));
    const st = o.estado || (o.estado = {});
    if (!st.desde) st.desde = f0;
    if (!st.hasta) st.hasta = f1;
    if (!st.ruta) st.ruta = rutas.length === 1 ? rutas[0] : '';
    if (st.tipo == null) st.tipo = '';

    /* ---------- filtros ---------- */
    const barra = el('div', 'envf-barra');
    const campo = (et, inp) => { const l = el('label', 'envf-campo'); l.append(el('span', null, et), inp); return l; };
    const iD = el('input', 'envf-in'); iD.type = 'date'; iD.min = f0; iD.max = f1; iD.value = st.desde;
    const iH = el('input', 'envf-in'); iH.type = 'date'; iH.min = f0; iH.max = f1; iH.value = st.hasta;
    const sR = el('select', 'envf-in'); [['', 'Todas las rutas']].concat(rutas.map((r) => [r, r])).forEach(([v, t]) => { const op = el('option', null, t); op.value = v; sR.append(op); }); sR.value = st.ruta;
    const sT = el('select', 'envf-in'); [['', 'Todos los envases']].concat(tipos.map((r) => [r, r])).forEach(([v, t]) => { const op = el('option', null, t); op.value = v; sT.append(op); }); sT.value = st.tipo;
    barra.append(campo('Desde', iD), campo('Hasta', iH));
    if (rutas.length > 1) barra.append(campo('Ruta', sR));
    barra.append(campo('Envase', sT));
    const rap = el('div', 'envf-rapido');
    const L = lunes(f1);
    [['Todo el mes', f0, f1], ['Esta semana', L < f0 ? f0 : L, f1], ['Semana pasada', mas(L, -7) < f0 ? f0 : mas(L, -7), mas(L, -2) < f0 ? f0 : mas(L, -2)], ['Últimos 3 días', mas(f1, -2) < f0 ? f0 : mas(f1, -2), f1]].forEach(([t, a, b]) => {
      if (b < a) return;
      const btn = el('button', 'envf-chip', t); btn.type = 'button'; btn.setAttribute('aria-pressed', String(st.desde === a && st.hasta === b));
      btn.addEventListener('click', () => { st.desde = a; st.hasta = b; render(cont, o); }); rap.append(btn);
    });
    const cambia = () => { st.desde = iD.value || f0; st.hasta = iH.value || f1; if (st.hasta < st.desde) st.hasta = st.desde; st.ruta = sR.value; st.tipo = sT.value; render(cont, o); };
    [iD, iH, sR, sT].forEach((x) => x.addEventListener('change', cambia));
    cont.append(barra, rap);

    const corteDev = o.corteDev || '';
    if (corteDev && st.hasta > corteDev) {
      cont.append(el('p', 'envf-aviso', 'Power Sales tiene devoluciones capturadas hasta el ' + dia(corteDev) + '. Lo vendido después de esa fecha sale como "por entregar" porque todavía no hay con qué compararlo. Si ya lo entregaron, falta capturar la devolución en Power Sales.'));
    }

    /* ---------- cuentas ---------- */
    const filas = [];
    rutas.filter((r) => !st.ruta || r === st.ruta).forEach((r) => tipos.filter((t) => !st.tipo || t === st.tipo).forEach((t) => {
      const M = MOV.filter((x) => x.ruta === r && x.tipo === t); if (!M.length) return;
      const c = cuenta(M, st.desde, st.hasta, o.corteDev); if (!c.V && !c.D && Math.abs(c.ini) <= TOL) return;
      filas.push(Object.assign({ ruta: r, tipo: t, M }, c));
    }));
    const sum = (k) => filas.reduce((a, x) => a + (x[k] || 0), 0);
    const deben = filas.filter((x) => x.estado === 'Debe envase');
    const sinEnt = filas.filter((x) => !x.ult && x.V > 0);

    const tiles = el('div', 'hal-tiles');
    const tile = (k, v, s, tono) => { const d = el('div', 'hal-tile' + (tono ? ' ' + tono : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    tile('Vendieron', n0(sum('V')) + ' cajas', dia(st.desde) + ' al ' + dia(st.hasta));
    tile('Entregaron', n0(sum('D')) + ' cajas', 'envase que regresó al almacén');
    tile('Deben', n0(deben.reduce((a, x) => a + x.debe, 0)) + ' cajas', deben.length ? deben.map((x) => x.ruta.replace('Ruta ', 'R') + ' ' + x.tipo.split(' ')[0].toLowerCase()).join(' · ') : 'nadie debe en estas fechas', deben.length ? 'bad' : 'ok');
    tile('Por entregar', n0(sum('pend')) + ' cajas', 'vendidas después del corte; aún no toca');
    if (sinEnt.length) tile('Sin entregar nada', sinEnt.length + (sinEnt.length === 1 ? ' caso' : ' casos'), sinEnt.map((x) => x.ruta.replace('Ruta ', 'R') + ' ' + x.tipo.split(' ')[0].toLowerCase()).join(' · '), 'warn');
    cont.append(tiles);

    if (!filas.length) { cont.append(el('p', 'pp-mia', 'No hay movimientos con esos filtros.')); return; }

    /* ---------- dónde está la falla ---------- */
    const malas = filas.filter((x) => x.tono === 'bad' || x.tono === 'warn').sort((a, b) => b.debe - a.debe);
    if (malas.length) {
      const box = el('div', 'envf-fallas'); box.append(el('h4', null, 'Qué revisar'));
      const ul = el('ul');
      malas.slice(0, 8).forEach((x) => {
        const li = el('li'); li.append(el('span', 'pill ' + x.tono, x.estado));
        let t = ' ' + x.ruta + ' · ' + x.tipo + ': ';
        if (x.estado === 'Debe envase') {
          const partes = [];
          if (x.ult && x.faltaEnt > TOL) partes.push('el ' + dia(x.ult.fecha) + ' entregó ' + n0(x.ult.devuelto) + ' cajas' + (x.ult.docs ? ' (documento ' + x.ult.docs + ')' : '') + ' y para quedar a mano tenían que ser ' + n0(x.ult.devuelto + x.faltaEnt) + ': faltaron ' + n0(x.faltaEnt));
          if (x.noEntrego > TOL) partes.push((x.ult ? 'después del ' + dia(x.ult.fecha) : 'desde el ' + dia(st.desde)) + ' vendió ' + n0(x.noEntrego) + ' cajas hasta el ' + dia(x.lim) + ' y no las entregó, aunque las demás rutas ya entregaron hasta ese día');
          t += partes.join('; además, ') + '. Debe ' + n0(x.debe) + ' cajas: cuenta el envase en el camión o busca una devolución que no se capturó.';
        } else if (x.estado === 'Entregó de más') t += 'entregó ' + n0(-x.debe) + ' cajas más de lo que vendió hasta el ' + dia(x.lim) + '. Puede ser envase de días antes del ' + dia(st.desde) + ' (amplía las fechas) o una devolución capturada en la ruta equivocada.';
        else if (x.ult) t += 'su última entrega fue el ' + dia(x.ult.fecha) + ' y desde entonces vendió ' + n0(x.pend) + ' cajas en ' + x.diasSin + ' días. No es adeudo todavía: es lo que le toca entregar en su próxima devolución.';
        else t += 'vendió ' + n0(x.V) + ' cajas y no hay ninguna entrega de envase en estas fechas.';
        li.append(el('span', null, t)); li.style.cursor = 'pointer'; li.addEventListener('click', () => { st.ver = x.ruta + '|' + x.tipo; render(cont, o); const d = cont.querySelector('.envf-detalle'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        ul.append(li);
      });
      box.append(ul); cont.append(box);
    }

    /* ---------- resumen por ruta: de dónde sale el número ---------- */
    const w = el('div', 'tblwrap'); const t = el('table', 'cpn-t envf-t');
    const hr = el('tr');
    [['Ruta', ''], ['Envase', ''], ['Traían', 'num'], ['Vendido hasta el corte', 'num'], ['Entregado', 'num'], ['= Debe', 'num'], ['Por entregar', 'num'], ['Última entrega', ''], ['Estado', '']].forEach(([h, c]) => hr.append(el('th', c || null, h)));
    t.append(el('thead')); t.tHead.append(hr);
    const tb = el('tbody');
    filas.forEach((x) => {
      const tr = el('tr', 'envf-fila'); tr.tabIndex = 0;
      if (st.ver === x.ruta + '|' + x.tipo) tr.classList.add('sel');
      const debeTxt = !x.lim ? '—' : Math.abs(x.debe) <= TOL ? '0' : x.debe > 0 ? n0(x.debe) : n0(x.debe) + ' (de más)';
      const pill = el('span', 'pill ' + x.tono, x.estado);
      const tdE = el('td'); tdE.append(pill);
      tr.append(el('td', null, x.ruta), el('td', null, x.tipo), el('td', 'num', n0(x.ini)), el('td', 'num', n0(x.vHasta)), el('td', 'num', n0(x.D)), el('td', 'num ' + (x.tono === 'bad' ? 'neg' : ''), debeTxt), el('td', 'num', n0(x.pend)), el('td', null, x.ult ? dia(x.ult.fecha) : 'ninguna'), tdE);
      const ir = () => { st.ver = x.ruta + '|' + x.tipo; render(cont, o); const d = cont.querySelector('.envf-detalle'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      tr.addEventListener('click', ir); tr.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ir(); });
      tb.append(tr);
    });
    t.append(tb); w.append(t); w.classList.add('envf-full'); cont.append(w);
    /* En el teléfono: tarjetas en vez de tabla ancha */
    const cards = el('div', 'envf-cards');
    filas.slice().sort((a, b) => (b.tono === 'bad') - (a.tono === 'bad') || (b.tono === 'warn') - (a.tono === 'warn') || rnum(a.ruta) - rnum(b.ruta)).forEach((x) => {
      const b = el('button', 'envf-card ' + x.tono); b.type = 'button';
      if (st.ver === x.ruta + '|' + x.tipo) b.classList.add('sel');
      const top = el('div', 'envf-card-top'); top.append(el('b', null, x.ruta + ' · ' + x.tipo), el('span', 'pill ' + x.tono, x.estado));
      const lin = el('div', 'envf-card-num');
      [['Vendido', n0(x.vHasta)], ['Entregó', n0(x.D)], ['Debe', x.debe > TOL ? n0(x.debe) : '0'], ['Por entregar', n0(x.pend)]].forEach(([k, v]) => { const d = el('div'); d.append(el('small', null, k), el('b', null, v)); lin.append(d); });
      b.append(top, lin, el('small', 'envf-card-ult', 'Última entrega: ' + (x.ult ? dia(x.ult.fecha) : 'ninguna') + (Math.abs(x.ini) > 0.5 ? ' · traían ' + n0(x.ini) : '')));
      b.addEventListener('click', () => { st.ver = x.ruta + '|' + x.tipo; render(cont, o); const d = cont.querySelector('.envf-detalle'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      cards.append(b);
    });
    cont.append(cards);
    cont.append(el('p', 'pp-mia', 'Cómo se cuenta: lo que traían de antes del ' + dia(st.desde) + ' + lo vendido hasta la última entrega de esa ruta − lo que entregaron = lo que deben. Lo vendido después de su última entrega va en "Por entregar" (cada ruta entrega a su ritmo; la Ruta 7, por ejemplo, entrega por semana). Si pasan 3 días con venta sin entregar, sale el aviso. Toca una fila para ver el día por día.'));

    /* ---------- detalle día por día ---------- */
    let sel = filas.filter((x) => st.ver === x.ruta + '|' + x.tipo);
    if (!sel.length) sel = filas.length === 1 || st.ruta ? filas : (malas.length ? [malas[0]] : []);
    if (!sel.length) return;
    sel.forEach((x) => {
      const d = el('div', 'envf-detalle');
      d.append(el('h4', null, x.ruta + ' · ' + x.tipo + ' · día por día'));
      const p = el('p', 'envf-cuenta');
      p.textContent = (x.lim
        ? 'Traía ' + n0(x.ini) + ' + vendió ' + n0(x.vHasta) + ' hasta el ' + dia(x.lim) + ' − entregó ' + n0(x.D) + ' = ' + (x.debe > TOL ? 'debe ' + n0(x.debe) : x.debe < -TOL ? n0(-x.debe) + ' de más' : 'cuadra') + '. '
        : 'No hay entregas de envase entre el ' + dia(st.desde) + ' y el ' + dia(st.hasta) + '. ') + (x.pend ? 'Después del ' + dia(x.lim || st.desde) + ' vendió ' + n0(x.pend) + ' que van por entregar.' : '');
      d.append(p);
      const w2 = el('div', 'tblwrap'); const t2 = el('table', 'cpn-t envf-t');
      const h2 = el('tr'); [['Día', ''], ['Cargó', 'num'], ['Vendió', 'num'], ['Entregó', 'num'], ['Saldo', 'num'], ['Documento de devolución', '']].forEach(([h, c]) => h2.append(el('th', c || null, h)));
      t2.append(el('thead')); t2.tHead.append(h2);
      const b2 = el('tbody');
      let s = x.ini;
      if (Math.abs(x.ini) > 0.5) { const tr = el('tr', 'envf-ini'); tr.append(el('td', null, 'Antes del ' + dia(st.desde)), el('td'), el('td'), el('td'), el('td', 'num', n0(s)), el('td', null, 'saldo que traían')); b2.append(tr); }
      x.dias.forEach((m) => {
        s += (m.vendido || 0) - (m.devuelto || 0) - (m.arqueo || 0);
        const despues = !x.lim || m.fecha > x.lim; const falta = x.ult && m.fecha > x.ult.fecha && !despues && (m.vendido || 0) > 0;
        const tr = el('tr', (m.devuelto ? 'envf-ent' : '') + (despues ? ' envf-desp' : '') + (falta || (!x.ult && !despues && x.debe > TOL) ? ' envf-falta' : ''));
        tr.append(el('td', null, dia(m.fecha)), el('td', 'num', m.cargado ? n0(m.cargado) : '—'), el('td', 'num', n0(m.vendido)), el('td', 'num' + (m.devuelto ? ' ok' : ''), m.devuelto ? n0(m.devuelto) : '—'), el('td', 'num', n0(s)), el('td', null, m.docs || (despues ? 'por entregar' : (falta || !x.ult) && (m.vendido || 0) > 0 ? 'no entregó (ya tocaba)' : '')));
        b2.append(tr);
      });
      t2.append(b2); w2.append(t2); d.append(w2);
      d.append(el('p', 'pp-mia', 'El saldo sube con lo que vende y baja el día que entrega. En verde, los días que entregó envase; en rojo, días que ya tocaba entregar y no entregó; en gris, lo vendido después del corte. Si en el camión hay menos envase del saldo, ahí está la falla.'));
      cont.append(d);
    });
  }

  window.CPN_ENV = { render, cuenta };
})();
