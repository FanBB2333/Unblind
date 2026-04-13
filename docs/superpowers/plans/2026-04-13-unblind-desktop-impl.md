# Unblind Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform desktop application for ZJU blind review result monitoring using Wails + Go + React.

**Architecture:** 
- Frontend: React + Vite + TypeScript + shadcn/ui for GUI
- Backend: Go with chromedp for browser automation
- Bridge: Wails v2 for desktop shell and IPC
- Default Mode A: Use system-installed browser (Chrome/Edge/Chromium)

**Tech Stack:** Go 1.23+, Wails v2, chromedp, React, Vite, TypeScript, Tailwind CSS, shadcn/ui

---

## Milestone 1: Desktop Shell & Basic Configuration

### Task 1: Initialize Wails Project

**Files:**
- Create: `unblind-desktop/` (entire project structure)
- Create: `unblind-desktop/go.mod`
- Create: `unblind-desktop/main.go`
- Create: `unblind-desktop/app.go`

- [ ] **Step 1: Initialize Wails project with React/TS template**

```bash
cd /Users/l1ght/repos/Unblind
wails init -n unblind-desktop -t react-ts
```

- [ ] **Step 2: Verify project structure created**

```bash
ls -la unblind-desktop/
```
Expected: See main.go, app.go, frontend/, go.mod, etc.

- [ ] **Step 3: Test initial build**

```bash
cd unblind-desktop && wails build
```
Expected: Build succeeds, produces binary

- [ ] **Step 4: Commit initial project**

```bash
git add unblind-desktop/
git commit -m "feat: initialize Wails project with React/TS template"
```

---

### Task 2: Setup shadcn/ui in Frontend

**Files:**
- Modify: `unblind-desktop/frontend/package.json`
- Create: `unblind-desktop/frontend/components.json`
- Modify: `unblind-desktop/frontend/tailwind.config.js`
- Modify: `unblind-desktop/frontend/src/index.css`

- [ ] **Step 1: Install shadcn/ui dependencies**

```bash
cd unblind-desktop/frontend
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node
```

- [ ] **Step 2: Initialize shadcn/ui**

```bash
cd unblind-desktop/frontend
npx shadcn@latest init
```
Select: TypeScript, Default style, CSS variables, src/lib/utils, @/components, etc.

- [ ] **Step 3: Install essential components**

```bash
cd unblind-desktop/frontend
npx shadcn@latest add button card tabs dialog form input badge alert toast
```

- [ ] **Step 4: Verify build still works**

```bash
cd unblind-desktop && wails build
```

- [ ] **Step 5: Commit shadcn setup**

```bash
git add unblind-desktop/frontend/
git commit -m "feat: setup shadcn/ui with essential components"
```

---

### Task 3: Create App Layout with Navigation

**Files:**
- Create: `unblind-desktop/frontend/src/components/layout/AppLayout.tsx`
- Create: `unblind-desktop/frontend/src/components/layout/Sidebar.tsx`
- Create: `unblind-desktop/frontend/src/components/layout/index.ts`
- Modify: `unblind-desktop/frontend/src/App.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `unblind-desktop/frontend/src/components/layout/Sidebar.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { Home, Globe, Bell, History, Settings } from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "首页", icon: <Home className="h-5 w-5" /> },
  { id: "browser", label: "登录与浏览器", icon: <Globe className="h-5 w-5" /> },
  { id: "notifications", label: "通知设置", icon: <Bell className="h-5 w-5" /> },
  { id: "results", label: "结果与历史", icon: <History className="h-5 w-5" /> },
  { id: "settings", label: "设置与日志", icon: <Settings className="h-5 w-5" /> },
];

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-muted/40 border-r h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-semibold">Unblind</h1>
        <p className="text-xs text-muted-foreground">盲审结果监控</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              currentPage === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create AppLayout component**

Create `unblind-desktop/frontend/src/components/layout/AppLayout.tsx`:

