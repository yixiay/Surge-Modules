# MaYIHEI IPQuality · Surge 移植

合并 MaYIHEI/paperclip 与 BOBOLAOSHIV587/Rules/Loon/IPQuality 相同的 r8 脚本。

安装本目录 module.sgmodule，编辑 policy_group，打开 **http://ipquality.surge.local/mayihei**，点击「IP 质量总览」。

`mask_ip=true` 隐藏报告 IP；`media_test=true` 开启流媒体检测（默认 false）。

保留原多源数据和 HTML 报告。Surge 适配转换超时单位和策略字段；上游 DIRECT 元数据请求保留，出口探测经过指定策略。详见仓库 README 与 NOTICE。
