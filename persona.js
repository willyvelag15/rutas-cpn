/* Página por persona (13-nov-2026): se entra con el enlace secreto (?p=...) más el código de acceso que pone Willy.
   Tareas para responder (todas) y llamadas de verificación (recepción). Habla con Supabase solo por funciones. */
(function () {
  const SB = { u: 'https://musaubwzbtilbtqymixq.supabase.co', k: 'sb_publishable_v4noGaAwCkdTdkwxODyfMA_Wh_jwM28' };
  async function rpc(fn, body) {
    let r;
    try {
      r = await fetch(SB.u + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SB.k, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    } catch (e) { throw new Error('Sin conexión a internet. Intenta de nuevo.'); }
    const t = await r.text();
    if (!r.ok) { let m = ''; try { m = JSON.parse(t).message; } catch (e) {} throw new Error(m || 'No se pudo completar. Intenta de nuevo.'); }
    return t ? JSON.parse(t) : null;
  }
  window.cpnRpc = rpc;

  const LT = 'cpn-pagina-tok', LP = 'cpn-pagina-pin';
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: (k) => { try { localStorage.removeItem(k); } catch (e) {} } };
  const deUrl = new URLSearchParams(location.search).get('p');
  if (deUrl) ls.set(LT, deUrl);
  const tok = deUrl || ls.get(LT);

  const AREA = { almacen_pn: 'Almacén Piedras Negras', almacen_mix: 'Almacén Mixtequilla', recepcion: 'Recepción', sistemas: 'SIAD y Power Sales', encargada_mix: 'Encargada Mixtequilla', vendedor: 'Vendedor', admin: 'Administrador' };
  const PRONTO = {};
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const hoy = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
  const dia = (s) => { if (!s) return ''; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const hora = (s) => (s ? new Date(s).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const st = { pin: null, yo: null, vista: null, todos: false, ruta: null, pzPer: null, sec: null };
  const clave = () => tok + ':' + (st.pin || '');

  function mostrarForm(msg) {
    $('#pp-form').hidden = false; $('#pp-cuerpo').hidden = true;
    const e = $('#pp-error'); e.hidden = !msg; e.textContent = msg || '';
    setTimeout(() => { const i = $('#pp-codigo'); if (i) i.focus(); }, 50);
  }

  async function entrar(pin, recordar) {
    st.pin = pin;
    st.yo = await rpc('quien_soy', { p_clave: clave() });
    if (recordar) ls.set(LP, pin); else ls.del(LP);
    $('#pp-form').hidden = true; $('#pp-cuerpo').hidden = false;
    $('#pp-nombre').textContent = 'Hola, ' + st.yo.nombre.split(' ')[0];
    $('#pp-area').textContent = (AREA[st.yo.rol] || '') + (st.yo.ruta ? ' · ' + st.yo.ruta : '');
    const vistas = st.yo.rol === 'recepcion' ? [['panel', 'Mi resumen'], ['llamadas', 'Llamadas'], ['tareas', 'Mis tareas']]
      : st.yo.rol === 'vendedor' ? [['panel', 'Mi avance'], ['tareas', 'Mis tareas']]
      : [['panel', 'Mi resumen'], ['hallazgos', 'Hallazgos'], ['tareas', 'Mis tareas']];
    if (!st.vista || !vistas.some((v) => v[0] === st.vista)) st.vista = vistas[0][0];
    const nav = $('#pp-tabs'); nav.replaceChildren(); nav.hidden = vistas.length < 2;
    vistas.forEach(([k, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.vista === k)); b.addEventListener('click', () => { st.vista = k; [...nav.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintar(); }); nav.append(b); });
    const pr = $('#pp-pronto'); pr.hidden = !PRONTO[st.yo.rol]; pr.textContent = PRONTO[st.yo.rol] || '';
    await pintar();
  }

  async function pintar() {
    const v = $('#pp-vista'); v.setAttribute('aria-busy', 'true');
    try { if (st.vista === 'panel') await pintarPanel(v); else if (st.vista === 'llamadas') await pintarLlamadas(v); else if (st.vista === 'hallazgos') await pintarHallazgos(v); else await pintarTareas(v); }
    catch (e) {
      if (/código|Enlace/i.test(e.message)) { ls.del(LP); mostrarForm(e.message); return; }
      v.replaceChildren(el('p', 'pp-err', e.message));
    } finally { v.removeAttribute('aria-busy'); }
  }


  /* ---------- Mi resumen: tablero por puesto (17-nov-2026, rediseño: inicio con indicadores + menú de íconos) ---------- */
  const IC = {
    inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    cierre: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    abasto: 'M3 20h18M5 20V10h6v10M13 20V6h6v14',
    programa: 'M2 16V6h11v10M13 9h4.5l3.5 4v3h-8M6 18.5a2 2 0 1 0 0-.01M17 18.5a2 2 0 1 0 0-.01',
    inventario: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    carga: 'M3 17h4l3-8h7l4 8M7 17v2M17 17v2M9 13h8',
    envase: 'M9 3h6M10 3v4l-3 4v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-9l-3-4V3M7 13h10',
    productos: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
    avance: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M21 3l-9 9',
    ventas: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
    liquidaciones: 'M3 7h18v10H3zM12 12m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M6 10v4M18 10v4',
    trasRegreso: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    sinCompra: 'M9 8a3.5 3.5 0 1 0 0-.01M2.5 20a6.5 6.5 0 0 1 13 0M17 9l4 4M21 9l-4 4',
    scorecard: 'M9 5h10M9 12h10M9 19h10M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2',
    paradas: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 9.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0',
    bonos: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8 21h8M9 17h6',
    bonificacion: 'M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H8a2.5 2.5 0 1 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 1 0 0-5c-3 0-4 5-4 5z',
    gastovar: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    margen: 'M19 5L5 19M7 7m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
    slides: 'M3 4h18v12H3zM12 16v4M8 20h8M7 12l3-3 2 2 4-4',
    inv: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
    pron: 'M4 4h16v16H4zM4 9h16M9 4v16M12 13h5M12 16h3',
    clientesMes: 'M3 20h18M6 16l4-5 3 3 5-7',
    riesgo: 'M12 3l9 16H3zM12 10v4M12 17h.01',
    saturacion: 'M4 20V10M10 20V4M16 20v-8M22 20H2'
  };
  ['metaVend:avance', 'topVend:clientesMes', 'caidaVend:riesgo', 'satVend:saturacion', 'productosVend:productos', 'hoy:sinCompra'].forEach((x) => { const [k, v] = x.split(':'); if (!IC[k]) IC[k] = IC[v] || IC.ventas; });
  const icono = (k) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', IC[k] || IC.ventas); s.append(p); return s; };
  const CORTO = { avance: 'Avance', ventas: 'Ventas', productos: 'Productos', liquidaciones: 'Liquidaciones', envase: 'Envase', scorecard: 'Scorecard', sinCompra: 'Sin compra', trasRegreso: 'Ventas en CEDIS', paradas: 'Paradas', bonos: 'Bonos', abasto: 'Abasto', programa: 'Programa Heineken', inventario: 'Inventario camiones', carga: 'Carga', bonificacion: 'Bonificación', gastovar: 'Gasto variable', margen: 'Margen', cierre: 'Cierre del día', slides: 'Presentación', inv: 'Subir inventario', pron: 'Pronóstico S+2', clientesMes: 'Clientes del mes', riesgo: 'Clientes en riesgo', saturacion: 'Saturación semanal', calidad: 'Calidad de datos', hoy: 'Tu lista de hoy', metaVend: 'Tu meta', topVend: 'Mejores clientes', caidaVend: 'Clientes en caída', satVend: 'Saturación', productosVend: 'Tus productos' };

  function tilesDe(s) { const t = el('div', 'hal-tiles'); (s.tiles || []).forEach((x) => { const d = el('div', 'hal-tile' + (x.tono ? ' ' + x.tono : '')); d.append(el('span', null, x.k), el('b', null, x.v)); if (x.s) d.append(el('small', null, x.s)); t.append(d); }); return t; }
  function tablaDe(cols, filas, ok) {
    const iR = cols.findIndex((x) => x[0] === 'Ruta');
    const F = filas.filter((f) => iR < 0 || ok(f[iR]));
    if (!F.length) return el('p', 'pp-mia', 'Nada que mostrar.');
    const w = el('div', 'tblwrap'); const t = el('table', 'cpn-t pp-tarj'); const h = el('tr'); cols.forEach(([n, cl]) => h.append(el('th', cl || null, n)));
    t.append(el('thead')); t.tHead.append(h); const b = el('tbody');
    F.forEach((f) => { const tr = el('tr'); f.forEach((x, i) => { const td = el('td', (cols[i] && cols[i][1]) || null, x); td.setAttribute('data-k', (cols[i] && cols[i][0]) || ''); tr.append(td); }); b.append(tr); });
    t.append(b); w.append(t); return w;
  }

  async function pintarPanel(v) {
    const r = await rpc('mi_panel', { p_clave: clave() });
    const P = r && r.datos;
    v.replaceChildren();
    if (!P) { v.append(el('p', 'pp-res', 'Tu resumen se carga con la actualización de la noche.')); return; }
    const esVend = st.yo.rol === 'vendedor';
    const ok = (txt) => !st.ruta || !txt || !/^Ruta \d+$/.test(txt) || txt === st.ruta;
    // Con una ruta elegida, cada sección usa sus números de esa ruta (porRuta) y no los de todas
    const S = (P.secciones || []).map((s) => (st.ruta && s.porRuta && s.porRuta[st.ruta]) ? Object.assign({}, s, s.porRuta[st.ruta]) : s);
    const items = [];
    if (st.yo.rol === 'almacen_pn') items.push({ id: 'inv' }, { id: 'pron' });
    if (st.yo.rol === 'almacen_mix') items.push({ id: 'inv' });
    if ((P.slides || []).length && window.CPN_PZ && !esVend) items.push({ id: 'slides' });
    if (esVend && P.hoy && (P.hoy.clientes || []).length) items.push({ id: 'hoy' });
    S.forEach((s) => items.push({ id: s.id, s }));
    if (esVend && (P.slides || []).length && window.CPN_PZ) items.push({ id: 'slides' });
    if (st.sec && !items.some((x) => x.id === st.sec)) st.sec = null;

    const dash = el('div', 'pp-dash');
    // menú lateral (computadora) / barra de íconos
    const menu = el('nav', 'pp-menu'); menu.setAttribute('aria-label', 'Secciones');
    const boton = (id, t) => { const b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', String((st.sec || 'inicio') === id)); b.append(icono(id), el('span', null, t)); b.addEventListener('click', () => { st.sec = id === 'inicio' ? null : id; pintarPanel(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }); return b; };
    menu.append(boton('inicio', 'Inicio'));
    items.forEach((x) => menu.append(boton(x.id, CORTO[x.id] || (x.s && x.s.titulo) || x.id)));
    const main = el('div', 'pp-main');
    const velo = el('div', 'pp-velo');
    const cierra = () => { menu.classList.remove('abierto'); velo.classList.remove('abierto'); };
    velo.addEventListener('click', cierra);
    dash.append(menu, velo, main); v.append(dash);
    // celular: menú lateral que se abre con el botón ☰ (Willy, 21-nov-2026: nada de puro scroll)
    const mb = el('button', 'pp-menubtn'); mb.type = 'button'; mb.setAttribute('aria-label', 'Abrir menú');
    mb.append(el('span', 'pp-hamb', '☰'), el('span', null, (st.sec ? (CORTO[st.sec] || ((items.find((x) => x.id === st.sec) || {}).s || {}).titulo || 'Menú') : 'Menú')));
    mb.addEventListener('click', () => { menu.classList.add('abierto'); velo.classList.add('abierto'); });
    main.append(mb);

    const cab = el('div', 'pp-cabeza');
    cab.append(el('span', 'pp-mia', 'Datos al ' + dia(P.corte) + ' · se actualiza cada noche'));
    const rutas = P.rutas || [];
    if (rutas.length > 1 && st.sec !== 'inv' && st.sec !== 'pron') {
      const f = el('div', 'pp-rutas'); ['Todas'].concat(rutas).forEach((x) => { const b = el('button', null, x === 'Todas' ? x : x.replace('Ruta ', 'R')); b.type = 'button'; b.setAttribute('aria-pressed', String((st.ruta || 'Todas') === x)); b.addEventListener('click', () => { st.ruta = x === 'Todas' ? null : x; pintarPanel(v); }); f.append(b); });
      cab.append(f);
    }
    main.append(cab);

    if (!st.sec) {
      { const root = document.querySelector('#persona .pp'); if (root) root.classList.remove('pp-ancho'); }
      if (esVend && (P.slides || []).length) main.append(inicioVendedor(P));
      else {
        // indicadores clave: el primer cuadro de cada sección
        const k = el('div', 'pp-kpis');
        S.forEach((s) => { const x = (s.tiles || [])[0]; if (!x || k.children.length >= 6) return; const d = el('button', 'pp-kpi' + (x.tono ? ' ' + x.tono : '')); d.type = 'button'; d.append(icono(s.id), el('span', null, x.k), el('b', null, x.v)); if (x.s) d.append(el('small', null, x.s)); d.addEventListener('click', () => { st.sec = s.id; pintarPanel(v); }); k.append(d); });
        main.append(k);
        if (P.mix && (P.mix.filas || []).length) main.append(graficaMix(P.mix));
      }
      // (21-nov-2026, Willy) sin cuadros de secciones en el Inicio: todo se abre desde el menú lateral
      return;
    }

    const it = items.find((x) => x.id === st.sec);
    { const root = document.querySelector('#persona .pp'); if (root) root.classList.toggle('pp-ancho', st.sec === 'pron' || st.sec === 'inv'); }
    const c = el('section', 'card pp-panel');
    const h = el('div', 'pp-sec-cab'); const vb = el('button', 'pp-volver'); vb.type = 'button'; vb.setAttribute('aria-label', 'Volver al inicio'); vb.textContent = '‹'; vb.addEventListener('click', () => { st.sec = null; pintarPanel(v); });
    h.append(vb, icono(it.id), el('h3', null, it.s ? it.s.titulo : CORTO[it.id]));
    c.append(h);
    if (it.id === 'hoy') { c.append(listaHoy(P)); main.append(c); return; }
    // (Willy, 24-nov-2026) Programa Heineken de Rubí en recuadros, más fácil de leer
    if (it.id === 'programa' && P.pron && P.pron.programa && window.CPN_PRON && window.CPN_PRON.programaCards) { const b = el('div'); window.CPN_PRON.programaCards(b, P.pron); c.append(b); main.append(c); return; }
    if (it.id === 'inv') {
      // (Willy, 24-nov-2026) a la derecha, el reporte de días de inventario listo para imprimir
      const pr = P.pron; const der = el('div', 'ir-der');
      const pinta = (src) => { if (window.CPN_INVREP) window.CPN_INVREP.render(der, pr, src); };
      const ultimo = () => { try { const u = JSON.parse(localStorage.getItem('cpn-inv-ult')); if (u && pr && u.ts > Date.parse((pr.generado || '') + 'Z')) return { archivo: u.nombre, cuando: u.ts, porClave: u.porClave, nombres: u.nombres }; } catch (e) { /* */ } return pr ? { archivo: pr.inventarioArchivo, cuando: Date.parse((pr.fecha || '') + 'T12:00') || Date.now() } : null; };
      const izq = await cajaInventario(true, null, async (file, almacen) => {
        if (!pr || almacen !== 'Piedras Negras' || !/\.xls[xm]?$/i.test(file.name) || !window.CPN_INVREP) return;
        try { const L = await window.CPN_INVREP.leer(file); const u = { nombre: file.name, ts: Date.now(), porClave: L.porClave, nombres: L.nombres }; try { localStorage.setItem('cpn-inv-ult', JSON.stringify(u)); } catch (e) { /* */ } pinta({ archivo: u.nombre, cuando: u.ts, porClave: u.porClave, nombres: u.nombres }); }
        catch (e) { der.replaceChildren(el('p', 'pp-err', 'Se subió, pero no pude leer el Excel para el reporte: ' + e.message)); }
      });
      if (pr) { const g = el('div', 'ir-grid'); g.append(izq, der); c.append(g); pinta(ultimo()); } else c.append(izq);
      main.append(c); return;
    }
    if (it.id === 'pron') {
      // Pronóstico S+2 editable (Willy, 20-nov-2026): la app sugiere el pedido en viajes y Rubí lo ajusta
      if (P.pron && window.CPN_PRON) {
        const box = el('div'); c.append(box);
        window.CPN_PRON.render(box, P.pron, { subir: (nombre, b64) => rpc('subir_inventario', { p_clave: clave(), p_almacen: 'Pronóstico S+2', p_nombre: nombre, p_tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', p_contenido: b64 }) });
        const det = el('details', 'pp-det'); det.append(el('summary', null, 'O sube tu archivo de pronóstico'), await cajaInventario(true, 'pron')); c.append(det);
      } else c.append(await cajaInventario(true, 'pron'));
      main.append(c); return;
    }
    if (it.id === 'slides') {
      const PZ = window.CPN_PZ;
      const per = []; P.slides.forEach((x) => { if (!per.some((p) => p.id === x.periodo.id)) per.push(x.periodo); });
      const sel = el('select', 'pp-sel'); per.forEach((p) => { const o = el('option', null, p.etiqueta + (p.tipo === 'mes' ? ' (al ' + dia(p.hasta) + ')' : p.completa ? '' : ' (en curso)')); o.value = p.id; sel.append(o); });
      if (st.pzPer && per.some((p) => p.id === st.pzPer)) sel.value = st.pzPer;
      const caja = el('div', 'pz-list');
      const dibuja = () => { st.pzPer = sel.value; caja.replaceChildren(); const pp = per.find((p) => p.id === sel.value);
        P.slides.filter((x) => x.periodo.id === sel.value && ok(x.slide.ruta)).forEach((x) => { const w = el('div', 'pz-wrap'); w.style.alignItems = 'flex-start'; const n = PZ.slide(x.slide, pp, P.corte); w.append(n); caja.append(w); const z = Math.min(1, (caja.clientWidth || 540) / 540); if (z < 1) n.style.zoom = z; }); };
      sel.addEventListener('change', dibuja); c.append(sel, caja); main.append(c); dibuja(); return;
    }
    const s = it.s;
    if ((s.id === 'riesgo' || s.id === 'saturacion') && window.CPN_CLI) {
      if (s.nota) c.append(el('p', 'pp-mia', s.nota));
      const box = el('div', 'envf'); c.append(box); main.append(c);
      if (s.id === 'riesgo') { st.rsg = st.rsg || {}; window.CPN_CLI.riesgo(box, { filas: (s.cli || {}).filas || [], okRuta: ok, estado: st.rsg }); }
      else window.CPN_CLI.satSem(box, { sem: (s.sat || {}).sem || [], filas: (s.sat || {}).casos || [], okRuta: ok });
      return;
    }
    if (s.id === 'clientesMes' && s.cli && window.CPN_CLI) {
      if (s.nota) c.append(el('p', 'pp-mia', s.nota));
      const box = el('div', 'envf rcli'); c.append(box); main.append(c);
      st.cli = st.cli || {};
      window.CPN_CLI.render(box, { filas: s.cli.filas, det: s.cli.det, okRuta: ok, estado: st.cli, dinero: P.dinero !== false, sinMargen: !!s.cli.sinMargen });
      return;
    }
    if (s.id === 'envase' && s.mov && window.CPN_ENV) {
      if (s.nota) c.append(el('p', 'pp-mia', s.nota));
      const box = el('div', 'envf'); c.append(box); main.append(c);
      st.env = st.env || {};
      window.CPN_ENV.render(box, { mov: s.mov, corteDev: s.corteDev, okRuta: ok, estado: st.env });
      return;
    }
    if (s.nota) c.append(el('p', 'pp-mia', s.nota));
    if (s.tiles && s.tiles.length) c.append(tilesDe(s));
    if (s.cols && s.cols.length) c.append(tablaDe(s.cols, s.filas, ok));
    [s.detalle, s.detalle2].forEach((dd, i) => { if (!dd) return; const d = el('details'); if (i === 1) d.open = true; d.append(el('summary', null, dd.titulo), tablaDe(dd.cols, dd.filas, ok)); c.append(d); });
    main.append(c);
  }

  /* ---------- Gráficas de pastel: cómo se reparte la venta por producto (día, semana, mes) ---------- */
  const COLS_P = ['#2E7D4F', '#E0A43A', '#3B82C4', '#C0392B', '#8E5BB5', '#16A3A3', '#D9653B', '#7A8B2E', '#9AA0A6'];
  function graficaMix(M) {
    const w = el('section', 'card pp-mix');
    st.mix = st.mix || { per: 'dia', med: 'cajas', fecha: null };
    const m = st.mix;
    const F = (M.filas || []).filter((x) => !st.ruta || 'Ruta ' + x[1] === st.ruta);
    const fechas = [...new Set((M.filas || []).map((x) => x[0]))].sort();
    if (!fechas.length) return w;
    const ult = fechas[fechas.length - 1];
    if (!m.fecha || !fechas.includes(m.fecha)) m.fecha = ult;
    const lun = (s0) => { const d = new Date(s0 + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
    const h = el('div', 'pp-mix-cab');
    h.append(el('h3', null, 'Cómo se reparte la venta por producto' + (st.ruta ? ' · ' + st.ruta : '')));
    const ctr = el('div', 'pp-mix-ctr');
    const seg = (opts, key) => { const g = el('div', 'pp-seg'); opts.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(m[key] === v)); b.addEventListener('click', () => { m[key] = v; w.replaceWith(graficaMix(M)); }); g.append(b); }); return g; };
    ctr.append(seg([['dia', 'Día'], ['sem', 'Semana'], ['mes', 'Mes']], 'per'));
    const meds = [['cajas', 'Cajas'], ['hl', 'Hl']]; if (M.dinero) meds.push(['pesos', '$']);
    ctr.append(seg(meds, 'med'));
    let opciones;
    if (m.per === 'dia') opciones = fechas.slice().reverse().map((f) => [f, dia(f)]);
    else if (m.per === 'sem') opciones = [...new Set(fechas.map(lun))].sort().reverse().map((f) => [f, 'Semana del ' + dia(f)]);
    else opciones = [...new Set(fechas.map((f) => f.slice(0, 7)))].sort().reverse().map((f) => [f, new Date(f + '-15T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })]);
    const sel = el('select', 'pp-sel'); opciones.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; sel.append(o); });
    const k0 = m.per === 'dia' ? m.fecha : m.per === 'sem' ? lun(m.fecha) : m.fecha.slice(0, 7);
    sel.value = opciones.some((o) => o[0] === k0) ? k0 : opciones[0][0];
    sel.addEventListener('change', () => { const v0 = sel.value; m.fecha = m.per === 'dia' ? v0 : m.per === 'sem' ? (fechas.filter((f) => lun(f) === v0).pop() || v0) : (fechas.filter((f) => f.slice(0, 7) === v0).pop() || ult); w.replaceWith(graficaMix(M)); });
    ctr.append(sel);
    h.append(ctr); w.append(h);
    const clave0 = sel.value;
    const enPer = (f) => m.per === 'dia' ? f === clave0 : m.per === 'sem' ? lun(f) === clave0 : f.slice(0, 7) === clave0;
    const iv = m.med === 'cajas' ? 3 : m.med === 'hl' ? 4 : 5;
    const ag = {}; F.filter((x) => enPer(x[0])).forEach((x) => { ag[x[2]] = (ag[x[2]] || 0) + (x[iv] || 0); });
    const tot = Object.values(ag).reduce((a, b) => a + b, 0);
    if (!tot) { w.append(el('p', 'pp-mia', 'Sin venta en ese periodo.')); return w; }
    const orden = Object.entries(ag).sort((a, b) => b[1] - a[1]);
    const top = orden.slice(0, 8).map(([i, v]) => [M.productos[i], v]);
    const resto = orden.slice(8).reduce((a, x) => a + x[1], 0); if (resto > 0) top.push(['Otros ' + (orden.length - 8) + ' productos', resto]);
    const fmt = (v) => m.med === 'pesos' ? '$' + Math.round(v).toLocaleString('es-MX') : m.med === 'hl' ? (Math.round(v * 10) / 10).toLocaleString('es-MX') + ' Hl' : Math.round(v).toLocaleString('es-MX') + ' cajas';
    const cuerpo = el('div', 'pp-mix-cuerpo');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 200 200'); svg.setAttribute('class', 'pp-pastel'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Reparto de la venta por producto');
    let a0 = -Math.PI / 2;
    top.forEach(([n, v], i) => {
      const a1 = a0 + (v / tot) * Math.PI * 2;
      const path = document.createElementNS(NS, 'path');
      const R1 = 92, R0 = 56;
      const p = (r, a) => [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const [x1, y1] = p(R1, a0), [x2, y2] = p(R1, a1 - 0.0001), [x3, y3] = p(R0, a1 - 0.0001), [x4, y4] = p(R0, a0);
      path.setAttribute('d', `M${x1},${y1}A${R1},${R1} 0 ${big} 1 ${x2},${y2}L${x3},${y3}A${R0},${R0} 0 ${big} 0 ${x4},${y4}Z`);
      path.setAttribute('fill', COLS_P[i % COLS_P.length]); path.setAttribute('stroke', 'var(--color-panel)'); path.setAttribute('stroke-width', '1.5');
      const tt = document.createElementNS(NS, 'title'); tt.textContent = n + ': ' + fmt(v) + ' (' + Math.round(v / tot * 100) + '%)'; path.append(tt);
      svg.append(path); a0 = a1;
    });
    const t1 = document.createElementNS(NS, 'text'); t1.setAttribute('x', 100); t1.setAttribute('y', 98); t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('class', 'pp-pastel-v'); t1.textContent = m.med === 'pesos' ? '$' + (tot >= 1e6 ? (tot / 1e6).toFixed(2) + 'M' : Math.round(tot / 1000) + 'k') : Math.round(tot).toLocaleString('es-MX');
    const t2 = document.createElementNS(NS, 'text'); t2.setAttribute('x', 100); t2.setAttribute('y', 118); t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('class', 'pp-pastel-k'); t2.textContent = m.med === 'cajas' ? 'cajas' : m.med === 'hl' ? 'hectolitros' : 'venta';
    svg.append(t1, t2);
    const ley = el('ul', 'pp-ley');
    top.forEach(([n, v], i) => { const li = el('li'); const sw = el('i'); sw.style.background = COLS_P[i % COLS_P.length]; li.append(sw, el('span', null, n), el('b', null, Math.round(v / tot * 100) + '%'), el('small', null, fmt(v))); ley.append(li); });
    cuerpo.append(svg, ley); w.append(cuerpo);
    w.append(el('p', 'pp-mia', (m.per === 'dia' ? 'Venta del ' + dia(m.fecha) : m.per === 'sem' ? 'Semana del ' + dia(clave0) + ' (lunes a sábado)' : 'Mes completo al ' + dia(ult)) + (st.ruta ? '' : ', todas las rutas') + '. Usa los botones de ruta de arriba para ver una sola.'));
    return w;
  }

  /* ---------- Inicio del vendedor, hecho para el celular ---------- */
  function listaHoy(P) {
    const H = P.hoy;
    if (H && (H.clientes || []).length) {
      const lh = el('section', 'card pp-hoy');
      const pend = H.clientes.filter((c) => !c.comproSemana);
      lh.append(el('h3', null, 'Tu lista del ' + H.dia + ' ' + dia(H.fecha).replace(/^\S+\s/, '')));
      lh.append(el('p', 'pp-mia', H.clientes.length + ' clientes te tocan. ' + (pend.length ? pend.length + ' no te han comprado últimamente: ábreles venta primero.' : 'Todos te compraron la semana pasada, ¡a mantenerlo!')));
      const ul = el('ul', 'pp-hoy-l');
      H.clientes.forEach((c, i) => {
        const li = el('li', (c.comproSemana ? '' : 'pend') + (i >= 12 ? ' oculto' : ''));
        const top = el('div', 'pp-hoy-top'); top.append(el('b', null, cpnCli(c, 'id')), el('span', 'pill ' + (c.comproSemana ? 'ok' : 'warn'), c.comproSemana ? 'te compró' : 'ábrele venta'));
        li.append(top);
        if (c.motivo.length) li.append(el('small', null, c.motivo.join(' · ')));
        if (c.ofrecer.length) { const o = el('div', 'pp-hoy-of'); o.append(el('span', null, 'Ofrécele: ')); c.ofrecer.forEach((x) => o.append(el('span', 'pill' + (c.bono.includes(x) ? ' ok' : ''), x + (c.bono.includes(x) ? ' (bono)' : '')), document.createTextNode(' '))); li.append(o); }
        ul.append(li);
      });
      lh.append(ul);
      if (H.clientes.length > 12) { const m = el('button', 'pp-btn2', 'Ver los ' + H.clientes.length); m.type = 'button'; m.addEventListener('click', () => { ul.querySelectorAll('.oculto').forEach((x) => x.classList.remove('oculto')); m.remove(); }); lh.append(m); }
      return lh;
    }
    return el('p', 'pp-mia', 'Tu lista sale con la actualización de la noche.');
  }

  /* ---------- Pastel de marcas del vendedor (Willy, 21-nov-2026): su cartera por marca, saturación contra XX Lager ---------- */
  const MARCAS_RE = [[/^(XX|DOS EQUIS)/i, 'XX Lager'], [/^TECATE/i, 'Tecate'], [/^CARTA BLANCA/i, 'Carta Blanca'], [/^INDIO/i, 'Indio'], [/^SOL\b/i, 'Sol'],
    [/^HEINEKEN/i, 'Heineken'], [/^AMSTEL/i, 'Amstel Ultra'], [/^MILLER/i, 'Miller'], [/^SUPERIOR/i, 'Superior'], [/^BOHEMIA/i, 'Bohemia'],
    [/^COORS/i, 'Coors'], [/^NOCHE BUENA/i, 'Noche Buena'], [/^STRONGBOW/i, 'Strongbow'], [/^KLOSTER/i, 'Kloster'], [/^LAGUNITAS/i, 'Lagunitas']];
  const marcaDe = (p) => { const x = MARCAS_RE.find(([r]) => r.test(String(p).trim())); return x ? x[1] : String(p).trim().split(/\s+/).slice(0, 2).join(' '); };
  function graficaMarcas(P) {
    const sP = (P.secciones || []).find((x) => x.id === 'productosVend');
    if (!sP || !(sP.filas || []).length) return null;
    const num = (t) => parseFloat(String(t).replace(/,/g, '')) || 0;
    const ag = {}; sP.filas.forEach((f) => { const m = marcaDe(f[0]); ag[m] = (ag[m] || 0) + num(f[2]); });
    const tot = Object.values(ag).reduce((a, b) => a + b, 0);
    if (!tot) return null;
    const xx = ag['XX Lager'] || 0; const sat = 1 - xx / tot;
    const orden = Object.entries(ag).sort((a, b) => (a[0] === 'XX Lager' ? -1 : b[0] === 'XX Lager' ? 1 : b[1] - a[1]));
    const top = orden.length <= 9 ? orden.slice() : orden.slice(0, 8); const resto = orden.length <= 9 ? 0 : orden.slice(8).reduce((a, x) => a + x[1], 0); if (resto > 0) top.push(['Otras ' + (orden.length - 8) + ' marcas', resto]);
    const COL = ['#1F7A45', '#E0A526', '#3B82C4', '#C2410C', '#8B5CF6', '#0EA5A4', '#DB2777', '#65A30D', '#94A3B8'];
    const w = el('section', 'card pp-mix');
    const h = el('div', 'pp-mix-cab'); h.append(el('h3', null, 'Tu cartera por marca')); w.append(h);
    const ok = sat >= 0.10;
    const res = el('div', 'hal-tiles');
    [['Saturación', Math.round(sat * 100) + '%', 'meta: 10% o más', ok ? 'ok' : 'bad'], ['XX Lager', Math.round((1 - sat) * 100) + '%', 'máximo 90%', ok ? 'ok' : 'bad']].forEach(([k, v, s0, tono]) => { const d = el('div', 'hal-tile ' + tono); d.append(el('span', null, k), el('b', null, v), el('small', null, s0)); res.append(d); });
    w.append(res);
    const cuerpo = el('div', 'pp-mix-cuerpo');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 200 200'); svg.setAttribute('class', 'pp-pastel'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Tu venta del mes por marca');
    let a0 = -Math.PI / 2;
    top.forEach(([n, v], i) => {
      const a1 = a0 + (v / tot) * Math.PI * 2; const R1 = 92, R0 = 56; const p = (r, a) => [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; const big = a1 - a0 > Math.PI ? 1 : 0;
      const [x1, y1] = p(R1, a0), [x2, y2] = p(R1, a1 - 0.0001), [x3, y3] = p(R0, a1 - 0.0001), [x4, y4] = p(R0, a0);
      const path = document.createElementNS(NS, 'path'); path.setAttribute('d', `M${x1},${y1}A${R1},${R1} 0 ${big} 1 ${x2},${y2}L${x3},${y3}A${R0},${R0} 0 ${big} 0 ${x4},${y4}Z`);
      path.setAttribute('fill', COL[i % COL.length]); path.setAttribute('stroke', 'var(--color-panel)'); path.setAttribute('stroke-width', '1.5');
      const tt = document.createElementNS(NS, 'title'); tt.textContent = n + ': ' + (Math.round(v * 10) / 10) + ' Hl (' + Math.round(v / tot * 100) + '%)'; path.append(tt); svg.append(path); a0 = a1;
    });
    const t1 = document.createElementNS(NS, 'text'); t1.setAttribute('x', 100); t1.setAttribute('y', 98); t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('class', 'pp-pastel-v'); t1.textContent = Math.round(sat * 100) + '%';
    const t2 = document.createElementNS(NS, 'text'); t2.setAttribute('x', 100); t2.setAttribute('y', 118); t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('class', 'pp-pastel-k'); t2.textContent = 'saturación';
    svg.append(t1, t2);
    const ley = el('ul', 'pp-ley');
    top.forEach(([n, v], i) => { const li = el('li'); const sw = el('i'); sw.style.background = COL[i % COL.length]; li.append(sw, el('span', null, n), el('b', null, Math.round(v / tot * 100) + '%'), el('small', null, (Math.round(v * 10) / 10).toLocaleString('es-MX') + ' Hl')); ley.append(li); });
    cuerpo.append(svg, ley); w.append(cuerpo);
    w.append(el('p', 'pp-mia', ok ? 'Vas bien: traes ' + Math.round(sat * 100) + '% de saturación. Mantenlo arriba de 10%.' : 'Te falta saturación: vendes ' + Math.round((1 - sat) * 100) + '% de XX Lager. Ofrece otras marcas para llegar al 10%: unos ' + (Math.round(Math.max(0, (0.10 * tot - (tot - xx)) / 0.9) * 10) / 10) + ' Hl más de otras marcas.'));
    w.append(el('p', 'pp-mia', 'Hectolitros del mes. Saturación = todo lo que no es XX Lager.'));
    return w;
  }

  function inicioVendedor(P) {
    const w = el('div', 'pp-vend');
    const sl = (P.slides || []).map((x) => x.slide);
    const per = (P.slides || []).map((x) => x.periodo);
    const iAct = per.findIndex((p) => p.tipo === 'semana');
    const s = iAct >= 0 ? sl[iAct] : sl[0];
    if (!s) { w.append(el('p', 'pp-mia', 'Tu avance se carga con la actualización de la noche.')); return w; }
    const K = s.kpi, M = s.mes, Sc = s.score;
    const pc = (x) => (x == null ? '—' : Math.round(x * 100) + '%');
    const n1 = (x) => (x == null ? '—' : (Math.round(x * 10) / 10).toLocaleString('es-MX'));
    const n0 = (x) => (x == null ? '—' : Math.round(x).toLocaleString('es-MX'));
    const barra = (val, max, cls) => { const b = el('div', 'pp-barra'); const i = el('i', cls || ''); i.style.width = Math.min(100, (val / (max || 1)) * 100) + '%'; b.append(i); return b; };
    // héroe: la semana
    const hero = el('section', 'pp-hero');
    hero.append(el('small', null, per[iAct >= 0 ? iAct : 0].etiqueta));
    const fila = el('div', 'pp-hero-fila'); fila.append(el('b', null, n1(K.hl) + ' Hl'), el('span', null, 'de ' + n1(K.metaPeriodo) + ' de meta'));
    hero.append(fila, barra(K.hl, K.metaPeriodo, K.avance >= 1 ? 'ok' : ''));
    const t = K.tendencia === 'creciendo' ? '▲ Vas creciendo' : K.tendencia === 'cayendo' ? '▼ Vas abajo' : 'Vas parejo';
    const cmp = (K.comparaciones || [])[0];
    hero.append(el('p', 'pp-hero-t ' + (K.tendencia || ''), t + (cmp && cmp.cambio != null ? ' ' + (cmp.cambio > 0 ? '+' : '') + pc(cmp.cambio) + ' contra la semana pasada' : '')));
    w.append(hero);
    // mes
    const mes = el('section', 'card pp-mes');
    mes.append(el('small', null, 'Tu mes'));
    const f2 = el('div', 'pp-hero-fila'); f2.append(el('b', null, n1(M.hlMes) + ' Hl'), el('span', null, 'de ' + n0(M.metaHl) + ' · ' + pc(M.avance)));
    mes.append(f2, barra(M.hlMes, M.metaHl));
    if (M.necesitaDia > 0) mes.append(el('p', 'pp-mia', 'Para llegar a la meta ocupas ' + n1(M.necesitaDia) + ' Hl diarios en los ' + M.diasRestan + ' días que quedan.'));
    else if (M.hlMes >= M.metaHl && M.metaHl) mes.append(el('p', 'pp-mia', '¡Ya pasaste tu meta del mes! Todo lo que vendas ahora es extra.'));
    w.append(mes);
    { const gm = graficaMarcas(P); if (gm) w.append(gm); }
    // cuadritos
    const k = el('div', 'pp-mini');
    const mini = (ic, a, b, cls) => { const d = el('div', 'pp-mini-c' + (cls ? ' ' + cls : '')); d.append(icono(ic), el('b', null, a), el('span', null, b)); k.append(d); };
    mini('ventas', n0(K.cajas), 'cajas esta semana');
    mini('scorecard', pc(Sc.efectividad), 'te compran de cada visita', Sc.efectividad < 0.6 ? 'bad' : 'ok');
    mini('paradas', pc(Sc.cumplimiento), 'de tus clientes visitados', Sc.cumplimiento < 0.85 ? 'bad' : 'ok');
    mini('cierre', Sc.salida || '—', 'hora de salida', Sc.salida > '10:00' ? 'bad' : '');
    w.append(k);
    // alertas
    if ((s.alertas || []).length) {
      const al = el('section', 'card'); al.append(el('h3', null, 'Pendientes'));
      s.alertas.slice(0, 5).forEach((a) => { const d = el('p', 'pp-alerta ' + (a.nivel === 'alta' ? 'bad' : 'warn')); d.append(el('b', null, a.tipo + ': '), document.createTextNode(a.txt)); al.append(d); });
      w.append(al);
    }
    if ((s.oportunidades || []).length) {
      const op = el('section', 'card pp-op'); op.append(el('h3', null, 'Para esta semana'));
      const ul = el('ul'); s.oportunidades.slice(0, 4).forEach((x) => ul.append(el('li', null, x))); op.append(ul); w.append(op);
    }
    return w;
  }

  /* ---------- Rubí sube el inventario de almacén (Piedras Negras y Mixtequilla), 17-nov-2026 ---------- */
  async function cajaInventario(dentro, modo, alSubir) {
    const esPron = modo === 'pron';
    const c = el('div', 'pp-invbox'); c.id = esPron ? 'pp-s-pron' : 'pp-s-inv';
    c.append(el('p', 'pp-mia', esPron
      ? 'Sube aquí el pronóstico de la S+2 tal como lo mandas a Heineken (el Excel del martes). Esa misma noche la app lo toma para el abasto. Recuerda: la S+1 ya no se cambia, se queda con lo que se pronosticó.'
      : 'Tal como te llega: Excel, PDF o foto. Uno por almacén.'));
    const f = el('form', 'pp-inv');
    const sel = el('select'); sel.setAttribute('aria-label', esPron ? 'Semana' : 'Almacén'); (esPron ? ['Pronóstico S+2'] : st.yo.rol === 'almacen_mix' ? ['Mixtequilla'] : ['Piedras Negras', 'Mixtequilla']).forEach((x) => { const o = el('option', null, x); o.value = x; sel.append(o); });
    if (esPron || st.yo.rol === 'almacen_mix') { sel.hidden = true; f.classList.add('solo'); }
    const lab2 = el('label', 'pp-file'); const inp = el('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.xlsm,.csv,.pdf,image/*';
    const nomb = el('span', null, 'Ningún archivo elegido'); lab2.append(inp, el('b', null, 'Elegir archivo'), nomb);
    inp.addEventListener('change', () => { nomb.textContent = (inp.files && inp.files[0]) ? inp.files[0].name : 'Ningún archivo elegido'; });
    const msg = el('p', 'pp-mia'); const b = el('button', 'pp-btn', 'Subir'); b.type = 'submit';
    f.append(sel, lab2, b); c.append(f, msg);
    const lista = el('div'); c.append(lista);
    const pintaLista = async () => {
      lista.replaceChildren();
      try {
        const L = await rpc('mis_inventarios', { p_clave: clave() });
        if (!L.length) { lista.append(el('p', 'pp-mia', 'Todavía no has subido ninguno.')); return; }
        const LL = L.filter((x) => (x.almacen === 'Pronóstico S+2') === esPron);
        if (!LL.length) { lista.append(el('p', 'pp-mia', 'Todavía no has subido ninguno.')); return; }
        const ul = el('ul', 'pp-ult'); LL.slice(0, 4).forEach((x) => ul.append(el('li', null, x.almacen + ' · ' + x.nombre + ' · ' + hora(x.subido_en)))); lista.append(ul);
      } catch (e) { lista.append(el('p', 'pp-err', e.message)); }
    };
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault(); const file = inp.files && inp.files[0];
      if (!file) { msg.textContent = 'Elige el archivo primero.'; return; }
      if (file.size > 10 * 1024 * 1024) { msg.textContent = 'El archivo es muy grande (máximo 10 MB).'; return; }
      b.disabled = true; b.textContent = 'Subiendo…'; msg.textContent = '';
      try {
        const b64 = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => mal(new Error('No se pudo leer el archivo')); r.readAsDataURL(file); });
        await rpc('subir_inventario', { p_clave: clave(), p_almacen: sel.value, p_nombre: file.name, p_tipo: file.type || '', p_contenido: b64 });
        if (alSubir) await alSubir(file, sel.value);
        msg.textContent = esPron ? 'Listo, se subió el pronóstico S+2.' : 'Listo, se subió el inventario de ' + sel.value + '.'; inp.value = ''; nomb.textContent = 'Ningún archivo elegido'; await pintaLista();
      } catch (e) { msg.textContent = e.message; }
      finally { b.disabled = false; b.textContent = 'Subir'; }
    });
    await pintaLista();
    return c;
  }

  /* ---------- Hallazgos (solo lo que se encontró; sin recomendaciones) ---------- */
  const GRAV = { alta: ['Importante', 'bad'], media: ['Revisar', 'warn'], baja: ['Para saber', 'ok'] };
  async function pintarHallazgos(v) {
    const H = await rpc('mis_hallazgos', { p_clave: clave() });
    v.replaceChildren();
    v.append(el('p', 'pp-res', H.length ? H.length + (H.length === 1 ? ' hallazgo' : ' hallazgos') + ' de los últimos 7 días.' : 'Sin hallazgos en los últimos 7 días.'));
    if (H.length) v.append(el('p', 'pp-mia', 'Es lo que encontró el análisis de la noche en tu área, para que lo revises y decidas.'));
    const n = st.todos ? H.length : Math.min(15, H.length); let dia0 = null;
    H.slice(0, n).forEach((h) => {
      if (h.fecha !== dia0) { dia0 = h.fecha; v.append(el('h3', 'pp-sub', h.fecha ? dia(h.fecha) : 'Sin fecha')); }
      const c = el('article', 'card pp-t'); const cab = el('div', 'pp-cab'); const [g, cls] = GRAV[h.gravedad] || ['', ''];
      if (g) cab.append(el('span', 'pill ' + cls, g)); if (h.ruta) cab.append(el('span', 'pill', h.ruta)); cab.append(el('span', 'pp-lim', h.tipo));
      c.append(cab, el('h3', null, h.titulo)); if (h.detalle) c.append(el('p', 'pp-det', h.detalle)); v.append(c);
    });
    if (H.length > n) { const b = el('button', 'hal-mas', 'Ver los ' + H.length); b.type = 'button'; b.addEventListener('click', () => { st.todos = true; pintar(); }); v.append(b); }
  }

  /* ---------- Tareas ---------- */
  const EST = { abierta: ['Pendiente', 'warn'], devuelta: ['Te la regresaron', 'bad'], respondida: ['Enviada · Willy la revisa', 'ok'], aprobada: ['Cerrada', 'ok'] };
  const DATO = { ruta: 'Ruta', fecha: 'Fecha', cliente: 'Cliente', hora: 'Hora', venta_fecha: 'Venta del', monto: 'Monto', cajas: 'Cajas', producto: 'Producto' };
  async function pintarTareas(v) {
    const T = await rpc('mis_tareas', { p_clave: clave() });
    v.replaceChildren();
    const abiertas = T.filter((t) => t.estado === 'abierta' || t.estado === 'devuelta');
    const res = el('p', 'pp-res'); res.textContent = abiertas.length ? (abiertas.length === 1 ? 'Tienes 1 tarea pendiente.' : 'Tienes ' + abiertas.length + ' tareas pendientes.') : 'No tienes tareas pendientes. Buen trabajo.';
    v.append(res);
    T.forEach((t) => {
      const c = el('article', 'card pp-t'); const cab = el('div', 'pp-cab');
      const [et, cls] = EST[t.estado] || [t.estado, '']; cab.append(el('span', 'pill ' + cls, et));
      if (t.fecha_limite && (t.estado === 'abierta' || t.estado === 'devuelta')) { const venc = t.fecha_limite < hoy(); cab.append(el('span', 'pp-lim' + (venc ? ' bad' : ''), (venc ? 'Venció ' : 'Para el ') + dia(t.fecha_limite))); }
      c.append(cab, el('h3', null, t.titulo));
      if (t.detalle) c.append(el('p', 'pp-det', t.detalle));
      const d = t.datos || {}; const ks = Object.keys(DATO).filter((k) => d[k] != null && d[k] !== '' && (k !== 'monto' || st.yo.rol === 'sistemas'));
      if (ks.length) { const dl = el('dl', 'pp-datos'); ks.forEach((k) => { dl.append(el('dt', null, DATO[k]), el('dd', null, /fecha/.test(k) ? dia(d[k]) : k === 'monto' ? '$' + Number(d[k]).toLocaleString('es-MX', { maximumFractionDigits: 0 }) : String(d[k]))); }); c.append(dl); }
      if (t.estado === 'devuelta' && t.comentario_admin) c.append(el('p', 'pp-coment', 'Willy: ' + t.comentario_admin));
      if (t.estado === 'abierta' || t.estado === 'devuelta') {
        const f = el('form', 'pp-resp'); const lab = el('label', null, '¿Qué hiciste?'); const ta = el('textarea'); ta.rows = 3; ta.required = true; ta.placeholder = 'Escribe qué hiciste o qué encontraste'; if (t.respuesta) ta.value = t.respuesta; lab.append(ta);
        const btn = el('button', 'pp-btn', 'Enviar respuesta'); btn.type = 'submit'; const err = el('p', 'pp-err'); err.hidden = true;
        f.append(lab, btn, err);
        f.addEventListener('submit', async (ev) => { ev.preventDefault(); btn.disabled = true; btn.textContent = 'Enviando…'; err.hidden = true;
          try { await rpc('responder_tarea', { p_clave: clave(), p_id: t.id, p_respuesta: ta.value }); await pintar(); }
          catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Enviar respuesta'; } });
        c.append(f);
      } else if (t.respuesta) { c.append(el('p', 'pp-mia', 'Tu respuesta: ' + t.respuesta)); if (t.comentario_admin && t.estado === 'aprobada') c.append(el('p', 'pp-coment', 'Willy: ' + t.comentario_admin)); }
      v.append(c);
    });
  }

  /* ---------- Llamadas (recepción) ---------- */
  const RES = { recibio: 'Sí recibió', no_recibio: 'No recibió', no_contesto: 'No contestó', numero_equivocado: 'Número equivocado' };
  async function pintarLlamadas(v) {
    const L = await rpc('mis_llamadas', { p_clave: clave() });
    v.replaceChildren();
    const pend = L.filter((l) => !l.resultado), hechas = L.filter((l) => l.resultado);
    v.append(el('p', 'pp-res', pend.length ? (pend.length === 1 ? 'Te falta 1 llamada.' : 'Te faltan ' + pend.length + ' llamadas.') + ' Llevas ' + hechas.length + ' hoy.' : (hechas.length ? 'Terminaste las llamadas de hoy (' + hechas.length + '). Gracias.' : 'Hoy no hay llamadas en tu lista.')));
    const g = el('details', 'card pp-guion'); g.append(el('summary', null, 'Qué decir en la llamada'));
    [['Saludo', '"Buenos días, le hablamos de la Comercializadora de Piedras Negras, la distribuidora de cerveza. Estamos confirmando los pedidos de la semana."'],
     ['Pregunta', '"¿Le surtieron cerveza el [día de la venta]? ¿Cuántas cajas recibió más o menos? ¿Recuerda a qué precio se las dejaron?"'],
     ['Cierre', '"Muchas gracias, es para darle mejor servicio."'],
     ['Importante', 'No menciones al vendedor ni digas que hay un problema. Solo pregunta y anota lo que te diga el cliente.']].forEach(([a, b]) => { const p = el('p'); p.append(el('b', null, a + ': '), document.createTextNode(b)); g.append(p); });
    v.append(g);
    pend.forEach((l) => v.append(tarjetaLlamada(l)));
    if (hechas.length) { v.append(el('h3', 'pp-sub', 'Hechas hoy')); hechas.forEach((l) => v.append(tarjetaLlamada(l))); }
  }

  function tarjetaLlamada(l) {
    const c = el('article', 'card pp-l' + (l.resultado ? ' hecha' : ''));
    const cab = el('div', 'pp-cab'); cab.append(el('span', 'pill', l.ruta || 'Sin ruta'));
    if (l.fecha && l.fecha < hoy() && !l.resultado) cab.append(el('span', 'pp-lim bad', 'De ' + dia(l.fecha)));
    c.append(cab, el('h3', null, cpnCli(l, 'cliente_id')));
    const venta = 'Venta a confirmar: ' + (l.venta_fecha ? dia(l.venta_fecha) : 'fecha sin dato') + (l.venta_cajas != null ? ' · ' + Number(l.venta_cajas).toLocaleString('es-MX') + ' cajas' : '');
    c.append(el('p', 'pp-det', venta));
    if (l.pista) c.append(el('p', 'pp-det', 'Ese día hay dos entregas registradas (' + l.pista.replace(/^Dos ventas el mismo día en lugares distintos: /, '').replace(/, a [\d,]+ m una de otra.*$/, '') + '). Pregunta si recibió las dos y cuántas cajas en cada una.'));
    if (l.telefono) { const a = el('a', 'pp-tel', 'Llamar ' + l.telefono); a.href = 'tel:' + String(l.telefono).replace(/[^0-9+]/g, ''); c.append(a); }
    else c.append(el('p', 'pp-sintel', 'Sin teléfono registrado. Pídelo a la ruta o búscalo en el directorio, y anótalo en la nota.'));
    if (l.resultado) {
      c.append(el('p', 'pp-mia', RES[l.resultado] + (l.cajas_dichas != null ? ' · ' + l.cajas_dichas + ' cajas' : '') + (l.precio_dicho != null ? ' · $' + l.precio_dicho + ' por caja' : '') + (l.contesto ? ' · contestó ' + l.contesto : '') + (l.nota ? ' · ' + l.nota : '') + ' · ' + hora(l.hecha_en)));
      return c;
    }
    const f = el('form', 'pp-resp'); const opc = el('div', 'seg seg-sm pp-opc'); let sel = null;
    const extra = el('div', 'pp-extra'); extra.hidden = true;
    const campo = (t, tipo, ph) => { const lab = el('label', null, t); const i = el('input'); i.type = tipo; if (tipo === 'number') { i.inputMode = 'decimal'; i.min = '0'; i.step = 'any'; } if (ph) i.placeholder = ph; lab.append(i); return [lab, i]; };
    const [lc, ic] = campo('¿Cuántas cajas dice que recibió?', 'number', 'Ej. 10');
    const [lp, ip] = campo('¿A qué precio por caja?', 'number', 'Ej. 150');
    const [lq, iq] = campo('¿Quién contestó?', 'text', 'Nombre o "la dueña", "el encargado"');
    const [ln, inn] = campo('Nota', 'text', 'Algo más que dijo el cliente, o el teléfono correcto');
    extra.append(lc, lp, lq);
    Object.entries(RES).forEach(([k, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { sel = k; [...opc.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); extra.hidden = k !== 'recibio' && k !== 'no_recibio'; lc.hidden = lp.hidden = k !== 'recibio'; btn.disabled = false; }); opc.append(b); });
    const btn = el('button', 'pp-btn', 'Guardar'); btn.type = 'submit'; btn.disabled = true; const err = el('p', 'pp-err'); err.hidden = true;
    f.append(el('p', 'pp-q', '¿Qué dijo el cliente?'), opc, extra, ln, btn, err);
    const num = (i) => (i.value === '' ? null : Number(i.value));
    f.addEventListener('submit', async (ev) => { ev.preventDefault(); if (!sel) return; btn.disabled = true; btn.textContent = 'Guardando…'; err.hidden = true;
      try { await rpc('capturar_llamada', { p_clave: clave(), p_id: l.id, p_resultado: sel, p_cajas: sel === 'recibio' ? num(ic) : null, p_precio: sel === 'recibio' ? num(ip) : null, p_contesto: iq.value, p_nota: inn.value }); await pintar(); }
      catch (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Guardar'; } });
    c.append(f);
    return c;
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    $('#login').hidden = true; $('#app').hidden = true; $('#persona').hidden = false;
    document.title = 'Rutas CPN';
    $('#pp-form').addEventListener('submit', async (ev) => {
      ev.preventDefault(); const b = $('#pp-entrar'); b.disabled = true; b.textContent = 'Entrando…';
      try { await entrar($('#pp-codigo').value.trim(), $('#pp-recordar').checked); $('#pp-codigo').value = ''; }
      catch (e) { mostrarForm(e.message); }
      finally { b.disabled = false; b.textContent = 'Entrar'; }
    });
    $('#pp-salir').addEventListener('click', () => { ls.del(LT); ls.del(LP); location.href = location.pathname; });
    $('#pp-actualizar').addEventListener('click', () => pintar());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st.yo) pintar(); });
    const guardado = ls.get(LP);
    if (guardado) entrar(guardado, true).catch((e) => mostrarForm(e.message)); else mostrarForm('');
  }

  window.CPN_PERSONA = { activo: !!tok, deUrl: !!deUrl, iniciar };
})();
