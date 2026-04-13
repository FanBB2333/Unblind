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
