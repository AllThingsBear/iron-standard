import {createBackup,listBackups,dataInfo} from '../../../lib/backup';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){return Response.json({info:dataInfo(),backups:listBackups()})}
export async function POST(){
 try{const name=await createBackup('manual');return Response.json({ok:true,name,backups:listBackups()})}
 catch{return Response.json({error:'Backup failed'},{status:500})}
}
