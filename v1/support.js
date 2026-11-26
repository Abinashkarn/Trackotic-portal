/* Minimal runtime for Track0tic .dc.html wireframes on GitHub Pages.
   Renders {{holes}}, <sc-if>, <sc-for>, <dc-import> and on* handlers from class Component extends DCLogic. */
(function(){
  class DCLogic { constructor(p){ this.props=p||{}; this.state={}; } setState(x){ Object.assign(this.state, typeof x==='function'?x(this.state):x); this.__rerender&&this.__rerender(); } forceUpdate(){ this.__rerender&&this.__rerender(); } }
  window.DCLogic=DCLogic;
  const q=new URLSearchParams(location.search);
  function lit(s){ s=s.trim(); if(s==='true')return true; if(s==='false')return false; if(s==='null')return null; if(/^-?\d+(\.\d+)?$/.test(s))return Number(s); return undefined; }
  function resolve(path, scope, vals){ const l=lit(path); if(l!==undefined)return l; const parts=path.trim().split('.'); let cur=(parts[0] in scope)?scope:vals; for(const p of parts){ if(cur==null)return undefined; cur=cur[p]; } return cur; }
  const HOLE=/\{\{\s*([^}]+?)\s*\}\}/g;
  function interp(str, scope, vals){ const m=str.match(/^\{\{\s*([^}]+?)\s*\}\}$/); if(m) return resolve(m[1],scope,vals); return str.replace(HOLE,(_,p)=>{const v=resolve(p,scope,vals); return v==null?'':String(v);}); }
  function renderChildren(src, scope, vals, out){ for(const n of Array.from(src.childNodes)) renderNode(n, scope, vals, out); }
  function renderNode(n, scope, vals, out){
    if(n.nodeType===3){ out.appendChild(document.createTextNode(n.nodeValue.indexOf('{{')>=0?String(interp(n.nodeValue,scope,vals)??''):n.nodeValue)); return; }
    if(n.nodeType!==1) return;
    let tag=n.tagName.toLowerCase(); let src=n;
    if(tag==='template'&&n.dataset.sc){ tag='sc-'+n.dataset.sc; src=n.content; }
    if(tag==='sc-if'){ const v=interp(n.getAttribute('value')||'',scope,vals); if(v) renderChildren(src,scope,vals,out); return; }
    if(tag==='sc-for'){ const list=interp(n.getAttribute('list')||'',scope,vals)||[]; const as=n.getAttribute('as')||'item'; list.forEach((it,i)=>{ renderChildren(src,Object.assign({},scope,{[as]:it,$index:i}),vals,out); }); return; }
    if(false){ const v=interp(n.getAttribute('value')||'',scope,vals); if(v) renderChildren(n,scope,vals,out); return; }
    if(tag==='sc-for'){ const list=interp(n.getAttribute('list')||'',scope,vals)||[]; const as=n.getAttribute('as')||'item'; list.forEach((it,i)=>{ renderChildren(n,Object.assign({},scope,{[as]:it,$index:i}),vals,out); }); return; }
    if(tag==='dc-import'){ const name=n.getAttribute('name'); const f=document.createElement('iframe'); const params=new URLSearchParams(); for(const a of n.attributes){ if(['name','hint-size'].includes(a.name))continue; params.set(a.name, String(interp(a.value,scope,vals))); } f.src=name+'.dc.html?embed=1&'+params.toString(); const hs=(n.getAttribute('hint-size')||'240px,820px').split(','); f.style.cssText='border:0;width:'+hs[0]+';min-height:'+hs[1]+';flex:0 0 auto;display:block'; f.setAttribute('scrolling','no'); f.addEventListener('load',()=>{try{const h=f.contentDocument.documentElement.scrollHeight;if(h>parseInt(hs[1]))f.style.minHeight=h+'px';}catch(e){}}); out.appendChild(f); return; }
    const el=document.createElementNS(n.namespaceURI, n.tagName.includes('-')||n.namespaceURI!=='http://www.w3.org/1999/xhtml'?n.tagName:tag);
    for(const a of Array.from(n.attributes)){
      const name=a.name; if(name.startsWith('hint-'))continue;
      const whole=a.value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
      const v=whole?resolve(whole[1],scope,vals):(a.value.indexOf('{{')>=0?interp(a.value,scope,vals):a.value);
      if(/^on[a-z]/i.test(name)){ if(typeof v==='function'){ let ev=name.slice(2).toLowerCase(); if(ev==='change'){ el.addEventListener('change',v); } else el.addEventListener(ev,v); } continue; }
      if(name==='checked'){ el.checked=!!v; if(v)el.setAttribute('checked',''); continue; }
      if(name==='value'){ el.value=v==null?'':v; el.setAttribute('value',v==null?'':v); continue; }
      if(name==='disabled'||name==='selected'){ if(v)el.setAttribute(name,''); continue; }
      if(name==='classname'){ el.setAttribute('class',v); continue; }
      if(v===false||v==null){ continue; }
      el.setAttribute(name, String(v));
    }
    renderChildren(n,scope,vals,el); out.appendChild(el);
  }
  async function boot(){
    let doc=document;
    try{ const raw=await (await fetch(location.pathname,{cache:'no-store'})).text();
      const fixed=raw.replace(/<sc-(if|for)\b/g,'<template data-sc="$1"').replace(/<\/sc-(if|for)>/g,'</template>');
      doc=new DOMParser().parseFromString(fixed,'text/html'); }catch(e){ console.warn('raw fetch failed, using live DOM',e); }
    const xdc=doc.querySelector('x-dc'); const sc=doc.querySelector('script[data-dc-script]'); if(!xdc)return;
    const live=document.querySelector('x-dc');
    const helmet=xdc.querySelector('helmet'); if(helmet){ Array.from(helmet.childNodes).forEach(c=>document.head.appendChild(document.importNode(c,true))); helmet.remove(); }
    const tpl=document.createElement('div'); Array.from(xdc.childNodes).forEach(c=>tpl.appendChild(document.importNode(c,true))); 
    let props={}, enums=[], preview=null; try{ const dp=JSON.parse(sc.getAttribute('data-props')||'{}'); preview=dp.$preview||null; for(const k in dp){ if(k==='$preview')continue; if(dp[k]&&typeof dp[k]==='object'&&'default' in dp[k]) props[k]=dp[k].default; if(dp[k]&&dp[k].editor==='enum') enums.push([k,dp[k].options]); } }catch(e){}
    for(const [k,v] of q.entries()){ if(k==='embed')continue; props[k]=v; }
    let Comp; try{ Comp=new Function('DCLogic', sc.textContent+'\nreturn Component;')(DCLogic); }catch(e){ console.error('dc script',e); Comp=class extends DCLogic{renderVals(){return{}}}; }
    const inst=new Comp(props); const root=document.createElement('div'); root.id='dc-root'; if(live) live.replaceWith(root); else document.body.appendChild(root);
    const rerender=()=>{ let vals={}; try{ vals=inst.renderVals()||{}; }catch(e){ console.error('renderVals',e); } const frag=document.createDocumentFragment(); renderChildren(tpl,{},vals,frag); root.replaceChildren(frag); const first=root.firstElementChild; if(first&&preview&&preview.width&&!q.get('embed')&&!/(^|;)\s*width\s*:/.test(first.getAttribute('style')||'')){ first.style.width=preview.width+'px'; first.style.boxSizing='border-box'; } const nxt=q.get('next'); if(nxt&&/^[\w-]+\.dc\.html$/.test(nxt)){ root.querySelectorAll('a[href="Device-Staff.dc.html"]').forEach(a=>a.setAttribute('href',nxt)); } };
    inst.__rerender=rerender; rerender();
    // next= : on the login screen, send the main button to the screen the user came from (demo: scan → login → passport journey)
    // ---- zoom / fit for boards wider than the window (flowcharts, admin pages on phones) ----
    let zoom=null; // null = fit
    const avail=()=>Math.min(window.innerWidth,(window.visualViewport&&window.visualViewport.width)||1e9,screen.width||1e9)-24;
    const fit=()=>{ if(q.get('embed'))return; let wrap=root.firstElementChild; if(!wrap)return; const bb=document.querySelector('.dc-bar'); if(bb) root.style.marginTop=bb.offsetHeight+'px'; if(!wrap.classList.contains('dc-wrap')){ const w0=document.createElement('div'); w0.className='dc-wrap'; w0.style.cssText='flex:0 0 auto;overflow:hidden;position:relative'; root.insertBefore(w0,wrap); w0.appendChild(wrap); wrap=w0; } const el=wrap.firstElementChild; if(!el)return; el.style.transform=''; el.style.transformOrigin='top left'; wrap.style.width=''; wrap.style.height=''; const w=el.offsetWidth, h=el.offsetHeight; const k=zoom==null?Math.min(1,avail()/w):zoom; el.style.transform='scale('+k+')'; wrap.style.width=Math.ceil(w*k)+'px'; wrap.style.height=Math.ceil(h*k)+'px'; root.style.height=''; root.style.justifyContent=(w*k<avail())?'center':'flex-start'; root.style.overflowX=(w*k>avail())?'auto':'hidden'; const zb=document.getElementById('dc-zoom'); if(zb){ zb.style.display=(w>avail()||zoom!=null)?'inline-flex':'none'; zb.querySelector('span').textContent=Math.round(k*100)+'%'; } };
    window.addEventListener('resize',fit); setTimeout(fit,50); new MutationObserver(()=>setTimeout(fit,0)).observe(root,{childList:true});
    if(!q.get('embed')){ const zb=document.createElement('span'); zb.id='dc-zoom'; zb.style.cssText='display:none;align-items:center;gap:4px;margin-left:10px'; zb.innerHTML='<button data-z="-">−</button><span style="min-width:40px;text-align:center;opacity:.8">100%</span><button data-z="+">+</button><button data-z="fit">Fit</button><button data-z="1">100%</button>'; zb.querySelectorAll('button').forEach(bt=>{ bt.style.cssText='height:24px;padding:0 8px;border-radius:6px;border:1px solid #273149;background:#172036;color:#fff;font-size:12px;cursor:pointer'; bt.addEventListener('click',()=>{ const el=root.firstElementChild; const cur=zoom==null?Math.min(1,avail()/el.offsetWidth):zoom; const z=bt.dataset.z; zoom= z==='fit'?null : z==='1'?1 : Math.max(0.15,Math.min(3, z==='+'?cur*1.25:cur/1.25)); fit(); }); }); window.__dcZoom=zb; }
    if(!q.get('embed')){ document.body.style.background='#e2e6ed'; const st=document.createElement('style'); st.textContent='html,body{overflow-x:hidden;max-width:100vw}#dc-root{display:flex;justify-content:center;padding:28px 12px;overflow:hidden;box-sizing:border-box;width:100vw}#dc-root>*{flex:0 0 auto}#dc-root .dc-wrap>*{box-shadow:0 6px 30px rgba(15,23,42,.12)}#dc-root .dc-wrap>div[style*="width:390px"]{border-radius:24px;overflow:hidden}.dc-bar{position:fixed;left:0;right:0;top:0;min-height:40px;background:#0f172a;color:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:6px 16px;box-sizing:border-box;font:13px/1 "Noto Sans",system-ui,sans-serif;z-index:9}.dc-bar a{color:#8fb0ff;text-decoration:none;white-space:nowrap}.dc-bar .dc-ttl{opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 120px;min-width:0}.dc-bar .dc-tag{margin-left:auto;opacity:.6;white-space:nowrap}@media(max-width:700px){.dc-bar .dc-tag{display:none}.dc-bar{gap:6px 10px;padding:6px 10px}}#dc-root{margin-top:52px}'; document.head.appendChild(st); const bar=document.createElement('div'); bar.className='dc-bar'; bar.innerHTML='<a href="index.html">‹ All screens</a><span class="dc-ttl" title="'+(document.title||'').replace(/"/g,"&quot;")+'">'+(document.title||'')+'</span><span class="dc-tag">Track<span style="color:#ff5a66">0</span>tic<sup style="font-size:.6em">TM</sup> QR wireframes · click links to move between screens</span>'; document.body.prepend(bar); if(window.__dcZoom) bar.insertBefore(window.__dcZoom, bar.children[2]||null); enums.forEach(([k,opts])=>{ const sel=document.createElement('select'); sel.style.cssText='margin-left:8px;height:26px;border-radius:6px;border:1px solid #273149;background:#172036;color:#fff;font-size:12px'; opts.forEach(o=>{ const op=document.createElement('option'); op.value=o; op.textContent=k+': '+o; if(String(props[k])===o) op.selected=true; sel.appendChild(op); }); sel.addEventListener('change',()=>{ const u=new URL(location.href); u.searchParams.set(k,sel.value); location.href=u.toString(); }); bar.insertBefore(sel, bar.children[2]); }); }
    else { document.body.style.margin='0'; }
    if(!q.get('embed')){ try{ const cv=await (await fetch('canvas.json',{cache:'no-store'})).json(); const order=cv.order||[]; const me=location.pathname.split('/').pop(); const i=order.indexOf(me); if(i>=0){ const bar=document.querySelector('.dc-bar'); const nav=document.createElement('span'); nav.style.cssText='display:inline-flex;align-items:center;gap:6px;margin-left:auto;white-space:nowrap'; const mk=(f,label)=>{ const a=document.createElement('a'); if(f){ a.href=f; a.title=(cv.boards[f]||{}).title||f; } else { a.style.opacity='.35'; } a.textContent=label; a.style.cssText+='color:#fff;text-decoration:none;padding:3px 10px;border:1px solid #273149;border-radius:6px;background:#172036'; return a; }; const prev=order[i-1], next=order[i+1]; nav.appendChild(mk(prev,'‹ Prev')); const pos=document.createElement('span'); pos.style.opacity='.7'; pos.textContent=(i+1)+' / '+order.length; nav.appendChild(pos); nav.appendChild(mk(next,'Next ›')); const tail=bar.lastElementChild; tail.style.marginLeft='12px'; tail.style.display='none'; bar.appendChild(nav); document.addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA')return; if(e.key==='ArrowRight'&&next) location.href=next; if(e.key==='ArrowLeft'&&prev) location.href=prev; }); } }catch(e){} }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
