'use strict';
// electron-builder's extraResources filter silently drops node_modules and dot-folders, which broke the first installer.
// Copy the prepared server bundle with a plain recursive copy instead, then verify the essentials are really there.
const fs=require('node:fs');
const path=require('node:path');

exports.default=async function afterPack(context){
  const src=path.join(context.packager.projectDir,'desktop','server');
  const isMac=context.electronPlatformName==='darwin';
  const resources=isMac?path.join(context.appOutDir,`${context.packager.appInfo.productFilename}.app`,'Contents','Resources'):path.join(context.appOutDir,'resources');
  const dest=path.join(resources,'server');
  if(!fs.existsSync(src))throw new Error('desktop/server is missing. Run "npm run desktop:prepare" first.');
  fs.rmSync(dest,{recursive:true,force:true});
  fs.cpSync(src,dest,{recursive:true,dereference:true});

  const nodeName=context.electronPlatformName==='win32'?'node.exe':'node';
  const must=[nodeName,'server.js','package.json','node_modules/next/package.json','node_modules/better-sqlite3/build/Release/better_sqlite3.node','.next-desktop/static','public'];
  const missing=must.filter(p=>!fs.existsSync(path.join(dest,p)));
  if(missing.length)throw new Error('The packaged server is incomplete. Missing: '+missing.join(', '));
  const personal=['data','.env','ai.json'].filter(p=>fs.existsSync(path.join(dest,p)));
  if(personal.length)throw new Error('Refusing to package: found private files in the server bundle: '+personal.join(', '));
  console.log(`  • server bundle verified in ${path.relative(context.packager.projectDir,dest)} (${must.length} essentials present)`);
};
