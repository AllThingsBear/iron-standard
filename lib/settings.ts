import {db} from './db';
import {Profile,defaultProfile} from './units';
import {Program,Session,starterProgram,emptyProgram} from './program';
import {TRACKS} from './tracking';

function ensure(){db().exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')}
function read<T>(key:string):T|null{ensure();const r=db().prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined;if(!r)return null;try{return JSON.parse(r.value) as T}catch{return null}}
function write(key:string,value:unknown){ensure();db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value))}

const num=(v:unknown,max=5000):number|null=>{if(v===''||v==null)return null;const x=Number(v);return Number.isFinite(x)&&x>=0&&x<=max?x:null};
const txt=(v:unknown,max:number)=>String(v??'').slice(0,max);

export function getProfile():Profile{return {...defaultProfile,...(read<Partial<Profile>>('profile')||{})}}

export function saveProfile(input:Partial<Profile>):Profile{
  const cur=getProfile();
  const next:Profile={
    onboarded:input.onboarded??cur.onboarded,
    units:input.units==='metric'?'metric':input.units==='imperial'?'imperial':cur.units,
    startWeight:'startWeight' in input?num(input.startWeight,1500):cur.startWeight,
    goalWeight:'goalWeight' in input?num(input.goalWeight,1500):cur.goalWeight,
    kcal:'kcal' in input?num(input.kcal,20000):cur.kcal,
    protein:'protein' in input?num(input.protein,2000):cur.protein,
    equipment:Array.isArray(input.equipment)?input.equipment.map(e=>txt(e,40)).filter(Boolean).slice(0,20):cur.equipment,
    limitations:'limitations' in input?txt(input.limitations,2000):cur.limitations,
    preferences:'preferences' in input?txt(input.preferences,2000):cur.preferences
  };
  write('profile',next);return next;
}

export function getProgram():Program{return read<Program>('program')||starterProgram}
export function chooseProgram(kind:'starter'|'empty'){write('program',kind==='empty'?emptyProgram:starterProgram)}

// ---- program editing ----
const slug=(s:unknown)=>String(s??'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);
const DAY_NAMES=['MON','TUE','WED','THU','FRI','SAT','SUN'];

export function sanitizeProgram(input:any):Program{
  if(!input||typeof input!=='object'||typeof input.sessions!=='object'||input.sessions===null||!Array.isArray(input.week))throw new Error('Invalid program');
  const entries=Object.entries(input.sessions as Record<string,any>);
  if(entries.length<1||entries.length>30)throw new Error('Between 1 and 30 sessions are allowed');
  const sessions:Record<string,Session>={};const seen=new Set<string>();
  for(const [key,s] of entries){
    const id=slug(s?.id||key);
    if(!id||sessions[id])throw new Error('Invalid or duplicate session id');
    const exs=Array.isArray(s?.exercises)?s.exercises:[];
    if(exs.length>30)throw new Error('Too many exercises in a session');
    sessions[id]={id,title:txt(s?.title,60).trim()||'UNTITLED SESSION',subtitle:txt(s?.subtitle,80),description:txt(s?.description,600),exercises:exs.map((e:any)=>{
      const eid=slug(e?.id);
      if(!eid||seen.has(eid))throw new Error('Invalid or duplicate exercise id');
      seen.add(eid);
      const sets=Math.round(Number(e?.sets));
      const caution=txt(e?.caution,500).trim();
      return {id:eid,name:txt(e?.name,80).trim()||'Unnamed exercise',sets:Number.isFinite(sets)?Math.min(20,Math.max(1,sets)):1,reps:txt(e?.reps,40),category:txt(e?.category,24).toUpperCase()||'STRENGTH',description:txt(e?.description,800),...(caution?{caution}:{}),...(e?.optional===true?{optional:true}:{}),...((TRACKS as string[]).includes(e?.track)?{track:e.track}:{}),...(Array.isArray(e?.works)&&e.works.length?{works:e.works.map((q:any)=>txt(q,30).trim()).filter(Boolean).slice(0,8)}:{}),...(txt(e?.benefit,300).trim()?{benefit:txt(e?.benefit,300).trim()}:{}),equipment:Array.isArray(e?.equipment)?e.equipment.map((q:any)=>txt(q,40)).filter(Boolean).slice(0,10):[]};
    })};
  }
  const ids=Object.keys(sessions);
  const week=DAY_NAMES.map((day,i)=>{const sid=slug(input.week[i]?.session);return {day,session:sessions[sid]?sid:ids[0]}});
  return {sessions,week};
}
export function saveProgram(input:unknown):Program{const p=sanitizeProgram(input);write('program',p);return p}

// ---- import / restore ----
export function importSettings(profile:unknown,program:unknown){
  if(profile&&typeof profile==='object'){write('profile',defaultProfile);saveProfile(profile as Partial<Profile>)}
  if(program)saveProgram(program);
}
