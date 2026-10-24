import {db} from './db';
import {getProfile,getProgram} from './settings';
import {buildBrief} from './context';
import {wUnit,sUnit} from './units';
import {infoFor} from './exerciseInfo';

type SetRow={exercise_id:string;set_no:number;weight:number|null;reps:number|null;pain:number|null;notes:string|null};
const v=(x:unknown)=>x==null||x===''?'-':String(x);
const parts=(day:string)=>day.split('-').map(Number);
const dayName=(day:string)=>{const [y,m,d]=parts(day);return ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(y,m-1,d).getDay()]};
const sessionFor=(day:string)=>{const prog=getProgram();const [y,m,d]=parts(day);const sid=prog.week[(new Date(y,m-1,d).getDay()+6)%7]?.session;return prog.sessions[sid]||{id:'none',title:'UNSCHEDULED',subtitle:'No session',description:'',exercises:[]}};

function sessionBlock(day:string,wu:string){
  const plan=sessionFor(day);
  const sets=db().prepare('SELECT exercise_id,set_no,weight,reps,pain,notes FROM set_log WHERE day=? ORDER BY exercise_id,set_no').all(day) as SetRow[];
  const ex=db().prepare('SELECT exercise_id,done,weight,reps,notes FROM exercise_log WHERE day=?').all(day) as any[];
  const sess=db().prepare('SELECT general_note,confirmed_at FROM session_log WHERE day=?').get(day) as any;
  let out=`### ${day} (${dayName(day)}) - ${plan.title} - ${plan.subtitle}\n`;
  out+=`Status: ${sess?.confirmed_at?'CONFIRMED '+sess.confirmed_at:'not confirmed'}\n`;
  if(!plan.exercises.length)out+='Rest/recovery day (no strength exercises planned).\n';
  for(const e of plan.exercises){
    const row=ex.find(x=>x.exercise_id===e.id);const mine=sets.filter(s=>s.exercise_id===e.id);
    const info=infoFor(e);
    out+=`- ${e.name} [plan ${e.sets}x${e.reps}] - ${row?.done?'DONE':'not checked'}${info?.works.length?` (works: ${info.works.join(', ')})`:''}\n`;
    if(e.caution)out+=`  (program caution: ${e.caution})\n`;
    for(const s of mine)out+=`  - set ${s.set_no}: ${v(s.weight)} ${wu} x ${v(s.reps)} reps, pain ${v(s.pain)}/10${s.notes?`, note: ${s.notes}`:''}\n`;
    if(!mine.length&&row&&(row.weight!=null||row.reps||row.notes))out+=`  - (legacy log) ${v(row.weight)} ${wu}, reps ${v(row.reps)}${row.notes?`, note: ${row.notes}`:''}\n`;
    else if(!mine.length)out+='  - no set data recorded\n';
  }
  const planned=new Set(plan.exercises.map(e=>e.id));
  const orphanIds=[...new Set([...sets.map(s=>s.exercise_id),...ex.filter(x=>x.done||x.weight!=null||x.reps||x.notes).map(x=>x.exercise_id)])].filter(id=>!planned.has(id));
  for(const id of orphanIds){
    out+=`- ${id} [not in the current program; logged on this date] \n`;
    for(const s of sets.filter(x=>x.exercise_id===id))out+=`  - set ${s.set_no}: ${v(s.weight)} ${wu} x ${v(s.reps)} reps, pain ${v(s.pain)}/10${s.notes?`, note: ${s.notes}`:''}\n`;
    const row=ex.find(x=>x.exercise_id===id);if(row&&(row.weight!=null||row.reps||row.notes))out+=`  - (legacy log) ${v(row.weight)} ${wu}, reps ${v(row.reps)}${row.notes?`, note: ${row.notes}`:''}\n`;
  }
  out+=`General note: ${sess?.general_note||'(none)'}\n`;
  const notes=db().prepare('SELECT author,body,created_at FROM trainer_notes WHERE day=? ORDER BY id').all(day) as any[];
  for(const n of notes)out+=`Previous trainer feedback (${n.author}, ${n.created_at}):\n${n.body.split('\n').map((l:string)=>'  > '+l).join('\n')}\n`;
  return out;
}

export function buildReport(day:string){
  const metrics=db().prepare('SELECT day,calories,protein,walk_minutes,weight,waist,notes FROM daily_log ORDER BY day DESC LIMIT 21').all() as any[];
  const hist=db().prepare(`SELECT day FROM (SELECT day FROM set_log UNION SELECT day FROM exercise_log WHERE done=1 UNION SELECT day FROM session_log) WHERE day<? ORDER BY day DESC LIMIT 8`).all(day) as {day:string}[];
  const prof=getProfile();const wu=wUnit(prof.units).toLowerCase(),su=sUnit(prof.units).toLowerCase();
  let out=buildBrief(prof,getProgram())+"\n## TODAY'S SESSION\n"+sessionBlock(day,wu);
  const m=metrics.find(x=>x.day===day);
  out+=`\nDaily intel for ${day}: ${m?`weight ${v(m.weight)} ${wu}, waist ${v(m.waist)} ${su}, ${v(m.calories)} kcal, ${v(m.protein)} g protein, walk ${v(m.walk_minutes)} min. Notes: ${m.notes||'(none)'}`:'(none logged)'}\n`;
  out+=`\n## METRIC TREND (newest first; start weight ${v(prof.startWeight)} ${wu}, goal ${v(prof.goalWeight)} ${wu})\n| date | weight | waist | kcal | protein | walk | notes |\n|---|---|---|---|---|---|---|\n`;
  for(const r of metrics)out+=`| ${r.day} | ${v(r.weight)} | ${v(r.waist)} | ${v(r.calories)} | ${v(r.protein)} | ${v(r.walk_minutes)} | ${(r.notes||'').replace(/\|/g,'/').replace(/\n/g,' ')} |\n`;
  if(!metrics.length)out+='| (no metrics logged yet) | | | | | | |\n';
  out+='\n## PRIOR SESSIONS (most recent first, for progression and pain trend)\n';
  out+=hist.length?hist.map(h=>sessionBlock(h.day,wu)).join('\n'):'(no prior sessions - this is the first logged workout)\n';
  return out;
}
