import RefinementForm from './RefinementForm';
import ProfileIcon from './ProfileIcon';
import orientationStudent from '../../assets/Images/orientation-student.png';
const benefits = [
  ['compass', 'Conocerte mejor', 'Elige los temas y actividades que te llaman la atención.'],
  ['star', 'Ampliar tus opciones', 'Descubre caminos académicos que quizá no habías considerado.'],
  ['academic', 'Dar contexto a tu perfil', 'Suma preferencias específicas a las áreas que ya elegiste.'],
  ['chart', 'Decidir con más información', 'Usa la orientación como punto de partida para seguir explorando.'],
];
export default function OrientationPanel() {
  return <div className="orientation-page">
    <section className="orientation-hero"><div className="orientation-copy"><p className="eyebrow">Tu orientación académica</p><h1>Afina tus<br className="desktop-break"/> recomendaciones</h1><p>Responde algunas preguntas sobre lo que te interesa y cómo te gustaría estudiar. Las usaremos para ordenar mejor tus opciones.</p><div className="orientation-facts"><span><ProfileIcon name="compass"/>A tu ritmo</span><span><ProfileIcon name="heart"/>Desde tus intereses</span></div><a className="btn btn-primary" href="#refinement">Afinar mis recomendaciones<ProfileIcon name="arrow"/></a><p className="orientation-availability" id="orientation-availability">Puedes cambiar tus respuestas cuando quieras.</p></div><div className="orientation-art"><img src={orientationStudent} alt=""/></div></section>
    <div className="orientation-note"><ProfileIcon name="info"/><div><h2>No hay respuestas correctas o incorrectas</h2><p>Esta afinación compara preferencias declaradas con datos del catálogo. No es un examen, un diagnóstico ni el futuro test de aptitudes.</p></div></div>
    <RefinementForm/>
    <section className="orientation-benefits"><header><h2>Un espacio para descubrir</h2><p>Tus respuestas ayudan a ordenar las opciones.</p></header><div>{benefits.map(([icon, title, text]) => <article key={title}><span className={`benefit-icon benefit-${icon}`}><ProfileIcon name={icon}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
  </div>;
}
