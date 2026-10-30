'use client';
import {useState} from 'react';
import {ChevronDown,ChevronUp,Copy,Plus,RotateCcw,Save,Trash2} from 'lucide-react';
import type {Exercise,Program} from '../lib/program';
import {library,isAvailable} from '../lib/library';
import {EQUIPMENT} from '../lib/units';
import {TRACKS,TRACK_LABEL,trackOf} from '../lib/tracking';

const rid=()=>Math.random().toString(36).slice(2,8);
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const CATS=['STRENGTH','BODYWEIGHT','SHOULDERS','CORE','CARRY','CARDIO','MOBILITY','OTHER'];
const DAYS=['MON','TUE','WED','THU','FRI','SAT','SUN'];

export default function ProgramEditor({program,equipment,onSave,onReset}:{program:Program;equipment:string[];onSave:(p:Program)=>Promise<boolean>;onReset:()=>Promise<void>}){
 const [p,setP]=useState<Program>(()=>clone(program));
 const [dirty,setDirty]=useState(false);
 const [open,setOpen]=useState<string|null>(null);
 const [openEx,setOpenEx]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [onlyMine,setOnlyMine]=useState(true);
 const mut=(fn:(d:Program)=>void)=>{setP(o=>{const d=clone(o);fn(d);return d});setDirty(true)};
 const ids=Object.keys(p.sessions);
 const libChoices=library.filter(e=>!onlyMine||isAvailable(e,equipment));

 const addSession=()=>{const id='s_'+rid();mut(d=>{d.sessions[id]={id,title:'NEW SESSION',subtitle:'',description:'',exercises:[]}});setOpen(id)};
 const dupSession=(id:string)=>{const nid='s_'+rid();mut(d=>{const c=clone(d.sessions[id]);c.id=nid;c.title=(c.title+' COPY').slice(0,60);c.exercises.forEach(e=>{e.id=e.id.replace(/_[a-z0-9]{6}$/,'')+'_'+rid()});d.sessions[nid]=c});setOpen(nid)};
 const delSession=(id:string)=>{
  if(ids.length<=1){window.alert('A program needs at least one session.');return}
  if(!window.confirm('Delete this session? Days using it will switch to another session. Logged workouts are kept.'))return;
  mut(d=>{delete d.sessions[id];const rest=Object.keys(d.sessions)[0];d.week.forEach(w=>{if(w.session===id)w.session=rest})});
 };
 const setSess=(id:string,k:'title'|'subtitle'|'description',v:string)=>mut(d=>{d.sessions[id][k]=v});
 const setEx=(sid:string,i:number,k:keyof Exercise,v:unknown)=>mut(d=>{(d.sessions[sid].exercises[i] as any)[k]=v});
 const move=(sid:string,i:number,dir:-1|1)=>mut(d=>{const a=d.sessions[sid].exercises;const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]]});
 const delEx=(sid:string,i:number)=>{if(window.confirm('Remove this exercise from the session? Your past logs for it are kept.'))mut(d=>{d.sessions[sid].exercises.splice(i,1)})};
 const addEx=(sid:string,e?:Exercise)=>{const id=(e?.id??'ex')+'_'+rid();mut(d=>{d.sessions[sid].exercises.push(e?{...clone(e),id}:{id,name:'New exercise',sets:3,reps:'8–12',category:'STRENGTH',description:'',equipment:[]})});setOpenEx(id)};
 const toggleEq=(sid:string,i:number,q:string)=>mut(d=>{const e=d.sessions[sid].exercises[i];const cur=e.equipment??[];e.equipment=cur.includes(q)?cur.filter(x=>x!==q):[...cur,q]});
 async function save(){setBusy(true);try{if(await onSave(p))setDirty(false)}finally{setBusy(false)}}
 async function reset(){if(!window.confirm('Replace your whole program with the neutral starter? Your logged workouts are kept, but exercises that no longer exist will appear as removed. This cannot be undone.'))return;setBusy(true);try{await onReset()}finally{setBusy(false)}}

 return <div className="program-editor">
  <p className="disclaimer">Changing the weekly schedule changes how <b>past dates</b> are displayed too (days show the session currently scheduled for that weekday). Your logged sets and notes are never deleted by editing the program.</p>

  <h3>WEEKLY SCHEDULE</h3>
  <div className="sched-edit">
   {p.week.map((w,i)=><label key={w.day}><span>{DAYS[i]}</span>
    <select value={w.session} onChange={e=>mut(d=>{d.week[i].session=e.target.value})} aria-label={`${DAYS[i]} session`}>
     {ids.map(id=><option key={id} value={id}>{p.sessions[id].title}</option>)}
    </select></label>)}
  </div>

  <div className="ed-head"><h3>SESSIONS</h3><button type="button" className="ghost sm" onClick={addSession}><Plus size={14}/> NEW SESSION</button></div>
  {ids.map(id=>{const s=p.sessions[id];const isOpen=open===id;return <section className={'ed-session '+(isOpen?'is-open':'')} key={id}>
   <header>
    <button type="button" className="ed-toggle" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:id)}>
     <span className="ed-title">{s.title||'UNTITLED'}</span><small>{s.exercises.length} EX{s.subtitle?` · ${s.subtitle}`:''}</small>{isOpen?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
    </button>
    <div className="ed-tools">
     <button type="button" className="icon sm" onClick={()=>dupSession(id)} aria-label={`Duplicate ${s.title}`} title="Duplicate"><Copy size={14}/></button>
     <button type="button" className="icon sm danger" onClick={()=>delSession(id)} aria-label={`Delete ${s.title}`} title="Delete"><Trash2 size={14}/></button>
    </div>
   </header>
   {isOpen&&<div className="ed-body">
    <div className="ed-grid">
     <label>TITLE<input value={s.title} maxLength={60} onChange={e=>setSess(id,'title',e.target.value)}/></label>
     <label>SUBTITLE<input value={s.subtitle} maxLength={80} onChange={e=>setSess(id,'subtitle',e.target.value)}/></label>
     <label className="full">DESCRIPTION<textarea rows={2} maxLength={600} value={s.description} onChange={e=>setSess(id,'description',e.target.value)}/></label>
    </div>
    <h4>EXERCISES</h4>
    {s.exercises.length===0&&<p className="empty-note">NO EXERCISES. THIS SESSION WILL SHOW AS A REST / OPEN DAY.</p>}
    {s.exercises.map((e,i)=>{const eo=openEx===e.id;return <article className="ed-ex" key={e.id}>
     <header>
      <button type="button" className="ed-toggle" aria-expanded={eo} onClick={()=>setOpenEx(eo?null:e.id)}>
       <span className="ed-title">{e.name||'Unnamed'}</span><small>{e.sets} × {e.reps||'—'} · {e.category}{e.optional?' · OPTIONAL':''}</small>{eo?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
      </button>
      <div className="ed-tools">
       <button type="button" className="icon sm" disabled={i===0} onClick={()=>move(id,i,-1)} aria-label="Move up"><ChevronUp size={14}/></button>
       <button type="button" className="icon sm" disabled={i===s.exercises.length-1} onClick={()=>move(id,i,1)} aria-label="Move down"><ChevronDown size={14}/></button>
       <button type="button" className="icon sm danger" onClick={()=>delEx(id,i)} aria-label={`Remove ${e.name}`}><Trash2 size={14}/></button>
      </div>
     </header>
     {eo&&<div className="ed-grid">
      <label className="full">NAME<input value={e.name} maxLength={80} onChange={x=>setEx(id,i,'name',x.target.value)}/></label>
      <label>SETS<input type="number" min={1} max={20} value={e.sets} onChange={x=>setEx(id,i,'sets',Number(x.target.value))}/></label>
      <label>REPS / TIME<input value={e.reps} maxLength={40} placeholder="8–12, 30 sec, 20 min" onChange={x=>setEx(id,i,'reps',x.target.value)}/></label>
      <label>CATEGORY<select value={CATS.includes(e.category)?e.category:'OTHER'} onChange={x=>setEx(id,i,'category',x.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></label>
      <label>LOG FIELDS<select value={e.track??''} onChange={x=>setEx(id,i,'track',x.target.value||undefined)}><option value="">Automatic: {TRACK_LABEL[trackOf(e)]}</option>{TRACKS.map(t=><option key={t} value={t}>{TRACK_LABEL[t]}</option>)}</select></label>
      <label className="full eq-filter"><input type="checkbox" checked={!!e.optional} onChange={x=>setEx(id,i,'optional',x.target.checked||undefined)}/> OPTIONAL BONUS: extra work you may skip; it does not count toward completing the session</label>
      <label className="full">WHAT IT WORKS <i className="opt">OPTIONAL · COMMA-SEPARATED · BLANK = AUTO</i><input value={(e.works??[]).join(', ')} maxLength={200} placeholder="Chest, Triceps, Core" onChange={x=>setEx(id,i,'works',x.target.value.split(',').map(s=>s.trimStart()))}/></label>
      <label className="full">WHY IT HELPS <i className="opt">OPTIONAL · BLANK = AUTO</i><textarea rows={2} maxLength={300} value={e.benefit??''} onChange={x=>setEx(id,i,'benefit',x.target.value)}/></label>
      <label className="full">FORM INSTRUCTIONS<textarea rows={3} maxLength={800} value={e.description} onChange={x=>setEx(id,i,'description',x.target.value)}/></label>
      <label className="full">SAFETY / MODIFICATION NOTE <i className="opt">OPTIONAL</i><textarea rows={2} maxLength={500} value={e.caution??''} onChange={x=>setEx(id,i,'caution',x.target.value)}/></label>
      <fieldset className="full equip"><legend>EQUIPMENT NEEDED</legend>
       {EQUIPMENT.map(q=><label key={q.id} className={'eq '+((e.equipment??[]).includes(q.id)?'on':'')}><input type="checkbox" checked={(e.equipment??[]).includes(q.id)} onChange={()=>toggleEq(id,i,q.id)}/>{q.label}</label>)}
      </fieldset>
     </div>}
    </article>})}
    <div className="ed-add">
     <button type="button" className="ghost sm" onClick={()=>addEx(id)}><Plus size={14}/> BLANK EXERCISE</button>
     <select aria-label="Add from library" value="" onChange={e=>{const f=library.find(x=>x.id===e.target.value);if(f)addEx(id,f)}}>
      <option value="">+ ADD FROM LIBRARY…</option>
      {libChoices.map(x=><option key={x.id} value={x.id}>{x.name} ({x.category.toLowerCase()})</option>)}
     </select>
     <label className="eq-filter"><input type="checkbox" checked={onlyMine} onChange={e=>setOnlyMine(e.target.checked)}/> only my equipment</label>
    </div>
   </div>}
  </section>})}

  <div className="ed-bar">
   <span className={dirty?'dirty':''}>{dirty?'UNSAVED CHANGES':'ALL CHANGES SAVED'}</span>
   <button type="button" className="ghost sm" disabled={busy} onClick={reset}><RotateCcw size={14}/> RESET TO STARTER</button>
   <button type="button" className="ghost sm" disabled={busy||!dirty} onClick={()=>{setP(clone(program));setDirty(false)}}>DISCARD</button>
   <button type="button" className="save" disabled={busy||!dirty} onClick={save}><Save size={14}/> SAVE PROGRAM</button>
  </div>
 </div>;
}
