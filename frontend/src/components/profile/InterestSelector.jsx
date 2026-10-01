import { areas, motivations } from '../../utils/interests';
import ProfileIcon from './ProfileIcon';
export default function InterestSelector({ selections, toggle, disabled }) {
  return <div className="academic-interests">
    {[['areas', 'Áreas que te interesan', areas], ['motivations', 'Lo que disfrutas hacer', motivations]].map(([key, label, options]) => <fieldset className="interest-group" key={key} disabled={disabled}>
      <legend>{label}<span>{selections[key].length ? `${selections[key].length} ${selections[key].length === 1 ? 'seleccionada' : 'seleccionadas'}` : 'Elige una o más'}</span></legend>
      <div className="interest-chips">{options.map(option => <button key={option} type="button" aria-pressed={selections[key].includes(option)} onClick={() => toggle(key, option)}>{selections[key].includes(option) && <ProfileIcon name="check"/>}{option}</button>)}</div>
    </fieldset>)}
    <p className="field-help">Tus áreas guían las recomendaciones. Tus motivaciones nos ayudan a conocer lo que buscas.</p>
  </div>;
}
