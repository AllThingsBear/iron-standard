import {readBackupAsExport,parseExport,applyImport,createBackup} from '../../../../lib/backup';
export const runtime='nodejs'; export const dynamic='force-dynamic';
// Restore = a full replace from a backup file, after taking a safety backup of the current data.
export async function POST(req:Request){
 try{
  const {name}=await req.json();
  const clean=parseExport(readBackupAsExport(String(name||'')));
  const safety=await createBackup('pre-restore');
  const counts=applyImport(clean,'replace');
  return Response.json({ok:true,counts,safety});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Restore failed'},{status:400});}
}
