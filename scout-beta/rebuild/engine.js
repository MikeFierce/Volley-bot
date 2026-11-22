/* Питерский Скаут: deterministic rally ledger v0.1, standalone browser/Node */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ScoutEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const zones=['1','6','5','4','3','2'],back=new Set(['1','6','5']),copy=x=>JSON.parse(JSON.stringify(x));
function validateLineup(l){if(!l||zones.some(z=>!l[z]))throw Error('Missing lineup zone');if(new Set(zones.map(z=>l[z])).size!==6)throw Error('Duplicate player')}
function rotate(l){const out={};for(let i=0;i<zones.length;i++)out[zones[(i+1)%6]]=l[zones[i]];return out}
function newMatch({lineups,rosters=null,firstServer='a',target=25}={}){if(!['a','b'].includes(firstServer))throw Error('Invalid first server');if(!lineups)throw Error('Lineups required');if(!Number.isInteger(target)||target<2)throw Error('Invalid target');validateLineup(lineups.a);validateLineup(lineups.b);
if(rosters){if(!rosters.a||!rosters.b)throw Error('Invalid roster');const allIds=new Set();for(const side of ['a','b']){const rs=rosters[side];if(!Array.isArray(rs)||rs.some(p=>!p||typeof p.id!=='string'||!p.id||!['field','libero'].includes(p.role))||new Set(rs.map(p=>p.id)).size!==rs.length)throw Error('Invalid roster');for(const p of rs){if(allIds.has(p.id))throw Error('Duplicate cross-team player ID');allIds.add(p.id)}for(const id of Object.values(lineups[side])){const p=rs.find(p=>p.id===id);if(!p||p.role==='libero')throw Error('Invalid starting six')}}}return {schema:1,initial:{lineups:copy(lineups),rosters:copy(rosters),firstServer,target},events:[]}}
function rosterOf(m,side){return m.initial.rosters?.[side]||null}
function legalPlayer(m,side,id){const roster=rosterOf(m,side);return !roster||roster.some(p=>p.id===id)}
function liberoIds(m,side){return (rosterOf(m,side)||[]).filter(p=>p.role==='libero').map(p=>p.id)}
function onCourt(s,side){const l=s.lineups[side],x=s.liberos[side];return Object.fromEntries(zones.map(z=>[z,x&&x.zone===z?x.id:l[z]]))}
function applyLibero(m,s,e){
 const {side,action}=e;if(!['a','b'].includes(side))throw Error('Invalid side');
 const active=s.liberos[side],ids=liberoIds(m,side);
 if(action==='enter'&&active)throw Error('Libero already on court');
 if(s.liberoActionAt[side]===s.rallies.length)throw Error('Completed rally required between Libero replacements');
 if(action==='enter'){
  if(!ids.includes(e.liberoId))throw Error('Unregistered libero');
  if(e.zone==='1')throw Error('Libero cannot serve');if(!['5','6'].includes(e.zone))throw Error('Libero must enter back row');
  if(s.lineups[side][e.zone]!==e.replacedId)throw Error('Replacement player not in zone');
  s.liberos[side]={id:e.liberoId,replacedId:e.replacedId,zone:e.zone};
 }else if(action==='exit'){
  if(!active||active.id!==e.liberoId)throw Error('Libero not on court');
  if(e.replacedId!==undefined&&e.replacedId!==active.replacedId)throw Error('Only replaced player may return');
  s.liberos[side]=null;
 }else if(action==='switch'){
  if(!active||active.id!==e.outId)throw Error('Outgoing libero not on court');
  if(!ids.includes(e.inId)||e.inId===e.outId)throw Error('Invalid incoming libero');
  s.liberos[side]={...active,id:e.inId};
 }else throw Error('Unknown libero action');
 s.liberoActionAt[side]=s.rallies.length;
}
function applySub(m,s,e){
 const {side,outId,inId}=e;if(!['a','b'].includes(side))throw Error('Invalid side');
 if(!legalPlayer(m,side,inId)||liberoIds(m,side).includes(inId))throw Error('Invalid substitute');
 const z=zones.find(z=>s.lineups[side][z]===outId);if(!z)throw Error('Outgoing player not on court');
 if(Object.values(s.lineups[side]).includes(inId))throw Error('Substitute already on court');
 if(s.substitutions[side].length>=6)throw Error('Six substitutions per set exceeded');
 const starters=new Set(Object.values(m.initial.lineups[side]));
 const pairs=s.substitutionPairs[side];
 if(starters.has(outId)){
  if(pairs[outId])throw Error('Starting player cannot be replaced twice');
  if(starters.has(inId)||Object.values(pairs).includes(inId))throw Error('Invalid incoming substitute');
  pairs[outId]=inId;
 }else{
  const original=Object.keys(pairs).find(k=>pairs[k]===outId);
  if(!original||inId!==original)throw Error('Substitute may only be replaced by original starter');
  if(s.returnedStarters[side].includes(original))throw Error('Starter already returned');
  s.returnedStarters[side].push(original);
 }
 if(s.liberos[side]?.zone===z)throw Error('Release libero before substitution');
 s.lineups[side][z]=inId;s.substitutions[side].push({outId,inId,zone:z});
}
function validateContacts(m,s,contacts){
 const allowed=new Set(['serve','receive','set','attack','block','dig','Подача','Приём','Передача','Атака','Блок','Защита']);
 for(const c of contacts){
  if(!c||typeof c!=='object'||!allowed.has(c.skill))throw Error('Invalid contact skill');
  if(typeof c.playerId!=='string'||!c.playerId)throw Error('Contact player required');
  if(!['a','b'].includes(c.side))throw Error('Invalid contact side');
  const court=onCourt(s,c.side);
  if(!Object.values(court).includes(c.playerId))throw Error('Contact player not on court');
  const lib=liberoIds(m,c.side).includes(c.playerId);
  if(lib&&['serve','Подача','block','Блок'].includes(c.skill))throw Error('Illegal libero action');
  if(['serve','Подача'].includes(c.skill)&&(c.side!==s.serving||c.playerId!==court['1']))throw Error('Wrong server');
  if(c.quality!==undefined&&!['++','+','/','-','=','!'].includes(c.quality))throw Error('Invalid quality');if(c.videoTimeSec!==undefined&&(!Number.isFinite(c.videoTimeSec)||c.videoTimeSec<0))throw Error('Invalid video time');for(const field of ['origin','target'])if(c[field]!==undefined&&c[field]!==null){const pt=c[field];if(!pt||!Number.isFinite(pt.x)||!Number.isFinite(pt.y)||pt.x<0||pt.x>1||pt.y<0||pt.y>1)throw Error('Invalid '+field+' coordinates')}if(c.result!==undefined&&c.result!==null){if(!['point','error','inplay'].includes(c.result)||!['serve','attack','block','Подача','Атака','Блок'].includes(c.skill))throw Error('Invalid skill outcome')}
  if(c.zone!==undefined&&c.zone!==null&&!['1','2','3','4','5','6','7','8','9','стык 1/6','стык 5/6','стык 2/3','стык 3/4','стык 4/7','стык 3/8','стык 2/9','стык 7/8','стык 8/9'].includes(c.zone))throw Error('Invalid zone');if(c.passType!==undefined&&c.passType!==null&&!['быстро','высоко','иное','узко','широко'].includes(c.passType))throw Error('Invalid pass type');if(c.combination!==undefined&&c.combination!==null&&!['','вход в зону','забегание за голову'].includes(c.combination))throw Error('Invalid combination');if((c.passType!==undefined||c.combination!==undefined)&&!['set','Передача'].includes(c.skill))throw Error('Pass details require setting action');
 }
}
function derive(m){const {lineups,firstServer,target}=m.initial;const s={score:{a:0,b:0},serving:firstServer,lineups:copy(lineups),rallies:[],finished:false,liberos:{a:null,b:null},substitutions:{a:[],b:[]},substitutionPairs:{a:{},b:{}},returnedStarters:{a:[],b:[]},liberoActionAt:{a:null,b:null},timeouts:{a:0,b:0}};for(const e of m.events){if(e.type==='libero'){if(s.finished)throw Error('Set already finished');applyLibero(m,s,e);continue}
if(e.type==='substitution'){if(s.finished)throw Error('Set already finished');applySub(m,s,e);continue}
if(e.type==='annotation'){if(s.finished)throw Error('Set already finished');if(!['yellow','red','expulsion','disqualification','fault','timeout','note'].includes(e.kind)||!['a','b'].includes(e.side)||typeof e.note!=='string'||e.note.length>500)throw Error('Invalid journal event');if(e.kind==='timeout'&&++s.timeouts[e.side]>2)throw Error('Only two timeouts per team per set');continue}
if(e.type!=='rally')throw Error('Unsupported event');if(s.finished)throw Error('Set already finished');if(!['a','b'].includes(e.winner))throw Error('Invalid winner');if(!Array.isArray(e.contacts))throw Error('Contacts must be array');
if(s.liberos[s.serving]?.zone==='1')throw Error('Libero cannot serve');if(e.reason!==undefined&&!['penalty'].includes(e.reason))throw Error('Invalid scoring reason');if(e.reason==='penalty'){if(e.contacts.length)throw Error('Penalty cannot include contacts');const previous=m.events[m.events.indexOf(e)-1];if(!previous||previous.type!=='annotation'||previous.kind!=='red'||previous.side===e.winner)throw Error('Penalty must follow red card of opponent')}validateContacts(m,s,e.contacts);for(const c of e.contacts){if(c.result==='point'&&c.side!==e.winner)throw Error('Point outcome conflicts with winner');if(c.result==='error'&&c.side===e.winner)throw Error('Error outcome conflicts with winner')}
const before={score:copy(s.score),serving:s.serving,server:s.lineups[s.serving]['1'],lineups:copy(s.lineups),onCourt:{a:onCourt(s,'a'),b:onCourt(s,'b')}};s.score[e.winner]++;if(e.winner!==s.serving){
 const active=s.liberos[e.winner];
 if(active){const next=zones[(zones.indexOf(active.zone)+1)%zones.length];if(!back.has(next)||next==='1'){s.liberos[e.winner]=null;}}
 s.lineups[e.winner]=rotate(s.lineups[e.winner]);s.serving=e.winner
}for(const side of ['a','b']){const l=s.liberos[side];if(l){const newZone=zones.find(z=>s.lineups[side][z]===l.replacedId);if(!newZone||!back.has(newZone))throw Error('Libero replacement must be recorded explicitly');else l.zone=newZone}}
s.finished=Math.max(s.score.a,s.score.b)>=target&&Math.abs(s.score.a-s.score.b)>=2;s.rallies.push({id:e.id,reason:e.reason||null,contacts:copy(e.contacts),winner:e.winner,before,after:{score:copy(s.score),serving:s.serving,server:s.lineups[s.serving]['1'],lineups:copy(s.lineups),onCourt:{a:onCourt(s,'a'),b:onCourt(s,'b')}}})}return s}
function statistics(m){
 const state=derive(m),players={},newTeam=()=>({ralliesWon:0,receivingRallies:0,sideOuts:0,servingRallies:0,breakPoints:0,sideOutPct:null,breakPointPct:null,contacts:0,bySkill:{},qualities:{},annotations:{},substitutions:0,liberoActions:0}),teams={a:newTeam(),b:newTeam()};
 const addGrade=(v,q,result)=>{v.total++;if(q!==undefined){v.graded++;v.qualities[q]=(v.qualities[q]||0)+1}if(result){v.outcomes[result]=(v.outcomes[result]||0)+1;v.outcomesTagged++}};
 for(const e of m.events){
  if(e.type==='annotation')teams[e.side].annotations[e.kind]=(teams[e.side].annotations[e.kind]||0)+1;
  if(e.type==='substitution')teams[e.side].substitutions++;
  if(e.type==='libero')teams[e.side].liberoActions++;
 }
 for(const rally of state.rallies){
  if(rally.reason==='penalty'){teams[rally.winner].penaltyPoints=(teams[rally.winner].penaltyPoints||0)+1;continue}
  const server=rally.before.serving,receiver=server==='a'?'b':'a';teams[server].servingRallies++;teams[receiver].receivingRallies++;if(rally.winner===server)teams[server].breakPoints++;else teams[receiver].sideOuts++;
  teams[rally.winner].ralliesWon++;
  for(const c of rally.contacts){
   const k=c.side+':'+c.playerId;
   if(!players[k])players[k]={side:c.side,playerId:c.playerId,total:0,skills:{},qualities:{},bySkill:{},passTypes:{},combinations:{}};
   const p=players[k],t=teams[c.side];if(c.passType)p.passTypes[c.passType]=(p.passTypes[c.passType]||0)+1;if(c.combination)p.combinations[c.combination]=(p.combinations[c.combination]||0)+1;p.total++;p.skills[c.skill]=(p.skills[c.skill]||0)+1;
   const by=p.bySkill[c.skill]||(p.bySkill[c.skill]={total:0,graded:0,qualities:{},outcomes:{},outcomesTagged:0});addGrade(by,c.quality,c.result);
   const teamBy=t.bySkill[c.skill]||(t.bySkill[c.skill]={total:0,graded:0,qualities:{},outcomes:{},outcomesTagged:0});addGrade(teamBy,c.quality,c.result);
   if(c.quality!==undefined){p.qualities[c.quality]=(p.qualities[c.quality]||0)+1;t.qualities[c.quality]=(t.qualities[c.quality]||0)+1;}
   t.contacts++;
  }
 }
 const summarize=by=>{by.positive=(by.qualities['++']||0)+(by.qualities['+']||0);by.negative=(by.qualities['-']||0)+(by.qualities['=']||0);by.positivePct=by.graded?Math.round(by.positive/by.graded*1000)/10:null;by.errorPct=by.graded?Math.round((by.qualities['=']||0)/by.graded*1000)/10:null;by.points=by.outcomes.point||0;by.errors=by.outcomes.error||0;by.efficiencyPct=by.outcomesTagged===by.total&&by.total?Math.round((by.points-by.errors)/by.total*1000)/10:null};
 for(const p of Object.values(players))for(const by of Object.values(p.bySkill))summarize(by);
 for(const t of Object.values(teams)){for(const by of Object.values(t.bySkill))summarize(by);t.sideOutPct=t.receivingRallies?Math.round(t.sideOuts/t.receivingRallies*1000)/10:null;t.breakPointPct=t.servingRallies?Math.round(t.breakPoints/t.servingRallies*1000)/10:null}
 return {score:copy(state.score),teams,players,rallies:state.rallies.length};
}
function tactics(m){
 const state=derive(m),connections=[],setters={};
 const isSet=c=>c.skill==='Передача'||c.skill==='set',isReceive=c=>c.skill==='Приём'||c.skill==='receive',isAttack=c=>c.skill==='Атака'||c.skill==='attack';
 for(const rally of state.rallies){const cs=rally.contacts;
  for(let i=0;i<cs.length;i++){const c=cs[i];if(!isSet(c))continue;
   const key=c.side+':'+c.playerId,entry=setters[key]||(setters[key]={side:c.side,playerId:c.playerId,sets:0,linked:0,byAttacker:{}});
   entry.sets++;
   let reception=null;for(let j=i-1;j>=0;j--){if(cs[j].side!==c.side||['Защита','dig'].includes(cs[j].skill))break;if(isReceive(cs[j])){reception=cs[j];break}}
   let attacker=null;for(let j=i+1;j<cs.length;j++){if(cs[j].side!==c.side||isSet(cs[j]))break;if(isAttack(cs[j])){attacker=cs[j];break}}
   const position=Object.entries(rally.before.lineups[c.side]).find(([,id])=>id===c.playerId)?.[0]||null;
   const link={rallyId:rally.id,side:c.side,setterId:c.playerId,attackerId:attacker?.playerId||null,rotation:position,receptionQuality:reception?.quality??null,passType:c.passType||null,combination:c.combination||null,attackResult:attacker?.result||null,videoTimeSec:c.videoTimeSec??null};
   connections.push(link);
   if(attacker){entry.linked++;const t=entry.byAttacker[attacker.playerId]||(entry.byAttacker[attacker.playerId]={count:0,points:0,errors:0,classified:0});t.count++;if(attacker.result){t.classified++;if(attacker.result==='point')t.points++;if(attacker.result==='error')t.errors++}}
  }
 }
 return {connections,setters};
}
function appendRally(m,{id,winner,contacts=[],reason=null}){if(!id)throw Error('Rally ID required');if(m.events.some(e=>e.id===id))throw Error('Duplicate rally ID');const n=copy(m);n.events.push({type:'rally',id,winner,contacts:copy(contacts),...(reason?{reason}:{})});derive(n);return n}
function editRally(m,id,patch){const n=copy(m),i=n.events.findIndex(e=>e.type==='rally'&&e.id===id);if(i<0)throw Error('Rally not found');if(patch.winner!==undefined){if(n.events[i].reason==='penalty'&&patch.winner!==n.events[i].winner)throw Error('Penalty winner cannot be edited');n.events[i].winner=patch.winner}if(patch.contacts!==undefined)n.events[i].contacts=copy(patch.contacts);derive(n);return n}
function removeRally(m,id){const n=copy(m),i=n.events.findIndex(e=>e.type==='rally'&&e.id===id);if(i<0)throw Error('Rally not found');if(n.events[i].reason==='penalty'&&n.events[i-1]?.type==='annotation'&&n.events[i-1].kind==='red')n.events.splice(i-1,2);else n.events.splice(i,1);derive(n);return n}
function appendLineupEvent(m,event){if(!['libero','substitution'].includes(event.type))throw Error('Unsupported lineup event');const n=copy(m);n.events.push(copy(event));derive(n);return n}
function appendAnnotation(m,{kind,side,playerId=null,note=''}){const n=copy(m);n.events.push({type:'annotation',id:'a'+Date.now()+'-'+Math.random().toString(36).slice(2,7),kind,side,playerId,note});derive(n);return n}
function editEvent(m,eventIndex,patch){const n=copy(m);if(!Number.isInteger(eventIndex)||eventIndex<0||!n.events[eventIndex])throw Error('Event not found');if(!patch||typeof patch!=='object'||Array.isArray(patch)||'type' in patch||'id' in patch)throw Error('Event identity cannot be edited');n.events[eventIndex]={...n.events[eventIndex],...copy(patch)};derive(n);return n}
function editContact(m,rallyId,index,patch){const e=m.events.find(e=>e.type==='rally'&&e.id===rallyId);if(!e)throw Error('Rally not found');if(!Number.isInteger(index)||index<0||index>=e.contacts.length)throw Error('Contact not found');const contacts=copy(e.contacts);contacts[index]={...contacts[index],...copy(patch)};return editRally(m,rallyId,{contacts})}
function addContact(m,id,contact){const e=m.events.find(e=>e.id===id);if(!e)throw Error('Rally not found');return editRally(m,id,{contacts:[...e.contacts,copy(contact)]})}
function validateDraft(m,contacts){const state=derive(m);if(state.finished)throw Error('Set already finished');if(!Array.isArray(contacts))throw Error('Contacts must be array');validateContacts(m,state,contacts);return true}
return {newMatch,derive,statistics,tactics,validateDraft,appendRally,editRally,removeRally,addContact,editContact,appendLineupEvent,appendAnnotation,editEvent,onCourt,rotate};
});