

'use client';

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu
} from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  BrainCircuit,
  FileText,
  Loader2,
  TrendingUp,
  Binary,
  GitBranch,
  Users,
  Layers,
  Container,
} from 'lucide-react';
import DeepLearningApp from './deep-learning-app';
import KnnRegressionPage from './pages/knn-regression-page';

type MLTaskType = 'regression' | 'classification' | 'tree' | 'unsupervised' | 'deep-learning' | 'knn-regression';

const MachineLearningContent = ({ activeTask }: { activeTask: MLTaskType }) => {
    switch (activeTask) {
        case 'deep-learning':
            return <DeepLearningApp />;
        case 'knn-regression':
            return <KnnRegressionPage />;
        case 'regression':
        case 'classification':
        case 'tree':
        case 'unsupervised':
        default:
            return (
                <div className="flex flex-1 items-center justify-center h-full">
                    <Card className="w-full max-w-2xl text-center">
                        <CardHeader>
                            <CardTitle className="font-headline capitalize">{activeTask.replace('-', ' ')}</CardTitle>
                            <CardDescription>
                                This machine learning tool is under construction.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Stay tuned for powerful new capabilities!</p>
                        </CardContent>
                    </Card>
                </div>
            );
    }
};

export default function MachineLearningApp() {
  const [activeTask, setActiveTask] = useState<MLTaskType>('knn-regression');
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <BrainCircuit className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-headline font-bold">Machine Learning</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('regression')}
                  isActive={activeTask === 'regression'}
                >
                  <TrendingUp />
                  <span>회귀 알고리즘</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <SidebarMenuButton
                      onClick={() => setActiveTask('knn-regression')}
                      isActive={activeTask === 'knn-regression'}
                      >
                      <Container />
                      <span>KNN 회귀</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('classification')}
                  isActive={activeTask === 'classification'}
                >
                  <Binary />
                  <span>분류 알고리즘</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('tree')}
                  isActive={activeTask === 'tree'}
                >
                  <GitBranch />
                  <span>트리 알고리즘</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('unsupervised')}
                  isActive={activeTask === 'unsupervised'}
                >
                  <Users />
                  <span>비지도 학습</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setActiveTask('deep-learning')}
                  isActive={activeTask === 'deep-learning'}
                >
                  <Layers />
                  <span>딥러닝</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <div className="p-4 md:p-6 h-full flex flex-col gap-4">
            <header className="flex items-center justify-between md:justify-end">
                <SidebarTrigger className="md:hidden"/>
                <h1 className="text-2xl font-headline font-bold md:hidden">Machine Learning</h1>
                <div />
            </header>
            
            <MachineLearningContent activeTask={activeTask} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
