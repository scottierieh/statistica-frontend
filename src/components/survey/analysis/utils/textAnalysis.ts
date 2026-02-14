export interface TextAnalysisResult {
    wordFreq: [string, number][];
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
      overall: 'Positive' | 'Negative' | 'Neutral';
    };
    stats: {
      totalResponses: number;
      avgLength: number;
      maxLength: number;
      minLength: number;
      totalChars: number;
      totalWords: number;
      avgWords: number;
    };
  }
  
  // Enhanced text analysis function
  export const analyzeTextResponses = (texts: string[]): TextAnalysisResult | null => {
      if (texts.length === 0) return null;
      
      const allText = texts.join(' ').toLowerCase();
      const words = allText.match(/\b[a-z]+\b/g) || [];
      const stopWords = new Set([
          'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 
          'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 
          'from', 'be', 'are', 'was', 'were', 'been'
      ]);
      
      const wordFreq: {[key: string]: number} = {};
      words.forEach(word => {
          if (!stopWords.has(word) && word.length > 2) {
              wordFreq[word] = (wordFreq[word] || 0) + 1;
          }
      });
      
      const sortedWords = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20) as [string, number][];
      
      const positiveWords = [
          'good', 'great', 'excellent', 'amazing', 'love', 
          'perfect', 'best', 'wonderful', 'fantastic', 'happy'
      ];
      const negativeWords = [
          'bad', 'poor', 'terrible', 'hate', 'worst', 
          'awful', 'horrible', 'disappointed', 'frustrating', 'angry'
      ];
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      words.forEach(word => {
          if (positiveWords.includes(word)) positiveCount++;
          if (negativeWords.includes(word)) negativeCount++;
      });
      
      const lengths = texts.map(t => t.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const maxLength = Math.max(...lengths);
      const minLength = Math.min(...lengths);
      
      const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
      const totalWords = texts.reduce((sum, text) => sum + text.split(/\s+/).length, 0);
      
      return {
          wordFreq: sortedWords,
          sentiment: {
              positive: positiveCount,
              negative: negativeCount,
              neutral: words.length - positiveCount - negativeCount,
              overall: positiveCount > negativeCount ? 'Positive' : negativeCount > positiveCount ? 'Negative' : 'Neutral'
          },
          stats: {
              totalResponses: texts.length,
              avgLength,
              maxLength,
              minLength,
              totalChars,
              totalWords,
              avgWords: Math.round(totalWords / texts.length)
          }
      };
  };
  