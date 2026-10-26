import {useState,useSyncExternalStore} from 'react'
import snapshot from '../../public/google-analytics.json'
import {shift,searchTotal,trafficTotal,change,type Source,type SearchDay,type TrafficDay} from './summary'
function Series<T extends {date:string}>({source,metrics,period,title}:{source:Source<T>;metrics:{label:string;value:(row:T)=>number|null}[];period:number;title:string}) {
  const end=source.updated?shift(source.updated,-4):null
  const start=end?shift(end,1-period):null
  const rows=source.days.filter(r=>start&&end&&r.date>=start&&r.date<=end)
  const today=useSyncExternalStore(subscribeClock,readToday,()=> '')
  const stale=source.updated && today && Date.parse(today)-Date.parse(source.updated)>7*86400000
  return <section aria-label={title}><h3>{title}</h3><p className="pulse-muted">{source.status==='unavailable'?'Not connected. No measurements available.':source.status==='error'?'Latest refresh failed. Any previous valid measurements are retained.':!rows.length?'Connected; no reported rows in this period.':'Validated Google reporting data.'} {source.updated&&<>Last successful refresh: {source.updated}. </>}{stale&&'Stale data: more than seven days since refresh.'} Timezone: {source.timezone??'unavailable'}. Recent four days excluded for reporting delay.</p>
    {metrics.map(metric=>{
      const values=rows.flatMap(r=>{const n=metric.value(r);return n===null?[]:[n]}),max=Math.max(1,...values)
      return <article key={metric.label}><h4>{metric.label}</h4>{rows.length>0&&<svg className="pulse-growth" viewBox="0 0 800 200" role="img" aria-label={`${metric.label}, ${start} to ${end}. See daily data table. Vertical axis zero to ${max.toFixed(2)}.`}><text x="5" y="16">{max.toFixed(2)}</text><text x="5" y="165">0</text><line x1="65" y1="165" x2="760" y2="165" className="pulse-orbit" />{rows.map(r=>{const value=metric.value(r);return value===null?null:<circle key={r.date} cx={65+(Date.parse(r.date)-Date.parse(start!))/86400000/Math.max(1,period-1)*695} cy={165-value/max*140} r="3"><title>{`${r.date}: ${value.toFixed(2)}`}</title></circle>})}<text x="65" y="190">{start}</text><text x="760" y="190" textAnchor="end">{end}</text></svg>}</article>
    })}
    <details><summary>View {title.toLowerCase()} daily data</summary><div className="pulse-table-wrap"><table><caption>{title} · missing dates are unreported, never assumed zero</caption><thead><tr><th scope="col">Date</th>{metrics.map(m=><th scope="col" key={m.label}>{m.label}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.date}><th scope="row">{r.date}</th>{metrics.map(m=><td key={m.label}>{m.value(r)?.toLocaleString('en-US',{maximumFractionDigits:2})??'Unavailable'}</td>)}</tr>)}</tbody></table></div></details>
    <Comparison source={source} end={end} period={period} title={title}/>
  </section>
}
function Comparison<T extends {date:string}>({source,end,period,title}:{source:Source<T>;end:string|null;period:number;title:string}) {
  if(!end)return null
  const start=shift(end,1-period),previousStart=shift(start,-period)
  const current=source.days.filter(r=>r.date>=start&&r.date<=end),previous=source.days.filter(r=>r.date>=previousStart&&r.date<start)
  if(current.length!==period||previous.length!==period)return <p className="pulse-muted">Period comparison unavailable: both periods need every reported date.</p>
  const a=title==='Google Search performance'?searchTotal(current as unknown as SearchDay[]):trafficTotal(current as unknown as TrafficDay[])
  const b=title==='Google Search performance'?searchTotal(previous as unknown as SearchDay[]):trafficTotal(previous as unknown as TrafficDay[])
  return <div className="pulse-table-wrap"><table><caption>{start}–{end} versus {previousStart}–{shift(start,-1)}. Rates expressed as fractions; lower search position is better.</caption><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th><th>Change %</th></tr></thead><tbody>{Object.entries(a).map(([key,value])=>{const old=b[key as keyof typeof b] as number|null;const delta=value!==null&&old!==null?change(value,old):null;return <tr key={key}><th scope="row">{key}</th><td>{value?.toFixed(2)??'—'}</td><td>{old?.toFixed(2)??'—'}</td><td>{delta?.absolute.toFixed(2)??'—'}</td><td>{delta?.percent===null||!delta?'—':(delta.percent*100).toFixed(1)+'%'}</td></tr>})}</tbody></table></div>
}
export function GoogleMetrics({data=snapshot}:{data?:{schemaVersion:number;searchConsole:Source<SearchDay>;ga4:Source<TrafficDay>}}) {
  const [period,setPeriod]=useState(28)
  return <section id="pulse-google" aria-labelledby="pulse-google-title"><div className="pulse-section-heading"><h2 id="pulse-google-title">Search & audience</h2><label>Analytics period<select value={period} onChange={e=>setPeriod(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></label></div>
    <Series source={data.searchConsole} period={period} title="Google Search performance" metrics={[{label:'Search clicks',value:(r:SearchDay)=>r.clicks},{label:'Search impressions',value:(r:SearchDay)=>r.impressions},{label:'CTR (%)',value:(r:SearchDay)=>r.impressions?r.clicks/r.impressions*100:null},{label:'Average search position (lower is better)',value:(r:SearchDay)=>r.impressions?r.position:null}]}/>
    <Series source={data.ga4} period={period} title="Website traffic (GA4)" metrics={[{label:'Daily active users',value:(r:TrafficDay)=>r.activeUsers},{label:'Sessions',value:(r:TrafficDay)=>r.sessions},{label:'Page views',value:(r:TrafficDay)=>r.views},{label:'Engagement rate (%)',value:(r:TrafficDay)=>r.sessions?r.engagedSessions/r.sessions*100:null},{label:'Engagement seconds per session',value:(r:TrafficDay)=>r.sessions?r.engagementSeconds/r.sessions:null}]}/>
    <details><summary>Google metrics methodology</summary><p>A Search Console click leads from Google Search to the site; an impression is an eligible search-result appearance. CTR is clicks divided by impressions. Average position is the impression-weighted topmost site result position; a lower number is generally better. These are search metrics, not total traffic.</p><p>GA4 active users are distinct engaged users within each reported day. Daily users overlap and are never summed as period unique visitors. Sessions are visits; views include repeated page views. Engagement rate is engaged sessions divided by sessions. An engaged session lasts beyond the configured threshold, has a key event, or includes two or more page/screen views. Engagement duration measures foreground engagement; this dashboard divides seconds by sessions.</p><p>Consent, blocked scripts, attribution, timezone and reporting definitions make GSC clicks and GA4 users different. Missing days are unavailable. Period CTR and position are impression-weighted; engagement is session-weighted. Reports exclude recent four days; processing may take longer. The period ends relative to each source’s last successful refresh. Granular top-content metrics are deliberately omitted pending owner privacy review of low-volume disclosure. No raw queries or visitor records are published.</p><a href="/google-analytics.json">Reviewed Google aggregate snapshot</a></details>
  </section>
}

function readToday(){return new Date().toISOString().slice(0,10)}
function subscribeClock(callback:()=>void){const timer=setInterval(callback,60000);return ()=>clearInterval(timer)}
