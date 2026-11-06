/* Mini motor del tablero: misma API que usa la página (dash.data, dash.calc, dash.draw). */
(function () {
  const datasets = {};
  const calcs = {};
  const draws = {};
  let listo = false;

  function data(id) {
    if (!listo) return { status: 'loading', data: [] };
    if (datasets[id]) return { status: 'ok', data: datasets[id] };
    const c = calcs[id];
    if (c) {
      if (c.cache === undefined) {
        try { c.cache = c.fn(...c.inputs.map((i) => data(i).data)); }
        catch (e) { console.error('calc', id, e); c.cache = []; }
      }
      return { status: 'ok', data: c.cache };
    }
    return { status: 'missing', data: [] };
  }

  function runDraw(name) {
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => {
      if (el.closest('[hidden]')) return;
      if (!listo) { el.textContent = '—'; return; }
      try { fn(el); } catch (e) { console.error('draw', name, e); }
    });
  }

  function drawAll() { Object.keys(draws).forEach(runDraw); }

  window.dash = {
    data,
    calc(id, o) { calcs[id] = { fn: o.fn, inputs: o.inputs || [] }; },
    draw(name, fn) { if (fn) draws[name] = fn; runDraw(name); },
    onData(fn) { try { fn(); } catch (e) { console.error(e); } },
    setLink() {},
    refresh() {},
    colors: ['#1F7A45', '#C98A0B', '#2C6FB3', '#B3262D', '#7C5CDB', '#0EA5B7', '#F08A24', '#6B7280'],
    params() { return {}; }, setParams() {}, resetParams() {},
    cargar(paquete) {
      Object.keys(datasets).forEach((k) => delete datasets[k]);
      Object.assign(datasets, paquete.datasets || {});
      Object.values(calcs).forEach((c) => { c.cache = undefined; });
      listo = true;
      drawAll();
    },
    vaciar() { listo = false; Object.keys(datasets).forEach((k) => delete datasets[k]); drawAll(); },
    drawAll,
  };

  // Al mostrar una sección oculta o cambiar el ancho, se vuelve a dibujar.
  new MutationObserver(() => drawAll()).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawAll, 150); });
})();
