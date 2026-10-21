import {db} from '../../../lib/db';
export const runtime='nodejs';
const DAY=/^\d{4}-\d{2}-\d{2}$/;
// Notes are append-only: feedback never edits workouts, goals or the program.
export async function POST(req:Request){
 try{const {day,author,body}=await req.json();
 const text=String(body||'').trim();
 if(typeof day!=='string'||!DAY.test(day)||!text)return Response.json({error:'Invalid note'},{status:400});
 const who=String(author||'AI trainer (pasted)').trim().slice(0,80)||'AI trainer (pasted)';
 db().prepare('INSERT INTO trainer_notes(day,author,body) VALUES(?,?,?)').run(day,who,text.slice(0,20000));
 return Response.json({ok:true});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
export async function DELETE(req:Request){
 try{const {id}=await req.json();
 if(!Number.isInteger(id))return Response.json({error:'Invalid id'},{status:400});
 db().prepare('DELETE FROM trainer_notes WHERE id=?').run(id);
 return Response.json({ok:true});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
