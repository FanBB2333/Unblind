import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Trash2, RefreshCw } from "lucide-react";
import { GetCurrentResults, GetResultsHistory, ClearResultsHistory } from "../../wailsjs/go/main/App";
import { parser, storage } from "../../wailsjs/go/models";

export function ResultsPage() {
  const [currentResults, setCurrentResults] = useState<parser.ParsedResults | null>(null);
  const [history, setHistory] = useState<storage.HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [results, hist] = await Promise.all([
        GetCurrentResults(),
        GetResultsHistory()
      ]);
      setCurrentResults(results);
      setHistory(hist || []);
    } catch (err) {
      console.error("Failed to fetch results:", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = async () => {
    if (!confirm("确定要清除所有历史记录吗？")) return;
    setIsLoading(true);
    try {
      await ClearResultsHistory();
      await fetchData();
    } catch (err) {
      console.error("Failed to clear history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchData();
    } finally {
      setIsLoading(false);
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

  const hasResults = currentResults && currentResults.reviews && currentResults.reviews.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">结果与历史</h1>
          <p className="text-muted-foreground">查看当前盲审结果和历史记录</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>当前结果</CardTitle>
          <CardDescription>
            {hasResults 
              ? `提取时间: ${formatTime(currentResults?.extractTime)}`
              : "最近一次提取的盲审评审结果"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasResults ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>专家</TableHead>
                    <TableHead>评阅时间</TableHead>
                    <TableHead>总体评价</TableHead>
                    <TableHead>评阅结果</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentResults!.reviews.map((review, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{review.expertName || `专家${index + 1}`}</TableCell>
                      <TableCell>{review.reviewTime || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.overallEvaluation || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          review.reviewResult?.includes("同意") 
                            ? "bg-green-500" 
                            : "bg-yellow-500"
                        }>
                          {review.reviewResult || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {review.remark || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {currentResults!.finalResult && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{currentResults!.finalResult}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              暂无结果，请先登录并开始监控
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>历史快照</CardTitle>
            </div>
            {history.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClearHistory}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清除历史
              </Button>
            )}
          </div>
          <CardDescription>结果变化的历史记录</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((item, index) => (
                <div 
                  key={item.hash || index} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{formatTime(item.timestamp)}</p>
                    <p className="text-xs text-muted-foreground">{item.description || "结果更新"}</p>
                  </div>
                  {index === 0 && <Badge variant="outline">最新</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              暂无历史记录
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
