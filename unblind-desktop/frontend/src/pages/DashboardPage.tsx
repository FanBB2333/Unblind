import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RefreshCw, LogIn } from "lucide-react";

type AppState = "idle" | "needs_login" | "ready" | "running" | "session_expired" | "error";

type DashboardProps = {
  appState?: AppState;
  lastCheckTime?: string;
  nextCheckTime?: string;
  browserMode?: string;
  notificationMethod?: string;
  resultSummary?: string;
};

export function DashboardPage({
  appState = "idle",
  lastCheckTime = "-",
  nextCheckTime = "-",
  browserMode = "系统浏览器",
  notificationMethod = "Bark",
  resultSummary = "暂无结果",
}: DashboardProps) {
  const getStateBadge = () => {
    switch (appState) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground">盲审结果监控状态</p>
        </div>
        {getStateBadge()}
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
                <span>{lastCheckTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">下次检查</span>
                <span>{nextCheckTime}</span>
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">最近结果</CardTitle>
          <CardDescription>最近一次解析的盲审结果摘要</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{resultSummary}</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          开始监控
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Pause className="h-4 w-4" />
          暂停
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          重新登录
        </Button>
        <Button variant="ghost" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          刷新状态
        </Button>
      </div>
    </div>
  );
}
