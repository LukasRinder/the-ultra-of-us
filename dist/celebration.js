/* A single WebGL pass: rotating textured medal, gold rim, bloom and sparks. */
(()=>{
const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment=`precision mediump float;
uniform vec2 resolution;uniform float time;uniform float still;uniform sampler2D medal;
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
void main(){
 vec2 p=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 float t=time;float intro=1.-exp(-t*2.8);float radius=length(p);
 vec3 col=vec3(.024,.047,.037);
 col+=vec3(.24,.12,.025)*exp(-radius*radius*6.)*.55;
 float pulse=exp(-pow((radius-t*.24)*20.,2.))*exp(-t*.8);
 col+=vec3(1.,.40,.07)*pulse*.40;
 for(int i=0;i<48;i++){
  float n=float(i);float a=hash(n+4.)*6.283;float speed=.14+hash(n+19.)*.32;
  float life=mod(t+hash(n+38.)*3.,4.5);float r=.23+life*speed;
  vec2 q=vec2(cos(a),sin(a))*r; q.y-=life*life*.014;
  vec2 delta=p-q;vec2 along=vec2(cos(a),sin(a));
  float tail=abs(dot(delta,along));float crosswise=abs(dot(delta,vec2(-along.y,along.x)));
  float spark=exp(-crosswise*700.-tail*100.);
  float halo=.000014/(dot(delta,delta)+.000035);
  float fade=(1.-smoothstep(2.,4.5,life))*intro;
  col+=vec3(1.,.48+hash(n)*.3,.13)*(spark+halo*.22)*fade;
 }
 float ease=1.-pow(1.-clamp(t/3.3,0.,1.),3.);
 float angle=mix(-7.1,0.,ease)+sin(t*1.1)*.055*still;
 float ca=cos(angle),sa=sin(angle);float scale=.72+.28*intro;
 // Intersect a camera ray with a stack of planes for a thick medal edge.
 vec3 ro=vec3(0.,0.,3.);vec3 rd=normalize(vec3(p/scale,-2.6));
 vec3 normal=vec3(sa,0.,ca),axis=vec3(ca,0.,-sa);
 float denom=dot(rd,normal);vec4 surface=vec4(0.);
 for(int j=0;j<7;j++){
  float depth=(float(j)-3.)*.007;
  if(abs(denom)>.005){
   float distance=(depth-dot(ro,normal))/denom;
   vec3 hit=ro+rd*distance;
   vec2 uv=vec2(dot(hit,axis)/.72+.5,hit.y/.828+.5);
   if(distance>0.&&uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.){
    vec4 tex=texture2D(medal,uv);
    if(tex.a>.05){
     float front=step(5.5,float(j));
     float light=.60+.40*abs(ca);
     vec3 metalColor=mix(vec3(.7,.34,.08),tex.rgb,front)*light;
     float sweep=exp(-pow((uv.x+uv.y*.3-mod(t*.34,2.)+ .3)*11.,2.));
     metalColor+=vec3(1.,.88,.57)*sweep*.42;
     surface=vec4(metalColor,tex.a);
    }
   }
  }
 }
 col=mix(col,surface.rgb,surface.a*intro);
 col*=1.-smoothstep(.52,1.05,radius)*.65;
 gl_FragColor=vec4(col,1.);
}`;
let overlay,stop=()=>{},origin;
function make(){overlay=document.createElement('dialog');overlay.id='badge-celebration';overlay.setAttribute('aria-labelledby','celebration-title');overlay.innerHTML='<button class="celebration-close" aria-label="Close badge celebration">×</button><p class="celebration-kicker">CHRISTOPH &amp; ARI · ACHIEVEMENT UNLOCKED</p><div class="medal-stage"><canvas aria-hidden="true"></canvas><div class="medal-fallback" aria-hidden="true"></div></div><div class="celebration-copy"><p class="celebration-earned">A NEW STORY. A NEW BADGE.</p><h2 id="celebration-title"></h2><p class="celebration-note">One more memory for your collection.</p><button class="primary celebration-continue">Add it to our collection</button></div>';document.body.append(overlay);overlay.querySelector('.celebration-close').onclick=()=>overlay.close();overlay.querySelector('.celebration-continue').onclick=()=>overlay.close();overlay.addEventListener('close',()=>{stop();if(origin?.isConnected)origin.focus()});overlay.addEventListener('cancel',()=>stop())}
window.celebrateBadge=(challenge,markup)=>{
 if(!overlay)make();stop();origin=document.activeElement;
 overlay.querySelector('h2').textContent=challenge.short||challenge.name;
 const fallback=overlay.querySelector('.medal-fallback');fallback.innerHTML=markup;
 overlay.classList.remove('shader-ready');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 overlay.classList.toggle('motion-reduced',reduced);overlay.showModal();
 overlay.querySelector('.celebration-continue').focus();
 const canvas=overlay.querySelector('canvas');let gl;
 try{gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'})}catch{}
 if(!gl)return;
 let frame=0,disposed=false,program,texture,buffer;const shaders=[];
 const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s))};stop=cleanup;
 const resize=()=>{const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));gl.viewport(0,0,canvas.width,canvas.height)};
 const lost=e=>{e.preventDefault();cleanup();overlay.classList.remove('shader-ready')};canvas.addEventListener('webglcontextlost',lost);
 let start=performance.now();
 const draw=()=>{if(disposed)return;let t=reduced?3.3:Math.min((performance.now()-start)/1000,8);gl.uniform2f(gl.getUniformLocation(program,'resolution'),canvas.width,canvas.height);gl.uniform1f(gl.getUniformLocation(program,'time'),t);gl.uniform1f(gl.getUniformLocation(program,'still'),reduced?0:1);gl.drawArrays(gl.TRIANGLES,0,6);if(!reduced&&t<8&&!document.hidden)frame=requestAnimationFrame(draw)};
 const visibility=()=>{cancelAnimationFrame(frame);if(!document.hidden&&!disposed)draw()};
 try{
  const compile=(type,source)=>{const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const svg=fallback.querySelector('svg').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','400');svg.setAttribute('height','460');
  const img=new Image();img.onload=()=>{if(disposed)return;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);overlay.classList.add('shader-ready');start=performance.now();draw()};img.onerror=()=>cleanup();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
 }catch(error){cleanup();overlay.classList.remove('shader-ready');console.warn('Badge reveal using accessible fallback.',error)}
};
})();
