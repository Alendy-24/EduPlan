import { useEffect, useRef, useState } from 'react';

const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export default function InstitutionSearch({ institutions, value, selectedName, disabled, onChange }) {
  const selectedText = value ? `${selectedName} (${value})` : '';
  const [draft, setDraft] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const list = useRef(null);
  const text = draft ?? selectedText;
  const words = fold(draft ?? '').trim().split(/\s+/).filter(Boolean);
  const matches = institutions.filter(item => words.every(word => fold(`${item.name} ${item.code}`).includes(word)));
  const choices = [{ code: '', name: 'Todas las instituciones' }, ...matches];
  const index = Math.min(active, choices.length - 1);
  function choose(item) { onChange(item.code); setDraft(null); setOpen(false); setActive(0); }
  useEffect(() => { if (open) list.current?.children[index]?.scrollIntoView({ block: 'nearest' }); }, [index, open]);
  return <div className="field institution-search">
    <label htmlFor="program-university">Universidad o institución</label>
    <input id="program-university" type="text" role="combobox" autoComplete="off"
      aria-autocomplete="list" aria-expanded={open} aria-controls="institution-options"
      aria-activedescendant={open ? `institution-option-${index}` : undefined}
      placeholder="Escribe el nombre o código de la institución" disabled={disabled} value={text}
      onFocus={() => { setOpen(true); setActive(0); }}
      onChange={event => { setDraft(event.target.value); setOpen(true); setActive(0); if (!event.target.value) onChange(''); }}
      onBlur={() => { setOpen(false); setDraft(null); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          setActive(current => !open ? 0 : Math.max(0, Math.min(choices.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
        } else if (event.key === 'Enter' && open) { event.preventDefault(); choose(choices[index]); }
        else if (event.key === 'Escape') { setOpen(false); setDraft(null); }
      }} />
    {open && <div className="institution-options-panel">
      <ul id="institution-options" role="listbox" aria-label="Instituciones disponibles" ref={list}>
        {choices.map((item, position) => <li key={item.code} id={`institution-option-${position}`} role="option" aria-selected={item.code === value} className={position === index ? 'is-active' : ''}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}>
          {item.name}{item.code && ` (${item.code})`}
        </li>)}
      </ul>
      {!matches.length && <p role="status">No hay instituciones con ese nombre o código.</p>}
    </div>}
  </div>;
}
