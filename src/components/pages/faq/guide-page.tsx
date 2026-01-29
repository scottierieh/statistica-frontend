'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function GuidePage() {
  return (
    <div className="relative flex w-full px-6 py-10">
      
      {/* MAIN CONTENT */}
      <main className="mx-auto w-full max-w-3xl pr-[18rem]">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <BookOpen className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="font-headline text-4xl">
              Help Center
            </CardTitle>
            <CardDescription className="text-lg mt-2 text-muted-foreground">
              Welcome! Find answers to your questions and learn how to use our platform effectively.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Use the sidebar to navigate through different topics or use the search bar to find specific articles.
            </p>

            <div className="flex justify-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  className="pl-9"
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* RIGHT FIXED TOC */}
      <aside className="fixed right-8 top-28 hidden xl:block w-64">
        <div className="rounded-lg border bg-background p-4 text-sm">
          <p className="font-semibold mb-2">On this page</p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="hover:text-foreground cursor-pointer">Overview</li>
            <li className="hover:text-foreground cursor-pointer">Navigation</li>
            <li className="hover:text-foreground cursor-pointer">Search</li>
          </ul>
        </div>
      </aside>

    </div>
  );
}
