# Unblind Desktop 设计方案

## 1. 背景与目标

当前仓库中的 [HereComesTheGoodNews.py](/Users/l1ght/repos/Unblind/HereComesTheGoodNews.py) 是一个基于 Python + Selenium 的盲审结果监控脚本，核心能力包括：

- 登录浙大研究生系统并进入盲审结果页面
- 定时刷新页面并提取评审结果
- 对结果做哈希比较，检测是否发生变化
- 在结果变化时通过 Bark 发送通知
- 持久化 cookies 和上次结果缓存

这套方案已经能完成基本任务，但在桌面端使用上存在明显问题：

- 依赖 Python、Selenium、浏览器驱动等额外环境
- 非开发者用户启动门槛高
- 交互主要依赖命令行，状态不够直观
- 会话、通知、日志、错误恢复缺少统一界面
- 跨平台分发不友好

本设计目标是做一个 `HereComesTheGoodNews.py` 的 refine 版本，使用 `Go + Wails` 构建跨平台桌面应用，并采用 `React + Vite + TypeScript + shadcn/ui` 设计整套 GUI。

## 2. 范围与约束

### 2.1 本期范围

本期产品只服务当前浙大盲审结果监控场景，不扩展成通用网页监控器。

### 2.2 已确认的产品边界

- 浏览器模式同时支持：
  - `A`：默认使用系统已安装浏览器
  - `C`：用户手动选择后，首次下载浏览器内核
- 登录方式同时支持：
  - 默认手动登录并保存会话
  - 可选保存账号密码并自动填充
- 通知方式：
  - 默认保留 Bark
  - 系统桌面通知作为可选项
- 主要操作应在 GUI 完成
- 尽量减少自动化相关依赖，避免用户额外安装过多包

### 2.3 非目标

- 不在本期支持多站点、多任务模板
- 不追求首版完全自动登录
- 不依赖 Python 运行时或 Selenium/WebDriver 生态

## 3. 方案选型

### 3.1 备选方案

#### 方案一：Wails + Go(chromedp) + React/Vite/TS/shadcn

优点：

- 不再依赖 Python、Selenium、webdriver
- 跨平台打包更直接
- 默认模式 A 可以直接复用系统已安装 Chrome/Edge
- 更符合“少装依赖”的目标

缺点：

- 浏览器内核下载与管理需要自行实现一层封装
- 会话恢复、页面兼容性处理要自己维护

#### 方案二：Wails + Playwright sidecar + React/Vite/TS/shadcn

优点：

- 自动化能力更完整
- 浏览器管理和兼容性更成熟

缺点：

- 运行时和浏览器包通常更重
- 不符合“尽量减少自动化包”的目标

#### 方案三：Wails 前端壳 + 复用现有 Python/Selenium 核心

优点：

- 迁移速度快

缺点：

- Python、Selenium、驱动问题仍然存在
- 桌面端只是换壳，维护价值有限

### 3.2 推荐方案

采用 `Wails + Go(chromedp) + React + Vite + TypeScript + shadcn/ui`。

原因：

- 能最大限度降低用户安装门槛
- 能自然支持默认模式 A 和增强模式 C
- 桌面端架构清晰，便于后续维护
- 可以把当前脚本的业务逻辑拆成独立模块，而不是继续堆在单文件脚本里

## 4. 总体架构

### 4.1 分层结构

系统分为四层：

1. 前端界面层
2. Wails 桥接层
3. Go 后端服务层
4. 浏览器自动化执行层

### 4.2 各层职责

#### 前端界面层

使用 `React + Vite + TypeScript + shadcn/ui`，负责：

- 向导式配置
- 登录引导
- 监控状态展示
- 结果查看
- 日志与设置管理

#### Wails 桥接层

负责将 Go 后端命令暴露给前端，同时把后端事件推送到前端，例如：

- 状态变化
- 登录成功检测
- 轮询进度
- 结果更新
- 下载进度
- 错误信息

#### Go 后端服务层

负责：

- 配置管理
- 浏览器探测与启动
- 登录与会话恢复
- 轮询调度
- DOM 解析
- 结果比对
- 通知发送
- 日志与诊断

#### 浏览器自动化执行层

使用 `chromedp` 驱动 Chromium/Chrome/Edge，完成：

- 打开登录页面
- 检测目标页面
- 执行自动填充
- 读取 DOM
- 提取评审信息

### 4.3 核心数据流

1. 用户在 GUI 中完成配置
2. 前端通过 Wails 调用后端启动登录或监控流程
3. 浏览器层建立会话并进入目标页面
4. `parser` 提取结果并标准化
5. `monitor` 负责定时轮询和变化检测
6. `storage` 保存快照与会话
7. `notify` 在结果变化时发送 Bark
8. Wails 事件将状态和结果同步回前端

