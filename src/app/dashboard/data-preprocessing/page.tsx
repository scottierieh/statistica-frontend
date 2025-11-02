
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DatabaseZap } from "lucide-react";

export default function DataPreprocessingPage() {
  return (
    <div className="flex flex-1 items-center justify-center h-full p-4 md:p-8">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <DatabaseZap className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">데이터 전처리</CardTitle>
          <CardDescription>
            이 기능은 현재 준비 중입니다. 데이터 정제, 변수 생성 등의 기능이 곧 추가될 예정입니다!
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">업데이트를 기대해주세요.</p>
        </CardContent>
      </Card>
    </div>
  );
}
