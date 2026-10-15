# IPPure 节点纯净度（策略组参数版）

检测指定 Surge 策略组当前节点的 IP 纯净度、IP 类型、地理位置和 API 请求延迟。

## 兼容性

- Surge iOS 5.9.0+
- Surge Mac 5.5.0+

这两个版本开始支持模块参数表。

## 安装

在 Surge 中安装以下模块地址：

```text
https://raw.githubusercontent.com/yixiay/Surge-Modules/main/modules/network-diagnostics/ippure/ippure.sgmodule
```

安装或编辑模块参数时，在 `policy_group` 中填写需要检测的策略组名称。

默认值：

```text
✈️ 我的节点（所有订阅）
```

留空时也会回退到默认策略组。

## 工作方式

1. 读取参数指定的策略组。
2. 获取该策略组当前选择的节点；如果无法读取，直接使用策略组本身。
3. 通过该节点请求 `https://my.ippure.com/v1/info`。
4. 在 Surge 面板中显示纯净度、类型、位置和请求延迟。

模块每小时自动刷新，也可在面板中手动刷新。

## 来源与许可

本目录基于 [`5jwoj/Surge`](https://github.com/5jwoj/Surge/tree/main/ippure) 的 IPPure 模块修改，保留原模块作者字段。上游 README 声明采用 MIT License。
