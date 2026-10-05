(function(){
document.documentElement.classList.add('js');
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var TAU = Math.PI*2;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function sstep(a,b,x){ var t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); }
function f2(v){ return Math.round(v*100)/100; }

/* =====================================================================
   EXACT CONNECTION GEOMETRY (from "connection variations / levels")
   circle radius r; centres: link d = 2.54 r (neck pinches at 0.124 r),
   partnership d = 1.64 r (sharp lens cusps), fillet radius = 0.327 r
   ===================================================================== */
var G = { LINK:2.54, MERGE:1.64, FILLET:0.327 };
function circPath(x,y,r){ return 'M'+f2(x-r)+' '+f2(y)+'A'+f2(r)+' '+f2(r)+' 0 1 0 '+f2(x+r)+' '+f2(y)+'A'+f2(r)+' '+f2(r)+' 0 1 0 '+f2(x-r)+' '+f2(y)+'Z'; }
function pairPath(ax,ay,ra,bx,by,rb,f){
  var dx=bx-ax, dy=by-ay, d=Math.hypot(dx,dy);
  if(d<1e-6) return circPath(ax,ay,ra);
  var ux=dx/d, uy=dy/d, vx=-uy, vy=ux;
  function P(x,y){ return f2(ax+ux*x+vx*y)+' '+f2(ay+uy*x+vy*y); }
  var sep = circPath(ax,ay,ra)+circPath(bx,by,rb);
  if(f>0.5){
    var A=ra+f, B=rb+f;
    if(d>=A+B) return sep;
    var xF=(A*A-B*B+d*d)/(2*d), h2=A*A-xF*xF; if(h2<=0) return sep;
    var h=Math.sqrt(h2); if(h-f<=0.05) return sep;
    var ta=ra/A, tb=rb/B;
    var Atx=ta*xF, Aty=ta*h, Btx=d+tb*(xF-d), Bty=tb*h;
    return 'M'+P(Atx,-Aty)+'A'+f2(f)+' '+f2(f)+' 0 0 0 '+P(Btx,-Bty)
      +'A'+f2(rb)+' '+f2(rb)+' 0 1 1 '+P(Btx,Bty)
      +'A'+f2(f)+' '+f2(f)+' 0 0 0 '+P(Atx,Aty)
      +'A'+f2(ra)+' '+f2(ra)+' 0 1 1 '+P(Atx,-Aty)+'Z';
  }
  if(d>=ra+rb) return sep;
  var xI=(d*d+ra*ra-rb*rb)/(2*d), hI2=ra*ra-xI*xI; if(hI2<=0) return sep;
  var hI=Math.sqrt(hI2);
  return 'M'+P(xI,-hI)+'A'+f2(rb)+' '+f2(rb)+' 0 1 1 '+P(xI,hI)+'A'+f2(ra)+' '+f2(ra)+' 0 1 1 '+P(xI,-hI)+'Z';
}

/* liquid glass renderer (canvas) */
function glassShape(ctx,pathStr,circles,k){
  var p = new Path2D(pathStr), a = k.a==null?1:k.a;
  if(a<=0.01) return;
  var minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
  circles.forEach(function(c){ minx=Math.min(minx,c.x-c.r); miny=Math.min(miny,c.y-c.r); maxx=Math.max(maxx,c.x+c.r); maxy=Math.max(maxy,c.y+c.r); });
  var glow = Math.max(k.link||0,k.merge||0);
  ctx.save(); ctx.globalAlpha=a;
  // outer luminescence
  ctx.shadowColor='rgba(58,160,240,'+(0.22+0.4*glow)+')'; ctx.shadowBlur=14+24*glow; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
  ctx.fillStyle='rgba(60,130,190,0.10)'; ctx.fill(p);
  ctx.shadowColor='transparent'; ctx.shadowBlur=0;
  // body: glass gradient (sign gradient #90CEFF -> #484848)
  var g=ctx.createLinearGradient(minx,miny,maxx,maxy);
  g.addColorStop(0,'rgba(144,206,255,0.34)'); g.addColorStop(0.55,'rgba(70,120,160,0.14)'); g.addColorStop(1,'rgba(72,72,72,0.14)');
  ctx.fillStyle=g; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  circles.forEach(function(c){
    // specular
    var s=ctx.createRadialGradient(c.x-c.r*0.38,c.y-c.r*0.44,0,c.x-c.r*0.38,c.y-c.r*0.44,c.r*0.7);
    s.addColorStop(0,'rgba(255,255,255,0.62)'); s.addColorStop(0.5,'rgba(255,255,255,0.14)'); s.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=s; ctx.fillRect(c.x-c.r,c.y-c.r,c.r*2,c.r*2);
    // caustic lower-right
    var q=ctx.createRadialGradient(c.x+c.r*0.42,c.y+c.r*0.5,0,c.x+c.r*0.42,c.y+c.r*0.5,c.r*0.65);
    q.addColorStop(0,'rgba(144,206,255,0.34)'); q.addColorStop(1,'rgba(144,206,255,0)');
    ctx.fillStyle=q; ctx.fillRect(c.x-c.r,c.y-c.r,c.r*2,c.r*2);
  });
  // rim light
  ctx.lineWidth=Math.max(6,circles[0].r*0.3); ctx.strokeStyle='rgba(144,206,255,0.20)'; ctx.stroke(p);
  // partnership: lens glows blue
  if(k.merge>0.02 && circles.length>1){
    var A=circles[0],B=circles[1],mx=(A.x+B.x)/2,my=(A.y+B.y)/2,lr=A.r*0.9;
    var m=ctx.createRadialGradient(mx,my,0,mx,my,lr);
    m.addColorStop(0,'rgba(190,230,255,'+(0.7*k.merge)+')'); m.addColorStop(1,'rgba(58,160,240,0)');
    ctx.fillStyle=m; ctx.fillRect(mx-lr,my-lr,lr*2,lr*2);
  }
  // channel: a spark travels through the neck
  if(k.link>0.05 && circles.length>1){
    var A2=circles[0],B2=circles[1],ph=(k.t||0)*1.1%1, sx=A2.x+(B2.x-A2.x)*(0.1+0.8*ph), sy=A2.y+(B2.y-A2.y)*(0.1+0.8*ph), sr=A2.r*0.5;
    var sp=ctx.createRadialGradient(sx,sy,0,sx,sy,sr);
    sp.addColorStop(0,'rgba(255,255,255,'+(0.9*k.link)+')'); sp.addColorStop(0.4,'rgba(144,206,255,'+(0.4*k.link)+')'); sp.addColorStop(1,'rgba(58,160,240,0)');
    ctx.fillStyle=sp; ctx.fillRect(sx-sr,sy-sr,sr*2,sr*2);
  }
  ctx.restore();
  // blue hairline (#3AA0F0)
  ctx.lineWidth=1.3; ctx.strokeStyle='rgba(58,160,240,'+(0.78+0.22*glow)+')'; ctx.stroke(p);
  ctx.restore();
}

/* =====================================================================
   scroll: progress hairline + chain links
   ===================================================================== */
var prog = $('#prog'), links = $$('[data-link]'), ticking = false;
function onScroll(){
  ticking = false;
  var h = document.documentElement.scrollHeight - innerHeight;
  prog.style.transform = 'scaleX(' + (h>0 ? clamp(scrollY/h,0,1) : 0) + ')';
  var vh = innerHeight;
  links.forEach(function(el){
    var r = el.getBoundingClientRect();
    var p = clamp((vh*0.82 - r.top) / (r.height + vh*0.1), 0, 1);
    el.style.setProperty('--p', p.toFixed(3));
    if(el.dataset.link === 'tri'){
      var spread = (1 - p), nds = $$('.nd',el), lbs = $$('.lb',el);
      var maxS = Math.min(el.clientHeight*0.42, 120);
      nds.forEach(function(n,i){
        var off = (i-1)*maxS*spread;
        n.style.top = 'calc(50% + ' + off + 'px - 7px)';
        n.classList.toggle('on', p>0.05);
        lbs[i].style.top = 'calc(50% + ' + off + 'px - 10px)';
        lbs[i].classList.toggle('on', p>0.05);
        lbs[i].style.transform = 'translateX(24px)';
        lbs[i].style.opacity = spread>0.55 ? 1 : (i===1 ? 1 : clamp(spread*1.8,0,1));
      });
    } else {
      $('.nd.tp',el).classList.toggle('on', p>0.04);
      $('.lb.tp',el).classList.toggle('on', p>0.04);
      $('.nd.bt',el).classList.toggle('on', p>0.97);
      $('.lb.bt',el).classList.toggle('on', p>0.97);
    }
  });
}
function req(){ if(!ticking){ ticking = true; requestAnimationFrame(onScroll); } }
addEventListener('scroll',req,{passive:true}); addEventListener('resize',req); onScroll();

var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:.15,rootMargin:'0px 0px -6% 0px'}) : null;
$$('.rv').forEach(function(el){ io ? io.observe(el) : el.classList.add('in'); });

