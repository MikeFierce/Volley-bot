const assert=require('node:assert/strict'),test=require('node:test'),E=require('./engine.js');
const L={a:{'1':'A1','6':'A6','5':'A5','4':'A4','3':'A3','2':'A2'},b:{'1':'B1','6':'B6','5':'B5','4':'B4','3':'B3','2':'B2'}},start=()=>E.newMatch({lineups:L,firstServer:'a'});
test('sideout rotates receiver',()=>{const s=E.derive(E.appendRally(start(),{id:'1',winner:'b'}));assert.equal(s.serving,'b');assert.equal(s.lineups.b['1'],'B2');assert.equal(s.lineups.a['1'],'A1')});
test('serving winner stays',()=>{const s=E.derive(E.appendRally(start(),{id:'1',winner:'a'}));assert.equal(s.serving,'a');assert.deepEqual(s.lineups,L)});
test('historical correction replays future rotation',()=>{let m=E.appendRally(start(),{id:'1',winner:'a'});m=E.appendRally(m,{id:'2',winner:'b'});const s=E.derive(E.editRally(m,'1',{winner:'b'}));assert.equal(s.rallies[1].before.server,'B2');assert.equal(s.score.b,2)});
test('append contact',()=>{let m=E.appendRally(start(),{id:'1',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'serve'}]});m=E.addContact(m,'1',{side:'b',playerId:'B6',skill:'receive'});assert.equal(m.events[0].contacts.length,2)});
test('remove rally',()=>{let m=E.removeRally(E.appendRally(start(),{id:'1',winner:'b'}),'1');assert.deepEqual(E.derive(m).score,{a:0,b:0})});
test('set end prevents next rally',()=>{let m=E.newMatch({lineups:L,target:2});m=E.appendRally(m,{id:'1',winner:'a'});m=E.appendRally(m,{id:'2',winner:'a'});assert.throws(()=>E.appendRally(m,{id:'3',winner:'b'}),/finished/)});
test('duplicate rally rejected',()=>{const m=E.appendRally(start(),{id:'1',winner:'a'});assert.throws(()=>E.appendRally(m,{id:'1',winner:'b'}))});
const roster={a:[...Object.values(L.a).map(id=>({id,role:'field'})),{id:'LA',role:'libero'},{id:'LA2',role:'libero'},{id:'A7',role:'field'}],b:[...Object.values(L.b).map(id=>({id,role:'field'})),{id:'LB',role:'libero'}]};
const match=()=>E.newMatch({lineups:L,rosters:roster,firstServer:'a'});
test('libero enters back row and appears on court',()=>{const m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});assert.equal(E.onCourt(E.derive(m),'a')['5'],'LA')});
test('libero cannot enter front row',()=>{assert.throws(()=>E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A4',zone:'4'}),/back row/)});
test('two liberos cannot enter simultaneously',()=>{const m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});assert.throws(()=>E.appendLineupEvent(m,{type:'libero',side:'a',action:'enter',liberoId:'LA2',replacedId:'A6',zone:'6'}),/already/)});
test('switch between registered liberos',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});m=E.appendRally(m,{id:'between',winner:'a'});m=E.appendLineupEvent(m,{type:'libero',side:'a',action:'switch',outId:'LA',inId:'LA2'});assert.equal(E.onCourt(E.derive(m),'a')['5'],'LA2')});
test('field substitution changes on-court player',()=>{const m=E.appendLineupEvent(match(),{type:'substitution',side:'a',outId:'A5',inId:'A7'});assert.equal(E.onCourt(E.derive(m),'a')['5'],'A7')});
test('substitution cannot remove player covered by libero',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});assert.throws(()=>E.appendLineupEvent(m,{type:'substitution',side:'a',outId:'A5',inId:'A7'}),/Release libero/)});
test('editing earlier libero event replays state',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});m=E.appendRally(m,{id:'r1',winner:'a'});m=E.editEvent(m,0,{liberoId:'LA2'});assert.equal(E.derive(m).rallies[0].before.onCourt.a['5'],'LA2')});

