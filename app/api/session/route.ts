import {db} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(req:Request){
 try{const {day,general_note,confirmed}=await req.json();
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return Response.json({error:'Invalid date'},{status:400});
 const note=String(general_note||'').slice(0,4000);
 db().prepare(`INSERT INTO session_log(day,general_note,confirmed_at) VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET general_note=excluded.general_note,confirmed_at=excluded.confirmed_at`).run(day,note,confirmed?new Date().toISOString():null);
 return Response.json({ok:true});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