/* =====================================================================
   HERO: line-art bloom
   ===================================================================== */
(function(){
  var cv = $('#net'), ctx = cv.getContext('2d');
  var W,H,dpr,cx,cy,S,vis=true,mx=0,my=0,tmx=0,tmy=0,t0=performance.now(),raf,lastT=performance.now();

  /* ---------- форми квітки ----------
     кожна форма = 4 шари + ґратка. Шар: N копій, кожна — "розгортка" з M фігур
     (коло / еліпс / багатокутник) від відстані d0 до d1 з закрутом tw. */
  var CY=[225,235,255], BL=[150,200,255], LV=[58,160,240], LV2=[144,206,255];
  function L(N,d0,d1,M,tw,rs,ar,al,lw,sides,gap,shim,tint,rot){
    return {N:N,d0:d0,d1:d1,M:M,tw:tw,rs:rs,ar:ar,al:al,lw:lw,sides:sides,gap:gap,shim:shim,tint:tint,rot:rot||0};
  }
  var OFF=L(4,.5,.5,2,0,.3,1,0,.6,0,0,0,CY,0);
  var FORMS=[
    { name:'bloom', lat:[.32,.22,3], L:[
      L(8,.66,.16,54,.35,1.0,1,.36,.8,0,0,1,CY,0),
      L(8,.40,.08,46,-.45,.98,1,.30,.75,0,0,1,BL,.39),
      L(4,.88,.30,40,.17,1.0,1,.20,.7,0,0,0,LV2,0),
      L(12,.98,.50,30,.28,.62,1,.12,.6,0,0,0,LV,.2)]},
    { name:'rosette', lat:[.0,.22,3], L:[
      L(6,.30,.64,58,.55,.52,1,.5,.8,0,0,1,CY,0),
      L(6,.46,.20,50,-.5,.62,1,.45,.8,0,0,1,BL,.52),
      L(2,.10,.34,40,.0,.95,1,.28,.7,0,0,0,LV2,0),
      L(12,.52,.52,2,0,.34,1,.16,.6,0,0,0,LV,.26)]},
    { name:'strings', lat:[.0,.22,3], L:[
      L(9,.70,.14,70,1.1,.60,1,.38,.8,4,0,1,CY,0),
      L(9,.50,.10,56,-.9,.55,1,.30,.75,4,0,1,BL,.35),
      L(5,.90,.30,40,.6,.48,1,.20,.7,3,0,0,LV2,0),
      OFF]}
  ];
  var NF=FORMS.length;
  var cur=0, tgt=0, lastMove=-1e9, px01=.5, py01=.5, pm=0, pmT=0, active=0, actT=0, autoAt=performance.now();

  function layout(){
    dpr=Math.min(window.devicePixelRatio||1,1.75);
    var r=cv.getBoundingClientRect(); W=r.width; H=r.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    var wide=W>820;
    cx=W*0.5; cy=wide?H*0.5:H*0.37;
    S = (wide ? Math.min(W*0.36,H*0.47) : Math.min(W*0.52,H*0.27))*0.8;
  }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function sm(x){ return x*x*(3-2*x); }
  function mixRGB(a,b,t){ return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)]; }
  function mixLayer(a,b,s){
    var o={}, k=['d0','d1','tw','rs','ar','al','lw','rot'];
    k.forEach(function(n){ o[n]=lerp(a[n],b[n],s); });
    var hi = s<.5 ? a : b;
    o.N=hi.N; o.M=hi.M; o.sides=hi.sides; o.gap=hi.gap; o.shim=hi.shim;
    o.tint=mixRGB(a.tint,b.tint,s);
    /* дискретні параметри міняються на середині — на цей момент шар згасає */
    return o;
  }
  /* рівномірне обертання між симетріями: N копій, кожна повертається на rot */
  function family(Ly,rot,tw,t,pal){
    var N=Ly.N, M=Ly.M, c0=mixRGB(Ly.tint,pal.t,pal.k);
    if(Ly.al<.004) return;
    ctx.lineWidth=Ly.lw; ctx.lineCap=Ly.gap>0?'round':'butt';
    ctx.setLineDash(Ly.gap>0?[.01,Ly.gap]:[]);
    var d0=Ly.d0*S, d1=Ly.d1*S, rr=Ly.rot+rot;
    for(var i=0;i<N;i++){
      ctx.beginPath();
      for(var j=0;j<=M;j++){
        var f=M?j/M:0, d=d0+(d1-d0)*f, th=rr+i*TAU/N+(Ly.tw+tw)*f;
        var x=cx+Math.cos(th)*d, y=cy+Math.sin(th)*d, r=Math.max(.4,d*Ly.rs);
        if(Ly.sides>0){
          var n=Ly.sides, q=th+f*1.2;
          for(var k=0;k<=n;k++){ var a=q+k*TAU/n, px=x+Math.cos(a)*r, py=y+Math.sin(a)*r; k?ctx.lineTo(px,py):ctx.moveTo(px,py); }
        } else if(Ly.ar!==1){
          ctx.moveTo(x+Math.cos(th)*r*Ly.ar,y+Math.sin(th)*r*Ly.ar);
          ctx.ellipse(x,y,r*Ly.ar,r,th,0,TAU);
        } else { ctx.moveTo(x+r,y); ctx.arc(x,y,r,0,TAU); }
      }
      var w=1,blue=0;
      if(Ly.shim){ var sv=Math.sin(t/1300-i*0.9); w=.55+.9*Math.max(0,sv); blue=Math.max(0,sv); }
      var sh=pal.sh;
      ctx.strokeStyle='rgba('+Math.round(c0[0]-(c0[0]-sh[0])*blue)+','+Math.round(c0[1]-(c0[1]-sh[1])*blue)+','+Math.round(c0[2]-(c0[2]-sh[2])*blue*.0-0)+','+(Ly.al*w)+')';
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  function lattice(rot,r,rings,alpha,pal){
    if(alpha<.004) return;
    ctx.lineWidth=0.8; ctx.beginPath();
    var pts=[[0,0]];
    for(var k=1;k<=rings;k++){ for(var s=0;s<6;s++){
      var a0=rot+s*TAU/6, a1=rot+(s+1)*TAU/6;
      for(var m=0;m<k;m++){ pts.push([Math.cos(a0)*k*r*(1-m/k)+Math.cos(a1)*k*r*(m/k), Math.sin(a0)*k*r*(1-m/k)+Math.sin(a1)*k*r*(m/k)]); }
    } }
    pts.forEach(function(p){ ctx.moveTo(cx+p[0]+r,cy+p[1]); ctx.arc(cx+p[0],cy+p[1],r,0,TAU); });
    var c=mixRGB(CY,pal.t,pal.k);
    ctx.strokeStyle='rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+alpha+')'; ctx.stroke();
  }
  function frame(now){
    raf=requestAnimationFrame(frame);
    var dt=Math.min(.05,(now-lastT)/1000); lastT=now;
    if(!vis) return;
    var t = reduce ? 9000 : now-t0;
    mx += (tmx-mx)*.04; my += (tmy-my)*.04;

    /* --- керування формою і кольором --- */
    var usingMouse = (now-lastMove)<2600 && !reduce;
    if(usingMouse){ tgt = Math.floor(cur/NF)*NF + px01*(NF-1); autoAt=now; }
    else if(!reduce && now-autoAt>6500){ tgt = Math.round(tgt)+1; autoAt=now; }
    cur += (tgt-cur)*(1-Math.exp(-dt/.28));
    pmT = usingMouse ? py01 : .0;                       // низ екрана → світліший блакитний
    pm += (pmT-pm)*(1-Math.exp(-dt/.5));
    actT = usingMouse?1:0; active += (actT-active)*(1-Math.exp(-dt/.6));
    var fi=Math.floor(cur), fr=cur-fi, s=sm(fr);
    var A=FORMS[((fi%NF)+NF)%NF], B=FORMS[(((fi+1)%NF)+NF)%NF];
    var pal={ k:pm*.85, t:[144,206,255], sh:mixRGB([58,160,240],[144,206,255],pm*.9) };

    ctx.globalCompositeOperation='source-over'; ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    var tw=.35*Math.sin(t/7000);
    var rot=t/52000 + mx*.02 + (px01-.5)*.5*active;
    var R=S*(1+0.025*Math.sin(t/2600));
    ctx.save(); ctx.translate(my*8,mx*8);
    var latA=lerp(A.lat[0],B.lat[0],s), latR=lerp(A.lat[1],B.lat[1],s);
    lattice(rot*.6, latR*R, 3, latA*(.8+.2*Math.cos(t/1900)), pal);
    for(var i=0;i<4;i++){
      var la=A.L[i], lb=B.L[i], rr=(i%2?-1:1)*rot*(i===2?1.4:1), ww=(i%2?-1.2:1)*tw;
      var disc=(la.N!==lb.N)||(la.sides!==lb.sides)||((la.gap>0)!==(lb.gap>0));
      if(disc && s>0 && s<1){   /* різна симетрія: плавно перетікаємо двома шарами */
        var ca=mixLayer(la,la,0), cb=mixLayer(lb,lb,0); ca.al*=(1-s); cb.al*=s;
        family(ca,rr,ww,t,pal); family(cb,rr,ww,t,pal);
      } else family(mixLayer(la,lb,s),rr,ww,t,pal);
    }
    // luminous heart
    var hc=mixRGB([58,160,240],[144,206,255],pm*.9);
    var bl=ctx.createRadialGradient(cx,cy,R*0.2,cx,cy,R*1.05);
    bl.addColorStop(0,'rgba('+(hc[0]|0)+','+(hc[1]|0)+','+(hc[2]|0)+',0.1)'); bl.addColorStop(1,'rgba('+(hc[0]|0)+','+(hc[1]|0)+','+(hc[2]|0)+',0)');
    ctx.fillStyle=bl; ctx.beginPath(); ctx.arc(cx,cy,R*1.05,0,TAU); ctx.fill();
    var gr=ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.34);
    gr.addColorStop(0,'rgba(255,255,255,0.8)'); gr.addColorStop(.25,'rgba(144,206,255,0.4)'); gr.addColorStop(1,'rgba('+(hc[0]|0)+','+(hc[1]|0)+','+(hc[2]|0)+',0)');
    ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(cx,cy,R*0.34,0,TAU); ctx.fill();
    ctx.restore();
    if(reduce) cancelAnimationFrame(raf);
  }
  layout();
  addEventListener('resize',layout);
  var host=cv.parentNode;
  host.addEventListener('pointermove',function(e){
    var r=cv.getBoundingClientRect();
    tmx=((e.clientX-r.left)/r.width-.5); tmy=((e.clientY-r.top)/r.height-.5);
    px01=clamp((e.clientX-r.left)/r.width,0,1); py01=clamp((e.clientY-r.top)/r.height,0,1);
    lastMove=performance.now();
  },{passive:true});
  host.addEventListener('pointerleave',function(){ lastMove=-1e9; tmx=0; tmy=0; });
  if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); }
  /* службовий доступ для перевірки/налагодження: FROOMO_FLOWER.go(i) */
  window.FROOMO_FLOWER={forms:FORMS.map(function(f){return f.name;}),go:function(i){ lastMove=-1e9; autoAt=performance.now()+1e9; tgt=i; cur=i; }};
  raf=requestAnimationFrame(frame);
})();

