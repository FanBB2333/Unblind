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
