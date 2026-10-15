const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/panel-format.js'),'utf8'),ctx);
const format=text=>ctx.formatPanelText(text,{policy:'我的策略 🇭🇰'});
test('groups original fields and retains distinct provider scores and missing sources',()=>{
 const text='节点 IP 质量检测\n节点 · 我的策略 🇭🇰\n203.0.113.9\nAS64500 · Example\n▌基础信息\n来源 IPinfo\n时区 Asia/Hong_Kong\n▌IP 类型属性\nIPinfo\n使用 hosting\n公司 business\nIP2Location\n使用 DCH\n▌风险评分\nIPPure（补充） 61 · 中风险\nIP2Location 99 · 高风险\nScamalytics 12 · 低风险\n本次未返回：IPQS、AbuseIPDB\n▌风险因素\nIPinfo\n命中 机房\n未命中 VPN、代理、Tor\n▌数据状态\n请求 13/22 成功';
 const out=format(text);
 assert.match(out,/策略：我的策略 🇭🇰\n\n▌出口信息\n出口 IP：203.0.113.9/);
 assert.match(out,/\n\n▌基础信息\n来源：IPinfo\n时区：Asia\/Hong_Kong/);
 assert.match(out,/IPinfo\n  使用：hosting\n  公司：business\n\nIP2Location/);
 assert.match(out,/🟠 IPPure（补充）：61 · 中风险/);
 assert.match(out,/🔴 IP2Location：99 · 高风险/);
 assert.match(out,/🟢 Scamalytics：12 · 低风险/);
 assert.match(out,/⚪ 本次未返回：IPQS、AbuseIPDB/);
 assert.match(out,/⚠ 命中：机房\n  ✓ 未命中：VPN、代理、Tor/);
 assert.ok(out.endsWith('请求：13/22 成功'));
});
test('keeps every BGP, probe, error and explanatory line',()=>{
 const input='▌BGP 网络身份\n前缀 203.0.113.0/24\nOrigin AS64500\n▌指定 ASN 外部探针 Ping\n电信 · 20 ms · 丢包 0%\n联通 · HTTP 429\n移动 · 未确认到达\n类型名称、评分分档说明全文';
 const out=format(input);
 for(const needle of ['203.0.113.0/24','AS64500','电信 · 20 ms · 丢包 0%','联通 · HTTP 429','移动 · 未确认到达','类型名称、评分分档说明全文'])assert.ok(out.includes(needle));
 assert.match(out,/\n\n▌检测说明\n/);
});
test('does not confuse unknown with low risk or truncate long reports',()=>{
 const input='风险评分\nIPQS 未返回 · 未知\n'+Array.from({length:200},(_,i)=>'字段'+i+' 完整值').join('\n');
 const out=format(input);assert.match(out,/⚪ IPQS 未返回 · 未知/);assert.ok(out.endsWith('字段199 完整值'));assert.doesNotMatch(out,/🟢/);
});
test('formats xykt factors and types without losing unknown flags or duplicating bullets',()=>{
 const out=format('IP 类型属性\nIPinfo hosting / business\n风险评分\n● IPQS 85 · 存在风险\n风险因素\nIPQS\n代理：命中 · VPN：未知 · Tor：未命中');
 assert.match(out,/IPinfo\n  使用：hosting\n  公司：business/);
 assert.match(out,/🔴 IPQS：85 · 存在风险/);assert.doesNotMatch(out,/●/);
 assert.match(out,/⚠ 命中：代理\n  ✓ 未命中：Tor\n  \? 未知：VPN/);
});
