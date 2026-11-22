const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
test('offline installed shell reopens without network and keeps match state',async({browser})=>{
 test.setTimeout(60000);
 const folder=__dirname,allowed=new Set(['index.html','engine.js','match.js','sw.js','manifest.webmanifest','icon.svg']);
 const types={html:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',webmanifest:'application/manifest+json',svg:'image/svg+xml'};
 const server=http.createServer((req,res)=>{
  const name=path.basename(decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!allowed.has(name)){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'Content-Type':types[name.split('.').at(-1)]||'text/plain'});
  res.end(fs.readFileSync(path.join(folder,name)));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const context=await browser.newContext({serviceWorkers:'allow'});
 try{
  const page=await context.newPage(),url='http://127.0.0.1:'+server.address().port+'/index.html';
  await page.goto(url);
  await expect(page.locator('#score')).toHaveText('0 : 0');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),{timeout:12000}).toBe(true);
  await page.locator('#winA').click();
  await expect(page.locator('#score')).toHaveText('1 : 0');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#score')).toHaveText('1 : 0');
  await expect(page.locator('#connectionStatus')).toContainText('Нет сети');
 }finally{await context.close();await new Promise(resolve=>server.close(resolve))}
});
