/* Detalle del cliente en el admin (Willy, 24-nov-2026): al picarle a un cliente se abre su ficha.
   Datos del cliente (megabase), Power Sales contra megabase en el mes (conciliado), mes a mes 2025 contra 2026,
   lo que compra en el año por producto y, si ya está en Power Sales, el detalle del mes (venta, margen, cómo reparte
   su producto y sus compras día por día). window.CPN_CLIDET.abrir(id) */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  let SRC = null;   // páginas de Monse y Berenice: los datos vienen en su panel
  const rows = (id) => { if (SRC) return SRC[id] || []; if (!window.dash) return []; const d = dash.data(id); return d && d.status === 'ok' ? d.data : []; };
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fec = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());

  function barras(m25, m26, hasta) {
    const NS = 'http://www.w3.org/2000/svg'; const W = 720, H = 190, pad = 26;
    const max = Math.max(1, ...m25, ...m26.slice(0, hasta + 1));
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H + 30}`); svg.setAttribute('class', 'cd-barras'); svg.setAttribute('role', 'img');
    const gw = (W - pad) / 12;
    for (let i = 0; i < 12; i++) {
      [[m25[i], 'cd-b25', 0], [i <= hasta ? m26[i] : 0, 'cd-b26', 1]].forEach(([v, cls, k]) => {
        const h = (v / max) * (H - 20); const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', pad + i * gw + 6 + k * (gw / 2 - 4)); r.setAttribute('y', H - h); r.setAttribute('width', gw / 2 - 8); r.setAttribute('height', Math.max(0, h)); r.setAttribute('class', cls); r.setAttribute('rx', 2);
        const t = document.createElementNS(NS, 'title'); t.textContent = MES[i] + ' ' + (k ? '2026' : '2025') + ': ' + n1(v) + ' Hl'; r.append(t); svg.append(r);
      });
      const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', pad + i * gw + gw / 2); tx.setAttribute('y', H + 18); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('class', 'cd-eje'); tx.textContent = MES[i]; svg.append(tx);
    }
    return svg;
  }

  function abrir(id, src) {
    SRC = src || null; id = String(id);
    const C = rows('clientes').find((c) => String(c.id) === id) || {};
    const CR = (rows('crecimiento') || [])[0] || {};
    const info = (CR.info || {})[id] || {};
    const PS = rows('clientes_mes').find((c) => String(c.id) === id);
    const conc = CR.concil;
    const fondo = el('div', 'cd-fondo'); const caja = el('div', 'cd-caja'); caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true');
    const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', esc); fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });

    // ---- encabezado ----
    const cab = el('div', 'cd-cab'); const t = el('div');
    const neg = C.negocio || (PS && PS.cliente) || id; const prop = info.prop && tit(info.prop) !== neg ? tit(info.prop) : '';
    t.append(el('h3', null, '#' + id + ' · ' + neg + (prop ? ' · ' + prop : '')),
      el('small', null, [C.ruta || (PS && PS.ruta), PS && PS.vendedor, C.estado].filter(Boolean).join(' · ')));
    const x = el('button', 'pill', 'Cerrar'); x.type = 'button'; x.addEventListener('click', cerrar); cab.append(t, x); caja.append(cab);

    const datos = el('div', 'cd-datos');
    [['Canal', tit(info.canal || C.canal)], ['Giro', tit(info.giro || C.giro)], ['Segmento / nivel', [C.segmento, PS && PS.nivel].filter((v) => v && v !== 'No Aplica').join(' · ')], ['Colonia', tit(info.col || C.colonia)], ['Población', tit(info.pob || C.poblacion)],
      ['Cliente desde', fec(info.alta)], ['Última compra', fec(C.ultimaCompra || (PS && PS.ultimaCompra))], ['Condición', tit(info.cond)], ['Cadena', tit(info.cadena)], ['Meses con compra (12)', C.mesesConCompra != null ? String(C.mesesConCompra) : ''], ['Marcas', (C.marcas || []).join(', ')]]
      .filter(([, v]) => v && v !== '—').forEach(([k, v]) => { const d = el('div'); d.append(el('span', null, k), el('b', null, v)); datos.append(d); });
    caja.append(datos);

    // ---- conciliación del mes ----
    if (conc && (C.ruta === 'Ruta 5' || (PS && PS.rutaNum === 5))) caja.append(el('p', 'cd-conc', 'La Ruta 5 no está en Power Sales: sus números salen solo de la megabase.'));
    else if (conc) {
      const mi = Number(conc.corte.slice(5, 7)) - 1; const mb = info.m26 ? info.m26[mi] : null;
      const pc = (conc.porCliente || []).find((r) => String(r[0]) === id);
      const psv = pc ? pc[5] : mb;
      const ok = !pc; const p = el('p', 'cd-conc ' + (ok ? 'ok' : 'warn'));
      p.textContent = (ok ? '✓ Cuadra: ' : '⚠ No cuadra: ') + 'megabase ' + n1(mb) + ' Hl · Power Sales ' + n1(psv) + ' Hl del 1 al ' + fec(conc.corte) + (ok ? '' : ' · diferencia ' + (psv - mb >= 0 ? '+' : '') + n1(psv - mb) + ' Hl');
      caja.append(p);
    }

    // ---- mes a mes ----
    if (info.m25) {
      const mi = conc ? Number(conc.corte.slice(5, 7)) - 1 : 10;
      const s25 = info.m25.slice(0, mi).reduce((a, b) => a + b, 0), s26 = info.m26.slice(0, mi).reduce((a, b) => a + b, 0);
      const sec = el('section', 'cd-sec'); sec.append(el('h4', null, 'Mes a mes (Hl, megabase)'));
      const ley = el('p', 'cd-ley'); ley.innerHTML = '<i class="cd-b25"></i> 2025 &nbsp; <i class="cd-b26"></i> 2026 &nbsp;·&nbsp; enero a ' + MES[mi - 1] + ': ' + n1(s26) + ' Hl contra ' + n1(s25) + ' Hl (' + (s25 ? (s26 >= s25 ? '▲ ' : '▼ ') + Math.abs(Math.round((s26 - s25) / s25 * 100)) + '%' : '—') + ')';
      sec.append(ley, barras(info.m25, info.m26, mi)); caja.append(sec);
    }

    // ---- productos en el año ----
    if (CR.filas) {
      const ci = (CR.clientes || []).findIndex((c) => String(c[0]) === id);
      const per = CR.periodos.find((p) => p.id === (CR.default != null ? CR.default : 0)) || CR.periodos[0]; const ia = 2 + per.id * 2;
      const L = CR.filas.filter((f) => f[0] === ci).map((f) => ({ p: CR.productos[f[1]][1], a: f[ia], b: f[ia + 1] })).filter((x) => x.a > 0.001 || x.b > 0.001).sort((a, b) => b.b - a.b);
      if (L.length) {
        const sec = el('section', 'cd-sec'); sec.append(el('h4', null, 'Lo que compra · ' + per.etiqueta + ' contra el año pasado'));
        const tot = L.reduce((a, x) => a + x.b, 0);
        const g = el('div', 'cd-prods');
        L.forEach((x) => { const r = el('div', 'cd-prod'); const bar = el('i'); bar.style.width = Math.max(2, (x.b / (L[0].b || 1)) * 100) + '%';
          const pct = x.a > 0.001 ? (x.b >= x.a ? '▲ ' : '▼ ') + Math.abs(Math.round((x.b - x.a) / x.a * 100)) + '%' : 'nuevo';
          r.append(el('span', 'cd-pn', tit(x.p)), el('span', 'cd-pv', n1(x.b) + ' Hl · ' + Math.round(x.b / (tot || 1) * 100) + '%'), el('span', 'cd-pp ' + (x.b >= x.a ? 'up' : 'down'), pct + ' (antes ' + n1(x.a) + ')'), bar); g.append(r); });
        sec.append(g); caja.append(sec);
      }
    }

    // ---- el mes en Power Sales ----
    const sec = el('section', 'cd-sec');
    if (PS && window.CPN_CLI && window.CPN_CLI.detalle) {
      sec.append(el('h4', null, 'Este mes en Power Sales (cómo reparte su producto y sus compras)'));
      const din = !SRC || SRC.dinero !== false; const d = window.CPN_CLI.detalle(Object.assign({ banderas: [], oportunidades: [], riesgos: [] }, PS), rows('clientes_mes_det'), din, din && !(SRC && SRC.sinMargen), cerrar);
      const cb = d.querySelector('.rc-det-cab'); if (cb) cb.remove();
      sec.append(d);
    } else sec.append(el('p', 'note', 'No tiene compras en Power Sales este mes' + (C.ruta === 'Ruta 5' ? ' (la Ruta 5 no está en Power Sales).' : '.')));
    caja.append(sec);

    const of = [...new Set([...(C.huecosFoco || []), ...(C.huecos || [])])];
    if (of.length) caja.append(el('p', 'cli-of', 'Ofrecer: ' + of.join(', ')));
    fondo.append(caja); document.body.append(fondo); x.focus();
  }

  window.CPN_CLIDET = { abrir };
})();
