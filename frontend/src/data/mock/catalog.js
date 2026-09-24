// Contenido temporal de interfaz. No se mezcla con /api/institutions.
import students from '../../assets/Images/estudiantess.avif';
import campusImage from '../../assets/Images/campus-photo.jpg';
import javerianaImage from '../../assets/Images/javeriana-campus.jpg';
import libraryImage from '../../assets/Images/library-photo.jpg';
import studyImage from '../../assets/Images/study-photo.jpg';
export { students };
export { campusImage, libraryImage, studyImage };
export const demoInstitution={id:'demo-javeriana',name:'Pontificia Universidad Javeriana',city:'Bogotá',sector:'Privada',character:'Universidad',website:'https://www.javeriana.edu.co/',image:javerianaImage,summary:'Conoce la institución, explora sus áreas de estudio y prepara tus preguntas para el proceso de admisión.'};
export const programs=[
  {id:'ingenieria-sistemas',name:'Ingeniería de Sistemas',level:'Pregrado',area:'Tecnología',modality:'Presencial',city:'Bogotá',duration:'8 semestres',institution:demoInstitution.name,description:'Una ruta de estudio en software, datos y sistemas de información.',image:studyImage},
  {id:'medicina',name:'Medicina',level:'Pregrado',area:'Salud',modality:'Presencial',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Explora una formación en ciencias de la salud y atención a las personas.',image:students},
  {id:'psicologia',name:'Psicología',level:'Pregrado',area:'Ciencias sociales',modality:'Presencial',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Conoce áreas de estudio relacionadas con el comportamiento humano.',image:libraryImage},
  {id:'diseno-industrial',name:'Diseño Industrial',level:'Pregrado',area:'Artes',modality:'Presencial',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Explora procesos de diseño centrados en las personas y su entorno.',image:studyImage},
  {id:'maestria-educacion',name:'Maestría en Educación',level:'Posgrado',area:'Educación',modality:'Por confirmar',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Una ruta de profundización para quienes trabajan en educación.',image:libraryImage},
];
export const scholarships=[
  {id:'beca-academica',name:'Beca por mérito académico',type:'Beca',provider:'Ejemplo de convocatoria',level:'Pregrado',city:'Bogotá',description:'Ejemplo de apoyo sujeto a requisitos y fechas de una convocatoria real.',image:campusImage},
  {id:'credito-educativo',name:'Crédito educativo',type:'Crédito',provider:'Ejemplo de financiación',level:'Todos los niveles',city:'Colombia',description:'Ejemplo de financiación que requeriría validar tasas y condiciones.',image:libraryImage},
  {id:'apoyo-permanencia',name:'Apoyo de permanencia',type:'Apoyo',provider:'Ejemplo de convocatoria',level:'Pregrado',city:'Colombia',description:'Ejemplo de apoyo para gastos asociados a la vida estudiantil.',image:students},
  {id:'pasantia',name:'Pasantía de investigación',type:'Pasantía',provider:'Ejemplo de convocatoria',level:'Pregrado',city:'Colombia',description:'Ejemplo de oportunidad para conocer un equipo de investigación.',image:studyImage},
];
export const featuredOpportunities=[
  {title:'Ingeniería de Sistemas',subtitle:'Explora el plan y los requisitos',type:'Programa',href:'/programas/ingenieria-sistemas',image:studyImage,imageAlt:'Estudiantes en un campus'},
  {title:demoInstitution.name,subtitle:'Bogotá · Universidad privada',type:'Institución',href:'/instituciones/demo-javeriana',image:javerianaImage,imageAlt:'Edificio de la Pontificia Universidad Javeriana en Bogotá'},
  {title:'Becas y apoyos',subtitle:'Conoce las opciones disponibles',type:'Oportunidades',href:'/becas',image:students,imageAlt:'Estudiantes conversando'},
];
