import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {db,dataDir,dbPath} from './db';
import {getProfile,getProgram,importSettings,sanitizeProgram} from './settings';

export const APP_VERSION='0.1.0';
export const BACKUP_DIR=()=>path.join(dataDir,'backups');
export const BACKUP_NAME=/^iron-standard-[A-Za-z0-9_-]+\.db$/;
const MAX_ROWS=200000;
const DAY=/^\d{4}-\d{2}-\d{2}$/;

export type ExportFile={format:'iron-standard-export';version:1;appVersion:string;exportedAt:string;profile?:unknown;program?:unknown;
  exercise_log:any[];daily_log:any[];set_log:any[];session_log:any[];trainer_notes:any[];recommendations?:any[]};

const rows=(d:Database.Database,sql:string)=>{try{return d.prepare(sql).all() as any[]}catch{return []}};

export function gatherExport():ExportFile{
  const d=db();
  return {format:'iron-standard-export',version:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),profile:getProfile(),program:getProgram(),
    exercise_log:rows(d,'SELECT day,exercise_id,done,weight,reps,notes FROM exercise_log ORDER BY day,exercise_id'),
    daily_log:rows(d,'SELECT day,calories,protein,walk_minutes,weight,waist,notes FROM daily_log ORDER BY day'),
    set_log:rows(d,'SELECT day,exercise_id,set_no,weight,reps,pain,notes FROM set_log ORDER BY day,exercise_id,set_no'),
    session_log:rows(d,'SELECT day,general_note,confirmed_at,sent_at FROM session_log ORDER BY day'),
    trainer_notes:rows(d,'SELECT day,author,body,created_at FROM trainer_notes ORDER BY id'),
    recommendations:rows(d,'SELECT exercise_id,weight,reps,note,author,created_at FROM recommendations')};
}

// Read a backup .db file (read-only) into the same shape as an export.
export function readBackupAsExport(name:string):ExportFile{
  if(!BACKUP_NAME.test(name))throw new Error('Invalid backup name');
  const file=path.join(BACKUP_DIR(),name);
  if(!fs.existsSync(file))throw new Error('Backup not found');
  const b=new Database(file,{readonly:true,fileMustExist:true});
  try{
    const setting=(k:string)=>{try{const r=b.prepare('SELECT value FROM settings WHERE key=?').get(k) as {value:string}|undefined;return r?JSON.parse(r.value):undefined}catch{return undefined}};
    return {format:'iron-standard-export',version:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),profile:setting('profile'),program:setting('program'),
      exercise_log:rows(b,'SELECT day,exercise_id,done,weight,reps,notes FROM exercise_log'),
      daily_log:rows(b,'SELECT day,calories,protein,walk_minutes,weight,waist,notes FROM daily_log'),
      set_log:rows(b,'SELECT day,exercise_id,set_no,weight,reps,pain,notes FROM set_log'),
      session_log:rows(b,'SELECT day,general_note,confirmed_at,sent_at FROM session_log'),
      trainer_notes:rows(b,'SELECT day,author,body,created_at FROM trainer_notes ORDER BY id'),
      recommendations:rows(b,'SELECT exercise_id,weight,reps,note,author,created_at FROM recommendations')};
  }finally{b.close()}
}

const str=(v:unknown,max:number)=>String(v??'').slice(0,max);
const num=(v:unknown,max:number,int=false):number|null=>{
  if(v===null||v===undefined||v==='')return null;
  const x=Number(v);
  if(!Number.isFinite(x)||x<0||x>max||(int&&!Number.isInteger(x)))throw new Error('Invalid number in file');
  return x;
};
const day=(v:unknown)=>{if(typeof v!=='string'||!DAY.test(v))throw new Error('Invalid date in file');return v};
const list=(v:unknown,name:string)=>{if(v===undefined)return [] as any[];if(!Array.isArray(v)||v.length>MAX_ROWS)throw new Error(`${name} is invalid or too large`);return v};
const exId=(v:unknown)=>{const s=str(v,80);if(!s)throw new Error('Missing exercise id');return s};

// Validate EVERYTHING before touching the database, so a bad file changes nothing.
export function parseExport(raw:any){
  if(!raw||typeof raw!=='object'||raw.format!=='iron-standard-export')throw new Error('This is not an IRON STANDARD export file');
  if(raw.version!==1)throw new Error('Unsupported export version');
  const program=raw.program?sanitizeProgram(raw.program):undefined;
  return {
    profile:raw.profile&&typeof raw.profile==='object'?raw.profile:undefined,program,
    exercise_log:list(raw.exercise_log,'exercise_log').map(r=>({day:day(r.day),exercise_id:exId(r.exercise_id),done:r.done?1:0,weight:num(r.weight,500),reps:str(r.reps,120),notes:str(r.notes,1000)})),
    daily_log:list(raw.daily_log,'daily_log').map(r=>({day:day(r.day),calories:num(r.calories,20000,true),protein:num(r.protein,2000,true),walk_minutes:num(r.walk_minutes,1440,true),weight:num(r.weight,1500),waist:num(r.waist,500),notes:str(r.notes,2000)})),
    set_log:list(raw.set_log,'set_log').map(r=>({day:day(r.day),exercise_id:exId(r.exercise_id),set_no:num(r.set_no,100,true)||1,weight:num(r.weight,500),reps:num(r.reps,500,true),pain:num(r.pain,10,true),notes:str(r.notes,500)})),
    session_log:list(raw.session_log,'session_log').map(r=>({day:day(r.day),general_note:str(r.general_note,4000),confirmed_at:r.confirmed_at?str(r.confirmed_at,40):null,sent_at:r.sent_at?str(r.sent_at,40):null})),
    recommendations:list(raw.recommendations,'recommendations').map(r=>({exercise_id:exId(r.exercise_id),weight:num(r.weight,1500),reps:str(r.reps,60),note:str(r.note,600),author:str(r.author,80)||'Trainer',created_at:str(r.created_at,40)||new Date().toISOString()})),
    trainer_notes:list(raw.trainer_notes,'trainer_notes').map(r=>{const body=str(r.body,20000).trim(),author=str(r.author,80).trim();if(!body||!author)throw new Error('Empty trainer note in file');return {day:day(r.day),author,body,created_at:str(r.created_at,40)||new Date().toISOString()}})
  };
}
export type Clean=ReturnType<typeof parseExport>;