/* =====================================================================
   FLAT CIRCLE GRAPHICS (exact connection geometry, no glass):
   rows of circles; pairs bond (neck / overlap), twirl and swap rows
   ===================================================================== */
var fields = [];
var COL = {0:'#d9d9d9',1:'#555555'};
function bondFillet(dr){ return G.FILLET*sstep(G.MERGE,2.4,dr); }
function dkGrad(ctx,x0,x1,y){ var g=ctx.createLinearGradient(x0,y,x1,y); g.addColorStop(0,'#3aa0f0'); g.addColorStop(1,'#031c29'); return g; }
function fillOf(ctx,o,r){ return o.type===1 ? dkGrad(ctx,o.x-r,o.x+r,o.y) : COL[0]; }
function paintItem(ctx,x,y,r,type){
  ctx.beginPath(); ctx.arc(x,y,r,0,TAU);
  if(type===2){ ctx.lineWidth=1.3; ctx.strokeStyle='#f2f2f2'; ctx.stroke(); }
  else { ctx.fillStyle=type===1?dkGrad(ctx,x-r,x+r,y):COL[0]; ctx.fill(); }
}
function paintBond(ctx,a,b,r){
  var d=Math.hypot(b.x-a.x,b.y-a.y), f=r*bondFillet(d/r);
  var p=new Path2D(pairPath(a.x,a.y,r,b.x,b.y,r,f));
  if(a.type===2||b.type===2){
    ctx.lineWidth=1.3; ctx.strokeStyle='#f2f2f2'; ctx.stroke(p);
    [a,b].forEach(function(o){ if(o.type!==2){ ctx.fillStyle=fillOf(ctx,o,r); ctx.beginPath(); ctx.arc(o.x,o.y,r,0,TAU); ctx.fill(); } });
  } else if(a.type===b.type){
    ctx.fillStyle = a.type===1 ? dkGrad(ctx,Math.min(a.x,b.x)-r,Math.max(a.x,b.x)+r,(a.y+b.y)/2) : COL[0];
    ctx.fill(p);
  } else {
    var lt=a.type===0?a:b, dk=a.type===0?b:a;
    var g=ctx.createLinearGradient(lt.x,lt.y,dk.x,dk.y);
    g.addColorStop(.4,COL[0]); g.addColorStop(.6,'#3aa0f0'); g.addColorStop(1,'#031c29');
    ctx.fillStyle=g; ctx.fill(p);
  }
}
function easeIO(x){ x=clamp(x,0,1); return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2; }
function lerp(a,b,t){ return a+(b-a)*t; }

