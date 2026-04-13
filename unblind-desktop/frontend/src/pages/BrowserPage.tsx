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
