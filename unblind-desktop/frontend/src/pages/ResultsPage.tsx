import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";

type ReviewResult = {
  expertName: string;
  reviewTime: string;
  overallEvaluation: string;
  reviewResult: string;
  remark: string;
};

const mockResults: ReviewResult[] = [
  {
    expertName: "专家1",
    reviewTime: "2026-04-10 14:30",
    overallEvaluation: "A（优秀）",
    reviewResult: "同意答辩",
    remark: "",
  },
  {
    expertName: "专家2",
    reviewTime: "2026-04-11 09:15",
    overallEvaluation: "B（良好）",
    reviewResult: "同意答辩",
    remark: "",
  },
];

export function ResultsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">结果与历史</h1>
        <p className="text-muted-foreground">查看当前盲审结果和历史记录</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>当前结果</CardTitle>
          <CardDescription>最近一次提取的盲审评审结果</CardDescription>
        </CardHeader>
        <CardContent>
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
              {mockResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{result.expertName}</TableCell>
                  <TableCell>{result.reviewTime}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{result.overallEvaluation}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500">{result.reviewResult}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {result.remark || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">最终判定结果：同意答辩</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            历史快照
          </CardTitle>
          <CardDescription>结果变化的历史记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">2026-04-11 09:15:32</p>
                <p className="text-xs text-muted-foreground">专家2 提交评审结果</p>
              </div>
              <Badge variant="outline">最新</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">2026-04-10 14:30:18</p>
                <p className="text-xs text-muted-foreground">专家1 提交评审结果</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
