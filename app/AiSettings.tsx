'use client';
import {useEffect,useState} from 'react';
import {Save,Zap,RefreshCw} from 'lucide-react';

export type AiState={provider:'none'|'cli'|'anthropic'|'openai';model:string;baseUrl:string;hasKey:boolean;keyFromEnv:boolean;cliAvailable:string|null};
type Ui='none'|'cli'|'anthropic'|'openai'|'ollama';
type OllamaInfo={running:boolean;error?:string;models?:{name:string;sizeGb:number}[]};
const DOCS='https://github.com/AllThingsBear/iron-standard/blob/main/docs/AI_SETUP.md';
const TRAINER='iron-standard-trainer';
const OLLAMA_URL='http://localhost:11434/v1';
const isOllamaUrl=(u:string)=>/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):11434(\/|$)/i.test(u);

const OPTIONS:{id:Ui;label:string;help:string}[]=[
 {id:'none',label:'NONE',help:'No AI. You can still copy a report to any assistant and paste the reply into Trainer’s Notes.'},
 {id:'cli',label:'CLAUDE CLI',help:'Uses the Claude Code command-line tool already installed and signed in on this computer (for example with a Claude subscription). No API key needed.'},
 {id:'anthropic',label:'ANTHROPIC API',help:'Uses your own Anthropic API key. The provider bills you directly under its own terms.'},
 {id:'openai',label:'OPENAI-COMPATIBLE',help:'Works with OpenAI, OpenRouter, LM Studio and other services that speak the OpenAI API. Bring your own key.'},
 {id:'ollama',label:'OLLAMA (LOCAL)',help:'Runs an open model on this computer with Ollama. Free and private: your reports never leave your machine. Needs a reasonably modern graphics card for good speed.'}
];

