const test=require('node:test'),assert=require('node:assert/strict'),M=require('./match.js');
const L={a:{'1':'A1','6':'A6','5':'A5','4':'A4','3':'A3','2':'A2'},b:{'1':'B1','6':'B6','5':'B5','4':'B4','3':'B3','2':'B2'}};
function finish(m,side,prefix){let s=M.derive(m);const target=m.sets.at(-1).initial.target;for(let i=0;i<target;i++)m=M.appendRally(m,{id:prefix+i,winner:side});return m}
test('new match starts without sets',()=>{assert.deepEqual(M.derive(M.newMatch()).won,{a:0,b:0})});
test('first set starts to 25',()=>{const m=M.startSet(M.newMatch(),{lineups:L,firstServer:'a'});assert.equal(m.sets[0].initial.target,25)});
test('cannot start second set until first finished',()=>{const m=M.startSet(M.newMatch(),{lineups:L});assert.throws(()=>M.startSet(m,{lineups:L}),/unfinished/)});
test('second set alternates first service',()=>{let m=M.startSet(M.newMatch(),{lineups:L,firstServer:'a'});m=finish(m,'a','a');m=M.startSet(m,{lineups:L});assert.equal(m.sets[1].initial.firstServer,'b')});
test('match finishes at three won sets',()=>{let m=M.newMatch();for(let i=0;i<3;i++){m=M.startSet(m,{lineups:L});m=finish(m,'a','set'+i+'-')}assert.equal(M.derive(m).winner,'a');assert.equal(M.derive(m).won.a,3);assert.throws(()=>M.startSet(m,{lineups:L}),/finished/)});
test('deciding fifth set requires coin toss and targets 15',()=>{let m=M.newMatch();for(let i=0;i<4;i++){m=M.startSet(m,{lineups:L});m=finish(m,i%2===0?'a':'b','set'+i+'-')}assert.throws(()=>M.startSet(m,{lineups:L}),/explicit first server/);m=M.startSet(m,{lineups:L,firstServer:'a'});assert.equal(m.sets[4].initial.target,15);m=finish(m,'a','fifth-');assert.equal(M.derive(m).winner,'a')});
test('per-set statistics remain isolated',()=>{let m=M.startSet(M.newMatch(),{lineups:L});m=M.appendRally(m,{id:'touch',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'serve'}]});const st=M.statistics(m);assert.equal(st.sets[0].statistics.players['a:A1'].total,1)});
