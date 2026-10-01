export interface ScoreTone {
  stroke: string;
  text: string;
  bg: string;
  ring: string;
  verdict: string;
}

export function scoreTone(score: number): ScoreTone {
  if (score >= 70) {
    return { stroke: '#059669', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100', verdict: 'Strong Opportunity' };
  }
  if (score >= 40) {
    return { stroke: '#ea580c', text: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-100', verdict: 'Moderate Opportunity' };
  }
  return { stroke: '#dc2626', text: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-100', verdict: 'Saturated / High Risk' };
}