function RowsField(cv,o){
  var ctx=cv.getContext('2d'), W=0,H=0,dpr=1,r=20,items=[],evs=[],vis=false,cool=.4,rows=o.rows,DUR=5.3;
  function rnd(a,b){ return a+Math.random()*(b-a); }
  function layout(){
    var b=cv.getBoundingClientRect(); if(!b.width||!b.height) return;
    dpr=Math.min(window.devicePixelRatio||1,2); W=b.width; H=b.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    var cols=W<520?o.colsM:o.cols, px=W/cols, py=H/rows; r=Math.min(px*.17,py*.17);
    items=[]; evs=[];
    for(var j=0;j<rows;j++) for(var i=0;i<cols;i++){
      var x=(i+.5)*px+(j%2?1:-1)*px*.25, y=(j+.5)*py;
      items.push({row:j,col:i,hx:x,hy:y,x:x,y:y,type:o.types[j%o.types.length],busy:false});
    }
    cool=.3;
    if(reduce){ spawn(1.4); spawn(1.4); draw(); }
  }
  function spawn(t0){
    for(var tries=0;tries<14;tries++){
      var a=items[(Math.random()*items.length)|0]; if(!a||a.busy) continue;
      var cross=rows>1&&Math.random()<.68, cand=[];
      items.forEach(function(b){
        if(b===a||b.busy) return;
        if(cross? Math.abs(b.row-a.row)===1 : (b.row===a.row&&Math.abs(b.col-a.col)===1)) cand.push(b);
      });
      if(cross){ cand.sort(function(p,q){ return Math.hypot(p.hx-a.hx,p.hy-a.hy)-Math.hypot(q.hx-a.hx,q.hy-a.hy); }); cand=cand.slice(0,2); }
      if(!cand.length) continue;
      var b=cand[(Math.random()*cand.length)|0];
      var Dh=Math.hypot(a.hx-b.hx,a.hy-b.hy), mx=(a.hx+b.hx)/2, my=(a.hy+b.hy)/2, ok=true;
      evs.forEach(function(e){ if(Math.hypot(mx-e.mx,my-e.my)<Dh/2+e.Dh/2+4.5*r) ok=false; });
      if(!ok) continue;
      evs.push({a:a,b:b,mx:mx,my:my,Dh:Dh,ux:(a.hx-b.hx)/Dh,uy:(a.hy-b.hy)/Dh,t:t0||0,swap:cross&&Math.random()<.6});
      a.busy=b.busy=true; return true;
    }
    return false;
  }
  function place(e){
    var t=e.t, s0=e.Dh/2, sL=G.LINK*r/2, sM=G.MERGE*r/2, s, th=0;
    if(t<1.1) s=lerp(s0,sL,easeIO(t/1.1));
    else if(t<1.9) s=sL;
    else if(t<2.7) s=lerp(sL,sM,easeIO((t-1.9)/.8));
    else if(t<3.4) s=sM;
    else if(t<4.0) s=lerp(sM,sL,easeIO((t-3.4)/.6));
    else { var q=easeIO((t-4.0)/1.3); s=lerp(sL,s0,q); th=e.swap?Math.PI*q:0; }
    var c=Math.cos(th), sn=Math.sin(th), vx=e.ux*c-e.uy*sn, vy=e.ux*sn+e.uy*c;
    e.a.x=e.mx+vx*s; e.a.y=e.my+vy*s; e.b.x=e.mx-vx*s; e.b.y=e.my-vy*s;
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    items.forEach(function(it){ if(!it.busy) paintItem(ctx,it.x,it.y,r,it.type); });
    evs.forEach(function(e){
      place(e);
      if(Math.hypot(e.a.x-e.b.x,e.a.y-e.b.y)<2.66*r) paintBond(ctx,e.a,e.b,r);
      else { paintItem(ctx,e.a.x,e.a.y,r,e.a.type); paintItem(ctx,e.b.x,e.b.y,r,e.b.type); }
    });
  }
  function update(dt){
    if(!vis||!W) return;
    cool-=dt; if(cool<=0){ if(evs.length<o.maxEv && spawn(0)) cool=rnd(.5,1.5); else cool=.35; }
    for(var i=evs.length-1;i>=0;i--){
      var e=evs[i]; e.t+=dt;
      if(e.t>=DUR){
        if(e.swap){
          var a=e.a,b=e.b, k;
          ['hx','hy','row','col'].forEach(function(p){ k=a[p]; a[p]=b[p]; b[p]=k; });
        }
        e.a.x=e.a.hx; e.a.y=e.a.hy; e.b.x=e.b.hx; e.b.y=e.b.hy; e.a.busy=e.b.busy=false; evs.splice(i,1);
      }
    }
    draw();
  }
  layout();
  if('ResizeObserver' in window) new ResizeObserver(layout).observe(cv);
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); else vis=true;
  fields.push({update:update});
}

