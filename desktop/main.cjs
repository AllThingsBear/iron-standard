'use strict';
// IRON STANDARD desktop shell. Electron is only the window + launcher: the app itself is the same Next.js server
// that CI tests, run by a bundled Node runtime (so the native SQLite module never has to match Electron's ABI).
const {app,BrowserWindow,Menu,shell,dialog}=require('electron');
const {spawn,spawnSync}=require('node:child_process');
const net=require('node:net');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');

const APP_NAME='IRON STANDARD';
const DEFAULT_PORT=4871;
const SPLASH='data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0e0c;color:#cdb790;font:14px Consolas,monospace;display:flex;align-items:center;justify-content:center;height:100vh;letter-spacing:.2em">STARTING IRON STANDARD…</body>');

app.setName(APP_NAME);
app.setAppUserModelId('com.allthingsbear.ironstandard');
if(!app.requestSingleInstanceLock()){app.quit();process.exit(0)}

let win=null,server=null,port=0,quitting=false;
const dataDir=process.env.IRON_STANDARD_DATA_DIR||path.join(app.getPath('userData'),'data');
const logDir=path.join(app.getPath('userData'),'logs');

// In a packaged app the server lives in resources/server; in development it is built into desktop/server.
const serverDir=app.isPackaged?path.join(process.resourcesPath,'server'):path.join(__dirname,'server');
const nodeBin=path.join(serverDir,process.platform==='win32'?'node.exe':'node');

function freePort(preferred){
  return new Promise(resolve=>{
    const tryPort=p=>{const s=net.createServer();s.once('error',()=>p===preferred?tryPort(0):resolve(0)); s.listen(p,'127.0.0.1',()=>{const got=s.address().port;s.close(()=>resolve(got))})};
    tryPort(preferred);
  });
}
const ping=p=>new Promise(resolve=>{const r=http.get({host:'127.0.0.1',port:p,path:'/api/state',timeout:2000},res=>{res.resume();resolve(res.statusCode===200)});r.on('error',()=>resolve(false));r.on('timeout',()=>{r.destroy();resolve(false)})});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function startServer(){
  fs.mkdirSync(dataDir,{recursive:true});fs.mkdirSync(logDir,{recursive:true});
  if(!fs.existsSync(nodeBin))throw new Error(`The bundled runtime is missing:\n${nodeBin}`);
  port=await freePort(DEFAULT_PORT);
  if(!port)throw new Error('No free network port was available on this computer.');
  const out=fs.openSync(path.join(logDir,'server.log'),'a');
  server=spawn(nodeBin,['server.js'],{cwd:serverDir,windowsHide:true,stdio:['ignore',out,out],env:{
    ...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',PORT:String(port),HOSTNAME:'127.0.0.1',
    DB_PATH:path.join(dataDir,'iron-standard.db')}});
  server.on('exit',code=>{server=null;if(!quitting){dialog.showErrorBox(APP_NAME,`The app's local server stopped unexpectedly (code ${code}).\n\nLog file:\n${path.join(logDir,'server.log')}`);app.quit()}});
  for(let i=0;i<120;i++){if(await ping(port))return;if(!server)throw new Error('The local server failed to start. See the log: '+path.join(logDir,'server.log'));await sleep(500)}
  throw new Error('The local server did not start within 60 seconds. See the log: '+path.join(logDir,'server.log'));
}

function stopServer(){
  quitting=true;
  if(!server)return;
  try{if(process.platform==='win32')spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{windowsHide:true});else server.kill('SIGTERM')}catch{}
  server=null;
}

function buildMenu(){
  const t=[
    {label:'File',submenu:[
      {label:'Open data folder',click:()=>shell.openPath(dataDir)},
      {label:'Open log folder',click:()=>shell.openPath(logDir)},
      {type:'separator'},{role:'quit'}]},
    {label:'View',submenu:[{role:'reload'},{role:'forceReload'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
    {label:'Help',submenu:[
      {label:'User guide',click:()=>shell.openExternal('https://github.com/AllThingsBear/iron-standard/blob/main/docs/USER_GUIDE.md')},
      {label:'AI trainer setup guide',click:()=>shell.openExternal('https://github.com/AllThingsBear/iron-standard/blob/main/docs/AI_SETUP.md')},
      {label:'Report an issue',click:()=>shell.openExternal('https://github.com/AllThingsBear/iron-standard/issues')},
      {type:'separator'},{label:`${APP_NAME} ${app.getVersion()} (not medical advice)`,enabled:false}]}
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

function createWindow(){
  win=new BrowserWindow({width:1280,height:900,minWidth:380,minHeight:600,backgroundColor:'#0c0e0c',title:APP_NAME,autoHideMenuBar:true,
    icon:path.join(__dirname,'..','build','icon.png'),
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false}});
  win.loadURL(SPLASH);
  // Only the local app may load in this window; everything else opens in the user's browser.
  const isLocal=u=>{try{const x=new URL(u);return (x.hostname==='127.0.0.1'&&x.port===String(port))||x.protocol==='data:'}catch{return false}};
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'}});
  win.webContents.on('will-navigate',(e,url)=>{if(!isLocal(url)){e.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url)}});
  win.on('closed',()=>{win=null});
}

app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}});
app.on('before-quit',stopServer);
app.on('window-all-closed',()=>app.quit());
process.on('exit',stopServer);

app.whenReady().then(async()=>{
  buildMenu();createWindow();
  try{
    await startServer();
    if(process.env.IRON_STANDARD_PORT_FILE)fs.writeFileSync(process.env.IRON_STANDARD_PORT_FILE,String(port)); // used by automated smoke tests
    if(win)await win.loadURL(`http://127.0.0.1:${port}/`);
  }catch(err){
    dialog.showErrorBox(APP_NAME,String(err&&err.message||err));
    app.quit();
  }
});
