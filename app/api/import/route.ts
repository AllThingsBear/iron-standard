import {parseExport,applyImport,createBackup} from '../../../lib/backup';
export const runtime='nodejs'; export const dynamic='force-dynamic';
const MAX_BYTES=25*1024*1024;
// Validates the whole file first (a bad file changes nothing), takes a safety backup, then applies in one transaction.
export async function POST(req:Request){
 try{
  const text=await req.text();
  if(text.length>MAX_BYTES)return Response.json({error:'File is too large'},{status:413});
  const body=JSON.parse(text);
  const mode=body?.mode==='replace'?'replace':'merge';
  const clean=parseExport(body?.data);
  const backup=await createBackup('pre-import');
  const counts=applyImport(clean,mode);
  return Response.json({ok:true,mode,counts,backup});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Import failed'},{status:400});}
}
