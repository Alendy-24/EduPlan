import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
const guides = [
 { title:'Elegir un área de estudio', steps:['Anota las actividades que disfrutas y las que quieres aprender.','Explora varias áreas antes de limitar tus opciones.','Habla con estudiantes y revisa planes de estudio oficiales.'], href:'/perfil', action:'Organizar mis intereses' },
 { title:'Comparar programas', steps:['Comprueba nivel, ciudad, modalidad y estado publicado.','Pregunta por duración, prácticas, requisitos y costos totales.','Identifica qué información falta; no interpretes un dato ausente como una ventaja.'], href:'/comparar', action:'Abrir comparador' },
 { title:'Preparar una postulación', steps:['Confirma fechas y requisitos en el sitio oficial de la institución.','Haz una lista de documentos y plazos.','Antes de aceptar financiación, revisa condiciones, tasas y compromisos.'], href:'/becas', action:'Explorar ejemplos de financiación' },
];
export default function GuidesPage() { return <main className="page"><div className="container"><PageHeader title="Guías para explorar tus opciones">Preguntas y pasos para decidir con información, a tu ritmo.</PageHeader><div className="guides-grid">{guides.map(guide=><article className="guide-card surface" key={guide.title}><h2>{guide.title}</h2><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol><Link className="text-link" to={guide.href}>{guide.action} →</Link></article>)}</div></div></main>; }
