import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, Square, RefreshCw, LogIn, Loader2 } from "lucide-react";
import { EventsOn, EventsOff } from "../../wailsjs/runtime/runtime";
import {
  GetAppState,
  GetConfig,
  StartLoginFlow,
  CheckLoginStatus,
  CloseBrowser,
  ValidateSession,
  StartMonitoring,
  StopMonitoring,
  PauseMonitoring,
  ResumeMonitoring,
  GetMonitorStatus,
  GetCurrentResults,
  CheckNow,
} from "../../wailsjs/go/main/App";
import { appstate, config, monitor, parser } from "../../wailsjs/go/models";

export function DashboardPage() {
  const [appState, setAppState] = useState<appstate.AppState | null>(null);
  const [appConfig, setAppConfig] = useState<config.AppConfig | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<monitor.MonitorStatus | null>(null);
  const [currentResults, setCurrentResults] = useState<parser.ParsedResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const loginCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all state from backend
  const fetchState = useCallback(async () => {
    try {
      const [state, cfg, status, results] = await Promise.all([
        GetAppState(),
        GetConfig(),
        GetMonitorStatus(),
        GetCurrentResults(),
      ]);
      setAppState(state);
      setAppConfig(cfg);
      setMonitorStatus(status);
      if (results) setCurrentResults(results);
    } catch (err) {
      console.error("Failed to fetch state:", err);
    }
  }, []);

  // Initial fetch + fallback polling (5s since we have events now)
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  // Subscribe to Wails events for real-time updates
  useEffect(() => {
    const offStatus = EventsOn("monitor:status-changed", (status: monitor.MonitorStatus) => {
      setMonitorStatus(status);
      // Also refresh app state when monitor status changes
      GetAppState().then(setAppState).catch(console.error);
    });

    const offResults = EventsOn("monitor:results-updated", (results: parser.ParsedResults) => {
      if (results) setCurrentResults(results);
    });

    const offCheck = EventsOn("monitor:check-complete", (results: parser.ParsedResults) => {
      if (results) setCurrentResults(results);
      // Refresh monitor status to get updated check times
      GetMonitorStatus().then(setMonitorStatus).catch(console.error);
    });

    return () => {
      if (offStatus) offStatus();
      if (offResults) offResults();
      if (offCheck) offCheck();
      // Fallback cleanup
      EventsOff("monitor:status-changed");
      EventsOff("monitor:results-updated");
      EventsOff("monitor:check-complete");
    };
  }, []);

  // Login check polling — polls CheckLoginStatus when login window is open
  useEffect(() => {
    if (!isCheckingLogin) {
      if (loginCheckRef.current) {
        clearInterval(loginCheckRef.current);
        loginCheckRef.current = null;
      }
      return;
    }

    loginCheckRef.current = setInterval(async () => {
      try {
        const success = await CheckLoginStatus();
        if (success) {
          // DO NOT auto-close the browser.
          // Keep polling to continually save any new cookies the site issues.
          setStatusMessage("✅ 登录成功！系统正在后台同步会话。您可以手动关闭浏览器窗口。");
          await fetchState();
        }
      } catch (err) {
        // If an error is thrown, it typically means the browser window was closed
        // manually by the user or the context was canceled.
        console.log("Browser window closed or context ended:", err);
        setIsCheckingLogin(false);
        setStatusMessage("");
        await fetchState();
      }
    }, 2000);

    return () => {
      if (loginCheckRef.current) {
        clearInterval(loginCheckRef.current);
        loginCheckRef.current = null;
      }
    };
  }, [isCheckingLogin, fetchState]);

  // ==================== Handlers ====================

  const handleStartLogin = async () => {
    setIsLoading(true);
    try {
      await StartLoginFlow();
      setIsCheckingLogin(true);
      setStatusMessage("等待登录...");
    } catch (err) {
      console.error("Failed to start login:", err);
    } finally {
      setIsLoading(false);
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
      console.error("Failed to pause:", err);
    }
  };

  const handleResumeMonitoring = async () => {
    try {
      await ResumeMonitoring();
      await fetchState();
    } catch (err) {
      console.error("Failed to resume:", err);
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

  // ==================== Helpers ====================

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

  const getStateBadge = () => {
    const state = appState?.state || "idle";
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      idle: { label: "空闲", variant: "secondary" },
      needs_login: { label: "需要登录", variant: "destructive" },
      ready: { label: "就绪", variant: "outline" },
      running: { label: "运行中", variant: "default" },
      session_expired: { label: "会话过期", variant: "destructive" },
      error: { label: "错误", variant: "destructive" },
    };
    const info = map[state] || { label: "未知", variant: "secondary" as const };
    return (
      <Badge
        variant={info.variant === "default" ? undefined : info.variant}
        className={state === "running" ? "bg-green-500 hover:bg-green-600" : ""}
      >
        {info.label}
      </Badge>
    );
  };

  const getMonitorBadge = () => {
    const state = monitorStatus?.state || "stopped";
    const map: Record<string, { label: string; className: string }> = {
      stopped: { label: "已停止", className: "" },
      starting: { label: "启动中", className: "" },
      running: { label: "监控中", className: "bg-green-500 hover:bg-green-600" },
      paused: { label: "已暂停", className: "bg-yellow-500 hover:bg-yellow-600" },
      error: { label: "错误", className: "bg-red-500 hover:bg-red-600" },
    };
    const info = map[state] || { label: "未知", className: "" };
    return (
      <Badge variant={info.className ? undefined : "secondary"} className={info.className}>
        {info.label}
      </Badge>
    );
  };

  const getResultBadgeClass = (result: string) => {
    if (!result) return "bg-gray-400";
    if (result.includes("同意") || result.includes("通过")) return "bg-green-500 hover:bg-green-600";
    if (result.includes("不同意") || result.includes("不通过") || result.includes("修改")) return "bg-red-500 hover:bg-red-600";
    return "bg-yellow-500 hover:bg-yellow-600";
  };

  const isMonitorRunning = monitorStatus?.state === "running";
  const isMonitorPaused = monitorStatus?.state === "paused";
  const isMonitorActive = isMonitorRunning || isMonitorPaused;
  const hasResults = currentResults?.reviews && currentResults.reviews.length > 0;

  return (
    <div className="space-y-4">
      {/* ===== Compact Status Bar ===== */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">仪表盘</h1>
          {getStateBadge()}
          {getMonitorBadge()}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>上次: {formatTime(monitorStatus?.lastCheckTime || appState?.lastCheckTime)}</span>
          <span className="text-muted-foreground/40">|</span>
          <span>下次: {formatTime(monitorStatus?.nextCheckTime || appState?.nextCheckTime)}</span>
          <span className="text-muted-foreground/40">|</span>
          <span>已检查: {monitorStatus?.checkCount || 0}次</span>
        </div>
      </div>

      {/* ===== Status Message / Transition Banner ===== */}
      {(statusMessage || isTransitioning) && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{statusMessage || "处理中..."}</span>
        </div>
      )}

      {/* ===== Error Banner ===== */}
      {(appState?.lastError || monitorStatus?.lastError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {monitorStatus?.lastError || appState?.lastError}
        </div>
      )}

      {/* ===== Control Buttons ===== */}
      <div className="flex gap-2 flex-wrap">
        {!isMonitorActive ? (
          <Button
            size="sm"
            className="flex items-center gap-1"
            onClick={handleStartMonitoring}
            disabled={!appState?.sessionValid || isLoading || isTransitioning}
          >
            <Play className="h-3.5 w-3.5" />
            开始监控
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="flex items-center gap-1"
            onClick={handleStopMonitoring}
            disabled={isLoading}
          >
            <Square className="h-3.5 w-3.5" />
            停止监控
          </Button>
        )}

        {isMonitorRunning && (
          <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={handlePauseMonitoring}>
            <Pause className="h-3.5 w-3.5" />
            暂停
          </Button>
        )}

        {isMonitorPaused && (
          <Button size="sm" variant="outline" className="flex items-center gap-1" onClick={handleResumeMonitoring}>
            <Play className="h-3.5 w-3.5" />
            恢复
          </Button>
        )}

        {isMonitorActive && (
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
            onClick={handleCheckNow}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            立即检查
          </Button>
        )}

        <div className="flex-1" />

        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
          onClick={handleStartLogin}
          disabled={isLoading || isMonitorActive || isCheckingLogin || isTransitioning}
        >
          <LogIn className="h-3.5 w-3.5" />
          {isCheckingLogin ? "等待登录..." : "登录"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="flex items-center gap-1"
          onClick={handleValidateSession}
          disabled={isLoading || isMonitorActive}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          验证会话
        </Button>
      </div>

      {/* ===== Results Area (Primary Focus) ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">盲审结果</CardTitle>
            {hasResults && (
              <span className="text-xs text-muted-foreground">
                更新于 {formatTime(currentResults?.extractTime)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasResults ? (
            <div className="space-y-4">
              {/* Final result banner */}
              {currentResults!.finalResult && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <span className="text-sm font-medium">最终结果：</span>
                  <span className="text-sm font-bold ml-1">{currentResults!.finalResult}</span>
                </div>
              )}

              {/* Results table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">专家</TableHead>
                    <TableHead>评阅时间</TableHead>
                    <TableHead>总体评价</TableHead>
                    <TableHead>评阅结果</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentResults!.reviews.map((review, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {review.expertName || `专家${index + 1}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {review.reviewTime || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.overallEvaluation || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getResultBadgeClass(review.reviewResult)}>
                          {review.reviewResult || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {review.remark || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              {isMonitorActive ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-sm">正在等待第一次检查结果...</p>
                </>
              ) : appState?.sessionValid ? (
                <>
                  <RefreshCw className="h-8 w-8 mb-3 opacity-40" />
                  <p className="text-sm">会话有效，点击"开始监控"获取盲审结果</p>
                </>
              ) : (
                <>
                  <LogIn className="h-8 w-8 mb-3 opacity-40" />
                  <p className="text-sm">请先登录浙大研究生系统</p>
                  <p className="text-xs mt-1">点击"登录"按钮打开浏览器窗口</p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Compact Info Row ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 border rounded-lg">
          <p className="text-xs text-muted-foreground">浏览器</p>
          <p className="text-sm font-medium mt-0.5">
            {appConfig?.browserMode === "downloaded" ? "下载内核" : "系统浏览器"}
          </p>
        </div>
        <div className="p-3 border rounded-lg">
          <p className="text-xs text-muted-foreground">通知</p>
          <p className="text-sm font-medium mt-0.5">{appConfig?.barkEnabled ? "Bark" : "未启用"}</p>
        </div>
        <div className="p-3 border rounded-lg">
          <p className="text-xs text-muted-foreground">刷新间隔</p>
          <p className="text-sm font-medium mt-0.5">{appConfig?.refreshIntervalSec || 300}秒</p>
        </div>
        <div className="p-3 border rounded-lg">
          <p className="text-xs text-muted-foreground">会话</p>
          <p className="text-sm font-medium mt-0.5">{appState?.sessionValid ? "有效" : "无效"}</p>
        </div>
      </div>
    </div>
  );
}
