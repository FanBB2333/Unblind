import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, FileText, Download, Save } from "lucide-react";
import { GetConfig, SaveConfig } from "../../wailsjs/go/main/App";
import { config } from "../../wailsjs/go/models";

export function SettingsPage() {
  const [appConfig, setAppConfig] = useState<config.AppConfig | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(300);
  const [isSaving, setIsSaving] = useState(false);
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
  }, []);

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
              <p className="font-medium">1.0.0-dev</p>
            </div>
            <div>
              <p className="text-muted-foreground">数据目录</p>
              <p className="font-medium text-xs">~/.unblind</p>
            </div>
            <div>
              <p className="text-muted-foreground">浏览器模式</p>
              <p className="font-medium">{appConfig?.browserMode === "system" ? "系统浏览器" : "下载内核"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">刷新间隔</p>
              <p className="font-medium">{appConfig?.refreshIntervalSec || 300}秒</p>
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2" disabled>
            <Download className="h-4 w-4" />
            导出诊断信息（未实现）
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
