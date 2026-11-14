/* Panel del administrador · Equipo (13-nov-2026): tareas, cumplimiento, verificación con llamadas y código de acceso.
   Habla con Supabase con la clave del panel, que viene dentro de datos.enc.json (cifrado con la contraseña de Willy). */
(function () {
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const AREA = { almacen_pn: 'Almacén PN', almacen_mix: 'Almacén Mixtequilla', recepcion: 'Recepción', sistemas: 'SIAD y Power Sales', encargada_mix: 'Encargada Mixtequilla', admin: 'Willy' };
  const RES = { recibio: 'Sí recibió', no_recibio: 'No recibió', no_contesto: 'No contestó', numero_equivocado: 'Número equivocado' };
  const EST = { abierta: ['Pendiente', 'warn'], devuelta: ['Devuelta', 'bad'], respondida: ['Por revisar', 'bad'], aprobada: ['Cerrada', 'ok'], cancelada: ['Cancelada', ''] };
  const hoy = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
  const dia = (s) => { if (!s) return ''; const d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); };
  const hora = (s) => (s ? new Date(s).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const money = (v) => '$' + Number(v || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  const st = { resumen: null, tareas: null, llamadas: null, filtro: 'pendientes', persona: 'todas', cargando: false, error: null };
  const clave = () => (window.CPN && window.CPN.sbAdmin) || null;
  const rpc = (fn, b) => window.cpnRpc(fn, Object.assign({ p_clave: clave() }, b || {}));

  async function cargar() {
    if (!clave()) { st.error = 'La conexión del panel llega con la actualización de datos de esta noche. Mañana ya aparece aquí.'; dibujar(); return; }
    st.cargando = true; st.error = null; dibujar();
    try {
      const [r, t, l] = await Promise.all([rpc('admin_resumen'), rpc('admin_tareas'), rpc('admin_llamadas', { p_dias: 30 })]);
      st.resumen = r; st.tareas = t; st.llamadas = l;
    } catch (e) { st.error = e.message; }
    st.cargando = false; dibujar();
  }
  const dibujar = () => ['eqResumen', 'eqNueva', 'eqLista', 'eqCodigo', 'verResumen', 'verLista'].forEach((n) => dash.draw(n));
  const aviso = (e) => { if (st.error) { e.append(el('p', 'note', st.error)); return true; } if (!st.resumen) { e.append(el('p', 'note', st.cargando ? 'Cargando…' : '')); return true; } return false; };

  /* ---------- Cumplimiento por persona ---------- */
  dash.draw('eqResumen', (e) => {
    e.replaceChildren(); if (aviso(e)) return;
    const P = st.resumen.personas || [];
    const tb = el('table', 'cpn-t'); const hr = el('tr');
    [['Persona', ''], ['Pendientes', 'num'], ['Vencidas', 'num'], ['Por revisar', 'num'], ['Cerradas', 'num'], ['A tiempo', 'num'], ['Horas para responder', 'num']].forEach(([h, c]) => hr.append(el('th', c, h)));
    tb.append(el('thead')); tb.tHead.append(hr); const body = el('tbody');
    P.forEach((p) => { const tr = el('tr'); tr.style.cursor = 'pointer';
      const n = el('td'); n.append(el('b', null, p.nombre), el('br'), el('small', 'note', AREA[p.rol] || p.rol));
      tr.append(n, el('td', 'num', String(p.abiertas)), el('td', 'num' + (p.vencidas ? ' bad' : ''), String(p.vencidas)), el('td', 'num' + (p.por_revisar ? ' warn' : ''), String(p.por_revisar)), el('td', 'num', String(p.cerradas)),
        el('td', 'num', p.cerradas ? Math.round(100 * p.a_tiempo / p.cerradas) + '%' : '—'), el('td', 'num', p.horas != null ? String(p.horas) : '—'));
      tr.addEventListener('click', () => { st.persona = String(p.id); dash.draw('eqLista'); const x = document.querySelector('[data-draw="eqLista"]'); if (x) x.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      body.append(tr); });
    tb.append(body); const w = el('div', 'tblwrap'); w.append(tb); e.append(w);
    const b = el('button', 'hal-mas', 'Actualizar'); b.type = 'button'; b.addEventListener('click', cargar); e.append(b);
  });

  /* ---------- Nueva tarea ---------- */
  dash.draw('eqNueva', (e) => {
    e.replaceChildren(); if (aviso(e)) return;
    const f = el('form', 'eq-form');
    const campo = (t, n) => { const l = el('label', null, t); l.append(n); return l; };
    const sp = el('select'); (st.resumen.personas || []).forEach((p) => { const o = el('option', null, p.nombre + ' · ' + (AREA[p.rol] || p.rol)); o.value = p.id; o.dataset.rol = p.rol; sp.append(o); });
    const it = el('input'); it.required = true; it.placeholder = 'Ej. Contar el camión de la Ruta 2 antes de que salga';
    const id = el('textarea'); id.rows = 3; id.placeholder = 'Qué pasó y qué esperas que haga';
    const ifl = el('input'); ifl.type = 'date'; const d2 = new Date(Date.now() - 6 * 3600e3 + 86400e3 * 2); ifl.value = d2.toISOString().slice(0, 10);
    const ipr = el('select'); [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']].forEach(([v, t]) => { const o = el('option', null, t); o.value = v; if (v === 'media') o.selected = true; ipr.append(o); });
    const fila = el('div', 'eq-fila'); fila.append(campo('Fecha límite', ifl), campo('Prioridad', ipr));
    const btn = el('button', 'pp-btn', 'Asignar tarea'); btn.type = 'submit'; const msg = el('p', 'note');
    f.append(campo('Para', sp), campo('Tarea', it), campo('Detalle', id), fila, btn, msg);
    f.addEventListener('submit', async (ev) => { ev.preventDefault(); btn.disabled = true; msg.textContent = '';
      const o = sp.selectedOptions[0];
      try { await rpc('admin_guardar_tareas', { p_tareas: { titulo: it.value.trim(), detalle: id.value.trim(), rol_destino: o.dataset.rol, asignada_a: o.value, fecha_limite: ifl.value, prioridad: ipr.value, origen: 'admin' } });
        it.value = ''; id.value = ''; await cargar(); }
      catch (err) { msg.textContent = err.message; btn.disabled = false; } });
    e.append(f);
  });

  /* ---------- Lista de tareas ---------- */
  dash.draw('eqLista', (e) => {
    e.replaceChildren(); if (aviso(e)) return;
    const seg = el('div', 'seg seg-sm');
    [['pendientes', 'Por revisar y pendientes'], ['cerradas', 'Cerradas']].forEach(([k, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(st.filtro === k)); b.addEventListener('click', () => { st.filtro = k; dash.draw('eqLista'); }); seg.append(b); });
    e.append(seg);
    const P = st.resumen.personas || []; const sp = el('select', 'eq-sel'); const o0 = el('option', null, 'Todas las personas'); o0.value = 'todas'; sp.append(o0);
    P.forEach((p) => { const o = el('option', null, p.nombre); o.value = String(p.id); if (st.persona === String(p.id)) o.selected = true; sp.append(o); });
    sp.addEventListener('change', () => { st.persona = sp.value; dash.draw('eqLista'); }); e.append(sp);
    const persona = P.find((p) => String(p.id) === st.persona);
    let T = (st.tareas || []).filter((t) => (st.filtro === 'pendientes' ? ['abierta', 'devuelta', 'respondida'].includes(t.estado) : ['aprobada', 'cancelada'].includes(t.estado)));
    if (persona) T = T.filter((t) => String(t.asignada_a) === st.persona || (!t.asignada_a && t.rol_destino === persona.rol));
    if (!T.length) { e.append(el('p', 'note', st.filtro === 'pendientes' ? 'No hay tareas pendientes.' : 'Todavía no hay tareas cerradas.')); return; }
    const ul = el('ol', 'acciones hal-lista');
    T.forEach((t) => {
      const li = el('li'); const izq = el('div', 'hal-izq'); const [et, cls] = EST[t.estado] || [t.estado, '']; izq.append(el('span', 'pill ' + cls, et));
      izq.append(el('span', 'hal-r', t.asignada_nombre || AREA[t.rol_destino] || t.rol_destino));
      const c = el('div', 'hal-cuerpo'); c.append(el('b', null, t.titulo));
      if (t.detalle) c.append(el('span', null, t.detalle));
      const meta = [t.origen === 'admin' ? 'La pusiste tú' : t.origen === 'ia' ? 'Análisis de la noche' : 'Automática', 'creada ' + hora(t.creada_en)];
      if (t.fecha_limite) meta.push((t.fecha_limite < hoy() && ['abierta', 'devuelta'].includes(t.estado) ? 'VENCIÓ ' : 'para el ') + dia(t.fecha_limite));
      c.append(el('small', null, meta.join(' · ')));
      if (t.respuesta) c.append(el('p', 'pp-mia', (t.respondida_nombre || 'Respuesta') + ' (' + hora(t.respondida_en) + '): ' + t.respuesta));
      if (t.comentario_admin) c.append(el('p', 'pp-coment', 'Tu comentario: ' + t.comentario_admin));
      const acc = el('div', 'eq-acc'); const com = el('input'); com.placeholder = 'Comentario (obligatorio para devolver)';
      const boton = (txt, accion, cl) => { const b = el('button', 'hal-mas' + (cl ? ' ' + cl : ''), txt); b.type = 'button';
        b.addEventListener('click', async () => { b.disabled = true; try { await rpc('admin_revisar_tarea', { p_id: t.id, p_accion: accion, p_comentario: com.value }); await cargar(); } catch (err) { alertaEn(acc, err.message); b.disabled = false; } }); return b; };
      if (t.estado === 'respondida') acc.append(com, boton('Aprobar', 'aprobar', 'eq-ok'), boton('Devolver', 'devolver'));
      else if (['abierta', 'devuelta'].includes(t.estado)) acc.append(com, boton('Cancelar tarea', 'cancelar'));
      else acc.append(boton('Reabrir', 'reabrir'));
      c.append(acc); li.append(izq, c); ul.append(li);
    });
    e.append(ul);
  });
  const alertaEn = (cont, m) => { let p = cont.querySelector('.pp-err'); if (!p) { p = el('p', 'pp-err'); cont.append(p); } p.textContent = m; };

  /* ---------- Código de acceso ---------- */
  dash.draw('eqCodigo', (e) => {
    e.replaceChildren(); if (aviso(e)) return;
    const f = el('form', 'eq-form'); const i = el('input'); i.type = 'password'; i.autocomplete = 'new-password'; i.minLength = 4; i.required = true; i.placeholder = 'Mínimo 4 caracteres';
    const l = el('label', null, 'Nuevo código'); l.append(i);
    const btn = el('button', 'pp-btn', 'Guardar código'); btn.type = 'submit'; const msg = el('p', 'note');
    f.append(l, btn, msg);
    f.addEventListener('submit', async (ev) => { ev.preventDefault(); btn.disabled = true; msg.textContent = '';
      try { await rpc('admin_cambiar_codigo', { p_codigo: i.value }); i.value = ''; msg.textContent = 'Listo. Desde ahora las páginas piden este código; los teléfonos que tenían el anterior lo vuelven a pedir.'; }
      catch (err) { msg.textContent = err.message; }
      btn.disabled = false; });
    e.append(f);
  });

  /* ---------- Verificación con llamadas ---------- */
  dash.draw('verResumen', (e) => {
    e.replaceChildren(); if (aviso(e)) return;
    const L = st.llamadas || []; const hechas = L.filter((l) => l.resultado);
    const conf = hechas.filter((l) => l.resultado === 'recibio' && !(l.cajas_dichas != null && l.venta_cajas != null && l.cajas_dichas < l.venta_cajas * 0.8));
    const noconf = hechas.filter((l) => l.resultado === 'no_recibio' || (l.resultado === 'recibio' && l.cajas_dichas != null && l.venta_cajas != null && l.cajas_dichas < l.venta_cajas * 0.8));
    const tiles = el('div', 'hal-tiles');
    const t = (k, v, s, cls) => { const d = el('div', 'hal-tile' + (cls ? ' ' + cls : '')); d.append(el('span', null, k), el('b', null, v)); if (s) d.append(el('small', null, s)); tiles.append(d); };
    t('Pendientes de llamar', String(st.resumen.llamadas.pendientes), 'últimos 7 días'); t('Hechas hoy', String(st.resumen.llamadas.hoy));
    t('Confirmadas (30 días)', String(conf.length), hechas.length ? Math.round(100 * conf.length / hechas.length) + '% de las hechas' : null, 'ok');
    t('No confirmadas', String(noconf.length), noconf.length ? money(noconf.reduce((a, l) => a + (l.venta_monto || 0), 0)) + ' en duda' : null, noconf.length ? 'bad' : '');
    e.append(tiles);
    const rutas = [...new Set(hechas.map((l) => l.ruta || '—'))].sort((a, b) => (parseInt(a.slice(5)) || 99) - (parseInt(b.slice(5)) || 99));
    if (!rutas.length) { e.append(el('p', 'note', 'Todavía no hay llamadas hechas. En cuanto Dalia empiece, aquí sale por ruta.')); return; }
    const tb = el('table', 'cpn-t'); const hr = el('tr'); [['Ruta', ''], ['Llamadas', 'num'], ['Confirmadas', 'num'], ['No confirmadas', 'num'], ['No contestó', 'num'], ['Dinero en duda', 'num']].forEach(([h, c]) => hr.append(el('th', c, h)));
    tb.append(el('thead')); tb.tHead.append(hr); const body = el('tbody');
    rutas.forEach((r) => { const X = hechas.filter((l) => (l.ruta || '—') === r); const nc = X.filter((l) => noconf.includes(l));
      const tr = el('tr'); tr.append(el('td', null, r), el('td', 'num', String(X.length)), el('td', 'num', String(X.filter((l) => conf.includes(l)).length)), el('td', 'num' + (nc.length ? ' bad' : ''), String(nc.length)), el('td', 'num', String(X.filter((l) => l.resultado === 'no_contesto' || l.resultado === 'numero_equivocado').length)), el('td', 'num', nc.length ? money(nc.reduce((a, l) => a + (l.venta_monto || 0), 0)) : '—')); body.append(tr); });
    tb.append(body); const w = el('div', 'tblwrap'); w.append(tb); e.append(w);
  });

  dash.draw('verLista', (e) => {
    e.replaceChildren(); if (aviso(e)) return;
    const L = st.llamadas || []; if (!L.length) { e.append(el('p', 'note', 'Todavía no hay llamadas en la lista.')); return; }
    const tb = el('table', 'cpn-t'); const hr = el('tr'); [['Día', ''], ['Ruta', ''], ['Cliente', ''], ['Venta', 'num'], ['Por qué', ''], ['Resultado', ''], ['Lo que dijo', '']].forEach(([h, c]) => hr.append(el('th', c, h)));
    tb.append(el('thead')); tb.tHead.append(hr); const body = el('tbody');
    L.forEach((l) => { const tr = el('tr'); const res = el('td'); res.append(el('span', 'pill ' + (l.resultado === 'recibio' ? 'ok' : l.resultado === 'no_recibio' ? 'bad' : l.resultado ? 'warn' : ''), l.resultado ? RES[l.resultado] : 'Pendiente'));
      const dijo = [l.cajas_dichas != null ? l.cajas_dichas + ' cajas' : '', l.precio_dicho != null ? '$' + l.precio_dicho + '/caja' : '', l.contesto ? 'contestó ' + l.contesto : '', l.nota || ''].filter(Boolean).join(' · ');
      tr.append(el('td', null, dia(l.fecha)), el('td', null, l.ruta || ''), el('td', 'wrap', l.cliente + (l.venta_fecha ? ' · venta del ' + dia(l.venta_fecha) : '')),
        el('td', 'num', (l.venta_cajas != null ? l.venta_cajas + ' cj' : '') + (l.venta_monto ? ' · ' + money(l.venta_monto) : '')), el('td', 'wrap', l.motivo || ''), res, el('td', 'wrap', dijo + (l.hecha_nombre ? ' (' + l.hecha_nombre + ')' : '')));
      body.append(tr); });
    tb.append(body); const w = el('div', 'tblwrap'); w.append(tb); e.append(w);
  });

  const TIT = { tareas: ['Tareas del equipo', 'Asigna, revisa y da seguimiento'], verificacion: ['Verificación', 'Llamadas a clientes para confirmar ventas'] };
  document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute('data-vista'); const t = TIT[v]; if (!t) return;
    const a = document.getElementById('top-tit'), s = document.getElementById('top-sub'); if (a) a.textContent = t[0]; if (s) s.textContent = t[1];
    cargar();
  }));
  // Lo que generó la noche (generar_equipo.py) viaja cifrado en datos.enc.json; el panel lo sube a la base sin duplicar.
  async function sincronizar() {
    const d = dash.data('equipo_sync'); const R = d && d.status === 'ok' ? d.data : [];
    if (!clave() || !R.length) return;
    const quita = (x) => { const o = Object.assign({}, x); delete o.tipo; return o; };
    const llam = R.filter((x) => x.tipo === 'llamada').map(quita), tar = R.filter((x) => x.tipo === 'tarea').map(quita);
    try {
      if (llam.length) await rpc('admin_cargar_llamadas', { p_llamadas: llam });
      if (tar.length) await rpc('admin_guardar_tareas', { p_tareas: tar });
    } catch (e) { console.warn('[equipo] no se pudo sincronizar', e.message); }
  }
  window.addEventListener('cpn-admin-listo', async () => { await sincronizar(); cargar(); });
})();
