// Assets are bundled into this module by scripts/build.mjs, and served only after login.
const assets = __ASSET_MAP__;
const ids=new Set(['coach','marathon','picnic','sunrise','friendship','rest','crew','tony-berger']);
const encoder=new TextEncoder();
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const hex=buffer=>Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');
async function digest(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}
async function signature(value,env){const key=await crypto.subtle.importKey('raw',encoder.encode(env.SESSION_SECRET+':'+env.APP_PASSWORD),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))}
function equal(a,b){if(a.length!==b.length)return false;let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];return different===0}
async function loggedIn(request,env){const raw=request.headers.get('cookie')?.match(/(?:^|;\s*)ultra_session=([^;]+)/)?.[1];if(!raw)return false;const [expiry,nonce,mac]=raw.split('.');if(!/^\d+$/.test(expiry)||!nonce||!mac||Number(expiry)<Date.now())return false;return equal(encoder.encode(mac),encoder.encode(await signature(expiry+'.'+nonce,env)))}
function cookie(value,age,request){return `ultra_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`}
function db(env){if(!env.DB)throw Error('Database unavailable');return env.DB}
function view(row){return{id:row.id,kind:row.kind,url:row.url,submittedAt:row.submitted_at,photoUrl:row.photo_key?'/api/photos/'+row.id:null}}
async function state(env){const {results}=await db(env).prepare('SELECT * FROM activities WHERE deleted=0').all();return results.map(view)}
function validLink(value){let u;try{u=new URL(value)}catch{throw Error('Invalid Strava activity link.')}if(u.protocol!=='https:'||u.username||u.password||u.port||!((['strava.com','www.strava.com'].includes(u.hostname)&&/^\/activities\/\d+\/?$/.test(u.pathname))||(u.hostname==='strava.app.link'&&/^\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname))))throw Error('Use a Strava activity or share link.');return u.href}
function asset(path,status=200){const item=assets[path];if(!item)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(item.body),c=>c.charCodeAt(0));return new Response(bytes,{status,headers:{'Content-Type':item.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}})}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!env.APP_PASSWORD||!env.SESSION_SECRET)return json({error:'Login is temporarily unavailable. Please try again shortly.'},503);
 if(!['GET','HEAD'].includes(request.method)){
  if(request.headers.get('X-Ultra-Request')!=='1'||(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin))return json({error:'Please reload this page and try again.'},403);
  if(Number(request.headers.get('content-length')||0)>6*1024*1024)return json({error:'The photo is too large.'},413);
 }
 if(path==='/api/login'&&request.method==='POST'){
  const key=await signature('attempt:'+ (request.headers.get('CF-Connecting-IP')||request.headers.get('oai-authenticated-user-id')||'unknown'),env);const now=Date.now();
  const attempts=await db(env).prepare('INSERT INTO login_attempts (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at < ? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at < ? THEN excluded.reset_at ELSE reset_at END RETURNING count, reset_at').bind(key,now+900000,now,now).first();
  if(attempts.count>10)return json({error:'Too many attempts. Please try again in 15 minutes.'},429,{'Retry-After':'900'});
  let body;try{body=await request.json()}catch{return json({error:'Enter your password.'},400)}
  if(typeof body.password!=='string'||body.password.length>256||!equal(await digest(body.password),await digest(env.APP_PASSWORD)))return json({error:'That password isn’t quite right. Try again.'},401);
  await db(env).prepare('DELETE FROM login_attempts WHERE key=? OR reset_at<?').bind(key,now).run();
  const payload=(now+30*86400000)+'.'+crypto.randomUUID();return json({ok:true},200,{'Set-Cookie':cookie(payload+'.'+await signature(payload,env),30*86400,request)});
 }
 if(path==='/api/logout'&&request.method==='POST')return json({ok:true},200,{'Set-Cookie':cookie('',0,request)});
 const authenticated=await loggedIn(request,env);
 if(!authenticated){if((path==='/'||path==='/index.html')&&request.method==='GET')return asset('/login.html');if(path==='/style.css'&&request.method==='GET')return asset(path);return json({error:'Please log in to continue.'},401)}
 if(path==='/api/state'&&request.method==='GET')return json({activities:await state(env),knownIds:(await db(env).prepare('SELECT id FROM activities').all()).results.map(r=>r.id)});
 // Explicitly import pre-login device progress once; existing server records/tombstones win.
 if(path==='/api/import'&&request.method==='POST'){
  let body;try{body=await request.json()}catch{return json({error:'Invalid import.'},400)}
  if(!Array.isArray(body.ids)||body.ids.length>8||body.ids.some(id=>!ids.has(id)))return json({error:'Invalid import.'},400);
  if(body.ids.length)await db(env).batch([...new Set(body.ids)].map(id=>db(env).prepare("INSERT OR IGNORE INTO activities (id,kind,submitted_at,deleted) VALUES (?,'legacy',?,0)").bind(id,new Date().toISOString())));
  return json({activities:await state(env),knownIds:(await db(env).prepare('SELECT id FROM activities').all()).results.map(r=>r.id)});
 }
 const activity=path.match(/^\/api\/activities\/([a-z-]+)$/);
 if(activity&&ids.has(activity[1])){
  const id=activity[1];
  if(request.method==='DELETE'){
   // Preserve evidence for recovery; a tombstone prevents an old device from reimporting it.
   await db(env).prepare("INSERT INTO activities (id,kind,submitted_at,deleted) VALUES (?,'legacy',?,1) ON CONFLICT(id) DO UPDATE SET deleted=1").bind(id,new Date().toISOString()).run();return json({ok:true});
  }
  if(request.method==='POST'){
   const previous=await db(env).prepare('SELECT * FROM activities WHERE id=?').bind(id).first();
   if(previous&&!previous.deleted)return json(view(previous));
   let form;try{form=await request.formData()}catch{return json({error:'Please choose a photo or Strava link.'},400)}
   const kind=form.get('kind');let activityUrl=null,photoKey=null;
   if(kind==='strava'){try{activityUrl=validLink(String(form.get('url')||''))}catch(e){return json({error:e.message},400)}}
   else if(kind==='photo'){
    const photo=form.get('photo');if(!photo||typeof photo.arrayBuffer!=='function'||photo.size>5*1024*1024||photo.size<4)return json({error:'Choose a photo smaller than 5 MB after resizing.'},400);
    const bytes=await photo.arrayBuffer(),magic=new Uint8Array(bytes);if(photo.type!=='image/jpeg'||magic[0]!==255||magic[1]!==216||magic[2]!==255)return json({error:'Please choose a supported photo and try again.'},400);
    photoKey='activities/'+id+'/'+crypto.randomUUID()+'.jpg';await env.BUCKET.put(photoKey,bytes,{httpMetadata:{contentType:'image/jpeg'}});
   }else return json({error:'A photo or Strava link is required.'},400);
   const now=new Date().toISOString();
   try{await db(env).prepare('INSERT INTO activities (id,kind,url,photo_key,submitted_at,deleted) VALUES (?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,url=excluded.url,photo_key=excluded.photo_key,submitted_at=excluded.submitted_at,deleted=0 WHERE activities.deleted=1').bind(id,kind,activityUrl,photoKey,now).run()}catch(e){if(photoKey)await env.BUCKET.delete(photoKey).catch(()=>{});throw e}
   const saved=await db(env).prepare('SELECT * FROM activities WHERE id=?').bind(id).first();if(photoKey&&saved.photo_key!==photoKey)await env.BUCKET.delete(photoKey).catch(()=>{});return json(view(saved));
  }
 }
 const photo=path.match(/^\/api\/photos\/([a-z-]+)$/);
 if(photo&&request.method==='GET'){
  const record=await db(env).prepare('SELECT photo_key FROM activities WHERE id=? AND deleted=0').bind(photo[1]).first();if(!record?.photo_key)return json({error:'Photo not found.'},404);const object=await env.BUCKET.get(record.photo_key);if(!object)return json({error:'Photo unavailable.'},404);return new Response(object.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(path.startsWith('/api/'))return json({error:'Not found.'},404);
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
 return asset(path==='/'?'/index.html':path);
}
export default{async fetch(request,env){try{return await handle(request,env)}catch(error){console.error('Request failed',new URL(request.url).pathname,error.message);return json({error:'We couldn’t reach your saved adventures. Please try again. Your activity has not been discarded.'},503)}}};
