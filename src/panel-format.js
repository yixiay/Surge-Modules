// Layout only: retain report fields, source scores, unknowns and diagnostics.
function formatPanelText(text, metadata) {
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
  const sections = [];
  let section = {name:'出口信息', lines:[]};
  sections.push(section);
  const headings = /^(?:基础信息|IP 类型属性|风险评分|风险因素|数据状态|流媒体与 AI|出口分流|地区一致性)$/;
  const field = /^(来源|网段|时区|注册地|坐标|状态|耗时|请求|版本|前缀|Origin|持有者|注册机构|路由状态|RPKI|数据时间|使用|公司|目标|HTTPS 响应|下载|上传|IP)\s+(.+)$/;
  for (let line of lines) {
    if (line === '节点 IP 质量检测' || line === '节点 HTTPS 轻量测速') continue;
    if (line.startsWith('节点 · ') || line === '策略：'+metadata.policy) continue;
    if (line.startsWith('▌') || headings.test(line)) {
      section = {name:line.replace(/^▌\s*/,''), lines:[]};
      sections.push(section);
      continue;
    }
    if (/^(类型名称、评分分档|评分档位及字段映射|数据来自目标节点的真实 HTTPS)/.test(line)) {
      section = {name:'检测说明', lines:[]};
      sections.push(section);
    }
    line = line.replace(/^出口 IP\s*·\s*/, '出口 IP：');
    if (/^(?:\d{1,3}|\*)(?:\.(?:\d{1,3}|\*)){3}$/.test(line)) line = '出口 IP：'+line;
    line = line.replace(field, '$1：$2');
    if (section.name === '风险评分') {
      line = line.replace(/^●\s*/, '');
      const score = line.match(/^(.*?)\s*[:：]?\s+(\d+(?:\.\d+)?%?)\s*·?\s*(极高风险|高风险|中风险|低风险|建议封禁|存在风险|可疑)(.*)$/);
      if (score) {
        const color = score[3] === '低风险' ? '🟢' : /中风险|可疑/.test(score[3]) ? '🟠' : '🔴';
        line = `${color} ${score[1].replace(/[：:]$/,'')}：${score[2]} · ${score[3]}${score[4]}`;
      } else if (/未返回|未知|未确认/.test(line)) line = '⚪ '+line;
    } else if (section.name === '风险因素') {
      const flags = line.split(' · ').map(item=>item.match(/^([^：]+)：(未命中|命中|未知)$/));
      if (flags.length && flags.every(Boolean)) {
        for (const [state,prefix] of [['命中','  ⚠ 命中：'],['未命中','  ✓ 未命中：'],['未知','  ? 未知：']]) {
          const labels=flags.filter(item=>item[2]===state).map(item=>item[1]);
          if(labels.length)section.lines.push(prefix+labels.join('、'));
        }
        continue;
      }
      line = line.replace(/^未命中\s+/, '  ✓ 未命中：').replace(/^命中\s+/, '  ⚠ 命中：');
    }
    if (section.name === 'IP 类型属性') {
      const row = line.match(/^(IP2Location|IPinfo|AbuseIPDB)\s+(.+)$/);
      if (row) {
        const values=row[2].split(' / ');
        section.lines.push(row[1], '  使用：'+values[0]);
        if(values.length>1)section.lines.push('  公司：'+values.slice(1).join(' / '));
        continue;
      }
    }
    if (section.name === '检测说明') line=line.replace(/。(?=.)/g,'。\n');
    if (/^(使用|公司)：/.test(line)) line = '  '+line;
    section.lines.push(line);
  }
  const header = ['策略：'+metadata.policy];
  if (metadata.time) {
    const date = new Date(metadata.time);
    if (Number.isFinite(date.getTime())) {
      const pad = n=>String(n).padStart(2,'0');
      header.push(`检测时间：${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`);
    }
  }
  return header.join('\n')+'\n\n'+sections.filter(s=>s.lines.length).map(s=>{
    const rows=[];
    s.lines.forEach((line,i)=>{
      // Keep each provider with its detail lines; separate subsequent providers.
      if (i && /IP 类型属性|风险因素/.test(s.name) && !line.startsWith('  ') && !/^命中|未命中|代理：|VPN：|Tor：|未返回/.test(line) && /^(?:IPinfo|IP2Location|IPQS|ipapi|ipregistry|ipdata|ipwhois|proxycheck|AbuseIPDB|Scamalytics|DB-IP|IPPure)(?:\s|：|$)/.test(line)) rows.push('');
      rows.push(line);
    });
    return '▌'+s.name+'\n'+rows.join('\n');
  }).join('\n\n');
}
