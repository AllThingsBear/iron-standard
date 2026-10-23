'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,FileUp,HardDriveDownload,RotateCcw,Save} from 'lucide-react';

type Info={dataDir:string;dbPath:string;backupDir:string;reportsDir:string;dbSize:number;counts:Record<string,number>};
type BackupFile={name:string;size:number;modified:string};
const kb=(n:number)=>n>1048576?`${(n/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(n/1024))} KB`;
const LABEL:Record<string,string>={set_log:'sets',exercise_log:'exercise checkoffs',daily_log:'daily metric days',session_log:'sessions',trainer_notes:'trainer notes'};

export default function DataPanel({onChanged,notify}:{onChanged:()=>Promise<void>;notify:(m:string)=>void}){
 const [info,setInfo]=useState<Info|null>(null);
 const [backups,setBackups]=useState<BackupFile[]>([]);
 const [busy,setBusy]=useState(false);
 const [file,setFile]=useState<{name:string;data:any}|null>(null);
 const [mode,setMode]=useState<'merge'|'replace'>('merge');
 const [err,setErr]=useState('');
 const input=useRef<HTMLInputElement>(null);

 const refresh=async()=>{try{const r=await fetch('/api/backup',{cache:'no-store'});if(!r.ok)throw new Error();const j=await r.json();setInfo(j.info);setBackups(j.backups)}catch{setErr('Could not read data information.')}};
 useEffect(()=>{refresh()},[]);

 async function backupNow(){setBusy(true);try{const r=await fetch('/api/backup',{method:'POST'});if(!r.ok)throw new Error();notify('BACKUP CREATED');await refresh()}catch{notify('SAVE FAILED — BACKUP NOT CREATED')}finally{setBusy(false)}}
 async function restore(name:string){
  if(!window.confirm(`Restore "${name}"?\n\nThis REPLACES all current data with the contents of that backup. A safety backup of your current data is taken first.`))return;
  setBusy(true);
  try{const r=await fetch('/api/backup/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});const j=await r.json();if(!r.ok)throw new Error(j.error);notify('BACKUP RESTORED');await onChanged();await refresh()}
  catch(e){notify('SAVE FAILED — '+(e instanceof Error?e.message:'RESTORE FAILED').toUpperCase())}finally{setBusy(false)}
 }
 async function pick(f:File|undefined){
  setErr('');setFile(null);if(!f)return;
  if(f.size>25*1024*1024){setErr('That file is larger than 25 MB.');return}
  try{const data=JSON.parse(await f.text());if(data?.format!=='iron-standard-export')throw new Error();setFile({name:f.name,data})}
  catch{setErr('That is not an IRON STANDARD export (.json) file.')}
 }
 async function doImport(){
  if(!file)return;
  const msg=mode==='replace'
   ?'REPLACE EVERYTHING?\n\nAll current workouts, metrics, notes, your profile and program will be replaced by the contents of this file. A safety backup is taken first.'
   :'Merge this file into your current data?\n\nRecords with the same date/exercise are overwritten by the file; everything else is kept. Your profile and program are not changed. A safety backup is taken first.';
  if(!window.confirm(msg))return;
  setBusy(true);setErr('');
  try{
   const r=await fetch('/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:file.data,mode})});
   const j=await r.json();if(!r.ok)throw new Error(j.error||'Import failed');
   notify(`IMPORTED — ${j.counts.set_log} SETS, ${j.counts.session_log} SESSIONS`);setFile(null);if(input.current)input.current.value='';await onChanged();await refresh();
  }catch(e){setErr(e instanceof Error?e.message:'Import failed')}finally{setBusy(false)}
 }
 const summary=file?Object.keys(LABEL).map(k=>`${(file.data[k]||[]).length} ${LABEL[k]}`).join(' · '):'';

 return <div className="data-panel">
  <h3>WHERE YOUR DATA LIVES</h3>
  {info?<dl className="data-info">
   <div><dt>DATABASE FILE</dt><dd><code>{info.dbPath}</code> <small>({kb(info.dbSize)})</small></dd></div>
   <div><dt>BACKUPS FOLDER</dt><dd><code>{info.backupDir}</code></dd></div>
   <div><dt>TRAINER REPORTS</dt><dd><code>{info.reportsDir}</code></dd></div>
   <div><dt>CONTAINS</dt><dd>{Object.keys(LABEL).map(k=>`${info.counts[k]} ${LABEL[k]}`).join(' · ')}</dd></div>
  </dl>:<p className="empty-note">LOADING…</p>}
  <p className="disclaimer">Everything is stored on this computer only. Closing the app never deletes it. To move to another computer, export here and import there.</p>

  <h3>EXPORT</h3>
  <div className="data-actions">
   <a className="save" href="/api/export" download><Download size={14}/> DOWNLOAD FULL EXPORT (.JSON)</a>
   <a className="ghost" href="/api/export?format=csv" download><Download size={14}/> SETS AS SPREADSHEET (.CSV)</a>
  </div>
  <p className="note-sm">The JSON export contains everything (profile, program, workouts, sets, metrics, notes) and can be imported again. The CSV is for spreadsheets only.</p>

  <h3>IMPORT</h3>
  <div className="data-import">
   <label className="filebtn"><FileUp size={14}/> CHOOSE EXPORT FILE…<input ref={input} type="file" accept=".json,application/json" onChange={e=>pick(e.target.files?.[0])}/></label>
   {file&&<div className="import-preview">
    <b>{file.name}</b><span>{summary}</span>
    <div className="seg" role="radiogroup" aria-label="Import mode">
     <button type="button" role="radio" aria-checked={mode==='merge'} className={mode==='merge'?'on':''} onClick={()=>setMode('merge')}>MERGE INTO CURRENT DATA</button>
     <button type="button" role="radio" aria-checked={mode==='replace'} className={mode==='replace'?'on':''} onClick={()=>setMode('replace')}>REPLACE EVERYTHING</button>
    </div>
    <button type="button" className="save" disabled={busy} onClick={doImport}><Save size={14}/> IMPORT</button>
   </div>}
   {err&&<p className="data-err" role="alert">{err}</p>}
  </div>
  <p className="note-sm">A bad or incompatible file is rejected before anything changes, and a safety backup is always taken before an import.</p>

  <h3>BACKUPS</h3>
  <div className="data-actions"><button type="button" className="save" disabled={busy} onClick={backupNow}><HardDriveDownload size={14}/> BACK UP NOW</button></div>
  {backups.length===0?<p className="empty-note">NO BACKUPS YET.</p>:<ul className="backup-list">
   {backups.map(b=><li key={b.name}>
    <span className="b-name">{b.name}</span><small>{new Date(b.modified).toLocaleString()} · {kb(b.size)}</small>
    <a className="ghost sm" href={`/api/backup/${b.name}`} download aria-label={`Download ${b.name}`}><Download size={13}/></a>
    <button type="button" className="ghost sm" disabled={busy} onClick={()=>restore(b.name)}><RotateCcw size={13}/> RESTORE</button>
   </li>)}
  </ul>}
  <p className="note-sm">The newest 30 backups are kept. Backups live in the folder shown above, so they also appear in the Docker volume and are included if you back that up.</p>
 </div>;
}
