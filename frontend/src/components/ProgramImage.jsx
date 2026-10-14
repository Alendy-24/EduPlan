import { useEffect, useRef, useState } from 'react';
import { resolveProgramImage } from '../utils/program-images.js';
import { programImages, programCareerImages } from '../data/program-images.js';
import { fetchCareerPhoto } from '../utils/career-photo-client.js';
import '../styles/program-images.css';

export default function ProgramImage({ program, eager = false }) {
  const figure = useRef(null);
  const [remote, setRemote] = useState(null);
  const name = program.name || '';
  const key = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const eligible = ['SNIES_NAME', 'OFFICIAL_PAGE'].includes(program.nameOrigin) && !program.reviewRequired && !programCareerImages[key];
  useEffect(() => {
    if (!eligible) return;
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      fetchCareerPhoto(name).then(photo => { if (active && photo) setRemote({ key, photo }); });
    }, { rootMargin: '200px' });
    if (figure.current) observer.observe(figure.current);
    return () => { active = false; observer.disconnect(); };
  }, [eligible, name, key]);
  const selected = eligible && remote?.key === key ? remote.photo : resolveProgramImage(program);
  const [failedSources, setFailedSources] = useState([]);
  const photo = failedSources.includes(selected.src) ? programImages.general : selected;
  const unavailable = failedSources.includes(photo.src);
  return <figure ref={figure} className="program-photo">
    {unavailable ? <div className="program-photo-unavailable">Fotografía no disponible</div> : <img
      src={photo.src} alt={photo.alt} width="960" height="640"
      loading={eager ? 'eager' : 'lazy'} decoding="async"
      onError={() => setFailedSources(previous => [...new Set([...previous, photo.src])])}
    />}
    <figcaption>Foto de referencia{!unavailable && photo.sourceUrl && <> · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.author}{photo.sourceName && ` / ${photo.sourceName}`}</a></>}</figcaption>
  </figure>;
}