/* ---------- FLOW GRID: circles glide between grid cells, bond by distance, swap places ---------- */
function ease3(x){ x=clamp(x,0,1); return 1-Math.pow(1-x,3); }
function GridField(cv){
  var ctx=cv.getContext('2d'), W=0,H=0,dpr=1,vis=false,r=0,p=0,cols=0,rows=0,ox=0,oy=0,occ=[],ag=[],DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  function rnd(a,b){ return a+Math.random()*(b-a); }
  function cx(i){ return ox+(i+.5)*p; } function cy(j){ return oy+(j+.5)*p; }
  function layout(){
    var b=cv.getBoundingClientRect(); if(!b.width||!b.height) return;
    dpr=Math.min(window.devicePixelRatio||1,2); W=b.width; H=b.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    rows=W<520?4:5; p=H/(rows+1); cols=Math.max(3,Math.floor(W/p)-1); p=Math.min(p,W/(cols+1)); r=p/G.LINK;
    ox=(W-cols*p)/2; oy=(H-rows*p)/2;
    occ=[]; for(var k=0;k<cols*rows;k++) occ.push(null);
    ag=[]; var n=Math.round(cols*rows/4.2), tries=0;
    while(ag.length<n&&tries++<400){
      var i=(Math.random()*cols)|0, j=(Math.random()*rows)|0; if(occ[j*cols+i]) continue;
      var a={ci:i,cj:j,x:cx(i),y:cy(j),type:Math.random()<.32?1:0,mode:0,t:0,wait:rnd(0,1.2)}; occ[j*cols+i]=a; ag.push(a);
    }
    if(reduce) draw();
  }
  function free(i,j){ return i>=0&&j>=0&&i<cols&&j<rows&&!occ[j*cols+i]; }
  function nearestD(a,i,j){ var m=1e9; ag.forEach(function(o){ if(o===a) return; var d=Math.abs(o.ci-i)+Math.abs(o.cj-j); if(d<m) m=d; }); return m; }
  function neighbors(a){ var out=[]; ag.forEach(function(o){ if(o!==a&&Math.abs(o.ci-a.ci)+Math.abs(o.cj-a.cj)===1) out.push(o); }); return out; }
  function decide(a){
    var nb=neighbors(a).filter(function(o){return o.mode===0&&o.wait>-1});
    var r0=Math.random();
    if(nb.length&&r0<.38){
      var b=nb[(Math.random()*nb.length)|0];
      a.mode=2; b.mode=3; a.t=b.t=0; a.pair=b; b.pair=a; a.dur=b.dur=1.5; return;
    }
    if(neighbors(a).length&&r0<.7){ a.wait=rnd(1.2,3); return; }
    var cand=[]; DIRS.forEach(function(d){ var i=a.ci+d[0], j=a.cj+d[1]; if(free(i,j)) cand.push({i:i,j:j,s:nearestD(a,i,j)+Math.random()*1.6}); });
    if(!cand.length){ a.wait=rnd(.3,.8); return; }
    cand.sort(function(u,v){return u.s-v.s;}); var c=cand[0];
    occ[c.j*cols+c.i]=a; a.mode=1; a.t=0; a.dur=rnd(.9,1.3); a.fx=a.x; a.fy=a.y; a.tx=cx(c.i); a.ty=cy(c.j); a.ni=c.i; a.nj=c.j;
  }
  function update(dt){
    if(!vis||!W) return;
    ag.forEach(function(a){
      if(a.mode===0){ a.wait-=dt; if(a.wait<=0){ decide(a); if(a.mode===0&&a.wait<=0) a.wait=rnd(.3,1); } }
      else if(a.mode===1){
        a.t+=dt; var e=easeIO(a.t/a.dur); a.x=lerp(a.fx,a.tx,e); a.y=lerp(a.fy,a.ty,e);
        if(a.t>=a.dur){ occ[a.cj*cols+a.ci]=null; a.ci=a.ni; a.cj=a.nj; a.x=a.tx; a.y=a.ty; a.mode=0; a.wait=rnd(.25,1.1); }
      } else if(a.mode===2){
        var b=a.pair; a.t+=dt; b.t=a.t; var q=easeIO(a.t/a.dur), th=Math.PI*q;
        var mx=(cx(a.ci)+cx(b.ci))/2, my=(cy(a.cj)+cy(b.cj))/2, ux=(cx(a.ci)-cx(b.ci))/p, uy=(cy(a.cj)-cy(b.cj))/p;
        var c=Math.cos(th), s=Math.sin(th), vx=ux*c-uy*s, vy=ux*s+uy*c;
        a.x=mx+vx*p/2; a.y=my+vy*p/2; b.x=mx-vx*p/2; b.y=my-vy*p/2;
        if(a.t>=a.dur){
          var ti=a.ci,tj=a.cj; a.ci=b.ci; a.cj=b.cj; b.ci=ti; b.cj=tj;
          occ[a.cj*cols+a.ci]=a; occ[b.cj*cols+b.ci]=b;
          a.x=cx(a.ci); a.y=cy(a.cj); b.x=cx(b.ci); b.y=cy(b.cj);
          a.mode=b.mode=0; a.wait=rnd(1.2,2.6); b.wait=rnd(1.2,2.6); a.pair=b.pair=null;
        }
      }
    });
    draw();
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    var bonded=[];
    for(var u=0;u<ag.length;u++) for(var v=u+1;v<ag.length;v++){
      if(Math.hypot(ag[u].x-ag[v].x,ag[u].y-ag[v].y)<2.66*r){ bonded.push(ag[u],ag[v]); paintBond(ctx,ag[u],ag[v],r); }
    }
    ag.forEach(function(a){ if(bonded.indexOf(a)<0) paintItem(ctx,a.x,a.y,r,a.type); });
  }
  layout();
  if('ResizeObserver' in window) new ResizeObserver(layout).observe(cv);
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); else vis=true;
  fields.push({update:update});
}

/* ---------- ROSETTES: rings counter-rotate and breathe, bonds form/pinch by distance ---------- */
function Rosettes(cv){
  var ctx=cv.getContext('2d'), W=0,H=0,dpr=1,vis=false,R=[],r=10,t=0;
  function layout(){
    var b=cv.getBoundingClientRect(); if(!b.width||!b.height) return;
    dpr=Math.min(window.devicePixelRatio||1,2); W=b.width; H=b.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    var n=W<520?2:3; r=Math.min(W/n,H)/(2*(2*G.LINK+1.3));
    R=[]; for(var i=0;i<n;i++) R.push({cx:W/(n*2)+i*W/n,cy:H/2,color:i===1?1:0,dir:i%2?-1:1,ph:i*1.9});
    draw();
  }
  function nodes(o){
    var tt=t+o.ph, R1=r*(2.3+.26*Math.sin(tt*.55)), R2=R1+r*(2.16+.4*Math.sin(tt*.43+1));
    var base=o.dir*tt*.22, a1=base+Math.sin(tt*.31)*.9, a2=base-Math.sin(tt*.27+.6)*1.1-tt*.12*o.dir;
    var P=[[o.cx,o.cy]];
    for(var k=0;k<6;k++){ var q=a1+k*Math.PI/3; P.push([o.cx+Math.cos(q)*R1,o.cy+Math.sin(q)*R1]); }
    for(var k2=0;k2<6;k2++){ var q2=a2+k2*Math.PI/3+Math.sin(tt*.2)*.4; P.push([o.cx+Math.cos(q2)*R2,o.cy+Math.sin(q2)*R2]); }
    return P;
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    R.forEach(function(o){
      var P=nodes(o);
      ctx.fillStyle = o.color===1 ? dkGrad(ctx,o.cx-r*5.6,o.cx+r*5.6,0) : COL[0];
      P.forEach(function(q){ ctx.beginPath(); ctx.arc(q[0],q[1],r,0,TAU); ctx.fill(); });
      for(var i=0;i<P.length;i++) for(var j=i+1;j<P.length;j++){
        var d=Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]);
        if(d<2.66*r&&d>0.3*r) ctx.fill(new Path2D(pairPath(P[i][0],P[i][1],r,P[j][0],P[j][1],r,r*bondFillet(d/r))));
      }
    });
  }
  function update(dt){ if(!vis||!W) return; t+=dt; draw(); }
  layout();
  if('ResizeObserver' in window) new ResizeObserver(layout).observe(cv);
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); else vis=true;
  fields.push({update:update});
}

GridField($('#fHook'));
Rosettes($('#fProof'));


/* =====================================================================
   SEGMENTS: drag any circle onto any other -> link (different) / partnership (same)
   ===================================================================== */