```tsx
import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

type AppLayoutProps = {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create index.ts for layout exports**

Create `unblind-desktop/frontend/src/components/layout/index.ts`:

```ts
export { AppLayout } from "./AppLayout";
export { Sidebar } from "./Sidebar";
```

- [ ] **Step 4: Update App.tsx with layout**

```tsx
import { useState } from "react";
import { AppLayout } from "@/components/layout";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <div className="text-2xl font-bold">首页 / 仪表盘</div>;
      case "browser":
        return <div className="text-2xl font-bold">登录与浏览器</div>;
      case "notifications":
        return <div className="text-2xl font-bold">通知设置</div>;
      case "results":
        return <div className="text-2xl font-bold">结果与历史</div>;
      case "settings":
        return <div className="text-2xl font-bold">设置与日志</div>;
      default:
        return <div>未知页面</div>;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 5: Test layout renders**

```bash
cd unblind-desktop && wails dev
```
Expected: See sidebar navigation with 5 items, clicking navigates between pages

- [ ] **Step 6: Commit layout**

```bash
git add unblind-desktop/
git commit -m "feat: add app layout with sidebar navigation"
```

---

### Task 4: Create Dashboard Page

**Files:**
- Create: `unblind-desktop/frontend/src/pages/DashboardPage.tsx`
- Create: `unblind-desktop/frontend/src/pages/index.ts`
- Modify: `unblind-desktop/frontend/src/App.tsx`

- [ ] **Step 1: Create DashboardPage component**

Create `unblind-desktop/frontend/src/pages/DashboardPage.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RefreshCw, LogIn } from "lucide-react";

type AppState = "idle" | "needs_login" | "ready" | "running" | "session_expired" | "error";

type DashboardProps = {
  appState?: AppState;
  lastCheckTime?: string;
  nextCheckTime?: string;
  browserMode?: string;
  notificationMethod?: string;
  resultSummary?: string;
};

export function DashboardPage({
  appState = "idle",
  lastCheckTime = "-",
  nextCheckTime = "-",
  browserMode = "系统浏览器",
  notificationMethod = "Bark",
  resultSummary = "暂无结果",
}: DashboardProps) {
  const getStateBadge = () => {
    switch (appState) {
      case "idle":
        return <Badge variant="secondary">空闲</Badge>;
      case "needs_login":
        return <Badge variant="destructive">需要登录</Badge>;
      case "ready":
        return <Badge variant="outline">就绪</Badge>;
      case "running":
        return <Badge className="bg-green-500">运行中</Badge>;
      case "session_expired":
        return <Badge variant="destructive">会话过期</Badge>;
      case "error":
        return <Badge variant="destructive">错误</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground">盲审结果监控状态</p>
        </div>
        {getStateBadge()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">监控状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">上次检查</span>
                <span>{lastCheckTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">下次检查</span>
                <span>{nextCheckTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">配置信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">浏览器模式</span>
                <span>{browserMode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">通知方式</span>
                <span>{notificationMethod}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">最近结果</CardTitle>
          <CardDescription>最近一次解析的盲审结果摘要</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{resultSummary}</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          开始监控
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Pause className="h-4 w-4" />
          暂停
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          重新登录
        </Button>
        <Button variant="ghost" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          刷新状态
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create pages/index.ts**

```ts
export { DashboardPage } from "./DashboardPage";
```

- [ ] **Step 3: Update App.tsx to use DashboardPage**

```tsx
import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { DashboardPage } from "@/pages";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "browser":
        return <div className="text-2xl font-bold">登录与浏览器</div>;
      case "notifications":
        return <div className="text-2xl font-bold">通知设置</div>;
      case "results":
        return <div className="text-2xl font-bold">结果与历史</div>;
      case "settings":
        return <div className="text-2xl font-bold">设置与日志</div>;
      default:
        return <div>未知页面</div>;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 4: Test dashboard renders**

```bash
cd unblind-desktop && wails dev
```

- [ ] **Step 5: Commit dashboard page**

```bash
git add unblind-desktop/
git commit -m "feat: add dashboard page with status cards"
```

---

