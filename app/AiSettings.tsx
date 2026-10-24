'use client';
import {useEffect,useRef,useState} from 'react';
import {Save,Zap,RefreshCw,Download,Check,ExternalLink} from 'lucide-react';
import {foldPull,PullProgress,CatalogModel,Hardware,Recommendation} from '../lib/localAi';

export type AiState={provider:'none'|'cli'|'anthropic'|'openai';model:string;baseUrl:string;hasKey:boolean;keyFromEnv:boolean;cliAvailable:string|null};
type Ui='none'|'cli'|'anthropic'|'openai'|'ollama';
type OllamaInfo={running:boolean;error?:string;models?:{name:string;sizeGb:number}[]};
type Hw={hardware:Hardware;recommendation:Recommendation;catalog:CatalogModel[]};
const DOCS='https://github.com/AllThingsBear/iron-standard/blob/main/docs/AI_SETUP.md';
const TRAINER='iron-standard-trainer';
const OLLAMA_URL='http://localhost:11434/v1';
const isOllamaUrl=(u:string)=>/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):11434(\/|$)/i.test(u);
const isTrainer=(n:string)=>n===TRAINER||n.startsWith(TRAINER+':');

const OPTIONS:{id:Ui;label:string;help:string}[]=[
 {id:'none',label:'NONE',help:'No AI. You can still copy a report to any assistant and paste the reply into Trainer’s Notes.'},
 {id:'cli',label:'CLAUDE CLI',help:'Uses the Claude Code command-line tool already installed and signed in on this computer (for example with a Claude subscription). No API key needed.'},
 {id:'anthropic',label:'ANTHROPIC API',help:'Uses your own Anthropic API key. The provider bills you directly under its own terms.'},
 {id:'openai',label:'OPENAI-COMPATIBLE',help:'Works with OpenAI, OpenRouter, LM Studio and other services that speak the OpenAI API. Bring your own key.'},
 {id:'ollama',label:'OLLAMA (LOCAL)',help:'Runs an open model on this computer with Ollama. Free and private: your reports never leave your machine. Needs a reasonably modern graphics card for good speed. Follow the four steps below.'}
];

