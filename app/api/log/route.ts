import {db} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(req: Request){
 try { const {day,exercise_id,done,weight,reps,notes}=await req.json();
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||typeof exercise_id!=='string'||exercise_id.length>80)return Response.json({error:'Invalid entry'}, {status:400});
 const num=(v:unknown)=>v===''||v==null?null:Number(v);
 if(num(weight)!==null && (!Number.isFinite(num(weight))||Number(weight)<0||Number(weight)>500))return Response.json({error:'Invalid weight'},{status:400});
 db().prepare(`INSERT INTO exercise_log(day,exercise_id,done,weight,reps,notes) VALUES(?,?,?,?,?,?) ON CONFLICT(day,exercise_id) DO UPDATE SET done=excluded.done,weight=excluded.weight,reps=excluded.reps,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).run(day,exercise_id,done?1:0,num(weight),String(reps||'').slice(0,120),String(notes||'').slice(0,1000));
 return Response.json({ok:true}); }catch{return Response.json({error:'Invalid request'},{status:400});}
}