(function(){
  var cv=$('#fSeg'); if(!cv) return;
  var ctx=cv.getContext('2d'), W=0,H=0,dpr=1,r=20,items=[],vis=false;
  var NAMES=['Виробник','Клініка','Споживач'];
  var drag=null,ptr={x:0,y:0},off={x:0,y:0},downP=null,moved=false,sel=null,hover=null,bond=null,prev=null;
  var TXT={
    '0-2':['Зв’язок','Виробник — Споживач','Прямий канал від першоджерела до кінцевого клієнта — без зайвих посередників.'],
    '0-1':['Зв’язок','Клініка — Виробник','Закупівля за цінами виробника та гарантія автентичності препарату.'],
    '1-2':['Зв’язок','Клініка — Споживач','Клієнт отримує процедуру з перевіреним походженням препарату.'],
    '0-0':['Партнерство','Виробник — Виробник','Виробники об’єднують канали, логістику та ринки.'],
    '1-1':['Партнерство','Клініка — Клініка','Клініки діляться навчанням, експертизою та досвідом.'],
    '2-2':['Партнерство','Споживач — Споживач','Спільнота клієнтів, що спирається на перевірених учасників.']
  };
  var res={k:$('#segK'),t:$('#segT'),p:$('#segP')}, chips=$$('.chip'), resetBtn=$('#segReset');
  function dd(a,b){ return (a===b?G.MERGE:G.LINK)*r; }
  function layout(){
    var b=cv.getBoundingClientRect(); if(!b.width||!b.height) return;
    dpr=Math.min(window.devicePixelRatio||1,2); W=b.width; H=b.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    var R=Math.min(W,H)*.3; r=R/2.6;
    var TYPES=[0,2,1,0,2,1], ANG=[240,300,0,60,120,180];
    if(items.length!==6){ items=TYPES.map(function(ty,i){ return {type:ty,idx:i,x:0,y:0,vx:0,vy:0}; }); }
    items.forEach(function(it){ var a=ANG[it.idx]*Math.PI/180; it.hx=W/2+Math.cos(a)*R; it.hy=H/2+Math.sin(a)*R; it.x=it.hx; it.y=it.hy; it.vx=it.vy=0; });
    bond=null; prev=null; drag=null; sel=null; show(null); draw();
  }
  function show(p){
    var key=p?Math.min(p.a.type,p.b.type)+'-'+Math.max(p.a.type,p.b.type):null, T=key?TXT[key]:null;
    res.k.textContent=T?T[0]:'Зв’язок або партнерство';
    res.t.textContent=T?T[1]:'Обери два кола';
    res.p.textContent=T?T[2]:'Перетягни одне коло до іншого, торкнись двох кіл підряд або обери пару нижче. Різні учасники з’єднуються зв’язком, однакові — партнерством.';
    chips.forEach(function(c){ c.setAttribute('aria-pressed', key===c.dataset.a+'-'+c.dataset.b); });
    resetBtn.hidden=!p;
  }
  function target(it){
    var o;
    if(it===drag){
      if(prev&&prev.a===it){ o=prev.b; var d=dd(it.type,o.type); return {x:o.x+Math.cos(prev.ang)*d,y:o.y+Math.sin(prev.ang)*d,k:150,c:17}; }
      return {x:ptr.x-off.x,y:ptr.y-off.y,k:200,c:20};
    }
    if(bond&&bond.a===it){ o=bond.b; var d2=dd(it.type,o.type); return {x:o.x+Math.cos(bond.ang)*d2,y:o.y+Math.sin(bond.ang)*d2,k:110,c:12}; }
    return {x:it.hx,y:it.hy,k:80,c:9.5};
  }
  function hit(p){
    var best=null,bd=r*1.25;
    items.forEach(function(it){ var d=Math.hypot(it.x-p.x,it.y-p.y); if(d<bd){bd=d;best=it;} });
    return best;
  }
  function findPrev(){
    if(!drag){ prev=null; return; }
    var gx=ptr.x-off.x, gy=ptr.y-off.y, best=null, bd=1e9;
    items.forEach(function(o){ if(o===drag) return; var d=Math.hypot(o.x-gx,o.y-gy); if(d<bd){bd=d;best=o;} });
    var lim=prev?2.9*r:1.8*r;
    if(best&&bd<lim){ prev={a:drag,b:best,ang:(bd<.3*r&&prev)?prev.ang:Math.atan2(gy-best.y,gx-best.x)}; } else prev=null;
    show(prev||bond);
  }
  function setBond(a,b){
    bond={a:a,b:b,ang:Math.atan2(a.y-b.y,a.x-b.x)}; show(bond); redraw();
  }
  function ppos(e){ var b=cv.getBoundingClientRect(); return {x:e.clientX-b.left,y:e.clientY-b.top}; }
  cv.addEventListener('pointerdown',function(e){
    var p=ppos(e), it=hit(p); if(!it){ sel=null; return; }
    if(sel&&sel!==it){ var a=sel; sel=null; if(bond&&(bond.a===a||bond.b===a||bond.a===it||bond.b===it)) bond=null; setBond(a,it); return; }
    if(bond&&(bond.a===it||bond.b===it)){ bond=null; show(null); }
    drag=it; ptr=p; off={x:p.x-it.x,y:p.y-it.y}; downP=p; moved=false;
    try{ cv.setPointerCapture(e.pointerId); }catch(_){}
    cv.style.cursor='grabbing'; redraw();
  });
  cv.addEventListener('pointermove',function(e){
    var p=ppos(e);
    if(drag){ ptr=p; if(Math.hypot(p.x-downP.x,p.y-downP.y)>6) moved=true; findPrev(); redraw(); }
    else { var h=hit(p); if(h!==hover){ hover=h; cv.style.cursor=h?'grab':'default'; redraw(); } }
  });
  function up(){
    if(!drag) return;
    var d=drag;
    if(prev&&moved){ bond={a:prev.a,b:prev.b,ang:prev.ang}; show(bond); }
    else if(!moved){ sel=(sel===d)?null:d; }
    if(!(prev&&moved)&&bond&&bond.a===d) bond=null;
    drag=null; prev=null; cv.style.cursor=hover?'grab':'default';
    if(!bond) show(null);
    redraw();
  }
  cv.addEventListener('pointerup',up);
  cv.addEventListener('pointercancel',function(){ drag=null; prev=null; redraw(); });
  cv.addEventListener('pointerleave',function(){ if(!drag){ hover=null; cv.style.cursor='default'; redraw(); } });
  chips.forEach(function(c){
    c.addEventListener('click',function(){
      var ta=+c.dataset.a, tb=+c.dataset.b;
      if(c.getAttribute('aria-pressed')==='true'){ bond=null; show(null); redraw(); return; }
      var a=null,b=null,bd=1e9;
      items.forEach(function(p){ if(p.type!==ta) return; items.forEach(function(q){ if(q===p||q.type!==tb) return; var d=Math.hypot(p.hx-q.hx,p.hy-q.hy); if(d<bd){bd=d;a=p;b=q;} }); });
      if(!a||!b||a===b) return; sel=null;
      bond={a:a,b:b,ang:Math.atan2(a.hy-b.hy,a.hx-b.hx)}; show(bond); redraw();
    });
  });
  resetBtn.addEventListener('click',function(){ bond=null; prev=null; sel=null; show(null); redraw(); });

  function step(dt){
    items.forEach(function(it){
      var T=target(it);
      it.vx+=(T.k*(T.x-it.x)-T.c*it.vx)*dt; it.vy+=(T.k*(T.y-it.y)-T.c*it.vy)*dt;
      it.x+=it.vx*dt; it.y+=it.vy*dt;
    });
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.font='300 13px "Alumni Sans", sans-serif'; ctx.textBaseline='top'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,.5)';
    if(ctx.letterSpacing!==undefined) ctx.letterSpacing='2px';
    items.forEach(function(it){ ctx.fillText(NAMES[it.type].toUpperCase(),it.x,it.y+r+9); });
    ctx.textAlign='start';
    var pairs=[]; if(bond) pairs.push(bond); if(prev) pairs.push(prev);
    var used=[]; pairs.forEach(function(p){ used.push(p.a,p.b); });
    items.forEach(function(it){ if(used.indexOf(it)<0) paintItem(ctx,it.x,it.y,r,it.type); });
    pairs.forEach(function(p){ paintBond(ctx,p.a,p.b,r); });
    var s=sel||(hover&&!drag?hover:null);
    if(s){ ctx.beginPath(); ctx.arc(s.x,s.y,r+7,0,TAU); ctx.lineWidth=1; ctx.strokeStyle=sel?'#3aa0f0':'rgba(144,206,255,.45)'; ctx.stroke(); }
  }
  function redraw(){
    if(reduce){ items.forEach(function(it){ var T=target(it); it.x=T.x; it.y=T.y; it.vx=it.vy=0; }); draw(); }
  }
  layout();
  if('ResizeObserver' in window) new ResizeObserver(layout).observe(cv);
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); else vis=true;
  fields.push({update:function(dt){ if(vis&&W){ step(dt); draw(); } }});
})();