### Task 5: Create Remaining Pages (Browser, Notifications, Results, Settings)

**Files:**
- Create: `unblind-desktop/frontend/src/pages/BrowserPage.tsx`
- Create: `unblind-desktop/frontend/src/pages/NotificationsPage.tsx`
- Create: `unblind-desktop/frontend/src/pages/ResultsPage.tsx`
- Create: `unblind-desktop/frontend/src/pages/SettingsPage.tsx`
- Modify: `unblind-desktop/frontend/src/pages/index.ts`
- Modify: `unblind-desktop/frontend/src/App.tsx`

- [ ] **Step 1: Create BrowserPage**

Create `unblind-desktop/frontend/src/pages/BrowserPage.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, FolderOpen, LogIn, Trash2, RefreshCw } from "lucide-react";

export function BrowserPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">登录与浏览器</h1>
        <p className="text-muted-foreground">配置浏览器模式和管理登录会话</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            浏览器模式
          </CardTitle>
          <CardDescription>选择使用系统浏览器或下载浏览器内核</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">系统浏览器 (推荐)</p>
              <p className="text-sm text-muted-foreground">使用已安装的 Chrome/Edge/Chromium</p>
            </div>
            <Badge>当前</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg opacity-60">
            <div>
              <p className="font-medium">下载浏览器内核</p>
              <p className="text-sm text-muted-foreground">下载独立的 Chromium 内核</p>
            </div>
            <Button variant="outline" size="sm">下载</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>浏览器检测</CardTitle>
          <CardDescription>系统中检测到的浏览器</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm">Google Chrome</span>
              <span className="text-xs text-muted-foreground">/Applications/Google Chrome.app</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              重新检测
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              手动选择
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登录会话</CardTitle>
          <CardDescription>管理浙大统一身份认证会话</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">会话状态</p>
              <p className="text-sm text-muted-foreground">未登录或会话已过期</p>
            </div>
            <Badge variant="destructive">未登录</Badge>
          </div>
          <div className="flex gap-2">
            <Button className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              打开登录窗口
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              测试会话
            </Button>
            <Button variant="ghost" className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              清除会话
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自动填充 (可选)</CardTitle>
          <CardDescription>保存账号密码以自动填充登录表单</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">学号</Label>
              <Input id="username" placeholder="请输入学号" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" placeholder="请输入密码" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            凭据将安全存储在系统密钥链中，不会以明文形式保存
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create NotificationsPage**

Create `unblind-desktop/frontend/src/pages/NotificationsPage.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Send } from "lucide-react";

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">通知设置</h1>
        <p className="text-muted-foreground">配置盲审结果变化时的通知方式</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bark 通知
          </CardTitle>
          <CardDescription>通过 Bark App 发送推送通知到 iOS 设备</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="bark-enabled">启用 Bark 通知</Label>
            <Switch id="bark-enabled" defaultChecked />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bark-url">Bark API 地址</Label>
            <Input
              id="bark-url"
              placeholder="https://api.day.app/your-key"
            />
            <p className="text-xs text-muted-foreground">
              在 Bark App 中获取你的 API 地址
            </p>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            发送测试通知
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>系统通知</CardTitle>
          <CardDescription>使用操作系统原生通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="system-notification">启用系统通知</Label>
            <Switch id="system-notification" />
          </div>
          <p className="text-xs text-muted-foreground">
            系统通知作为 Bark 的补充，在桌面显示通知横幅
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create ResultsPage**

