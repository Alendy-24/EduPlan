export default function ProgramOfficialLink({ state, onRetry }) {
  if (state.loading) return <p className="subtle" role="status">Consultando el enlace del programa…</p>;
  if (state.error) return <><p className="subtle" role="status">{state.error}</p><button type="button" className="text-link plain-button" onClick={onRetry}>Reintentar enlace del programa</button></>;
  if (state.url) return <><p><a className="btn btn-primary" href={state.url} target="_blank" rel="noreferrer">Sitio oficial del programa ↗</a></p><p className="subtle">Enlace verificado el {new Date(state.checkedAt).toLocaleDateString('es-CO')}. Confirma allí la información vigente.</p></>;
  return <p className="subtle">{state.status === 'PENDING' ? 'El enlace de este programa está pendiente de verificación.' : state.status === 'UNAVAILABLE' ? 'El enlace del programa ya no está disponible. Puedes consultar la institución.' : 'Todavía no tenemos un enlace verificado de este programa.'}</p>;
}
