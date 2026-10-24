import type {Exercise} from './program';
import type {Units} from './units';

// Offline, rule-based weight suggestions. Deliberately conservative: it only ever changes WEIGHT (never sets/volume),
// never progresses on unrecorded or reported pain, and a human or trainer pick always wins while it is current.
export type HistSet={day:string;exercise_id:string;set_no:number;weight:number|null;reps:number|null;pain:number|null;notes?:string|null};
export type TrainerRec={exercise_id:string;weight:number|null;reps:string|null;note:string|null;author:string;created_at:string};
export type Rec={kind:'progress'|'repeat'|'hold'|'regress'|'start'|'time'|'bodyweight'|'trainer';source:'auto'|'trainer';weight:number|null;targetReps:string;reason:string;last?:{day:string;summary:string}};

const PAIN_WORDS=/pain|hurt|ache|aching|sore|tingl|numb|sharp|burn|pinch|strain|twinge|clicking/i;
const NEGATED=/\b(no|not|without|zero|0)\s+(\w+\s+){0,2}(pain|hurt|ache|soreness|tingling|numbness|discomfort)/gi;
const mentionsPain=(t?:string|null)=>!!t&&PAIN_WORDS.test(t.replace(NEGATED,''));

const parseRange=(reps:string)=>{
  const timed=/sec|min/i.test(reps);
  const m=reps.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if(m)return {lo:+m[1],hi:+m[2],timed};
  const s=reps.match(/(\d+)/);
  return s?{lo:+s[1],hi:+s[1],timed}:{lo:8,hi:12,timed};
};
const roundTo=(x:number,step:number)=>Math.round(x/step)*step;
const dayDiff=(a:string,b:string)=>Math.round((Date.parse(a)-Date.parse(b))/86400000);
const clean=(n:number)=>String(Math.round(n*10)/10);

export function recommend(e:Exercise,history:HistSet[],trainer:TrainerRec|undefined,units:Units,date:string):Rec{
  const wu=units==='metric'?'kg':'lb';
  const range=parseRange(e.reps);
  const past=history.filter(s=>s.exercise_id===e.id&&s.day<date&&s.reps!=null);
  const lastDay=past.reduce((m,s)=>s.day>m?s.day:m,'');
  const last=past.filter(s=>s.day===lastDay).sort((a,b)=>a.set_no-b.set_no);
  const lastInfo=last.length?{day:lastDay,summary:`${(()=>{const w=last.map(s=>s.weight).filter((x):x is number=>x!=null);return w.length?`${clean(Math.max(...w))} ${wu}`:'bodyweight'})()} × ${last.map(s=>s.reps).join('/')} · pain ${last.some(s=>s.pain==null)?'not recorded':clean(Math.max(...last.map(s=>s.pain||0)))}`}:undefined;

  // A current trainer/human pick wins (it expires once a newer session of this exercise is logged).
  if(trainer&&(!lastDay||trainer.created_at.slice(0,10)>=lastDay)){
    return {kind:'trainer',source:'trainer',weight:trainer.weight,targetReps:trainer.reps||e.reps,reason:trainer.note||`Set by ${trainer.author}.`,last:lastInfo};
  }
  const target=`${e.sets} × ${e.reps}`;
  if(!last.length)return {kind:'start',source:'auto',weight:null,targetReps:target,reason:`No history yet. Choose a weight you can lift for ${range.lo} clean reps with 2–3 reps still in the tank, and keep it pain-free.`};

  const weights=last.map(s=>s.weight).filter((x):x is number=>x!=null&&x>0);
  const painUnknown=last.some(s=>s.pain==null);
  const maxPain=Math.max(0,...last.map(s=>s.pain||0));
  const noteFlag=last.some(s=>mentionsPain(s.notes));
  const allTop=last.every(s=>(s.reps||0)>=range.hi)&&last.length>=Math.min(e.sets,2);
  const stale=dayDiff(date,lastDay)>21;
  const step=units==='metric'?1:2.5, inc=units==='metric'?2.5:5;

  if(!weights.length){
    return {kind:'bodyweight',source:'auto',weight:null,targetReps:target,last:lastInfo,
      reason:maxPain>=4?`Pain ${maxPain}/10 last time. Use an easier variation and stay pain-free.`:allTop&&maxPain<=1&&!painUnknown&&!noteFlag?`You reached ${range.hi} reps on every set. Make it harder with a slower lowering (3 s) or a harder variation, not more sets.`:`Repeat it and aim to add a rep per set toward ${range.hi}.`};
  }
  const w=Math.max(...weights);
  if(range.timed)return {kind:'time',source:'auto',weight:w,targetReps:target,last:lastInfo,reason:'Build duration before adding load. Keep the same weight.'};
  if(maxPain>=4)return {kind:'regress',source:'auto',weight:Math.max(step,roundTo(w*0.8,step)),targetReps:target,last:lastInfo,reason:`Pain reached ${maxPain}/10 last time. Drop the load about 20% and keep every rep pain-free. Consider asking a clinician if it keeps happening.`};
  if(maxPain>=2||noteFlag||painUnknown)return {kind:'hold',source:'auto',weight:w,targetReps:target,last:lastInfo,
    reason:maxPain>=2?`Pain ${maxPain}/10 last time. Repeat the same weight and don't progress until it is 0–1.`:noteFlag?'Your notes mention pain or discomfort. Repeat the same weight and log a pain number so progress can be judged.':'Pain was not recorded last time. Repeat the same weight and log a pain number (0 = none).'};
  if(stale)return {kind:'repeat',source:'auto',weight:Math.max(step,roundTo(w*0.9,step)),targetReps:target,last:lastInfo,reason:`It has been over 3 weeks. Ease back in at about 90% of your last weight.`};
  if(allTop)return {kind:'progress',source:'auto',weight:w+inc,targetReps:`${e.sets} × ${range.lo}–${range.hi}`,last:lastInfo,reason:`You hit ${range.hi} reps on every set pain-free. Add one small step (${inc} ${wu}) and rebuild the reps.`};
  return {kind:'repeat',source:'auto',weight:w,targetReps:target,last:lastInfo,reason:`Same weight. Aim to add a rep per set toward ${range.hi}, pain-free.`};
}
