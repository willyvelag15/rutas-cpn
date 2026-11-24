/* Reporte de días de inventario para Rubí (Willy, 24-nov-2026).
   Aparece a la derecha de "Subir inventario": en cuanto sube el Excel de Piedras Negras se lee en la misma página
   (columna EnAlmacen) y se arma el reporte con la venta diaria de noviembre y lo que traen los camiones.
   Se puede imprimir o bajar en Excel. Semáforo: rojo < 7 días, amarillo < objetivo (20), verde ≥ objetivo.
   window.CPN_INVREP.render(cont, pron, { archivo, cuando, porClave, nombres })
   window.CPN_INVREP.leer(file) -> { porClave: {clave: cajas}, nombres: {clave: nombre} } */
(function () {
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const n0 = (v) => Math.round(v || 0).toLocaleString('es-MX');
  const n1 = (v) => (Math.round((v || 0) * 10) / 10).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const FERIADOS = ['12-25', '01-01', '05-01', '09-16'];
  const esVenta = (d) => d.getDay() !== 0 && !FERIADOS.includes(String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  const fechaEs = (d) => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  let libX = null;
  const xlsx = () => { if (window.XLSX && window.XLSX.read) return Promise.resolve(window.XLSX); if (!libX) libX = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'xlsx-style.min.js'; s.onload = () => ok(window.XLSX); s.onerror = () => mal(new Error('no se pudo cargar el lector de Excel')); document.head.append(s); }); return libX; };

  // Lee el inventario de Power Sales: encabezado con idProducto y EnAlmacen
  async function leer(file) {
    const X = await xlsx(); const buf = await file.arrayBuffer();
    const wb = X.read(new Uint8Array(buf), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = X.utils.sheet_to_json(ws, { header: 1, defval: null });
    const h = rows.findIndex((r) => r && r.some((x) => String(x || '').trim() === 'idProducto'));
    if (h < 0) throw new Error('no encontré la columna idProducto');
    const H = rows[h].map((x) => String(x || '').trim());
    const ci = H.indexOf('idProducto'), cp = H.indexOf('Producto'), ca = H.indexOf('EnAlmacen') >= 0 ? H.indexOf('EnAlmacen') : H.indexOf('StockTotal');
    if (ca < 0) throw new Error('no encontré la columna EnAlmacen');
    const porClave = {}, nombres = {};
    rows.slice(h + 1).forEach((r) => { if (!r || r[ci] == null || !/^\d+$/.test(String(r[ci]).trim())) return; const k = String(r[ci]).trim(); porClave[k] = Number(r[ca]) || 0; if (cp >= 0 && r[cp]) nombres[k] = String(r[cp]).trim(); });
    return { porClave, nombres };
  }

  function filas(pron, src) {
    const base = new Map(); (pron.invRep || []).forEach((x) => base.set(String(x.clave), x));
    const claves = new Set(base.keys()); if (src && src.porClave) Object.keys(src.porClave).forEach((k) => claves.add(k));
    const hoy = src && src.cuando ? new Date(src.cuando) : new Date();
    const mesSig = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
    let diasMes = 0; for (let d = new Date(mesSig); d.getMonth() === mesSig.getMonth(); d.setDate(d.getDate() + 1)) if (esVenta(d)) diasMes++;
    const R = [];
    claves.forEach((k) => {
      const b = base.get(k) || { clave: k, sku: '', producto: '', almacen: 0, camiones: 0, cxt: 0, ventaDia: 0, lxc: 0, facMes: 1 };
      const alm = src && src.porClave && src.porClave[k] != null ? src.porClave[k] : b.almacen;
      const nom = (src && src.nombres && src.nombres[k]) || b.producto || k;
      const inv = (alm || 0) + (b.camiones || 0); const vd = b.ventaDia || 0; const lxc = b.lxc || 0;
      if (!inv && !vd) return;
      const dias = vd > 0 ? inv / vd : null;
      let fin = null; if (dias != null) { fin = new Date(hoy); let n = dias; while (n >= 1) { fin.setDate(fin.getDate() + 1); if (esVenta(fin)) n--; } }
      const fac = mesSig.getMonth() === 11 ? (b.facMes || 1) : 1;
      const sem = vd * 6, mes = vd * diasMes * fac;
      R.push({ clave: k, sku: b.sku || '', producto: nom, inv, cxt: b.cxt || 0, tar: b.cxt ? inv / b.cxt : null, vd, vdHl: vd * lxc / 100, dias, fin, sem, semHl: sem * lxc / 100, mes, mesHl: mes * lxc / 100 });
    });
    R.sort((a, b) => b.vd - a.vd || b.inv - a.inv);
    return { R, mesNombre: MES[mesSig.getMonth()], diasMes, hoy };
  }

  const COLS = ['Clave', 'SKU', 'Producto', 'Inventario (cajas)', 'Cajas x tarima', 'Tarimas', 'Venta diaria (cajas)', 'Venta diaria (Hl)', 'Días de inventario', 'Fecha de frescura', 'Se terminaría el', 'Cajas por semana', 'Hl por semana', 'Cajas al mes', 'Hl al mes'];
  const celdas = (f) => [f.clave, String(f.sku || ''), f.producto, n0(f.inv), f.cxt ? n0(f.cxt) : '—', f.tar == null ? '—' : n1(f.tar), n1(f.vd), n1(f.vdHl), f.dias == null ? 'sin venta' : n1(f.dias), '', f.fin ? fechaEs(f.fin) : '—', n0(f.sem), n1(f.semHl), n0(f.mes), n1(f.mesHl)];
  const sem = (d, obj) => (d == null ? '' : d < 7 ? 'r' : d < obj ? 'a' : 'v');

  function render(cont, pron, src) {
    cont.replaceChildren();
    if (!pron || !(pron.invRep || []).length) { cont.append(el('p', 'pp-mia', 'El reporte de días de inventario aparece cuando hay datos de venta.')); return; }
    const obj = pron.diasObjetivo || 20;
    const D = filas(pron, src);
    const cab = el('div', 'ir-cab');
    const tit = el('div'); tit.append(el('b', null, 'Días de inventario'), el('small', null, (src && src.archivo ? src.archivo : pron.inventarioArchivo) + ' · ' + fechaEs(D.hoy) + ' · inventario = almacén + camiones · venta diaria del mes · mes = ' + D.mesNombre + ' (' + D.diasMes + ' días de venta' + (D.mesNombre === 'diciembre' ? ', con el aumento de diciembre del año pasado' : '') + ')'));
    const acc = el('div', 'ir-acc');
    const bP = el('button', 'pp-btn', 'Imprimir'); bP.type = 'button'; bP.addEventListener('click', () => imprimir(D, src, pron, obj));
    const bX = el('button', 'pp-btn pr-sec', 'Excel'); bX.type = 'button'; bX.addEventListener('click', async () => { try { bX.disabled = true; await excel(D, src, pron, obj); } catch (e) { window.alert('No se pudo armar el Excel: ' + e.message); } finally { bX.disabled = false; } });
    acc.append(bP, bX); cab.append(tit, acc);
    const ley = el('div', 'pr-ley'); [['#e5484d', 'menos de 7 días'], ['#E9B949', 'menos de ' + obj + ' días'], ['#30a46c', obj + ' días o más']].forEach(([c, t]) => { const x = el('span'); const i = el('i'); i.style.background = c; x.append(i, document.createTextNode(t)); ley.append(x); });
    const tw = el('div', 'tblwrap ir-tw'); const tb = el('table', 'cpn-t pr-t ir-t');
    const hd = el('tr'); COLS.forEach((x, i) => hd.append(el('th', i > 2 ? 'num' : null, x))); tb.append(el('thead')); tb.tHead.append(hd);
    const bd = el('tbody'); const T = { sem: 0, semHl: 0, mes: 0, mesHl: 0, vdHl: 0 };
    D.R.forEach((f) => { const tr = el('tr'); celdas(f).forEach((v, i) => tr.append(el('td', (i > 2 ? 'num' : i === 2 ? 'pr-desc' : '') + (i === 8 ? ' pr-' + sem(f.dias, obj) : ''), v))); bd.append(tr); T.sem += f.sem; T.semHl += f.semHl; T.mes += f.mes; T.mesHl += f.mesHl; T.vdHl += f.vdHl; });
    const tt = el('tr', 'pr-tot'); ['', '', 'Totales', '', '', '', '', n1(T.vdHl), '', '', '', n0(T.sem), n1(T.semHl), n0(T.mes), n1(T.mesHl)].forEach((v, i) => tt.append(el('td', i > 2 ? 'num' : null, v))); bd.append(tt);
    tb.append(bd); tw.append(tb);
    cont.append(cab, ley, tw, el('p', 'pp-mia', 'La fecha de frescura la escribes a mano en la hoja impresa (viene en la etiqueta de cada tarima).'));
  }

  function imprimir(D, src, pron, obj) {
    const w = window.open('', '_blank'); if (!w) { window.alert('Permite las ventanas emergentes para imprimir.'); return; }
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const C = { r: 'background:#F4C7C3;color:#9C0006;font-weight:700', a: 'background:#FFEB9C;color:#7F6000;font-weight:700', v: 'background:#C6EFCE;color:#006100;font-weight:700' };
    const filasH = D.R.map((f) => '<tr>' + celdas(f).map((v, i) => '<td' + (i > 2 ? ' class="n"' : '') + (i === 8 && sem(f.dias, obj) ? ' style="' + C[sem(f.dias, obj)] + '"' : '') + '>' + esc(v) + '</td>').join('') + '</tr>').join('');
    w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Días de inventario ' + esc(fechaEs(D.hoy)) + '</title><style>@page{size:letter landscape;margin:10mm}body{font-family:Calibri,Arial,sans-serif;font-size:9.5px;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}h1{font-size:15px;color:#1F5E3B;margin:0 0 2px}p{margin:0 0 6px;color:#555;font-style:italic}table{border-collapse:collapse;width:100%}th{background:#1F5E3B;color:#fff;padding:4px 3px;font-size:9px}td{border:1px solid #bbb;padding:2px 3px}td.n{text-align:center}tr:nth-child(even) td{background-color:#fafafa}td:nth-child(10){min-width:60px}</style></head><body>' +
      '<h1>DÍAS DE INVENTARIO — ' + esc(fechaEs(D.hoy)) + '</h1><p>' + esc((src && src.archivo) || pron.inventarioArchivo) + ' · Inventario = almacén + camiones · venta diaria del mes · Rojo menos de 7 días · Amarillo menos de ' + obj + ' · Verde ' + obj + ' o más · Mes = ' + D.mesNombre + ' (' + D.diasMes + ' días de venta)</p>' +
      '<table><thead><tr>' + COLS.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + filasH + '</tbody></table><script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }

  async function excel(D, src, pron, obj) {
    const X = await xlsx(); const B = { top: { style: 'thin', color: { rgb: 'BFBFBF' } }, bottom: { style: 'thin', color: { rgb: 'BFBFBF' } }, left: { style: 'thin', color: { rgb: 'BFBFBF' } }, right: { style: 'thin', color: { rgb: 'BFBFBF' } } };
    const SEM = { r: ['F4C7C3', '9C0006'], a: ['FFEB9C', '7F6000'], v: ['C6EFCE', '006100'] };
    const rows = [['DÍAS DE INVENTARIO — ' + fechaEs(D.hoy)], [((src && src.archivo) || pron.inventarioArchivo) + ' · Inventario = almacén + camiones · Rojo menos de 7 días · Amarillo menos de ' + obj + ' · Verde ' + obj + ' o más · Mes = ' + D.mesNombre + ' (' + D.diasMes + ' días de venta)'], [], COLS];
    D.R.forEach((f) => rows.push([Number(f.clave), f.sku || '', f.producto, f.inv, f.cxt || '', f.tar == null ? '' : Math.round(f.tar * 10) / 10, Math.round(f.vd * 10) / 10, Math.round(f.vdHl * 100) / 100, f.dias == null ? 'sin venta' : Math.round(f.dias * 10) / 10, '', f.fin ? fechaEs(f.fin) : '', Math.round(f.sem), Math.round(f.semHl * 10) / 10, Math.round(f.mes), Math.round(f.mesHl * 10) / 10]));
    const ws = X.utils.aoa_to_sheet(rows);
    ws.A1.s = { font: { bold: true, sz: 14, color: { rgb: '1F5E3B' } } }; ws.A2.s = { font: { italic: true, sz: 9, color: { rgb: '595959' } } };
    for (let c = 0; c < COLS.length; c++) { const r = X.utils.encode_cell({ r: 3, c }); ws[r].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F5E3B' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: B }; }
    D.R.forEach((f, i) => { for (let c = 0; c < COLS.length; c++) { const ref = X.utils.encode_cell({ r: 4 + i, c }); if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].s = { border: B, alignment: { horizontal: c === 2 ? 'left' : 'center' } }; const k = c === 8 ? sem(f.dias, obj) : ''; if (k) ws[ref].s = Object.assign(ws[ref].s, { fill: { fgColor: { rgb: SEM[k][0] } }, font: { bold: true, color: { rgb: SEM[k][1] } } }); } });
    ws['!cols'] = [9, 10, 42, 12, 9, 8, 11, 10, 11, 12, 18, 11, 10, 11, 10].map((w) => ({ wch: w }));
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Días de inventario');
    const b64 = X.write(wb, { bookType: 'xlsx', type: 'base64', cellStyles: true });
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = 'DIAS DE INVENTARIO ' + D.hoy.toISOString().slice(0, 10) + '.xlsx'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  window.CPN_INVREP = { render, leer };
})();
