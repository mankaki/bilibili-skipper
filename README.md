# bilibili-skipper
B站自动跳片头片尾脚本

现在是 v2.1，支持普通页面和新版 Web Components 播放器。

功能：
1. 按 `Shift + M` 设置片头时间和片尾时长，支持 `mm:ss`、秒数和中文冒号 `：`。
2. 按 `O` 键开启/关闭自动跳转，会记住上一次设置和开关状态。
3. 支持 `video`、`bangumi/play`、`list` 页面。
4. 兼容 Shadow DOM 播放器、原生全屏提示浮层、SPA 切换后的播放器重建。

安装方式：
1. 前提：已安装 Tampermonkey、Violentmonkey 或其他支持用户脚本的扩展。
2. 方法一：点击链接直接安装：https://raw.githubusercontent.com/mankaki/bilibili-skipper/main/bili_skipper.user.js
3. 方法二：通过 Greasy Fork 安装：https://greasyfork.org/zh-CN/scripts/539778-b%E7%AB%99%E8%87%AA%E5%8A%A8%E8%B7%B3%E7%89%87%E5%A4%B4%E7%89%87%E5%B0%BE
