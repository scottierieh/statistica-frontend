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
warnings.filterwarnings('ignore')

try:
    from wordcloud import WordCloud, STOPWORDS
    WORDCLOUD_AVAILABLE = True
except ImportError:
    WORDCLOUD_AVAILABLE = False

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class WordCloudGenerator:
    def __init__(self):
        self.default_stopwords = set(STOPWORDS) if WORDCLOUD_AVAILABLE else set()

    def preprocess_text(self, text, custom_stopwords, min_word_length):
        text = text.lower()
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = re.sub(r'\d+', '', text)
        words = text.split()
        
        stop_words = self.default_stopwords.union(set(custom_stopwords))
        
        words = [word for word in words if len(word) >= min_word_length and word not in stop_words]
        return ' '.join(words)

    def calculate_word_frequencies(self, text, top_n=100):
        words = text.split()
        word_freq = Counter(words)
        return dict(word_freq.most_common(top_n))

    def generate_wordcloud(self, text, settings):
        if not WORDCLOUD_AVAILABLE:
            raise ImportError("WordCloud library not found. Please install with: pip install wordcloud")
        
        wc = WordCloud(
            width=settings.get('width', 800),
            height=settings.get('height', 400),
            background_color=settings.get('background_color', 'white'),
            max_words=settings.get('max_words', 100),
            colormap=settings.get('colormap', 'viridis'),
            stopwords=self.default_stopwords,
            collocations=False
        )
        
        wordcloud_image = wc.generate(text)
        
        buf = io.BytesIO()
        wordcloud_image.to_image().save(buf, format='PNG')
        buf.seek(0)
        
        return base64.b64encode(buf.read()).decode('utf-8')

def main():
    try:
        payload = json.load(sys.stdin)
        text_data = payload.get('text', '')
        custom_stopwords_str = payload.get('customStopwords', '')
        min_word_length = payload.get('minWordLength', 3)
        max_words = payload.get('maxWords', 100)
        
        if not text_data:
            raise ValueError("Text data is required.")

        generator = WordCloudGenerator()
        
        custom_stopwords = [word.strip() for word in custom_stopwords_str.split(',') if word.strip()]

        processed_text = generator.preprocess_text(text_data, custom_stopwords, min_word_length)
        
        if not processed_text.strip():
             raise ValueError("No valid words found after preprocessing.")

        frequencies = generator.calculate_word_frequencies(processed_text, top_n=max_words)

        settings = {
            'width': 800,
            'height': 400,
            'background_color': 'white',
            'colormap': 'viridis',
            'max_words': max_words
        }

        # Generate from frequencies for consistency
        wordcloud_img = generator.generate_wordcloud(' '.join(frequencies.keys()), settings)

        response = {
            "plot": f"data:image/png;base64,{wordcloud_img}",
            "frequencies": frequencies
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
