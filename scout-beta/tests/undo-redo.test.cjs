// Run: node scout-beta/tests/undo-redo.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Rally engine script not found');
const ctx={module:{exports:{}},globalThis:{}};
vm.runInNewContext(script,ctx,{timeout:2000});
const rally=ctx.module.exports;
const mk=()=>({sport:'indoor',lineup:{1:'a',2:'b',3:'c',4:'d',5:'e',6:'f'},libero:null,rotationNo:1,servingTeam:'them',rallies:[],events:[],rallyNo:1});
const score=(_,rs)=>({done:false,sets:[0,0]});
function test(name,fn){fn();console.log('PASS',name)}
test('sideout undo and redo restores rotation',()=>{const m=mk();rally.finishRally(m,'us',score);assert.equal(m.rotationNo,2);rally.undoRally(m);assert.equal(m.rotationNo,1);assert.equal(m.rallies.length,0);rally.redoRally(m);assert.equal(m.rotationNo,2);assert.equal(m.rallies.length,1)});
test('new rally clears redo',()=>{const m=mk();rally.finishRally(m,'us',score);rally.undoRally(m);rally.finishRally(m,'them',score);assert.equal(m.redoRallies.length,0)});
test('cannot undo completed rally with recorded touches',()=>{const m=mk();rally.finishRally(m,'us',score);m.events.push({rally:1});assert.throws(()=>rally.undoRally(m));assert.equal(m.rallies.length,1)});
test('legacy rally without snapshots remains intact',()=>{const m=mk();m.rallies.push({number:1,winner:'us'});assert.throws(()=>rally.undoRally(m));assert.equal(m.rallies.length,1)});
test('redo rejects changed serving state',()=>{const m=mk();rally.finishRally(m,'us',score);rally.undoRally(m);m.servingTeam='us';assert.throws(()=>rally.redoRally(m));assert.equal(m.rallies.length,0)});
