'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,CalendarDays,Check,ChevronLeft,ChevronRight,ClipboardList,Crosshair,Dumbbell,Flag,HeartPulse,NotebookPen,Save,Send,Copy,Plus,ShieldAlert,Database,ZoomIn,Target,TrendingDown,UserCog,X} from 'lucide-react';
import {Exercise,Program} from '../lib/program';
import ProgramEditor from './ProgramEditor';
import DataPanel from './DataPanel';
import {figureFor} from '../lib/figures';
import {infoFor} from '../lib/exerciseInfo';
import {recommend,TrainerRec,Rec} from '../lib/progression';
import {Profile,defaultProfile,EQUIPMENT,wUnit,sUnit} from '../lib/units';

type Entry={day:string;exercise_id:string;done:number;weight:number|null;reps:string;notes:string};
type Daily={day:string;calories:number|null;protein:number|null;walk_minutes:number|null;weight:number|null;waist:number|null;notes:string};
type SetEntry={day:string;exercise_id:string;set_no:number;weight:number|null;reps:number|null;pain:number|null;notes:string|null};
type Sess={day:string;general_note:string|null;confirmed_at:string|null;sent_at:string|null};
type Note={id:number;day:string;author:string;body:string;created_at:string};
type SetDraft={weight:string;reps:string;pain:string;notes:string};
type DraftRow={done:boolean;weight:string;reps:string;notes:string};

const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const todayKey=()=>dateKey(new Date());
const dow=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d).getDay()};
const fmt=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const weekdayLong=(day:string)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-US',{weekday:'long'})};

const STAR='M0,-3.2 L0.94,-1.29 L3.04,-0.99 L1.52,0.49 L1.88,2.59 L0,1.6 L-1.88,2.59 L-1.52,0.49 L-3.04,-0.99 L-0.94,-1.29Z';
const STARS=Array.from({length:9},(_,r)=>Array.from({length:r%2?5:6},(_,c)=>({x:(r%2?2+2*c:1+2*c)*76/12,y:(1+r)*(700/13)/10})).map(s=>s)).flat();
function FlagArt(){
 return <div className="flag-art" aria-hidden="true">
  <svg viewBox="0 0 190 100" preserveAspectRatio="xMidYMid meet">
   {Array.from({length:13},(_,i)=><rect key={i} x="0" y={i*100/13} width="190" height={100/13+0.05} className={i%2===0?'flag-tan':'flag-black'}/>)}
   <rect x="0" y="0" width="76" height={700/13} className="flag-canton"/>
   {STARS.map((s,i)=><path key={i} d={STAR} transform={`translate(${s.x} ${s.y})`} className="flag-star"/>)}
  </svg>
 </div>;
}

function Corners(){return <span className="corners" aria-hidden="true"/>}

function Ring({value,max,size=84}:{value:number;max:number;size?:number}){
 const r=(size/2)-6, c=2*Math.PI*r, p=max?value/max:1, full=max>0&&value>=max;
 return <div className={'ring '+(full?'is-full':'')} style={{width:size,height:size}} role="img" aria-label={`${value} of ${max} exercises complete`}>
  <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
   <circle className="ring-track" cx={size/2} cy={size/2} r={r}/>
   <circle className="ring-fill" cx={size/2} cy={size/2} r={r} strokeDasharray={c} strokeDashoffset={c*(1-p)} transform={`rotate(-90 ${size/2} ${size/2})`}/>
  </svg>
  <div className="ring-label">{full?<Check size={26} strokeWidth={3}/>:<><strong>{value}</strong><small>/{max}</small></>}</div>
 </div>;
}

