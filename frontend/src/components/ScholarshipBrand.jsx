import { useState } from 'react';
import { resolveScholarshipBrand } from '../data/scholarship-brands';
import '../styles/scholarship-brand.css';

/** Local reviewed imagery or a plain-text editorial identity; never a remote logo request. */
export default function ScholarshipBrand({ item, className = '' }) {
  const brand = resolveScholarshipBrand(item);
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(brand.src && brand.src !== failedSrc);
  return <span className={`scholarship-brand ${showImage ? `scholarship-brand-image scholarship-brand-${brand.tone || 'light'}` : 'scholarship-brand-text'} ${className}`.trim()} data-brand={brand.id}>
    {showImage ? <img src={brand.src} width="64" height="52" alt={brand.imageAlt || `Identidad institucional de ${brand.name}`} loading="lazy" decoding="async" onError={() => setFailedSrc(brand.src)} />
      : <span title={brand.name}>{brand.shortLabel}</span>}
  </span>;
}
