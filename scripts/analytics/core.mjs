/** Only this projection may cross the reporting/public boundary. No raw API objects. */
export const metrics = ['activeUsers','sessions','screenPageViews','engagedSessions','userEngagementDuration']
const dayMs = 86400000
export const dateShift = (date, days) => new Date(Date.parse(date+'T00:00:00Z')+days*dayMs).toISOString().slice(0,10)
export function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) throw Error('Invalid reporting date')
  return date
}
function numeric(n, integer=false) { const v=Number(n); if (n===null || n==='' || !Number.isFinite(v) || v<0 || (integer&&!Number.isSafeInteger(v))) throw Error('Invalid aggregate'); return v }
export function normalizeGsc(body, start, end) {
  if (!body || typeof body!=='object' || (body.rows!==undefined&&!Array.isArray(body.rows))) throw Error('Invalid GSC response')
  return unique((body.rows??[]).map(r=>{
    if (!Array.isArray(r.keys)||r.keys.length!==1) throw Error('Unexpected GSC dimensions')
    const date=validDate(r.keys[0]),clicks=numeric(r.clicks,true),impressions=numeric(r.impressions,true),position=numeric(r.position)
    if(clicks>impressions || (impressions>0&&position<1)) throw Error('Invalid GSC aggregate')
    return {date,clicks,impressions,position}
  }),start,end)
}
export function normalizeGa4(body,start,end) {
  if(!body || !Array.isArray(body.dimensionHeaders) || body.dimensionHeaders.map(x=>x.name).join()!=='date' || !Array.isArray(body.metricHeaders) || body.metricHeaders.map(x=>x.name).join()!==metrics.join() || (body.rows!==undefined&&!Array.isArray(body.rows))) throw Error('Unexpected GA4 report schema')
  if(body.rowCount>(body.rows??[]).length) throw Error('Truncated report')
  // Publishing thresholded/sampled reports would silently misrepresent completeness.
  if(body.metadata?.subjectToThresholding || body.metadata?.samplingMetadatas?.length || body.metadata?.dataLossFromOtherRow) throw Error('Limited report')
  const timezone=body.metadata?.timeZone
  if(typeof timezone!=='string'||timezone.length>100) throw Error('Missing property timezone')
  try { new Intl.DateTimeFormat('en',{timeZone:timezone}) } catch { throw Error('Invalid property timezone') }
  return {timezone,days:unique((body.rows??[]).map(r=>{
    const raw=r.dimensionValues?.[0]?.value
    if(!/^\d{8}$/.test(raw)||r.metricValues?.length!==5) throw Error('Invalid GA4 row')
    const date=validDate(raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6)),v=r.metricValues.map((m,i)=>numeric(m.value,i<4))
    if(v[3]>v[1]) throw Error('Invalid engagement')
    return {date,activeUsers:v[0],sessions:v[1],views:v[2],engagedSessions:v[3],engagementSeconds:v[4]}
  }),start,end)}
}
function unique(rows,start,end) {
  const seen=new Set()
  for(const row of rows) { if(row.date<start||row.date>end||seen.has(row.date)) throw Error('Duplicate or out-of-range reporting date'); seen.add(row.date) }
  return rows.sort((a,b)=>a.date.localeCompare(b.date))
}
export function mergeDays(old, fresh, start, end) {
  // Replace the whole successfully refreshed window, including disappeared rows. Missing is never zero.
  const cutoff=dateShift(end,-729)
  return [...old.filter(r=>r.date<start&&r.date>=cutoff),...fresh].sort((a,b)=>a.date.localeCompare(b.date))
}
export async function requestJson(url,token,body,{fetcher=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),attempts=4}={}) {
  for(let i=0;i<attempts;i++) {
    let response
    try { response=await fetcher(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)}) }
    catch { if(i===attempts-1) throw Error('Reporting request timed out or failed'); await wait(500*2**i); continue }
    if(response.ok) return response.json()
    if(![429,500,502,503,504].includes(response.status)||i===attempts-1) throw Error(`Reporting HTTP ${response.status}`)
    const retry=Number(response.headers?.get('retry-after'))
    await wait(Math.min(30000,Math.max(500*2**i,Number.isFinite(retry)?retry*1000:0)))
  }
}
export const emptySnapshot=()=>({schemaVersion:1,searchConsole:{status:'unavailable',updated:null,timezone:'America/Los_Angeles',days:[]},ga4:{status:'unavailable',updated:null,timezone:null,days:[]}})
function exact(o,keys) { if(!o || typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join()!==keys.sort().join()) throw Error('Unapproved public fields') }
export function validateSnapshot(s) {
  exact(s,['schemaVersion','searchConsole','ga4']); if(s.schemaVersion!==1) throw Error('Unsupported analytics schema')
  for(const name of ['searchConsole','ga4']) {
    const source=s[name];exact(source,['status','updated','timezone','days'])
    if(!['unavailable','ok','error'].includes(source.status)) throw Error('Invalid source state')
    if(source.updated!==null) validDate(source.updated)
    if(source.timezone!==null) { if(typeof source.timezone!=='string') throw Error('Invalid timezone'); new Intl.DateTimeFormat('en',{timeZone:source.timezone}) }
    if(!Array.isArray(source.days)||source.days.length>730) throw Error('Invalid retention')
    let previous=''
    for(const row of source.days) {
      exact(row,name==='ga4'?['date','activeUsers','sessions','views','engagedSessions','engagementSeconds']:['date','clicks','impressions','position'])
      validDate(row.date); if(row.date<=previous || !source.updated || row.date>source.updated) throw Error('Invalid date order');previous=row.date
      for(const [key,value] of Object.entries(row)) if(key!=='date') { if(typeof value!=='number') throw Error('Invalid metric type'); numeric(value,!['position','engagementSeconds'].includes(key)) }
      if(name==='ga4'&&row.engagedSessions>row.sessions || name==='searchConsole'&&(row.clicks>row.impressions || row.impressions>0&&row.position<1)) throw Error('Inconsistent metrics')
    }
  }
  return s
}
export function serialize(s) { validateSnapshot(s);return JSON.stringify(s,null,2)+'\n' }
