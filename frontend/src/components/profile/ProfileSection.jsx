import { useId } from 'react';
export default function ProfileSection({ number, title, description, children }) {
  const id = useId();
  return <section className="academic-step" aria-labelledby={id}>
    <span className="academic-step-number" aria-hidden="true">{number}</span>
    <header><h2 id={id}>{title}</h2><p>{description}</p></header>
    <div className="academic-step-content">{children}</div>
  </section>;
}
