# Sources and licenses

## 基础移植版

- MaYIHEI/paperclip `77e0d57c54ba6dfeb26ed9b625133cf4a211c9b8`, `loon/ipquality/ipquality.js` (r8).
- BOBOLAOSHIV587/Rules `46089bba4d211578e4e7c663164cae6e2bb5f2a8`, `Loon/IPQuality/JS/IPQuality.js`.
- 两文件 SHA-256 都为 `842c35e0d13500f092c88279561b6deea235b9abe95cab13e9444a97cc070c7f`，合并为一个入口。
- 原始快照、版权与引用保留于 `vendor/mayihei`，MIT 条款见该目录 LICENSE。

## Web 扩展版

- 入口来自 BOBOLAOSHIV587/Rules 上述提交 `Loon/IPQuality-Web/JS/IPQuality-Web-Module.js`。
- 其固定引用的 MaYIHEI/paperclip `eaa04fe0a9f37ccfafdd11930d28fd5ff3f04718` / `loon/ipquality/ipquality.js` (r32) 已保存在 `vendor/paperclip-r32`。
- HTTPS 测速来自 BOBOLAOSHIV587/Rules 上述提交的 `Loon/IPQuality-Web/JS/IPQuality-Speed.js`，原文件作者为 MaYIHEI，保存在 `vendor/bobo-web`。
- MaYIHEI MIT 条款见 `vendor/mayihei/LICENSE`，BOBOLAOSHIV587 MIT 条款见 `vendor/bobo-web/LICENSE`。
- 适配包括 node→policy、毫秒→秒、并发/总时间上限、参数开关映射、本机 HTML 响应、缓存、手动检测按钮；403 授权拒绝不重试。

## xykt 五库数据版

- 来源：<https://github.com/xykt/IPQuality/blob/87397e2c3196ec796f5477c83343c2354df601ea/ip.sh> (v2026-09-16)。
- `src/xykt.js` 按 `db_ipinfo`、`db_scamalytics`、`db_abuseipdb`、`db_ip2location`、`db_ipqs` 的字段和阈值改编。
- 该派生源码及 `modules/network-diagnostics/ipquality-xykt/report.js` 按 AGPL-3.0-or-later 提供，完整条款在模块目录 LICENSE；对应源代码与构建脚本均包含于本仓库。
- 独立的共享适配层和仓库辅助代码使用根目录 MIT；根目录许可不覆盖上游/AGPL 文件的条款。
