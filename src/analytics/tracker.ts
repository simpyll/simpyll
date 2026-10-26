export const measurementId = 'G-KJX5NL6YL1'
export const consentKey = 'simpyll-analytics-consent'
type Host = Window & {dataLayer?: unknown[];gtag?: (...args: unknown[])=>void}
/** Basic consent mode: no Google request before affirmative consent. */
export function createTracker(host: Host, doc: Document, enabled: boolean) {
  let initialized=false, last='', allowed=false
  function consent(value: boolean) {
    allowed=value
    try {
      if(!value) {
        host.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})
        // Immediately stop an already-loaded library; a reload removes all tag listeners.
        Object.assign(host,{[`ga-disable-${measurementId}`]:true});last=''
        for(const cookie of doc.cookie.split(';')) if(/^\s*_ga(?:_|=)/.test(cookie)) {
          const name=cookie.split('=')[0].trim()
          for(const domain of ['', '; domain=simpyll.com','; domain=.simpyll.com']) doc.cookie=`${name}=; Max-Age=0; path=/${domain}`
        }
      }
    } catch { /* blocked storage/scripts cannot break navigation */ }
  }
  function page(path: string, published: boolean) {
    if(!published) {Object.assign(host,{[`ga-disable-${measurementId}`]:true});last='';return}
    if(!enabled||!allowed||host.location.hostname!=='simpyll.com'||host.navigator.webdriver) return
    const canonical=path==='/'?'/':path.replace(/\/+$/,'')
    if(!/^\/(?:[a-z0-9-]+\/?)*$/.test(canonical)||canonical===last) return
    try {
      if(!initialized) {
        host.dataLayer=host.dataLayer??[]
        // Google's command queue requires an Arguments object, not an event array.
        // eslint-disable-next-line prefer-rest-params
        host.gtag=function(){host.dataLayer!.push(arguments)}
        host.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'})
        Object.assign(host,{[`ga-disable-${measurementId}`]:false})
        host.gtag('consent','update',{analytics_storage:'granted'})
        host.gtag('js',new Date())
        host.gtag('config',measurementId,{send_page_view:false,page_location:`https://simpyll.com${canonical}`,page_referrer:'',page_title:canonical,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:7776000})
        if(!doc.getElementById('simpyll-google-tag')) {
          const script=doc.createElement('script');script.id='simpyll-google-tag';script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${measurementId}`;doc.head.append(script)
        }
        initialized=true
      } else {
        Object.assign(host,{[`ga-disable-${measurementId}`]:false})
        host.gtag?.('consent','update',{analytics_storage:'granted'})
      }
      host.gtag?.('set',{page_location:`https://simpyll.com${canonical}`,page_referrer:'',page_title:canonical})
      host.gtag?.('event','page_view',{send_to:measurementId,page_location:`https://simpyll.com${canonical}`,page_referrer:'',page_title:canonical})
      last=canonical
    } catch { /* Analytics is best effort. */ }
  }
  return {consent,page}
}
