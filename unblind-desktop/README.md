# Unblind Desktop

浙大盲审结果监控桌面应用。使用 Wails + Go + React 构建，替代原 Python/Selenium 脚本，无需额外安装 Python 或浏览器驱动。

## 功能

- **系统浏览器模式**：优先复用已安装的 Chrome / Edge，无需下载额外内核
- **内核下载模式**：系统无可用浏览器时，可在应用内一键下载 Chromium 内核（含进度显示）
- **手动登录 + 会话持久化**：浏览器窗口内手动完成 CAS 登录，会话自动保存复用
- **可选自动填充**：开启后自动填入账号密码，支持系统密钥链安全存储
- **定时监控**：可配置轮询间隔，定时刷新盲审结果页
- **变化检测**：对提取结果做哈希比较，仅在结果发生变化时触发通知
- **Bark 推送**：支持自定义 Bark 服务地址，内置连通性测试
- **结果历史**：保存历史快照，可查看历次解析结果
- **诊断导出**：一键导出脱敏诊断报告，便于排查问题

## 前置要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Go | 1.26+ | 后端编译 |
| Wails CLI | v2.11+ | 项目构建与开发 |
| Node.js | 18+ | 前端依赖 |

安装 Wails：

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

验证环境：

```bash
wails doctor
```

## 开发

在 `unblind-desktop/` 目录下运行：

```bash
wails dev
```

这会同时启动 Go 后端和 Vite 开发服务器，前端修改热更新。也可以在浏览器访问 `http://localhost:34115` 直接调试前端（Go 方法可通过 devtools 调用）。

## 构建

```bash
wails build
```

产物路径：`build/bin/unblind-desktop`（macOS 为 `.app`，Windows 为 `.exe`）。

## 首次使用流程

1. 启动应用后进入**仪表盘**，查看当前状态
2. 切换到**通知设置**，填入 Bark 服务地址并点击"发送测试通知"验证
3. 切换到**登录与浏览器**，点击"打开登录窗口"，在弹出浏览器中手动完成浙大 CAS 登录
4. 登录成功后应用自动保存会话，状态变为"就绪"
5. 在**仪表盘**点击"开始监控"即可

## 日常使用

- 应用记忆上次会话，再次启动后如会话仍有效可直接开始监控
- 会话失效时仪表盘会显示告警，点击"重新登录"重走登录流程
- 可在**设置**页调整轮询间隔（默认 5 分钟）

## 数据目录

应用数据存储在：

| 平台 | 路径 |
|------|------|
| macOS | `~/.unblind/` |
| Windows | `%APPDATA%\unblind\` |
| Linux | `~/.unblind/` |

目录内容：

```
~/.unblind/
├── config.json         # 应用配置
├── results.json        # 结果历史
├── session.json        # 会话状态
└── chrome-profile/     # chromedp 使用的浏览器 profile
```

## 已知问题

### Chrome SingletonLock 残留

若应用因异常退出导致 Chrome 进程未被正确清理，下次启动登录流程时 Chrome 可能打印 "Opening in existing browser session." 后立即退出。

应用已在启动浏览器前自动处理此问题（读取锁文件中的 PID 并 kill，然后删除所有 `Singleton*` 文件）。如仍遇到问题，可手动删除：

```bash
rm -f ~/.unblind/chrome-profile/Singleton*
```

### Bark URL 末尾斜杠

Bark 服务地址末尾有无斜杠均可正常工作，应用会自动处理。

## 技术栈

- **后端**：Go 1.26、[Wails v2](https://wails.io)、[chromedp](https://github.com/chromedp/chromedp)、[go-keyring](https://github.com/zalando/go-keyring)
- **前端**：React 18、Vite、TypeScript、Tailwind CSS v3、shadcn/ui

## 项目结构

```
unblind-desktop/
├── app.go                  # Wails 暴露给前端的所有 API
├── main.go                 # 入口
├── internal/
│   ├── appstate/           # 应用状态机
│   ├── config/             # 配置读写
│   ├── browser/            # 浏览器探测与内核下载
│   ├── auth/               # 登录、会话持久化（含 SingletonLock 处理）
│   ├── credentials/        # 系统密钥链凭据存储
│   ├── monitor/            # 轮询调度与变化检测
│   ├── parser/             # 盲审页面 DOM 解析
│   ├── notify/             # Bark 通知发送
│   ├── storage/            # 结果持久化
│   └── diagnostics/        # 诊断报告生成
└── frontend/
    └── src/
        ├── pages/          # 5 个一级页面
        └── components/ui/  # shadcn/ui 组件
```