## 5. 浏览器模式设计

### 5.1 模式 A：系统已安装浏览器

这是默认模式。

特点：

- 优先探测用户机器已安装的 Chrome/Edge/Chromium
- 不自动下载浏览器内核
- 启动成本最低
- 安装包更轻

实现原则：

- 应用只接管浏览器自动化控制，不直接污染用户日常浏览器 profile
- 为应用创建单独的用户数据目录
- 启动前校验浏览器路径是否可用

### 5.2 模式 C：手动下载浏览器内核

这是增强模式，不自动启用，只有用户在 GUI 中主动选择并点击下载时才启用。

特点：

- 适合系统没有可用浏览器，或用户希望运行环境更稳定的场景
- 首次下载成本较高
- 后续使用体验更稳定

实现原则：

- 下载流程必须显式触发
- 需要可视化展示下载进度、失败原因和重试入口
- 下载后的内核路径和版本信息需要纳入配置管理

### 5.3 浏览器探测策略

按平台实现：

- macOS：探测 `/Applications` 中常见 Chrome/Edge 安装位置
- Windows：探测注册表与常见安装目录
- Linux：探测 PATH 中的 `google-chrome`、`chromium`、`microsoft-edge` 等命令

GUI 中需要明确显示：

- 当前运行模式
- 当前使用的浏览器路径
- 浏览器来源是“系统浏览器”还是“已下载内核”
- 浏览器检测结果列表

## 6. 登录、会话与凭据设计

### 6.1 默认登录流程

默认采用手动登录：

1. 用户在 GUI 中点击“打开登录窗口”
2. 应用启动受控浏览器并进入 CAS 登录页
3. 用户手动输入账号、密码、验证码或完成二次验证
4. 应用检测到已进入目标页面后自动保存会话

这样做的原因是：

- CAS 页面存在验证码、二次验证等不确定因素
- 手动登录比全自动登录更稳妥
- 可以避免把首版能力建立在脆弱的自动登录流程上

### 6.2 可选自动填充

支持用户主动开启“记住账号密码”和“自动填充”。

行为定义：

- 默认关闭
- 如果开启，只自动填充，不默认自动点击登录按钮
- 后续如验证 CAS 页面结构稳定，可在高级设置中增加实验性“自动提交”开关，但不作为首版默认能力

### 6.3 会话持久化

不再保存 Python 脚本中的 `cookies.pkl` 形式，而是保存结构化会话数据：

- cookies
- 最近一次成功登录时间
- 关联的浏览器模式
- 对应的 profile 目录
- 会话状态标记

会话相关文件放在应用数据目录中，与配置、日志、结果缓存分离。

### 6.4 会话失效恢复

监控过程中如果检测到跳回登录页：

- 状态切换为 `session_expired`
- 如果启用了自动填充，则先尝试恢复一次
- 如果恢复失败，前端明确提示用户重新登录
- 不在后台无限重试，避免无效消耗资源

### 6.5 凭据安全

账号密码默认不保存。

如果用户主动开启“记住账号密码”，建议使用系统凭据存储：

- macOS：Keychain
- Windows：Credential Manager
- Linux：Secret Service

账号密码不写入明文配置文件。

## 7. GUI 信息架构与交互流程

### 7.1 一级页面结构

建议桌面端包含 5 个一级页面。

#### 1. 首页 / 仪表盘

负责展示：

- 当前监控状态
- 最近一次检查时间
- 下次检查时间
- 当前浏览器模式
- 当前通知方式
- 最近一次解析结果摘要

主操作：

- 开始监控
- 暂停监控
- 重新登录
- 查看结果详情

#### 2. 登录与浏览器

负责：

- 选择浏览器模式
- 显示系统浏览器探测结果
- 手动指定浏览器路径
- 下载浏览器内核
- 打开登录窗口
- 清除会话
- 测试会话有效性
- 配置自动填充相关选项

#### 3. 通知设置

负责：

- Bark 地址配置
- Bark 联通性测试
- 系统通知开关
- 测试通知发送

#### 4. 结果与历史

负责：

- 展示当前解析结果
- 展示历史快照
- 对比与上次快照的差异
- 显示结果更新时间

#### 5. 设置与日志

负责：

- 刷新间隔配置
- 启动时自动恢复上次任务
- 数据目录说明
- 日志查看
- 诊断信息导出
- 版本信息

### 7.2 推荐交互流程

#### 首次启动

1. 检查是否存在可用系统浏览器
2. 引导用户配置 Bark
3. 引导用户打开登录窗口
4. 登录完成后返回首页
5. 用户手动点击“开始监控”

#### 日常使用

