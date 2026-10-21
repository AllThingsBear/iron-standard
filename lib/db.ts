import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
const dbfile = process.env.DB_PATH || path.join(process.cwd(),'data','iron-standard.db');
export const dataDir=path.dirname(dbfile);
let instance: Database.Database | null = null;
export function db(){
  if(!instance){
    fs.mkdirSync(path.dirname(dbfile),{recursive:true});
    instance = new Database(dbfile);
    instance.pragma('journal_mode = WAL');
    instance.exec(`CREATE TABLE IF NOT EXISTS exercise_log (day TEXT NOT NULL, exercise_id TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, weight REAL, reps TEXT, notes TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(day,exercise_id));
      CREATE TABLE IF NOT EXISTS daily_log (day TEXT PRIMARY KEY, calories INTEGER, protein INTEGER, walk_minutes INTEGER, weight REAL, waist REAL, notes TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS set_log (day TEXT NOT NULL, exercise_id TEXT NOT NULL, set_no INTEGER NOT NULL, weight REAL, reps INTEGER, pain INTEGER, notes TEXT, PRIMARY KEY(day,exercise_id,set_no));
      CREATE TABLE IF NOT EXISTS session_log (day TEXT PRIMARY KEY, general_note TEXT, confirmed_at TEXT, sent_at TEXT);`);
  }
  return instance;
}
