import { institutionLogoBrands } from './institution-logos.js';
import logoAssets from './scholarship-logo-assets.json' with { type: 'json' };

// Exact hosts from reviewed sources. A source for a joint call identifies its
// publishing organisation, never every institution participating in that call.
// `shortLabel` is plain editorial text, not a recreated institutional logotype.
export const scholarshipBrands = [
  { id: 'javeriana', name: 'Pontificia Universidad Javeriana', shortLabel: 'Javeriana', hosts: ['javeriana.edu.co'], institutionBrand: 'javeriana', sourceUrl: 'https://www.javeriana.edu.co/institucional/escudo-sello-bandera', imagePolicy: 'existing-local' },
  { id: 'unal', name: 'Universidad Nacional de Colombia', shortLabel: 'UNAL', hosts: ['unal.edu.co', 'bogota.unal.edu.co', 'bienestar.bogota.unal.edu.co', 'medellin.unal.edu.co'], institutionBrand: 'unal', sourceUrl: 'https://bogota.unal.edu.co/facultades', imagePolicy: 'existing-local' },
  { id: 'uniandes', name: 'Universidad de los Andes', shortLabel: 'Los Andes', hosts: ['uniandes.edu.co', 'apoyofinanciero.uniandes.edu.co'], sourceUrl: 'https://www.uniandes.edu.co/es/la-universidad/historia-mision-y-simbolos/identidad-institucional' },
  { id: 'atenea', name: 'Agencia Atenea', shortLabel: 'Atenea', hosts: ['agenciaatenea.gov.co'], sourceUrl: 'https://www.agenciaatenea.gov.co/transparencia-acceso-informacion-publica/1-informacion-de-la-entidad/13-mapas-y-cartas-descriptivas-de-los-procesos-2023/m1gc-manual-de-imagen-corporativa-atenea' },
  { id: 'sapiencia', name: 'Agencia Sapiencia', shortLabel: 'Sapiencia', hosts: ['sapiencia.gov.co'], sourceUrl: 'https://www.sapiencia.gov.co/wp-content/uploads/2018/03/MANUAL_DE_IDENTIDAD_CORPORATIVA_SAPIENCIA_2018.pdf' },
  { id: 'men', name: 'Ministerio de Educación Nacional', shortLabel: 'MEN', hosts: ['mineducacion.gov.co'], sourceUrl: 'https://www.mineducacion.gov.co/' },
  { id: 'colfuturo', name: 'Fundación COLFUTURO', shortLabel: 'COLFUTURO', hosts: ['colfuturo.org'], sourceUrl: 'https://www.colfuturo.org/' },
  { id: 'icetex', name: 'ICETEX', shortLabel: 'ICETEX', hosts: ['web.icetex.gov.co', 'icetex.gov.co', 'snibce.icetex.gov.co'], sourceUrl: 'https://web.icetex.gov.co/terminos-y-condiciones-del-sitio' },
  { id: 'fulbright', name: 'Comisión Fulbright Colombia', shortLabel: 'Fulbright', hosts: ['fulbright.edu.co'], sourceUrl: 'https://fulbright.edu.co/' },
  { id: 'erasmus', name: 'Unión Europea · Erasmus+', shortLabel: 'Erasmus+', hosts: ['erasmus-plus.ec.europa.eu'], src: '/logos/scholarships/eu-emblem.svg', imageAlt: 'Emblema de la Unión Europea, entidad del programa Erasmus+', sourceUrl: 'https://european-union.europa.eu/principles-countries-history/symbols/european-flag_en', imagePolicy: 'eu-emblem-third-party-conditions' },
  { id: 'eafit', name: 'Universidad EAFIT', shortLabel: 'EAFIT', hosts: ['eafit.edu.co'], sourceUrl: 'https://www.eafit.edu.co/en/node/42146' },
  { id: 'rosario', name: 'Universidad del Rosario', shortLabel: 'Rosario', hosts: ['urosario.edu.co'], sourceUrl: 'https://urosario.edu.co/' },
  { id: 'sabana', name: 'Universidad de La Sabana', shortLabel: 'La Sabana', hosts: ['unisabana.edu.co'], sourceUrl: 'https://www.unisabana.edu.co/' },
  { id: 'icesi', name: 'Universidad Icesi', shortLabel: 'Icesi', hosts: ['icesi.edu.co'], sourceUrl: 'https://www.icesi.edu.co/imagen-institucional/' },
  { id: 'uninorte', name: 'Universidad del Norte', shortLabel: 'Uninorte', hosts: ['uninorte.edu.co'], sourceUrl: 'https://www.uninorte.edu.co/' },
  { id: 'uis', name: 'Universidad Industrial de Santander', shortLabel: 'UIS', hosts: ['uis.edu.co', 'socorro.uis.edu.co', 'comunicaciones.uis.edu.co'], sourceUrl: 'https://comunicaciones.uis.edu.co/modo-correcto-de-uso-del-manual-de-identidad-visual-corporativo-uis/' },
  { id: 'univalle', name: 'Universidad del Valle', shortLabel: 'Univalle', hosts: ['univalle.edu.co', 'vicebienestar.univalle.edu.co'], sourceUrl: 'https://buga.univalle.edu.co/investigacion/2-noticias/96-normas-de-diseno-web' },
  { id: 'udea', name: 'Universidad de Antioquia', shortLabel: 'UdeA', hosts: ['udea.edu.co'], sourceUrl: 'https://www.udea.edu.co/' },
  { id: 'externado', name: 'Universidad Externado de Colombia', shortLabel: 'Externado', hosts: ['uexternado.edu.co'], sourceUrl: 'https://www.uexternado.edu.co/' },
  { id: 'daad', name: 'Servicio Alemán de Intercambio Académico', shortLabel: 'DAAD', hosts: ['daad.co', 'daad.de'], sourceUrl: 'https://www.daad.co/' },
  { id: 'carolina', name: 'Fundación Carolina', shortLabel: 'Carolina', hosts: ['fundacioncarolina.es', 'fundacioncarolina.org.co'], sourceUrl: 'https://www.fundacioncarolina.es/' },
  { id: 'mext', name: 'Gobierno de Japón · Embajada en Colombia', shortLabel: 'MEXT', hosts: ['colombia.emb-japan.go.jp'], sourceUrl: 'https://www.colombia.emb-japan.go.jp/' },
  { id: 'upb', name: 'Universidad Pontificia Bolivariana', shortLabel: 'UPB', hosts: ['upb.edu.co', 'portal.upb.edu.co'], sourceUrl: 'https://www.upb.edu.co/' },
  { id: 'unab', name: 'Universidad Autónoma de Bucaramanga', shortLabel: 'UNAB', hosts: ['unab.edu.co'], sourceUrl: 'https://unab.edu.co/' },
  { id: 'utb', name: 'Universidad Tecnológica de Bolívar', shortLabel: 'UTB', hosts: ['utb.edu.co'], sourceUrl: 'https://www.utb.edu.co/' },
  { id: 'sena', name: 'Servicio Nacional de Aprendizaje', shortLabel: 'SENA', hosts: ['sena.edu.co', 'normograma.sena.edu.co'], sourceUrl: 'https://normograma.sena.edu.co/compilacion/docs/resolucion_sena_1825_2024.htm' },
  { id: 'prosperidad-social', name: 'Prosperidad Social', shortLabel: 'Prosperidad Social', hosts: ['prosperidadsocial.gov.co'], sourceUrl: 'https://prosperidadsocial.gov.co/' },
  { id: 'poli', name: 'Politécnico Grancolombiano', shortLabel: 'El Poli', hosts: ['poli.edu.co'], sourceUrl: 'https://www.poli.edu.co/' },
  { id: 'umanizales', name: 'Universidad de Manizales', shortLabel: 'UManizales', hosts: ['umanizales.edu.co'], sourceUrl: 'https://umanizales.edu.co/' },
];

const brandsByHost = new Map(scholarshipBrands.flatMap(brand => brand.hosts.map(host => [host, brand])));
const institutionBrandsById = new Map(institutionLogoBrands.map(brand => [brand.id, brand]));
const assetsById = new Map(logoAssets.map(asset => [asset.id, asset]));

/** Resolve only reviewed host identities; do not guess using university names. */
export function resolveScholarshipBrand(item) {
  let host;
  try { const source = new URL(item?.officialUrl); if (source.protocol === 'https:') host = source.hostname.toLowerCase().replace(/^www\./, ''); }
  catch { /* An unknown source keeps a neutral, text-only identity. */ }
  const brand = brandsByHost.get(host);
  if (!brand) return { id: 'unlisted', name: item?.provider || 'Entidad responsable', shortLabel: 'Entidad', src: null };
  const local = brand.institutionBrand ? institutionBrandsById.get(brand.institutionBrand)?.logoUrl : null;
  const asset = assetsById.get(brand.id);
  return { ...brand, src: local || asset?.src || brand.src || null,
    tone: asset?.tone || 'light', imagePolicy: asset ? 'official-editorial-identification' : brand.imagePolicy,
    imageSourceUrl: asset?.assetUrl || brand.sourceUrl };
}
