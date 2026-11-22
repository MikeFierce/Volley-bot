const {test,expect}=require('@playwright/test');
const path=require('node:path');
const url='file://'+path.resolve(__dirname,'index.html');
test('coach enters rosters, starts match, records touch and journal',async({page})=>{
 await page.goto(url);
 await page.locator('#teamA').fill('Рубеж');
 await page.locator('#teamB').fill('Гости');
 const roster=(prefix)=>Array.from({length:7},(_,i)=>`${i+1}, ${prefix} ${i+1}, ${i===0?'связующий':i===6?'либеро':'игрок'}`).join('\n');
 await page.locator('#rosterA').fill(roster('А'));
 await page.locator('#rosterB').fill(roster('Б'));
 await page.locator('#prepareLineup').click();
 await expect(page.locator('#lineup-a-1')).toBeVisible();
 page.once('dialog',d=>d.accept());
 await page.locator('#createMatch').click();
 await expect(page.locator('#message')).toContainText('сохранены');
 await page.locator('#courts .court').first().locator('.player').last().click();
 await page.locator('#add').click();
 await expect(page.locator('#draft')).toContainText('1');
 await page.locator('#winA').click();
 await expect(page.locator('#score')).toContainText('1 : 0');
 await page.locator('#undoLastRecordedTouch').click();
 await expect(page.locator('#score')).toContainText('1 : 0');
 await page.locator('#journalKind').selectOption('yellow');
 await page.locator('#journalAdd').click();
 await expect(page.locator('#history')).toContainText('Жёлтая карточка');
 await page.locator('#allSetsStats').check();
 await expect(page.locator('#stats')).toBeVisible();
});
test('rejects serve by player outside serving zone 1',async({page})=>{
 await page.goto(url);
 await page.locator('#courts .court').first().locator('.player').first().click();
 await page.locator('#add').click();
 await expect(page.locator('#message')).toContainText('зоны 1');
 await expect(page.locator('#draft')).toContainText('0');
});

