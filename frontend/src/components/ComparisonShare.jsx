import { useState } from 'react';
import { comparisonShareText } from '../utils/comparison';

export default function ComparisonShare({ programs }) {
  const [message,setMessage] = useState('');
  const text = comparisonShareText(programs, window.location.origin);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Comparación copiada. Puedes pegarla en el chat o correo que prefieras.');
    } catch {
      setMessage('No pudimos copiar automáticamente. Selecciona el texto de abajo o descarga el resumen.');
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href=url; link.download='comparacion-eduplan.txt'; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    setMessage('Resumen descargado. Puedes enviarlo a quien te ayude a elegir.');
  }
  return <details className="comparison-share surface" onToggle={()=>setMessage('')}>
    <summary>Compartir comparación</summary>
    <div className="comparison-share-content"><h2>Revísala con alguien de confianza</h2><p>Comparte un resumen con los datos de tus opciones y enlaces a sus detalles. Tus notas personales y tu favorita quedan privadas.</p>
      <div className="comparison-toolbar-actions"><button className="btn btn-primary" type="button" onClick={copy}>Copiar resumen</button><button className="btn btn-secondary" type="button" onClick={download}>Descargar resumen</button></div>
      <p role="status">{message}</p>
      <label htmlFor="comparison-share-text">Vista previa del resumen</label><textarea id="comparison-share-text" readOnly value={text} rows={8} onFocus={event=>event.target.select()} />
    </div>
  </details>;
}