function ProfileForm({initial,onboarding,onSave,onSkip}:{initial:Profile;onboarding:boolean;onSave:(p:Profile,program?:'starter'|'empty')=>Promise<void>;onSkip?:()=>void}){
 const [p,setP]=useState<Profile>(initial);
 const [f,setF]=useState({sw:String(initial.startWeight??''),gw:String(initial.goalWeight??''),kcal:String(initial.kcal??''),protein:String(initial.protein??'')});
 const [choice,setChoice]=useState<'starter'|'empty'>('starter');
 const [busy,setBusy]=useState(false);
 const n=(v:string)=>v.trim()===''?null:Number(v);
 const toggle=(id:string)=>setP(o=>({...o,equipment:o.equipment.includes(id)?o.equipment.filter(x=>x!==id):[...o.equipment,id]}));
 const w=wUnit(p.units);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{await onSave({...p,startWeight:n(f.sw),goalWeight:n(f.gw),kcal:n(f.kcal),protein:n(f.protein)},onboarding?choice:undefined)}finally{setBusy(false)}}
 return <form className="profile-form" onSubmit={submit}>
  <div className="field-grid">
   <div className="full"><span className="lbl">UNITS</span>
    <div className="seg" role="radiogroup" aria-label="Units">
     {(['imperial','metric'] as const).map(u=><button type="button" key={u} role="radio" aria-checked={p.units===u} className={p.units===u?'on':''} onClick={()=>setP(o=>({...o,units:u}))}>{u==='imperial'?'IMPERIAL (LB / IN)':'METRIC (KG / CM)'}</button>)}
    </div>
   </div>
   <label>STARTING WEIGHT <i className="opt">OPTIONAL</i><span className="unit-wrap"><input type="number" min="0" step="0.1" value={f.sw} onChange={e=>setF(o=>({...o,sw:e.target.value}))}/><span className="unit">{w}</span></span></label>
   <label>GOAL WEIGHT <i className="opt">OPTIONAL</i><span className="unit-wrap"><input type="number" min="0" step="0.1" value={f.gw} onChange={e=>setF(o=>({...o,gw:e.target.value}))}/><span className="unit">{w}</span></span></label>
   <label>DAILY CALORIE TARGET <i className="opt">OPTIONAL</i><span className="unit-wrap"><input type="number" min="0" value={f.kcal} onChange={e=>setF(o=>({...o,kcal:e.target.value}))}/><span className="unit">KCAL</span></span></label>
   <label>DAILY PROTEIN TARGET <i className="opt">OPTIONAL</i><span className="unit-wrap"><input type="number" min="0" value={f.protein} onChange={e=>setF(o=>({...o,protein:e.target.value}))}/><span className="unit">G</span></span></label>
   <fieldset className="full equip"><legend>EQUIPMENT YOU HAVE</legend>
    {EQUIPMENT.map(q=><label key={q.id} className={'eq '+(p.equipment.includes(q.id)?'on':'')}><input type="checkbox" checked={p.equipment.includes(q.id)} onChange={()=>toggle(q.id)}/>{q.label}</label>)}
   </fieldset>
   <label className="full">PHYSICAL LIMITATIONS OR INJURIES <i className="opt">OPTIONAL · STAYS ON THIS COMPUTER</i><textarea rows={3} placeholder="e.g. bad left knee, lower-back history, shoulder impingement…" value={p.limitations} onChange={e=>setP(o=>({...o,limitations:e.target.value}))}/></label>
   <label className="full">GOALS, PREFERENCES, NOTES <i className="opt">OPTIONAL</i><textarea rows={3} placeholder="e.g. build muscle, 3 days a week, no jumping…" value={p.preferences} onChange={e=>setP(o=>({...o,preferences:e.target.value}))}/></label>
   {onboarding&&<div className="full"><span className="lbl">STARTING PROGRAM</span>
    <div className="seg" role="radiogroup" aria-label="Starting program">
     <button type="button" role="radio" aria-checked={choice==='starter'} className={choice==='starter'?'on':''} onClick={()=>setChoice('starter')}>STARTER (3 FULL-BODY DAYS + WALKS)</button>
     <button type="button" role="radio" aria-checked={choice==='empty'} className={choice==='empty'?'on':''} onClick={()=>setChoice('empty')}>EMPTY PROGRAM</button>
    </div></div>}
  </div>
  <p className="disclaimer">IRON STANDARD is a free, independent, open-source training journal. It is not medical advice and is not affiliated with any military or government organization. Check with a clinician before starting or changing an exercise program, and stop for sharp pain, numbness, tingling or weakness. Everything you enter stays on this computer.</p>
  <div className="profile-actions">
   <button className="save" type="submit" disabled={busy}><Save size={14}/> {onboarding?'START TRAINING':'SAVE PROFILE'}</button>
   {onboarding&&onSkip&&<button type="button" className="ghost" disabled={busy} onClick={onSkip}>SKIP SETUP</button>}
  </div>
 </form>;
}

