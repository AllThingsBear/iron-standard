import {listModels,prepareTrainerModel} from '../../../../lib/ollama';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function POST(req:Request){
 try{
  const {action,from}=await req.json();
  if(action==='models')return Response.json(await listModels());
  if(action==='prepare')return Response.json({ok:true,...await prepareTrainerModel(String(from||''))});
  return Response.json({error:'Unknown action'},{status:400});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Request failed'},{status:400})}
}
