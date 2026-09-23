import crearPerfil from "../assets/Images/crear-perfil.svg";
import perfilamiento from "../assets/Images/perfilamiento.svg";
import explorar from "../assets/Images/explorar.png";
import comparar from "../assets/Images/comparar.svg";
import apoyoFinanciero from "../assets/Images/apoyo-financiero.png";

function Process() {

    const steps = [
        {
            icon: crearPerfil,
            title: "Crea tu perfil",
            description: "Registra tus datos y preferencias"
        },
        {
            icon: perfilamiento,
            title: "Perfilamiento",
            description: "Descubre tu perfil académico"
        },
        {
            icon: explorar,
            title: "Explora",
            description: "Encuentra programas ideales"
        },
        {
            icon: comparar,
            title: "Compara",
            description: "Evalúa tus mejores opciones"
        },
        {
            icon: apoyoFinanciero,
            title: "Apoyo financiero",
            description: "Accede a becas y créditos"
        }
    ];

    return (
        <section className="process-section">

            <h2>
                El proceso que te recomendamos seguir
            </h2>

            <div className="process-container">

                {steps.map((step, index) => (

                    <div className="process-step" key={step.title}>

                        <div className="step-top">

                            <div className="step-circle">
                                <img src={step.icon} alt="" />
                            </div>

                            {index < steps.length - 1 && (
                                <div className="step-line"></div>
                            )}

                        </div>

                        <h3>
                            {step.title}
                        </h3>

                        <p>
                            {step.description}
                        </p>

                    </div>

                ))}

            </div>

        </section>
    );
}

export default Process;