/* =====================================================================
   STATES: exact request -> channel -> deal geometry, flat, spring
   ===================================================================== */
(function(){
  var cv=$('#stCanvas'), ctx=cv.getContext('2d'), W=0,H=0,dpr=1,r=30,vis=false;
  var btns=$$('.stb'), cur=0, timer=null, hover=false;
  var T=[{d:G.LINK,f:0},{d:G.LINK,f:G.FILLET},{d:G.MERGE,f:0}];
  var S={d:G.LINK,vd:0,f:0};
  function layout(){
    var b=cv.getBoundingClientRect(); if(!b.width) return;
    dpr=Math.min(window.devicePixelRatio||1,2); W=b.width; H=b.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    r=Math.min(H*0.24,W*0.115);
  }
  function go(i,instant){
    cur=i; btns.forEach(function(b,k){ b.setAttribute('aria-pressed',k===i); });
    if(instant){ S.d=T[i].d; S.f=T[i].f; S.vd=0; }
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    var cx=W/2, cy=H/2, d=S.d*r, f=S.f*r;
    ctx.fillStyle='#d9d9d9'; ctx.fill(new Path2D(pairPath(cx-d/2,cy,r,cx+d/2,cy,r,f)));
  }
  function tick(dt){
    var t=T[cur], acc=-60*(S.d-t.d)-6.2*S.vd; S.vd+=acc*dt; S.d+=S.vd*dt;
    S.f+=(t.f-S.f)*Math.min(1,dt*4);
    draw();
  }
  btns.forEach(function(b,i){ b.addEventListener('click',function(){ go(i,reduce); restart(); if(reduce) draw(); }); });
  function restart(){ clearInterval(timer); if(reduce) return; timer=setInterval(function(){ if(!hover&&vis) go((cur+1)%3); }, 3600); }
  var box=$('#states'); box.addEventListener('mouseenter',function(){hover=true}); box.addEventListener('mouseleave',function(){hover=false});
  layout(); go(0,true); restart();
  if('ResizeObserver' in window) new ResizeObserver(function(){ layout(); draw(); }).observe(cv);
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); else vis=true;
  fields.push({ update:function(dt){ if(vis&&W) tick(dt); } });
  if(reduce){ setTimeout(function(){ layout(); draw(); },60); }
})();

