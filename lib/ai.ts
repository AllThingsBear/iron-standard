import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {dataDir} from './db';

// Optional AI trainer. Nothing here runs unless the user configures a provider AND clicks "Ask AI trainer".
// The API key lives in data/ai.json (git-ignored, never part of exports or database backups) or the AI_API_KEY env var.
export type Provider='none'|'cli'|'anthropic'|'openai';
export type AiConfig={provider:Provider;model:string;baseUrl:string};
const FILE=()=>path.join(dataDir,'ai.json');
const PROVIDERS:Provider[]=['none','cli','anthropic','openai'];

type Stored=AiConfig&{apiKey?:string};
function readStored():Stored{
  try{const j=JSON.parse(fs.readFileSync(FILE(),'utf8'));return {provider:PROVIDERS.includes(j.provider)?j.provider:'none',model:String(j.model||''),baseUrl:String(j.baseUrl||''),apiKey:j.apiKey?String(j.apiKey):undefined}}
  catch{return {provider:'none',model:'',baseUrl:''}}
}
export function getAiConfig(){
  const s=readStored();
  return {provider:s.provider,model:s.model,baseUrl:s.baseUrl,hasKey:!!(process.env.AI_API_KEY||s.apiKey),keyFromEnv:!!process.env.AI_API_KEY,cliAvailable:cliVersion()};
}
export function saveAiConfig(input:any){
  const cur=readStored();
  const provider:Provider=PROVIDERS.includes(input?.provider)?input.provider:cur.provider;
  const model=String(input?.model??cur.model).trim().slice(0,100);
  if(model&&!/^[A-Za-z0-9._:\/@-]+$/.test(model))throw new Error('Model name contains invalid characters');
  let baseUrl=String(input?.baseUrl??cur.baseUrl).trim().replace(/\/+$/,'').slice(0,200);
  if(baseUrl){let u:URL;try{u=new URL(baseUrl)}catch{throw new Error('Base URL is not a valid URL')}if(u.protocol!=='https:'&&u.protocol!=='http:')throw new Error('Base URL must start with http:// or https://')}
  let apiKey=cur.apiKey;
  if(input?.clearKey)apiKey=undefined;
  else if(typeof input?.apiKey==='string'&&input.apiKey.trim())apiKey=input.apiKey.trim().slice(0,400);
  fs.mkdirSync(dataDir,{recursive:true});
  fs.writeFileSync(FILE(),JSON.stringify({provider,model,baseUrl,...(apiKey?{apiKey}:{})},null,1),{mode:0o600});
  try{fs.chmodSync(FILE(),0o600)}catch{}
}

let cliCache:{v:string|null;t:number}|null=null;
export function cliVersion():string|null{
  if(cliCache&&Date.now()-cliCache.t<60000)return cliCache.v;
  let v:string|null=null;
  try{const r=spawnSync('claude',['--version'],{timeout:8000,encoding:'utf8',windowsHide:true});if(r.status===0)v=String(r.stdout).trim().split('\n')[0]||'installed'}catch{}
  cliCache={v,t:Date.now()};return v;
}

const MIN=60_000;
function runCli(prompt:string):Promise<string>{
  return new Promise((resolve,reject)=>{
    const cwd=path.join(os.tmpdir(),'iron-standard-ai');fs.mkdirSync(cwd,{recursive:true});
    const args=['-p','--tools','','--no-session-persistence','--output-format','text'];
    const go=(shell:boolean,retry:boolean)=>{
      const p=spawn('claude',shell?['-p','--tools=""','--no-session-persistence','--output-format','text']:args,{cwd,shell,windowsHide:true,stdio:['pipe','pipe','pipe']});
      let out='',err='';const timer=setTimeout(()=>{p.kill();reject(new Error('The Claude CLI took too long (4 minutes) and was stopped.'))},4*MIN);
      p.stdout.setEncoding('utf8');p.stderr.setEncoding('utf8');
      p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
      p.on('error',e=>{clearTimeout(timer);if(!shell&&retry&&process.platform==='win32')return go(true,false);reject(new Error(`Could not run the Claude CLI (${(e as any).code||e.message}). Is "claude" installed and on your PATH?`))});
      p.on('close',code=>{clearTimeout(timer);if(code===0&&out.trim())resolve(out.trim());else reject(new Error(`Claude CLI exited with code ${code}. ${err.trim().slice(0,300)||'Run "claude" in a terminal once to sign in.'}`))});
      p.stdin.on('error',()=>{});p.stdin.end(prompt);
    };
    go(false,true);
  });
}

