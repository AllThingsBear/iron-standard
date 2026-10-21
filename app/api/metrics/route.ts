import {db} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(req:Request){
 try{const {day,calories,protein,walk_minutes,weight,waist,notes}=await req.json();
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return Response.json({error:'Invalid date'},{status:400});
 const fields=[calories,protein,walk_minutes,weight,waist].map(v=>v===''||v==null?null:Number(v));
 if(fields.some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>10000)))return Response.json({error:'Invalid number'},{status:400});
 db().prepare(`INSERT INTO daily_log(day,calories,protein,walk_minutes,weight,waist,notes) VALUES(?,?,?,?,?,?,?) ON CONFLICT(day) DO UPDATE SET calories=excluded.calories,protein=excluded.protein,walk_minutes=excluded.walk_minutes,weight=excluded.weight,waist=excluded.waist,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`).run(day,...fields,String(notes||'').slice(0,2000));
 return Response.json({ok:true});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
