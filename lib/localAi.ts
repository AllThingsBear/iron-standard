// Pure helpers for the guided local-AI setup (no Node imports, so they are unit-testable).
// Model sizes are the download sizes listed on https://ollama.com/library/gemma4 (they vary a little by quantization).
export type CatalogModel={tag:string;label:string;dl:string;maxGb:number;minVramGb:number;tested:boolean};
export const CATALOG:CatalogModel[]=[
  {tag:'gemma4:12b',label:'Gemma 4 12B',dl:'about 8 GB',maxGb:8,minVramGb:15,tested:true},
  {tag:'gemma4:e4b',label:'Gemma 4 E4B (smaller)',dl:'about 7-10 GB',maxGb:9.5,minVramGb:8,tested:false},
  {tag:'gemma4:e2b',label:'Gemma 4 E2B (smallest)',dl:'about 5-8 GB',maxGb:7.5,minVramGb:4,tested:false}
];

export type Hardware={gpu:{name:string;vramGb:number}|null;adapters:string[];ramGb:number;freeDiskGb:number|null;platform:string;appleSilicon:boolean};
export type Recommendation={tag:string|null;tested:boolean;note:string;diskWarning:string|null};

export function recommendModel(h:Hardware):Recommendation{
  let tier:CatalogModel|undefined,note='';
  if(h.gpu){
    tier=CATALOG.find(m=>h.gpu!.vramGb>=m.minVramGb);
    note=tier?`${h.gpu.name} with about ${Math.round(h.gpu.vramGb)} GB of video memory.`:`${h.gpu.name} has only about ${Math.round(h.gpu.vramGb)} GB of video memory, which is too little for a good local model.`;
  }else if(h.appleSilicon){
    // Apple Silicon shares memory between CPU and GPU (untested here).
    tier=h.ramGb>=24?CATALOG[0]:h.ramGb>=12?CATALOG[1]:h.ramGb>=8?CATALOG[2]:undefined;
    note=`Apple Silicon Mac with ${h.ramGb} GB of shared memory (not tested by the developers).`;
  }else{
    note=h.adapters.length?`Found ${h.adapters.join(', ')}, but could not read its video memory.`:'No dedicated graphics card was detected.';
  }
  let diskWarning:string|null=null;
  if(tier&&h.freeDiskGb!=null&&h.freeDiskGb<tier.maxGb*1.3)diskWarning=`Only about ${Math.round(h.freeDiskGb)} GB of disk space is free; this model needs about ${tier.maxGb} GB.`;
  if(!tier&&!h.gpu&&!h.appleSilicon)note+=' Local models run very slowly on a CPU. Using the Claude CLI or an API key is usually a better choice, but you can still try a small model.';
  return {tag:tier?.tag??null,tested:!!tier?.tested,note,diskWarning};
}

// Parse Ollama's streamed pull progress (newline-delimited JSON) into an overall percentage.
export type PullProgress={status:string;pct:number;doneGb:number;totalGb:number;error?:string;done:boolean};
export function foldPull(state:{layers:Record<string,{total:number;completed:number}>},line:any):PullProgress{
  if(line?.error)return {status:'error',pct:0,doneGb:0,totalGb:0,error:String(line.error),done:false};
  if(line?.digest&&typeof line.total==='number')state.layers[line.digest]={total:line.total,completed:Number(line.completed)||0};
  const L=Object.values(state.layers);
  const total=L.reduce((a,l)=>a+l.total,0),done=L.reduce((a,l)=>a+Math.min(l.completed,l.total),0);
  const success=line?.status==='success';
  return {status:String(line?.status||''),pct:success?100:total?Math.min(99,Math.round(done/total*100)):0,doneGb:done/1e9,totalGb:total/1e9,done:success};
}
