/* Programa de Franquicias de Heineken (llega diario al correo): avance de la venta híbrida del mes. Datos: programa.json (03 Scripts/extraer_programa.py). */
(function () {
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fd = (s) => { if (!s) return '—'; const d = new Date(s + 'T12:00:00'); return d.getDate() + ' ' + MES[d.getMonth()]; };
  const n0 = (v) => (v == null ? '—' : Math.round(v).toLocaleString('es-MX'));
  const pc = (v) => (v == null ? '—' : Math.round(v * 100) + '%');
  const get = () => { const d = dash.data('programa'); return d && d.status === 'ok' && d.data.length ? d.data[0] : null; };

  dash.draw('progRes', (e) => {
    e.replaceChildren(); const P = get();
    if (!P) { e.append(el('p', 'note', 'Todavía no se ha leído el Programa de Franquicias. Se baja cada noche del correo.')); return; }
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('Embarcado (recibido)', n0(P.embarcado) + ' Hl', pc(P.cumplimiento) + ' de la meta de ' + n0(P.meta) + ' Hl', P.cumplimiento < P.avanceTiempo ? 'bad' : '');
    t('Preliberado', n0(P.preliberado) + ' Hl', 'en camino o por cargar');
    t('No preliberado', n0(P.noPreliberado) + ' Hl', 'pedidos que aún no salen');
    t('Falta para la meta', n0(P.faltaHl) + ' Hl', '≈ ' + Math.round(P.pedidosRestantes || 0) + ' pedidos (camiones) más', 'warn');
    e.append(tiles);
    const p = el('p', 'note');
    p.textContent = 'Programa de Franquicias del ' + fd(P.fecha) + '. Del mes ya pasó el ' + pc(P.avanceTiempo) + ' y llevamos embarcado el ' + pc(P.cumplimiento) + '. ' +
      (P.ritmoNecesario ? 'Para llegar hay que recibir unos ' + n0(P.ritmoNecesario) + ' Hl por día. ' : '') +
      (P.lugar ? 'Somos el lugar ' + P.lugar + ' de ' + P.franquicias + ' franquicias estructurales en cumplimiento. ' : '') +
      (P.comentario ? 'Comentario de Heineken: "' + P.comentario + '".' : '');
    e.append(p);
  });

  dash.draw('progPedidos', (e) => {
    e.replaceChildren(); const P = get(); if (!P) return;
    const t = el('table', 'cpn-t'); const hr = el('tr');
    [['Pedido', ''], ['Fecha plan', ''], ['Estatus', ''], ['Hl', 'num'], ['Cajas', 'num'], ['Productos', '']].forEach(([h, c]) => hr.append(el('th', c, h)));
    t.append(el('thead')); t.tHead.append(hr); const tb = el('tbody');
    P.pedidos.slice().sort((a, b) => (b.fechaPlan || '').localeCompare(a.fechaPlan || '')).forEach((x) => {
      const tr = el('tr'); const est = el('td'); est.append(el('span', 'pill ' + (x.grupo === 'EMBARCADO' ? 'ok' : x.grupo === 'PRELIBERADO' ? 'warn' : 'bad'), x.estatus.toLowerCase()));
      tr.append(el('td', null, String(x.pedido)), el('td', null, fd(x.fechaPlan) + (x.fechaReal ? ' · llegó ' + fd(x.fechaReal) : '')), est, el('td', 'num', n0(x.hl)), el('td', 'num', n0(x.cajas)),
        el('td', null, x.productos.map((p) => p.producto).join(', ')));
      tb.append(tr);
    });
    t.append(tb); e.append(t);
  });
})();
