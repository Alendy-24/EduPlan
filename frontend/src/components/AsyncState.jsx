export default function AsyncState({ loading, error, onRetry, empty, children }) {
  if (loading) return <p className="async-state" role="status">Cargando información…</p>;
  if (error) return <div className="async-state"><p role="alert">{error}</p>{onRetry && <button className="btn btn-secondary" type="button" onClick={onRetry}>Reintentar</button>}</div>;
  if (empty) return <div className="empty-state"><h2>Sin resultados</h2>{children || <p>Prueba otra búsqueda o ajusta los filtros.</p>}</div>;
  return null;
}
