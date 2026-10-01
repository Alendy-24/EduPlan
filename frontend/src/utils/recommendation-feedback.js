export const feedbackKey = accountId => `eduplan-recommendation-dismissed-v1-user-${accountId}`;
export const validDismissed = value => Array.isArray(value) && value.length <= 200 && value.every(id=>typeof id==='string' && /^upr9-nkiz:[\w.~-]+$/.test(id));
export function dismissRecommendation(current, sourceId) {
  return validDismissed([sourceId]) ? [...new Set([sourceId,...current])].slice(0,200) : current;
}
