import { resolveInstitutionPhone } from '../utils/institution-phone.js';

export default function InstitutionContact({ institution }) {
  const phone = resolveInstitutionPhone(institution);
  return (
    <div className="institution-contact">
      <p><strong>Teléfono:</strong>{' '}
        {phone.href ? <a href={phone.href}>{phone.label}</a> : phone.label}
      </p>
      {phone.status === 'review' && <p className="subtle">El catálogo publica un número incompleto o de formato no reconocido. Confirma el contacto en el sitio oficial.</p>}
      {phone.verified && <p className="subtle"><a href={phone.sourceUrl} target="_blank" rel="noopener noreferrer">Contacto publicado por la institución ↗</a></p>}
    </div>
  );
}
