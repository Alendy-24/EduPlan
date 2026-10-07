// Asociaciones por código MEN; no se deducen por parecido entre nombres.
// Estos dominios identifican marcas, no certifican la imagen que entregue el CDN.
export const institutionLogoBrands = [
  {
    id: 'javeriana', domain: 'javeriana.edu.co', codes: ['1701', '1702'],
    logoUrl: '/logos/javeriana.jpg',
    sourceUrl: 'https://www.javeriana.edu.co/institucional/escudo-sello-bandera',
    reviewedAt: '2026-10-06',
  },
  { id: 'unal', domain: 'unal.edu.co', codes: ['1101', '1102', '1103', '1104', '1124', '1125', '1126', '9920', '9933'] },
  { id: 'udea', domain: 'udea.edu.co', codes: ['1201', '1219', '1220', '1221', '1222', '1223', '9125'] },
  { id: 'univalle', domain: 'univalle.edu.co', codes: ['1203', '9908', '9909', '9911', '9912'] },
  { id: 'unilibre', domain: 'unilibre.edu.co', codes: ['1806', '1807', '1808', '1809', '1810', '1811'] },
  { id: 'sena', domain: 'sena.edu.co', codes: ['9110', '9111', '9112', '9113', '9114', '9115'] },
  { id: 'upb', domain: 'upb.edu.co', codes: ['1710', '1723', '1727', '1730'] },
  { id: 'usta', domain: 'usta.edu.co', codes: ['1704', '1705', '1732'] },
];

// Una sede puede indicar { logoUrl: '/logos/archivo.webp' }, { domain: '...' }
// o { disabled: true }. Tiene prioridad sobre la configuración de su marca.
// Registrar la fuente oficial y fecha de revisión junto a cada imagen manual.
export const institutionLogoOverrides = {
  // El dominio de la Armada agrupa escuelas diferentes; su marca no identifica
  // necesariamente a cada escuela. Conservar el respaldo hasta revisar emblemas.
  '3114': { disabled: true },
  '3901': { disabled: true },
};
