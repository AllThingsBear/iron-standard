import {getProfile,saveProfile,chooseProgram} from '../../../lib/settings';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(){return Response.json(getProfile())}
export async function POST(req:Request){
 try{const {profile,programChoice}=await req.json();
 if(typeof profile!=='object'||profile===null)return Response.json({error:'Invalid profile'},{status:400});
 const wasOnboarded=getProfile().onboarded;
 // A program is only (re)chosen during first-run setup so a stray request can never overwrite a user's program.
 if(!wasOnboarded&&(programChoice==='starter'||programChoice==='empty'))chooseProgram(programChoice);
 return Response.json({ok:true,profile:saveProfile(profile)});}catch{return Response.json({error:'Invalid request'},{status:400});}
}
