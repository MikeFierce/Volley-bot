/* Best-of-five match orchestration, built on the per-set ScoutEngine ledger. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.ScoutEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.ScoutMatch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function newMatch({rosters=null,bestOf=5}={}){if(![3,5].includes(bestOf))throw Error('Only best-of-three or best-of-five');return {schema:2,bestOf,rosters:clone(rosters),sets:[]}}
function derive(m){
 if(!m||m.schema!==2||![3,5].includes(m.bestOf)||!Array.isArray(m.sets))throw Error('Invalid match');
 const need=Math.floor(m.bestOf/2)+1,won={a:0,b:0},sets=[];let finished=false;
 for(let i=0;i<m.sets.length;i++){
  if(finished)throw Error('Match already finished');
  const set=m.sets[i],expected=i===m.bestOf-1?15:25;
  if(set.initial.target!==expected)throw Error('Wrong set target');
  if(i>0&&(!sets[i-1].finished))throw Error('Previous set unfinished');
  if(i>0&&i<m.bestOf-1&&set.initial.firstServer===m.sets[i-1].initial.firstServer)throw Error('Starting service must alternate');
  const state=E.derive(set);
  sets.push({number:i+1,score:clone(state.score),finished:state.finished,firstServer:set.initial.firstServer,rallies:state.rallies.length});
  if(state.finished){const winner=state.score.a>state.score.b?'a':'b';won[winner]++;if(won[winner]===need)finished=true}
 }
 return {sets,won,finished,winner:finished?(won.a>won.b?'a':'b'):null,nextSet:finished?null:sets.length+1};
}
function startSet(m,{lineups,firstServer}={}){
 const n=clone(m),state=derive(n),i=n.sets.length;
 if(state.finished)throw Error('Match already finished');
 if(i>0&&!state.sets[i-1].finished)throw Error('Previous set unfinished');
 if(i>=n.bestOf)throw Error('Maximum sets reached');
 const server=firstServer||(i===0?'a':n.sets[i-1].initial.firstServer==='a'?'b':'a');
 if(i===n.bestOf-1&&!firstServer)throw Error('Deciding set requires explicit first server');
 n.sets.push(E.newMatch({lineups,rosters:n.rosters,firstServer:server,target:i===n.bestOf-1?15:25}));
 derive(n);return n;
}
function updateCurrentSet(m,fn){
 const n=clone(m),s=derive(n);if(s.finished||!n.sets.length)throw Error('No active set');
 const i=n.sets.length-1;if(s.sets[i].finished)throw Error('Start next set');
 const updated=fn(clone(n.sets[i]));E.derive(updated);n.sets[i]=updated;derive(n);return n;
}
function appendRally(m,rally){return updateCurrentSet(m,s=>E.appendRally(s,rally))}
function appendLineupEvent(m,event){return updateCurrentSet(m,s=>E.appendLineupEvent(s,event))}
function appendAnnotation(m,event){return updateCurrentSet(m,s=>E.appendAnnotation(s,event))}
function statistics(m){const state=derive(m);return {match:state,sets:m.sets.map((set,i)=>({number:i+1,statistics:E.statistics(set)}))}}
return {newMatch,derive,startSet,updateCurrentSet,appendRally,appendLineupEvent,appendAnnotation,statistics};
});
