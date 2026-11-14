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

  const AREA = { almacen_pn: 'Almacén Piedras Negras', almacen_mix: 'Almacén Mixtequilla', recepcion: 'Recepción', sistemas: 'SIAD y Power Sales', encargada_mix: 'Encargada Mixtequilla', admin: 'Administrador' };
  const PRONTO = { almacen_pn: 'Tu página de almacén y la calculadora de pronóstico llegan en las próximas semanas.', almacen_mix: 'Tu página de almacén llega en las próximas semanas.', sistemas: 'Tu página de SIAD y Power Sales llega en las próximas semanas.', encargada_mix: 'El resumen completo de Mixtequilla llega en las próximas semanas.' };
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const hoy = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
  const dia = (s) => { if (!s) return ''; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const hora = (s) => (s ? new Date(s).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const st = { pin: null, yo: null, vista: null, todos: false };
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
    $('#pp-area').textContent = AREA[st.yo.rol] || '';
    const vistas = st.yo.rol === 'recepcion' ? [['llamadas', 'Llamadas'], ['tareas', 'Mis tareas']] : [['hallazgos', 'Hallazgos'], ['tareas', 'Mis tareas']];
    if (!st.vista || !vistas.some((v) => v[0] === st.vista)) st.vista = vistas[0][0];
    const nav = $('#pp-tabs'); nav.replaceChildren(); nav.hidden = vistas.length < 2;
    vistas.forEach(([k, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.vista === k)); b.addEventListener('click', () => { st.vista = k; [...nav.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintar(); }); nav.append(b); });
    const pr = $('#pp-pronto'); pr.hidden = !PRONTO[st.yo.rol]; pr.textContent = PRONTO[st.yo.rol] || '';
    await pintar();
  }

  async function pintar() {
    const v = $('#pp-vista'); v.setAttribute('aria-busy', 'true');
    try { if (st.vista === 'llamadas') await pintarLlamadas(v); else if (st.vista === 'hallazgos') await pintarHallazgos(v); else await pintarTareas(v); }
    catch (e) {
      if (/código|Enlace/i.test(e.message)) { ls.del(LP); mostrarForm(e.message); return; }
      v.replaceChildren(el('p', 'pp-err', e.message));
    } finally { v.removeAttribute('aria-busy'); }
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
    c.append(cab, el('h3', null, l.cliente + (l.cliente_id ? ' (' + l.cliente_id + ')' : '')));
    const venta = 'Venta a confirmar: ' + (l.venta_fecha ? dia(l.venta_fecha) : 'fecha sin dato') + (l.venta_cajas != null ? ' · ' + Number(l.venta_cajas).toLocaleString('es-MX') + ' cajas' : '');
    c.append(el('p', 'pp-det', venta));
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
