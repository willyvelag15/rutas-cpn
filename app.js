/* Login y carga de datos cifrados del Tablero de Rutas CPN. */
(function () {
  const LS = 'cpn-llave-v1';
  const $ = (s) => document.querySelector(s);
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const store = {
    get() { try { return localStorage.getItem(LS); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(LS, v); } catch (e) {} },
    del() { try { localStorage.removeItem(LS); } catch (e) {} },
  };

  async function bajarDatos() {
    const r = await fetch('datos.enc.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('No se pudieron bajar los datos');
    return r.json();
  }

  async function derivar(correo, clave, enc) {
    const sal = new Uint8Array([...b64(enc.salt), ...new TextEncoder().encode(correo.trim().toLowerCase())]);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: enc.it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }

  async function abrir(llave, enc) {
    const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, llave, b64(enc.ct));
    return JSON.parse(new TextDecoder().decode(plano));
  }

  function mostrarApp(paquete) {
    $('#login').hidden = true;
    $('#app').hidden = false;
    const g = new Date(paquete.generado);
    $('#actualizado').textContent = 'Actualizado ' + g.toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    window.dash.cargar(paquete);
  }

  // "Recordarme": el archivo de datos cambia cada noche, así que el teléfono guarda el acceso
  // cifrado con una llave propia del dispositivo para no pedir la contraseña cada vez.
  async function guardarSesion(correo, clave) {
    const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify({ correo, clave })));
    const jwk = await crypto.subtle.exportKey('jwk', k);
    const enc = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
    store.set(JSON.stringify({ jwk, iv: enc(iv), ct: enc(ct) }));
  }

  async function leerSesion() {
    const s = store.get();
    if (!s) return null;
    try {
      const o = JSON.parse(s);
      const k = await crypto.subtle.importKey('jwk', o.jwk, { name: 'AES-GCM' }, false, ['decrypt']);
      const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(o.iv) }, k, b64(o.ct));
      return JSON.parse(new TextDecoder().decode(p));
    } catch (e) { store.del(); return null; }
  }

  async function entrar(correo, clave, recordar) {
    const enc = await bajarDatos();
    const llave = await derivar(correo, clave, enc);
    let paquete;
    try { paquete = await abrir(llave, enc); }
    catch (e) { throw new Error('Correo o contraseña incorrectos'); }
    if (recordar) await guardarSesion(correo, clave);
    mostrarApp(paquete);
  }

  $('#form-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = $('#btn-entrar'), err = $('#login-error');
    err.hidden = true; btn.disabled = true; btn.textContent = 'Entrando…';
    try { await entrar($('#correo').value, $('#clave').value, $('#recordar').checked); $('#clave').value = ''; }
    catch (e) { err.textContent = e.message; err.hidden = false; }
    finally { btn.disabled = false; btn.textContent = 'Entrar'; }
  });

  $('#btn-salir').addEventListener('click', () => {
    store.del(); window.dash.vaciar();
    $('#app').hidden = true; $('#login').hidden = false;
  });

  async function arranque() {
    const s = await leerSesion();
    if (!s) { $('#login').hidden = false; return; }
    try { await entrar(s.correo, s.clave, false); }
    catch (e) { store.del(); $('#login').hidden = false; }
  }

  // Al volver a abrir la app (después de la actualización de la noche) se recargan los datos.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || $('#app').hidden) return;
    const s = await leerSesion();
    if (s) { try { await entrar(s.correo, s.clave, false); } catch (e) {} }
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  arranque();
})();
