import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, RefreshCw, LogIn } from "lucide-react";
import { 
  GetAppState, 
  GetConfig, 
  StartLoginFlow, 
  CheckLoginStatus, 
  ValidateSession,
  StartMonitoring,
  StopMonitoring,
  PauseMonitoring,
  ResumeMonitoring,
  GetMonitorStatus,
  GetCurrentResults,
  CheckNow
} from "../../wailsjs/go/main/App";
import { appstate, config, monitor, parser } from "../../wailsjs/go/models";

export function DashboardPage() {
  const [appState, setAppState] = useState<appstate.AppState | null>(null);
  const [appConfig, setAppConfig] = useState<config.AppConfig | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<monitor.MonitorStatus | null>(null);
  const [currentResults, setCurrentResults] = useState<parser.ParsedResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);

  const fetchState = async () => {
    try {
      const [state, cfg, status, results] = await Promise.all([
        GetAppState(),
        GetConfig(),
        GetMonitorStatus(),
        GetCurrentResults()
      ]);
      setAppState(state);
      setAppConfig(cfg);
      setMonitorStatus(status);
      setCurrentResults(results);
    } catch (err) {
      console.error("Failed to fetch state:", err);
    }
  };

  useEffect(() => {
    fetchState();
    // Poll for state changes every 2 seconds
    const interval = setInterval(fetchState, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartLogin = async () => {
    setIsLoading(true);
    try {
      await StartLoginFlow();
      // Start checking for login success
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
        await fetchState();
      }
    } catch (err) {
      console.error("Failed to check login:", err);
    }
  };

  const handleValidateSession = async () => {
    setIsLoading(true);
    try {
      await ValidateSession();
      await fetchState();
    } catch (err) {
      console.error("Failed to validate session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMonitoring = async () => {
    setIsLoading(true);
    try {
      await StartMonitoring();
      await fetchState();
    } catch (err) {
      console.error("Failed to start monitoring:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setIsLoading(true);
    try {
      await StopMonitoring();
      await fetchState();
    } catch (err) {
      console.error("Failed to stop monitoring:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseMonitoring = async () => {
    try {
      await PauseMonitoring();
      await fetchState();
    } catch (err) {
      console.error("Failed to pause monitoring:", err);
    }
  };

  const handleResumeMonitoring = async () => {
    try {
      await ResumeMonitoring();
      await fetchState();
    } catch (err) {
      console.error("Failed to resume monitoring:", err);
    }
  };

  const handleCheckNow = async () => {
    setIsLoading(true);
    try {
      await CheckNow();
      await fetchState();
    } catch (err) {
      console.error("Failed to check now:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-check login status when checking
  useEffect(() => {
    if (!isCheckingLogin) return;
    const interval = setInterval(handleCheckLogin, 2000);
    return () => clearInterval(interval);
  }, [isCheckingLogin]);

  const getStateBadge = () => {
    const state = appState?.state || "idle";
    switch (state) {
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

  const getMonitorStateBadge = () => {
    const state = monitorStatus?.state || "stopped";
    switch (state) {
      case "stopped":
        return <Badge variant="secondary">已停止</Badge>;
      case "starting":
        return <Badge variant="outline">启动中</Badge>;
      case "running":
        return <Badge className="bg-green-500">运行中</Badge>;
      case "paused":
        return <Badge variant="outline">已暂停</Badge>;
      case "error":
        return <Badge variant="destructive">错误</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  const formatTime = (time: any) => {
    if (!time) return "-";
    try {
      const date = new Date(time);
      if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "-";
      return date.toLocaleString("zh-CN");
    } catch {
      return "-";
    }
  };

  const browserMode = appConfig?.browserMode === "system" ? "系统浏览器" : "下载内核";
  const notificationMethod = appConfig?.barkEnabled ? "Bark" : "无";
  const isMonitorRunning = monitorStatus?.state === "running";
  const isMonitorPaused = monitorStatus?.state === "paused";

  const renderResultsSummary = () => {
    if (!currentResults || !currentResults.reviews || currentResults.reviews.length === 0) {
      return <p className="text-sm text-muted-foreground">暂无结果，请先登录并开始监控</p>;
    }

    return (
      <div className="space-y-2">
        {currentResults.reviews.map((review, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="font-medium">专家{index + 1}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{review.overallEvaluation}</Badge>
              <Badge className="bg-green-500">{review.reviewResult}</Badge>
            </div>
          </div>
        ))}
        {currentResults.finalResult && (
          <div className="pt-2 mt-2 border-t">
            <p className="text-sm font-medium">{currentResults.finalResult}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground">盲审结果监控状态</p>
        </div>
        <div className="flex items-center gap-2">
          {getStateBadge()}
          {getMonitorStateBadge()}
        </div>
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
                <span>{formatTime(monitorStatus?.lastCheckTime || appState?.lastCheckTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">下次检查</span>
                <span>{formatTime(monitorStatus?.nextCheckTime || appState?.nextCheckTime)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">检查次数</span>
                <span>{monitorStatus?.checkCount || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">会话状态</span>
                <span>{appState?.sessionValid ? "有效" : "无效或过期"}</span>
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">刷新间隔</span>
                <span>{appConfig?.refreshIntervalSec || 300}秒</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">浏览器检测</span>
                <span>{appState?.browserDetected ? "已检测到" : "未检测到"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(appState?.lastError || monitorStatus?.lastError) && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">错误信息</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{monitorStatus?.lastError || appState?.lastError}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">最近结果</CardTitle>
          <CardDescription>最近一次解析的盲审结果摘要</CardDescription>
        </CardHeader>
        <CardContent>
          {renderResultsSummary()}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {!isMonitorRunning && !isMonitorPaused ? (
          <Button 
            className="flex items-center gap-2" 
            onClick={handleStartMonitoring}
            disabled={!appState?.sessionValid || isLoading}
          >
            <Play className="h-4 w-4" />
            开始监控
          </Button>
        ) : (
          <Button 
            variant="destructive"
            className="flex items-center gap-2"
            onClick={handleStopMonitoring}
            disabled={isLoading}
          >
            <Square className="h-4 w-4" />
            停止监控
          </Button>
        )}

        {isMonitorRunning && (
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handlePauseMonitoring}
          >
            <Pause className="h-4 w-4" />
            暂停
          </Button>
        )}

        {isMonitorPaused && (
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleResumeMonitoring}
          >
            <Play className="h-4 w-4" />
            恢复
          </Button>
        )}

        {(isMonitorRunning || isMonitorPaused) && (
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCheckNow}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            立即检查
          </Button>
        )}

        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={handleStartLogin}
          disabled={isLoading || isMonitorRunning}
        >
          <LogIn className="h-4 w-4" />
          {isCheckingLogin ? "等待登录..." : "打开登录窗口"}
        </Button>

        <Button 
          variant="ghost" 
          className="flex items-center gap-2"
          onClick={handleValidateSession}
          disabled={isLoading || isMonitorRunning}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          验证会话
        </Button>
      </div>
    </div>
  );
}