Create `unblind-desktop/frontend/src/pages/ResultsPage.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";

type ReviewResult = {
  expertName: string;
  reviewTime: string;
  overallEvaluation: string;
  reviewResult: string;
  remark: string;
};

const mockResults: ReviewResult[] = [
  {
    expertName: "专家1",
    reviewTime: "2026-04-10 14:30",
    overallEvaluation: "A（优秀）",
    reviewResult: "同意答辩",
    remark: "",
  },
  {
    expertName: "专家2",
    reviewTime: "2026-04-11 09:15",
    overallEvaluation: "B（良好）",
    reviewResult: "同意答辩",
    remark: "",
  },
];

export function ResultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">结果与历史</h1>
        <p className="text-muted-foreground">查看当前盲审结果和历史记录</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>当前结果</CardTitle>
          <CardDescription>最近一次提取的盲审评审结果</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>专家</TableHead>
                <TableHead>评阅时间</TableHead>
                <TableHead>总体评价</TableHead>
                <TableHead>评阅结果</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{result.expertName}</TableCell>
                  <TableCell>{result.reviewTime}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.overallEvaluation}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500">{result.reviewResult}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {result.remark || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">最终判定结果：同意答辩</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            历史快照
          </CardTitle>
          <CardDescription>结果变化的历史记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">2026-04-11 09:15:32</p>
                <p className="text-xs text-muted-foreground">专家2 提交评审结果</p>
              </div>
              <Badge variant="outline">最新</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">2026-04-10 14:30:18</p>
                <p className="text-xs text-muted-foreground">专家1 提交评审结果</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create SettingsPage**

Create `unblind-desktop/frontend/src/pages/SettingsPage.tsx`:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, FileText, Download } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置与日志</h1>
        <p className="text-muted-foreground">应用配置和诊断信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            监控设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="refresh-interval">刷新间隔（秒）</Label>
            <Input
              id="refresh-interval"
              type="number"
              defaultValue={300}
              min={60}
            />
            <p className="text-xs text-muted-foreground">
              建议不低于 60 秒，默认 300 秒（5 分钟）
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-resume">启动时自动恢复</Label>
              <p className="text-xs text-muted-foreground">
                应用启动后自动恢复上次的监控任务
              </p>
            </div>
            <Switch id="auto-resume" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            日志
          </CardTitle>
          <CardDescription>查看应用运行日志</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-xs h-48 overflow-auto">
            <p>[2026-04-13 10:00:00] 应用启动</p>
            <p>[2026-04-13 10:00:01] 检测到系统浏览器: Google Chrome</p>
            <p>[2026-04-13 10:00:02] 配置加载完成</p>
            <p className="text-muted-foreground">等待更多日志...</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>诊断信息</CardTitle>
          <CardDescription>导出诊断信息以便排查问题</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">应用版本</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">数据目录</p>
              <p className="font-medium text-xs">~/Library/Application Support/Unblind</p>
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            导出诊断信息
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Update pages/index.ts**

```ts
export { DashboardPage } from "./DashboardPage";
export { BrowserPage } from "./BrowserPage";
export { NotificationsPage } from "./NotificationsPage";
export { ResultsPage } from "./ResultsPage";
export { SettingsPage } from "./SettingsPage";
```

- [ ] **Step 6: Update App.tsx with all pages**

```tsx
import { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  DashboardPage,
  BrowserPage,
  NotificationsPage,
  ResultsPage,
  SettingsPage,
} from "@/pages";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "browser":
        return <BrowserPage />;
      case "notifications":
        return <NotificationsPage />;
      case "results":
        return <ResultsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <div>未知页面</div>;
    }
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 7: Test all pages render**

```bash
cd unblind-desktop && wails dev
```

- [ ] **Step 8: Commit all pages**

```bash
git add unblind-desktop/
git commit -m "feat: add all 5 main pages (dashboard, browser, notifications, results, settings)"
```

---

### Task 6: Create Go Backend Config Module

**Files:**
- Create: `unblind-desktop/internal/config/config.go`
- Modify: `unblind-desktop/app.go`

- [ ] **Step 1: Create config package**

Create `unblind-desktop/internal/config/config.go`:

