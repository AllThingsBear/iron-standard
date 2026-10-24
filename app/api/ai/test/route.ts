import {callAi} from '../../../../lib/ai';
export const runtime='nodejs'; export const dynamic='force-dynamic';
// Sends a tiny fixed message (no personal data) to confirm the provider works.
export async function POST(){
 try{const r=await callAi('You are a connectivity test. Reply with the single word OK.','Reply with the single word OK.',20);
  return Response.json({ok:true,label:r.label,reply:r.text.slice(0,40)})}
 catch(e){return Response.json({error:e instanceof Error?e.message:'Test failed'},{status:400})}
}
