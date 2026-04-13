import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, FileText, Download, Save, Copy, Check } from "lucide-react";
import { GetConfig, SaveConfig, GenerateDiagnosticReport, ExportDiagnosticReport, GetDiagnosticReportAsString, GetDefaultDiagnosticPath } from "../../wailsjs/go/main/App";
import { config, diagnostics } from "../../wailsjs/go/models";

export function SettingsPage() {
  const [appConfig, setAppConfig] = useState<config.AppConfig | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(300);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [copied, setCopied] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<diagnostics.DiagnosticReport | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "[启动] 应用已启动",
    "[配置] 配置加载完成",
  ]);

  const fetchConfig = async () => {
    try {
      const cfg = await GetConfig();
      setAppConfig(cfg);
      setRefreshInterval(cfg.refreshIntervalSec || 300);
      setLogs(prev => [...prev, `[配置] 刷新间隔: ${cfg.refreshIntervalSec}秒`]);
    } catch (err) {
      console.error("Failed to fetch config:", err);
      setLogs(prev => [...prev, `[错误] 加载配置失败: ${err}`]);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchDefaultExportPath();
    handleRefreshDiagnostics();
  }, []);

  const fetchDefaultExportPath = async () => {
    try {
      const path = await GetDefaultDiagnosticPath();
      setExportPath(path);
    } catch (err) {
      console.error("Failed to get default export path:", err);
    }
  };

  const handleSave = async () => {
    if (!appConfig) return;
    setIsSaving(true);
    try {
      const newConfig = new config.AppConfig({
        ...appConfig,
        refreshIntervalSec: refreshInterval,
      });
      await SaveConfig(newConfig);
      await fetchConfig();
      setLogs(prev => [...prev, `[配置] 已保存刷新间隔: ${refreshInterval}秒`]);
    } catch (err) {
      console.error("Failed to save config:", err);
      setLogs(prev => [...prev, `[错误] 保存配置失败: ${err}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAutoResume = async (enabled: boolean) => {
    if (!appConfig) return;
    try {
      const newConfig = new config.AppConfig({
        ...appConfig,
        autoResumeMonitoring: enabled,
      });
      await SaveConfig(newConfig);
      await fetchConfig();
      setLogs(prev => [...prev, `[配置] 自动恢复: ${enabled ? "已启用" : "已禁用"}`]);
    } catch (err) {
      console.error("Failed to toggle auto resume:", err);
    }
  };

  const handleExportDiagnostics = async () => {
    setIsExporting(true);
    try {
      await ExportDiagnosticReport(exportPath);
      setLogs(prev => [...prev, `[诊断] 已导出至: ${exportPath}`]);
      // Refresh report for display
      const report = await GenerateDiagnosticReport();
      setDiagnosticReport(report);
    } catch (err) {
      console.error("Failed to export diagnostics:", err);
      setLogs(prev => [...prev, `[错误] 导出诊断信息失败: ${err}`]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyDiagnostics = async () => {
    try {
      const reportStr = await GetDiagnosticReportAsString();
      await navigator.clipboard.writeText(reportStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setLogs(prev => [...prev, `[诊断] 已复制到剪贴板`]);
    } catch (err) {
      console.error("Failed to copy diagnostics:", err);
      setLogs(prev => [...prev, `[错误] 复制诊断信息失败: ${err}`]);
    }
  };

  const handleRefreshDiagnostics = async () => {
    try {
      const report = await GenerateDiagnosticReport();
      setDiagnosticReport(report);
    } catch (err) {
      console.error("Failed to refresh diagnostics:", err);
    }
  };

  const getLogTimestamp = () => {
    return new Date().toLocaleTimeString("zh-CN");
  };

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
            <div className="flex gap-2">
              <Input
                id="refresh-interval"
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 60)}
                min={60}
                className="w-32"
              />
              <Button 
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                保存
              </Button>
            </div>
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
            <Switch 
              id="auto-resume"
              checked={appConfig?.autoResumeMonitoring || false}
              onCheckedChange={handleToggleAutoResume}
            />
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
            {logs.map((log, idx) => (
              <p key={idx}>[{getLogTimestamp()}] {log}</p>
            ))}
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
              <p className="font-medium">{diagnosticReport?.version || "1.0.0"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">平台</p>
              <p className="font-medium">{diagnosticReport?.platform?.os || "unknown"}/{diagnosticReport?.platform?.arch || "unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">数据目录</p>
              <p className="font-medium text-xs">~/.unblind</p>
            </div>
            <div>
              <p className="text-muted-foreground">刷新间隔</p>
              <p className="font-medium">{appConfig?.refreshIntervalSec || 300}秒</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="export-path">导出路径</Label>
            <Input
              id="export-path"
              value={exportPath}
              onChange={(e) => setExportPath(e.target.value)}
              placeholder="选择导出路径"
              className="text-xs"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExportDiagnostics}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "导出中..." : "导出诊断信息"}
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleCopyDiagnostics}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : "复制到剪贴板"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRefreshDiagnostics}
            >
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
