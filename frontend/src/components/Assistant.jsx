import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { askAssistant } from '../services/assistant';
import { contextoDePantalla } from '../utils/assistantContext';
export function ChatIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /><path d="M7 9h10M7 13h7" /></svg>; }
export default function Assistant({ open, onOpen, onClose }) {
  const panel = useRef(null), button = useRef(null), previousFocus = useRef(null);
  const location = useLocation();
  const { token } = useAuth();
  const [messages, setMessages] = useState([]), [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef(null), history = useRef(null);
  useEffect(() => {
    setMessages([]); setQuestion(''); setError(''); setBusy(false);
    return () => request.current?.abort();
  }, [token]);
  useEffect(() => { history.current?.scrollTo(0, history.current.scrollHeight); }, [messages, busy, error]);
  async function send(event) {
    event.preventDefault();
    if (busy || !token || !question.trim()) return;
    const content = question.trim();
    const next = [...messages.slice(-10), { role: 'user', content }];
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      const reply = await askAssistant({
        mensajes: next.map(message => ({ ...message, content: message.content.slice(0, 2000) })),
        contexto: contextoDePantalla(location.pathname),
      }, token, controller.signal);
      if (!controller.signal.aborted) { setMessages([...next, { role: 'assistant', content: reply }]); setQuestion(''); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure.name === 'TimeoutError' ? 'La respuesta tardó demasiado. Intenta de nuevo.' : failure.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
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
      <header className="assistant-header"><div><h2 id="assistant-title">Asistente EduPlan</h2><span id="assistant-status" className="subtle">{token ? 'Orientación con IA' : 'Inicia sesión para conversar'}</span></div><button className="assistant-close" type="button" autoFocus aria-label="Cerrar asistente EduPlan" onClick={onClose}>×</button></header>
      <div ref={history} className="assistant-messages" role="log" aria-live="polite" aria-busy={busy}><span className="assistant-mark" aria-hidden="true"><ChatIcon /></span><p><strong>Hola.</strong><br />Puedo ayudarte a usar EduPlan y orientarte para explorar carreras e instituciones. ¿Qué necesitas?</p>{!token && <p className="subtle"><Link to="/login" onClick={onClose}>Inicia sesión</Link> para conversar con el asistente.</p>}<p className="subtle">Tus mensajes se envían al proveedor de IA. Confirma los datos en las fuentes oficiales.</p>{messages.map((message, index) => <p className={'assistant-msg assistant-msg-' + message.role} key={index}><strong>{message.role === 'user' ? 'Tú' : 'EduPlan'}</strong><br />{message.content}</p>)}{busy && <p className="subtle">Pensando…</p>}{error && <p role="alert">{error}</p>}</div>
      <form className="assistant-composer" onSubmit={send}><label className="sr-only" htmlFor="assistant-question">Escribe tu pregunta</label><input id="assistant-question" placeholder="Escribe tu pregunta…" value={question} onChange={event => setQuestion(event.target.value)} maxLength={2000} disabled={!token || busy} /><button className="btn btn-primary" type="submit" disabled={!token || busy || !question.trim()}>Enviar</button></form>
    </dialog></>;
}
