import {db} from '../../../lib/db';
export const runtime='nodejs';
const n=(v:unknown,max:number,int=false)=>{if(v===''||v==null)return null;const x=Number(v);if(!Number.isFinite(x)||x<0||x>max||(int&&!Number.isInteger(x)))throw new Error('bad');return x};
export async function POST(req:Request){
 try{const {day,exercise_id,sets}=await req.json();
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||typeof exercise_id!=='string'||exercise_id.length>80||!Array.isArray(sets)||sets.length>20)return Response.json({error:'Invalid entry'},{status:400});
 const rows=sets.map((s:any,i:number)=>({no:i+1,weight:n(s.weight,500),reps:n(s.reps,500,true),pain:n(s.pain,10,true),notes:String(s.notes||'').slice(0,500)}));
 const d=db();
 d.transaction(()=>{d.prepare('DELETE FROM set_log WHERE day=? AND exercise_id=?').run(day,exercise_id);
  const ins=d.prepare('INSERT INTO set_log(day,exercise_id,set_no,weight,reps,pain,notes) VALUES(?,?,?,?,?,?,?)');
  for(const r of rows)ins.run(day,exercise_id,r.no,r.weight,r.reps,r.pain,r.notes)})();
 return Response.json({ok:true});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
