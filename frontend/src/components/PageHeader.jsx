export default function PageHeader({ title, children }) { return <div className="page-intro"><h1>{title}</h1>{children && <p className="lead">{children}</p>}</div>; }
