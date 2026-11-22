/* Cómo se nombra a un cliente en toda la app (Willy, 21-nov-2026): "#Número · Negocio · Propietario".
   El propietario (prop) lo pone nombres_clientes.py desde la megabase más reciente. */
(function () {
  const tit = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|[\s.(\/-])(\S)/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\bXx\b/g, 'XX').replace(/\b(De|Del|La|Las|Los|Y|El)\b(?!$)/g, (m, w, i) => (i === 0 ? m : m.toLowerCase()));
  window.cpnCli = function (x, idCampo) {
    if (!x) return '';
    const nom = String(x.cliente || '');
    if (nom.startsWith('#')) return nom;
    const id = String((idCampo ? x[idCampo] : (x.cid || x.clienteId || x.cliente_id || x.idCliente)) || '').trim();
    const neg = /[a-z]/.test(nom) ? nom.trim() : tit(nom);
    const pr = x.prop ? String(x.prop).trim() : '';
    return [id && /^\d+$/.test(id) ? '#' + id : '', neg, pr && pr.toLowerCase() !== neg.toLowerCase() ? pr : ''].filter(Boolean).join(' · ');
  };
})();