1. 应用读取上次配置与会话状态
2. 如果会话有效，可直接进入就绪态
3. 用户点击“开始监控”或自动恢复任务
4. 首页持续展示状态与结果摘要

#### 会话失效

1. 首页显示明显告警
2. 提供“重新登录”入口
3. 用户重新完成登录后恢复监控

### 7.3 UI 风格建议

组件层面使用 `shadcn/ui`，推荐采用：

- `Button`
- `Card`
- `Tabs`
- `Dialog`
- `Form`
- `Input`
- `Textarea`
- `Badge`
- `Alert`
- `Table`
- `Toast`
- `Sheet`

视觉方向建议：

- 不做典型“后台管理系统”风格
- 采用桌面工具风格布局：左侧导航，右侧内容
- 首页以状态卡片为主，突出“当前是否正常”“最近结果是否变化”“用户下一步该做什么”
- 关键状态用清晰颜色区分，但整体风格保持克制

## 8. 模块划分与目录结构

### 8.1 建议目录结构

```text
unblind-desktop/
├─ app.go
├─ main.go
├─ go.mod
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ features/
│  │  │  ├─ dashboard/
│  │  │  ├─ auth/
│  │  │  ├─ browser/
│  │  │  ├─ notifications/
│  │  │  ├─ results/
│  │  │  └─ settings/
│  │  ├─ lib/
│  │  ├─ hooks/
│  │  └─ types/
│  ├─ components.json
│  ├─ vite.config.ts
│  └─ package.json
├─ internal/
│  ├─ appstate/
│  ├─ config/
│  ├─ browser/
│  ├─ auth/
│  ├─ monitor/
│  ├─ parser/
│  ├─ notify/
│  ├─ storage/
│  ├─ diagnostics/
│  └─ platform/
└─ build/
```

### 8.2 后端模块职责

#### `appstate`

- 管理应用状态机
- 汇总全局状态快照

建议状态：

- `idle`
- `needs_login`
- `ready`
- `running`
- `session_expired`
- `error`

#### `config`

- 配置读写
- 默认值管理
- 配置版本迁移

#### `browser`

- 浏览器探测
- 系统浏览器路径校验
- 已下载内核管理
- 启动参数拼装
- profile 目录管理

#### `auth`

- 启动登录流程
- 登录成功检测
- cookie/session 持久化
- 自动填充逻辑

#### `monitor`

- 启停监控
- 定时轮询
- 错误重试
- 结果变化判断

#### `parser`

- 解析浙大盲审页面 DOM
- 提取标准化结果结构
- 屏蔽页面结构差异

#### `notify`

- Bark 发送
- 可选系统通知

#### `storage`

- 配置存储
- 缓存存储
- 日志存储
- 历史结果快照

#### `diagnostics`

- 诊断信息导出
- 敏感信息脱敏

#### `platform`

- 封装不同操作系统的路径、通知、凭据存储差异

### 8.3 前端模块职责

#### `features/dashboard`

- 首页状态卡
- 启停监控入口
- 摘要信息展示

#### `features/auth`

- 登录引导
- 会话状态
- 凭据设置

#### `features/browser`

- 浏览器来源与路径管理
- 下载内核管理

#### `features/notifications`

- Bark 配置
- 测试通知

#### `features/results`

- 当前结果
- 历史快照
- 结果差异展示

#### `features/settings`

- 通用设置
- 日志与诊断

## 9. 前后端接口设计

### 9.1 命令式接口

建议暴露以下 Wails 方法：

- `GetAppState()`
- `GetConfig()`
- `SaveConfig(payload)`
- `DetectBrowsers()`
- `DownloadBrowserKernel()`
- `StartLoginFlow()`
- `ValidateSession()`
- `ClearSession()`
- `StartMonitoring()`
- `StopMonitoring()`
- `GetCurrentResult()`
- `GetResultHistory()`
- `SendTestBark()`
- `ExportDiagnostics()`

### 9.2 事件接口

建议推送以下事件：

- `app:state-changed`
- `auth:login-detected`
- `monitor:tick`
- `monitor:error`
- `result:updated`
- `download:progress`

### 9.3 数据模型

#### `ReviewResult`

```ts
type ReviewResult = {
  expertName: string
  reviewTime: string
  overallEvaluation: string
  reviewResult: string
  remark: string
}
```

#### `ReviewSnapshot`

```ts
type ReviewSnapshot = {
  reviews: ReviewResult[]
  finalResult: string
  extractTime: string
  hash: string
}
```

#### `AppConfig`

```ts
type AppConfig = {
  refreshIntervalSec: number
  browserMode: "system" | "downloaded"
  browserPath: string
  downloadedKernelPath: string
  barkEnabled: boolean
  barkBaseUrl: string
  systemNotificationEnabled: boolean
  rememberCredentials: boolean
  autoFillCredentials: boolean
  autoResumeMonitoring: boolean
}
```