test('libero cannot enter serving zone 1',()=>{assert.throws(()=>E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A1',zone:'1'}),/cannot serve/)});
test('side-out records point and automatically releases libero before front-row rotation',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'b',action:'enter',liberoId:'LB',replacedId:'B5',zone:'5'});m=E.appendRally(m,{id:'r',winner:'b'});const s=E.derive(m);assert.equal(s.score.b,1);assert.equal(s.serving,'b');assert.equal(s.liberos.b,null);assert.equal(s.lineups.b['4'],'B5')});
test('explicit libero exit allows side-out',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'b',action:'enter',liberoId:'LB',replacedId:'B5',zone:'5'});m=E.appendRally(m,{id:'between',winner:'a'});m=E.appendLineupEvent(m,{type:'libero',side:'b',action:'exit',liberoId:'LB'});m=E.appendRally(m,{id:'r',winner:'b'});assert.equal(E.derive(m).serving,'b')});
test('reject libero in starting six',()=>{const bad=JSON.parse(JSON.stringify(L));bad.a['1']='LA';assert.throws(()=>E.newMatch({lineups:bad,rosters:roster}),/starting six/)});
test('invalid historical edit is rejected',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'b',action:'enter',liberoId:'LB',replacedId:'B5',zone:'5'});m=E.appendRally(m,{id:'between',winner:'a'});m=E.appendLineupEvent(m,{type:'libero',side:'b',action:'exit',liberoId:'LB'});m=E.appendRally(m,{id:'r',winner:'b'});assert.throws(()=>E.editEvent(m,2,{action:'switch',outId:'LB',inId:'LB'}))});

test('reject off-court contact',()=>{assert.throws(()=>E.appendRally(match(),{id:'off',winner:'a',contacts:[{side:'a',playerId:'A7',skill:'Атака'}]}),/not on court/)});
test('reject wrong server',()=>{assert.throws(()=>E.appendRally(match(),{id:'wrong',winner:'a',contacts:[{side:'b',playerId:'B1',skill:'Подача'}]}),/Wrong server/)});
test('edit saved contact and preserve rally score',()=>{let m=E.appendRally(match(),{id:'touch',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'+'}]});m=E.editContact(m,'touch',0,{quality:'-'});assert.equal(m.events[0].contacts[0].quality,'-');assert.deepEqual(E.derive(m).score,{a:1,b:0})});
test('reject edit to off-court player',()=>{const m=E.appendRally(match(),{id:'touch',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача'}]});assert.throws(()=>E.editContact(m,'touch',0,{playerId:'A7'}),/not on court/)});
test('libero cannot block',()=>{let m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});assert.throws(()=>E.appendRally(m,{id:'r',winner:'a',contacts:[{side:'a',playerId:'LA',skill:'Блок'}]}),/Illegal libero/)});

test('standard substitution return to starter is allowed',()=>{let m=E.appendLineupEvent(match(),{type:'substitution',side:'a',outId:'A5',inId:'A7'});m=E.appendLineupEvent(m,{type:'substitution',side:'a',outId:'A7',inId:'A5'});assert.equal(E.derive(m).lineups.a['5'],'A5')});
test('substitute cannot replace another starter after first pair',()=>{let m=E.appendLineupEvent(match(),{type:'substitution',side:'a',outId:'A5',inId:'A7'});m=E.appendLineupEvent(m,{type:'substitution',side:'a',outId:'A7',inId:'A5'});assert.throws(()=>E.appendLineupEvent(m,{type:'substitution',side:'a',outId:'A6',inId:'A7'}),/Invalid incoming substitute/)});
test('starter cannot leave court twice in one set',()=>{let m=E.appendLineupEvent(match(),{type:'substitution',side:'a',outId:'A5',inId:'A7'});m=E.appendLineupEvent(m,{type:'substitution',side:'a',outId:'A7',inId:'A5'});assert.throws(()=>E.appendLineupEvent(m,{type:'substitution',side:'a',outId:'A5',inId:'A7'}),/cannot be replaced twice/)});
test('reject invalid contact quality and zone',()=>{assert.throws(()=>E.appendRally(match(),{id:'q',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'invalid'}]}),/Invalid quality/);assert.throws(()=>E.appendRally(match(),{id:'z',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',zone:'999'}]}),/Invalid zone/)});

test('contact without player is rejected',()=>{assert.throws(()=>E.appendRally(match(),{id:'no-player',winner:'a',contacts:[{skill:'serve'}]}),/player required/)});
test('wrong serving player is rejected even if same side',()=>{assert.throws(()=>E.appendRally(match(),{id:'server',winner:'a',contacts:[{side:'a',playerId:'A2',skill:'serve'}]}),/Wrong server/)});

test('statistics aggregate player touches and team rally wins',()=>{let m=E.appendRally(match(),{id:'one',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'++'},{side:'b',playerId:'B6',skill:'Приём',quality:'-'}]});m=E.appendRally(m,{id:'two',winner:'b',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'+'}]});const t=E.statistics(m);assert.equal(t.teams.a.ralliesWon,1);assert.equal(t.teams.b.ralliesWon,1);assert.equal(t.players['a:A1'].total,2);assert.equal(t.players['a:A1'].qualities['++'],1)});
test('historical contact correction changes statistics',()=>{let m=E.appendRally(match(),{id:'one',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'+'}]});m=E.editContact(m,'one',0,{quality:'-'});const t=E.statistics(m);assert.equal(t.players['a:A1'].qualities['-'],1);assert.equal(t.players['a:A1'].qualities['+']||0,0)});