/* single shared animation loop for all liquid canvases */
(function(){
  if(reduce) return;
  var last=performance.now();
  function loop(now){
    var dt=Math.min(0.05,(now-last)/1000); last=now;
    for(var i=0;i<fields.length;i++) fields[i].update(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ---------- CTA sync loader ---------- */
function syncBtn(btn,ms,cb){ btn.classList.add('sync'); setTimeout(function(){ btn.classList.remove('sync'); if(cb) cb(); }, ms); }
$('#heroCta').addEventListener('click',function(e){
  var b=this; e.preventDefault(); if(b.classList.contains('sync')) return;
  syncBtn(b,1100,function(){ $('#validation').scrollIntoView({behavior:reduce?'auto':'smooth'}); });
});

/* ---------- cluster partnerships hover ---------- */
(function(){
  var els=$$('.cl-list li,.cl-pair,.cl-badge');
  function on(k,v){ els.forEach(function(e){ if(e.dataset.k===k) e.classList.toggle('on',v); }); }
  els.forEach(function(e){
    var k=e.dataset.k; e.addEventListener('mouseenter',function(){on(k,true)}); e.addEventListener('mouseleave',function(){on(k,false)});
  });
  $$('.cl-list li').forEach(function(l){ l.tabIndex=0; l.addEventListener('focus',function(){on(l.dataset.k,true)}); l.addEventListener('blur',function(){on(l.dataset.k,false)}); });
})();

/* ---------- ecosystem hover ---------- */
(function(){
  var cards=$$('.ec'), nodes=$$('.onode');
  function on(i,v){ nodes.forEach(function(n){ if(+n.dataset.i===i) n.classList.toggle('on',v); }); cards.forEach(function(c){ if(+c.dataset.i===i) c.classList.toggle('on',v); }); }
  cards.forEach(function(c){
    var i=+c.dataset.i; c.tabIndex=0;
    c.addEventListener('mouseenter',function(){on(i,true)}); c.addEventListener('mouseleave',function(){on(i,false)});
    c.addEventListener('focus',function(){on(i,true)}); c.addEventListener('blur',function(){on(i,false)});
  });
  if(!reduce){ var k=0; setInterval(function(){ if(document.hidden) return; nodes.forEach(function(n){n.classList.remove('on')}); cards.forEach(function(c){c.classList.remove('on')}); if(!cards.some(function(c){return c.matches(':hover,:focus')})) { on(k%4,true); k++; } }, 2600); }
})();

/* ---------- validation: rings + radial network ---------- */
(function(){
  var net=(function(){
    var cv=$('#vnet'), ctx=cv.getContext('2d'), W=0,dpr=1,vis=false,t=0,nodes=[],level=0;
    var seed=7; function rnd(){ seed|=0; seed=seed+0x6D2B79F5|0; var x=Math.imul(seed^seed>>>15,1|seed); x=x+Math.imul(x^x>>>7,61|x)^x; return ((x^x>>>14)>>>0)/4294967296; }
    var CNT=[16,70,150,230], LEN=[[.18,.3],[.3,.55],[.5,.8],[.62,1]];
    for(var L=0;L<4;L++) for(var i=0;i<CNT[L];i++){
      var lr=LEN[L];
      nodes.push({a:rnd()*TAU,len:100*(lr[0]+(lr[1]-lr[0])*Math.sqrt(rnd())),lvl:L,r:1.7+rnd()*1.9,p:L===0?1:0,wait:0,tint:rnd()<.22,dly:rnd()*.9,ph:rnd()*TAU});
    }
    function layout(){
      var b=cv.getBoundingClientRect(); if(!b.width) return;
      dpr=Math.min(window.devicePixelRatio||1,2); W=b.width; cv.width=Math.round(W*dpr); cv.height=Math.round(W*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
      draw();
    }
    function setLevel(l){ level=l; nodes.forEach(function(n){ var tg=n.lvl<=l?1:0; if(n.tg!==tg){ n.tg=tg; n.wait=n.dly; if(reduce) n.p=tg; } }); if(reduce) draw(); }
    function draw(){
      ctx.clearRect(0,0,W,W); var k=W/280, c=W/2, rot=reduce?0:t*0.025;
      var pos=[];
      ctx.lineWidth=.7;
      for(var i=0;i<nodes.length;i++){
        var n=nodes[i]; if(n.p<=0.002) continue;
        var e=1-Math.pow(1-n.p,3), a=n.a+rot+Math.sin(t*.4+n.ph)*.012, d=n.len*e*k;
        var x=c+Math.cos(a)*d, y=c+Math.sin(a)*d;
        ctx.strokeStyle='rgba(235,242,255,'+(0.34*Math.min(1,n.p*1.5))+')';
        ctx.beginPath(); ctx.moveTo(c,c); ctx.lineTo(x,y); ctx.stroke();
        pos.push(x,y,n);
      }
      for(var j=0;j<pos.length;j+=3){
        var nn=pos[j+2]; ctx.beginPath(); ctx.arc(pos[j],pos[j+1],nn.r*k*.62*Math.min(1,nn.p*2),0,TAU);
        ctx.fillStyle=nn.tint?'#3aa0f0':'#d9d9d9'; ctx.fill();
      }
      var g=ctx.createRadialGradient(c,c,0,c,c,26*k); g.addColorStop(0,'rgba(144,206,255,'+(.28+.12*level)+')'); g.addColorStop(1,'rgba(58,160,240,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c,c,26*k,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(c,c,(7+level*.8)*k,0,TAU); ctx.fillStyle='#fff'; ctx.fill();
    }
    function update(dt){
      if(!vis||!W) return; t+=dt;
      nodes.forEach(function(n){
        if(n.tg===undefined) return;
        if(n.wait>0){ n.wait-=dt; return; }
        n.p+= (n.tg-n.p>0?1:-1)*Math.min(Math.abs(n.tg-n.p),dt/1.6);
      });
      draw();
    }
    layout();
    if('ResizeObserver' in window) new ResizeObserver(layout).observe(cv);
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ vis=es[0].isIntersecting; }).observe(cv); else vis=true;
    fields.push({update:update});
    return {setLevel:setLevel};
  })();
  var law=$('#law'), lv=$('#lv'), btn=$('#vbtn'), txt=$('#vtxt'), reset=$('#vreset');
  var fills=[$('#f1'),$('#f2'),$('#f3')], lens=[829.4,754,678.6], steps=$$('#steps li'), level=0;
  function render(){
    fills.forEach(function(f,i){ f.style.strokeDashoffset = i<level ? 0 : lens[i]; });
    steps.forEach(function(s,i){ s.classList.toggle('done', i<level); });
    lv.textContent = level+' / 3';
    net.setLevel(level);
    if(level>=3){ law.classList.add('on'); law.textContent='Мережа відкрила доступ — один раз і назавжди'; txt.textContent='Доступ відкрито'; btn.disabled=true; reset.hidden=false; }
    else { law.classList.remove('on'); law.textContent='Краса — нагорода за систему'; txt.textContent = level? 'Наступний рівень' : 'Підняти рівень верифікації'; btn.disabled=false; reset.hidden=true; }
  }
  btn.addEventListener('click',function(){ if(level>=3||btn.classList.contains('sync')) return; syncBtn(btn,reduce?0:900,function(){ level++; render(); }); });
  reset.addEventListener('click',function(){ level=0; render(); });
  render();
})();

/* ---------- final CTA ---------- */
$('#finalBtn').addEventListener('click',function(){
  var b=this, t=$('#toast'); if(b.classList.contains('sync')) return; t.textContent='';
  syncBtn(b,1500,function(){ t.textContent='Це макет: форму заявки ще не підключено.'; });
});
})();

/* =====================================================================
   TOPBAR · МЕНЮ · РОЗДІЛИ
   ===================================================================== */
(function(){
  var SECTIONS=[
    ['top','Платформа'],['hook','Ідея'],['segments','Для кого'],['eco','Екосистема'],
    ['validation','Валідація'],['numbers','Цифри'],['proof','Спільнота'],['join','Приєднатися']
  ];
  var menu=document.getElementById('menu'), btn=document.getElementById('menuBtn'),
      list=document.getElementById('menuList'), chap=document.getElementById('chapters'),
      cnt=document.getElementById('tbCount'), nm=document.getElementById('tbName');
  if(!menu||!btn) return;
  var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function pad(n){return (n<10?'0':'')+n;}
  var cur=0;
  SECTIONS.forEach(function(s,i){
    var a=document.createElement('a'); a.className='mi'; a.href='#'+s[0]; a.dataset.i=i;
    a.innerHTML='<span class="mi-n">//'+pad(i+1)+'</span><span class="mi-t">'+s[1]+'</span><span class="mi-s"><span class="mi-lab">Відкрити</span> <span aria-hidden="true">↗</span></span>';
    list.appendChild(a);
    var li=document.createElement('li'), c=document.createElement('a');
    c.href='#'+s[0]; c.dataset.t=s[1]; c.setAttribute('aria-label',s[1]); li.appendChild(c); chap.appendChild(li);
  });
  function setCur(i){
    cur=i; cnt.textContent=pad(i+1)+' / '+pad(SECTIONS.length); nm.textContent=SECTIONS[i][1];
    [].forEach.call(list.children,function(a,k){ a.classList.toggle('cur',k===i); a.querySelector('.mi-lab').textContent=k===i?'Поточний':'Відкрити'; });
    [].forEach.call(chap.querySelectorAll('a'),function(a,k){ a.classList.toggle('on',k===i); });
  }
  function track(){
    var y=innerHeight*.4, idx=0;
    SECTIONS.forEach(function(s,i){ var el=document.getElementById(s[0]); if(el&&el.getBoundingClientRect().top<=y) idx=i; });
    if(idx!==cur) setCur(idx);
  }
  addEventListener('scroll',track,{passive:true}); addEventListener('resize',track); setCur(0); track();
  function open(){
    menu.hidden=false; void menu.offsetWidth; menu.classList.add('open'); document.body.classList.add('menu-open');
    btn.setAttribute('aria-expanded','true'); btn.setAttribute('aria-label','Закрити меню');
    var c=list.querySelector('.cur')||list.firstChild; c&&c.focus({preventScroll:true});
  }
  function close(ret){
    menu.classList.remove('open'); document.body.classList.remove('menu-open');
    btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-label','Відкрити меню');
    setTimeout(function(){ if(!menu.classList.contains('open')) menu.hidden=true; },380);
    if(ret!==false) btn.focus({preventScroll:true});
  }
  btn.addEventListener('click',function(){ menu.classList.contains('open')?close():open(); });
  addEventListener('keydown',function(e){
    if(e.key==='Escape'&&menu.classList.contains('open')) close();
    if(e.key==='Tab'&&menu.classList.contains('open')){
      var f=[btn].concat([].slice.call(list.children)), i=f.indexOf(document.activeElement);
      if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); }
      else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); }
    }
  });
  function go(id){
    var el=document.getElementById(id); if(!el) return;
    var y=id==='top'?0:el.getBoundingClientRect().top+scrollY-(id==='eco'||id==='hook'||id==='proof'?0:0);
    scrollTo({top:y,behavior:rm?'auto':'smooth'});
  }
  list.addEventListener('click',function(e){
    var a=e.target.closest('.mi'); if(!a) return; e.preventDefault();
    close(false); setTimeout(function(){ go(a.getAttribute('href').slice(1)); },200);
  });
  chap.addEventListener('click',function(e){ var a=e.target.closest('a'); if(!a) return; e.preventDefault(); go(a.getAttribute('href').slice(1)); });
})();
