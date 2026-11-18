/* Питерский Скаут: deterministic rally ledger v0.1, standalone browser/Node */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ScoutEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const zones=['1','6','5','4','3','2'],back=new Set(['1','6','5']),copy=x=>JSON.parse(JSON.stringify(x));
function validateLineup(l){if(!l||zones.some(z=>!l[z]))throw Error('Missing lineup zone');if(new Set(zones.map(z=>l[z])).size!==6)throw Error('Duplicate player')}
function rotate(l){const out={};for(let i=0;i<zones.length;i++)out[zones[(i+1)%6]]=l[zones[i]];return out}
function newMatch({lineups,rosters=null,firstServer='a',target=25}={}){if(!['a','b'].includes(firstServer))throw Error('Invalid first server');if(!lineups)throw Error('Lineups required');if(!Number.isInteger(target)||target<2)throw Error('Invalid target');validateLineup(lineups.a);validateLineup(lineups.b);
if(rosters)for(const side of ['a','b']){const rs=rosters[side];if(!Array.isArray(rs)||new Set(rs.map(p=>p.id)).size!==rs.length)throw Error('Invalid roster');for(const id of Object.values(lineups[side])){const p=rs.find(p=>p.id===id);if(!p||p.role==='libero')throw Error('Invalid starting six')}}return {schema:1,initial:{lineups:copy(lineups),rosters:copy(rosters),firstServer,target},events:[]}}
function rosterOf(m,side){return m.initial.rosters?.[side]||null}
function legalPlayer(m,side,id){const roster=rosterOf(m,side);return !roster||roster.some(p=>p.id===id)}
function liberoIds(m,side){return (rosterOf(m,side)||[]).filter(p=>p.role==='libero').map(p=>p.id)}
function onCourt(s,side){const l=s.lineups[side],x=s.liberos[side];return Object.fromEntries(zones.map(z=>[z,x&&x.zone===z?x.id:l[z]]))}
function applyLibero(m,s,e){
 const {side,action}=e;if(!['a','b'].includes(side))throw Error('Invalid side');
 const active=s.liberos[side],ids=liberoIds(m,side);
 if(action==='enter'){
  if(active)throw Error('Libero already on court');
  if(!ids.includes(e.liberoId))throw Error('Unregistered libero');
  if(!back.has(e.zone))throw Error('Libero must enter back row');if(s.serving===side&&e.zone==='1')throw Error('Libero cannot serve');
  if(s.lineups[side][e.zone]!==e.replacedId)throw Error('Replacement player not in zone');
  s.liberos[side]={id:e.liberoId,replacedId:e.replacedId,zone:e.zone};
 }else if(action==='exit'){
  if(!active||active.id!==e.liberoId)throw Error('Libero not on court');
  s.liberos[side]=null;
 }else if(action==='switch'){
  if(!active||active.id!==e.outId)throw Error('Outgoing libero not on court');
  if(!ids.includes(e.inId)||e.inId===e.outId)throw Error('Invalid incoming libero');
  s.liberos[side]={...active,id:e.inId};
 }else throw Error('Unknown libero action');
}
function applySub(m,s,e){
 const {side,outId,inId}=e;if(!['a','b'].includes(side))throw Error('Invalid side');
 if(!legalPlayer(m,side,inId)||liberoIds(m,side).includes(inId))throw Error('Invalid substitute');
 const z=zones.find(z=>s.lineups[side][z]===outId);if(!z)throw Error('Outgoing player not on court');
 if(Object.values(s.lineups[side]).includes(inId))throw Error('Substitute already on court');
 if(s.liberos[side]?.zone===z)throw Error('Release libero before substitution');
 s.lineups[side][z]=inId;s.substitutions[side].push({outId,inId,zone:z});
}
function derive(m){const {lineups,firstServer,target}=m.initial;const s={score:{a:0,b:0},serving:firstServer,lineups:copy(lineups),rallies:[],finished:false,liberos:{a:null,b:null},substitutions:{a:[],b:[]}};for(const e of m.events){if(e.type==='libero'){if(s.finished)throw Error('Set already finished');applyLibero(m,s,e);continue}
if(e.type==='substitution'){if(s.finished)throw Error('Set already finished');applySub(m,s,e);continue}
if(e.type!=='rally')throw Error('Unsupported event');if(s.finished)throw Error('Set already finished');if(!['a','b'].includes(e.winner))throw Error('Invalid winner');if(!Array.isArray(e.contacts))throw Error('Contacts must be array');
if(s.liberos[s.serving]?.zone==='1')throw Error('Libero cannot serve');
const before={score:copy(s.score),serving:s.serving,server:s.lineups[s.serving]['1'],lineups:copy(s.lineups),onCourt:{a:onCourt(s,'a'),b:onCourt(s,'b')}};s.score[e.winner]++;if(e.winner!==s.serving){
 const active=s.liberos[e.winner];
 if(active){const next=zones[(zones.indexOf(active.zone)+1)%zones.length];if(!back.has(next))throw Error('Libero must exit before front-row rotation');if(next==='1')throw Error('Libero cannot rotate into serving position');}
 s.lineups[e.winner]=rotate(s.lineups[e.winner]);s.serving=e.winner
}for(const side of ['a','b']){const l=s.liberos[side];if(l){const newZone=zones.find(z=>s.lineups[side][z]===l.replacedId);if(!newZone||!back.has(newZone))throw Error('Libero replacement must be recorded explicitly');else l.zone=newZone}}
s.finished=Math.max(s.score.a,s.score.b)>=target&&Math.abs(s.score.a-s.score.b)>=2;s.rallies.push({id:e.id,contacts:copy(e.contacts),winner:e.winner,before,after:{score:copy(s.score),serving:s.serving,server:s.lineups[s.serving]['1'],lineups:copy(s.lineups),onCourt:{a:onCourt(s,'a'),b:onCourt(s,'b')}}})}return s}
function appendRally(m,{id,winner,contacts=[]}){if(!id)throw Error('Rally ID required');if(m.events.some(e=>e.id===id))throw Error('Duplicate rally ID');const n=copy(m);n.events.push({type:'rally',id,winner,contacts:copy(contacts)});derive(n);return n}
function editRally(m,id,patch){const n=copy(m),i=n.events.findIndex(e=>e.id===id);if(i<0)throw Error('Rally not found');if(patch.winner!==undefined)n.events[i].winner=patch.winner;if(patch.contacts!==undefined)n.events[i].contacts=copy(patch.contacts);derive(n);return n}
function removeRally(m,id){const n=copy(m),i=n.events.findIndex(e=>e.id===id);if(i<0)throw Error('Rally not found');n.events.splice(i,1);derive(n);return n}
function appendLineupEvent(m,event){if(!['libero','substitution'].includes(event.type))throw Error('Unsupported lineup event');const n=copy(m);n.events.push(copy(event));derive(n);return n}
function editEvent(m,eventIndex,patch){const n=copy(m);if(!n.events[eventIndex])throw Error('Event not found');n.events[eventIndex]={...n.events[eventIndex],...copy(patch)};derive(n);return n}
function addContact(m,id,contact){const e=m.events.find(e=>e.id===id);if(!e)throw Error('Rally not found');return editRally(m,id,{contacts:[...e.contacts,copy(contact)]})}
return {newMatch,derive,appendRally,editRally,removeRally,addContact,appendLineupEvent,editEvent,onCourt,rotate};
});