```go
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// AppConfig represents the application configuration
type AppConfig struct {
	RefreshIntervalSec        int    `json:"refreshIntervalSec"`
	BrowserMode               string `json:"browserMode"` // "system" or "downloaded"
	BrowserPath               string `json:"browserPath"`
	DownloadedKernelPath      string `json:"downloadedKernelPath"`
	BarkEnabled               bool   `json:"barkEnabled"`
	BarkBaseURL               string `json:"barkBaseUrl"`
	SystemNotificationEnabled bool   `json:"systemNotificationEnabled"`
	RememberCredentials       bool   `json:"rememberCredentials"`
	AutoFillCredentials       bool   `json:"autoFillCredentials"`
	AutoResumeMonitoring      bool   `json:"autoResumeMonitoring"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() *AppConfig {
	return &AppConfig{
		RefreshIntervalSec:        300,
		BrowserMode:               "system",
		BrowserPath:               "",
		DownloadedKernelPath:      "",
		BarkEnabled:               true,
		BarkBaseURL:               "",
		SystemNotificationEnabled: false,
		RememberCredentials:       false,
		AutoFillCredentials:       false,
		AutoResumeMonitoring:      false,
	}
}

// Manager handles configuration persistence
type Manager struct {
	config   *AppConfig
	filePath string
	mu       sync.RWMutex
}

// NewManager creates a new config manager
func NewManager(dataDir string) (*Manager, error) {
	configPath := filepath.Join(dataDir, "config.json")
	
	m := &Manager{
		config:   DefaultConfig(),
		filePath: configPath,
	}
	
	// Load existing config if exists
	if err := m.load(); err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	
	return m, nil
}

// Get returns the current configuration
func (m *Manager) Get() *AppConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Return a copy
	cfg := *m.config
	return &cfg
}

// Save saves the configuration
func (m *Manager) Save(cfg *AppConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.config = cfg
	
	// Ensure directory exists
	dir := filepath.Dir(m.filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	
	return os.WriteFile(m.filePath, data, 0644)
}

func (m *Manager) load() error {
	data, err := os.ReadFile(m.filePath)
	if err != nil {
		return err
	}
	
	return json.Unmarshal(data, m.config)
}
```

- [ ] **Step 2: Update app.go to use config**

Update `unblind-desktop/app.go`:

```go
package main

import (
	"context"
	"os"
	"path/filepath"

	"unblind-desktop/internal/config"
)

// App struct
type App struct {
	ctx           context.Context
	configManager *config.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Initialize config manager
	dataDir := a.getDataDir()
	configManager, err := config.NewManager(dataDir)
	if err != nil {
		// Log error but continue with defaults
		println("Failed to initialize config:", err.Error())
		configManager, _ = config.NewManager(os.TempDir())
	}
	a.configManager = configManager
}

// getDataDir returns the application data directory
func (a *App) getDataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return os.TempDir()
	}
	
	// Use platform-specific app data directory
	dataDir := filepath.Join(homeDir, ".unblind")
	os.MkdirAll(dataDir, 0755)
	return dataDir
}

// GetConfig returns the current configuration
func (a *App) GetConfig() *config.AppConfig {
	return a.configManager.Get()
}

// SaveConfig saves the configuration
func (a *App) SaveConfig(cfg *config.AppConfig) error {
	return a.configManager.Save(cfg)
}
```

- [ ] **Step 3: Update go.mod for internal packages**

```bash
cd unblind-desktop && go mod tidy
```

- [ ] **Step 4: Test build**

```bash
cd unblind-desktop && wails build
```

- [ ] **Step 5: Commit config module**

```bash
git add unblind-desktop/
git commit -m "feat: add Go config management module"
```

---

### Task 7: Create AppState Module

**Files:**
- Create: `unblind-desktop/internal/appstate/state.go`
- Modify: `unblind-desktop/app.go`

- [ ] **Step 1: Create appstate package**

Create `unblind-desktop/internal/appstate/state.go`:

```go
package appstate

import (
	"sync"
	"time"
)

// State represents the application state
type State string

const (
	StateIdle           State = "idle"
	StateNeedsLogin     State = "needs_login"
	StateReady          State = "ready"
	StateRunning        State = "running"
	StateSessionExpired State = "session_expired"
	StateError          State = "error"
)

