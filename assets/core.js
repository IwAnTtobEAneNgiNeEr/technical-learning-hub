(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HubCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(data){
 const maps=Object.fromEntries(['projects','tracks','nodes','repos'].map(k=>[k,Object.fromEntries(data[k].map(x=>[x.id,x]))]));
 const owns=(map,id)=>typeof id==='string'&&Object.hasOwn(map,id);
 const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const modes=[20,45,90,150];
 function initial(){return {version:2,current:'radar',currentSession:'s0',main:'sys',side:'py',completed:[],legacyCompleted:[],explored:[],notes:{},defaultMinutes:{},sessionData:{},mastery:{},history:[]};}
 function list(x,map,label){if(!Array.isArray(x)||x.length>Object.keys(map).length||x.some(id=>!owns(map,id)))throw Error(label+' contains an invalid ID');return [...new Set(x)];}
 function string(x,label,max=10000){if(typeof x!=='string'||x.length>max)throw Error(label+' is not valid text');return x;}
 function session(project,id){if(!owns(maps.projects,project))throw Error('Invalid project ID');const found=maps.projects[project].sessions.find(s=>s.id===id);if(!found)throw Error('Invalid session ID');return found;}
 function validate(raw){
  if(!obj(raw)||raw.version!==2)throw Error('Unsupported progress version');
  const out=initial();
  if(!owns(maps.projects,raw.current)||!owns(maps.tracks,raw.main)||(raw.side!==''&&!owns(maps.tracks,raw.side)))throw Error('Invalid project or track ID');
  session(raw.current,raw.currentSession);out.current=raw.current;out.currentSession=raw.currentSession;out.main=raw.main;out.side=raw.side;
  for(const key of ['completed','legacyCompleted'])out[key]=list(raw[key],maps.projects,'project');
  out.explored=list(raw.explored,maps.repos,'repo');
  for(const key of ['notes','defaultMinutes','sessionData','mastery'])if(!obj(raw[key]))throw Error('Invalid '+key);
  for(const [id,value] of Object.entries(raw.notes)){if(!owns(maps.projects,id))throw Error('Invalid project ID');out.notes[id]=string(value,'notebook');}
  for(const [id,value] of Object.entries(raw.defaultMinutes)){if(!owns(maps.projects,id)||!modes.includes(value))throw Error('Invalid duration');out.defaultMinutes[id]=value;}
  for(const [pid,items] of Object.entries(raw.sessionData)){
   if(!owns(maps.projects,pid)||!obj(items)||Object.keys(items).length>maps.projects[pid].sessions.length)throw Error('Invalid session data');
   out.sessionData[pid]={};
   for(const [sid,value] of Object.entries(items)){
    session(pid,sid);if(!obj(value)||typeof value.done!=='boolean'||!modes.includes(value.minutes))throw Error('Invalid session record');
    const notes=string(value.notes,'notes'),proof=string(value.proof,'proof');
    if(value.done&&!proof.trim())throw Error('Completed session needs proof');
    out.sessionData[pid][sid]={notes,proof,done:value.done,minutes:value.minutes};
   }
  }
  for(const [id,value] of Object.entries(raw.mastery)){
   if(!owns(maps.nodes,id)||!obj(value)||!Number.isInteger(value.level)||value.level<0||value.level>4)throw Error('Invalid mastery');
   const evidence=string(value.evidence,'evidence');if(value.level>=2&&!evidence.trim())throw Error('Mastery needs evidence');
   out.mastery[id]={level:value.level,evidence,legacy:value.legacy===true};
  }
  const derived=[...new Set([...out.legacyCompleted,...data.projects.filter(p=>p.sessions.every(s=>out.sessionData[p.id]?.[s.id]?.done)).map(p=>p.id)])];
  if(derived.length!==out.completed.length||derived.some(id=>!out.completed.includes(id)))throw Error('Project completion disagrees with session proof');
  if(!Array.isArray(raw.history)||raw.history.length>100)throw Error('Invalid history');
  out.history=raw.history.map(h=>{if(!obj(h)||!owns(maps.projects,h.project)||typeof h.at!=='string')throw Error('Invalid history');session(h.project,h.session);return {project:h.project,session:h.session,at:string(h.at,'timestamp',40)};});
  return out;
 }
 function migrate(raw){
  if(!obj(raw)||raw.version!==1)throw Error('Unsupported legacy version');
  const out=initial();
  if(!owns(maps.projects,raw.current)||!owns(maps.tracks,raw.main)||(raw.side!==''&&!owns(maps.tracks,raw.side)))throw Error('Invalid legacy project/track');
  out.current=raw.current;out.currentSession=maps.projects[raw.current].sessions[0].id;out.main=raw.main;out.side=raw.side;
  out.completed=list(raw.completed,maps.projects,'project');out.legacyCompleted=[...out.completed];out.explored=list(raw.explored,maps.repos,'repo');
  for(const id of list(raw.nodes,maps.nodes,'node'))out.mastery[id]={level:1,evidence:'Imported v1 checkbox; xác nhận lại bằng project evidence.',legacy:true};
  if(!obj(raw.notes)||!obj(raw.sessions))throw Error('Invalid legacy notes/durations');
  out.notes=raw.notes;out.defaultMinutes=raw.sessions;return validate(out);
 }
 function record(state,pid,sid,patch){
  session(pid,sid);const out=copy(state);out.sessionData[pid]??={};
  const before=out.sessionData[pid][sid]||{notes:'',proof:'',done:false,minutes:out.defaultMinutes[pid]||45};
  out.sessionData[pid][sid]={...before,...patch};
  if(maps.projects[pid].sessions.every(s=>out.sessionData[pid][s.id]?.done)){if(!out.completed.includes(pid))out.completed.push(pid);}
  else if(!out.legacyCompleted.includes(pid))out.completed=out.completed.filter(id=>id!==pid);
  return validate(out);
 }
 function finish(state,pid,sid,proof){
  if(typeof proof!=='string'||!proof.trim())throw Error('Session needs proof before completion');
  const out=record(state,pid,sid,{proof,done:true});out.history=[{project:pid,session:sid,at:new Date().toISOString()},...out.history.filter(h=>h.project!==pid||h.session!==sid)].slice(0,100);return out;
 }
 function assess(state,id,level,evidence){if(!owns(maps.nodes,id))throw Error('Invalid mastery node ID');const out=copy(state);out.mastery[id]={level,evidence,legacy:false};return validate(out);}
 return {initial,validate,migrate,record,finish,assess};
}
return {create};
});
