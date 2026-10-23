import fs from 'node:fs';
import path from 'node:path';
import {BACKUP_DIR,BACKUP_NAME} from '../../../../lib/backup';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;
 if(!BACKUP_NAME.test(name))return Response.json({error:'Invalid backup name'},{status:400});
 const file=path.join(BACKUP_DIR(),name);
 if(!fs.existsSync(file))return Response.json({error:'Not found'},{status:404});
 return new Response(fs.readFileSync(file),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${name}"`}});
}