## 10. 技术选型细节与依赖最小化

### 10.1 后端技术栈

- `Go 1.23+`
- `Wails v2`
- `chromedp`

### 10.2 前端技术栈

- `React`
- `Vite`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `react-hook-form`
- `zod`

### 10.3 依赖最小化原则

- 不引入 Python 运行时
- 不引入 Selenium 与 WebDriver 管理器
- 不默认集成 Playwright 浏览器包
- 能用 Go/前端标准能力完成的部分，不额外引入重型依赖
- 前端只引入实际需要的 shadcn 组件

### 10.4 跨平台分发策略

- macOS：生成 `.app`
- Windows：生成 `.exe` 或安装包
- Linux：生成 `AppImage` 或发行版包

后续可根据实际分发需要补齐：

- macOS 签名与 notarization
- Windows 安装器和签名
- Linux 多发行版兼容性说明

## 11. 风险与应对

### 11.1 页面 DOM 改版

风险：

- 结果提取逻辑可能失效

应对：

- 将 DOM 解析集中在 `parser` 模块
- 保存页面快照用于回归测试
- 提供诊断信息导出能力

### 11.2 CAS 登录复杂度

风险：

- 验证码、跳转或二次验证会影响自动登录

应对：

- 默认使用手动登录
- 自动填充只做辅助功能

### 11.3 浏览器探测失败

风险：

- 系统路径可能探测不全

应对：

- 提供手动选择浏览器路径入口
- 启动前做实际可用性检测

### 11.4 下载浏览器内核失败

风险：

- 网络、权限、下载中断会导致增强模式不可用

应对：

- 默认模式 A 必须独立可用
- 下载过程展示进度、错误与重试入口

### 11.5 Bark 配置错误

风险：

- 通知发送失败

应对：

- 提供“发送测试通知”
- 通知失败不影响监控主流程

### 11.6 资源占用过高

风险：

- 长时间后台轮询导致资源占用异常

应对：

- 默认轮询间隔维持为 5 分钟
- 优先复用浏览器上下文
- 首页显示最近一次执行耗时

## 12. 测试策略

### 12.1 单元测试

- 结果哈希比较逻辑
- 配置读写和迁移
- Bark 请求组装与错误处理
- DOM 解析器对不同页面快照的兼容性

### 12.2 集成测试

- 登录态恢复流程
- 监控状态机流转
- 结果变化时只发送一次通知
- 会话失效后的状态切换

### 12.3 手工验收

- macOS、Windows、Linux 的默认模式 A
- 模式 C 的手动下载与切换
- 首次配置流程
- Bark 测试通知
- 登录成功、会话失效、重新登录等关键路径

## 13. 实施建议与里程碑

### Milestone 1：桌面壳与基础配置

- 初始化 Wails 项目
- 初始化 React/Vite/TS/shadcn 前端
- 完成基础布局与 5 个一级页面
- 建立配置管理与首页状态展示

### Milestone 2：浏览器与登录

- 系统浏览器探测
- 手动指定浏览器路径
- 打开登录窗口
- 登录成功检测
- 会话持久化

### Milestone 3：监控与通知

- DOM 解析
- 轮询调度
- 结果哈希比较
- Bark 通知
- 当前结果与历史快照展示

### Milestone 4：增强能力

- 下载浏览器内核模式
- 凭据存储与自动填充
- 系统通知
- 日志查看与诊断导出

## 14. 首版交付建议

为了尽快交付可用版本，建议首版必须完成以下内容：

- Wails 跨平台桌面壳
- React/Vite/TS/shadcn GUI
- 默认模式 A：系统浏览器运行
- 手动登录与会话持久化
- 结果解析、轮询与变化检测
- Bark 通知
- 基础日志与错误提示

以下内容建议作为首版后的增强项：

- 模式 C：手动下载浏览器内核
- 自动填充账号密码
- 系统通知
- 诊断信息导出

这样可以先确保桌面端真的能跑起来，再逐步补强复杂能力。

## 15. 结论

本方案以 `Wails + Go(chromedp) + React/Vite/TS/shadcn` 为核心，目标是在不依赖 Python 和 Selenium 的前提下，把现有盲审结果监控脚本重构为可跨平台分发的桌面应用。

设计重点如下：

- 默认优先使用系统浏览器，降低安装门槛
- 允许用户手动下载浏览器内核，覆盖特殊场景
- 默认手动登录，确保 CAS 流程足够稳妥
- Bark 作为默认通知方式，系统通知作为补充
- 通过清晰的模块边界和 GUI 交互，把现有脚本能力整理成可维护的桌面产品

这份设计方案适合作为后续实施计划和项目初始化的基础文档。
