# Unblind

浙大盲审结果监控工具。自动登录研究生系统，定时检查盲审结果，结果变化时通过 Bark 推送通知。

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

### 通用

在 `unblind-desktop/` 目录下运行：

```bash
wails build
```

产物路径：`build/bin/unblind-desktop`（macOS 为 `.app`，Windows 为 `.exe`）。

---

### macOS

**额外前置要求**

```bash
xcode-select --install   # 安装 Xcode Command Line Tools
```

**移除 Gatekeeper 隔离属性（必须）**

macOS 会对本地编译的未公证应用打上隔离标记，直接双击会提示"无法打开"。构建完成后执行：

```bash
xattr -cr build/bin/unblind-desktop.app
```

> **提示**：应用内置的 Chromium 内核下载功能在完成解压后会自动执行相同的 `xattr -cr` 操作。

---

### Windows

**额外前置要求**

- **WebView2 Runtime**：Windows 11 已内置；Windows 10 需手动安装，可从 [Microsoft 官网](https://developer.microsoft.com/microsoft-edge/webview2/) 下载。
- **NSIS**（可选，用于打包安装程序）：从 [nsis.sourceforge.io](https://nsis.sourceforge.io/Download) 安装后，构建时加上 `-nsis` 参数。

```bash
wails build          # 仅可执行文件
wails build -nsis    # 含安装向导的安装包（可选）
```

## 首次使用流程

1. 启动应用后进入**仪表盘**，查看当前状态
2. 切换到**通知设置**，填入 Bark 服务地址并点击"发送测试通知"验证
3. 切换到**登录与浏览器**，点击"打开登录窗口"，在弹出浏览器中手动完成浙大 CAS 登录
4. 登录成功后应用自动保存会话，状态变为"就绪"
5. 在**仪表盘**点击"开始监控"即可

## 数据目录

| 平台 | 路径 |
|------|------|
| macOS | `~/.unblind/`（bundle 内置时为 `<app>.app/Contents/data/`） |
| Windows | `%APPDATA%\unblind\` |
| Linux | `~/.unblind/` |

## 已知问题

### Chrome SingletonLock 残留

若应用异常退出导致 Chrome 进程未被正确清理，下次启动时可能打印 "Opening in existing browser session." 后退出。应用已在启动前自动处理此问题，如仍遇到问题可手动清除：

```bash
rm -f ~/.unblind/chrome-profile/Singleton*
```

### Bark URL 末尾斜杠

Bark 服务地址末尾有无斜杠均可正常工作，应用会自动处理。

## 技术栈

- **后端**：Go 1.26 + Wails v2 + chromedp
- **前端**：React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **通知**：Bark
- **凭据存储**：AES-256-GCM 加密文件，密钥派生自硬件 UUID

## 目录结构

```
Unblind/
├── unblind-desktop/        # 桌面应用（主项目）
│   ├── app.go              # Wails 暴露给前端的所有 API
│   ├── main.go             # 入口
│   ├── internal/           # Go 后端模块
│   │   ├── appstate/       # 应用状态机
│   │   ├── config/         # 配置读写
│   │   ├── browser/        # 浏览器探测与内核下载
│   │   ├── auth/           # 登录、会话持久化
│   │   ├── credentials/    # 凭据加密存储
│   │   ├── monitor/        # 轮询调度与变化检测
│   │   ├── parser/         # 盲审页面 DOM 解析
│   │   ├── notify/         # Bark 通知发送
│   │   ├── storage/        # 结果持久化
│   │   └── diagnostics/    # 诊断报告生成
│   └── frontend/           # React/Vite/TS 前端
│       └── src/
│           ├── pages/      # 5 个一级页面
│           └── components/ # shadcn/ui 组件
├── HereComesTheGoodNews.py # 原始 Python/Selenium 脚本（已归档）
└── docs/                   # 设计文档与实施计划
```
