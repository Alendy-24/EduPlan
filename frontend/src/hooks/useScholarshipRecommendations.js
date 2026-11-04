import { useEffect, useMemo, useState } from 'react';
import { useAcademicProfile } from '../contexts/AcademicProfileContext';
import { scholarships } from '../data/scholarships';
import { recommendScholarships } from '../services/scholarship-recommendations';
import { emptyFinancingPreferences } from '../utils/financing';

export function useScholarshipRecommendations() {
  const profile = useAcademicProfile();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date()), timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const result = useMemo(() => recommendScholarships(scholarships, {
    preferences: profile.state === 'ready' ? profile.preferences : {},
    interests: profile.state === 'ready' ? profile.interests : {},
    refinement: profile.state === 'ready' ? profile.refinement : {},
    financing: profile.financingState === 'ready' ? profile.financing : emptyFinancingPreferences,
  }, now), [profile.preferences, profile.interests, profile.refinement, profile.financing, profile.state, profile.financingState, now]);
  return { ...result, now, state: profile.state, financingState: profile.financingState, error: profile.error || profile.financingError,
    retry: () => { profile.reload(); profile.reloadFinancing(); } };
}
