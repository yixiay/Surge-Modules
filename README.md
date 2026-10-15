# Surge Modules

适用于 Surge Mac / iPhone 的网络诊断模块。策略组名称在模块「编辑参数」中设置，默认 `✈️ 我的节点（所有订阅）`。

## 安装入口

| 模块 | 功能 | 安装 |
|---|---|---|
| MaYIHEI 基础移植版 | IP 类型、多库风险、风险因素，可选流媒体 | [module.sgmodule](https://raw.githubusercontent.com/yixiay/Surge-Modules/main/modules/network-diagnostics/ipquality-mayihei/module.sgmodule) |
| Web 扩展版（推荐） | 上述数据 + BGP、BGP 路径、三网 Globalping、入站路径、MTR、HTTPS 稳定性与轻量测速 | [module.sgmodule](https://raw.githubusercontent.com/yixiay/Surge-Modules/main/modules/network-diagnostics/ipquality-web/module.sgmodule) |
| xykt 五库数据版 | 按 xykt 字段/阈值查询 IP2Location、Scamalytics、IPQS、IPinfo、AbuseIPDB | [module.sgmodule](https://raw.githubusercontent.com/yixiay/Surge-Modules/main/modules/network-diagnostics/ipquality-xykt/module.sgmodule) |

原 `modules/network-diagnostics/ippure/ippure.sgmodule` 已移除。请在 Surge 中移除旧模块后，添加上述入口。无需同时安装三份；查看详细报告推荐 Web 扩展版。

## 如何查看彩色报告

1. 安装并启用模块，确认 Surge 的脚本功能已开启；Mac 使用系统代理或增强模式，iPhone 启用 Surge。
2. 在 `policy_group` 填写本机现有节点或策略组的完整名称。空值回退到默认组；错误名称不会自动换成其他组。名称暂不支持 `&`、双引号、换行。
3. 浏览器打开对应地址：

| 模块 | 本机报告页 |
|---|---|
| 基础版 | `http://ipquality.surge.local/mayihei` |
| Web 扩展版 | `http://ipquality.surge.local/web` |
| xykt 数据版 | `http://ipquality.surge.local/xykt` |

4. 点击检测按钮，等待最多约 50 秒。页面为 Surge 在本机拦截生成的 HTML；需要保留 `http://`。无需 MITM 或额外安装服务器。

Surge 原生面板显示摘要。手动刷新面板也能生成总览，并通过通知提供报告入口。自动面板刷新只读缓存；GET 打开报告页也只读最近缓存，只有按钮 POST 才发起新的检测。

## 功能边界

- 目标通过 `policy` 显式传给 Surge。显示的策略名不冒充具体子节点；Smart/负载均衡组可能对不同目标选择不同出口，上游多出口检测保留此差异。
- 评分是第三方数据库观点，各库独立展示，缺数据为未知，不合成「绝对纯净度」。
- Globalping 从外部中国运营商探针测量到出口 IP，不代表手机到节点隧道或机场真实回程。ICMP 不回应、探针缺货、限流会显示未完成。
- HTTPS 测速通过所选策略访问 Cloudflare，最多约 2 MB，结果是小样本端到端估算，不是线路带宽。
- 查询会将出口 IP 发送至第三方；Mask IP 只隐藏报告显示。聚合接口可能返回 403/429，不绕过授权、不把失败当低风险。
- 不实现 VPS 原生 SMTP、DNSBL、全套双栈检测。xykt 版仅移植五库类型、分数和因素，不是完整 Bash 运行器。
- 浏览器没有经过 Surge、被强制升级 HTTPS、停用脚本或模块时，报告页不可访问。

## 兼容与验证

建议 Surge iOS 5.9+ / Mac 5.7.5+；iPhone 需具备面板功能权益。使用跨平台脚本 API；Mac 已做真实脚本与 HTML 响应测试，iPhone 仍需设备端安装验收。

```sh
npm run build
npm test
npm run validate:module  # 本机 Surge CLI LSP
# 主动检测，结果只保存在 gitignored .verification/
node scripts/live-check.js web bgp
```

源码在 `src/`，上游快照在 `vendor/`，`report.js` 由构建生成；运行时不下载并 eval 上游代码。来源与许可见 [NOTICE.md](NOTICE.md)。
