import { preventEligible } from './eligibility.ts'
import { guideline } from './evidence.ts'
import { ldlReduction, nonHdl, riskCategory } from './calculations.ts'
import type { Profile, Result } from './types.ts'

export function validate(p: Profile): string[] {
  const errors: string[] = []
  const limits: Partial<Record<keyof Profile, [number, number]>> = { age:[0,120], majorEvents:[0,10], highRiskConditions:[0,7], total:[1,1500], hdl:[1,300], ldl:[0,1200], baselineLdl:[1,1200], tg:[0,20000], apob:[0,1000], lpa:[0,5000], egfr:[1,200], cac:[0,20000], cacPercentile:[0,100], risk10:[0,100], risk30:[0,100] }
  for (const [key, [min,max]] of Object.entries(limits)) {
    const value=p[key as keyof Profile]
    if (value!==undefined && (typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)) errors.push(`${key}: enter a finite number between ${min} and ${max}.`)
  }
  for (const key of ['age','majorEvents','highRiskConditions'] as const) if(p[key]!==undefined&&!Number.isInteger(p[key])) errors.push(`${key}: enter a whole number.`)
  const options: Partial<Record<keyof Profile, string[]>>={sex:['female','male'], reproductive:['none','pregnant','planning','lactating'],fh:['none','hefh','hofh','unknown'],lpaUnit:['mg/dL','nmol/L'],incidentalCac:['none','mild','moderate-severe'],statin:['none','low','moderate','high'],lipidTreatment:['none','current','unknown'],medicationNow:['yes','no','unknown']}
  for(const [key,values] of Object.entries(options)) if(p[key as keyof Profile]!==undefined&&!values.includes(p[key as keyof Profile] as string)) errors.push(`${key}: select a supported value.`)
  for(const key of ['ascvd','diabetes','multipleDiabetesRisks','severeHistory','additionalRisks','ckd','dialysis','hiv','stableArt','complexCare','safetyReviewed','smoking','strongFamilyHistory','fasting','persistentTg','dietTrial','fcs','avoidTherapy','riskConfirmed','maxTolerated','adherent','ezetimibe','pcsk9','bempedoic','inclisiran','muscleSymptoms','severeMuscleSymptoms'] as const) if(p[key]!==undefined&&typeof p[key]!=='boolean') errors.push(`${key}: select yes or no.`)
  if(p.cacPercentile!==undefined&&p.cac===undefined) errors.push('Enter the CAC score associated with the standardized percentile before interpreting either pathway.')
  if(p.cac===0&&(p.cacPercentile??0)>=75) errors.push('CAC zero and a high standardized percentile require reconciliation before interpretation.')
  if(p.total!==undefined&&p.hdl!==undefined&&p.hdl>p.total) errors.push('HDL-C cannot exceed total cholesterol.')
  if(p.ldl!==undefined&&nonHdl(p.total,p.hdl)!==undefined&&p.ldl>nonHdl(p.total,p.hdl)!+1) errors.push('LDL-C exceeds non-HDL-C; verify results from the same sample.')
  if(p.ascvd===false&&(p.majorEvents??0)>0) errors.push('Major ASCVD events conflict with no established ASCVD.')
  if(p.statin==='none'&&p.maxTolerated===true) errors.push('No current statin cannot establish maximally tolerated statin treatment in this tool.')
  if(p.medicationNow==='no'&&(p.statin!==undefined&&p.statin!=='none'||p.ezetimibe===true||p.pcsk9===true||p.bempedoic===true||p.inclisiran===true)) errors.push('No current cholesterol medication conflicts with a reported current medication. Review both answers.')
  if(p.severeHistory===false&&p.baselineLdl!==undefined&&p.baselineLdl>=190) errors.push('Untreated baseline ≥190 conflicts with no severe LDL history.')
  if(p.lpa!==undefined&&!p.lpaUnit) errors.push('Select the reported Lp(a) unit.')
  if(p.risk30!==undefined&&p.age!==undefined&&(p.age<30||p.age>59)) errors.push('30-year PREVENT-ASCVD is supported only at ages 30–59.')
  if(p.risk10!==undefined&&p.risk30!==undefined&&p.risk30<p.risk10) errors.push('30-year risk is lower than 10-year risk; verify the model, outcome and inputs.')
  if(p.ckd===false&&p.dialysis===true) errors.push('Maintenance dialysis conflicts with no established CKD.')
  if(p.severeMuscleSymptoms===true&&p.muscleSymptoms!==true) errors.push('Severe muscle symptoms require muscle symptoms to be selected.')
  if(p.riskEnhancers!==undefined&&(!Array.isArray(p.riskEnhancers)||p.riskEnhancers.some(v=>typeof v!=='string'))) errors.push('Risk enhancers must be a list of labels.')
  return errors
}
export { preventEligible } from './eligibility.ts'
export function evaluate(p: Profile): Result {
  const r:Result={version:guideline.version,status:'incomplete',pathways:[],goals:[],considerations:[],safety:[],missing:[],errors:validate(p),trace:[],nonHdl:nonHdl(p.total,p.hdl),reduction:ldlReduction(p.baselineLdl,p.ldl),findings:[],observations:[]}
  const add=(id:string,text:string,refs=[id])=>{if(!r.considerations.some(c=>c.id===id)) r.considerations.push({id,text,evidence:refs})}
  const trace=(id:string,label:string,facts:string,refs=[id])=>r.trace.push({id,label,facts,evidence:refs})
  const goal=(ldl:number,nonHdl:number,context:string,refs:string[],reduction?:number)=>r.goals.push({ldl,nonHdl,context,evidence:refs,reduction})
  const need=(condition:boolean,text:string)=>{if(condition)r.missing.push(text)}
  if(r.errors.length) return r
  if(p.ldl!==undefined) r.findings.push({code:p.ldl>=190?'ldl-markedly-elevated':'ldl-entered',evidence:p.ldl>=190?['severe-causes']:[]})
  if(p.tg!==undefined&&p.tg>=150) r.findings.push({code:'tg-elevated',evidence:['tg-lifestyle']})
  if(p.ascvd===true) r.findings.push({code:'ascvd-reported',evidence:['secondary']})
  if(p.diabetes===true) r.findings.push({code:'diabetes-reported',evidence:['diabetes']})
  const safeDiscussion=p.age!==undefined&&p.age>=18&&p.age<=79&&p.reproductive==='none'&&p.fh!==undefined&&p.fh!=='unknown'&&p.fh!=='hofh'&&p.complexCare===false&&p.safetyReviewed===true&&(p.ckd===false||p.dialysis===false)&&(p.statin==='none'||p.muscleSymptoms===false)
  if(p.ascvd===true) r.observations.push({code:'ascvd',certainty:'established-finding',evidence:['secondary'],treatmentDiscussion:safeDiscussion})
  const documentedSevere=p.severeHistory===true||(p.baselineLdl!==undefined&&p.baselineLdl>=190)||(p.ldl!==undefined&&p.ldl>=190&&p.lipidTreatment==='none')
  if(documentedSevere) r.observations.push({code:'severe-ldl',certainty:'established-finding',evidence:['severe-causes'],treatmentDiscussion:safeDiscussion})
  else if(p.ldl!==undefined&&p.ldl>=190) r.observations.push({code:'possible-severe-ldl',certainty:'possible',evidence:['severe-causes']})
  if(p.diabetes===true) r.observations.push({code:'diabetes',certainty:'possible',evidence:[p.multipleDiabetesRisks===true?'diabetes-risk':'diabetes'],treatmentDiscussion:safeDiscussion&&p.age!==undefined&&p.age>=40&&p.age<=75&&p.ascvd===false&&p.severeHistory===false&&!documentedSevere&&p.ldl!==undefined&&p.ldl<190&&p.multipleDiabetesRisks!==undefined})
  if(p.tg!==undefined&&p.tg>=150) r.observations.push({code:'triglycerides',certainty:'possible',evidence:['tg-lifestyle']})
  if((p.cac??0)>0||p.incidentalCac==='mild'||p.incidentalCac==='moderate-severe') r.observations.push({code:'cac',certainty:'possible',evidence:['cac-mild','cac-moderate']})
  if(p.lpa!==undefined&&p.lpaUnit!==undefined&&p.lpa>=(p.lpaUnit==='mg/dL'?50:125)) r.observations.push({code:'lpa',certainty:'possible',evidence:['lpa']})
  const partial=()=>{
    if(p.ascvd===false&&p.cac!==undefined&&p.cac>0&&p.cac<100&&p.cacPercentile===undefined) need(true,'Standardized CAC percentile for CAC 1–99')
    // An established ASCVD classification can be assessed independently of
    // unrelated missing answers, but only after the shared scope/safety guard.
    if(safeDiscussion&&p.ascvd===true&&p.majorEvents!==undefined&&p.highRiskConditions!==undefined&&p.ckd===false&&p.fh==='none'&&p.severeHistory===false&&(p.baselineLdl??0)<190&&p.ldl!==undefined&&p.ldl<190) {
      const veryHigh=p.majorEvents>=2||(p.majorEvents===1&&p.highRiskConditions>=2)
      const id=veryHigh?'very-high':'secondary'
      r.pathways.push(veryHigh?'Very-high-risk secondary prevention':'Secondary prevention, not very high risk')
      goal(veryHigh?55:70,veryHigh?85:100,'Secondary ASCVD prevention',[id],50)
      trace(id,'Clinical ASCVD classification',`${p.majorEvents} distinct major events; ${p.highRiskConditions} high-risk conditions; very-high-risk criteria ${veryHigh?'met':'not met'}.`)
      add(id,'Discuss high-intensity statin therapy, or the maximally tolerated regimen, for secondary prevention.')
    }
    r.missing=[...new Set(r.missing)]
    return r
  }
  if((p.tg??0)>=500) r.safety.push(`TG ${p.tg} mg/dL: prompt clinical evaluation for severe elevation and pancreatitis risk${p.tg!>=1000?'; at ≥1000, triglyceride lowering is a priority':''}. A laboratory result alone does not diagnose pancreatitis.`)
  need(p.age===undefined,'Age')
  need(p.reproductive===undefined,'Pregnancy, pregnancy planning or lactation status (or not applicable)')
  for(const [key,label] of [['ascvd','Established clinical ASCVD'],['diabetes','Diabetes'],['severeHistory','History of untreated LDL-C ≥190'],['ckd','Established CKD stage 3 or higher'],['hiv','HIV'],['complexCare','Complex care / limited life expectancy / active cancer therapy'],['safetyReviewed','Contraindication and interaction review']] as const) need(p[key]===undefined,label)
  need(p.fh===undefined||p.fh==='unknown','Known familial hypercholesterolemia status')
  need(p.ldl===undefined,'Current laboratory-reported LDL-C (no estimated LDL formula is supplied)')
  if(p.ascvd===true) {need(p.majorEvents===undefined,'Number of distinct major ASCVD events');need(p.highRiskConditions===undefined,'Number of high-risk ASCVD conditions')}
  if(r.missing.length) return partial()
  if(p.age!<18||p.age!>79||p.reproductive!=='none'||p.fh==='hofh'||p.complexCare||p.safetyReviewed!==true||p.dialysis===true) {
    r.status='review-required';r.pathways=['Individualized review'];
    add('special','Additional individualized clinical evaluation is required. This presentation is outside the automated treatment pathways; no treatment goal or medication selection is returned.')
    trace('special','Scope and safety check',`Age ${p.age}; reproductive status ${p.reproductive}; FH ${p.fh}; complex care ${p.complexCare}; safety reviewed ${p.safetyReviewed}; dialysis ${p.dialysis}.`)
    return r
  }
  if(p.ckd) {need(p.dialysis===undefined,'Maintenance dialysis status');need(p.egfr===undefined,'eGFR in established CKD');if(p.egfr!==undefined&&p.egfr>=60) {r.safety.push('Stage ≥3 CKD status and eGFR ≥60 require reconciliation.');r.status='review-required';return r}}
  if(p.ascvd) {need(p.majorEvents===undefined,'Number of distinct major ASCVD events');need(p.highRiskConditions===undefined,'Number of high-risk ASCVD conditions')}
  const severe=p.severeHistory===true||(p.baselineLdl??0)>=190||(p.lipidTreatment==='none'&&p.ldl!>=190)
  if(!severe&&p.ldl!>=190) {r.safety.push('Current LDL-C ≥190 requires clarification of treatment and untreated history before classifying the severe-LDL pathway.');r.status='review-required';return r}
  if(severe&&!p.ascvd) need(p.additionalRisks===undefined,'Additional ASCVD risk factors for severe hypercholesterolemia')
  if(!p.ascvd&&p.diabetes&&p.age!>=40&&p.age!<=75) need(p.multipleDiabetesRisks===undefined,'Multiple ASCVD risk factors in diabetes')
  if(r.missing.length) return partial()
  r.status='educational'
  if(p.muscleSymptoms) {
    r.pathways.push('Statin-associated symptom review')
    add('muscle','Review symptom timing, exertion, thyroid disease, interactions and other explanations. Severe myalgia or weakness warrants objective strength and CK assessment. This tool does not diagnose statin intolerance.')
    add('muscle-discussion','Discuss symptom concerns and cardiovascular risks of discontinuation; treatment changes require clinical assessment.')
    r.safety.push('Medication initiation and intensification are deferred until muscle symptoms are evaluated.');trace('muscle','Symptoms require assessment',`Muscle symptoms reported; severe symptoms ${p.severeMuscleSymptoms===undefined?'unknown':p.severeMuscleSymptoms}.`)
  }
  const currentStatin=p.statin!==undefined&&p.statin!=='none'
  const canIntensify=currentStatin&&p.maxTolerated===true&&p.adherent===true&&!p.muscleSymptoms&&!((p.tg??0)>=400&&p.fasting!==true)
  if(p.statin===undefined) r.missing.push('Current statin use and intensity')
  if(currentStatin) {need(p.maxTolerated===undefined,'Whether current statin is maximally tolerated');need(p.adherent===undefined,'Medication adherence')}
  if(p.adherent===false) add('adherence','Review adherence, access and response before considering additional medication.',['monitor'])
  if(p.ascvd) {
    const veryHigh=p.majorEvents!>=2||(p.majorEvents===1&&p.highRiskConditions!>=2)
    const id=veryHigh?'very-high':'secondary'
    r.pathways.push(veryHigh?'Very-high-risk secondary prevention':'Secondary prevention, not very high risk')
    goal(veryHigh?55:70,veryHigh?85:100,'Secondary ASCVD prevention',[id],50)
    trace(id,'Clinical ASCVD classification',`${p.majorEvents} distinct major events; ${p.highRiskConditions} high-risk conditions; very-high-risk criteria ${veryHigh?'met':'not met'}.`)
    if(!p.muscleSymptoms) add(id,'Discuss high-intensity statin therapy, or the maximally tolerated regimen, for secondary prevention.')
    if(!veryHigh) add('secondary-optional','An optional LDL/non-HDL target below 55/85 mg/dL may be considered with clinician judgment and patient preference.',['secondary-add'])
  }
  if(severe) {
    r.pathways.push('Severe hypercholesterolemia')
    const enhanced=p.fh==='hefh'||p.additionalRisks===true||(p.cac??0)>0||p.incidentalCac==='mild'||p.incidentalCac==='moderate-severe'
    const id=p.ascvd?'severe-ascvd':enhanced?'severe-risk':'severe-simple'
    goal(p.ascvd?55:enhanced?70:100,p.ascvd?85:enhanced?100:130,'Severe hypercholesterolemia',[id])
    trace('severe-causes','Severe LDL pathway',`History ≥190: ${p.severeHistory}; untreated baseline ${p.baselineLdl??'unknown'}; current ${p.ldl}; additional risks ${p.additionalRisks??'not required with ASCVD'}; HeFH ${p.fh==='hefh'}; coronary calcification ${enhanced}.`,['severe-causes',id])
    add('severe-causes','Review secondary causes such as thyroid, kidney/liver disease, diet and medications; evaluate possible FH with appropriate clinical criteria. LDL-C alone does not diagnose FH.')
    if(!p.muscleSymptoms) add('severe-statin','Discuss maximally tolerated statin therapy; nonstatin choices depend on the applicable goal, current regimen and clinical assessment.')
  }
  if(p.fh==='hefh'&&!severe) {r.pathways.push('HeFH specialist review');r.status='review-required';add('hefh-review','Known HeFH without a documented severe untreated LDL history requires individualized lipid-specialist evaluation; general-population PREVENT is excluded.',['special'])}
  if(!p.ascvd&&!severe&&p.diabetes) {
    if(p.age!<40||p.age!>75) {r.status='review-required';r.pathways.push('Diabetes outside core age range');add('diabetes-age','Additional individualized clinical evaluation is required for diabetes outside age 40–75; disease duration, complications and life expectancy require separate review.',['special'])}
    else {const id=p.multipleDiabetesRisks?'diabetes-risk':'diabetes';r.pathways.push('Diabetes primary prevention');goal(p.multipleDiabetesRisks?70:100,p.multipleDiabetesRisks?100:130,'Diabetes',[id],p.multipleDiabetesRisks?50:30);trace(id,'Diabetes eligibility',`Age ${p.age}; multiple ASCVD risk factors ${p.multipleDiabetesRisks}.`);if(!p.muscleSymptoms)add(id,p.multipleDiabetesRisks?'Discuss high-intensity statin therapy with multiple ASCVD risk factors.':'Discuss moderate-intensity statin therapy (usual LDL reduction 30–49%).')}
  }
  if(p.ckd) {
    if(p.ascvd) {goal(55,85,'CKD stage ≥3 with ASCVD',['ckd-ascvd'],50);trace('ckd-ascvd','CKD with ASCVD',`Established CKD, eGFR ${p.egfr}, no maintenance dialysis.`)}
    else if(p.age!>=40&&p.age!<=75&&p.ldl!>=70&&p.ldl!<190) {r.pathways.push('CKD primary prevention');if(!p.muscleSymptoms)add('ckd','Discuss moderate statin or moderate statin plus ezetimibe; renal function and interaction review are required.');trace('ckd','CKD eligibility',`Age ${p.age}; LDL ${p.ldl}; established stage ≥3 CKD, eGFR ${p.egfr}.`)}
    else {r.status='review-required';add('ckd-review','CKD outside the supported primary-prevention age/lipid range requires individualized evaluation.',['special'])}
  }
  if(p.hiv&&!p.ascvd) {
    if(p.age!>=40&&p.age!<=75&&p.stableArt===true){r.pathways.push('HIV primary prevention');if(!p.muscleSymptoms)add('hiv','Discuss statin therapy while reviewing antiretroviral drug interactions; this indication does not depend on a high calculated risk.');trace('hiv','HIV eligibility',`Age ${p.age}; stable combination ART confirmed.`)}
    else {r.status='review-required';add('hiv-review','HIV outside age 40–75 or without confirmed stable combination ART requires individualized evaluation.',['special']);need(p.stableArt===undefined,'Stable combination antiretroviral therapy status')}
  }
  const cacPresent=(p.cac??0)>0||p.incidentalCac==='mild'||p.incidentalCac==='moderate-severe'
  const cacAge=p.sex==='male'&&p.age!>=40||p.sex==='female'&&p.age!>=45
  if(cacPresent&&!p.ascvd) {
    if(!cacAge) {r.status='review-required';add('cac-age','CAC interpretation is outside the supported sex/age eligibility or sex is missing; individualized evaluation is required.',['special'])}
    else {
      r.pathways.push('Subclinical coronary atherosclerosis')
      let id:string|undefined, target=100
      if((p.cac??0)>=1000){id='cac-extensive';target=55}
      else if((p.cac??0)>=300){id='cac-severe';target=70}
      else if((p.cac??0)>=100||(p.cacPercentile??0)>=75){id='cac-moderate';target=70}
      else if(p.incidentalCac==='moderate-severe'){id='cac-incidental';target=70}
      else if(p.incidentalCac==='mild'||p.cac!==undefined&&p.cac>0&&p.cacPercentile!==undefined&&p.cacPercentile<75)id='cac-mild'
      else r.missing.push('Standardized CAC percentile for CAC 1–99')
      if(id) {goal(target,target+30,'CAC pathway',[id],p.baselineLdl!==undefined&&p.baselineLdl<target?30:target===100?30:50);trace(id,'CAC classification',`CAC ${p.cac??'not scored'} AU; percentile ${p.cacPercentile??'unknown'}; incidental finding ${p.incidentalCac??'none'}.`);if(!p.muscleSymptoms)add(id,target===100?'Discuss moderate-intensity statin therapy for mild CAC.':'Discuss LDL-lowering therapy, with statins as the first-line consideration.');if((p.cac??0)>=300&&(p.cac??0)<1000)add('cac-optional','For CAC 300–999, a tighter LDL/non-HDL goal below 55/85 mg/dL can be considered.');if(p.baselineLdl!==undefined&&p.baselineLdl<target)add('cac-baseline','With untreated LDL already below the absolute CAC goal, the guideline caveat supports at least 30% reduction; individualized selection is required.',[id])}
    }
  }
  const primary=!p.ascvd&&!severe&&p.fh==='none'&&!p.diabetes&&!cacPresent
  if(primary) {
    r.pathways.push('Primary prevention')
    add('lifestyle','Discuss a heart-healthy dietary pattern, physical activity, smoking cessation where applicable, and individualized benefits and risks of therapy.')
    if(preventEligible(p)&&p.riskConfirmed===true&&p.risk10!==undefined) {
      r.riskCategory=riskCategory(p.risk10);trace('risk','Manual PREVENT-ASCVD result',`User-confirmed official ASCVD outcome: 10-year ${p.risk10}%; age ${p.age}; LDL ${p.ldl}; no clinical/subclinical ASCVD or FH. Not recalculated here.`)
      const category=r.riskCategory
      if(category==='Low') {
        if(p.age!<=59&&((p.baselineLdl??p.ldl!)>=160||(p.risk30??0)>=10)) {goal(100,130,'Low short-term risk with elevated long-term exposure',['low'],30);if(!p.muscleSymptoms)add('low','A moderate-intensity statin is reasonable to discuss because LDL exposure or 30-year risk meets the low-risk exception.');trace('low','Long-term risk exception',`LDL ${p.baselineLdl??p.ldl}; 30-year risk ${p.risk30??'unknown'}%.`)}
        else {add('low-counseling','Continue individualized prevention and health-behavior counseling; low 10-year risk alone does not rule out long-term benefit.',['lifestyle']);if(p.age!<=59)need(p.risk30===undefined,'30-year PREVENT-ASCVD result to complete low-risk assessment')}
      } else {
        const id=category==='Borderline'?'borderline':category==='Intermediate'?'intermediate':'high'
        const goalId=category==='High'?'high-goals':'primary-goals'
        goal(category==='High'?70:100,category==='High'?100:130,'Primary prevention if treatment is initiated',[goalId,id],category==='High'?50:30)
        if(!p.muscleSymptoms)add(id,category==='Borderline'?'Use shared decision-making; if treatment is selected, moderate-intensity statin is reasonable.':category==='Intermediate'?'Discuss at least moderate-intensity statin therapy; high intensity may benefit the higher end of this risk range.':'Discuss high-intensity statin therapy when lipid treatment is initiated.')
        trace(id,'Risk category',`${p.risk10}% is ${category.toLowerCase()} risk. Goals apply if treatment is initiated.`,[id,goalId])
        if(category==='Borderline'&&p.riskEnhancers?.length) add('enhancers',`Selected risk enhancers: ${p.riskEnhancers.join(', ')}. These inform discussion; no numeric risk adjustment is applied.`)
      }
      if(p.cac===0&&cacAge&&(category==='Borderline'||category==='Intermediate')) {
        const noExceptions=p.smoking===false&&p.strongFamilyHistory===false&&!p.ckd&&!p.hiv
        if(noExceptions&&p.avoidTherapy===true) add('cac-zero','With CAC zero, a preference to avoid therapy and no listed higher-risk exceptions, deferral with repeat CAC in 3–7 years can be discussed.')
        else {add('cac-zero-caution','CAC zero does not automatically justify deferring therapy. Confirm smoking/family history, preference and concurrent indications.',['cac-zero']);need(p.smoking===undefined,'Current cigarette smoking for CAC zero');need(p.strongFamilyHistory===undefined,'Strong premature ASCVD family history for CAC zero')}
      }
    } else if(!p.ckd&&!p.hiv) {
      if(preventEligible(p)){need(p.risk10===undefined,'Official PREVENT-ASCVD 10-year result');need(p.riskConfirmed!==true,'Confirmation that the manual result uses PREVENT-ASCVD, not total CVD or PCE')}
      else {r.status='review-required';add('risk-unavailable','PREVENT-based management is unavailable for the entered age, lipid range or disease status. Additional individualized clinical evaluation is required.',['risk'])}
    }
  }
  if(p.cac===0&&(p.ascvd||severe||p.fh!=='none'||p.diabetes||p.smoking||p.strongFamilyHistory)) add('cac-zero-exception','CAC zero must not override the established indication or higher-risk condition.',['cac-zero'])
  if((p.apob??0)>140&&!severe&&!currentStatin||(r.nonHdl??0)>220&&!severe&&!currentStatin){r.status='review-required';r.goals=[];add('severe-alternate','High untreated apoB/non-HDL may represent severe hypercholesterolemia even without LDL ≥190. This alternate-entry phenotype requires individualized review; PREVENT treatment output is withheld.',['severe-causes'])}
  const above=r.goals.some(g=>p.ldl!>=g.ldl||(r.nonHdl!==undefined&&r.nonHdl>=g.nonHdl)||(r.reduction!==undefined&&g.reduction!==undefined&&r.reduction<g.reduction))
  if(canIntensify&&above&&r.status==='educational') {
    const medication=(id:string,text:string,ref=id)=>{if(p.ezetimibe===undefined||p.pcsk9===undefined||p.bempedoic===undefined||p.inclisiran===undefined) {need(true,'Current ezetimibe, PCSK9 monoclonal antibody, bempedoic acid and inclisiran use');return}add(id,text,[ref])}
    if(severe)medication('severe-add','Discuss the appropriate nonstatin combination (ezetimibe, PCSK9 monoclonal antibody and/or bempedoic acid); account for existing drugs, remaining LDL reduction needed and preferences.',['severe-simple','severe-risk','severe-ascvd'].filter(id=>r.goals.some(g=>g.evidence.includes(id)))[0])
    else if(p.ascvd)medication(r.goals.some(g=>g.evidence.includes('very-high'))?'very-high-add':'secondary-add','Discuss nonstatin intensification appropriate to the ASCVD pathway and existing regimen. Ezetimibe and/or a PCSK9 monoclonal antibody have outcome evidence; bempedoic acid is another context-dependent option.')
    else if(r.riskCategory==='High') {if(p.ezetimibe===false)add('high-add','Discuss adding ezetimibe when goals remain unmet on maximally tolerated statin.');else if(p.ezetimibe===undefined)need(true,'Current ezetimibe use');else medication('high-add-next','Discuss PCSK9 monoclonal antibody or bempedoic acid if goals remain unmet, accounting for existing therapy.')}
    if(severe&&p.ldl!>=100&&p.inclisiran===false)add('inclisiran','Inclisiran is an LDL-lowering option in this severe-LDL context. Cardiovascular outcomes trials were pending in the 2026 guideline; it is not interchangeable with proven outcome benefit.')
  }
  if(p.tg!==undefined&&p.tg>=400&&p.fasting!==true) add('fasting-repeat','For a nonfasting or unconfirmed-fasting TG ≥400 mg/dL, confirm a fasting lipid profile and LDL assessment before medication intensification based on lipid levels.')
  if(p.tg!==undefined&&p.tg>=150) {
    r.pathways.push(p.tg>=500?'Severe triglyceride elevation':'Triglyceride risk assessment')
    const persistent=p.fasting===true&&p.persistentTg===true
    trace('tg-lifestyle','Triglyceride assessment',`TG ${p.tg}; fasting ${p.fasting??'unknown'}; persistence criteria confirmed ${p.persistentTg??'unknown'}.`)
    add('tg-apob','Consider non-HDL-C or apoB rather than LDL-C alone when evaluating triglyceride-associated risk.')
    if(persistent)add('tg-lifestyle','Review secondary causes, reduced alcohol and added sugars, dietary pattern, activity and weight management; consider a registered dietitian.')
    else {need(p.fasting===undefined,'Fasting status for triglycerides');add('tg-unconfirmed','A single or nonfasting value does not establish persistent hypertriglyceridemia. Confirm fasting testing and persistence after 4–12 weeks of lifestyle/secondary-cause management and stable therapy if indicated.',['tg-lifestyle'])}
    if(p.tg>=500) {if(persistent&&p.dietTrial===true&&!p.muscleSymptoms)add('tg-pancreatitis','After dietary intervention, persistent severe TG supports clinician discussion of fibrates or prescription omega-3 for pancreatitis risk reduction.');else need(p.dietTrial===undefined,'Dietary intervention status for severe triglycerides');if(p.tg>=1000)add('tg-priority','At TG ≥1000, prioritize prompt review and triglyceride-focused nutrition management to reduce pancreatitis risk.',['tg-pancreatitis']);if(p.fcs===true){r.status='review-required';add('fcs-review','Confirmed familial chylomicronemia syndrome requires a lipid-specialist pathway; drug selection is deferred.',['special'])}}
    if(p.age!>=50&&(p.ascvd||p.diabetes&&p.additionalRisks===true)&&p.tg<500&&persistent&&p.ldl!<100&&canIntensify)add('tg-ipe','Icosapent ethyl may be discussed for residual ASCVD risk in this eligible context; this does not establish equivalent benefit for other omega-3 products.')
  }
  if(p.lpa===undefined)add('lpa-test','Consider once-in-adulthood Lp(a) measurement.')
  else if(p.lpa>=(p.lpaUnit==='mg/dL'?50:125)) {add('lpa','Elevated Lp(a) supports optimal control of modifiable cardiovascular risk factors. Do not convert mass and molar units or apply an automatic risk multiplier.');trace('lpa','Lp(a) risk enhancement',`${p.lpa} ${p.lpaUnit}; reported-unit threshold met.`);if(p.ascvd&&above&&canIntensify&&p.pcsk9===false)add('lpa-add','Discuss a PCSK9 monoclonal antibody with cardiovascular outcome benefit for ASCVD with elevated Lp(a) and unmet lipid goals; this is not a specific Lp(a) outcome-treatment claim.')}
  add('apob','ApoB measurement can clarify residual atherogenic particle risk, especially with diabetes, ASCVD or elevated triglycerides. No automatic apoB goal is assigned.')
  add('monitor','Review lipid response 4–12 weeks after therapy starts or changes and every 6–12 months thereafter, individualized to clinical circumstances.')
  if(r.status==='review-required') {
    r.goals=[];r.riskCategory=undefined
    r.considerations=r.considerations.filter(c=>['special','hefh-review','diabetes-age','ckd-review','hiv-review','cac-age','severe-alternate','fcs-review','muscle','muscle-discussion','tg-unconfirmed','tg-priority','monitor','lpa-test','apob'].includes(c.id))
  }
  r.missing=[...new Set(r.missing)]
  return r
}
