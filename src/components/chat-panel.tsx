'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  className?: string;
}

export default function ChatPanel({ messages, onSendMessage, isLoading, className }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            <AnimatePresence>
              {messages.length === 0 && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                    <p className="text-sm mb-2">
                      I can help you understand and use these results.
                    </p>

                    <p className="text-sm mb-1">You can ask me to:</p>

                    <ul className="text-sm list-disc pl-4 mb-2">
                      <li>Explain the results in clear, simple terms</li>
                      <li>Interpret statistical values and key findings</li>
                      <li>
                        Write a report or summary in a format you need
                        (e.g., APA, presentation-ready)
                      </li>
                      <li>Suggest how these results can be applied in practice</li>
                    </ul>

                    <p className="text-sm mb-1">Example questions:</p>

                    <ul className="text-sm list-disc pl-4">
                      <li>“What do these results mean?”</li>
                      <li>“How should I explain this in a report or presentation?”</li>
                      <li>“What are the key takeaways I should focus on?”</li>
                    </ul>

                    </div>
                  </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className={cn(
                      'flex items-start gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'model' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <div className="text-sm prose dark:prose-invert max-w-none">
                         <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                   <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI is typing...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4">
        <div className="flex w-full items-center gap-2">
          <Input
            type="text"
            placeholder="Ask a question about the results..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}