/* Filtro común por día, semana, mes y ruta (Willy, 24-nov-2026: "toda la info se pueda filtrar por día, semana, mes y ruta").
   const st = {}; CPN_FILTRO.barra(st, { fechas, rutas, onChange }) -> elemento con los botones
   CPN_FILTRO.pasa(st, fecha, ruta) -> true si el renglón entra; CPN_FILTRO.etiqueta(st) -> "lun 23 de nov" / "semana del …" / "todo el mes" */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const fd = (s) => new Date(s + 'T12:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const lunes = (s) => { const d = new Date(String(s).slice(0, 10) + 'T12:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
  const rnum = (r) => { if (r == null || r === '') return null; const n = Number(String(r).replace(/\D/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };

  function barra(st, o) {
    const fechas = [...new Set((o.fechas || []).filter(Boolean).map((f) => String(f).slice(0, 10)))].sort();
    const semanas = [...new Set(fechas.map(lunes))].sort();
    const rutas = [...new Set((o.rutas || []).map(rnum).filter(Boolean))].sort((a, b) => a - b);
    if (!st.per) st.per = o.inicial || 'mes';
    if (!st.dia || !fechas.includes(st.dia)) st.dia = fechas[fechas.length - 1] || null;
    if (!st.sem || !semanas.includes(st.sem)) st.sem = semanas[semanas.length - 1] || null;
    const cb = () => { if (o.onChange) o.onChange(); };
    const bar = el('div', 'vc-bar');
    const seg = (lista, actual, on) => { const g = el('div', 'cr-seg'); lista.forEach(([v, t]) => { const b = el('button', null, t); b.type = 'button'; b.setAttribute('aria-pressed', String(actual === v)); b.addEventListener('click', () => { on(v); cb(); }); g.append(b); }); return g; };
    bar.append(seg([['dia', 'Día'], ['sem', 'Semana'], ['mes', 'Mes']], st.per, (v) => { st.per = v; }));
    if (st.per === 'dia' && fechas.length) { const s = el('select', 'vc-sel'); s.setAttribute('aria-label', 'Día'); fechas.slice().reverse().forEach((f) => { const op = el('option', null, fd(f)); op.value = f; op.selected = f === st.dia; s.append(op); }); s.addEventListener('change', () => { st.dia = s.value; cb(); }); bar.append(s); }
    if (st.per === 'sem' && semanas.length) { const s = el('select', 'vc-sel'); s.setAttribute('aria-label', 'Semana'); semanas.slice().reverse().forEach((f) => { const fin = new Date(f + 'T12:00'); fin.setDate(fin.getDate() + 6); const op = el('option', null, 'Semana del ' + fd(f) + ' al ' + fd(fin.toISOString().slice(0, 10))); op.value = f; op.selected = f === st.sem; s.append(op); }); s.addEventListener('change', () => { st.sem = s.value; cb(); }); bar.append(s); }
    if (rutas.length > 1 && !o.sinRuta) bar.append(seg([[null, 'Todas']].concat(rutas.map((r) => [r, 'R' + r])), st.ruta == null ? null : rnum(st.ruta), (v) => { st.ruta = v; }));
    return bar;
  }
  function pasa(st, fecha, ruta) {
    const f = fecha ? String(fecha).slice(0, 10) : '';
    if (st.per === 'dia' && st.dia && f !== st.dia) return false;
    if (st.per === 'sem' && st.sem && (!f || lunes(f) !== st.sem)) return false;
    if (st.ruta != null && st.ruta !== 'todas' && rnum(ruta) !== rnum(st.ruta)) return false;
    return true;
  }
  const etiqueta = (st) => (st.per === 'dia' && st.dia ? fd(st.dia) : st.per === 'sem' && st.sem ? 'semana del ' + fd(st.sem) : 'todo el mes');
  window.CPN_FILTRO = { barra, pasa, etiqueta, lunes };
})();
