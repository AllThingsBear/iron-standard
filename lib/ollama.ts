import {getAiConfig} from './ai';

// Talks to a LOCAL Ollama server only (loopback hosts). Used to list installed models and to create the app-scoped
// "iron-standard-trainer" variant with a larger context window, so users never touch environment variables.
export const TRAINER_MODEL='iron-standard-trainer';
export const TRAINER_CTX=16384;
const DEFAULT_ORIGIN='http://localhost:11434';
const LOOPBACK=/^(localhost|127\.0\.0\.1|\[::1\])$/i;

export function ollamaOrigin():string{
  const base=getAiConfig().baseUrl;
  try{const u=new URL(base);if(LOOPBACK.test(u.hostname))return `${u.protocol}//${u.host}`}catch{}
  return DEFAULT_ORIGIN;
}

export async function listModels(){
  const origin=ollamaOrigin();
  try{
    const r=await fetch(`${origin}/api/tags`,{signal:AbortSignal.timeout(5000)});
    if(!r.ok)return {running:false as const,origin,error:`Ollama answered with HTTP ${r.status}`};
    const j=await r.json();
    const models=(j.models||[]).map((m:any)=>({name:String(m.name),sizeGb:Math.round((Number(m.size)||0)/1e8)/10}));
    return {running:true as const,origin,models};
  }catch{
    return {running:false as const,origin,error:'Could not reach Ollama. Make sure it is installed and running.'};
  }
}

export async function prepareTrainerModel(from:string){
  if(!/^[A-Za-z0-9._:\/@-]{1,100}$/.test(from))throw new Error('Invalid model name');
  const origin=ollamaOrigin();
  let r:Response;
  try{r=await fetch(`${origin}/api/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:TRAINER_MODEL,from,parameters:{num_ctx:TRAINER_CTX},stream:false}),signal:AbortSignal.timeout(120000)})}
  catch{throw new Error('Could not reach Ollama. Make sure it is installed and running.')}
  if(!r.ok){let m='';try{m=(await r.json()).error||''}catch{}throw new Error(`Ollama could not create the model${m?`: ${String(m).slice(0,200)}`:` (HTTP ${r.status})`}`)}
  return {model:TRAINER_MODEL,baseUrl:`${origin}/v1`};
}