export default function Page(){
 const [date,setDate]=useState('');
 const [entries,setEntries]=useState<Entry[]>([]);
 const [days,setDays]=useState<Daily[]>([]);
 const [profile,setProfile]=useState<Profile>(defaultProfile);
 const [prog,setProg]=useState<Program|null>(null);
 const [zoom,setZoom]=useState<{src:string;name:string}|null>(null);
 const [sets,setSets]=useState<SetEntry[]>([]);
 const [recs,setRecs]=useState<TrainerRec[]>([]);
 const [sessions,setSessions]=useState<Sess[]>([]);
 const [notes,setNotes]=useState<Note[]>([]);
 const [noteText,setNoteText]=useState('');
 const [noteAuthor,setNoteAuthor]=useState('AI trainer (pasted)');
 const [setsDraft,setSetsDraft]=useState<Record<string,SetDraft[]>>({});
 const [sessNote,setSessNote]=useState('');
 const [report,setReport]=useState<{text:string;file:string}|null>(null);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [draft,setDraft]=useState<Record<string,DraftRow>>({});
 const [daily,setDaily]=useState({calories:'',protein:'',walk_minutes:'',weight:'',waist:'',notes:''});
 const [saving,setSaving]=useState(false);
 const [tab,setTab]=useState<'mission'|'history'|'profile'|'program'|'data'>('mission');

 const load=async()=>{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw new Error('Load failed');const data=await r.json();setEntries(data.exercises);setDays(data.days);setSets(data.sets||[]);setSessions(data.sessions||[]);setNotes(data.notes||[]);setRecs(data.recommendations||[]);setProfile(data.profile);setProg(data.program);};
 useEffect(()=>{const q=new URLSearchParams(window.location.search).get('date');setDate(q&&/^\d{4}-\d{2}-\d{2}$/.test(q)?q:todayKey());load().catch(()=>setMessage('Database unavailable. Check Docker logs.')).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(!zoom)return;const onKey=(ev:KeyboardEvent)=>{if(ev.key==='Escape')setZoom(null)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[zoom]);
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(''),4000);return()=>clearTimeout(t)},[message]);

 const week=prog?.week??[]; const program=prog?.sessions??{};
 const dayIndex=(dow(date)+6)%7;
 const session=week[dayIndex]||week[0]||{day:'MON',session:'rest'}; const plan=program[session.session]||{id:'none',title:'NO SESSION',subtitle:'',description:'',exercises:[]};
 const logs=useMemo(()=>entries.filter(e=>e.day===date),[entries,date]);
 const session_=sessions.find(x=>x.day===date);
 const confirmed=!!session_?.confirmed_at;
 const dayNotes=notes.filter(n=>n.day===date);
 useEffect(()=>{setSessNote(sessions.find(x=>x.day===date)?.general_note??'')},[date,sessions]);
 const existingDay=days.find(d=>d.day===date);
 useEffect(()=>{const d=days.find(row=>row.day===date);setDaily({calories:String(d?.calories??''),protein:String(d?.protein??''),walk_minutes:String(d?.walk_minutes??''),weight:String(d?.weight??''),waist:String(d?.waist??''),notes:d?.notes??''});setDraft({});setSetsDraft({});setExpanded({});},[date,days]);
 useEffect(()=>{setReport(null)},[date]);

 const completed=plan?.exercises.filter(e=>{const val=draft[e.id]?.done;return val??Boolean(logs.find(x=>x.exercise_id===e.id)?.done)}).length??0;
 const total=plan?.exercises.length??0;
 const missionDone=total>0&&completed===total;
 const changeDate=(offset:number)=>{const [y,m,d]=date.split('-').map(Number);const dt=new Date(y,m-1,d);dt.setDate(dt.getDate()+offset);setDate(dateKey(dt));};
 const latestWeight=days.filter(d=>d.weight!==null).sort((a,b)=>b.day.localeCompare(a.day))[0]?.weight;
 const START=profile.startWeight, GOAL=profile.goalWeight, wu=wUnit(profile.units), su=sUnit(profile.units);
 const hasGoal=START!=null&&GOAL!=null&&START!==GOAL;
 const pct=hasGoal&&latestWeight!=null?Math.min(100,Math.max(0,((latestWeight-START!)/(GOAL!-START!))*100)):0;
 const delta=latestWeight!=null&&START!=null?latestWeight-START:0;
 const fmtN=(x:number)=>x.toFixed(1).replace(/\.0$/,'');
 const streak=useMemo(()=>{const distinct=[...new Set(entries.filter(x=>x.done).map(x=>x.day))].sort((a,b)=>b.localeCompare(a));return distinct.length},[entries]);
 const doneDays=useMemo(()=>new Set(entries.filter(x=>x.done).map(x=>x.day)),[entries]);

 function setRows(e:Exercise):SetDraft[]{
  if(setsDraft[e.id])return setsDraft[e.id];
  const mine=sets.filter(x=>x.day===date&&x.exercise_id===e.id).sort((a,b)=>a.set_no-b.set_no).map(x=>({weight:String(x.weight??''),reps:String(x.reps??''),pain:String(x.pain??''),notes:x.notes??''}));
  while(mine.length<e.sets)mine.push({weight:'',reps:'',pain:'0',notes:''});
  return mine;
 }
 const recFor=(e:Exercise):Rec=>recommend(e,sets,recs.find(r=>r.exercise_id===e.id),profile.units,date);
 function applyRec(e:Exercise,rec:Rec){if(rec.weight==null)return;const w=String(rec.weight);const rows=setRows(e).map(r=>r.weight===''?{...r,weight:w}:r);setSetsDraft(o=>({...o,[e.id]:rows}))}
 function editSet(e:Exercise,i:number,field:keyof SetDraft,value:string){const rows=setRows(e).map((r,j)=>j===i?{...r,[field]:value}:r);setSetsDraft(o=>({...o,[e.id]:rows}))}
 function addSet(e:Exercise){const rows=setRows(e);const last=rows[rows.length-1];setSetsDraft(o=>({...o,[e.id]:[...rows,{weight:last?.weight??'',reps:'',pain:'0',notes:''}]}))}
 async function saveSets(e:Exercise){
  const rows=setRows(e).filter(r=>r.weight||r.reps||r.notes||(r.pain!==''&&r.pain!=='0'));
  try{setSaving(true);const r=await fetch('/api/sets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date,exercise_id:e.id,sets:rows})});if(!r.ok)throw new Error();
   if(rows.length&&!effective(e).done){await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date,exercise_id:e.id,...effective(e),done:true})})}
   await load();setMessage('SETS SAVED')}catch{setMessage('SAVE FAILED — CHECK VALUES (PAIN 0–10)')}finally{setSaving(false)}
 }
 async function saveSession(confirm:boolean){
  try{setSaving(true);const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date,general_note:sessNote,confirmed:confirm})});if(!r.ok)throw new Error();await load();setMessage(confirm?'WORKOUT CONFIRMED':'SESSION UPDATED')}catch{setMessage('SAVE FAILED — TRY AGAIN')}finally{setSaving(false)}
 }
 async function sendToTrainer(){
  try{setSaving(true);const r=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date})});if(!r.ok)throw new Error();const d=await r.json();setReport({text:d.text,file:d.file});await load()}catch{setMessage('SAVE FAILED — REPORT NOT BUILT')}finally{setSaving(false)}
 }
 async function addNote(){
  if(!noteText.trim())return;
  try{setSaving(true);const r=await fetch('/api/trainer-note',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date,author:noteAuthor,body:noteText})});if(!r.ok)throw new Error();setNoteText('');await load();setMessage('TRAINER NOTE SAVED')}catch{setMessage('SAVE FAILED — TRY AGAIN')}finally{setSaving(false)}
 }
 async function deleteNote(id:number){
  if(!window.confirm('Delete this trainer note? Your workout data is not affected.'))return;
  try{const r=await fetch('/api/trainer-note',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!r.ok)throw new Error();await load();setMessage('NOTE DELETED')}catch{setMessage('SAVE FAILED — TRY AGAIN')}
 }
 async function copyReport(){if(!report)return;try{await navigator.clipboard.writeText(report.text);setMessage('REPORT COPIED')}catch{setMessage('COPY BLOCKED — SELECT TEXT MANUALLY')}}
 function effective(e:Exercise):DraftRow{const old=logs.find(x=>x.exercise_id===e.id);return draft[e.id]??{done:!!old?.done,weight:String(old?.weight??''),reps:old?.reps??'',notes:old?.notes??''}}
 function update(e:Exercise,field:keyof DraftRow,value:boolean|string){setDraft(old=>({...old,[e.id]:{...effective(e),...old[e.id],[field]:value}}))}
 async function saveExercise(e:Exercise,override?:boolean){const v=effective(e);const body={day:date,exercise_id:e.id,done:override??v.done,weight:v.weight,reps:v.reps,notes:v.notes};try{setSaving(true);const r=await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Save failed');await load();setDraft(d=>{const c={...d};delete c[e.id];return c});setMessage('EXERCISE LOG SAVED');}catch{setMessage('SAVE FAILED — TRY AGAIN')}finally{setSaving(false)}}
 async function toggle(e:Exercise,checked:boolean){const v=effective(e);update(e,'done',checked);const body={...v,done:checked};try{const r=await fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date,exercise_id:e.id,...body})});if(!r.ok)throw Error();await load()}catch{setMessage('SAVE FAILED — RETRY CHECKBOX')}}
 async function saveProfile(next:Profile,programChoice?:'starter'|'empty'){
  try{const r=await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{...next,onboarded:true},programChoice})});if(!r.ok)throw new Error();await load();setMessage('PROFILE SAVED')}catch{setMessage('SAVE FAILED — TRY AGAIN')}
 }
 async function saveProgram(next:Program):Promise<boolean>{
  try{const r=await fetch('/api/program',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({program:next})});if(!r.ok)throw new Error();await load();setMessage('PROGRAM SAVED');return true}catch{setMessage('SAVE FAILED — CHECK THE PROGRAM FIELDS');return false}
 }
 async function resetProgram(){
  try{const r=await fetch('/api/program',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reset:'starter'})});if(!r.ok)throw new Error();await load();setMessage('PROGRAM RESET TO STARTER')}catch{setMessage('SAVE FAILED — TRY AGAIN')}
 }
 async function saveDaily(){try{setSaving(true);const r=await fetch('/api/metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:date,...daily})});if(!r.ok)throw new Error();await load();setMessage('DAILY INTEL SAVED')}catch{setMessage('SAVE FAILED — TRY AGAIN')}finally{setSaving(false)}}
 const jumpToWeekday=(i:number)=>{const [y,m,d]=date.split('-').map(Number);const current=new Date(y,m-1,d);const target=new Date(current);target.setDate(target.getDate()+i-dayIndex);setDate(dateKey(target))};
 const weekDates=useMemo(()=>{if(!date)return [] as string[];const [y,m,d]=date.split('-').map(Number);return week.map((_,i)=>{const t=new Date(y,m-1,d);t.setDate(t.getDate()+i-dayIndex);return dateKey(t)})},[date,dayIndex,week]);
 const isToday=date===todayKey();

 if(!date||!prog||loading)return <div className="boot"><span className="boot-bar"/>INITIALIZING MISSION CONTROL<span className="blink">_</span></div>;

 if(!profile.onboarded)return <div className="site">
  <div className="topline" aria-hidden="true"/>
  <main className="wrap onboarding">
   <section className="hero">
    <div className="hazard" aria-hidden="true"/>
    <FlagArt/>
    <div className="hero-body">
     <div className="section-mark">FIRST RUN <span className="sep">//</span> SETUP</div>
     <h1>WELCOME TO<br/><em>IRON STANDARD.</em></h1>
     <p className="hero-sub">A FREE, LOCAL-FIRST TRAINING JOURNAL.<br/>{' '}NO ACCOUNTS. NO CLOUD. YOUR DATA STAYS ON THIS COMPUTER.</p>
    </div>
    <Corners/>
   </section>
   {message&&<div className={'toast '+(message.startsWith('SAVE FAILED')?'is-error':'')} role="status" onClick={()=>setMessage('')}><Check size={14}/>{message}<X size={14}/></div>}
   <div className="panel profile-panel"><Corners/>
    <div className="panel-top"><span className="section-mark">YOUR PROFILE</span><span className="counter">EVERYTHING IS OPTIONAL</span></div>
    <h2>SET YOUR STANDARD</h2>
    <ProfileForm initial={profile} onboarding onSave={saveProfile} onSkip={()=>saveProfile(profile,'starter')}/>
   </div>
  </main>
 </div>;

 return <div className="site">
  <div className="topline" aria-hidden="true"/>
  <header className="header wrap">
   <div className="logo">
    <div className="logo-icon"><Target size={28} strokeWidth={2.25}/></div>
    <div>
     <div className="eyebrow">PERSONAL PERFORMANCE SYSTEM <span className="sep">//</span> 001</div>
     <div className="brand">IRON <span>STANDARD</span><i>™</i></div>
    </div>
   </div>
   <div className="header-right"><span className="live-dot" aria-hidden="true"/>OFFLINE-FIRST <span className="header-divider">/</span> LOCAL COMMAND {loading&&<span className="header-divider">/ SYNCING</span>}</div>
  </header>

  <main className="wrap">
   <section className="hero">
    <div className="hazard" aria-hidden="true"/>
    <FlagArt/>
    <div className="hero-body">
     <div className="section-mark">DAILY <span className="sep">//</span> OPERATIONS</div>
     <h1>BUILD THE FRAME.<br/><em>EARN THE STANDARD.</em></h1>
     <p className="hero-sub">{hasGoal?`OBJECTIVE: ${fmtN(START!)} → ${fmtN(GOAL!)} ${wu}.`:'SET YOUR OBJECTIVE IN YOUR PROFILE.'}<br/>{' '}SHOW UP. LOG THE WORK. SMARTER LOAD.</p>
     <div className="hero-bottom">
      <span><Crosshair size={14}/> {GOAL!=null?`OBJECTIVE: ${fmtN(GOAL)} ${wu}`:'NO OBJECTIVE SET'}</span>
      {profile.limitations&&<span><ShieldAlert size={14}/> JOINT-AWARE TRAINING</span>}
      <span><Dumbbell size={14}/> {(profile.equipment.length?profile.equipment.map(id=>EQUIPMENT.find(q=>q.id===id)?.label.split(' / ')[0].toUpperCase()??id.toUpperCase()).join(' + '):'EQUIPMENT NOT SET')}</span>
     </div>
    </div>
    <div className="hero-stamp" aria-hidden="true"><span>DISCIPLINE</span><span>OVER</span><span>INTENSITY</span></div>
    <Corners/>
   </section>

   <section className="stats" aria-label="Weight objective telemetry">
    <div className="stat"><span>STARTING WEIGHT</span><strong>{START??'—'}<small>{START!=null?wu:''}</small></strong><div>BASELINE</div></div>
    <div className="stat"><span>LAST LOGGED</span><strong>{latestWeight??'—'}<small>{latestWeight!=null?wu:''}</small></strong><div>{latestWeight==null?'AWAITING TELEMETRY':START==null?'LOGGED':delta<0?<>DOWN <b>{fmtN(-delta)}</b> {wu}</>:delta>0?<>UP <b>{fmtN(delta)}</b> {wu}</>:'AT BASELINE'}</div></div>
    <div className="stat"><span>WEIGHT TARGET</span><strong>{GOAL??'—'}<small>{GOAL!=null?wu:''}</small></strong><div>FINAL OBJECTIVE</div></div>
    <div className="stat objective"><span>OBJECTIVE COMPLETE</span><strong>{hasGoal?Math.round(pct):'—'}<small>{hasGoal?'%':''}</small></strong><div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><div style={{width:`${pct}%`}}/><i/><i/><i/></div></div>
   </section>

   <div className="nav" role="tablist" aria-label="Views">
    <button role="tab" aria-selected={tab==='mission'} className={tab==='mission'?'selected':''} onClick={()=>setTab('mission')}><ClipboardList size={16}/> DAILY MISSION</button>
    <button role="tab" aria-selected={tab==='history'} className={tab==='history'?'selected':''} onClick={()=>setTab('history')}><TrendingDown size={16}/> FIELD REPORTS</button>
    <button role="tab" aria-selected={tab==='program'} className={tab==='program'?'selected':''} onClick={()=>setTab('program')}><Dumbbell size={16}/> PROGRAM</button>
    <button role="tab" aria-selected={tab==='data'} className={tab==='data'?'selected':''} onClick={()=>setTab('data')}><Database size={16}/> DATA</button>
    <button role="tab" aria-selected={tab==='profile'} className={tab==='profile'?'selected':''} onClick={()=>setTab('profile')}><UserCog size={16}/> PROFILE</button>
    <span>{hasGoal?<>{fmtN(START!)} → {fmtN(GOAL!)} {wu}</>:'NO GOAL SET'}{profile.kcal!=null&&<> <b>//</b> {profile.kcal} KCAL</>}{profile.protein!=null&&<> <b>//</b> {profile.protein}G PROTEIN</>}</span>
   </div>

   {message&&<div className={'toast '+(message.startsWith('SAVE FAILED')||message.startsWith('Database')?'is-error':'')} role="status" onClick={()=>setMessage('')}><Check size={14}/>{message}<X size={14}/></div>}

   {tab==='mission'?<>
    <section className="date-switch" aria-label="Mission date">
     <button className="icon-btn" onClick={()=>changeDate(-1)} aria-label="Previous day"><ChevronLeft size={20}/></button>
     <div className="date-main">
      <div className="eyebrow">MISSION DATE {isToday&&<span className="pill">TODAY</span>}</div>
      <strong>{weekdayLong(date).toUpperCase()} <em>{fmt(date).toUpperCase()}</em></strong>
     </div>
     <input aria-label="Choose date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
     <button className="ghost" onClick={()=>setDate(todayKey())} disabled={isToday}>TODAY</button>
     <button className="icon-btn" onClick={()=>changeDate(1)} aria-label="Next day"><ChevronRight size={20}/></button>
    </section>

    <div className="week-strip" role="group" aria-label="Weekly battle rhythm">
     {week.map((w,i)=>{const d=weekDates[i];const current=i===dayIndex;const trained=doneDays.has(d);const today=d===todayKey();return <button key={w.day} className={'wk '+(current?'current ':'')+(trained?'trained ':'')+(today?'today':'')} onClick={()=>jumpToWeekday(i)} aria-pressed={current} aria-label={`${w.day} ${d}: ${program[w.session].subtitle}`}>
      <span className="wk-day">{w.day}</span>
      <span className="wk-num">{Number(d.slice(-2))}</span>
      <span className="wk-code">{program[w.session].title.split('//')[0].trim()}</span>
      <span className="wk-dot" aria-hidden="true"/>
     </button>})}
    </div>

    <div className="columns">
     <section className="main-column">
      <div className={'panel training '+(missionDone?'is-complete':'')}>
       <Corners/>
       <div className="panel-top"><span className="section-mark">TODAY&apos;S TRAINING</span><span className="counter">{completed}/{total} COMPLETE</span></div>
       <div className="training-head">
        <div>
         <h2>{plan.title}</h2>
         <p className="subheading">{plan.subtitle}</p>
         <p className="plan-intro">{plan.description}</p>
        </div>
        <Ring value={completed} max={total}/>
       </div>
       <div className="progress-track" aria-hidden="true"><div style={{width:`${total?completed/total*100:100}%`}}/></div>
       {missionDone&&<div className="complete-banner"><span className="stamp">MISSION COMPLETE</span><span>ALL {total} EXERCISES CLEARED. LOG YOUR INTEL AND RECOVER.</span></div>}

       {plan.exercises.length===0?<div className="rest-card"><HeartPulse size={30}/><strong>RECOVERY IS PART OF THE MISSION</strong><p>Rest, eat well, and resume the next scheduled training day.</p></div>
       :<ol className="exercises">{plan.exercises.map((e,i)=>{const v=effective(e);const open=!!expanded[e.id];const dirty=!!draft[e.id];return <li className={'exercise '+(v.done?'is-done ':'')+(open?'is-open':'')} key={e.id}>
        <div className="exercise-header">
         <label className="check-wrap">
          <input type="checkbox" checked={v.done} aria-label={`Mark ${e.name} complete`} onChange={ev=>toggle(e,ev.target.checked)}/>
          <span className="custom-check"><Check size={16} strokeWidth={3}/></span>
         </label>
         <div className="exercise-number">{String(i+1).padStart(2,'0')}</div>
         <div className="exercise-title">
          <strong>{e.name}</strong>
          <small><span className="chip">{e.category}</span><span className="meta">{e.sets} SETS × {e.reps}</span>{(()=>{const r=recFor(e);return r.weight!=null?<span className={'chip rec-chip rec-'+r.kind} title={r.reason}>{r.source==='trainer'?'PICK':'REC'} {r.weight} {wu}</span>:null})()}</small>
         </div>
         <button className={'expand '+(open?'is-open':'')} onClick={()=>setExpanded(x=>({...x,[e.id]:!x[e.id]}))} aria-expanded={open} aria-controls={`details-${e.id}`}><NotebookPen size={15}/><span>{open?'CLOSE':'LOG SET'}</span></button>
        </div>
        {figureFor(e.name)&&<button type="button" className="fig-btn" onClick={()=>setZoom({src:figureFor(e.name)!,name:e.name})} aria-label={`Enlarge illustration: ${e.name}`}><img className="exercise-fig" src={figureFor(e.name)!} alt={`${e.name}: start and finish positions`} loading="lazy"/><span className="fig-zoom" aria-hidden="true"><ZoomIn size={13}/> ENLARGE</span></button>}
        <p className="exercise-desc">{e.description}</p>
        {(()=>{const info=infoFor(e);return info&&(info.works.length>0||info.benefit)?<div className="ex-info">
         {info.works.length>0&&<div className="ex-works"><span className="ex-lbl">WORKS</span>{info.works.map(w=><span className="work-chip" key={w}>{w}</span>)}</div>}
         {info.benefit&&<p className="ex-benefit"><b>WHY IT HELPS</b> {info.benefit}</p>}
        </div>:null})()}
        {e.caution&&<p className="caution"><ShieldAlert size={15}/><span><b>CAUTION</b> {e.caution}</span></p>}
        {open&&<div className="exercise-details sets-editor" id={`details-${e.id}`}>
         {(()=>{const rec=recFor(e);return <div className={'rec-box rec-'+rec.kind}>
         <div className="rec-top"><b>{rec.source==='trainer'?'TRAINER PICK':'SUGGESTED'}</b><span className="rec-w">{rec.weight!=null?`${rec.weight} ${wu}`:rec.kind==='bodyweight'?'BODYWEIGHT':'YOUR CALL'}</span><span className="rec-r">{rec.targetReps}</span>{rec.weight!=null&&<button type="button" className="ghost sm" onClick={()=>applyRec(e,rec)}>FILL {rec.weight} {wu}</button>}</div>
         <p>{rec.reason}</p>
         {rec.last&&<small>LAST ({fmt(rec.last.day)}): {rec.last.summary}</small>}
        </div>})()}
        <div className="set-head" aria-hidden="true"><span>SET</span><span>WEIGHT ({wu})</span><span>REPS</span><span>PAIN 0–10</span><span>NOTES</span></div>
         {setRows(e).map((r,i)=><div className="set-row" key={i}>
          <span className="set-no">{i+1}</span>
          <input type="number" inputMode="decimal" min="0" max="500" step="0.5" aria-label={`${e.name} set ${i+1} weight`} placeholder={wu.toLowerCase()} value={r.weight} onChange={x=>editSet(e,i,'weight',x.target.value)}/>
          <input type="number" inputMode="numeric" min="0" max="500" aria-label={`${e.name} set ${i+1} reps`} placeholder="reps" value={r.reps} onChange={x=>editSet(e,i,'reps',x.target.value)}/>
          <select aria-label={`${e.name} set ${i+1} pain`} className={'pain p'+(r.pain===''?'x':Number(r.pain)>=4?'hi':Number(r.pain)>=1?'mid':'0')} value={r.pain} onChange={x=>editSet(e,i,'pain',x.target.value)}><option value="">—</option>{Array.from({length:11},(_,n)=><option key={n} value={n}>{n}</option>)}</select>
          <input className="set-note" aria-label={`${e.name} set ${i+1} notes`} placeholder="Notes: how it felt, form, pain, tingling…" maxLength={500} value={r.notes} onChange={x=>editSet(e,i,'notes',x.target.value)}/>
         </div>)}
         <div className="set-actions">
          <button className="ghost" onClick={()=>addSet(e)}><Plus size={14}/> ADD SET</button>
          <button className="save" disabled={saving} onClick={()=>saveSets(e)}><Save size={14}/> {setsDraft[e.id]?'SAVE CHANGES':'SAVE SETS'}</button>
         </div>
        </div>}
        <span className="cleared" aria-hidden="true">CLEARED</span>
       </li>})}</ol>}
      </div>

      {plan.exercises.length>0&&<div className={'panel session '+(confirmed?'is-confirmed':'')}>
       <Corners/>
       <div className="panel-top"><span className="section-mark">AFTER-ACTION REPORT</span>{confirmed?<span className="badge">CONFIRMED</span>:<ClipboardList size={17}/>}</div>
       <h3>HOW DID IT GO?</h3>
       <label className="full">GENERAL NOTE<textarea rows={3} placeholder="Overall feel, pain or tingling (where / when), energy, form breakdowns, anything the trainer should know…" value={sessNote} onChange={e=>setSessNote(e.target.value)}/></label>
       <div className="session-actions">
        <button className="save" disabled={saving} onClick={()=>saveSession(true)}><Check size={14}/> {confirmed?'RE-CONFIRM WORKOUT':'CONFIRM WORKOUT'}</button>
        {confirmed&&<button className="save send" disabled={saving} onClick={sendToTrainer}><Send size={14}/> SEND TO TRAINER</button>}
        {confirmed&&<button className="ghost" disabled={saving} onClick={()=>saveSession(false)}>UNCONFIRM</button>}
       </div>
       {session_?.sent_at&&<p className="sent-note">LAST REPORT BUILT {new Date(session_.sent_at).toLocaleString()}</p>}
       {report&&<div className="report-box">
        <p>REPORT SAVED LOCALLY: <code>{report.file}</code><br/>Paste it to Claude, or just say “evaluate my latest workout” and it will read that file.</p>
        <textarea readOnly rows={8} value={report.text} onFocus={e=>e.currentTarget.select()} aria-label="Trainer report"/>
        <button className="save" onClick={copyReport}><Copy size={14}/> COPY REPORT</button>
       </div>}
      </div>}

      {(plan.exercises.length>0||dayNotes.length>0)&&<div className="panel trainer-notes">
       <Corners/>
       <div className="panel-top"><span className="section-mark">TRAINER&apos;S NOTES</span><span className="counter">{dayNotes.length} ON FILE</span></div>
       <h3>FEEDBACK ON THIS WORKOUT</h3>
       {dayNotes.length===0&&<p className="empty-note">NO FEEDBACK YET. SEND THIS WORKOUT TO YOUR TRAINER, THEN PASTE THE REPLY BELOW.</p>}
       {dayNotes.map(n=><article className="tnote" key={n.id}>
        <header><span className="ai-tag">AI-GENERATED</span><b>{n.author}</b><time>{new Date(n.created_at.includes('T')?n.created_at:n.created_at.replace(' ','T')+'Z').toLocaleString()}</time><button className="note-del" onClick={()=>deleteNote(n.id)} aria-label="Delete note"><X size={13}/></button></header>
        <div className="tnote-body">{n.body}</div>
       </article>)}
       <p className="disclaimer">AI feedback is a suggestion, not medical advice. It never changes your workout history, goals or program unless you change them yourself.</p>
       <label className="full">ADD FEEDBACK<textarea rows={4} placeholder="Paste your trainer's reply here…" value={noteText} onChange={e=>setNoteText(e.target.value)}/></label>
       <div className="session-actions">
        <input className="author-input" aria-label="Who wrote this feedback" value={noteAuthor} onChange={e=>setNoteAuthor(e.target.value)} maxLength={80}/>
        <button className="save" disabled={saving||!noteText.trim()} onClick={addNote}><Save size={14}/> SAVE FEEDBACK</button>
       </div>
      </div>}

      <div className="panel safety">
       <div className="panel-top"><span className="section-mark">OPERATING LIMITS</span><ShieldAlert size={17}/></div>
       <h3>TRAIN HARD. STAY OPERATIONAL.</h3>
       <p>Keep your spine controlled, use joint-friendly positions, and stop for sharp or radiating pain, tingling, numbness, weakness, or worsening symptoms. Have a clinician or PT review your loads if symptoms are active. This app is a training journal, not medical advice.</p>
      {profile.limitations&&<p className="my-limits"><b>YOUR LIMITATIONS:</b> {profile.limitations}</p>}
      </div>
     </section>

     <aside className="sidebar">
      <div className="panel intel">
       <Corners/>
       <div className="panel-top"><span className="section-mark">DAILY INTEL</span>{existingDay?<span className="badge">ON FILE</span>:<CalendarDays size={17}/>}</div>
       <h3>LOG YOUR METRICS</h3>
       <div className="field-grid">
        <label>CALORIES<span className="unit-wrap"><input type="number" placeholder={String(profile.kcal??'')} min="0" value={daily.calories} onChange={e=>setDaily(v=>({...v,calories:e.target.value}))}/><span className="unit">KCAL</span></span></label>
        <label>PROTEIN<span className="unit-wrap"><input type="number" placeholder={String(profile.protein??'')} min="0" value={daily.protein} onChange={e=>setDaily(v=>({...v,protein:e.target.value}))}/><span className="unit">G</span></span></label>
        <label>WALK<span className="unit-wrap"><input type="number" placeholder="30" min="0" value={daily.walk_minutes} onChange={e=>setDaily(v=>({...v,walk_minutes:e.target.value}))}/><span className="unit">MIN</span></span></label>
        <label>WEIGHT<span className="unit-wrap"><input type="number" placeholder={String(START??'')} step="0.1" min="0" value={daily.weight} onChange={e=>setDaily(v=>({...v,weight:e.target.value}))}/><span className="unit">{wu}</span></span></label>
        <label>WAIST<span className="unit-wrap"><input type="number" placeholder="Optional" step="0.25" min="0" value={daily.waist} onChange={e=>setDaily(v=>({...v,waist:e.target.value}))}/><span className="unit">{su}</span></span></label>
        <label className="full">DAILY NOTES<textarea rows={3} placeholder="Energy, soreness, elbow/back symptoms..." value={daily.notes} onChange={e=>setDaily(v=>({...v,notes:e.target.value}))}/></label>
       </div>
       <button className="save wide" disabled={saving} onClick={saveDaily}><Save size={15}/> SAVE DAILY INTEL</button>
      </div>

      <div className="panel schedule">
       <div className="panel-top"><span className="section-mark">WEEKLY BATTLE RHYTHM</span><Activity size={17}/></div>
       {week.map((w,i)=><button key={w.day} className={i===dayIndex?'current':''} onClick={()=>jumpToWeekday(i)} aria-current={i===dayIndex?'date':undefined}>
        <span className="sched-day">{w.day}</span>
        <span className="sched-body"><b>{program[w.session].title}</b><em>{program[w.session].subtitle}</em></span>
        <span className="sched-count">{program[w.session].exercises.length?`${program[w.session].exercises.length} EX`:'—'}</span>
       </button>)}
      </div>

      <div className="tactical-quote">
       <Flag size={22}/>
       <strong>DISCIPLINE OVER INTENSITY.</strong>
       <p>Consistency is the mission. Show up, log the work, protect the joints.</p>
      </div>
     </aside>
    </div>
   </>:tab==='data'?<section className="panel data-section">
    <Corners/>
    <div className="panel-top"><span className="section-mark">DATA <span className="sep">//</span> EXPORT · IMPORT · BACKUP</span></div>
    <h2>YOUR DATA, YOUR COMPUTER</h2>
    <DataPanel onChanged={load} notify={setMessage}/>
   </section>:tab==='program'?<section className="panel program-panel">
    <Corners/>
    <div className="panel-top"><span className="section-mark">PROGRAM <span className="sep">//</span> EDITOR</span></div>
    <h2>BUILD YOUR WEEK</h2>
    <p className="plan-intro">Schedule sessions, edit exercises, or pull from the library. Stored only on this computer.</p>
    <ProgramEditor key={JSON.stringify(prog)} program={prog} equipment={profile.equipment} onSave={saveProgram} onReset={resetProgram}/>
   </section>:tab==='profile'?<section className="panel profile-panel">
    <Corners/>
    <div className="panel-top"><span className="section-mark">PROFILE <span className="sep">//</span> SETTINGS</span></div>
    <h2>YOUR STANDARD</h2>
    <p className="plan-intro">Goals, targets, equipment and limitations. Stored only in your local database and used to build your trainer report.</p>
    <ProfileForm key={JSON.stringify(profile)} initial={profile} onboarding={false} onSave={saveProfile}/>
   </section>:<section className="panel history">
    <Corners/>
    <div className="panel-top"><span className="section-mark">FIELD REPORTS <span className="sep">//</span> SAVED DATA</span><span className="counter">{streak} ACTIVE TRAINING DATES</span></div>
    <h2>PROGRESS ARCHIVE</h2>
    <p className="plan-intro">Logged daily metrics and exercise records are stored in your local SQLite database. Select a row to open that mission date.</p>
    <div className="table-scroll"><table>
     <thead><tr><th>DATE</th><th>WEIGHT</th><th>WAIST</th><th>CALORIES</th><th>PROTEIN</th><th>WALK</th><th>TRAINING</th></tr></thead>
     <tbody>{[...new Set([...days.map(d=>d.day),...entries.map(e=>e.day)])].sort((a,b)=>b.localeCompare(a)).map(day=>{const d=days.find(x=>x.day===day);const n=entries.filter(e=>e.day===day&&e.done).length;return <tr key={day} tabIndex={0} onClick={()=>{setDate(day);setTab('mission')}} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();setDate(day);setTab('mission')}}}>
      <td className="td-date">{day}</td><td>{d?.weight??'—'}</td><td>{d?.waist??'—'}</td><td>{d?.calories??'—'}</td><td>{d?.protein??'—'}</td><td>{d?.walk_minutes??'—'}</td><td><span className={'chip '+(n?'ok':'')}>{n} CHECKED</span></td>
     </tr>})}</tbody>
    </table></div>
    {days.length===0&&entries.length===0&&<p className="empty">NO REPORTS ON FILE. YOUR FIRST LOG STARTS THE RECORD.</p>}
   </section>}

   {zoom&&<div className="lightbox" role="dialog" aria-modal="true" aria-label={`${zoom.name} illustration`} onClick={()=>setZoom(null)}>
    <div className="lightbox-card" onClick={ev=>ev.stopPropagation()}>
     <div className="lightbox-head"><b>{zoom.name.toUpperCase()}</b><button type="button" className="icon-btn" onClick={()=>setZoom(null)} aria-label="Close" autoFocus><X size={18}/></button></div>
     <img src={zoom.src} alt={`${zoom.name}: start and finish positions`}/>
     <p>Red marks the main working muscles. Press Esc or click outside to close.</p>
    </div>
   </div>}

   <footer>
    <div><Flag size={14}/> IRON STANDARD <span className="sep">//</span> LOCAL FITNESS OPERATIONS</div>
    <div>BUILT FOR DISCIPLINE, NOT DISTRACTION. <span>EST. 2026</span></div>
   </footer>
  </main>
 </div>;
}
