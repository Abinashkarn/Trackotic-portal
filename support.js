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
    let props={}, enums=[]; try{ const dp=JSON.parse(sc.getAttribute('data-props')||'{}'); for(const k in dp){ if(k==='$preview')continue; if(dp[k]&&typeof dp[k]==='object'&&'default' in dp[k]) props[k]=dp[k].default; if(dp[k]&&dp[k].editor==='enum') enums.push([k,dp[k].options]); } }catch(e){}
    for(const [k,v] of q.entries()){ if(k==='embed')continue; props[k]=v; }
    let Comp; try{ Comp=new Function('DCLogic', sc.textContent+'\nreturn Component;')(DCLogic); }catch(e){ console.error('dc script',e); Comp=class extends DCLogic{renderVals(){return{}}}; }
    const inst=new Comp(props); const root=document.createElement('div'); root.id='dc-root'; if(live) live.replaceWith(root); else document.body.appendChild(root);
    const rerender=()=>{ let vals={}; try{ vals=inst.renderVals()||{}; }catch(e){ console.error('renderVals',e); } const frag=document.createDocumentFragment(); renderChildren(tpl,{},vals,frag); root.replaceChildren(frag); const nxt=q.get('next'); if(nxt&&/^[\w-]+\.dc\.html$/.test(nxt)){ root.querySelectorAll('a[href="Device-Staff.dc.html"]').forEach(a=>a.setAttribute('href',nxt)); } };
    inst.__rerender=rerender; rerender();
    // next= : on the login screen, send the main button to the screen the user came from (demo: scan → login → passport journey)
    // fit wide boards to a phone screen
    const fit=()=>{ const el=root.firstElementChild; if(!el||q.get('embed'))return; el.style.transform=''; el.style.transformOrigin='top left'; const w=el.getBoundingClientRect().width; const avail=window.innerWidth-32; if(w>avail){ const k=avail/w; el.style.transform='scale('+k+')'; root.style.height=(el.getBoundingClientRect().height+56)+'px'; root.style.justifyContent='flex-start'; } else { root.style.height=''; root.style.justifyContent='center'; } };
    window.addEventListener('resize',fit); setTimeout(fit,50); new MutationObserver(()=>setTimeout(fit,0)).observe(root,{childList:true});
    if(!q.get('embed')){ document.body.style.background='#e2e6ed'; const st=document.createElement('style'); st.textContent='#dc-root{display:flex;justify-content:center;padding:28px 16px}#dc-root>*{box-shadow:0 6px 30px rgba(15,23,42,.12)}#dc-root>div[style*="width:390px"]{border-radius:24px;overflow:hidden}.dc-bar{position:fixed;left:0;right:0;top:0;height:40px;background:#0f172a;color:#fff;display:flex;align-items:center;gap:14px;padding:0 16px;font:13px/1 "Noto Sans",system-ui,sans-serif;z-index:9}.dc-bar a{color:#8fb0ff;text-decoration:none}#dc-root{margin-top:40px}'; document.head.appendChild(st); const bar=document.createElement('div'); bar.className='dc-bar'; bar.innerHTML='<a href="index.html">‹ All screens</a><span style="opacity:.7">'+(document.title||'')+'</span><span style="margin-left:auto;opacity:.6">Track<span style="color:#ff5a66">0</span>tic<sup style="font-size:.6em">TM</sup> QR wireframes · click links to move between screens</span>'; document.body.prepend(bar); enums.forEach(([k,opts])=>{ const sel=document.createElement('select'); sel.style.cssText='margin-left:8px;height:26px;border-radius:6px;border:1px solid #273149;background:#172036;color:#fff;font-size:12px'; opts.forEach(o=>{ const op=document.createElement('option'); op.value=o; op.textContent=k+': '+o; if(String(props[k])===o) op.selected=true; sel.appendChild(op); }); sel.addEventListener('change',()=>{ const u=new URL(location.href); u.searchParams.set(k,sel.value); location.href=u.toString(); }); bar.insertBefore(sel, bar.children[2]); }); }
    else { document.body.style.margin='0'; }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