export default function AiSettings({notify,onChanged}:{notify:(m:string)=>void;onChanged:()=>void}){
 const [cfg,setCfg]=useState<AiState|null>(null);
 const [ui,setUi]=useState<Ui>('none');
 const [model,setModel]=useState('');const [baseUrl,setBaseUrl]=useState('');const [apiKey,setApiKey]=useState('');
 const [busy,setBusy]=useState(false);const [result,setResult]=useState<{ok:boolean;text:string}|null>(null);
 const [ol,setOl]=useState<OllamaInfo|null>(null);const [base,setBase]=useState('');

 const post=async(path:string,body:unknown)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));return {ok:r.ok,j}};
 const checkOllama=async()=>{setOl(null);const {j}=await post('/api/ai/ollama',{action:'models'});setOl(j);const names:string[]=(j.models||[]).map((m:{name:string})=>m.name);setBase(b=>b&&names.includes(b)?b:(names.find(n=>/^gemma4:12b/.test(n))||names.find(n=>n!==TRAINER&&!n.startsWith(TRAINER+':'))||''))};
 const load=async()=>{try{const r=await fetch('/api/ai/config',{cache:'no-store'});const j:AiState=await r.json();setCfg(j);setModel(j.model);setBaseUrl(j.baseUrl);setUi(j.provider==='openai'&&isOllamaUrl(j.baseUrl)?'ollama':j.provider);if(j.provider==='openai'&&isOllamaUrl(j.baseUrl))checkOllama()}catch{}};
 useEffect(()=>{load()},[]);
 const choose=(id:Ui)=>{setUi(id);setResult(null);if(id==='ollama')checkOllama()};

 const effective=()=>ui==='ollama'?{provider:'openai' as const,baseUrl:isOllamaUrl(baseUrl)?baseUrl:OLLAMA_URL,model:model||TRAINER}:{provider:ui as AiState['provider'],baseUrl,model};
 async function save(clearKey=false){
  setBusy(true);setResult(null);
  try{const {ok,j}=await post('/api/ai/config',{...effective(),apiKey,clearKey});if(!ok)throw new Error(j.error);setApiKey('');await load();onChanged();notify(clearKey?'API KEY REMOVED':'AI SETTINGS SAVED')}
  catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Could not save'})}finally{setBusy(false)}
 }
 async function test(){
  setBusy(true);setResult(null);
  try{
   const s=await post('/api/ai/config',{...effective(),apiKey});if(!s.ok)throw new Error(s.j.error);setApiKey('');await load();onChanged();
   const {ok,j}=await post('/api/ai/test',{});
   setResult(ok?{ok:true,text:`Connected (${j.label}). The test message contained no personal data.`}:{ok:false,text:j.error});
  }catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Test failed'})}finally{setBusy(false)}
 }
 async function prepare(){
  if(!base)return;
  setBusy(true);setResult(null);
  try{
   const p=await post('/api/ai/ollama',{action:'prepare',from:base});if(!p.ok)throw new Error(p.j.error);
   const s=await post('/api/ai/config',{provider:'openai',baseUrl:p.j.baseUrl,model:p.j.model});if(!s.ok)throw new Error(s.j.error);
   setModel(p.j.model);setBaseUrl(p.j.baseUrl);await load();onChanged();
   const t=await post('/api/ai/test',{});
   setResult(t.ok?{ok:true,text:`Ready. "${p.j.model}" was created from ${base} with a large context window and is now your AI trainer. ${t.j.label} answered the test message.`}:{ok:false,text:`Model created, but the test failed: ${t.j.error}`});
   await checkOllama();
  }catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Setup failed'})}finally{setBusy(false)}
 }
 const help=OPTIONS.find(o=>o.id===ui)?.help;
 const bases=(ol?.models||[]).filter(m=>m.name!==TRAINER&&!m.name.startsWith(TRAINER+':'));
 const ready=(ol?.models||[]).some(m=>m.name===TRAINER||m.name.startsWith(TRAINER+':'));
 return <div className="ai-settings">
  <h3>AI TRAINER <i className="opt">OPTIONAL</i></h3>
  <p className="note-sm">Entirely optional. Nothing is ever sent automatically: only when you click <b>Ask AI trainer</b> on a confirmed workout, and you are asked to confirm each time. The report contains your goals, limitations, workouts, notes and metrics. Third-party services may charge you directly; IRON STANDARD itself is free and has no AI service of its own. <a href={DOCS} target="_blank" rel="noreferrer">Full setup guide</a></p>
  <div className="seg" role="radiogroup" aria-label="AI provider">
   {OPTIONS.map(o=><button type="button" key={o.id} role="radio" aria-checked={ui===o.id} className={ui===o.id?'on':''} onClick={()=>choose(o.id)}>{o.label}</button>)}
  </div>
  <p className="note-sm">{help}</p>

  {ui==='cli'&&<p className={'ai-status '+(cfg?.cliAvailable?'ok':'bad')}>{cfg?.cliAvailable?`Found: ${cfg.cliAvailable}`:'Claude CLI not found on this computer. Install Claude Code and sign in, or choose another option.'}</p>}

  {ui==='ollama'&&<div className="ollama-box">
   {!ol&&<p className="ai-status">Checking for Ollama…</p>}
   {ol&&!ol.running&&<div className="ai-status bad">Ollama was not found running on this computer. Install it from <b>ollama.com/download</b> (free), open it, then click Check again. Step-by-step: <a href={DOCS} target="_blank" rel="noreferrer">setup guide</a>.</div>}
   {ol?.running&&bases.length===0&&<div className="ai-status bad">Ollama is running, but no model is installed yet. In a terminal run <code>ollama pull gemma4:12b</code> (about 8 GB, needs roughly a 16 GB graphics card), then click Check again. Smaller cards: see the setup guide.</div>}
   {ol?.running&&bases.length>0&&<>
    <p className="ai-status ok">Ollama is running · {bases.length} model{bases.length===1?'':'s'} installed{ready?' · IRON STANDARD trainer model is ready':''}</p>
    <label className="full">BASE MODEL
     <select value={base} onChange={e=>setBase(e.target.value)}>{bases.map(m=><option key={m.name} value={m.name}>{m.name} ({m.sizeGb} GB)</option>)}</select></label>
    <p className="note-sm">This creates a copy named <code>{TRAINER}</code> that uses the same downloaded model with a larger memory window (Ollama&apos;s default is too small for a full report). It takes almost no extra disk space and does not change how other apps use Ollama.</p>
   </>}
   <div className="profile-actions">
    {ol?.running&&bases.length>0&&<button type="button" className="save" disabled={busy||!base} onClick={prepare}><Zap size={14}/> {ready?'RE-CREATE & USE':'SET UP FOR IRON STANDARD'}</button>}
    <button type="button" className="ghost" disabled={busy} onClick={checkOllama}><RefreshCw size={14}/> CHECK AGAIN</button>
   </div>
  </div>}

  {(ui==='anthropic'||ui==='openai')&&<div className="field-grid">
   <label>MODEL <i className="opt">{ui==='anthropic'?'DEFAULT claude-sonnet-5-5':'DEFAULT gpt-4o-mini'}</i><input value={model} maxLength={100} placeholder={ui==='anthropic'?'claude-sonnet-5-5':'gpt-4o-mini'} onChange={e=>setModel(e.target.value)}/></label>
   <label>BASE URL <i className="opt">OPTIONAL</i><input value={baseUrl} maxLength={200} placeholder={ui==='anthropic'?'https://api.anthropic.com':'https://api.openai.com/v1'} onChange={e=>setBaseUrl(e.target.value)}/></label>
   <label className="full">API KEY <i className="opt">{cfg?.keyFromEnv?'SET VIA AI_API_KEY ENVIRONMENT VARIABLE':cfg?.hasKey?'A KEY IS SAVED (HIDDEN). TYPE TO REPLACE':'NOT SET'}</i>
    <input type="password" autoComplete="off" value={apiKey} placeholder={cfg?.hasKey?'••••••••':'paste your key'} onChange={e=>setApiKey(e.target.value)}/></label>
   <p className="note-sm full">Your key is stored only in <code>data/ai.json</code> on this computer. It is never included in exports or backups, and never sent anywhere except the provider above. You can also set the <code>AI_API_KEY</code> environment variable instead.</p>
  </div>}

  <div className="profile-actions">
   {ui!=='ollama'&&<button type="button" className="save" disabled={busy} onClick={()=>save()}><Save size={14}/> SAVE AI SETTINGS</button>}
   {ui==='ollama'&&ready&&<button type="button" className="save" disabled={busy} onClick={()=>save()}><Save size={14}/> USE OLLAMA</button>}
   {ui!=='none'&&<button type="button" className="ghost" disabled={busy} onClick={test}><Zap size={14}/> TEST CONNECTION</button>}
   {cfg?.hasKey&&!cfg.keyFromEnv&&ui!=='ollama'&&<button type="button" className="ghost" disabled={busy} onClick={()=>save(true)}>REMOVE SAVED KEY</button>}
  </div>
  {result&&<p className={'ai-status '+(result.ok?'ok':'bad')} role="status">{result.text}</p>}
 </div>;
}
