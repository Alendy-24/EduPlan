import ProfileIcon from './ProfileIcon';
import orientationStudent from '../../assets/Images/orientation-student.png';
const benefits = [
  ['compass', 'Conocerte mejor', 'Pon en palabras los temas y actividades que te llaman la atención.'],
  ['star', 'Ampliar tus opciones', 'Descubre caminos académicos que quizá no habías considerado.'],
  ['academic', 'Dar contexto a tu perfil', 'Suma tus respuestas a los intereses que ya elegiste.'],
  ['chart', 'Decidir con más información', 'Usa la orientación como punto de partida para seguir explorando.'],
];
export default function OrientationPanel() {
  return <div className="orientation-page">
    <section className="orientation-hero"><div className="orientation-copy"><p className="eyebrow">Tu orientación académica</p><h1>Descubre qué mueve<br className="desktop-break"/> tu curiosidad</h1><p>Estamos preparando una experiencia para explorar tus intereses y las actividades que disfrutas. Un nuevo punto de partida para pensar en tu camino académico.</p><div className="orientation-facts"><span><ProfileIcon name="compass"/>A tu ritmo</span><span><ProfileIcon name="heart"/>Desde tus intereses</span></div><button className="btn btn-primary" type="button" disabled aria-describedby="orientation-availability">Test disponible próximamente<ProfileIcon name="arrow"/></button><p className="orientation-availability" id="orientation-availability">Mientras tanto, puedes completar tu perfil y explorar tus recomendaciones.</p></div><div className="orientation-art"><img src={orientationStudent} alt=""/></div></section>
    <div className="orientation-note"><ProfileIcon name="info"/><div><h2>No hay respuestas correctas o incorrectas</h2><p>Esta futura experiencia será una guía para explorar opciones. No será un examen ni un diagnóstico psicológico.</p></div></div>
    <section className="orientation-benefits"><header><h2>Un espacio para descubrir</h2><p>Así podrá acompañarte en tus próximos pasos.</p></header><div>{benefits.map(([icon, title, text]) => <article key={title}><span className={`benefit-icon benefit-${icon}`}><ProfileIcon name={icon}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
  </div>;
}