const fs=require('node:fs');
const roster8=p=>Array.from({length:8},(_,i)=>`${i+1}, ${p} ${i+1}, ${i===0?'связующий':i===6?'либеро':'игрок'}`).join('\n');
async function newCoachMatch(page,{bestOf='5',firstServer='a'}={}){
 await page.goto(url);
 await page.locator('#teamA').fill('Рубеж');
 await page.locator('#teamB').fill('Гости');
 await page.locator('#rosterA').fill(roster8('Игрок А'));
 await page.locator('#rosterB').fill(roster8('Игрок Б'));
 await page.locator('#bestOf').selectOption(bestOf);
 await page.locator('#firstServer').selectOption(firstServer);
 await page.locator('#prepareLineup').click();
 await expect(page.locator('#lineup-a-1')).toBeVisible();
 await expect(page.locator('#lineup-b-6')).toBeVisible();
 page.once('dialog',d=>d.accept());
 await page.locator('#createMatch').click();
 await expect(page.locator('#message')).toContainText('сохранены');
}
test('full three-set match ends with correct set winner and editable next-set lineup',async({page})=>{
 test.setTimeout(60000);
 await newCoachMatch(page,{bestOf:'3'});
 await page.evaluate(()=>{for(let i=0;i<25;i++)document.getElementById('winA').click()});
 await expect(page.locator('#score')).toHaveText('25 : 0');
 await expect(page.locator('#nextSet')).toBeEnabled();
 await page.locator('#nextSet').click();
 await expect(page.locator('#nextSetEditor')).toBeVisible();
 await page.locator('#allSetsStats').check();
 await expect(page.locator('#nextSetEditor')).toBeVisible();
 await expect(page.locator('#next-a-1')).toBeVisible();
 await page.locator('#confirmNextSet').click();
 await expect(page.locator('#score')).toHaveText('0 : 0');
 await page.evaluate(()=>{for(let i=0;i<25;i++)document.getElementById('winB').click()});
 await expect(page.locator('#score')).toHaveText('0 : 25');
 await page.locator('#nextSet').click();
 await expect(page.locator('#nextServer')).toBeEnabled();
 await page.locator('#nextServer').selectOption('a');
 await page.locator('#confirmNextSet').click();
 await page.evaluate(()=>{for(let i=0;i<15;i++)document.getElementById('winA').click()});
 await expect(page.locator('#score')).toHaveText('15 : 0');
 await expect(page.locator('#matchScore')).toContainText('2 : 1');
 await expect(page.locator('#nextSet')).toBeDisabled();
});
test('substitution, libero entry, exit and sanction are recorded in their original order',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#operation').selectOption('substitution');
 await page.locator('#incoming').selectOption('A-8');
 await page.locator('#apply').click();
 await expect(page.locator('#message')).toContainText('сохранено');
 await page.locator('#operation').selectOption('enter');
 await page.locator('#incoming').selectOption('A-7');
 await page.locator('#apply').click();
 await expect(page.locator('#message')).toContainText('сохранено');
 await page.locator('#winA').click();
 await page.locator('#operation').selectOption('exit');
 await page.locator('#apply').click();
 await expect(page.locator('#message')).toContainText('сохранено');
 await page.locator('#journalKind').selectOption('yellow');
 await page.locator('#journalNote').fill('Предупреждение');
 await page.locator('#journalAdd').click();
 await page.locator('#winA').click();
 await expect(page.locator('#history')).toContainText('Жёлтая карточка');
 const texts=await page.locator('#history').locator(':scope > *').allTextContents();
 expect(texts[0]).toContain('#2');
 expect(texts[1]).toContain('Жёлтая карточка');
 expect(texts[2]).toContain('Либеро');
 expect(texts[3]).toContain('#1');
 expect(texts[4]).toContain('Либеро');
 expect(texts[5]).toContain('Замена');
});
test('roster error never destroys active match and score survives reload',async({page})=>{
 await newCoachMatch(page,{firstServer:'b'});
 await expect(page.locator('#server')).toContainText('Гости');
 await page.locator('#winB').click();
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await page.locator('#toggleSetup').click();
 await page.locator('#rosterA').fill('1, Один игрок, игрок');
 await page.locator('#createMatch').click();
 await expect(page.locator('#message')).toContainText('от 6 до 20');
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await page.reload();
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await expect(page.locator('#teamA')).toHaveValue('Рубеж');
});
test('JSON backup restores roster, team names and exact score after reset',async({page})=>{
 await newCoachMatch(page,{bestOf:'3',firstServer:'b'});
 await page.locator('#winB').click();
 const pending=page.waitForEvent('download');
 await page.locator('#export').click();
 const saved=await pending,backup=await saved.path();
 const json=JSON.parse(fs.readFileSync(backup,'utf8'));
 expect(json.teamNames.a).toBe('Рубеж');
 expect(json.bestOf).toBe(3);
 page.once('dialog',d=>d.accept());
 await page.locator('#reset').click();
 await expect(page.locator('#score')).toHaveText('0 : 0');
 await expect(page.locator('#teamA')).toHaveValue('Рубеж');
 await expect(page.locator('#bestOf')).toHaveValue('5');
 page.once('dialog',d=>d.accept());
 await page.locator('#file').setInputFiles(backup);
 await expect(page.locator('#message')).toContainText('импортирован');
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await expect(page.locator('#teamB')).toHaveValue('Гости');
 await expect(page.locator('#bestOf')).toHaveValue('3');
 await expect(page.locator('#firstServer')).toHaveValue('b');
});
test('mobile court and inputs stay usable at phone width',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await newCoachMatch(page);
 await page.locator('#toggleSetup').click();
 await expect(page.locator('#rosterA')).toBeVisible();
 await expect(page.locator('#courts .court')).toHaveCount(2);
 const width=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
 expect(width.doc).toBeLessThanOrEqual(width.view+5);
});
test('CSV match journal contains annotation and scored rally',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#journalKind').selectOption('fault');
 await page.locator('#journalNote').fill('Сетка');
 await page.locator('#journalAdd').click();
 await page.locator('#winA').click();
 const pending=page.waitForEvent('download');
 await page.locator('#exportJournal').click();
 const download=await pending;
 const bytes=fs.readFileSync(await download.path(),'utf8');
 expect(bytes).toContain('Сетка');
 expect(bytes).toContain('rally');
});


