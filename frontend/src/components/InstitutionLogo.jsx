import { useState } from 'react';
import institutionIcon from '../assets/Images/instituciones.svg';
import { resolveInstitutionLogo } from '../utils/institution-logos';

export default function InstitutionLogo({ institution, className = '', alt = '', loading = 'lazy' }) {
  const { src } = resolveInstitutionLogo(institution);
  const [failedSrc, setFailedSrc] = useState(null);
  const showLogo = Boolean(src && src !== failedSrc);
  return (
    <img
      className={`${showLogo ? 'institution-logo' : 'institution-logo-fallback'} ${className}`.trim()}
      src={showLogo ? src : institutionIcon}
      alt={showLogo ? alt : ''}
      width={showLogo ? 144 : 52}
      height={showLogo ? 64 : 52}
      loading={loading}
      decoding="async"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={showLogo ? () => setFailedSrc(src) : undefined}
    />
  );
}
