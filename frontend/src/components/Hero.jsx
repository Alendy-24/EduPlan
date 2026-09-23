import heroImage from "../assets/Images/estudiantess.avif";
import colombia from "../assets/Images/colombia.webp";

function Hero() {
    return (
        <>
            <section className="hero">

                <div className="hero-content">

                    <h1>
                        Construye tu
                        <br />
                        futuro
                    </h1>

                    <p>
                        Te guiamos en tu camino a la educación superior
                    </p>

                    <div className="hero-buttons">

                        <button className="btn-primary">
                            Encuentra mi oportunidad
                        </button>

                        <button className="btn-secondary">
                            Orientación personalizada
                        </button>

                    </div>

                </div>

                <div className="hero-image">
                    <img
                        src={heroImage}
                        alt="Estudiantes universitarios"
                    />
                </div>

            </section>

            <section className="colombia-banner">

                <img
                    className="flag"
                    src={colombia}
                    alt="Bandera de Colombia"
                />

                <p>
                    Buscamos que más jóvenes colombianos tomen{" "}
                    <strong>decisiones informadas</strong> y encuentren{" "}
                    <strong>oportunidades</strong> para entrar a la educación superior.
                </p>

                <img
                    className="flag"
                    src={colombia}
                    alt="Bandera de Colombia"
                />

            </section>
        </>
    );
}

export default Hero;