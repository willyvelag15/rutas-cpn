/* Mapa real (OpenStreetMap) para "Visitas en el mapa". Reemplaza el dibujo simple del tablero. */
(function () {
  if (!window.L || !window.dash) return;
  const BASE = [18.77, -96.17];
  const BODEGAS = [
    { n: 'Bodega Piedras Negras', lat: 18.770452, lng: -96.175706 },
    { n: 'Bodega Mixtequilla', lat: 18.71955, lng: -95.98737 },
  ];
  const color = (r) => (window.CPN && window.CPN.routeColor[r]) || '#1F7A45';
  document.querySelectorAll('[data-periodo]').forEach((b) => b.addEventListener('click', () => {
    window.CPN.mapaPeriodo = b.getAttribute('data-periodo');
    document.querySelectorAll('[data-periodo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    dash.draw('mapa');
  }));

  dash.draw('mapa', (el) => {
    const g = dash.data('puntos');
    if (!el._mapa) {
      el.replaceChildren();
      const caja = document.createElement('div');
      caja.style.cssText = 'height:min(70vh,560px);min-height:380px;border-radius:12px;overflow:hidden;';
      const pie = document.createElement('div');
      pie.className = 'legend';
      pie.style.marginTop = '8px';
      el.append(caja, pie);
      const m = L.map(caja, { zoomControl: true, attributionControl: true }).setView(BASE, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, subdomains: 'abc',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      el._mapa = { m, capa: L.layerGroup().addTo(m), pie, caja };
    }
    const { m, capa, pie } = el._mapa;
    capa.clearLayers();
    pie.replaceChildren();
    if (g.status !== 'ok' || !g.data.length) return;

    const ult = g.data.map((r) => r.fecha).sort().pop();
    const filtro = (window.CPN && window.CPN.mapa) || 'todas';
    const periodo = (window.CPN && window.CPN.mapaPeriodo) || 'dia';
    const mes = ult.slice(0, 7);
    const pts = g.data.filter((r) => (periodo === 'dia' ? r.fecha === ult : r.fecha.slice(0, 7) === mes) && (periodo !== 'sinventa' || !r.venta) && (filtro === 'todas' || r.ruta === filtro));
    const bounds = [];

    BODEGAS.forEach((b) => {
      L.marker([b.lat, b.lng], {
        icon: L.divIcon({ className: '', html: '<div style="width:16px;height:16px;background:#E9B949;border:2px solid #0B3F25;border-radius:3px"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
      }).bindTooltip(b.n).addTo(capa);
    });

    pts.forEach((p) => {
      const ll = [BASE[0] + p.dy / 1e4, BASE[1] + p.dx / 1e4];
      bounds.push(ll);
      const c = color(p.ruta);
      L.circleMarker(ll, { radius: 7, color: c, weight: 3, fillColor: p.venta ? c : '#ffffff', fillOpacity: p.venta ? 0.9 : 1 })
        .bindPopup('<b>' + p.ruta + '</b><br>' + (p.venta ? 'Compró' : 'Sin pedido'))
        .addTo(capa);
    });

    if (bounds.length) m.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    setTimeout(() => m.invalidateSize(), 50);

    const t = document.createElement('span');
    t.textContent = (periodo === 'dia' ? window.CPN.fmt.largo(ult) : 'Mes en curso') + ' · ' + pts.length + ' visitas · ' + pts.filter((p) => p.venta).length + ' con compra';
    pie.append(t);
    Object.entries(window.CPN.routeColor).filter(([r]) => filtro === 'todas' || r === filtro).forEach(([r, c]) => {
      const s = document.createElement('span');
      const i = document.createElement('i'); i.style.background = c;
      const n = document.createElement('span'); n.textContent = r;
      s.append(i, n); pie.append(s);
    });
  });
})();