test('skill breakdown uses graded denominator, not all touches',()=>{let m=E.appendRally(match(),{id:'one',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'++'},{side:'a',playerId:'A1',skill:'Подача',quality:'-'},{side:'a',playerId:'A1',skill:'Подача'}]});const x=E.statistics(m).players['a:A1'].bySkill['Подача'];assert.equal(x.total,3);assert.equal(x.graded,2);assert.equal(x.positivePct,50)});
test('ungraded skill has null positive percentage',()=>{const m=E.appendRally(match(),{id:'one',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача'}]});assert.equal(E.statistics(m).players['a:A1'].bySkill['Подача'].positivePct,null)});

test('reject same roster player ID on opposing teams',()=>{const bad=JSON.parse(JSON.stringify(roster));bad.b.push({id:'A7',role:'field'});assert.throws(()=>E.newMatch({lineups:L,rosters:bad}),/cross-team/)});
test('reject malformed roster entries',()=>{const bad=JSON.parse(JSON.stringify(roster));bad.a.push({id:'A8',role:'unknown'});assert.throws(()=>E.newMatch({lineups:L,rosters:bad}),/Invalid roster/)});
test('libero cannot enter zone one even when receiving',()=>{assert.throws(()=>E.appendLineupEvent(match(),{type:'libero',side:'b',action:'enter',liberoId:'LB',replacedId:'B1',zone:'1'}),/cannot serve/)});
test('event identity cannot be rewritten',()=>{const m=E.appendRally(match(),{id:'r',winner:'a'});assert.throws(()=>E.editEvent(m,0,{type:'substitution'}),/identity/);assert.throws(()=>E.editEvent(m,0,{id:'changed'}),/identity/)});
test('negative event index is rejected',()=>{const m=E.appendRally(match(),{id:'r',winner:'a'});assert.throws(()=>E.editEvent(m,-1,{winner:'b'}),/not found/)});

test('journal annotation persists between rallies without changing score',()=>{
 let m=E.appendRally(start(),{id:'r1',winner:'a'});
 m=E.appendAnnotation(m,{kind:'yellow',side:'b',playerId:'B1',note:'Предупреждение'});
 m=E.appendRally(m,{id:'r2',winner:'b'});
 const state=E.derive(m);
 assert.deepEqual(state.score,{a:1,b:1});
 assert.equal(m.events[1].type,'annotation');
 assert.equal(m.events[1].note,'Предупреждение');
});
test('journal rejects invalid kind and side',()=>{
 assert.throws(()=>E.appendAnnotation(start(),{kind:'invalid',side:'a'}),/journal/);
 assert.throws(()=>E.appendAnnotation(start(),{kind:'yellow',side:'c'}),/journal/);
});
test('last completed rally contact can be removed without losing point',()=>{
 let m=E.appendRally(start(),{id:'r1',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'+'},{side:'b',playerId:'B6',skill:'Приём',quality:'-'}]});
 m=E.editRally(m,'r1',{contacts:m.events[0].contacts.slice(0,-1)});
 assert.equal(E.derive(m).score.a,1);
 assert.equal(E.statistics(m).players['a:A1'].total,1);
 assert.equal(E.statistics(m).players['b:B6'],undefined);
});

test('team stats aggregate serve, setting quality and recorded faults',()=>{
 let m=E.appendRally(start(),{id:'s1',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Передача',quality:'++',zone:'7',passType:'быстро',combination:'вход в зону'}]});
 m=E.appendAnnotation(m,{side:'a',kind:'fault',note:'Сетка'});
 const st=E.statistics(m);
 assert.equal(st.teams.a.ralliesWon,1);
 assert.equal(st.teams.a.bySkill['Передача'].total,1);
 assert.equal(st.teams.a.bySkill['Передача'].positivePct,100);
 assert.equal(st.teams.a.annotations.fault,1);
 assert.equal(st.players['a:A1'].passTypes['быстро'],1);
 assert.equal(st.players['a:A1'].combinations['вход в зону'],1);
});
test('setting details cannot be attached to attacks, impossible target zone rejected',()=>{
 const contact={side:'a',playerId:'A1',skill:'Атака',quality:'+'};
 assert.throws(()=>E.appendRally(start(),{id:'invalid1',winner:'a',contacts:[{...contact,passType:'быстро'}]}),/Pass details/);
 assert.throws(()=>E.appendRally(start(),{id:'invalid2',winner:'a',contacts:[{...contact,zone:'90'}]}),/Invalid zone/);
});


test('Side-Out and Break Point have correct numerators and denominators',()=>{
 let m=start();
 m=E.appendRally(m,{id:'a1',winner:'a'});
 m=E.appendRally(m,{id:'b1',winner:'b'});
 m=E.appendRally(m,{id:'b2',winner:'b'});
 m=E.appendRally(m,{id:'a2',winner:'a'});
 const x=E.statistics(m);
 assert.deepEqual([x.teams.a.sideOuts,x.teams.a.receivingRallies,x.teams.a.breakPoints,x.teams.a.servingRallies],[1,2,1,2]);
 assert.deepEqual([x.teams.b.sideOuts,x.teams.b.receivingRallies,x.teams.b.breakPoints,x.teams.b.servingRallies],[1,2,1,2]);
 assert.equal(x.teams.a.sideOutPct,50);
 assert.equal(x.teams.b.breakPointPct,50);
});
test('team with no receptions has undefined Side-Out rate',()=>{
 const x=E.statistics(start());assert.equal(x.teams.a.sideOutPct,null);assert.equal(x.teams.a.breakPointPct,null);
});
test('scored serve outcome must match winning team',()=>{
 assert.throws(()=>E.appendRally(start(),{id:'bad',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'=',result:'error'}]}),/Error outcome conflicts/);
 const m=E.appendRally(start(),{id:'good',winner:'b',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'=',result:'error'}]});
 assert.equal(E.derive(m).serving,'b');
 assert.equal(E.statistics(m).teams.a.bySkill['Подача'].errors,1);
});
test('efficiency is withheld if any attempts have unclassified outcomes',()=>{
 let m=E.appendRally(start(),{id:'first',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'++',result:'point'}]});
 m=E.appendRally(m,{id:'second',winner:'a',contacts:[{side:'a',playerId:'A1',skill:'Подача',quality:'+'}]});
 const stat=E.statistics(m).teams.a.bySkill['Подача'];assert.equal(stat.points,1);assert.equal(stat.outcomesTagged,1);assert.equal(stat.efficiencyPct,null);
});
test('draft contact validator rejects off-court and wrong server before score',()=>{
 const m=match();assert.throws(()=>E.validateDraft(m,[{side:'a',playerId:'A7',skill:'Атака'}]),/not on court/);
 assert.throws(()=>E.validateDraft(m,[{side:'a',playerId:'A5',skill:'Подача'}]),/Wrong server/);
 assert.equal(E.validateDraft(m,[{side:'a',playerId:'A1',skill:'Подача'}]),true);
});

test('two libero replacements in one interruption are rejected',()=>{
 let m=E.appendLineupEvent(match(),{type:'libero',side:'a',action:'enter',liberoId:'LA',replacedId:'A5',zone:'5'});
 assert.throws(()=>E.appendLineupEvent(m,{type:'libero',side:'a',action:'exit',liberoId:'LA'}),/Completed rally/);
 assert.throws(()=>E.appendLineupEvent(m,{type:'libero',side:'a',action:'switch',outId:'LA',inId:'LA2'}),/Completed rally/);
 m=E.appendRally(m,{id:'r',winner:'a'});
 m=E.appendLineupEvent(m,{type:'libero',side:'a',action:'exit',liberoId:'LA'});
 assert.equal(E.onCourt(E.derive(m),'a')['5'],'A5');
});
test('team cannot request third timeout in same set',()=>{
 let m=match();
 m=E.appendAnnotation(m,{kind:'timeout',side:'a'});
 m=E.appendAnnotation(m,{kind:'timeout',side:'a'});
 assert.throws(()=>E.appendAnnotation(m,{kind:'timeout',side:'a'}),/two timeouts/);
 assert.equal(E.derive(m).timeouts.a,2);
});
