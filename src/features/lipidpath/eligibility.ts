import type { Profile } from './types.ts'
export function preventEligible(p: Profile) {
  return p.age!==undefined&&p.age>=30&&p.age<=79&&p.ascvd===false&&p.fh==='none'&&p.severeHistory===false&&p.ldl!==undefined&&p.ldl>=70&&p.ldl<190&&(p.baselineLdl??0)<190&&!(p.cac!==undefined&&p.cac>0)&&(!p.incidentalCac||p.incidentalCac==='none')
}
