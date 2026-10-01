import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authenticate } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { safeReturn } from '../utils/storage';
export default function AuthPage({ mode = 'login' }) {
  const register = mode === 'register'; const { user, startSession } = useAuth();
  const location = useLocation(), navigate = useNavigate();
  const destination = safeReturn(location.state?.returnTo);
  const [showPassword,setShowPassword] = useState(false), [error,setError] = useState(''), [loading,setLoading] = useState(false);
  const request = useRef(null), busy = useRef(false);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { setError(''); }, [mode]);
  async function submit(event) {
    event.preventDefault(); if (busy.current) return;
    const form = new FormData(event.currentTarget); const email = String(form.get('email')).trim(), password = String(form.get('password'));
    if (register && new TextEncoder().encode(password).length > 72) { setError('La contraseña no puede superar 72 bytes. Usa una contraseña más corta.'); return; }
    busy.current = true; setLoading(true); setError(''); const controller = new AbortController(); request.current = controller;
    try { const session = await authenticate(register ? 'register' : 'login', register ? { name: String(form.get('name')).trim(), email, password } : { identifier: email, password }, controller.signal); if (!controller.signal.aborted) { startSession(session); navigate(destination,{replace:true}); } }
    catch (reason) { if (!controller.signal.aborted) setError(reason.message); }
    finally { busy.current = false; if (!controller.signal.aborted) setLoading(false); }
  }
  if (user) return <Navigate to={destination} replace />;
  return <main className="auth-main"><div className="auth-card"><h1>{register ? 'Crea tu cuenta' : 'Bienvenido a EduPlan'}</h1><p className="subtle">Organiza tus opciones y continúa explorando.</p><form className="auth-form" onSubmit={submit}>
    {register && <label className="field">Nombre completo<input name="name" autoComplete="name" required maxLength={120} /></label>}
    <label className="field">Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={register ? 80 : undefined} /></label>
    <label className="field">Contraseña<input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 8 : undefined} maxLength={register ? 72 : undefined} aria-describedby={error ? 'auth-error' : undefined} /></label>
    <button className="text-link plain-button" type="button" aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</button>
    <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Enviando…' : register ? 'Crear cuenta' : 'Iniciar sesión'}</button>
    {error && <p id="auth-error" role="alert">{error}</p>}
  </form>{!register && <p className="auth-foot">Recuperación de contraseña aún no disponible.</p>}<p className="auth-foot">{register ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'} <Link className="text-link" to={register ? '/login' : '/register'} state={{returnTo:destination}}>{register ? 'Inicia sesión' : 'Crear cuenta'}</Link></p></div></main>;
}