async function postJson(url:string,headers:Record<string,string>,body:unknown){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(4*MIN)});
  const text=await r.text();let j:any=null;try{j=JSON.parse(text)}catch{}
  if(!r.ok)throw new Error(`The AI service returned ${r.status}: ${String(j?.error?.message||j?.error||text).slice(0,300)}`);
  return j;
}

export async function callAi(system:string,user:string,maxTokens=3000):Promise<{text:string;label:string}>{
  const s=readStored();const key=process.env.AI_API_KEY||s.apiKey||'';
  if(s.provider==='none')throw new Error('No AI trainer is set up. Choose one in PROFILE → AI TRAINER.');
  if(s.provider==='cli'){
    if(!cliVersion())throw new Error('The Claude CLI was not found. Install Claude Code and sign in, or pick an API provider.');
    return {text:await runCli(`${system}\n\n---\n\n${user}`),label:'Claude CLI'};
  }
  if(!key&&!(s.provider==='openai'&&/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(s.baseUrl)))throw new Error('No API key is saved for this provider.');
  if(s.provider==='anthropic'){
    const model=s.model||'claude-sonnet-5-5';
    const base=(s.baseUrl||'https://api.anthropic.com').replace(/\/+$/,'');
    const j=await postJson(`${base}/v1/messages`,{'x-api-key':key,'anthropic-version':'2023-06-01'},{model,max_tokens:maxTokens,system,messages:[{role:'user',content:user}]});
    const text=(j?.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n').trim();
    if(!text)throw new Error('The AI service returned an empty reply.');
    return {text,label:model};
  }
  const model=s.model||'gpt-4o-mini';
  const base=(s.baseUrl||'https://api.openai.com/v1').replace(/\/+$/,'');
  const j=await postJson(`${base}/chat/completions`,key?{Authorization:`Bearer ${key}`}:{},{model,max_tokens:maxTokens,messages:[{role:'system',content:system},{role:'user',content:user}]});
  const text=String(j?.choices?.[0]?.message?.content||'').trim();
  if(!text)throw new Error('The AI service returned an empty reply.');
  return {text,label:model};
}

export type Pick={exercise_id:string;weight:number|null;reps:string;note:string};
// The reply is saved as an AI-labelled note. Weight picks are only PROPOSALS; the user must apply them.
export function splitReply(text:string,validIds:Set<string>):{note:string;picks:Pick[]}{
  const re=/```picks\s*([\s\S]*?)```/i;
  const m=text.match(re);
  const note=text.replace(re,'').trim();
  const picks:Pick[]=[];
  if(m){try{
    const arr=JSON.parse(m[1]);
    if(Array.isArray(arr))for(const r of arr.slice(0,30)){
      const id=String(r?.exercise_id||'');if(!validIds.has(id))continue;
      const w=r.weight===null||r.weight===''||r.weight===undefined?null:Number(r.weight);
      if(w!==null&&(!Number.isFinite(w)||w<0||w>1500))continue;
      picks.push({exercise_id:id,weight:w,reps:String(r.reps||'').slice(0,60),note:String(r.note||'').slice(0,600)});
    }
  }catch{}}
  return {note,picks};
}

export const systemPrompt=(ids:string)=>`You are an experienced, safety-first strength and conditioning coach working inside a private training journal. Follow the limitations and safety rules in the report exactly. You are not a clinician and must say when something needs a professional. Never suggest changing the user's goals or editing their logged history.

Write the reply in plain text (no markdown tables, no preamble) with these sections: VERDICT, NEXT SESSION (specific weights/reps per exercise, in the user's units; progress only when pain-free and the rep range was hit; never add sets casually), CLINICIAN / PT (only if warranted), DATA GAPS, TREND, PROGRAM LEVEL (brief).

After the note, output exactly one fenced code block labelled picks containing a JSON array of proposed next-session weight picks, for example:
\`\`\`picks
[{"exercise_id":"abc","weight":35,"reps":"3 x 8-12","note":"short reason"}]
\`\`\`
Use ONLY these exercise ids: ${ids}. weight is a number in the user's units, or null for bodyweight. Use [] if you have no weight changes.`;
