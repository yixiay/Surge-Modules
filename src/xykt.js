// SPDX-License-Identifier: AGPL-3.0-or-later
// JavaScript adaptation of data fields and risk thresholds in xykt/IPQuality ip.sh.
// Upstream: 87397e2c3196ec796f5477c83343c2354df601ea (v2026-09-16).
function runXykt({client, policy, mask, esc, finish}) {
  const backend = 'https://ipinfo.check.place/';
  const get = (obj, field) => field.split('.').reduce((v,k) => v && v[k], obj);
  const meaningful = v => v !== null && v !== undefined && v !== '';
  const ipv4 = value => typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(value) && value.split('.').every(x=>Number(x)<=255);
  function json(url) {
    return new Promise((resolve,reject) => client.get({url,node:policy,timeout:8000,headers:{Accept:'application/json','User-Agent':'curl/8.7.1'}}, (error,res,body) => {
      if (error || !res || res.status < 200 || res.status >= 300) { reject(new Error(error || 'HTTP '+(res && res.status))); return; }
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object' || Array.isArray(data) || data.success === false || data.error || data.errors) throw new Error('数据源未返回有效结果');
        resolve(data);
      } catch (e) { reject(new Error('无效响应：'+ e.message)); }
    }));
  }
  function flag(value) {
    if (value === true || value === 'true') return '命中';
    if (value === false || value === 'false') return '未命中';
    return '未知';
  }
  function risk(value, thresholds, labels) {
    if (!meaningful(value) || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value)<0 || Number(value)>100) return {value:'未返回', label:'未知',color:''};
    let index = 0;
    while (index < thresholds.length && Number(value) >= thresholds[index]) index++;
    return {value:Number(value), label:labels[index],color:index===0?'good':index===1?'warn':'bad'};
  }
  const sources = [
    {name:'IP2Location',db:'ip2location',score:'fraud_score',types:['usage_type','as_info.as_usage_type'],thresholds:[33,66],labels:['低风险','中风险','高风险'],flags:{代理:'is_proxy',VPN:'proxy.is_vpn',Tor:'proxy.is_tor',机房:'proxy.is_data_center',滥用:'proxy.is_spammer'}},
    {name:'Scamalytics',db:'scamalytics',score:'scamalytics.scamalytics_score',types:[],thresholds:[20,60,90],labels:['低风险','中风险','高风险','极高风险'],flags:{代理:'external_datasources.firehol.is_proxy',VPN:'scamalytics.scamalytics_proxy.is_vpn',Tor:'external_datasources.x4bnet.is_tor',机房:'scamalytics.scamalytics_proxy.is_datacenter',滥用:'scamalytics.is_blacklisted_external'}},
    {name:'IPQS',db:'ipqualityscore',score:'fraud_score',types:[],thresholds:[75,85,90],labels:['低风险','可疑','存在风险','高风险'],flags:{代理:'proxy',VPN:'vpn',Tor:'tor',滥用:'recent_abuse',机器人:'bot_status'}},
    {name:'IPinfo',url:ip=>'https://ipinfo.io/widget/demo/'+ip,types:['data.asn.type','data.company.type'],flags:{代理:'data.privacy.proxy',VPN:'data.privacy.vpn',Tor:'data.privacy.tor',机房:'data.privacy.hosting'}},
    {name:'AbuseIPDB',db:'abuseipdb',score:'data.abuseConfidenceScore',types:['data.usageType'],thresholds:[25,75],labels:['低风险','高风险','建议封禁'],flags:{Tor:'data.isTor'}}
  ];
  (async () => {
    let ip;
    try { ip = (await json('https://api4.ipify.org?format=json')).ip; } catch (_) {}
    if (!ipv4(ip)) {
      const fallback = await json('https://api.ipapi.is/'); ip = fallback.ip;
    }
    if (!ipv4(ip)) throw new Error('无法确认策略的 IPv4 出口');
    const results = await Promise.all(sources.map(async spec => {
      try {
        const data = await json(spec.url ? spec.url(ip) : backend+ip+'?db='+spec.db);
        const returnedIP = get(data,'ip') || get(data,'data.ipAddress') || get(data,'data.ip');
        if (returnedIP && returnedIP !== ip) throw new Error('返回 IP 与检测目标不一致');
        const fields = (spec.score?[spec.score]:[]).concat(spec.types,Object.values(spec.flags));
        if (!fields.some(field=>meaningful(get(data,field)))) throw new Error('返回结果缺少本模块所需字段');
        return {spec,data};
      } catch (error) { return {spec,error:error.message}; }
    }));
    const displayIP = mask ? ip.split('.').slice(0,2).join('.')+'.*.*' : ip;
    const names = {ISP:'家宽',MOB:'移动网络',DCH:'机房',COM:'商业',hosting:'机房',isp:'家宽',business:'商业',education:'教育'};
    const usage = v => meaningful(v) ? (names[v] ? names[v]+' ('+v+')' : String(v)) : '未返回';
    let html = `<h2>出口 IP · ${esc(displayIP)}</h2><p>策略：${esc(policy)}</p><h2>IP 类型属性</h2><table>`;
    results.forEach(({spec,data,error}) => {
      if (spec.types.length) html += `<tr><th>${esc(spec.name)}</th><td>${error?'未返回':spec.types.map(f=>esc(usage(get(data,f)))).join(' / ')}</td></tr>`;
    });
    html += '</table><h2>风险评分</h2><table>';
    results.forEach(({spec,data,error}) => {
      if (!spec.score) { html += `<tr><th>${spec.name}</th><td>此接口仅提供类型和风险标记，无数值评分</td></tr>`; return; }
      const r = risk(error?null:get(data,spec.score),spec.thresholds,spec.labels);
      html += `<tr><th>${spec.name}</th><td class="${r.color}">${r.value} · ${r.label}</td></tr>`;
    });
    html += '</table><h2>风险因素</h2>';
    results.forEach(({spec,data,error}) => {
      html += `<h3>${spec.name}</h3>`;
      html += error ? '<p>未返回，无法判断</p>' : '<p>'+Object.keys(spec.flags).map(label=>esc(label)+'：'+flag(get(data,spec.flags[label]))).join(' · ')+'</p>';
    });
    html += '<h2>数据状态</h2>'+results.map(r=>`<p>${r.spec.name}：${r.error ? esc(r.error) : '已返回（不完整字段标为未知）'}</p>`).join('');
    html += '<p class="note">评分档位及字段映射基于 xykt/IPQuality；这是其五库 IP 数据子集的 Surge JavaScript 移植，不执行 Bash。IPinfo 直接查询；其余四库沿用上游 ipinfo.check.place 聚合接口，不等于持有各官方 API Key。仅 IPv4；SMTP、DNSBL、双栈和流媒体未包含。各库独立展示，无综合分。</p>';
    finish({htmlMessage:html});
  })().catch(error=>finish({content:error.message}));
}
