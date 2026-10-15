// Shared Surge transport and report shell. Built files are self-contained.
(function () {
  const flavor = '__FLAVOR__';
  const title = '__TITLE__';
  const base = 'http://ipquality.surge.local/' + flavor;
  const raw = typeof $argument === 'string' ? $argument : '';
  const options = {};
  raw.split('&').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0) options[part.slice(0, i)] = part.slice(i + 1);
  });
  const configured = (options.policy || '').trim();
  const policy = configured && !configured.includes('{{{') ? configured : '✈️ 我的节点（所有订阅）';
  const mask = options.mask === 'true';
  const media = options.media === 'true';
  const cacheKey = 'ipquality.' + flavor + '.' + encodeURIComponent(policy) + '.' + mask;
  const nativeClient = $httpClient;
  const nativeDone = $done;
  const nativeStore = $persistentStore;
  const request = typeof $request === 'object' ? $request : null;
  let done = false;
  let active = 0;
  const queue = [];
  const deadline = Date.now() + 47000;
  const modules = {
    all: ['IP 质量总览', ['显示基础信息', '显示 IP 类型', '显示风险评分', '显示风险因素', '显示数据状态']],
    basic: ['基础信息', ['显示基础信息']], types: ['IP 类型', ['显示 IP 类型']],
    scores: ['风险评分', ['显示风险评分']], factors: ['风险因素', ['显示风险因素']],
    egress: ['出口分流', ['显示出口分流']], bgp: ['BGP 信息', ['显示 BGP 信息']],
    bgppath: ['BGP 路径', ['显示 BGP 信息', '显示目标前缀 BGP 路径']],
    inbound: ['外部探针入站路径', ['测试外部探针入站路径']],
    ping: ['三网 Globalping', ['测试外部探针 Ping']], mtr: ['外部探针 MTR', ['测试外部探针 MTR']],
    stability: ['HTTPS 稳定性', ['测试 HTTPS 稳定性']], speed: ['HTTPS 轻量测速', []],
    media: ['流媒体与 AI', ['执行媒体与 AI 检测', '显示媒体与 AI 结果']],
    regions: ['地区一致性', ['执行媒体与 AI 检测', '显示地区一致性']], status: ['数据状态', ['显示数据状态']]
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const choices = flavor === 'web' ? Object.keys(modules) : ['all'];
  function shell(content) {
    const forms = choices.map(key => `<button name="unused" type="submit" formaction="${base}/${key}">${esc(modules[key][0])}</button>`).join('');
    const probeNote = flavor === 'web' ? '测速约使用 2 MB；探针测量由 Globalping 从外部发往出口 IP。' : '';
    return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title>' +
      '<style>body{font:16px/1.65 -apple-system,BlinkMacSystemFont,sans-serif;background:#f2f3f7;color:#222;margin:0;padding:20px}main{max-width:760px;margin:auto;background:white;padding:24px;border-radius:22px}h1{font-size:24px}h2{font-size:19px;color:#087cf0}button{background:#087cf0;color:white;border:0;border-radius:9px;padding:10px;margin:4px;cursor:pointer}.note{color:#777;font-size:13px}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:9px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}.good{color:#00a878}.warn{color:#d78900}.bad{color:#d23f46}summary{cursor:pointer}</style>' +
      `<main><h1>${esc(title)}</h1><p>检测策略：${esc(policy)}</p><form method="post">${forms}</form><p class="note">点击后等待本项报告（最多约 50 秒）。${probeNote}打开报告页仅查看最近缓存。IP 元数据会发送给各查询服务。</p>${content}<p class="note">数据仅供参考；缺失不等于低风险。<a href="https://github.com/yixiay/Surge-Modules">源代码与许可</a></p></main></html>`;
  }
  function respond(content, status = 200) {
    if (done) return;
    done = true;
    nativeDone({response:{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"},body:shell(content)}});
  }
  function cached() {
    try { return JSON.parse(nativeStore.read(cacheKey) || 'null'); } catch (_) { return null; }
  }
  function reportText(html) {
    const entities = {nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    return String(html || '')
      .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(td|th)>/gi, '\t')
      .replace(/<\/(span|b|strong)>/gi, ' ')
      .replace(/<h[1-6]\b[^>]*>/gi, '\n\n')
      .replace(/<\/(div|p|li|tr|section|details|summary|h[1-6]|pre)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&(#x[0-9a-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi, (whole, key) => {
        if (key[0] !== '#') return entities[key.toLowerCase()];
        const point = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
        return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : whole;
      })
      .split('\n').map(line => line.replace(/[ \t\r]+/g, ' ').trim()).join('\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }
  function panelContent(previous) {
    // Old caches contain full HTML even though their summary was truncated.
    const text = previous.html ? reportText(previous.html) : previous.text || previous.summary || '';
    return text + '\n\n详细报告：' + base;
  }
  let action = 'all';
  if (request) {
    const match = String(request.url).match(/^http:\/\/ipquality\.surge\.local\/(mayihei|web|xykt)(?:\/([a-z]+))?\/?(?:\?.*)?$/);
    if (!match || match[1] !== flavor || !choices.includes(match[2] || 'all')) { respond('<p>未知检测项目</p>', 404); return; }
    action = match[2] || 'all';
    if (request.method === 'GET') {
      const previous = cached();
      respond(previous ? `<p class="note">缓存报告：${esc(previous.time)}</p>${previous.html}` : '<p>选择上方项目开始检测。</p>');
      return;
    }
    const headers = request.headers || {};
    const originKey = Object.keys(headers).find(key => key.toLowerCase() === 'origin');
    if (request.method !== 'POST' || (originKey && headers[originKey] !== 'http://ipquality.surge.local')) {
      respond('<p>请从报告页面手动开始检测。</p>', 403); return;
    }
  } else if (typeof $trigger !== 'undefined' && $trigger === 'auto-interval') {
    const previous = cached();
    nativeDone({title,content: previous ? panelContent(previous) : '打开报告并选择检测项目\n' + base,icon:'shield.lefthalf.filled'});
    return;
  }
  function finish(result) {
    if (done) return;
    let html = result && result.htmlMessage;
    if (result && result.response) {
      try { const data = JSON.parse(result.response.body); html = data.html || `<p>${esc(data.error || '未完成')}</p>`; } catch (_) {}
    }
    if (!html) html = `<p class="bad">${esc(result && result.content || '检测未完成')}</p>`;
    html = html.replace(/Loon 不提供节点 TCP\/DNS API/g, '此 Surge 移植版未实现 TCP/DNS 原始探测');
    const text = reportText(html);
    const time = new Date().toISOString();
    if (html.length < 500000) nativeStore.write(JSON.stringify({html,text,time}), cacheKey);
    if (request) { respond(`<p class="note">本次检测：${esc(time)} · ${esc(modules[action][0])}</p>${html}`); return; }
    done = true;
    if (typeof $trigger !== 'undefined' && $trigger === 'button') {
      $notification.post(title, '报告已生成', base, {url:base});
    }
    nativeDone({title,content:panelContent({text}),icon:'shield.lefthalf.filled'});
  }
  // Loon uses node and millisecond timeouts; Surge uses policy and seconds.
  function transport(method, supplied, callback) {
    queue.push({method, supplied, callback}); pump();
  }
  function pump() {
    while (!done && active < 6 && queue.length) {
      const job = queue.shift();
      if (Date.now() >= deadline) { job.callback('整体检测时限已到', null, null); continue; }
      const opts = typeof job.supplied === 'string' ? {url:job.supplied} : Object.assign({}, job.supplied);
      opts.policy = opts.node || policy;
      delete opts.node; delete opts.alpn;
      opts.timeout = Math.max(0.25, Math.min(Number(opts.timeout || 6000) / 1000, (deadline - Date.now()) / 1000));
      active++;
      try {
        nativeClient[job.method](opts, (error, response, body) => {
          active--;
          if (!done) job.callback(error, response, body);
          pump();
        });
      } catch (error) { active--; job.callback(String(error), null, null); }
    }
  }
  const client = {get:(o,c)=>transport('get',o,c),post:(o,c)=>transport('post',o,c)};
  const switches = {
    read(key) {
      if (key === 'MaskIP' || key === '隐藏 IP') return String(mask);
      if (key === 'MapNotification' || key === '地图通知') return 'false';
      if (key === 'MediaTest') return String(media);
      if (key === 'paperclip.ipquality.web.session') return JSON.stringify({id:'local',node:policy,createdAt:Date.now()});
      return String((modules[action][1] || []).includes(key));
    }, write:()=>false
  };
  setTimeout(() => finish({content:'检测超时；请分项重试并查看 Surge 脚本日志。'}), 49000);
  if (flavor === 'xykt') { runXykt({client, policy, mask, esc, finish}); return; }
  if (flavor === 'web' && action === 'speed') {
    runSpeed(finish, switches, {url:base + '/speed?run=local'}, client); return;
  }
  runLoon(finish, switches, {params:{node:policy}}, client);
})();
