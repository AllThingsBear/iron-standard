import {saveProgram,chooseProgram,getProgram} from '../../../lib/settings';
export const runtime='nodejs'; export const dynamic='force-dynamic';
// Saving or resetting the program never deletes logged workouts; logs are keyed by exercise id.
export async function POST(req:Request){
 try{const body=await req.json();
 if(body?.reset==='starter'){chooseProgram('starter');return Response.json({ok:true,program:getProgram()})}
 return Response.json({ok:true,program:saveProgram(body?.program)});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid request'},{status:400});}
}
