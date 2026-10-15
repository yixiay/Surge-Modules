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
