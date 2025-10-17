
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, ArrowLeft, LifeBuoy, CreditCard, UserCircle, BrainCircuit, Wrench, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const faqCategories = [
    {
        category: "🧭 이용 방법",
        icon: LifeBuoy,
        items: [
            {
                question: "Skarii 서비스는 어떻게 이용하나요?",
                answer: "Skarii는 간단한 3단계로 이용할 수 있습니다. 1) 데이터를 업로드하고, 2) 원하는 분석을 선택한 후, 3) AI가 생성한 결과와 리포트를 확인하세요. 설문조사 기능도 동일하게 설문 생성, 배포, 분석의 흐름으로 진행됩니다."
            },
            {
                question: "분석 결과를 어떻게 해석해야 하나요?",
                answer: "각 분석 결과에는 AI가 생성한 해석 가이드가 함께 제공됩니다. 통계적 유의성, 주요 발견, 그리고 실행 가능한 인사이트를 포함하여 데이터 기반 의사결정을 돕습니다."
            }
        ]
    },
    {
        category: "💳 결제 관련",
        icon: CreditCard,
        items: [
            {
                question: "무료와 유료 플랜의 차이점은 무엇인가요?",
                answer: "무료 플랜은 핵심적인 통계 분석과 설문 기능을 제공하여 Skarii의 강력함을 경험할 수 있습니다. 유료 플랜(Pro)은 Conjoint, IPA, 고급 시뮬레이션 등 모든 전문 분석 기능, API 접근, 팀 협업, 우선 지원 등 전문가를 위한 모든 기능을 포함합니다."
            },
            {
                question: "구독은 어떻게 변경하거나 취소할 수 있나요?",
                answer: "계정 설정 페이지에서 언제든지 구독 플랜을 변경하거나 취소할 수 있습니다. 변경 사항은 다음 결제 주기에 반영됩니다."
            }
        ]
    },
    {
        category: "🧾 계정 / 로그인",
        icon: UserCircle,
        items: [
            {
                question: "비밀번호를 잊어버렸습니다.",
                answer: "로그인 페이지에서 '비밀번호 찾기' 링크를 클릭하고 이메일 주소를 입력하세요. 비밀번호 재설정을 위한 안내 메일을 보내드립니다."
            },
            {
                question: "회원가입은 어떻게 하나요?",
                answer: "메인 페이지의 'Sign Up' 버튼을 통해 간단한 정보 입력으로 회원가입을 완료할 수 있습니다. 구글 계정을 통한 간편 가입도 지원합니다."
            }
        ]
    },
    {
        category: "🧠 데이터 / 통계 기능",
        icon: BrainCircuit,
        items: [
            {
                question: "어떤 종류의 데이터를 업로드할 수 있나요?",
                answer: "CSV, TSV, 그리고 Excel (.xls, .xlsx) 등 일반적인 데이터 형식을 지원합니다. 데이터를 업로드하면 플랫폼이 자동으로 변수 유형을 감지하고 분석을 준비합니다."
            },
            {
                question: "어떤 분석들이 자동으로 지원되나요?",
                answer: "기초 통계, T-검정, ANOVA, 회귀분석, 요인분석, 신뢰도 분석부터 Conjoint, IPA, TURF와 같은 고급 시장 조사 분석까지 40가지 이상의 통계 분석을 지원합니다."
            }
        ]
    },
    {
        category: "🛠️ 기술적 오류",
        icon: Wrench,
        items: [
            {
                question: "분석 결과가 보이지 않거나 오류가 발생합니다.",
                answer: "먼저 데이터 형식이 올바른지, 변수 선택이 올바르게 되었는지 확인해주세요. 문제가 지속될 경우, 페이지를 새로고침하거나 잠시 후 다시 시도해보세요. 계속해서 문제가 발생하면 고객 지원팀에 문의해주시기 바랍니다."
            }
        ]
    },
    {
        category: "📞 문의 / 지원",
        icon: MessageSquare,
        items: [
            {
                question: "추가 문의는 어디로 해야 하나요?",
                answer: "페이지 하단의 'Contact Us' 링크를 통해 문의사항을 접수해주시면, 최대한 빠르게 답변드리겠습니다. Pro 플랜 사용자는 우선적으로 지원받으실 수 있습니다."
            }
        ]
    }
];


export default function FaqPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 dark:bg-slate-950/80 dark:border-slate-800">
        <div className="w-full max-w-6xl mx-auto flex items-center">
            <div className="flex-1 flex justify-start items-center gap-4">
                <Button variant="outline" asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Home</Link></Button>
            </div>
             <Link href="/" className="flex items-center justify-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-headline font-bold">Skarii</h1>
            </Link>
            <div className="flex-1 flex justify-end items-center gap-4">
                {/* This div is to balance the flex layout */}
            </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-20 lg:py-24">
        <div className="text-center mb-12">
            <div className="inline-block p-4 bg-primary/10 rounded-xl mb-4">
                <LifeBuoy className="w-10 h-10 text-primary"/>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Frequently Asked Questions</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about Skarii's features, pricing, and security.
            </p>
        </div>

        <div className="space-y-8">
            {faqCategories.map((category) => (
                <Card key={category.category}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <category.icon className="w-6 h-6 text-primary" />
                            {category.category}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Accordion type="single" collapsible className="w-full">
                            {category.items.map((item, index) => (
                              <AccordionItem key={`item-${index}`} value={`item-${index}`}>
                                <AccordionTrigger className="text-left font-semibold text-base">{item.question}</AccordionTrigger>
                                <AccordionContent className="text-base text-muted-foreground pt-2">
                                  {item.answer}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            ))}
        </div>
      </main>

       <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/40 dark:bg-slate-900/50 dark:border-slate-800">
        <p className="text-xs text-muted-foreground">
          &copy; 2024 Skarii. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Terms of Service</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
