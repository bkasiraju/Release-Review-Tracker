'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const {handleRequest}=require('./backend');
const PUBLIC=path.join(__dirname,'public');
function createServer(context={}){
  return http.createServer(async(req,res)=>{
    const host=req.headers.host||'';
    if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)){res.writeHead(403);return res.end('Local preview only.');}
    const url=new URL(req.url,'http://'+host);
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
    if(url.pathname==='/api/handler'&&req.method==='POST'){
      if(req.headers.origin&&req.headers.origin!=='http://'+host){res.writeHead(403);return res.end('Origin denied');}
      if(!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(415);return res.end('JSON required');}
      try{let size=0,parts=[];for await(const c of req){size+=c.length;if(size>1_000_000){res.writeHead(413);return res.end('Request too large');}parts.push(c);}
        const body=JSON.parse(Buffer.concat(parts).toString());const result=await handleRequest({...context,request:{body}});res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(result));
      }catch{res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:false,error:'Invalid JSON request.'}));}
    }
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    // Explicit public asset map: no database, credentials, backend code or traversal exposure.
    const assets={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/lite.css':'lite.css','/sprint.css':'sprint.css','/sprint.js':'sprint.js','/ai.js':'ai.js','/app.js':'app.js','/queue.js':'queue.js','/controls.js':'controls.js','/tooltips.js':'tooltips.js','/favicon.svg':'favicon.svg','/SalesforceSans-Regular.woff':'SalesforceSans-Regular.woff','/SalesforceSans-Bold.woff':'SalesforceSans-Bold.woff'};
    for(const name of ['open-source','sla','deviation','automation'])assets['/icon-3d-'+name+'.webp']='icon-3d-'+name+'.webp';assets['/icons.js']='icons.js';assets['/comments-view.js']='comments-view.js';
    const file=assets[url.pathname];if(!file){res.writeHead(404);return res.end('Not found');}
    const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff':'font/woff','.webp':'image/webp'};
    try{res.writeHead(200,{'Content-Type':types[ext]});res.end(fs.readFileSync(path.join(PUBLIC,file)));}catch{res.writeHead(404);res.end('Not found');}
  });
}
if(require.main===module){
  const demo=process.argv.includes('--demo'),fixture=process.argv.includes('--fixture');
  const context=demo||fixture?require('./scripts/fixture').context({demo}):{};
  const port=Number(process.env.PORT||8383);createServer(context).listen(port,'127.0.0.1',()=>console.log(`Release Review: http://localhost:${port}${demo?' (read-only sample)':fixture?' (isolated test backend)':' (preview; live backend runs in GUS Apps)'}`));
}
module.exports={createServer};
