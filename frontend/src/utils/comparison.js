const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
export function comparisonValue(value) {
  return typeof value === 'string' && value.trim() && !['na','n/a','no disponible','no disponible en este catálogo','institución no disponible','nombre del programa no disponible'].includes(normalize(value)) ? value.trim() : '';
}
export function comparisonLocation(program) {
  const city = comparisonValue(program.city), department = comparisonValue(program.department);
  const key = text => normalize(text).replace(/[^a-z0-9]/g, '');
  return [city, ...(department && key(city) !== key(department) ? [department] : [])].filter(Boolean).join(' · ');
}
export function comparisonDuration(program) {
  const count = Number(program.periodCount), unit = normalize(program.periodicity);
  const labels = { semestral:['semestre','semestres'], trimestral:['trimestre','trimestres'], cuatrimestral:['cuatrimestre','cuatrimestres'], anual:['año','años'], mensual:['mes','meses'] };
  if (Number.isInteger(count) && count > 0 && labels[unit]) return `${count} ${labels[unit][count === 1 ? 0 : 1]}`;
  if ((program.periodCount || program.periodicity) && (!Number.isInteger(count) || count <= 0 || !comparisonValue(program.periodicity))) return '';
  return comparisonValue(program.duration);
}
export const comparisonGroups = [
  { id:'location', title:'Dónde estudiar', description:'Revisa la ciudad, la sede y la institución de cada opción.', rows:[
    {key:'institution',label:'Universidad o institución',get:p=>p.institution},
    {key:'city',label:'Ciudad',get:p=>p.city},
    {key:'department',label:'Departamento',get:p=>p.department},
    {key:'campus',label:'Sede institucional',get:p=>p.institutionCampus},
    {key:'sector',label:'Tipo de institución',get:p=>p.institutionSector},
  ]},
  { id:'study',title:'Modalidad y duración',description:'Compara cómo estudiarías y cuánto dura cada programa.',rows:[
    {key:'modality',label:'Modalidad',get:p=>p.modality},
    {key:'duration',label:'Duración publicada',get:comparisonDuration},
    {key:'credits',label:'Créditos académicos',get:p=>p.credits},
    {key:'status',label:'Estado publicado',get:p=>p.status},
  ]},
  { id:'formation',title:'Formación y título',description:'Compara el título que obtendrás y el nivel académico de cada programa.',rows:[
    {key:'level',label:'Nivel académico',get:p=>p.level},
    {key:'educationLevel',label:'Nivel de formación',get:p=>p.educationLevel},
    {key:'awardedTitle',label:'Título que otorga',get:p=>p.awardedTitle},
    {key:'area',label:'Área de conocimiento',get:p=>p.area},
  ]},
];
export function comparisonRowState(row, programs) {
  const values = programs.map(program=>comparisonValue(row.get(program)));
  const known = values.filter(Boolean).map(normalize);
  return { values, differs:new Set(known).size > 1, same:programs.length > 1 && known.length === programs.length && new Set(known).size === 1 };
}

export const comparisonPriorities = [
  {key:'location',label:'Ubicación',rows:['city','department','campus','institution','sector']},
  {key:'modality',label:'Modalidad',rows:['modality']},
  {key:'duration',label:'Duración',rows:['duration']},
  {key:'formation',label:'Título y formación',rows:['level','educationLevel','awardedTitle','area']},
];
export function priorityRow(key, priorities) {
  return comparisonPriorities.some(priority=>priorities.includes(priority.key) && priority.rows.includes(key));
}
export function comparisonNoteKey(program) { return program.offerId || program.id; }
export function validComparisonWorkspace(value) {
  return Boolean(value && Array.isArray(value.priorities) && value.priorities.length <= comparisonPriorities.length
    && (value.favorite === undefined || value.favorite === null || typeof value.favorite === 'string' && value.favorite.length > 0 && value.favorite.length <= 500)
    && new Set(value.priorities).size === value.priorities.length && value.priorities.every(key=>comparisonPriorities.some(priority=>priority.key===key))
    && value.notes && typeof value.notes === 'object' && !Array.isArray(value.notes)
    && Object.entries(value.notes).every(([key,text])=>key && typeof text === 'string' && text.length <= 2000));
}

// Summarize published values without treating missing data as a difference or
// inferring which institution is better. Keep the selected priorities first.
export function comparisonHighlights(programs, priorities = []) {
  if (programs.length < 2) return [];
  const keys = ['modality','duration','city','awardedTitle','level','educationLevel','sector','credits'];
  return keys.map(key => {
    const group = comparisonGroups.find(group => group.rows.some(row => row.key === key));
    const row = group.rows.find(row => row.key === key);
    return { ...row, ...comparisonRowState(row, programs), groupId:group.id, priority:priorityRow(key, priorities) };
  }).filter(row => row.differs).sort((a,b) => Number(b.priority) - Number(a.priority)).slice(0,4);
}

export function comparisonShareText(programs, origin) {
  const lines = ['Mi comparación de programas · EduPlan', ''];
  programs.forEach((program,index) => {
    lines.push(`Opción ${String.fromCharCode(65 + index)}: ${comparisonValue(program.name) || 'Programa por confirmar'}`);
    if (program.provenance === 'demo') lines.push('Datos ficticios de demostración.');
    if (['saved','error','missing','loading'].includes(program.comparisonState)) lines.push('Información guardada o pendiente de actualizar; confirma esta oferta con la institución.');
    comparisonGroups.forEach(group => group.rows.forEach(row => lines.push(`${row.label}: ${comparisonValue(row.get(program)) || 'Por confirmar'}`)));
    if (program.provenance === 'real' && program.code && program.sourceId) {
      const url = new URL('/programas/' + encodeURIComponent(program.code), origin);
      url.searchParams.set('registro', program.sourceId);
      lines.push(`Detalle: ${url.href}`);
    }
    lines.push('');
  });
  lines.push('Confirma con cada institución la oferta vigente, la matrícula, los requisitos de admisión y el plan de estudios.');
  return lines.join('\n');
}
