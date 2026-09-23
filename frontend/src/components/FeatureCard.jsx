function FeatureCard({ icon, title, description }) {
    return (
        <div className="feature-card">

            <div className="feature-icon">
                <img src={icon} alt="" />
            </div>

            <div className="feature-content">
                <h3>{title}</h3>

                <p>{description}</p>
            </div>

        </div>
    );
}

export default FeatureCard;