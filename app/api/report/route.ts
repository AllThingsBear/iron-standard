import fs from 'node:fs';
import path from 'node:path';
import {db,dataDir} from '../../../lib/db';
import {buildReport} from '../../../lib/report';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function POST(req:Request){
 try{const {day}=await req.json();
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return Response.json({error:'Invalid date'},{status:400});
 const text=buildReport(day);
 const dir=path.join(dataDir,'reports');fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,`trainer-report-${day}.md`);fs.writeFileSync(file,text,'utf8');
 db().prepare(`INSERT INTO session_log(day,sent_at) VALUES(?,?) ON CONFLICT(day) DO UPDATE SET sent_at=excluded.sent_at`).run(day,new Date().toISOString());
 return Response.json({ok:true,text,file});}catch{return Response.json({error:'Report failed'},{status:500});}
}
