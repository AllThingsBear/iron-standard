import {gatherExport,setsCsv} from '../../../lib/backup';
export const runtime='nodejs'; export const dynamic='force-dynamic';
const stamp=()=>new Date().toISOString().slice(0,10);
export async function GET(req:Request){
 const format=new URL(req.url).searchParams.get('format');
 if(format==='csv')return new Response(setsCsv(),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="iron-standard-sets-${stamp()}.csv"`}});
 return new Response(JSON.stringify(gatherExport(),null,1),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="iron-standard-export-${stamp()}.json"`}});
}
