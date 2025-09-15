import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter
import re
import string
import io
import base64
import warnings
import platform
import matplotlib.font_manager as fm
from pathlib import Path

# NLTK for English sentiment
try:
    import nltk
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    nltk.download('vader_lexicon', quiet=True)
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

# Konlpy for Korean sentiment
try:
    from konlpy.tag import Okt
    KONLPY_AVAILABLE = True
except ImportError:
    KONLPY_AVAILABLE = False

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, np.floating): return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    return obj

def get_font_path():
    """Find a suitable font on the system, prioritizing Korean fonts."""
    system = platform.system()
    
    font_paths_to_check = {
        'Windows': ['C:/Windows/Fonts/malgun.ttf'],
        'Darwin': ['/System/Library/Fonts/Apple SD Gothic Neo.ttc'],
        'Linux': ['/usr/share/fonts/truetype/nanum/NanumGothic.ttf']
    }
    
    if system in font_paths_to_check:
        for path in font_paths_to_check[system]:
            if Path(path).exists():
                return path

    # Fallback to matplotlib font manager
    try:
        font_list = fm.findSystemFonts(fontpaths=None, fontext='ttf')
        korean_fonts = [f for f in font_list if any(keyword in f.lower() for keyword in ['nanum', 'malgun', 'gothic'])]
        if korean_fonts:
            return korean_fonts[0]
    except Exception:
        pass
        
    return None


class SentimentAnalyzer:
    def __init__(self):
        self.font_path = get_font_path()
        if self.font_path:
            plt.rcParams['font.family'] = fm.FontProperties(fname=self.font_path).get_name()
        else:
            warnings.warn("No suitable Korean font found. Non-English characters may not render correctly.")
        
        plt.rcParams['axes.unicode_minus'] = False
        
        if NLTK_AVAILABLE:
            self.vader = SentimentIntensityAnalyzer()
        
        if KONLPY_AVAILABLE:
            self.okt = Okt()
        
        # Simple Korean sentiment dictionary
        self.korean_sentiment_dict = {
            '좋아': 1, '최고': 2, '만족': 1.5, '추천': 1.5, '훌륭': 2, '친절': 1,
            '나쁘지 않': 0.5, '괜찮': 0.5,
            '별로': -1, '실망': -1.5, '최악': -2, '불편': -1, '아쉽': -0.5, '늦': -1,
        }

    def analyze_english(self, text):
        scores = self.vader.polarity_scores(text)
        return scores['compound']

    def analyze_korean(self, text):
        tokens = self.okt.morphs(text, stem=True)
        score = 0
        for token in tokens:
            if token in self.korean_sentiment_dict:
                score += self.korean_sentiment_dict[token]
        return score / (len(tokens)**0.5) if tokens else 0 # Normalize by root of token count

    def analyze_comprehensive(self, text):
        is_korean = any('\uac00' <= char <= '\ud7a3' for char in text)
        
        if is_korean and KONLPY_AVAILABLE:
            score = self.analyze_korean(text)
            if score > 0.3: sentiment = 'positive'
            elif score < -0.3: sentiment = 'negative'
            else: sentiment = 'neutral'
            confidence = min(1.0, abs(score))
        elif not is_korean and NLTK_AVAILABLE:
            score = self.analyze_english(text)
            if score >= 0.05: sentiment = 'positive'
            elif score <= -0.05: sentiment = 'negative'
            else: sentiment = 'neutral'
            confidence = abs(score)
        else:
            return {"error": "Required library (NLTK or Konlpy) not available."}
            
        return {
            'text': text,
            'consensus': {
                'sentiment': sentiment,
                'confidence': confidence,
                'score': score
            },
        }

    def analyze_batch(self, texts, show_progress=False):
        return [self.analyze_comprehensive(text) for text in texts]

    def create_sentiment_report(self, results):
        if not results:
            return None

        sentiments = [r['consensus']['sentiment'] for r in results if 'consensus' in r]
        counts = Counter(sentiments)
        
        labels = list(counts.keys())
        sizes = [counts[l] for l in labels]
        colors = ['#4caf50', '#f44336', '#9e9e9e']
        
        fig, ax = plt.subplots(1, 1, figsize=(8, 5))
        ax.bar(labels, sizes, color=colors[:len(labels)])
        ax.set_title('Sentiment Distribution')
        ax.set_ylabel('Number of Texts')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    
    def export_results(self, results, format='dict'):
        df = pd.DataFrame([
            {
                'text': r.get('text', ''),
                'sentiment': r.get('consensus', {}).get('sentiment', 'N/A'),
                'confidence': r.get('consensus', {}).get('confidence', 0.0),
                'score': r.get('consensus', {}).get('score', 0.0)
            } for r in results
        ])
        if format == 'dict':
            return df.to_dict('records')
        elif format == 'csv':
            return df.to_csv(index=False)
        return None


def main():
    try:
        payload = json.load(sys.stdin)
        texts = payload.get('texts', [])

        if not texts:
            raise ValueError("Input 'texts' array is empty.")
            
        analyzer = SentimentAnalyzer()
        
        results = analyzer.analyze_batch(texts)
        report_plot = analyzer.create_sentiment_report(results)
        
        response = {
            "results": analyzer.export_results(results, format='dict'),
            "plot": f"data:image/png;base64,{report_plot}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
