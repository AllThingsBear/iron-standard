import {getAiConfig,saveAiConfig} from '../../../../lib/ai';
export const runtime='nodejs'; export const dynamic='force-dynamic';
// The API key is write-only: it is never sent back to the browser.
export async function GET(){return Response.json(getAiConfig())}
export async function POST(req:Request){
 try{saveAiConfig(await req.json());return Response.json({ok:true,...getAiConfig()})}
 catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid request'},{status:400})}
}