export default function AiSettings({notify,onChanged}:{notify:(m:string)=>void;onChanged:()=>void}){
 const [cfg,setCfg]=useState<AiState|null>(null);
 const [ui,setUi]=useState<Ui>('none');
 const [model,setModel]=useState('');const [baseUrl,setBaseUrl]=useState('');const [apiKey,setApiKey]=useState('');
 const [busy,setBusy]=useState(false);const [result,setResult]=useState<{ok:boolean;text:string}|null>(null);
 const [ol,setOl]=useState<OllamaInfo|null>(null);
 const [hw,setHw]=useState<Hw|null>(null);
 const [choice,setChoice]=useState('');
 const [pull,setPull]=useState<PullProgress|null>(null);
 const abort=useRef<AbortController|null>(null);

 const post=async(path:string,body:unknown)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));return {ok:r.ok,j}};
 const checkOllama=async()=>{const {j}=await post('/api/ai/ollama',{action:'models'});setOl(j);return j as OllamaInfo};
 const detect=async()=>{setHw(null);const {ok,j}=await post('/api/ai/ollama',{action:'hardware'});if(ok){setHw(j);setChoice(c=>c||j.recommendation.tag||j.catalog[1].tag)}};
 const startOllama=()=>{detect();checkOllama()};
 const load=async()=>{try{const r=await fetch('/api/ai/config',{cache:'no-store'});const j:AiState=await r.json();setCfg(j);setModel(j.model);setBaseUrl(j.baseUrl);const o=j.provider==='openai'&&isOllamaUrl(j.baseUrl);setUi(o?'ollama':j.provider);if(o)startOllama()}catch{}};
 useEffect(()=>{load();return()=>abort.current?.abort()},[]);
 // While Ollama is not running, keep checking so the wizard continues by itself once the user has installed it.
 useEffect(()=>{if(ui!=='ollama'||!ol||ol.running)return;const t=setInterval(()=>{checkOllama()},4000);return()=>clearInterval(t)},[ui,ol?.running,ol===null]);
 const choose=(id:Ui)=>{setUi(id);setResult(null);if(id==='ollama')startOllama()};

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
 async function download(){
  if(!choice)return;
  const ctl=new AbortController();abort.current=ctl;
  const fold={layers:{} as Record<string,{total:number;completed:number}>};
  setResult(null);setPull({status:'starting',pct:0,doneGb:0,totalGb:0,done:false});
  try{
   const r=await fetch('/api/ai/ollama',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'pull',model:choice}),signal:ctl.signal});
   if(!r.ok||!r.body){const j=await r.json().catch(()=>({}));throw new Error(j.error||'The download could not start.')}
   const reader=r.body.getReader();const dec=new TextDecoder();let buf='';let last:PullProgress|null=null;
   for(;;){
    const {value,done}=await reader.read();if(done)break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split('\n');buf=lines.pop()||'';
    for(const ln of lines){if(!ln.trim())continue;let o;try{o=JSON.parse(ln)}catch{continue}
     const p=foldPull(fold,o);last=p;if(p.error)throw new Error(p.error);setPull(p)}
   }
   if(!last?.done)throw new Error('The download ended before it finished. Click Download again to resume.');
   notify('MODEL DOWNLOADED');await checkOllama();setPull(null);
  }catch(e){
   if(ctl.signal.aborted){setPull(null);setResult({ok:false,text:'Download cancelled. Click Download again to resume where it stopped.'})}
   else{setPull(null);setResult({ok:false,text:e instanceof Error?e.message:'Download failed'})}
  }finally{abort.current=null}
 }
 async function prepare(){
  if(!choice)return;
  setBusy(true);setResult(null);
  try{
   const p=await post('/api/ai/ollama',{action:'prepare',from:choice});if(!p.ok)throw new Error(p.j.error);
   const s=await post('/api/ai/config',{provider:'openai',baseUrl:p.j.baseUrl,model:p.j.model});if(!s.ok)throw new Error(s.j.error);
   setModel(p.j.model);setBaseUrl(p.j.baseUrl);await load();onChanged();
   const t=await post('/api/ai/test',{});
   setResult(t.ok?{ok:true,text:`All set. "${p.j.model}" was created from ${choice} and is now your AI trainer. It answered the test message.`}:{ok:false,text:`Model created, but the test failed: ${t.j.error}`});
   await checkOllama();
  }catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Setup failed'})}finally{setBusy(false)}
 }
 async function remove(deleteBase:boolean){
  const what=deleteBase?`Turn off the local AI trainer AND delete the downloaded model "${choice}" to free disk space?`:'Turn off the local AI trainer? The downloaded model stays on disk so you can switch it back on later.';
  if(!window.confirm(what))return;
  setBusy(true);setResult(null);
  try{
   const a=await post('/api/ai/ollama',{action:'remove',model:TRAINER});if(!a.ok)throw new Error(a.j.error);
   if(deleteBase){const b=await post('/api/ai/ollama',{action:'remove',model:choice});if(!b.ok)throw new Error(b.j.error)}
   const s=await post('/api/ai/config',{provider:'none',baseUrl:'',model:''});if(!s.ok)throw new Error(s.j.error);
   setUi('none');setModel('');setBaseUrl('');await load();onChanged();await checkOllama();notify(deleteBase?'LOCAL AI AND MODEL REMOVED':'LOCAL AI TURNED OFF');
  }catch(e){setResult({ok:false,text:e instanceof Error?e.message:'Could not remove'})}finally{setBusy(false)}
 }

 const help=OPTIONS.find(o=>o.id===ui)?.help;
 const installed=new Set((ol?.models||[]).map(m=>m.name));
 const hasModel=(tag:string)=>installed.has(tag)||installed.has(tag+':latest');
 const ready=(ol?.models||[]).some(m=>isTrainer(m.name));
 const catalog=hw?.catalog||[];
 const picked=catalog.find(c=>c.tag===choice);
 const extra=(ol?.models||[]).filter(m=>!isTrainer(m.name)&&!catalog.some(c=>c.tag===m.name)).map(m=>m.name);
 const step=(n:number,title:string,done:boolean,body:React.ReactNode)=><div className={'wiz-step '+(done?'is-done':'')}><div className="wiz-head"><span className="wiz-n">{done?<Check size={13} strokeWidth={3}/>:n}</span><b>{title}</b></div><div className="wiz-body">{body}</div></div>;

 return <div className="ai-settings">
  <h3>AI TRAINER <i className="opt">OPTIONAL</i></h3>
  <p className="note-sm">Entirely optional. Nothing is ever sent automatically: only when you click <b>Ask AI trainer</b> on a confirmed workout, and you are asked to confirm each time. The report contains your goals, limitations, workouts, notes and metrics. Third-party services may charge you directly; IRON STANDARD itself is free and has no AI service of its own. <a href={DOCS} target="_blank" rel="noreferrer">Full setup guide</a></p>
  <div className="seg" role="radiogroup" aria-label="AI provider">
   {OPTIONS.map(o=><button type="button" key={o.id} role="radio" aria-checked={ui===o.id} className={ui===o.id?'on':''} onClick={()=>choose(o.id)}>{o.label}</button>)}
  </div>
  <p className="note-sm">{help}</p>

  {ui==='cli'&&<p className={'ai-status '+(cfg?.cliAvailable?'ok':'bad')}>{cfg?.cliAvailable?`Found: ${cfg.cliAvailable}`:'Claude CLI not found on this computer. Install Claude Code and sign in, or choose another option.'}</p>}

  {ui==='ollama'&&<div className="wizard">
   {step(1,'Check your computer',!!hw,!hw?<p className="note-sm">Looking at your hardware…</p>:<>
     <ul className="hw-list">
      <li><span>GRAPHICS</span>{hw.hardware.gpu?<>{hw.hardware.gpu.name} · {Math.round(hw.hardware.gpu.vramGb)} GB video memory</>:hw.hardware.adapters.length?<>{hw.hardware.adapters.join(', ')} · video memory unknown</>:'No dedicated graphics card found'}</li>
      <li><span>MEMORY</span>{hw.hardware.ramGb} GB RAM{hw.hardware.freeDiskGb!=null&&<> · {hw.hardware.freeDiskGb} GB free disk</>}</li>
     </ul>
     <p className="note-sm">{hw.recommendation.note} {hw.recommendation.tag?<>Recommended: <b>{hw.recommendation.tag}</b> <em className={'badge-sm '+(hw.recommendation.tested?'ok':'')}>{hw.recommendation.tested?'TESTED':'NOT TESTED BY THE DEVELOPERS'}</em></>:null}</p>
     {hw.recommendation.diskWarning&&<p className="ai-status bad">{hw.recommendation.diskWarning}</p>}
     <button type="button" className="ghost sm" onClick={detect}><RefreshCw size={13}/> DETECT AGAIN</button></>)}

   {step(2,'Install Ollama',!!ol?.running,!ol?<p className="note-sm">Checking for Ollama…</p>:ol.running?<p className="ai-status ok">Ollama is installed and running.</p>:<>
     <p className="note-sm">Ollama is a free program that runs AI models on your computer. Install it like any other program from its official site, open it once, and this page will notice automatically.</p>
     <div className="profile-actions"><a className="save" href="https://ollama.com/download" target="_blank" rel="noreferrer"><ExternalLink size={14}/> GET OLLAMA (OLLAMA.COM)</a><button type="button" className="ghost" onClick={checkOllama}><RefreshCw size={14}/> CHECK AGAIN</button></div>
     <p className="note-sm">Waiting for Ollama… (checking every few seconds)</p></>)}

   {step(3,'Download a model',!!ol?.running&&!!choice&&hasModel(choice),!ol?.running?<p className="note-sm">Finish step 2 first.</p>:<>
     <label className="full">MODEL
      <select value={choice} disabled={!!pull} onChange={e=>setChoice(e.target.value)}>
       {catalog.map(c=><option key={c.tag} value={c.tag}>{c.label} ({c.tag}) · {c.dl}{hasModel(c.tag)?' · downloaded':''}{c.tested?' · tested':''}</option>)}
       {extra.map(n=><option key={n} value={n}>{n} · already installed</option>)}
      </select></label>
     {picked&&!picked.tested&&<p className="note-sm">This size has not been tested by the developers. It should work but the advice may be weaker.</p>}
     {pull?<div className="pull"><div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pull.pct}><div style={{width:`${pull.pct}%`}}/></div>
       <p className="note-sm">{pull.pct}% · {pull.doneGb.toFixed(1)} of {pull.totalGb.toFixed(1)} GB · {pull.status}</p>
       <button type="button" className="ghost" onClick={()=>abort.current?.abort()}>CANCEL</button></div>
     :hasModel(choice)||extra.includes(choice)?<p className="ai-status ok">{choice} is downloaded.</p>
     :<div className="profile-actions"><button type="button" className="save" disabled={busy||!choice} onClick={download}><Download size={14}/> DOWNLOAD ({picked?.dl||'large'})</button></div>}
     <p className="note-sm">The download is large and runs in Ollama, not in this app. You can cancel and resume it later.</p></>)}

   {step(4,'Connect it to IRON STANDARD',ready&&cfg?.provider==='openai'&&isOllamaUrl(cfg.baseUrl),!ol?.running||!(hasModel(choice)||extra.includes(choice))?<p className="note-sm">Finish step 3 first.</p>:<>
     <p className="note-sm">This creates a copy named <code>{TRAINER}</code> that uses the downloaded model with a larger memory window (Ollama&apos;s default is too small for a full report). It takes almost no extra disk space and does not change how other apps use Ollama.</p>
     <div className="profile-actions"><button type="button" className="save" disabled={busy} onClick={prepare}><Zap size={14}/> {ready?'RE-CREATE & USE':'SET UP & TEST'}</button></div></>)}

   {ol?.running&&ready&&<div className="wiz-remove"><span className="note-sm">Done with it?</span>
     <button type="button" className="ghost sm" disabled={busy} onClick={()=>remove(false)}>TURN OFF LOCAL AI</button>
     {hasModel(choice)&&<button type="button" className="ghost sm danger" disabled={busy} onClick={()=>remove(true)}>TURN OFF + DELETE MODEL</button>}</div>}
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
   {ui!=='none'&&<button type="button" className="ghost" disabled={busy} onClick={test}><Zap size={14}/> TEST CONNECTION</button>}
   {cfg?.hasKey&&!cfg.keyFromEnv&&ui!=='ollama'&&<button type="button" className="ghost" disabled={busy} onClick={()=>save(true)}>REMOVE SAVED KEY</button>}
  </div>
  {result&&<p className={'ai-status '+(result.ok?'ok':'bad')} role="status">{result.text}</p>}
 </div>;
}
