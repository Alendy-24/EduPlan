import { useId, useRef } from 'react';
export default function SectionTabs({ items, value, onChange, label, children }) {
  const id = useId(); const buttons = useRef([]);
  function keyDown(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next !== undefined) { event.preventDefault(); onChange(items[next]); buttons.current[next]?.focus(); }
  }
  const index = items.indexOf(value);
  return <><div className="tabs detail-tabs" role="tablist" aria-label={label}>{items.map((item, i) => <button key={item} ref={element => { buttons.current[i] = element; }} id={`${id}-tab-${i}`} aria-controls={`${id}-panel`} className="tab" role="tab" type="button" aria-selected={value === item} tabIndex={value === item ? 0 : -1} onClick={() => onChange(item)} onKeyDown={event => keyDown(event, i)}>{item}</button>)}</div><div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={0}>{children}</div></>;
}
