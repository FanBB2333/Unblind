# Unblind

浙大盲审结果监控工具。自动登录研究生系统，定时检查盲审结果，结果变化时通过 Bark 推送通知。

## 目录结构

```
Unblind/
├── unblind-desktop/        # 桌面应用（主项目）
│   ├── internal/           # Go 后端模块
│   └── frontend/           # React/Vite/TS 前端
├── HereComesTheGoodNews.py # 原始 Python/Selenium 脚本（已归档）
└── docs/                   # 设计文档与实施计划
```

## 使用桌面应用

请参阅 [unblind-desktop/README.md](unblind-desktop/README.md)。

## 技术栈

- **后端**：Go 1.26 + Wails v2 + chromedp
- **前端**：React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **通知**：Bark
- **凭据存储**：系统密钥链（macOS Keychain / Windows Credential Manager / Linux Secret Service）
