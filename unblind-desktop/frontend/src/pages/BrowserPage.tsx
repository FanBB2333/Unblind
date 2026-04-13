import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, FolderOpen, LogIn, Trash2, RefreshCw, Check } from "lucide-react";
import { 
  DetectBrowsers, 
  GetSession, 
  StartLoginFlow, 
  ValidateSession, 
  ClearSession,
  CheckLoginStatus
} from "../../wailsjs/go/main/App";
import { browser, auth } from "../../wailsjs/go/models";

export function BrowserPage() {
  const [browsers, setBrowsers] = useState<browser.BrowserInfo[]>([]);
  const [session, setSession] = useState<auth.Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);

  const fetchData = async () => {
    try {
      const sess = await GetSession();
      setSession(sess);
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  };

  const handleDetectBrowsers = async () => {
    setIsDetecting(true);
    try {
      const detected = await DetectBrowsers();
      setBrowsers(detected);
    } catch (err) {
      console.error("Failed to detect browsers:", err);
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    handleDetectBrowsers();
    fetchData();
  }, []);

  const handleStartLogin = async () => {
    setIsLoading(true);
    try {
      await StartLoginFlow();
      setIsCheckingLogin(true);
    } catch (err) {
      console.error("Failed to start login:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckLogin = async () => {
    try {
      const success = await CheckLoginStatus();
      if (success) {
        setIsCheckingLogin(false);
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to check login:", err);
    }
  };

  // Auto-check login status
  useEffect(() => {
    if (!isCheckingLogin) return;
    const interval = setInterval(handleCheckLogin, 2000);
    return () => clearInterval(interval);
  }, [isCheckingLogin]);

  const handleValidateSession = async () => {
    setIsLoading(true);
    try {
      await ValidateSession();
      await fetchData();
    } catch (err) {
      console.error("Failed to validate session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    setIsLoading(true);
    try {
      await ClearSession();
      await fetchData();
    } catch (err) {
      console.error("Failed to clear session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time: any) => {
    if (!time) return "从未";
    try {
      const date = new Date(time);
      if (isNaN(date.getTime())) return "从未";
      return date.toLocaleString("zh-CN");
    } catch {
      return "从未";
    }
  };

  const validBrowsers = browsers.filter(b => b.isValid);

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
              <p className="text-sm text-muted-foreground">下载独立的 Chromium 内核（未实现）</p>
            </div>
            <Button variant="outline" size="sm" disabled>下载</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>浏览器检测</CardTitle>
          <CardDescription>系统中检测到的浏览器 ({validBrowsers.length} 个可用)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {browsers.map((b, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-2 rounded ${b.isValid ? "bg-muted" : "bg-muted/50 opacity-50"}`}
              >
                <div className="flex items-center gap-2">
                  {b.isValid && <Check className="h-4 w-4 text-green-500" />}
                  <span className="text-sm font-medium">{b.name}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[300px]">{b.path}</span>
              </div>
            ))}
            {browsers.length === 0 && (
              <p className="text-sm text-muted-foreground">点击"重新检测"来扫描系统浏览器</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleDetectBrowsers}
              disabled={isDetecting}
            >
              <RefreshCw className={`h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
              重新检测
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2" disabled>
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
              <p className="text-sm text-muted-foreground">
                {session?.isValid ? `上次登录: ${formatTime(session?.lastLoginTime)}` : "未登录或会话已过期"}
              </p>
            </div>
            <Badge variant={session?.isValid ? "outline" : "destructive"}>
              {session?.isValid ? "已登录" : "未登录"}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              className="flex items-center gap-2"
              onClick={handleStartLogin}
              disabled={isLoading}
            >
              <LogIn className="h-4 w-4" />
              {isCheckingLogin ? "等待登录..." : "打开登录窗口"}
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleValidateSession}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              测试会话
            </Button>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-destructive"
              onClick={handleClearSession}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
              清除会话
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自动填充 (可选)</CardTitle>
          <CardDescription>保存账号密码以自动填充登录表单（未实现）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">学号</Label>
              <Input id="username" placeholder="请输入学号" disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" placeholder="请输入密码" disabled />
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
