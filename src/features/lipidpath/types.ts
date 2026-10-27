export type Answer = boolean | undefined
export interface Profile {
  age?: number
  sex?: 'female' | 'male'
  reproductive?: 'none' | 'pregnant' | 'planning' | 'lactating'
  ascvd?: boolean
  majorEvents?: number
  highRiskConditions?: number
  diabetes?: boolean
  multipleDiabetesRisks?: boolean
  fh?: 'none' | 'hefh' | 'hofh' | 'unknown'
  severeHistory?: boolean
  additionalRisks?: boolean
  ckd?: boolean
  egfr?: number
  dialysis?: boolean
  hiv?: boolean
  stableArt?: boolean
  complexCare?: boolean
  safetyReviewed?: boolean
  smoking?: boolean
  strongFamilyHistory?: boolean
  riskEnhancers?: string[]
  total?: number
  hdl?: number
  ldl?: number
  baselineLdl?: number
  lipidTreatment?: 'none' | 'current' | 'unknown'
  medicationNow?: 'yes' | 'no' | 'unknown'
  tg?: number
  fasting?: boolean
  persistentTg?: boolean
  dietTrial?: boolean
  fcs?: boolean
  apob?: number
  lpa?: number
  lpaUnit?: 'mg/dL' | 'nmol/L'
  cac?: number
  cacPercentile?: number
  incidentalCac?: 'none' | 'mild' | 'moderate-severe'
  avoidTherapy?: boolean
  risk10?: number
  risk30?: number
  riskConfirmed?: boolean
  statin?: 'none' | 'low' | 'moderate' | 'high'
  maxTolerated?: boolean
  adherent?: boolean
  ezetimibe?: boolean
  pcsk9?: boolean
  bempedoic?: boolean
  inclisiran?: boolean
  muscleSymptoms?: boolean
  severeMuscleSymptoms?: boolean
}
export interface Evidence {
  id: string; section: string; recommendation: string; page: string; figure?: string
  cor?: string; loe?: string; summary: string; eligibility: string; exceptions: string
  status: 'source-mapped' | 'blocked'; sourceUrl: string
}
export interface Consideration { id: string; text: string; evidence: string[] }
export interface Goal { ldl: number; nonHdl: number; reduction?: number; evidence: string[]; context: string }
export interface Trace { id: string; label: string; facts: string; evidence: string[] }
export interface Finding {
  code: 'ldl-markedly-elevated' | 'ldl-entered' | 'tg-elevated' | 'ascvd-reported' | 'diabetes-reported'
  evidence: string[]
}
export interface PathwayObservation {
  code: 'ascvd' | 'severe-ldl' | 'possible-severe-ldl' | 'diabetes' | 'triglycerides'
  certainty: 'established-finding' | 'possible'
  evidence: string[]
  treatmentDiscussion?: boolean
}
export interface Result {
  version: string; status: 'incomplete' | 'review-required' | 'educational'
  pathways: string[]; riskCategory?: 'Low' | 'Borderline' | 'Intermediate' | 'High'
  goals: Goal[]; considerations: Consideration[]; safety: string[]; missing: string[]; errors: string[]
  trace: Trace[]; nonHdl?: number; reduction?: number
  findings: Finding[]
  observations: PathwayObservation[]
}
