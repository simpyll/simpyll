/** CDC NHANES conversion factors (reciprocals for mmol/L to mg/dL).
 * https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/P_TRIGLY.htm
 * Lp(a) is deliberately excluded: no universal mass/molar conversion exists.
 */
export function toMgDl(value: number, analyte: 'cholesterol' | 'triglycerides') {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Expected a finite nonnegative concentration')
  return value / (analyte === 'cholesterol' ? 0.02586 : 0.01129)
}
export function nonHdl(total?: number, hdl?: number) { return total !== undefined && hdl !== undefined && total >= hdl ? total - hdl : undefined }
export function ldlReduction(baseline?: number, current?: number) { return baseline !== undefined && baseline > 0 && current !== undefined ? 100 * (baseline-current)/baseline : undefined }
export function riskCategory(risk: number) { return risk < 3 ? 'Low' : risk < 5 ? 'Borderline' : risk < 10 ? 'Intermediate' : 'High' }

export function toMmolL(value: number, analyte: 'cholesterol' | 'triglycerides') { return value * (analyte === 'cholesterol' ? 0.02586 : 0.01129) }
