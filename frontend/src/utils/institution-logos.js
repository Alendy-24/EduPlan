import { institutionLogoBrands, institutionLogoOverrides } from '../data/institution-logos.js';
import { websiteUrl } from './website.js';

const brandsByCode = new Map(institutionLogoBrands.flatMap(brand => brand.codes.map(code => [code, brand])));

export function normalizeLogoDevToken(value) {
  const token = typeof value === 'string' ? value.trim() : '';
  return /^pk_[A-Za-z0-9_-]+$/.test(token) ? token : '';
}

export const logoDevToken = normalizeLogoDevToken(import.meta.env?.VITE_LOGO_DEV_TOKEN);

export function institutionLogoDomain(value) {
  const website = websiteUrl(typeof value === 'string' ? value.trim() : value);
  if (!website) return null;
  const host = new URL(website).hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  // Solo nombres DNS completos: rechazar correos, IPs, www. y valores incompletos.
  const labels = host.split('.');
  if (host.length > 253 || labels.length < 2 || !/^[a-z]{2,}$/.test(labels.at(-1))) return null;
  if (labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  // Conservar subdominios desconocidos: Logo.dev resuelve el dominio registrable.
  // No recortar por número de segmentos (edu.co no es una institución).
  if (['edu.co', 'gov.co', 'mil.co', 'org.co', 'com.co', 'net.co'].includes(host)) return null;
  return host;
}

export function resolveInstitutionLogo(institution, token = logoDevToken) {
  const code = String(institution?.code ?? '');
  const brand = brandsByCode.get(code);
  const override = Object.hasOwn(institutionLogoOverrides, code) ? institutionLogoOverrides[code] : {};
  const brandId = brand?.id ?? `institution-${code}`;
  if (override.disabled ?? brand?.disabled) return { brandId, src: null };
  const manual = override.logoUrl ?? brand?.logoUrl;
  if (manual) return { brandId, src: manual };
  const domain = institutionLogoDomain(override.domain ?? brand?.domain ?? institution?.website);
  const publicToken = normalizeLogoDevToken(token);
  if (!domain || !publicToken) return { brandId, src: null };
  const query = new URLSearchParams({
    token: publicToken, format: 'webp', size: '128', fallback: '404', redirect: '404',
  });
  return { brandId, src: `https://img.logo.dev/${domain}?${query}` };
}
