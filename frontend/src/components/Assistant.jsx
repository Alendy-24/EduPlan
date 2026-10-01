import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
export function ChatIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /><path d="M7 9h10M7 13h7" /></svg>; }
export default function Assistant({ open, onOpen, onClose }) {
  const panel = useRef(null), button = useRef(null), previousFocus = useRef(null);
  const location = useLocation();
  useEffect(() => {
    let frame;
    function place() {
      if (open || !button.current) return;
      const launcher = button.current;
      const right = 20, size = 52;
      const controls = [...document.querySelectorAll('main a, main button, main input, main select, main textarea, .site-header')]
        .flatMap(element => [...element.getClientRects()]).filter(rect => rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight);
      const bottom = [20, 84, 148].find(offset => {
        const left = innerWidth - right - size, top = innerHeight - offset - size;
        return top >= 0 && !controls.some(rect => left < rect.right + 8 && left + size > rect.left - 8 && top < rect.bottom + 8 && top + size > rect.top - 8);
      });
      // Keep the compact launcher clear of mobile CTAs and navigation.
      // When all nearby positions are occupied, the footer entry remains available.
      launcher.style.visibility = bottom === undefined ? 'hidden' : 'visible';
      launcher.style.bottom = `max(${bottom ?? 20}px, env(safe-area-inset-bottom))`;
    }
    function queue() { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); }
    const observer = new MutationObserver(queue); observer.observe(document.querySelector('main') || document.body, { childList:true, subtree:true });
    window.addEventListener('scroll', queue, { passive:true }); window.addEventListener('resize', queue); queue();
    return () => { observer.disconnect(); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); cancelAnimationFrame(frame); };
  }, [open, location.pathname, location.search]);
  useEffect(() => {
    if (open && !panel.current.open) { previousFocus.current = document.activeElement; panel.current.showModal(); }
    else if (panel.current.open) { panel.current.close(); (previousFocus.current?.isConnected ? previousFocus.current : button.current)?.focus(); }
  }, [open]);
  return <><button ref={button} className="assistant-launcher" type="button" aria-label="Abrir asistente EduPlan" aria-haspopup="dialog" aria-expanded={open} aria-controls="eduplan-assistant" onClick={onOpen}><ChatIcon /></button>
    <dialog ref={panel} id="eduplan-assistant" className="assistant-panel" aria-labelledby="assistant-title" aria-describedby="assistant-status" onCancel={event => { event.preventDefault(); onClose(); }}>
      <header className="assistant-header"><div><h2 id="assistant-title">Asistente EduPlan</h2><span id="assistant-status" className="subtle">Próximamente</span></div><button className="assistant-close" type="button" autoFocus aria-label="Cerrar asistente EduPlan" onClick={onClose}>×</button></header>
      <div className="assistant-messages"><span className="assistant-mark" aria-hidden="true"><ChatIcon /></span><p><strong>Hola.</strong><br />Más adelante podrás conversar conmigo para orientarte mientras exploras programas e instituciones.</p><p className="subtle">El asistente todavía no está disponible.</p></div>
      <div className="assistant-composer"><label className="sr-only" htmlFor="assistant-question">Escribe tu pregunta</label><input id="assistant-question" placeholder="Escribe tu pregunta…" disabled /><button className="btn btn-primary" type="button" disabled>Enviar</button></div>
    </dialog></>;
}