export function applyImport(c:Clean,mode:'merge'|'replace'){
  const d=db();
  const counts={exercise_log:0,daily_log:0,set_log:0,session_log:0,trainer_notes:0,recommendations:0};
  d.transaction(()=>{
    if(mode==='replace'){for(const t of ['exercise_log','daily_log','set_log','session_log','trainer_notes','recommendations'])d.prepare(`DELETE FROM ${t}`).run();importSettings(c.profile,c.program)}
    const ex=d.prepare('INSERT OR REPLACE INTO exercise_log(day,exercise_id,done,weight,reps,notes) VALUES(@day,@exercise_id,@done,@weight,@reps,@notes)');
    for(const r of c.exercise_log){ex.run(r);counts.exercise_log++}
    const dl=d.prepare('INSERT OR REPLACE INTO daily_log(day,calories,protein,walk_minutes,weight,waist,notes) VALUES(@day,@calories,@protein,@walk_minutes,@weight,@waist,@notes)');
    for(const r of c.daily_log){dl.run(r);counts.daily_log++}
    const sl=d.prepare('INSERT OR REPLACE INTO set_log(day,exercise_id,set_no,weight,reps,pain,notes) VALUES(@day,@exercise_id,@set_no,@weight,@reps,@pain,@notes)');
    for(const r of c.set_log){sl.run(r);counts.set_log++}
    const se=d.prepare('INSERT OR REPLACE INTO session_log(day,general_note,confirmed_at,sent_at) VALUES(@day,@general_note,@confirmed_at,@sent_at)');
    for(const r of c.session_log){se.run(r);counts.session_log++}
    const rc=d.prepare('INSERT OR REPLACE INTO recommendations(exercise_id,weight,reps,note,author,created_at) VALUES(@exercise_id,@weight,@reps,@note,@author,@created_at)');
    for(const r of c.recommendations){rc.run(r);counts.recommendations++}
    const dup=d.prepare('SELECT 1 FROM trainer_notes WHERE day=? AND author=? AND body=? AND created_at=?');
    const tn=d.prepare('INSERT INTO trainer_notes(day,author,body,created_at) VALUES(@day,@author,@body,@created_at)');
    for(const r of c.trainer_notes){if(dup.get(r.day,r.author,r.body,r.created_at))continue;tn.run(r);counts.trainer_notes++}
  })();
  return counts;
}

export async function createBackup(tag=''){
  const dir=BACKUP_DIR();fs.mkdirSync(dir,{recursive:true});
  const ts=new Date().toISOString().replace(/[-:]/g,'').replace(/\..+/,'').replace('T','-');
  const name=`iron-standard-${ts}${tag?'-'+tag.replace(/[^A-Za-z0-9_-]/g,''):''}.db`;
  await db().backup(path.join(dir,name));
  const all=listBackups();
  for(const old of all.slice(30))fs.rmSync(path.join(dir,old.name),{force:true}); // keep newest 30
  return name;
}

export function listBackups(){
  const dir=BACKUP_DIR();
  if(!fs.existsSync(dir))return [] as {name:string;size:number;modified:string}[];
  return fs.readdirSync(dir).filter(n=>BACKUP_NAME.test(n)).map(name=>{const st=fs.statSync(path.join(dir,name));return {name,size:st.size,modified:st.mtime.toISOString()}}).sort((a,b)=>b.modified.localeCompare(a.modified));
}

export function dataInfo(){
  const d=db();const count=(t:string)=>(d.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as {c:number}).c;
  let size=0;try{size=fs.statSync(dbPath).size}catch{}
  return {dataDir,dbPath,backupDir:BACKUP_DIR(),reportsDir:path.join(dataDir,'reports'),dbSize:size,counts:{exercise_log:count('exercise_log'),daily_log:count('daily_log'),set_log:count('set_log'),session_log:count('session_log'),trainer_notes:count('trainer_notes')}};
}

export function setsCsv(){
  const prof=getProfile();const prog=getProgram();
  const names:Record<string,string>={};for(const s of Object.values(prog.sessions))for(const e of s.exercises)names[e.id]=e.name;
  const q=(v:unknown)=>{const s=v==null?'':String(v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  const unit=prof.units==='metric'?'kg':'lb';
  const out=[`date,exercise,exercise_id,set,weight_${unit},reps,pain_0_10,note`];
  for(const r of rows(db(),'SELECT day,exercise_id,set_no,weight,reps,pain,notes FROM set_log ORDER BY day,exercise_id,set_no'))out.push([r.day,names[r.exercise_id]||r.exercise_id,r.exercise_id,r.set_no,r.weight,r.reps,r.pain,r.notes].map(q).join(','));
  return out.join('\n')+'\n';
}
