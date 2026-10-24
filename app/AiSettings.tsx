'use client';
import {useEffect,useState} from 'react';
import {Save,Zap} from 'lucide-react';

export type AiState={provider:'none'|'cli'|'anthropic'|'openai';model:string;baseUrl:string;hasKey:boolean;keyFromEnv:boolean;cliAvailable:string|null};
const OPTIONS:{id:AiState['provider'];label:string;help:string}[]=[
 {id:'none',label:'NONE',help:'No AI. You can still copy a report to any assistant and paste the reply into Trainer’s Notes.'},
 {id:'cli',label:'CLAUDE CLI',help:'Uses the Claude Code command-line tool already installed and signed in on this computer (for example with a Claude subscription). No API key needed.'},
 {id:'anthropic',label:'ANTHROPIC API',help:'Uses your own Anthropic API key. The provider bills you directly under its own terms.'},
 {id:'openai',label:'OPENAI-COMPATIBLE',help:'Works with OpenAI, OpenRouter, and local servers such as Ollama or LM Studio. For Ollama use http://localhost:11434/v1 (no key needed).'}
];

export default function AiSettings({notify,onChanged}:{notify:(m:string)=>void;onChanged:()=>void}){
 const [cfg,setCfg]=useState<AiState|null>(null);
 const [provider,setProvider]=useState<AiState['provider']>('none');
 const [model,setModel]=useState('');const [baseUrl,setBaseUrl]=useState('');const [apiKey,setApiKey]=useState('');
 const [busy,setBusy]=useState(false);const [result,setResult]=useState<{ok:boolean;text:string}|null>(null);

 const load=async()=>{try{const r=await fetch('/api/ai/config',{cache:'no-store'});const j=await r.json();setCfg(j);setProvider(j.provider);setModel(j.model);setBaseUrl(j.baseUrl)}catch{}};
 useEffect(()=>{load()},[]);

 async function save(clearKey=false){
  setBusy(true);setResult(null);
  try{const r=await fetch('/api/ai/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,model,baseUrl,apiKey,clearKey})});const j=await r.json();if(!r.ok)throw new Error(j.error);setApiKey('');await load();onChanged();notify(clearKey?'API KEY REMOVED':'AI SETTINGS SAVED')}
  catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Could not save'})}finally{setBusy(false)}
 }
 async function test(){
  setBusy(true);setResult(null);
  try{
   const s=await fetch('/api/ai/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,model,baseUrl,apiKey})});if(!s.ok)throw new Error((await s.json()).error);setApiKey('');await load();onChanged();
   const r=await fetch('/api/ai/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const j=await r.json();
   setResult(r.ok?{ok:true,text:`Connected (${j.label}). The test message contained no personal data.`}:{ok:false,text:j.error});
  }catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Test failed'})}finally{setBusy(false)}
 }
 const help=OPTIONS.find(o=>o.id===provider)?.help;
 return <div className="ai-settings">
  <h3>AI TRAINER <i className="opt">OPTIONAL</i></h3>
  <p className="note-sm">Entirely optional. Nothing is ever sent automatically: only when you click <b>Ask AI trainer</b> on a confirmed workout, and you are asked to confirm each time. The report contains your goals, limitations, workouts, notes and metrics. Third-party services may charge you directly; IRON STANDARD itself is free and has no AI service of its own.</p>
  <div className="seg" role="radiogroup" aria-label="AI provider">
   {OPTIONS.map(o=><button type="button" key={o.id} role="radio" aria-checked={provider===o.id} className={provider===o.id?'on':''} onClick={()=>{setProvider(o.id);setResult(null)}}>{o.label}</button>)}
  </div>
  <p className="note-sm">{help}</p>
  {provider==='cli'&&<p className={'ai-status '+(cfg?.cliAvailable?'ok':'bad')}>{cfg?.cliAvailable?`Found: ${cfg.cliAvailable}`:'Claude CLI not found on this computer. Install Claude Code and sign in, or choose an API provider.'}</p>}
  {(provider==='anthropic'||provider==='openai')&&<div className="field-grid">
   <label>MODEL <i className="opt">{provider==='anthropic'?'DEFAULT claude-sonnet-5-5':'DEFAULT gpt-4o-mini'}</i><input value={model} maxLength={100} placeholder={provider==='anthropic'?'claude-sonnet-5-5':'gpt-4o-mini'} onChange={e=>setModel(e.target.value)}/></label>
   <label>BASE URL <i className="opt">OPTIONAL</i><input value={baseUrl} maxLength={200} placeholder={provider==='anthropic'?'https://api.anthropic.com':'https://api.openai.com/v1'} onChange={e=>setBaseUrl(e.target.value)}/></label>
   <label className="full">API KEY <i className="opt">{cfg?.keyFromEnv?'SET VIA AI_API_KEY ENVIRONMENT VARIABLE':cfg?.hasKey?'A KEY IS SAVED (HIDDEN). TYPE TO REPLACE':'NOT SET'}</i>
    <input type="password" autoComplete="off" value={apiKey} placeholder={cfg?.hasKey?'••••••••':'paste your key'} onChange={e=>setApiKey(e.target.value)}/></label>
   <p className="note-sm full">Your key is stored only in <code>data/ai.json</code> on this computer. It is never included in exports or backups, and never sent anywhere except the provider above. You can also set the <code>AI_API_KEY</code> environment variable instead.</p>
  </div>}
  <div className="profile-actions">
   <button type="button" className="save" disabled={busy} onClick={()=>save()}><Save size={14}/> SAVE AI SETTINGS</button>
   {provider!=='none'&&<button type="button" className="ghost" disabled={busy} onClick={test}><Zap size={14}/> TEST CONNECTION</button>}
   {cfg?.hasKey&&!cfg.keyFromEnv&&<button type="button" className="ghost" disabled={busy} onClick={()=>save(true)}>REMOVE SAVED KEY</button>}
  </div>
  {result&&<p className={'ai-status '+(result.ok?'ok':'bad')} role="status">{result.text}</p>}
 </div>;
}
