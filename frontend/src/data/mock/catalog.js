// Contenido temporal de interfaz. No se mezcla con /api/institutions.
import students from '../../assets/Images/estudiantess.avif';
import campusImage from '../../assets/Images/campus-photo.jpg';
import javerianaImage from '../../assets/Images/javeriana-campus.jpg';
import libraryImage from '../../assets/Images/library-photo.jpg';
import studyImage from '../../assets/Images/study-photo.jpg';
export { students };
export { campusImage, libraryImage, studyImage };
export const demoInstitution={id:'demo-javeriana',name:'Universidad de demostración',city:'Bogotá',sector:'Privada',character:'Universidad',website:'',image:javerianaImage,summary:'Conoce la institución, explora sus áreas de estudio y prepara tus preguntas para el proceso de admisión.'};
export const programs=[
  {id:'ingenieria-sistemas',name:'Ingeniería de Sistemas',level:'Pregrado',area:'Tecnología',modality:'Presencial',city:'Bogotá',duration:'Ejemplo: 8 semestres',institution:demoInstitution.name,description:'Una ruta de estudio en software, datos y sistemas de información.',image:studyImage},
  {id:'medicina',name:'Medicina',level:'Pregrado',area:'Salud',modality:'Presencial',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Explora una formación en ciencias de la salud y atención a las personas.',image:students},
  {id:'psicologia',name:'Psicología',level:'Pregrado',area:'Ciencias sociales',modality:'Presencial',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Conoce áreas de estudio relacionadas con el comportamiento humano.',image:libraryImage},
  {id:'diseno-industrial',name:'Diseño Industrial',level:'Pregrado',area:'Artes',modality:'Presencial',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Explora procesos de diseño centrados en las personas y su entorno.',image:studyImage},
  {id:'maestria-educacion',name:'Maestría en Educación',level:'Posgrado',area:'Educación',modality:'Por confirmar',city:'Bogotá',duration:'Por confirmar',institution:demoInstitution.name,description:'Una ruta de profundización para quienes trabajan en educación.',image:libraryImage},
];
export const featuredOpportunities=[
  {title:'Explora programas académicos',subtitle:'Consulta los registros del catálogo público',type:'Programas',href:'/programas',image:studyImage,imageAlt:'Estudiantes preparando una actividad académica'},
  {title:'Conoce instituciones',subtitle:'Busca por ubicación y carácter académico',type:'Instituciones',href:'/instituciones',image:javerianaImage,imageAlt:'Edificio de la Pontificia Universidad Javeriana en Bogotá'},
  {title:'Becas y apoyos',subtitle:'Revisa requisitos y calendarios en fuentes oficiales',type:'Oportunidades',href:'/becas',image:students,imageAlt:'Estudiantes conversando'},
];
