export interface SearchDay {date:string;clicks:number;impressions:number;position:number}
export interface TrafficDay {date:string;activeUsers:number;sessions:number;views:number;engagedSessions:number;engagementSeconds:number}
export interface Source<T> {status:string;updated:string|null;timezone:string|null;days:T[]}
export const shift=(date:string,n:number)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10)
export function searchTotal(rows: SearchDay[]) {
  const clicks=rows.reduce((s,r)=>s+r.clicks,0),impressions=rows.reduce((s,r)=>s+r.impressions,0)
  return {clicks,impressions,ctr:impressions?clicks/impressions:null,position:impressions?rows.reduce((s,r)=>s+r.position*r.impressions,0)/impressions:null}
}
export function trafficTotal(rows:TrafficDay[]) {
  const sessions=rows.reduce((s,r)=>s+r.sessions,0),views=rows.reduce((s,r)=>s+r.views,0),engaged=rows.reduce((s,r)=>s+r.engagedSessions,0)
  // Daily distinct users overlap. Do not expose a period-user total.
  return {sessions,views,engagementRate:sessions?engaged/sessions:null,engagementPerSession:sessions?rows.reduce((s,r)=>s+r.engagementSeconds,0)/sessions:null}
}
export function change(current:number,previous:number) {return {absolute:current-previous,percent:previous?(current-previous)/previous:null}}
