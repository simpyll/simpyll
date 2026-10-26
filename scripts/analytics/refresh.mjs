import {validateSnapshot,validDate,dateShift,metrics,normalizeGsc,normalizeGa4,mergeDays,requestJson} from './core.mjs'
export async function refresh(previous,env,{today=new Date().toISOString().slice(0,10),request=requestJson}={}) {
const snapshot=structuredClone(previous),token=env.GOOGLE_ACCESS_TOKEN
const end=dateShift(today,-4),start=dateShift(end,-364)
validDate(start);validDate(end)
for(const name of ['searchConsole','ga4']) {
  const configured=name==='ga4'?env.GA4_PROPERTY_ID:env.GSC_SITE_URL
  if(!configured) continue
  try {
    if(!token) throw Error('Missing authentication')
    let days,timezone
    if(name==='searchConsole') {
      if(!['sc-domain:simpyll.com','https://simpyll.com/','https://www.simpyll.com/'].includes(configured)) throw Error('Review property identifier for this site')
      const response=await request(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(configured)}/searchAnalytics/query`,token,{startDate:start,endDate:end,dimensions:['date'],dataState:'final',rowLimit:1000})
      days=normalizeGsc(response,start,end);timezone='America/Los_Angeles'
    } else {
      if(!/^\d+$/.test(configured)) throw Error('Invalid numeric property ID')
      const response=await request(`https://analyticsdata.googleapis.com/v1beta/properties/${configured}:runReport`,token,{dateRanges:[{startDate:start,endDate:end}],dimensions:[{name:'date'}],metrics:metrics.map(name=>({name})),limit:1000,returnPropertyQuota:true})
      ;({days,timezone}=normalizeGa4(response,start,end))
      if(previous.ga4.timezone&&timezone!==previous.ga4.timezone) throw Error('Property timezone changed; review history')
    }
    snapshot[name]={status:'ok',updated:today,timezone,days:mergeDays(previous[name].days,days,start,end)}
    console.log(`${name}: validated ${days.length} daily rows`)
  } catch {
    // Never print raw API errors, URLs, request headers or credential objects.
    snapshot[name].status='error';console.warn(`${name}: refresh failed; previous valid history retained. Check API access and configuration.`)
  }
}
validateSnapshot(snapshot)
return snapshot
}
