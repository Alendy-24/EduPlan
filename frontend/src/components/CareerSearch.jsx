import { useEffect, useId, useRef, useState } from 'react';
import { getProgramSuggestions } from '../services/programs';

export default function CareerSearch({ value, onChange, academicLevel, institutionCode, demoNames }) {
  const id = useId();
  const list = useRef(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState({ key: '', names: [], loading: false, error: false });
  const key = JSON.stringify({ value, academicLevel, institutionCode });
  const names = suggestions.key === key ? suggestions.names : [];
  const expanded = open && value.trim().length >= 2;
  useEffect(() => {
    if (value.trim().length < 2 || !open) return;
    const controller = new AbortController();
    setSuggestions({ key, names: [], loading: true, error: false });
    const timer = setTimeout(async () => {
      try {
        const names = demoNames ? demoNames.filter(name => name.toLocaleLowerCase('es').includes(value.toLocaleLowerCase('es'))).slice(0, 8)
          : await getProgramSuggestions(value, { academicLevel, institutionCode }, controller.signal);
        if (!controller.signal.aborted) setSuggestions({ key, names, loading: false, error: false });
      } catch {
        if (!controller.signal.aborted) setSuggestions({ key, names: [], loading: false, error: true });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, academicLevel, institutionCode, key, open, demoNames]);
  useEffect(() => {
    if (expanded && active >= 0) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, expanded]);
  function choose(name) { onChange(name); setOpen(false); setActive(-1); }
  return <div className="field career-search">
    <label htmlFor={id}>Carrera</label>
    <input id={id} type="search" role="combobox" autoComplete="off" maxLength={200} value={value}
      placeholder="Medicina, Administración o Sistemas"
      aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-options`}
      aria-activedescendant={expanded && names[active] ? `${id}-option-${active}` : undefined}
      onFocus={() => { setOpen(true); setActive(-1); }} onBlur={() => { setOpen(false); setActive(-1); }}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          setActive(current => Math.max(0, Math.min(names.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
        } else if (event.key === 'Enter' && expanded && names[active]) { event.preventDefault(); choose(names[active]); }
        else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
      }} />
    {expanded && <div className="career-options-panel">
      <ul id={`${id}-options`} role="listbox" aria-label="Sugerencias de carreras" ref={list}>
        {names.map((name, index) => <li key={name} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
          className={index === active ? 'is-active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(name)}>{name}</li>)}
      </ul>
      {!names.length && <p role="status">{suggestions.loading || suggestions.key !== key ? 'Buscando sugerencias…' : suggestions.error ? 'Las sugerencias no están disponibles. Puedes seguir buscando.' : 'Sin sugerencias. Puedes buscar con el texto que escribiste.'}</p>}
    </div>}
  </div>;
}
