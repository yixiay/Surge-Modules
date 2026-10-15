const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ip='203.0.113.9';
function execute(variant,{route='',method='GET',arg='policy=测试 🇯🇵 节点&mask=false&media=false',fixture,trigger,store={}}={}) {
  const calls=[];
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('no $done for '+variant+route)),3000);
    const client=(options,cb)=>{
      calls.push(options);
      assert.equal(typeof options.policy,'string');
      assert.ok(options.timeout>0 && options.timeout<=47,'Surge timeout must be seconds');
      assert.equal(options.node,undefined);
      let data=fixture?fixture(options):undefined;
      if(data instanceof Error){setImmediate(()=>cb(data.message,null,null));return;}
      if(data===undefined) {
        if(/cdn-cgi\/trace/.test(options.url)) data='ip='+ip+'\n';
        else if(/ipify|ippure|ipapi/.test(options.url)) data={ip,fraudScore:5,country:'Japan',countryCode:'JP'};
        else if(/ident.me|icanhazip|myip.check/.test(options.url)) data=ip;
        else if(/\/measurements$/.test(options.url)) data={id:'mock',status:'finished',results:[]};
        else if(/\/measurements\//.test(options.url)) data={id:'mock',status:'finished',results:[]};
        else if(/network-info/.test(options.url)) data={data:{prefix:ip+'/24',asns:['64500']}};
        else data={};
      }
      setImmediate(()=>cb(null,{status:200},typeof data==='string'?data:JSON.stringify(data)));
    };
    const context={console:{log(){}},$argument:arg,$trigger:trigger,$httpClient:{get:client,post:client},$persistentStore:{read:k=>store[k]||null,write:(v,k)=>{store[k]=v;return true;}},$notification:{post(){}},
      setTimeout:(f,ms)=>ms>=47000?0:setTimeout(f,Math.min(ms,2)),clearTimeout,
      $done:result=>{clearTimeout(timer);resolve({result,calls,store});}};
    if(route)context.$request={url:'http://ipquality.surge.local/'+variant+route,method,headers:{}};
    try { vm.runInNewContext(fs.readFileSync(path.join(root,'modules/network-diagnostics/ipquality-'+variant+'/report.js'),'utf8'),context); }
    catch(e){clearTimeout(timer);reject(e);}
  });
}
for(const v of ['mayihei','web','xykt']) {
  test(v+' GET report page makes no external requests',async()=>{
    const {result,calls}=await execute(v,{route:'/'});
    assert.equal(result.response.status,200);assert.equal(calls.length,0);
    assert.match(result.response.body,/form method="post"/);
  });
  test(v+' automatic panel refresh uses only cached content',async()=>{
    const {result,calls}=await execute(v,{trigger:'auto-interval'});
    assert.equal(calls.length,0);assert.match(result.content,/ipquality.surge.local/);
  });
  test(v+' POST renders colored HTML and binds egress to configured policy',async()=>{
    const {result,calls}=await execute(v,{route:'/all',method:'POST'});
    assert.equal(result.response.status,200);
    assert.match(result.response.body,/风险评分/);
    assert.ok(calls.some(x=>x.policy==='测试 🇯🇵 节点'));
    assert.ok(!calls.some(x=>/globalping|speed.cloudflare/.test(x.url)));
  });
}
for(const [action,url] of [['bgp','stat.ripe.net'],['ping','api.globalping.io'],['mtr','api.globalping.io'],['inbound','api.globalping.io'],['speed','speed.cloudflare.com']]) {
  test('web '+action+' executes real module path',async()=>{
    const {calls,result}=await execute('web',{route:'/'+action,method:'POST'});
    assert.ok(calls.some(x=>x.url.includes(url)),'expected '+url);
    assert.equal(result.response.status,200);
  });
}
test('xykt null scores and failed sources are unknown, never zero-risk',async()=>{
  const {result}=await execute('xykt',{route:'/all',method:'POST',fixture:o=>o.url.includes('ipify')?{ip}: {fraud_score:null}});
  assert.match(result.response.body,/未知/);
  assert.doesNotMatch(result.response.body,/0 · 低风险/);
});
test('xykt score boundaries and boolean false are preserved; missing flags unknown',async()=>{
  const {result}=await execute('xykt',{route:'/all',method:'POST',fixture:o=>{
    if(o.url.includes('ipqualityscore'))return {ip,fraud_score:85,proxy:false};
  }});
  assert.match(result.response.body,/85 · 存在风险/);
  assert.match(result.response.body,/代理：未命中 · VPN：未知/);
});
test('xykt rejects mismatched database IP',async()=>{
  const {result}=await execute('xykt',{route:'/all',method:'POST',fixture:o=>o.url.includes('ipqualityscore')?{ip:'203.0.113.99',fraud_score:0}:undefined});
  assert.match(result.response.body,/返回 IP 与检测目标不一致/);
});
test('default argument and HTML escaping work',async()=>{
  const {result}=await execute('web',{route:'/',arg:'policy=<script>alert(1)</script>'});
  assert.doesNotMatch(result.response.body,/<script>alert/);
  const fallback=await execute('web',{route:'/',arg:'policy={{{policy_group}}}'});
  assert.match(fallback.result.response.body,/✈️ 我的节点（所有订阅）/);
});
test('unknown route rejected without requests',async()=>{
  const {result,calls}=await execute('web',{route:'/unknown',method:'POST'});
  assert.equal(result.response.status,404);assert.equal(calls.length,0);
});