test('saved team can be created independently, reloaded and chosen for a match',async({page})=>{
 await page.goto(url);
 await page.locator('#openTeamLibrary').click();
 await expect(page.locator('#teamDialog')).toBeVisible();
 await page.locator('#libraryName').fill('Команда-шаблон');
 await page.locator('#libraryRoster').fill(roster8('Шаблон'));
 await page.locator('#librarySave').click();
 await expect(page.locator('#message')).toContainText('сохранена');
 await page.reload();
 await page.locator('#savedTeamA').selectOption('Команда-шаблон');
 await page.locator('#loadTeamA').click();
 await expect(page.locator('#teamA')).toHaveValue('Команда-шаблон');
 await expect(page.locator('#rosterA')).toHaveValue(/Шаблон/);
 await page.locator('#prepareLineup').click();
 await expect(page.locator('#lineup-a-1')).toBeVisible();
});
test('passing tempo, tactical combination and court zone are saved in rally',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').first().click();
 await page.getByRole('button',{name:'3. Передача'}).click();
 await expect(page.locator('#passOptions')).toBeVisible();
 await page.locator('#passType').selectOption('быстро');
 await page.locator('#combination').selectOption('вход в зону');
 await page.locator('#zones').getByRole('button',{name:'7',exact:true}).click();
 await page.locator('#qualities').getByRole('button',{name:'++',exact:true}).click();
 await page.locator('#add').click();
 await expect(page.locator('#draft')).toContainText('быстро');
 await page.locator('#winA').click();
 const contact=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')).sets[0].events[0].contacts[0]);
 expect(contact.passType).toBe('быстро');
 expect(contact.combination).toBe('вход в зону');
 expect(contact.zone).toBe('7');
 expect(contact.quality).toBe('++');
 await expect(page.locator('#teamStats')).toContainText('Передача');
});
test('field and libero jersey colors are applied to court and saved in JSON backup',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#toggleSetup').click();
 await page.locator('#fieldColorA').evaluate(el=>{el.value='#123456';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await expect(page.locator('#courts .court').first().locator('.player').first()).toHaveCSS('background-color','rgb(18, 52, 86)');
 const pending=page.waitForEvent('download');
 await page.locator('#export').click();
 const saved=await pending;
 const json=JSON.parse(fs.readFileSync(await saved.path(),'utf8'));
 expect(json.teamColors.a.field).toBe('#123456');
});


test('A01 one-click serve fault awards sideout and rotates receiving team',async({page})=>{
 await newCoachMatch(page);
 const before=await page.locator('#courts .court').nth(1).locator('.player').allTextContents();
 await page.locator('#quickFault').click();
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await expect(page.locator('#server')).toContainText('Гости');
 await expect(page.locator('#history')).toContainText('касаний: 1');
 const payload=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')));
 const c=payload.sets[0].events[0].contacts[0];
 expect(c.skill).toBe('Подача');expect(c.result).toBe('error');expect(c.quality).toBe('=');
 await expect(page.locator('#teamStats')).toContainText('Side-Out 1/1');
});
test('A02 one-click ace credits serving team without a sideout',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#quickAce').click();
 await expect(page.locator('#score')).toHaveText('1 : 0');
 await expect(page.locator('#server')).toContainText('Рубеж');
 await expect(page.locator('#teamStats')).toContainText('Break Point 1/1');
 const c=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')).sets[0].events[0].contacts[0]);
 expect(c.result).toBe('point');
});
test('LIVE validates contact before draft and keyboard follows same path',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').first().click();
 await page.keyboard.press('1');
 await expect(page.locator('#message')).toContainText('Wrong server');
 await expect(page.locator('#draft')).toContainText('0');
 await page.locator('#courts .court').first().locator('.player').last().click();
 await page.keyboard.press('1');
 await expect(page.locator('#draft')).toContainText('1');
 await page.reload();
 await expect(page.locator('#draft')).toContainText('1');
 await page.keyboard.press('Escape');
 await expect(page.locator('#draft')).toContainText('0');
});
test('attack efficiency is marked incomplete if attack result is not classified',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').first().click();
 await page.getByRole('button',{name:'4. Атака'}).click();
 await page.locator('#add').click();
 await page.locator('#winA').click();
 await expect(page.locator('#teamStats')).toContainText('эффективность: неполно 0/1');
});


test('red card gives opponent penalty point, records sanction, and reverses cleanly',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#journalSide').selectOption('a');
 await page.locator('#journalKind').selectOption('red');
 await page.locator('#journalNote').fill('Взыскание');
 await page.locator('#journalAdd').click();
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await expect(page.locator('#server')).toContainText('Гости');
 await expect(page.locator('#history')).toContainText('штрафное очко');
 await expect(page.locator('#teamStats')).toContainText('Side-Out 0/0');
 await page.locator('#undoRally').click();
 await expect(page.locator('#score')).toHaveText('0 : 0');
 await expect(page.locator('#history')).not.toContainText('Красная карточка');
});
test('cannot request a third timeout for same team in a set',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#journalKind').selectOption('timeout');
 for(let i=0;i<2;i++){await page.locator('#journalAdd').click();await expect(page.locator('#message')).toContainText('записано')}
 await page.locator('#journalAdd').click();
 await expect(page.locator('#message')).toContainText('Only two timeouts');
});


