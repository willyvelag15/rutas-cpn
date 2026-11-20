/* Pronóstico S+2 editable para Rubí (Willy, 20-nov-2026).
   - Rubí escribe los días de inventario que quiere y los Hl a pedir; la app sugiere el pedido en VIAJES completos
     (16 o 18 tarimas) como en las hojas "SEMANA DEL ..." del PRONOSTICO GENERAL.
   - Ella mueve los viajes (SKU y tarimas) y arriba se actualiza el total en Hl, como en el Excel.
   - Días de inventario con semáforo: rojo < 7, amarillo < objetivo, verde ≥ objetivo.
   - Exporta a Excel con el mismo formato (hoja de la semana + semanas anteriores + inventario + BASE de productos).
   window.CPN_PRON.render(contenedor, datos, { subir: async (nombre, base64) => {} }) */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const money = (v) => '$' + Math.round(v || 0).toLocaleString('es-MX');
  const XX = 139297;                 // XX Lager cuarto: el producto que siempre queremos tener (absorbe lo que sobra)
  const DIAS_S2 = 6;                 // días de venta de la semana S+2 (lunes a sábado)
  const LS = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }, del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* */ } } };

  const redondeaT = (x) => (x <= 0 ? 0 : (x - Math.floor(x) >= 0.3 ? Math.ceil(x) : Math.floor(x)));

  function prodIndex(P) { const m = new Map(); (P.productos || []).forEach((p) => m.set(p.sku, p)); return m; }
  const inicio = (p) => Math.max(0, Number(p.inicioS2) || 0);
  const diasDe = (p, cajasExtra) => (p.ventaDia > 0 ? (inicio(p) + (cajasExtra || 0) - DIAS_S2 * p.ventaDia) / p.ventaDia : null);

  // ----- Sugerido: necesidad por días objetivo, luego lo que sobra de los Hl por rotación y pedidos anteriores -----
  function sugerir(P, dias, hl, nViajes) {
    const items = (P.productos || []).filter((p) => p.hlTarima > 0 && p.cxt > 0 && p.ventaDia > 0 && p.hlDia > 0);
    // 1) Nivelar días: buscar los días al cierre de la S+2 (d) con los que los Hl alcanzan para todos los que rotan;
    //    el que tiene menos días recibe primero. Tope: los días objetivo de Rubí.
    const needT = (p, d) => Math.max(0, ((d + DIAS_S2) * p.ventaDia - inicio(p)) / p.cxt);
    const hlCon = (d) => items.reduce((a, p) => a + needT(p, d) * p.hlTarima, 0);
    let lo = 0, hi = dias;
    if (hlCon(hi) <= hl) lo = hi; else { for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (hlCon(m) <= hl) lo = m; else hi = m; } }
    const T = {}; let usado = 0;
    items.forEach((p) => { const t = redondeaT(needT(p, lo)); if (t > 0) { T[p.sku] = t; usado += t * p.hlTarima; } });
    // 2) Si todos llegan a los días objetivo y sobran Hl: a lo que más rota y más se ha pedido; XX cuarto pesa el doble
    //    (es el que siempre queremos tener aunque se quede más días).
    const totHlDia = items.reduce((a, p) => a + p.hlDia, 0) || 1;
    const resto = hl - usado;
    const cand = items.filter((p) => p.hlDia >= 1);
    if (resto > 0 && cand.length) {
      const w = cand.map((p) => (0.5 * p.hlDia / totHlDia + 0.5 * (p.partPedidos || 0)) * (p.sku === XX ? 2 : 1));
      const sw = w.reduce((a, b) => a + b, 0) || 1;
      cand.forEach((p, i) => { const q = Math.floor(resto * w[i] / sw / p.hlTarima); if (q > 0) { T[p.sku] = (T[p.sku] || 0) + q; usado += q * p.hlTarima; } });
    }
    let tot = Object.values(T).reduce((a, b) => a + b, 0);
    // viajes: 4 normalmente, 5 solo en semana de quincena o fiestas (regla de Willy); nunca más de 5 si lo calcula la app
    const N = nViajes || Math.min(P.semanaFuerte ? 5 : 4, Math.max(1, Math.round(tot / 17)));
    // viajes completos: entre 16·N y 18·N tarimas, preferimos 18
    const objetivo = Math.min(18 * N, Math.max(16 * N, tot)); const meta = objetivo % 2 ? objetivo + (objetivo + 1 <= 18 * N ? 1 : -1) : objetivo;
    const P_ = prodIndex(P);
    while (tot < meta) { T[XX] = (T[XX] || 0) + 1; tot++; }
    while (tot > meta) {
      let peor = null, pd = -1e9;
      Object.keys(T).forEach((k) => { if (T[k] <= 0) return; const p = P_.get(+k); const d = p ? diasDe(p, T[k] * p.cxt) : 0; if (d > pd) { pd = d; peor = k; } });
      if (!peor) break; T[peor]--; tot--; if (!T[peor]) delete T[peor];
    }
    const n18 = (meta - 16 * N) / 2; const caps = Array.from({ length: N }, (_, i) => (i < n18 ? 18 : 16));
    return armarViajes(T, caps);
  }

  // Patrón de las hojas: los SKU grandes llenan viajes completos; los chicos se juntan en el último viaje.
  function armarViajes(T, caps) {
    const libre = caps.slice(); const V = caps.map((c) => ({ cap: c, lineas: [] }));
    Object.entries(T).map(([s, t]) => [+s, t]).sort((a, b) => b[1] - a[1]).forEach(([s, t]) => {
      while (t > 0) {
        let i;
        if (t >= 8) { i = 0; libre.forEach((l, k) => { if ((l >= t) > (libre[i] >= t) || ((l >= t) === (libre[i] >= t) && l > libre[i])) i = k; }); }
        else { i = -1; for (let k = libre.length - 1; k >= 0; k--) if (libre[k] >= t) { i = k; break; } if (i < 0) { i = 0; libre.forEach((l, k) => { if (l > libre[i]) i = k; }); } }
        if (libre[i] <= 0) break;
        const q = Math.min(t, libre[i]); const ya = V[i].lineas.find((x) => x.sku === s);
        if (ya) ya.tarimas += q; else V[i].lineas.push({ sku: s, tarimas: q });
        libre[i] -= q; t -= q;
      }
    });
    V.forEach((v) => v.lineas.sort((a, b) => b.tarimas - a.tarimas));
    return V;
  }

  function resumen(P, st) {
    const M = prodIndex(P); const S = new Map();
    st.viajes.forEach((v) => v.lineas.forEach((l) => { if (!l.sku || !(l.tarimas > 0)) return; S.set(l.sku, (S.get(l.sku) || 0) + Number(l.tarimas)); }));
    const filas = [...S.entries()].map(([sku, t]) => { const p = M.get(sku) || { sku, desc: String(sku), hlTarima: 0, cxt: 0, costo: 0 }; const cajas = t * (p.cxt || 0); return { sku, p, tarimas: t, hl: t * (p.hlTarima || 0), cajas, costo: cajas * (p.costo || 0) }; })
      .sort((a, b) => b.hl - a.hl);
    const tot = filas.reduce((a, f) => ({ hl: a.hl + f.hl, tarimas: a.tarimas + f.tarimas, cajas: a.cajas + f.cajas, costo: a.costo + f.costo }), { hl: 0, tarimas: 0, cajas: 0, costo: 0 });
    return { filas, tot, porSku: S };
  }

  const semaf = (d, obj) => (d == null ? '' : d < 7 ? 'pr-r' : d < obj ? 'pr-a' : 'pr-v');

  function render(cont, P, opts) {
    opts = opts || {};
    cont.replaceChildren();
    if (!P || !(P.productos || []).length) { cont.append(el('p', 'pp-mia', 'El pronóstico se arma con el inventario que subes. Sube el inventario y en la noche aparece aquí.')); return; }
    const KEY = 'cpn-pron-' + P.S2;
    let st = LS.get(KEY);
    if (!st || !st.viajes) st = { dias: P.diasObjetivo || 15, hl: Math.round(P.hlSugerido || P.metaSemanaHl || 0), nViajes: P.viajes || 4, viajes: (P.sugerido || []).map((v, i) => ({ cap: i < (P.viajes18 || 0) ? 18 : 16, lineas: v.map((x) => ({ sku: x.sku, tarimas: x.tarimas })) })) };
    const M = prodIndex(P);
    const guarda = () => LS.set(KEY, st);
    const opcionesSku = (P.productos || []).slice().sort((a, b) => a.rotacion - b.rotacion);

    const wrap = el('div', 'pr');
    // Barra superior: qué semana es, parámetros de Rubí y botones (pensado para computadora)
    const bar = el('div', 'pr-bar');
    const info = el('div', 'pr-info');
    info.append(el('b', null, P.hojaS2.charAt(0) + P.hojaS2.slice(1).toLowerCase()),
      el('span', null, 'S+2 · se manda el martes en Hl · inventario ' + (P.inventarioArchivo || '—').replace(/\.xlsx$/i, '')),
      el('span', null, 'Meta ' + n0(P.metaSemanaHl) + ' Hl por semana · S+1 (' + dia(P.S1) + ') fija: ' + n0(sumProg(P)) + ' tarimas · ' + (P.semanaFuerte ? 'semana de quincena: hasta 5 viajes' : 'semana normal: 4 viajes')));
    const prm = el('div', 'pr-prm');
    const campo = (lab, val, min, max, step, on) => { const l = el('label', 'pr-campo'); l.append(el('span', null, lab)); const i = el('input'); i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = val; i.addEventListener('change', () => on(Number(i.value))); l.append(i); return l; };
    prm.append(
      campo('Días de inventario', st.dias, 3, 40, 1, (v) => { st.dias = v || 15; guarda(); pinta(); }),
      campo('Hl a pedir', st.hl, 0, 3000, 1, (v) => { st.hl = v || 0; st.nViajes = null; guarda(); }),
      campo('Viajes', st.nViajes || st.viajes.length, 1, 6, 1, (v) => { st.nViajes = v || null; guarda(); }));
    const bSug = el('button', 'pp-btn', 'Armar sugerido'); bSug.type = 'button';
    bSug.addEventListener('click', () => { if (st.viajes.some((v) => v.lineas.length) && !window.confirm('Esto reemplaza los viajes que tienes armados. ¿Seguir?')) return; st.viajes = sugerir(P, st.dias, st.hl, st.nViajes); guarda(); pinta(); });
    prm.append(bSug);
    const acc = el('div', 'pr-acc'); const msg = el('p', 'pr-msg');
    bar.append(info, prm, acc);
    const tiles = el('div', 'pr-tiles'); const resumenBox = el('div', 'pr-scroll'); const viajesBox = el('div', 'pr-viajes'); const invBox = el('div');
    const colV = el('section', 'pr-col'); colV.append(el('h4', 'pr-h', 'Viajes · cambia el SKU o las tarimas y arriba se recalcula'), viajesBox);
    const colS = el('section', 'pr-col'); colS.append(el('h4', 'pr-h', 'Pronóstico por SKU'), resumenBox);
    const colI = el('section', 'pr-col'); colI.append(el('h4', 'pr-h', 'Días de inventario'), invBox);
    wrap.append(bar, msg, tiles, colV, colS, colI);
    cont.append(wrap);

    const bX = el('button', 'pp-btn pr-sec', 'Descargar Excel'); bX.type = 'button';
    bX.addEventListener('click', async () => { try { bX.disabled = true; msg.textContent = 'Armando el Excel…'; const { nombre, b64 } = await exportar(P, st); descargar(nombre, b64); msg.textContent = 'Listo: ' + nombre; } catch (e) { msg.textContent = 'No se pudo armar el Excel: ' + e.message; } finally { bX.disabled = false; } });
    acc.append(bX);
    if (opts.subir) {
      const bS = el('button', 'pp-btn', 'Guardar y mandar'); bS.type = 'button';
      bS.addEventListener('click', async () => { try { bS.disabled = true; msg.textContent = 'Guardando…'; const { nombre, b64 } = await exportar(P, st); await opts.subir(nombre, b64); msg.textContent = 'Guardado. Esta noche se integra al abasto y queda en el archivo de pronósticos.'; } catch (e) { msg.textContent = 'No se pudo guardar: ' + e.message; } finally { bS.disabled = false; } });
      acc.append(bS);
    }
    const bR = el('button', 'pr-link', 'Volver al sugerido'); bR.type = 'button';
    bR.addEventListener('click', () => { if (!window.confirm('¿Borrar tus cambios y volver al pedido sugerido?')) return; LS.del(KEY); render(cont, P, opts); });
    acc.append(bR);

    function pinta() {
      const R = resumen(P, st);
      // tarjetas
      tiles.replaceChildren();
      const t = (k, v, s, tono) => { const d = el('div', 'ht' + (tono ? ' ' + tono : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
      const n18 = st.viajes.filter((v) => v.cap === 18).length, n16 = st.viajes.length - n18;
      const malos = st.viajes.filter((v) => sumT(v) !== v.cap).length;
      t('Pronóstico S+2', n1(R.tot.hl) + ' Hl', 'meta de la semana ' + n0(P.metaSemanaHl) + ' Hl', R.tot.hl < (P.metaSemanaHl || 0) * 0.95 ? 'warn' : '');
      t('Tarimas', n0(R.tot.tarimas), st.viajes.length + ' viajes (' + n18 + ' de 18' + (n16 ? ', ' + n16 + ' de 16' : '') + ')', malos ? 'warn' : '');
      t('Cajas', n0(R.tot.cajas), R.filas.length + ' SKU');
      t('Costo', money(R.tot.costo), 'a costo de compra');
      if (st.viajes.length > 5 || (st.viajes.length === 5 && !P.semanaFuerte)) t('Ojo', st.viajes.length + ' viajes', st.viajes.length > 5 ? 'más de 5 pesa mucho en las finanzas' : 'el 5° viaje es solo para semana de quincena', 'bad');
      if (malos) t('Viajes incompletos', String(malos), 'cada viaje debe llevar 16 o 18 tarimas', 'bad');
      // resumen por SKU
      resumenBox.replaceChildren();
      const tw = el('div', 'tblwrap'); const tb = el('table', 'cpn-t pr-t');
      const hd = el('tr'); ['SKU', 'Descripción', 'Tarimas', 'Hl', 'Peso', 'C x T', 'Cajas', 'Costo caja', 'Costo total', 'Días al cierre S+2'].forEach((x, i) => hd.append(el('th', i > 1 ? 'num' : null, x)));
      tb.append(el('thead')); tb.tHead.append(hd); const bd = el('tbody');
      R.filas.forEach((f) => { const tr = el('tr'); const d = diasDe(f.p, f.cajas); const td = el('td', 'num ' + semaf(d, st.dias), d == null ? '—' : n1(d));
        tr.append(el('td', null, String(f.sku)), el('td', 'pr-desc', (f.p.desc || '').replace(/^\d+-/, '')), el('td', 'num', n0(f.tarimas)), el('td', 'num', n1(f.hl)), el('td', 'num', (f.p.hlTarima || 0).toFixed(2)), el('td', 'num', n0(f.p.cxt)), el('td', 'num', n0(f.cajas)), el('td', 'num', money(f.p.costo)), el('td', 'num', money(f.costo)), td); bd.append(tr); });
      const tt = el('tr', 'pr-tot'); tt.append(el('td'), el('td', null, 'Totales'), el('td', 'num', n0(R.tot.tarimas)), el('td', 'num', n1(R.tot.hl)), el('td'), el('td'), el('td', 'num', n0(R.tot.cajas)), el('td'), el('td', 'num', money(R.tot.costo)), el('td')); bd.append(tt);
      tb.append(bd); tw.append(tb); resumenBox.append(tw);
      pintaViajes(); pintaInv(R);
    }
    const sumT = (v) => v.lineas.reduce((a, l) => a + (Number(l.tarimas) || 0), 0);

    function pintaViajes() {
      viajesBox.replaceChildren();
      st.viajes.forEach((v, vi) => {
        const card = el('div', 'pr-viaje'); const h = el('div', 'pr-vcab');
        const sT = sumT(v); const hlV = v.lineas.reduce((a, l) => a + (Number(l.tarimas) || 0) * ((M.get(l.sku) || {}).hlTarima || 0), 0);
        h.append(el('b', null, 'Viaje ' + (vi + 1)));
        const cap = el('select', 'pr-cap'); cap.setAttribute('aria-label', 'Tarimas del viaje ' + (vi + 1)); [18, 16].forEach((c) => { const o = el('option', null, c + ' tarimas'); o.value = c; cap.append(o); }); cap.value = v.cap;
        cap.addEventListener('change', () => { v.cap = Number(cap.value); guarda(); pinta(); });
        h.append(cap, el('span', 'pr-vtot ' + (sT === v.cap ? 'ok' : 'bad'), sT + '/' + v.cap + ' tar · ' + n1(hlV) + ' Hl'));
        const del = el('button', 'pr-x', '×'); del.type = 'button'; del.setAttribute('aria-label', 'Quitar viaje ' + (vi + 1));
        del.addEventListener('click', () => { if (v.lineas.length && !window.confirm('¿Quitar el viaje ' + (vi + 1) + '?')) return; st.viajes.splice(vi, 1); guarda(); pinta(); });
        h.append(del); card.append(h);
        v.lineas.forEach((l, li) => {
          const r = el('div', 'pr-lin');
          const s = el('select'); s.setAttribute('aria-label', 'SKU'); const o0 = el('option', null, 'Elige SKU'); o0.value = ''; s.append(o0);
          opcionesSku.forEach((p) => { const o = el('option', null, (p.desc || '').replace(/^\d+-/, '') + ' · ' + p.sku); o.value = p.sku; s.append(o); });
          s.value = l.sku || ''; s.addEventListener('change', () => { l.sku = Number(s.value) || null; guarda(); pinta(); });
          const tq = el('input'); tq.type = 'number'; tq.min = 0; tq.max = 18; tq.step = 1; tq.value = l.tarimas; tq.setAttribute('aria-label', 'Tarimas');
          tq.addEventListener('change', () => { l.tarimas = Math.max(0, Math.round(Number(tq.value) || 0)); guarda(); pinta(); });
          const p = M.get(l.sku) || {};
          const x = el('button', 'pr-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Quitar renglón'); x.addEventListener('click', () => { v.lineas.splice(li, 1); guarda(); pinta(); });
          r.append(s, tq, el('span', 'pr-hl', n1((Number(l.tarimas) || 0) * (p.hlTarima || 0)) + ' Hl'), x);
          card.append(r);
        });
        const add = el('button', 'pr-add', '+ SKU'); add.type = 'button'; add.addEventListener('click', () => { v.lineas.push({ sku: null, tarimas: 0 }); guarda(); pinta(); });
        card.append(add); viajesBox.append(card);
      });
      const addV = el('button', 'pr-add pr-addv', '+ Viaje'); addV.type = 'button';
      addV.addEventListener('click', () => { st.viajes.push({ cap: 18, lineas: [] }); guarda(); pinta(); });
      viajesBox.append(addV);
    }

    function pintaInv(R) {
      invBox.replaceChildren();
      const ley = el('div', 'pr-ley'); [['#e5484d', 'menos de 7 días'], ['#E9B949', 'menos de ' + st.dias + ' días (tu objetivo)'], ['#30a46c', st.dias + ' días o más']].forEach(([c, t]) => { const x = el('span'); const i = el('i'); i.style.background = c; x.append(i, document.createTextNode(t)); ley.append(x); });
      ley.append(el('span', null, 'Días = cajas ÷ venta diaria del mes. "Al iniciar S+2" ya suma lo que llega en la S+1.'));
      invBox.append(ley);
      const tw = el('div', 'tblwrap pr-inv'); const tb = el('table', 'cpn-t pr-t');
      const hd = el('tr'); ['#', 'SKU', 'Producto', 'Almacén', 'Camiones', 'Venta/día', 'Días hoy', 'Llega S+1', 'Días inicio S+2', 'Pedido S+2', 'Días cierre S+2'].forEach((x, i) => hd.append(el('th', i > 2 ? 'num' : null, x)));
      tb.append(el('thead')); tb.tHead.append(hd); const bd = el('tbody');
      (P.productos || []).filter((p) => p.ventaDia > 0 || p.almacen > 0 || R.porSku.has(p.sku)).forEach((p) => {
        const tq = R.porSku.get(p.sku) || 0; const dh = p.ventaDia > 0 ? (p.almacen + p.camiones) / p.ventaDia : null; const di = p.ventaDia > 0 ? inicio(p) / p.ventaDia : null; const df = diasDe(p, tq * p.cxt);
        const tr = el('tr');
        tr.append(el('td', null, String(p.rotacion)), el('td', null, String(p.sku)), el('td', null, (p.desc || '').replace(/^\d+-/, '')), el('td', 'num', n0(p.almacen)), el('td', 'num', n0(p.camiones)), el('td', 'num', n1(p.ventaDia)),
          el('td', 'num ' + semaf(dh, st.dias), dh == null ? 'sin venta' : n1(dh)), el('td', 'num', n0(p.progS1)), el('td', 'num ' + semaf(di, st.dias), di == null ? '—' : n1(di)), el('td', 'num', tq ? n0(tq) : '—'), el('td', 'num ' + semaf(df, st.dias), df == null ? '—' : n1(df)));
        bd.append(tr);
      });
      tb.append(bd); tw.append(tb); invBox.append(tw);
    }
    pinta();
  }

  function sumProg(P) { return (P.productos || []).reduce((a, p) => a + (p.progS1 || 0), 0); }
  function dia(s) { if (!s) return '—'; const d = new Date(s + 'T12:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); }

  // ---------------- Exportar a Excel (mismo formato que PRONOSTICO GENERAL) ----------------
  let cargaXlsx = null;
  function libXlsx() {
    if (window.XLSX && window.XLSX.utils) return Promise.resolve(window.XLSX);
    if (!cargaXlsx) cargaXlsx = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'xlsx-style.min.js'; s.onload = () => ok(window.XLSX); s.onerror = () => mal(new Error('no se pudo cargar el generador de Excel')); document.head.append(s); });
    return cargaXlsx;
  }
  function descargar(nombre, b64) {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const VERDE = '1F5E3B', CLARO = 'E8F1EA';
  const B = { top: { style: 'thin', color: { rgb: 'BFC7C2' } }, bottom: { style: 'thin', color: { rgb: 'BFC7C2' } }, left: { style: 'thin', color: { rgb: 'BFC7C2' } }, right: { style: 'thin', color: { rgb: 'BFC7C2' } } };
  const sHead = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: VERDE } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: B };
  const sViaje = { font: { bold: true }, fill: { fgColor: { rgb: CLARO } }, border: B };
  const sNum = (fmt) => ({ numFmt: fmt, border: B });
  const sTxt = { border: B };
  const sInput = { numFmt: '#,##0.00', fill: { fgColor: { rgb: 'FFF7D6' } }, border: B };
  const sTot = { font: { bold: true }, numFmt: '#,##0.00', border: B, fill: { fgColor: { rgb: 'F2F2F2' } } };
  const SEM = { r: { fill: { fgColor: { rgb: 'F4C7C3' } }, font: { color: { rgb: '9C0006' }, bold: true } }, a: { fill: { fgColor: { rgb: 'FFEB9C' } }, font: { color: { rgb: '7F6000' }, bold: true } }, v: { fill: { fgColor: { rgb: 'C6EFCE' } }, font: { color: { rgb: '006100' }, bold: true } } };

  function hojaSemana(X, P, titulo, fechaTxt, viajes) {
    // viajes: [{lineas:[{sku, hl}]}]
    const M = prodIndex(P); const ws = {}; const set = (ref, v, s, f) => { const c = { v: v == null ? '' : v, t: typeof v === 'number' ? 'n' : 's' }; if (f) c.f = f; if (s) c.s = s; ws[ref] = c; };
    const BASE = "BASE!$A$3:$H$600";
    const look = (cell, col) => 'IFERROR(VLOOKUP(' + cell + ',' + BASE + ',' + col + ',0),0)';
    ['SKU', 'DESCRIPCION', fechaTxt, 'PESO', 'COSTO', 'TARIMAS', 'C X T', 'TOTAL CAJAS', 'COSTO', 'C X H'].forEach((h, i) => set(String.fromCharCode(66 + i) + '2', h, sHead));
    set('N2', 'META', sHead); set('O2', P.metaSemanaHl || 0, sNum('#,##0'));
    // viajes desde la fila 27, bloques de 13 filas (encabezado + 12 renglones), 10 viajes
    const filasSku = new Map(); let fila = 27;
    for (let v = 0; v < 10; v++) {
      const ini = fila + 1, fin = fila + 12; const V = viajes[v] || { lineas: [] };
      const lin = V.lineas.filter((l) => l.sku && l.hl > 0).slice(0, 12);
      let d = 0, g = 0, ii = 0, jj = 0;
      lin.forEach((l, k) => {
        const r = ini + k; const p = M.get(l.sku) || {}; const t = p.hlTarima ? Math.floor(l.hl / p.hlTarima + 1e-9) : 0; const caj = t * (p.cxt || 0);
        set('B' + r, l.sku, sTxt); set('C' + r, (p.desc || ''), sTxt, 'IF(B' + r + '="","",IFERROR(VLOOKUP(B' + r + ',' + BASE + ',2,0),""))');
        set('D' + r, Math.ceil(l.hl * 100 - 1e-6) / 100, sInput);   // hacia arriba: que ROUNDDOWN(HL/PESO) dé las mismas tarimas
        set('E' + r, p.hlTarima || 0, sNum('0.0000'), 'IF(B' + r + '="","",' + look('B' + r, 4) + ')');
        set('F' + r, p.costo || 0, sNum('$#,##0.00'), 'IF(B' + r + '="","",' + look('B' + r, 6) + ')');
        set('G' + r, t, sNum('0'), 'IF(B' + r + '="","",ROUNDDOWN(IFERROR(D' + r + '/E' + r + ',0),0))');
        set('H' + r, p.cxt || 0, sNum('0'), 'IF(B' + r + '="","",' + look('B' + r, 5) + ')');
        set('I' + r, caj, sNum('#,##0'), 'IF(B' + r + '="","",H' + r + '*G' + r + ')');
        set('J' + r, caj * (p.costo || 0), sNum('$#,##0.00'), 'IF(B' + r + '="","",I' + r + '*F' + r + ')');
        set('K' + r, p.cxh || 0, sNum('0.00'), 'IF(B' + r + '="","",' + look('B' + r, 8) + ')');
        d += l.hl; g += t; ii += caj; jj += caj * (p.costo || 0);
        const fs = filasSku.get(l.sku) || { hl: 0, t: 0, caj: 0, costo: 0 }; fs.hl += l.hl; fs.t += t; fs.caj += caj; fs.costo += caj * (p.costo || 0); filasSku.set(l.sku, fs);
      });
      set('B' + fila, 'VIAJE ' + (v + 1), sViaje);
      set('C' + fila, lin.length ? lin.length + ' SKU' : '', sViaje, 'IF(COUNT(B' + ini + ':B' + fin + ')=0,"",COUNT(B' + ini + ':B' + fin + ')&" SKU")');
      set('D' + fila, d, Object.assign({}, sViaje, { numFmt: '#,##0.00' }), 'SUM(D' + ini + ':D' + fin + ')');
      set('G' + fila, g, sViaje, 'SUM(G' + ini + ':G' + fin + ')');
      set('I' + fila, ii, Object.assign({}, sViaje, { numFmt: '#,##0' }), 'SUM(I' + ini + ':I' + fin + ')');
      set('J' + fila, jj, Object.assign({}, sViaje, { numFmt: '$#,##0.00' }), 'SUM(J' + ini + ':J' + fin + ')');
      fila += 13;
    }
    const tot = [...filasSku.values()].reduce((a, x) => ({ hl: a.hl + x.hl, t: a.t + x.t, caj: a.caj + x.caj, costo: a.costo + x.costo }), { hl: 0, t: 0, caj: 0, costo: 0 });
    set('B157', 'TOTAL VIAJES', sTot); set('D157', tot.hl, sTot, 'SUMIF(B27:B156,">0",D27:D156)'); set('G157', tot.t, sTot, 'SUMIF(B27:B156,">0",G27:G156)');
    set('I157', tot.caj, Object.assign({}, sTot, { numFmt: '#,##0' }), 'SUMIF(B27:B156,">0",I27:I156)'); set('J157', tot.costo, Object.assign({}, sTot, { numFmt: '$#,##0.00' }), 'SUMIF(B27:B156,">0",J27:J156)');
    // resumen por SKU arriba (filas 3-20), como en el Excel
    const skus = [...filasSku.keys()].sort((a, b) => filasSku.get(b).hl - filasSku.get(a).hl).slice(0, 18);
    for (let k = 0; k < 18; k++) {
      const r = 3 + k; const s = skus[k]; const p = (s && M.get(s)) || {}; const fs = (s && filasSku.get(s)) || { hl: 0, t: 0, caj: 0, costo: 0 };
      if (s) { set('B' + r, s, sTxt); set('C' + r, p.desc || '', sTxt, 'IF(B' + r + '="","",IFERROR(VLOOKUP(B' + r + ',' + BASE + ',2,0),""))'); }
      set('D' + r, s ? fs.hl : 0, sNum('#,##0.00'), 'IF(B' + r + '="",0,SUMIF($B$27:$B$156,B' + r + ',$D$27:$D$156))');
      set('E' + r, p.hlTarima || 0, sNum('0.0000'), look('B' + r, 4)); set('F' + r, p.costo || 0, sNum('$#,##0.00'), look('B' + r, 6));
      set('G' + r, s ? Math.floor(fs.hl / (p.hlTarima || 1) + 1e-9) : 0, sNum('0'), 'ROUNDDOWN(IFERROR(D' + r + '/E' + r + ',0),0)');
      set('H' + r, p.cxt || 0, sNum('0'), look('B' + r, 5));
      const tg = s ? Math.floor(fs.hl / (p.hlTarima || 1) + 1e-9) : 0;
      set('I' + r, tg * (p.cxt || 0), sNum('#,##0'), 'H' + r + '*G' + r); set('J' + r, tg * (p.cxt || 0) * (p.costo || 0), sNum('$#,##0.00'), 'I' + r + '*F' + r); set('K' + r, p.cxh || 0, sNum('0.00'), look('B' + r, 8));
    }
    set('C21', 'TOTALES', sTot); set('D21', tot.hl, sTot, 'SUM(D3:D20)'); set('G21', tot.t, sTot, 'ROUNDDOWN(SUM(G3:G20),0)'); set('J22', tot.costo, Object.assign({}, sTot, { numFmt: '$#,##0.00' }), 'SUM(J3:J20)');
    set('C24', 'TOTAL VIAJES', sTot); set('D24', tot.hl, sTot, 'D157'); set('G24', tot.t, sTot, 'G157'); set('I24', tot.caj, Object.assign({}, sTot, { numFmt: '#,##0' }), 'I157'); set('J24', tot.costo, Object.assign({}, sTot, { numFmt: '$#,##0.00' }), 'J157');
    set('L24', '✔ HL coinciden', null, 'IF(ROUND(D24,2)=ROUND(D21,2),"✔ HL coinciden","✘ HL no coinciden ("&TEXT(D24-D21,"#,##0.00")&")")');
    set('B25', 'VIAJES', sViaje);
    ['SKU', 'DESCRIPCION', 'HL', 'PESO', 'COSTO', 'TARIMAS', 'C X T', 'TOTAL CAJAS', 'COSTO', 'C X H'].forEach((h, i) => set(String.fromCharCode(66 + i) + '26', h, sHead));
    set('B1', titulo, { font: { bold: true, sz: 14, color: { rgb: VERDE } } });
    ws['!ref'] = 'A1:O157';
    ws['!cols'] = [{ wch: 3 }, { wch: 10 }, { wch: 42 }, { wch: 10 }, { wch: 9 }, { wch: 11 }, { wch: 9 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 18 }, { wch: 2 }, { wch: 8 }, { wch: 9 }];
    ws['!freeze'] = { xSplit: 0, ySplit: 2 };
    return ws;
  }

  function hojaInventario(X, P, st, porSku) {
    const rows = [['INVENTARIO Y DÍAS DE INVENTARIO · ' + (P.inventarioArchivo || '') + ' · objetivo ' + st.dias + ' días'], [],
      ['#', 'SKU', 'CLAVE', 'PRODUCTO', 'ALMACÉN (CJ)', 'CAMIONES (CJ)', 'VENTA POR DÍA (CJ)', 'DÍAS HOY', 'LLEGA S+1 (TAR)', 'DÍAS AL INICIAR S+2', 'PEDIDO S+2 (TAR)', 'PEDIDO S+2 (HL)', 'DÍAS AL CIERRE S+2']];
    const marks = [];
    (P.productos || []).filter((p) => p.ventaDia > 0 || p.almacen > 0 || porSku.has(p.sku)).forEach((p) => {
      const tq = porSku.get(p.sku) || 0; const dh = p.ventaDia > 0 ? (p.almacen + p.camiones) / p.ventaDia : null; const di = p.ventaDia > 0 ? inicio(p) / p.ventaDia : null; const df = diasDe(p, tq * p.cxt);
      const r = [p.rotacion, p.sku, p.clave, (p.desc || '').replace(/^\d+-/, ''), p.almacen, p.camiones, Math.round(p.ventaDia * 10) / 10, dh == null ? 'sin venta' : Math.round(dh * 10) / 10, p.progS1, di == null ? '' : Math.round(di * 10) / 10, tq, Math.round(tq * (p.hlTarima || 0) * 100) / 100, df == null ? '' : Math.round(df * 10) / 10];
      rows.push(r); marks.push([rows.length, dh, di, df]);
    });
    const ws = X.utils.aoa_to_sheet(rows);
    for (let c = 0; c < 13; c++) { const ref = X.utils.encode_cell({ r: 2, c }); if (ws[ref]) ws[ref].s = sHead; }
    ws.A1.s = { font: { bold: true, sz: 13, color: { rgb: VERDE } } };
    const col = (d) => (d == null || d === '' ? null : d < 7 ? SEM.r : d < st.dias ? SEM.a : SEM.v);
    marks.forEach(([r, dh, di, df]) => { [[7, dh], [9, di], [12, df]].forEach(([c, d]) => { const ref = X.utils.encode_cell({ r: r - 1, c }); const s = col(d); if (ws[ref]) ws[ref].s = Object.assign({ border: B, numFmt: '0.0' }, s || {}); }); });
    ws['!cols'] = [{ wch: 4 }, { wch: 9 }, { wch: 7 }, { wch: 38 }, { wch: 11 }, { wch: 11 }, { wch: 12 }, { wch: 10 }, { wch: 11 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 12 }];
    return ws;
  }

  function hojaBase(X, P) {
    const M = prodIndex(P); const vistos = new Set();
    const rows = [['CATÁLOGO DE PRODUCTOS (BASE)'], ['SKU', 'DESCRIPCION', 'CLAVE POWER SALES', 'PESO (HL POR TARIMA)', 'C X T (CAJAS POR TARIMA)', 'COSTO POR CAJA', 'LITROS POR CAJA', 'C X H (CAJAS POR HL)']];
    (P.productos || []).forEach((p) => { vistos.add(p.sku); rows.push([p.sku, p.desc, p.clave || '', p.hlTarima, p.cxt, p.costo, p.lxc, p.cxh]); });
    (P.base || []).forEach((b) => { if (vistos.has(b.sku)) return; vistos.add(b.sku); const p = M.get(b.sku) || {}; rows.push([b.sku, b.desc, '', b.hlTarima, b.cxt, p.costo || 0, b.cxt ? Math.round(b.hlTarima * 10000 / b.cxt) / 100 : '', b.cxh || '']); });
    const ws = X.utils.aoa_to_sheet(rows);
    for (let c = 0; c < 8; c++) { const ref = X.utils.encode_cell({ r: 1, c }); if (ws[ref]) ws[ref].s = sHead; }
    ws.A1.s = { font: { bold: true, sz: 13, color: { rgb: VERDE } } };
    ws['!cols'] = [{ wch: 10 }, { wch: 44 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    return ws;
  }

  async function exportar(P, st) {
    const X = await libXlsx();
    const wb = X.utils.book_new();
    const M = prodIndex(P);
    const fechaTxt = (() => { const d = new Date(P.S2 + 'T12:00'); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2); })();
    // semanas anteriores (las hojas de abajo), de la más vieja a la más nueva, y al final la de esta semana
    (P.hist || []).filter((h) => h.lunes < P.S2).forEach((h) => {
      const ws = hojaSemana(X, P, h.hoja, '', h.viajes.map((v) => ({ lineas: v.map((x) => ({ sku: x.sku, hl: x.hl })) })));
      X.utils.book_append_sheet(wb, ws, h.hoja.slice(0, 31));
    });
    const viajes = st.viajes.map((v) => ({ lineas: v.lineas.filter((l) => l.sku && l.tarimas > 0).map((l) => ({ sku: l.sku, hl: Math.round(l.tarimas * ((M.get(l.sku) || {}).hlTarima || 0) * 10000) / 10000 })) }));
    X.utils.book_append_sheet(wb, hojaSemana(X, P, P.hojaS2 + ' · PRONÓSTICO S+2', fechaTxt, viajes), P.hojaS2.slice(0, 31));
    const porSku = new Map(); st.viajes.forEach((v) => v.lineas.forEach((l) => { if (l.sku && l.tarimas > 0) porSku.set(l.sku, (porSku.get(l.sku) || 0) + Number(l.tarimas)); }));
    X.utils.book_append_sheet(wb, hojaInventario(X, P, st, porSku), 'INVENTARIO Y DIAS');
    X.utils.book_append_sheet(wb, hojaBase(X, P), 'BASE');
    wb.Workbook = { Views: [{ activeTab: Math.max(0, wb.SheetNames.indexOf(P.hojaS2.slice(0, 31))) }] };
    const b64 = X.write(wb, { bookType: 'xlsx', type: 'base64', cellStyles: true });
    return { nombre: 'PRONOSTICO S+2 ' + P.hojaS2 + '.xlsx', b64 };
  }

  window.CPN_PRON = { render, sugerir, exportar };
})();
