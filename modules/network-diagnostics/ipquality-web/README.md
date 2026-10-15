# IPQuality Web 扩展 · Surge 移植

基于 BOBOLAOSHIV587/Rules/Loon/IPQuality-Web 固定引用的 MaYIHEI r32 以及独立 HTTPS 轻量测速代码。

安装本目录 module.sgmodule，编辑 policy_group，打开 **http://ipquality.surge.local/web**。

按钮包括：总览、基础信息、IP 类型、评分、风险因素、出口分流、BGP、BGP 路径、入站路径、三网 Globalping、MTR、HTTPS 稳定性、轻量测速、流媒体与 AI、地区一致性、数据状态。

每次按钮独立执行并替换最近缓存。请等待一项完成再点击下一项，减少限流。媒体检测由页面按钮触发。

三网探针筛选为 AS4134 / AS4837 / AS9808 中国探针，测量目标是节点公网出口，不是手机到节点。MTR 单跳不回应不等于业务丢包。BGP 为 RIPEstat 控制面；HTTPS 测速到 Cloudflare 最多约 2 MB。
