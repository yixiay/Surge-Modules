# xykt IPQuality 五库数据 · Surge JavaScript 版

按 xykt/IPQuality v2026-09-16 的五库类型、分数和风险因素移植。安装 module.sgmodule，编辑 policy_group，打开 **http://ipquality.surge.local/xykt**。

| 来源 | 风险阈值 | 接口 |
|---|---|---|
| IP2Location | 33 / 66 | ipinfo.check.place 聚合 |
| Scamalytics | 20 / 60 / 90 | ipinfo.check.place 聚合 |
| IPQS | 75 / 85 / 90 | ipinfo.check.place 聚合 |
| IPinfo | 无数值分，仅类型/风险标记 | IPinfo demo |
| AbuseIPDB | 25 / 75 | ipinfo.check.place 聚合 |

null、缺字段、接口错误、目标 IP 不一致均为未知。部分字段返回时仅展示已有证据。仅策略 IPv4 出口，不含媒体、SMTP、DNSBL 或 IPv6。

report.js 与 src/xykt.js 使用 AGPL-3.0-or-later，条款见 LICENSE；源码和构建脚本包含于仓库。
