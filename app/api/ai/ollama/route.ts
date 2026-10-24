import {listModels,prepareTrainerModel,hardwareReport,allowedPull,deleteModel,ollamaOrigin} from '../../../../lib/ollama';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function POST(req:Request){
 try{
  const body=await req.json();
  const {action,from}=body;
  if(action==='models')return Response.json(await listModels());
  if(action==='hardware')return Response.json(hardwareReport());
  if(action==='prepare')return Response.json({ok:true,...await prepareTrainerModel(String(from||''))});
  if(action==='remove'){await deleteModel(String(body.model||''));return Response.json({ok:true})}
  if(action==='pull'){
   // Streams Ollama's progress (newline-delimited JSON) straight through. Only models from our own catalog can be pulled.
   const model=String(body.model||'');
   if(!allowedPull(model))return Response.json({error:'That model is not in the recommended list.'},{status:400});
   let up:Response;
   try{up=await fetch(`${ollamaOrigin()}/api/pull`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:true}),signal:req.signal})}
   catch{return Response.json({error:'Could not reach Ollama. Make sure it is installed and running.'},{status:502})}
   if(!up.ok||!up.body)return Response.json({error:`Ollama refused the download (HTTP ${up.status}).`},{status:502});
   return new Response(up.body,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'}});
  }
  return Response.json({error:'Unknown action'},{status:400});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Request failed'},{status:400})}
}
