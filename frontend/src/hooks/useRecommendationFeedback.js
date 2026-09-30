import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { browserStorage,readStorage,writeStorage } from '../utils/storage';
import { feedbackKey,validDismissed,dismissRecommendation } from '../utils/recommendation-feedback';
export function useRecommendationFeedback() {
  const { user } = useAuth(), key=feedbackKey(user?.id);
  const [excluded,setExcluded]=useState(()=>readStorage(browserStorage(),key,[],validDismissed)),[persistent,setPersistent]=useState(true);
  function update(value) { setExcluded(value);setPersistent(writeStorage(browserStorage(),key,value)); }
  return { excluded,persistent,dismiss:id=>update(dismissRecommendation(excluded,id)),reset:()=>update([]) };
}
