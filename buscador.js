/* Buscador universal del admin (Willy, 24-nov-2026): escribes un número de cliente, un nombre, un propietario, un producto,
   una ruta, un vendedor o un ticket y te lleva directo: ficha del cliente, la ruta, el producto o el ticket. Atajo: tecla "/". */
(function () {
  if (!window.dash) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const rows = (k) => { const d = dash.data(k); return d && d.status === 'ok' ? d.data : []; };
  const tit = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase());
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const $ = (v) => '$' + Math.round(v || 0).toLocaleString('es-MX');
  const ir = (v) => { const b = document.querySelector('[data-vista="' + v + '"]'); if (b) b.click(); };
  let IDX = null;

  function indice() {
    const L = []; const vistos = new Set();
    rows('clientes_mes').forEach((c) => { vistos.add(String(c.id)); L.push({ t: 'Cliente', k: norm(c.id + ' ' + c.cliente + ' ' + (c.prop || '') + ' ' + (c.poblacion || '')), txt: '#' + c.id + ' · ' + tit(c.cliente) + (c.prop ? ' · ' + tit(c.prop) : ''), sub: c.ruta + ' · ' + $(c.venta) + ' en el mes · ' + (c.hl || 0).toFixed(1) + ' Hl', fn: () => window.CPN_CLIDET && window.CPN_CLIDET.abrir(c.id) }); });
    const info = ((rows('crecimiento') || [])[0] || {}).info || {};
    rows('clientes').forEach((c) => { if (vistos.has(String(c.id))) return; const p = (info[String(c.id)] || {}).prop || ''; L.push({ t: 'Cliente', k: norm(c.id + ' ' + c.negocio + ' ' + p + ' ' + (c.poblacion || '')), txt: '#' + c.id + ' · ' + c.negocio + (p ? ' · ' + tit(p) : ''), sub: c.ruta + ' · ' + c.estado + ' · sin compra en Power Sales este mes', fn: () => window.CPN_CLIDET && window.CPN_CLIDET.abrir(c.id) }); });
    rows('metas').forEach((m) => { const r = m.ruta; L.push({ t: 'Ruta', k: norm(r + ' r' + m.rutaNum + ' ' + (m.vendedor || '')), txt: r + ' · ' + (m.vendedor || ''), sub: 'Ruta por ruta: avance, días, marcas e historia', fn: () => { ir('ruta'); const b = document.querySelector('[data-ruta="' + r + '"]'); if (b) b.click(); } }); });
    const CR = (rows('crecimiento') || [])[0] || {};
    (CR.productos || []).forEach((p) => { if (p[0] === '0') return; L.push({ t: 'Producto', k: norm(p[0] + ' ' + p[1]), txt: tit(p[1]), sub: 'Clave ' + p[0] + ' · ver si crece o cae y en qué canal', fn: () => ir('foco') }); });
    rows('tickets').forEach((x) => L.push({ t: 'Ticket', k: norm(x.t), txt: 'Ticket ' + x.t, sub: x.f + ' · R' + x.r + ' · #' + x.c + ' ' + tit(x.n) + ' · ' + $(x.m), fn: () => { ir('tickets'); const box = document.querySelector('[data-draw="ticketsCentro"]'); if (box && box._tk) { box._tk.q = x.t; box._tk.vista = 'ticket'; box._tk.abierto = x.t; dash.draw('ticketsCentro'); } } }));
    [['Hoy', 'hoy'], ['Tickets', 'tickets'], ['Semana', 'semana'], ['Almacén', 'abasto'], ['Productos', 'foco'], ['Clientes', 'clientes'], ['Rendimiento de clientes', 'rendcli'], ['Bonificación', 'bonificacion'], ['Margen', 'utilidad'], ['Empresa', 'empresa'], ['Tareas', 'tareas'], ['Reportes Motum', 'motum'], ['Mapa de mercado', 'mercado'], ['Cierre del mes', 'cierre']]
      .forEach(([t, v]) => L.push({ t: 'Sección', k: norm(t), txt: t, sub: 'Abrir la sección', fn: () => ir(v) }));
    return L;
  }

  function montar() {
    const top = document.querySelector('#app .topbar'); if (!top || top.querySelector('.bu')) return;
    const w = el('div', 'bu'); const inp = el('input', 'bu-in'); inp.type = 'search'; inp.placeholder = 'Buscar cliente, ruta, producto, ticket…  ( / )'; inp.setAttribute('aria-label', 'Buscador');
    const res = el('div', 'bu-res'); res.hidden = true; w.append(inp, res);
    const chip = top.querySelector('#chip-fecha') || top.lastElementChild; top.insertBefore(w, chip);
    let sel = 0, act = [];
    const pinta = () => {
      const q = norm(inp.value).trim(); res.replaceChildren(); if (!q) { res.hidden = true; return; }
      if (!IDX) IDX = indice();
      const pal = q.split(/\s+/);
      act = IDX.filter((x) => pal.every((p) => x.k.includes(p))).sort((a, b) => (a.k.startsWith(q) ? 0 : 1) - (b.k.startsWith(q) ? 0 : 1)).slice(0, 10);
      if (!act.length) res.append(el('p', 'bu-nada', 'Nada con "' + inp.value + '"'));
      act.forEach((x, i) => { const b = el('button', 'bu-it' + (i === sel ? ' on' : '')); b.type = 'button'; b.append(el('span', 'bu-t', x.t), el('b', null, x.txt), el('small', null, x.sub)); b.addEventListener('mousedown', (ev) => { ev.preventDefault(); abrir(x); }); res.append(b); });
      res.hidden = false;
    };
    const abrir = (x) => { res.hidden = true; inp.blur(); try { x.fn(); } catch (e) { console.error(e); } };
    inp.addEventListener('input', () => { sel = 0; pinta(); });
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, act.length - 1); pinta(); ev.preventDefault(); } else if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); pinta(); ev.preventDefault(); } else if (ev.key === 'Enter' && act[sel]) abrir(act[sel]); else if (ev.key === 'Escape') { res.hidden = true; inp.blur(); } });
    inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
    inp.addEventListener('focus', () => { if (inp.value) pinta(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { ev.preventDefault(); inp.focus(); } });
  }
  window.addEventListener('cpn-admin-listo', () => { IDX = null; montar(); });
  if (document.readyState !== 'loading') montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
