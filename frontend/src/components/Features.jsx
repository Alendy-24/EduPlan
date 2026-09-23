import FeatureCard from "./FeatureCard";

import explorarProgramas from "../assets/Images/explorar-programas.svg";
import instituciones from "../assets/Images/instituciones.svg";
import becas from "../assets/Images/becas.svg";
import guia from "../assets/Images/guia.svg";
import perfilamiento from "../assets/Images/perfilamiento.svg";
import orientacion from "../assets/Images/orientacion.svg";

function Features() {

    const features = [
        {
            icon: explorarProgramas,
            title: "Explorar programas",
            description: "Encuentra carreras según tus intereses"
        },
        {
            icon: instituciones,
            title: "Ver instituciones",
            description: "Conoce universidades e instituciones"
        },
        {
            icon: becas,
            title: "Becas y financiación",
            description: "Descubre y postúlate a apoyos económicos"
        },
        {
            icon: guia,
            title: "Guía y recursos",
            description: "Infórmate con contenido útil sobre procesos y financiación"
        },
        {
            icon: perfilamiento,
            title: "Perfilamiento",
            description: "Encuentra las oportunidades que hay para ti"
        },
        {
            icon: orientacion,
            title: "Orientación personalizada",
            description: "Descubre tu potencial"
        }
    ];

    return (
        <section className="features-section">

            <h2>
                ¿Quieres seguir estudiando pero no sabes cómo, qué o dónde?
            </h2>

            <div className="features-grid">

                {features.map((feature) => (
                    <FeatureCard
                        key={feature.title}
                        icon={feature.icon}
                        title={feature.title}
                        description={feature.description}
                    />
                ))}

            </div>

        </section>
    );
}

export default Features;