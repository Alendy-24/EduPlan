function FeatureCard({ icon, title, description, href }) {
    const content = <>
        <div className="feature-icon">
            <img src={icon} alt="" />
        </div>

        <div className="feature-content">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    </>;

    if (href) {
        return <a className="feature-card" href={href}>{content}</a>;
    }

    return (
        <div className="feature-card">
            {content}
        </div>
    );
}

export default FeatureCard;
