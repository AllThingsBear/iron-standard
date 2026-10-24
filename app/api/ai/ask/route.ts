import {db} from '../../../../lib/db';
import {buildReport} from '../../../../lib/report';
import {getProgram} from '../../../../lib/settings';
import {callAi,splitReply,systemPrompt} from '../../../../lib/ai';
export const runtime='nodejs'; export const dynamic='force-dynamic';
// Only runs when the user clicks "Ask AI trainer". The reply is saved as an append-only, AI-labelled note.
// Weight picks come back as PROPOSALS; nothing about history, goals or the program is changed here.
export async function POST(req:Request){
 try{
  const {day}=await req.json();
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return Response.json({error:'Invalid date'},{status:400});
  const prog=getProgram();
  const ex=Object.values(prog.sessions).flatMap(s=>s.exercises);
  const ids=ex.map(e=>`${e.id} (${e.name})`).join(', ')||'(none)';
  const {text,label}=await callAi(systemPrompt(ids),buildReport(day));
  const {note,picks}=splitReply(text,new Set(ex.map(e=>e.id)));
  if(!note)return Response.json({error:'The AI returned no note text.'},{status:502});
  const author=`${label} (AI trainer)`.slice(0,80);
  db().prepare('INSERT INTO trainer_notes(day,author,body) VALUES(?,?,?)').run(day,author,note.slice(0,20000));
  db().prepare(`INSERT INTO session_log(day,sent_at) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET sent_at=excluded.sent_at`).run(day,new Date().toISOString());
  const names=Object.fromEntries(ex.map(e=>[e.id,e.name]));
  return Response.json({ok:true,author,proposals:picks.map(p=>({...p,name:names[p.exercise_id]||p.exercise_id}))});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'The AI request failed'},{status:502})}
}
