import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Globe, FolderOpen, LogIn, Trash2, RefreshCw, Check, Download, X, HardDrive } from "lucide-react";
import { 
  DetectBrowsers, 
  GetSession, 
  StartLoginFlow, 
  ValidateSession, 
  ClearSession,
  CheckLoginStatus,
  IsKernelDownloaded,
  GetKernelPath,
  DownloadBrowserKernel,
  GetDownloadProgress,
  CancelDownload,
  DeleteKernel,
  SaveCredentials,
  GetCredentials,
  HasCredentials,
  DeleteCredentials,
  AutoFillCredentials
} from "../../wailsjs/go/main/App";
import { browser, auth, credentials } from "../../wailsjs/go/models";

export function BrowserPage() {
  const [browsers, setBrowsers] = useState<browser.BrowserInfo[]>([]);
  const [session, setSession] = useState<auth.Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);
  
  // Kernel download state
  const [kernelDownloaded, setKernelDownloaded] = useState(false);
  const [kernelPath, setKernelPath] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<browser.DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [browserMode, setBrowserMode] = useState<"system" | "kernel">("system");
  
  // Credentials state
  const [storedCredentials, setStoredCredentials] = useState<credentials.Credentials | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  const fetchData = async () => {
    try {
      const sess = await GetSession();
      setSession(sess);
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  };

  const fetchKernelStatus = async () => {
    try {
      const downloaded = await IsKernelDownloaded();
      setKernelDownloaded(downloaded);
      if (downloaded) {
        const path = await GetKernelPath();
        setKernelPath(path);
      }
    } catch (err) {
      console.error("Failed to check kernel status:", err);
    }
  };

  const fetchCredentials = async () => {
    try {
      const creds = await GetCredentials();
      setStoredCredentials(creds);
      if (creds) {
        setUsername(creds.username);
        // Password is not retrieved for security
      }
    } catch (err) {
      console.error("Failed to get credentials:", err);
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
    fetchKernelStatus();
    fetchCredentials();
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

  const handleDownloadKernel = async () => {
    setIsDownloading(true);
    setDownloadProgress({ totalBytes: 0, downloadedBytes: 0, percentage: 0, status: "downloading", error: "" });
    
    try {
      // Start download in background
      DownloadBrowserKernel().then(() => {
        setIsDownloading(false);
        fetchKernelStatus();
      }).catch((err) => {
        console.error("Download failed:", err);
        setIsDownloading(false);
        setDownloadProgress(prev => prev ? { ...prev, status: "error", error: String(err) } : null);
      });
    } catch (err) {
      console.error("Failed to start download:", err);
      setIsDownloading(false);
    }
  };

  // Poll download progress
  useEffect(() => {
    if (!isDownloading) return;
    
    const interval = setInterval(async () => {
      try {
        const progress = await GetDownloadProgress();
        setDownloadProgress(progress);
        
        if (progress.status === "completed" || progress.status === "error") {
          setIsDownloading(false);
          if (progress.status === "completed") {
            fetchKernelStatus();
          }
        }
      } catch (err) {
        console.error("Failed to get progress:", err);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isDownloading]);

  const handleCancelDownload = () => {
    CancelDownload();
    setIsDownloading(false);
    setDownloadProgress(null);
  };

  const handleDeleteKernel = async () => {
    try {
      await DeleteKernel();
      setKernelDownloaded(false);
      setKernelPath("");
      setBrowserMode("system");
    } catch (err) {
      console.error("Failed to delete kernel:", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSaveCredentials = async () => {
    if (!username || !password) return;
    
    setIsSavingCredentials(true);
    try {
      await SaveCredentials(username, password);
      await fetchCredentials();
      setPassword(""); // Clear password from memory
    } catch (err) {
      console.error("Failed to save credentials:", err);
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const handleDeleteCredentials = async () => {
    try {
      await DeleteCredentials();
      setStoredCredentials(null);
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error("Failed to delete credentials:", err);
    }
  };

  const handleAutoFill = async () => {
    if (!storedCredentials) return;
    
    try {
      // Get stored credentials (including password)
      const creds = await GetCredentials();
      if (creds) {
        await AutoFillCredentials(creds.username, creds.password);
      }
    } catch (err) {
      console.error("Failed to auto-fill:", err);
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
          <div 
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${browserMode === "system" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            onClick={() => setBrowserMode("system")}
          >
            <div>
              <p className="font-medium">系统浏览器 (推荐)</p>
              <p className="text-sm text-muted-foreground">使用已安装的 Chrome/Edge/Chromium</p>
            </div>
            {browserMode === "system" && <Badge>当前</Badge>}
          </div>
          
          <div 
            className={`p-3 border rounded-lg transition-colors ${browserMode === "kernel" ? "border-primary bg-primary/5" : ""} ${!kernelDownloaded && !isDownloading ? "cursor-pointer hover:bg-muted/50" : ""}`}
            onClick={() => kernelDownloaded && setBrowserMode("kernel")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  下载浏览器内核
                </p>
                <p className="text-sm text-muted-foreground">
                  {kernelDownloaded 
                    ? "已下载独立的 Chromium 内核" 
                    : "下载独立的 Chromium 内核（约 150-200MB）"
                  }
                </p>
              </div>
              {browserMode === "kernel" && kernelDownloaded && <Badge>当前</Badge>}
            </div>
            
            {/* Download progress */}
            {isDownloading && downloadProgress && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {downloadProgress.status === "downloading" ? "下载中..." : 
                     downloadProgress.status === "extracting" ? "解压中..." : 
                     downloadProgress.status}
                  </span>
                  <span className="text-muted-foreground">
                    {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
                  </span>
                </div>
                <Progress value={downloadProgress.percentage} max={100} />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={(e) => { e.stopPropagation(); handleCancelDownload(); }}
                >
                  <X className="h-4 w-4 mr-1" />
                  取消下载
                </Button>
              </div>
            )}
            
            {/* Download error */}
            {downloadProgress?.status === "error" && (
              <div className="mt-3">
                <p className="text-sm text-destructive">{downloadProgress.error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={(e) => { e.stopPropagation(); handleDownloadKernel(); }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  重试
                </Button>
              </div>
            )}
            
            {/* Kernel downloaded */}
            {kernelDownloaded && !isDownloading && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground truncate">路径: {kernelPath}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDeleteKernel(); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除内核
                </Button>
              </div>
            )}
            
            {/* Download button */}
            {!kernelDownloaded && !isDownloading && downloadProgress?.status !== "error" && (
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); handleDownloadKernel(); }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  下载 Chromium
                </Button>
              </div>
            )}
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
          <CardDescription>
            保存账号密码以自动填充登录表单
            {storedCredentials && <Badge variant="outline" className="ml-2">已保存</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">学号</Label>
              <Input 
                id="username" 
                placeholder="请输入学号" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder={storedCredentials ? "已保存（输入新密码以更新）" : "请输入密码"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSaveCredentials}
              disabled={isSavingCredentials || !username || !password}
            >
              {isSavingCredentials ? "保存中..." : "保存凭据"}
            </Button>
            {storedCredentials && (
              <>
                <Button
                  variant="outline"
                  onClick={handleAutoFill}
                  disabled={!isCheckingLogin}
                >
                  自动填充
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={handleDeleteCredentials}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除凭据
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            凭据将安全存储在系统密钥链中，不会以明文形式保存
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
