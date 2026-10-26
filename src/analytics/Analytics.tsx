import {useEffect,useSyncExternalStore} from 'react'
import {useLocation} from 'react-router-dom'
import {getPublicProjects,getCaseStudyPath} from '../projects'
import {posts} from '../lib/blog'
import policies from '../content/policies.json'
import {consentKey,createTracker} from './tracker'
// Owner must review privacy policy and disable Enhanced Measurement before opting in.
const enabled=import.meta.env.PROD && import.meta.env.VITE_GA4_ENABLED==='true'
let tracker: ReturnType<typeof createTracker> | undefined
export function Analytics() {
  const {pathname}=useLocation()
  useEffect(()=>{
    try {
      tracker??=createTracker(window,document,enabled)
      const update=()=>{
        tracker!.consent(localStorage.getItem(consentKey)==='granted')
        const canonical=pathname==='/'?'/':pathname.replace(/\/+$/,'')
        const published=['/','/about','/blog','/projects','/explore','/pulse',...getPublicProjects().map(p=>getCaseStudyPath(p)),...policies.map(p=>'/'+p.slug),...posts.map(p=>'/blog/'+p.slug)].includes(canonical)
        tracker!.page(canonical,published)
      }
      update();window.addEventListener('simpyll-consent',update);window.addEventListener('storage',update)
      return ()=>{window.removeEventListener('simpyll-consent',update);window.removeEventListener('storage',update)}
    } catch { /* Storage can be disabled. */ }
  },[pathname])
  return null
}
export function AnalyticsChoice() {
  const choice=useSyncExternalStore(subscribeConsent,readConsent,()=> 'denied')
  if(!enabled) return <p>Optional Google Analytics tracking is currently disabled.</p>
  function choose(value:string) {
    try {localStorage.setItem(consentKey,value);window.dispatchEvent(new Event('simpyll-consent'))}catch { /* leave denied */ }
  }
  return <div className="my-6"><p>Optional Google Analytics uses cookies to measure visits and engagement. No Google analytics script loads until you allow it. Choice: {choice}.</p><div className="flex flex-wrap gap-4"><button className="min-h-11 underline" onClick={()=>choose('granted')}>Allow analytics</button><button className="min-h-11 underline" onClick={()=>choose('denied')}>Decline or withdraw analytics</button></div></div>
}

function readConsent() {try{return localStorage.getItem(consentKey)??'denied'}catch{return 'denied'}}
function subscribeConsent(callback:()=>void) {window.addEventListener('simpyll-consent',callback);window.addEventListener('storage',callback);return ()=>{window.removeEventListener('simpyll-consent',callback);window.removeEventListener('storage',callback)}}
