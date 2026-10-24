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

// ---- hardware detection (server only) ----
import os from 'node:os';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {CATALOG,recommendModel,Hardware} from './localAi';

export function detectHardware():Hardware{
  const ramGb=Math.round(os.totalmem()/2**30);
  let gpu:Hardware['gpu']=null;
  try{
    const r=spawnSync('nvidia-smi',['--query-gpu=name,memory.total','--format=csv,noheader,nounits'],{encoding:'utf8',timeout:6000,windowsHide:true});
    if(r.status===0)for(const line of String(r.stdout).split('\n')){
      const [name,mib]=line.split(',').map(s=>s.trim());const gb=Number(mib)/1024;
      if(name&&Number.isFinite(gb)&&(!gpu||gb>gpu.vramGb))gpu={name,vramGb:Math.round(gb*10)/10};
    }
  }catch{}
  const adapters:string[]=[];
  if(!gpu&&process.platform==='win32'){
    try{const r=spawnSync('powershell',['-NoProfile','-Command','(Get-CimInstance Win32_VideoController).Name'],{encoding:'utf8',timeout:8000,windowsHide:true});
      if(r.status===0)for(const l of String(r.stdout).split('\n').map(s=>s.trim()).filter(Boolean))adapters.push(l)}catch{}
  }
  let freeDiskGb:number|null=null;
  try{const s=fs.statfsSync(os.homedir());freeDiskGb=Math.round(Number(s.bavail)*Number(s.bsize)/2**30)}catch{}
  return {gpu,adapters,ramGb,freeDiskGb,platform:process.platform,appleSilicon:process.platform==='darwin'&&process.arch==='arm64'};
}
export function hardwareReport(){const hardware=detectHardware();return {hardware,recommendation:recommendModel(hardware),catalog:CATALOG}}
export const allowedPull=(tag:string)=>CATALOG.some(m=>m.tag===tag);
export const allowedDelete=(tag:string)=>tag===TRAINER_MODEL||allowedPull(tag);

export async function deleteModel(tag:string){
  if(!allowedDelete(tag))throw new Error('That model cannot be deleted from here.');
  const r=await fetch(`${ollamaOrigin()}/api/delete`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:tag}),signal:AbortSignal.timeout(30000)}).catch(()=>{throw new Error('Could not reach Ollama.')});
  if(!r.ok&&r.status!==404)throw new Error(`Ollama could not delete the model (HTTP ${r.status}).`);
}
