# Verification — 2026-10-15

- 19 个 Node VM 行为测试：策略绑定、毫秒到秒转换、GET/自动刷新不联网、POST HTML、BGP/Ping/MTR/入站/测速分派、空评分、IP 不一致、HTML 转义、错误路径。
- 三个 `.sgmodule` 均通过本机 Surge LSP 诊断。
- Surge Mac 真实执行：基础版与 Web 总览均输出报告；IPAPI 超时和聚合接口 429 如实保留。
- xykt 版按上游 curl User-Agent 查询后，IP2Location、Scamalytics、IPQS、IPinfo、AbuseIPDB 五库均返回所需数据；各源结果不同，未计算综合分。
- Web BGP：真实返回前缀、Origin ASN、持有者、RPKI。
- Web Ping：三家运营商 Globalping 探针均返回 RTT/丢包/抖动。
- Web MTR：移动探针到达并返回 22 跳，其他两探针本次未确认到达。
- 入站 traceroute：返回探针状态/跳数，未把 in-progress 当作到达。
- HTTPS 测速：小样本下载/上传可用，大样本上传超时如实呈现。
- 浏览器渲染真实 HTML 输出，390px 视口宽度等于内容宽度，没有横向溢出。

真实报告只保存在本机 `.verification/`，不提交出口 IP、测量 ID 或个人运行日志。测试未安装模块到当前 Surge 配置；HTTP 路由通过脚本响应和 VM 契约验证。iPhone 与最终浏览器经 Surge 拦截的整条交互链仍需安装验收，不能把 Mac/模拟结果视为手机实测。
