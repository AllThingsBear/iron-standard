import {db} from './db';
import {Profile,defaultProfile} from './units';
import {Program,starterProgram,emptyProgram} from './program';

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
