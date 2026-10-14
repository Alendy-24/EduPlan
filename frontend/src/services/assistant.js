// Envía el historial y el contexto de pantalla al backend del asistente
export async function askAssistant({ mensajes, contexto }, token, signal) {
  let response;
  try {
    response = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mensajes, contexto }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('No pudimos conectar con el asistente. Inténtalo de nuevo.');
  }
  if (response.status === 401) {
    window.dispatchEvent(new Event('eduplan-auth-rejected'));
    throw new Error('Tu sesión venció. Inicia sesión de nuevo.');
  }
  if (!response.ok) throw new Error('El asistente no está disponible en este momento.');
  const data = await response.json().catch(() => null);
  if (typeof data?.respuesta !== 'string') throw new Error('La respuesta del asistente no es válida.');
  return data.respuesta;
}