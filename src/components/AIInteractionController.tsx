'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import ChatPanel, { type ChatMessage } from './chat-panel';
import { getAiChatResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';

interface AIInteractionControllerProps {
  activeAnalysis: string;
  analysisResultForChat: any;
}

export default function AIInteractionController({ activeAnalysis, analysisResultForChat }: AIInteractionControllerProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const { toast } = useToast();

  const initializeChat = async () => {
    if (chatHistory.length > 0 || !analysisResultForChat) return;

    setIsAiThinking(true);
    try {
      const initialPrompt = "Briefly summarize the key findings from this analysis in 2-3 bullet points. Start with 'Here's a quick summary of your results:'";
      const response = await getAiChatResponse({
        analysisType: activeAnalysis,
        analysisData: JSON.stringify(analysisResultForChat, null, 2),
        history: [],
        newMessage: initialPrompt,
      });

      if (response.success && response.message) {
        const modelMessage: ChatMessage = { role: 'model', content: response.message };
        setChatHistory([modelMessage]);
      }
    } catch (e: any) {
      // Don't show toast for initial error, just fail silently.
      console.error("Failed to initialize chat:", e.message);
    } finally {
      setIsAiThinking(false);
    }
  };

  useEffect(() => {
    // Reset chat and initialize when context changes
    setChatHistory([]);
    if (isChatOpen && analysisResultForChat) {
      initializeChat();
    }
  }, [analysisResultForChat, isChatOpen]);


  const handleSendMessage = async (newMessage: string) => {
    if (!analysisResultForChat) {
      toast({
        variant: 'destructive',
        title: 'No Analysis Context',
        description: 'Please run an analysis before starting a chat.',
      });
      return;
    }

    const newUserMessage: ChatMessage = { role: 'user', content: newMessage };
    const newHistory = [...chatHistory, newUserMessage];
    setChatHistory(newHistory);
    setIsAiThinking(true);

    try {
      const response = await getAiChatResponse({
        analysisType: activeAnalysis,
        analysisData: JSON.stringify(analysisResultForChat, null, 2),
        history: chatHistory, // Send history before the new user message
        newMessage,
      });

      if (response.success && response.message) {
        const modelMessage: ChatMessage = { role: 'model', content: response.message };
        setChatHistory(prev => [...prev, modelMessage]);
      } else {
        throw new Error(response.error || 'Failed to get AI response.');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'AI Chat Error', description: e.message });
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {!analysisResultForChat && !isChatOpen && (
        <p className="text-xs text-muted-foreground bg-background/90 px-2 py-1 rounded-md shadow">
          Run an analysis to ask questions about the results
        </p>
      )}

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0"
          >
            <ChatPanel
              messages={chatHistory}
              onSendMessage={handleSendMessage}
              isLoading={isAiThinking}
              className="w-96 h-[500px] shadow-2xl rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="rounded-full w-14 h-14 shadow-lg"
        disabled={!analysisResultForChat}
        aria-label={isChatOpen ? "Close AI Chat" : "Open AI Chat"}
      >
        <AnimatePresence mode="wait">
          {isChatOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              exit={{ rotate: 90, scale: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              exit={{ rotate: -90, scale: 0 }}
            >
              <Bot className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </div>
  );
}