test('coach edits a completed contact with dropdowns without losing the awarded point',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').last().click();
 await page.locator('#add').click();
 await page.locator('#winA').click();
 await page.locator('#history button').first().click();
 await expect(page.locator('#editRallyDialog')).toBeVisible();
 await page.locator('#editContactQuality').selectOption('-');
 await page.locator('#editContactZone').selectOption('5');
 await page.locator('#saveRallyEdit').click();
 await expect(page.locator('#score')).toHaveText('1 : 0');
 const contact=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')).sets[0].events[0].contacts[0]);
 expect(contact.quality).toBe('-');expect(contact.zone).toBe('5');
});
test('coach corrects past winner with automatic score and service replay',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#winA').click();
 await page.locator('#history button').first().click();
 await page.locator('#editRallyWinner').selectOption('b');
 await page.locator('#saveRallyEdit').click();
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await expect(page.locator('#server')).toContainText('Гости');
});


test('setter report links real reception, setter and attacker in same rally',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').last().click();
 await page.locator('#add').click();
 await page.locator('#courts .court').nth(1).locator('.player').nth(3).click();
 await page.getByRole('button',{name:'2. Приём'}).click();
 await page.locator('#add').click();
 await page.locator('#courts .court').nth(1).locator('.player').last().click();
 await page.getByRole('button',{name:'3. Передача'}).click();
 await page.locator('#add').click();
 await page.locator('#courts .court').nth(1).locator('.player').first().click();
 await page.getByRole('button',{name:'4. Атака'}).click();
 await page.locator('#touchResult').selectOption('point');
 await page.locator('#add').click();
 await page.locator('#winB').click();
 await expect(page.locator('#score')).toHaveText('0 : 1');
 await expect(page.locator('#setterStats')).toContainText('Игрок Б 1');
 await expect(page.locator('#setterStats')).toContainText('Игрок Б 4');
 const pending=page.waitForEvent('download');await page.locator('#exportSetterCsv').click();const file=await pending;
 expect(fs.readFileSync(await file.path(),'utf8')).toContain('Игрок Б 4');
});
test('video marker is stored with contact but not the video file',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#videoFile').setInputFiles({name:'sample.webm',mimeType:'video/webm',buffer:Buffer.from('test')});
 await page.locator('#courts .court').first().locator('.player').last().click();
 await page.locator('#add').click();
 await page.locator('#winA').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')));
 expect(saved.sets[0].events[0].contacts[0].videoTimeSec).toBe(0);
 expect(JSON.stringify(saved)).not.toContain('sample.webm');
});


test('real x/y court positions are stored and map shows only actual measured markers',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').first().click();
 await page.getByRole('button',{name:'4. Атака'}).click();
 const svg=page.locator('#coordCourt'),rect=await svg.boundingBox();
 expect(rect).toBeTruthy();
 await page.locator('#pointModeOrigin').click();
 await svg.click({position:{x:rect.width*.2,y:rect.height*.7}});
 await page.locator('#pointModeTarget').click();
 await svg.click({position:{x:rect.width*.8,y:rect.height*.3}});
 await page.locator('#add').click();
 await page.locator('#winA').click();
 const contact=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')).sets[0].events[0].contacts[0]);
 expect(contact.origin.x).toBeCloseTo(.2,1);
 expect(contact.origin.y).toBeCloseTo(.7,1);
 expect(contact.target.x).toBeCloseTo(.8,1);
 expect(contact.target.y).toBeCloseTo(.3,1);
 await expect(page.locator('#mapInfo')).toContainText('точек 1');
 await page.locator('#mapPlot').selectOption('routes');
 await expect(page.locator('#mapPoints line')).toHaveCount(1);
 await page.reload();
 await expect(page.locator('#mapPoints circle')).toHaveCount(2);
});
test('no made-up coordinates from zone-only events',async({page})=>{
 await newCoachMatch(page);
 await page.locator('#courts .court').first().locator('.player').first().click();
 await page.getByRole('button',{name:'4. Атака'}).click();
 await page.locator('#zones').getByRole('button',{name:'5',exact:true}).click();
 await page.locator('#add').click();
 await page.locator('#winA').click();
 const contact=await page.evaluate(()=>JSON.parse(localStorage.getItem('scout-rebuild-live-v1-bestof5')).sets[0].events[0].contacts[0]);
 expect(contact.zone).toBe('5');
 expect(contact.target).toBeUndefined();
 await expect(page.locator('#mapInfo')).toContainText('точек 0');
});