// AppState represents the full application state snapshot
type AppState struct {
	State           State     `json:"state"`
	LastCheckTime   time.Time `json:"lastCheckTime"`
	NextCheckTime   time.Time `json:"nextCheckTime"`
	LastError       string    `json:"lastError"`
	BrowserDetected bool      `json:"browserDetected"`
	SessionValid    bool      `json:"sessionValid"`
}

// Manager manages the application state
type Manager struct {
	state *AppState
	mu    sync.RWMutex
}

// NewManager creates a new state manager
func NewManager() *Manager {
	return &Manager{
		state: &AppState{
			State: StateIdle,
		},
	}
}

// Get returns the current state
func (m *Manager) Get() *AppState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Return a copy
	s := *m.state
	return &s
}

// SetState updates the state
func (m *Manager) SetState(state State) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.State = state
}

// SetLastCheckTime updates the last check time
func (m *Manager) SetLastCheckTime(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.LastCheckTime = t
}

// SetNextCheckTime updates the next check time
func (m *Manager) SetNextCheckTime(t time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.NextCheckTime = t
}

// SetError sets the error state
func (m *Manager) SetError(err string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.State = StateError
	m.state.LastError = err
}

// SetBrowserDetected updates browser detection status
func (m *Manager) SetBrowserDetected(detected bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.BrowserDetected = detected
}

// SetSessionValid updates session validity status
func (m *Manager) SetSessionValid(valid bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.state.SessionValid = valid
	if !valid {
		m.state.State = StateNeedsLogin
	}
}
```

- [ ] **Step 2: Update app.go with state manager**

Add to `unblind-desktop/app.go`:

```go
package main

import (
	"context"
	"os"
	"path/filepath"

	"unblind-desktop/internal/appstate"
	"unblind-desktop/internal/config"
)

// App struct
type App struct {
	ctx           context.Context
	configManager *config.Manager
	stateManager  *appstate.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	
	// Initialize config manager
	dataDir := a.getDataDir()
	configManager, err := config.NewManager(dataDir)
	if err != nil {
		println("Failed to initialize config:", err.Error())
		configManager, _ = config.NewManager(os.TempDir())
	}
	a.configManager = configManager
	
	// Initialize state manager
	a.stateManager = appstate.NewManager()
}

// getDataDir returns the application data directory
func (a *App) getDataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return os.TempDir()
	}
	
	dataDir := filepath.Join(homeDir, ".unblind")
	os.MkdirAll(dataDir, 0755)
	return dataDir
}

// GetConfig returns the current configuration
func (a *App) GetConfig() *config.AppConfig {
	return a.configManager.Get()
}

// SaveConfig saves the configuration
func (a *App) SaveConfig(cfg *config.AppConfig) error {
	return a.configManager.Save(cfg)
}

// GetAppState returns the current application state
func (a *App) GetAppState() *appstate.AppState {
	return a.stateManager.Get()
}
```

- [ ] **Step 3: Test build**

```bash
cd unblind-desktop && wails build
```

- [ ] **Step 4: Commit appstate module**

```bash
git add unblind-desktop/
git commit -m "feat: add appstate management module"
```

---

## Milestone 1 Complete

At this point, Milestone 1 is complete with:
- Wails project initialized
- React/Vite/TS/shadcn frontend setup
- 5 main pages implemented
- Basic layout with sidebar navigation
- Go config management module
- Go appstate management module

---

## Milestone 2: Browser & Login

(To be implemented after Milestone 1 testing)

### Task 8: Browser Detection Module
### Task 9: Login Flow with chromedp
### Task 10: Session Persistence
### Task 11: Connect Frontend to Backend APIs

---

## Milestone 3: Monitoring & Notifications

(To be implemented after Milestone 2)

### Task 12: DOM Parser Module
### Task 13: Monitor Scheduler
### Task 14: Result Hash Comparison
### Task 15: Bark Notification
### Task 16: Results History Storage

---

## Milestone 4: Enhanced Features

(To be implemented after Milestone 3)

### Task 17: Browser Kernel Download
### Task 18: Credential Storage with Keychain
### Task 19: System Notifications
### Task 20: Diagnostics Export
