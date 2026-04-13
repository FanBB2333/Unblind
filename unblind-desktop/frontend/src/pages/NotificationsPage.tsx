import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Send, Check, X } from "lucide-react";
import { GetConfig, SaveConfig } from "../../wailsjs/go/main/App";
import { config } from "../../wailsjs/go/models";

export function NotificationsPage() {
  const [appConfig, setAppConfig] = useState<config.AppConfig | null>(null);
  const [barkUrl, setBarkUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const fetchConfig = async () => {
    try {
      const cfg = await GetConfig();
      setAppConfig(cfg);
      setBarkUrl(cfg.barkBaseUrl || "");
    } catch (err) {
      console.error("Failed to fetch config:", err);
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
        barkBaseUrl: barkUrl,
      });
      await SaveConfig(newConfig);
      await fetchConfig();
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBark = async (enabled: boolean) => {
    if (!appConfig) return;
    try {
      const newConfig = new config.AppConfig({
        ...appConfig,
        barkEnabled: enabled,
      });
      await SaveConfig(newConfig);
      await fetchConfig();
    } catch (err) {
      console.error("Failed to toggle Bark:", err);
    }
  };

  const handleToggleSystem = async (enabled: boolean) => {
    if (!appConfig) return;
    try {
      const newConfig = new config.AppConfig({
        ...appConfig,
        systemNotificationEnabled: enabled,
      });
      await SaveConfig(newConfig);
      await fetchConfig();
    } catch (err) {
      console.error("Failed to toggle system notification:", err);
    }
  };

  const handleTestBark = async () => {
    setTestResult(null);
    if (!barkUrl) {
      setTestResult("error");
      return;
    }
    try {
      // Simple test - just try to fetch the bark URL
      const testUrl = `${barkUrl}/测试通知/这是一条来自Unblind的测试通知`;
      const response = await fetch(testUrl);
      if (response.ok) {
        setTestResult("success");
      } else {
        setTestResult("error");
      }
    } catch (err) {
      console.error("Failed to test Bark:", err);
      setTestResult("error");
    }
  };

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
            <Switch 
              id="bark-enabled" 
              checked={appConfig?.barkEnabled || false}
              onCheckedChange={handleToggleBark}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bark-url">Bark API 地址</Label>
            <div className="flex gap-2">
              <Input
                id="bark-url"
                placeholder="https://api.day.app/your-key"
                value={barkUrl}
                onChange={(e) => setBarkUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
              >
                保存
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              在 Bark App 中获取你的 API 地址，格式如: https://api.day.app/xxxxxx
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleTestBark}
            >
              <Send className="h-4 w-4" />
              发送测试通知
            </Button>
            {testResult === "success" && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" /> 发送成功
              </span>
            )}
            {testResult === "error" && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <X className="h-4 w-4" /> 发送失败
              </span>
            )}
          </div>
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
            <Switch 
              id="system-notification"
              checked={appConfig?.systemNotificationEnabled || false}
              onCheckedChange={handleToggleSystem}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            系统通知作为 Bark 的补充，在桌面显示通知横幅
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
