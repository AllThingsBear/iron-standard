import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

// Guards every /api route. The app has no login, so it must not be drivable by other web pages or hostnames:
//  - Host must be a loopback name (or listed in ALLOWED_HOSTS) -> blocks DNS-rebinding
//  - state-changing requests must be same-origin JSON -> blocks cross-site form/fetch (CSRF)
const LOCAL=/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const deny=(status:number,error:string)=>NextResponse.json({error},{status});

export function middleware(req:NextRequest){
  const host=req.headers.get('host')||'';
  const extra=(process.env.ALLOWED_HOSTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(!LOCAL.test(host)&&!extra.includes(host.toLowerCase())&&!extra.includes(host.replace(/:\d+$/,'').toLowerCase()))return deny(403,'Host not allowed');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    const site=req.headers.get('sec-fetch-site');
    if(site&&site!=='same-origin'&&site!=='none')return deny(403,'Cross-site request blocked');
    const origin=req.headers.get('origin');
    if(origin){try{if(new URL(origin).host!==host)return deny(403,'Cross-origin request blocked')}catch{return deny(403,'Bad origin')}}
    if(!(req.headers.get('content-type')||'').toLowerCase().includes('application/json'))return deny(415,'Content-Type must be application/json');
  }
  return NextResponse.next();
}
export const config={matcher:'/api/:path*'};
