export async function authenticate(mode, values, signal) {
  let response;
  try { response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }); }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('El servicio de acceso no está disponible. Inténtalo de nuevo.'); }
  if (!response.ok) {
    if (response.status === 400) {
      const payload = await response.json().catch(() => null);
      const fields = payload?.fields;
      const hints = { name: 'Revisa el nombre: es obligatorio y admite hasta 120 caracteres.', email: 'Revisa el correo: debe ser válido y tener hasta 80 caracteres.', password: mode === 'register' ? 'Revisa la contraseña: es obligatoria y debe tener entre 8 y 72 caracteres.' : 'Ingresa tu contraseña.', identifier: 'Ingresa tu correo electrónico.' };
      const messages = fields && typeof fields === 'object' ? Object.keys(fields).map(field => hints[field]).filter(Boolean) : [];
      throw new Error(messages.length ? messages.join(' ') : 'Revisa los campos del formulario.');
    }
    if (response.status === 401) window.dispatchEvent(new Event('eduplan-auth-rejected'));
    const unavailable = 'El servicio de acceso no está disponible. No podemos procesar la solicitud en este momento. Inténtalo más tarde.';
    const messages = { 400: 'Revisa los campos del formulario.', 401: 'Correo o contraseña incorrectos.', 403: 'Esta cuenta está inactiva.', 409: 'El correo ya está registrado.', 502: unavailable, 503: unavailable, 504: unavailable };
    throw new Error(messages[response.status] || 'No pudimos completar el acceso. Inténtalo de nuevo.');
  }
  const data = await response.json();
  if (typeof data.token !== 'string' || !data.token || data.tokenType !== 'Bearer' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 || !Number.isInteger(data.userId) || typeof data.email !== 'string') throw new Error('La respuesta de acceso no es válida.');
  return { token: data.token, user: { id: data.userId, name: data.name || 'Usuario', email: data.email, phone: data.phone }, expiresAt: Date.now() + data.expiresIn };
}