for (const variant of ['mayihei','web','xykt']) {
  test(variant+' panel preserves complete new results including final fields',async()=>{
    const {result,store}=await execute(variant);
    assert.ok(result.content.length>160);
    assert.match(result.content,/风险评分[\s\S]*风险因素[\s\S]*数据状态/);
    assert.ok(result.content.split('\n').length>10);
    const cachedRun=await execute(variant,{store,trigger:'auto-interval'});
    assert.equal(cachedRun.calls.length,0);
    assert.equal(cachedRun.result.content,result.content);
  });
  test(variant+' reconstructs full text from old truncated-summary cache',async()=>{
    const key='ipquality.'+variant+'.'+encodeURIComponent('测试 🇯🇵 节点')+'.false';
    const html='<style>.hidden{color:red}</style><h2>基础信息</h2><div>IP: 203.0.113.9</div><p>'+ '完整字段 '.repeat(60) +'</p><h2>风险因素</h2><div><span>运营商</span><span>A &amp; B</span></div><table><tr><th>IPQS</th><td>未知</td></tr></table><div>末尾数据 &#x1F1EF;&#127477;<br>完成</div>';
    const {result,calls}=await execute(variant,{trigger:'auto-interval',store:{[key]:JSON.stringify({html,summary:'截断摘要'})}});
    assert.equal(calls.length,0);
    assert.match(result.content,/基础信息\nIP: 203.0.113.9/);
    assert.match(result.content,/运营商 A & B\n\nIPQS 未知/);
    assert.match(result.content,/末尾数据 🇯🇵\n完成/);
    assert.doesNotMatch(result.content,/截断摘要|color:red|<div>|&amp;/);
  });
}

for(const variant of ['mayihei','web']) {
  test(variant+' shows all seven media results individually with failure reasons',async()=>{
    const names=['TikTok','Disney+','Netflix','YouTube','Prime Video','Reddit','ChatGPT'];
    const {result,store}=await execute(variant,{
      route:variant==='web'?'/media':'/all',method:'POST',arg:'policy=测试 🇯🇵 节点&mask=false&media=true',
      fixture:o=>/tiktok|disney|netflix|youtube|google|primevideo|reddit|chatgpt|openai/i.test(o.url)?new Error('HTTP timeout <test>'):undefined
    });
    const html=result.response.body;
    assert.equal((html.match(/class="media-result"/g)||[]).length,7);
    for(const name of names)assert.ok(html.includes('>'+name+'</span>'),name);
    assert.doesNotMatch(html,/⚪ 未确认：/);
    assert.match(html,/HTTP timeout &lt;test&gt;/);
    const panel=await execute(variant,{store,trigger:'auto-interval'});
    for(const name of names)assert.ok(panel.result.content.includes(name),name);
    assert.match(panel.result.content,/请求失败：HTTP timeout <test>/);
    assert.match(panel.result.content,/\n\n⚪/);
  });
}
