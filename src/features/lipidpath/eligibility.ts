import type { Profile } from './types.ts'
export function preventReasons(p: Profile): string[] {
  const reasons: string[]=[]
  if(p.age===undefined||!Number.isFinite(p.age)||!Number.isInteger(p.age)) reasons.push('A valid age is needed to assess this pathway.')
  else if(p.age<30||p.age>79) reasons.push('The supported risk-based treatment pathway uses ages 30–79.')
  if(p.ldl===undefined||!Number.isFinite(p.ldl)) reasons.push('A valid current LDL cholesterol result is needed.')
  else if(p.ldl<70||p.ldl>=190) reasons.push('The supported risk-based treatment pathway uses current LDL cholesterol of 70–189 mg/dL.')
  if(p.ascvd===undefined) reasons.push('Established cardiovascular disease status is unknown.')
  else if(p.ascvd) reasons.push('Established cardiovascular disease is assessed in a separate pathway.')
  if(p.fh===undefined||p.fh==='unknown') reasons.push('Known familial hypercholesterolemia status is unknown.')
  else if(p.fh!=='none') reasons.push('Known familial hypercholesterolemia is assessed separately.')
  if(p.severeHistory===undefined) reasons.push('Untreated severe LDL history is unknown.')
  else if(p.severeHistory||(p.baselineLdl??0)>=190) reasons.push('Severe untreated LDL history is assessed separately.')
  if((p.cac??0)>0||p.incidentalCac&&p.incidentalCac!=='none') reasons.push('Reported coronary calcium is assessed separately.')
  return reasons
}
export function preventEligible(p: Profile) {
  return preventReasons(p).length===0
}
