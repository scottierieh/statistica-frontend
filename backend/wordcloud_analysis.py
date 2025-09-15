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
import matplotlib.font_manager as fm

warnings.filterwarnings('ignore')

try:
    from wordcloud import WordCloud, STOPWORDS
    WORDCLOUD_AVAILABLE = True
except ImportError:
    WORDCLOUD_AVAILABLE = False

try:
    from konlpy.tag import Okt
    KONLPY_AVAILABLE = True
except ImportError:
    KONLPY_AVAILABLE = False

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

def get_korean_font_path():
    """Finds a Korean font path available on the system."""
    font_paths = fm.findSystemFonts(fontpaths=None, fontext='ttf')
    
    nanum_fonts = [path for path in font_paths if 'NanumGothic' in path]
    if nanum_fonts:
        return nanum_fonts[0]

    for font_name in ['Malgun Gothic', 'AppleGothic', 'Noto Sans CJK KR', 'NanumGothic']:
        try:
            return fm.findfont(fm.FontProperties(family=font_name))
        except:
            continue
    
    # Check for any CJK font as a fallback
    for path in font_paths:
        try:
            font = fm.FontProperties(fname=path)
            if any(lang in font.get_name().lower() for lang in ['korean', 'cjk', 'nanum', 'malgun']):
                return path
        except:
            continue
            
    return None

class WordCloudGenerator:
    def __init__(self):
        self.default_stopwords = set(STOPWORDS) if WORDCLOUD_AVAILABLE else set()
        self.font_path = get_korean_font_path()
        if self.font_path:
            plt.rcParams['font.family'] = fm.FontProperties(fname=self.font_path).get_name()
        else:
            # Fallback font for systems without Korean fonts, might not render correctly.
            plt.rcParams['font.family'] = 'DejaVu Sans'
        plt.rcParams['axes.unicode_minus'] = False


    def preprocess_text(self, text, custom_stopwords, min_word_length):
        is_korean = any('\uac00' <= char <= '\ud7a3' for char in text)

        # Common preprocessing
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        text = text.translate(str.maketrans('', '', string.punctuation))
        text = re.sub(r'\d+', '', text)
        
        all_stopwords = self.default_stopwords.union(set(custom_stopwords))

        if is_korean and KONLPY_AVAILABLE:
            okt = Okt()
            # Extract nouns
            nouns = okt.nouns(text)
            processed_words = [word for word in nouns if len(word) >= min_word_length and word not in all_stopwords]
            processed_text = ' '.join(processed_words)
        else:
            # Fallback for non-Korean text or if konlpy is not available
            text = text.lower()
            words = text.split()
            processed_words = [word for word in words if len(word) >= min_word_length and word not in all_stopwords]
            processed_text = ' '.join(processed_words)

        return processed_text, processed_words

    def calculate_word_frequencies(self, words, top_n=100):
        word_freq = Counter(words)
        return dict(word_freq.most_common(top_n))

    def analyze_text_statistics(self, original_text, processed_words):
        original_words = original_text.split()
        stats = {
            'total_words': len(original_words),
            'unique_words': len(set(original_words)),
            'processed_words_count': len(processed_words),
            'unique_processed_words': len(set(processed_words)),
            'average_word_length': np.mean([len(word) for word in processed_words]) if processed_words else 0,
        }
        return stats

    def generate_wordcloud_image(self, text, settings):
        if not WORDCLOUD_AVAILABLE:
            raise ImportError("WordCloud library not found. Please install with: pip install wordcloud")
        
        wc_params = {
            'width': settings.get('width', 800),
            'height': settings.get('height', 400),
            'background_color': settings.get('background_color', 'white'),
            'max_words': settings.get('max_words', 100),
            'colormap': settings.get('colormap', 'viridis'),
            'stopwords': self.default_stopwords,
            'collocations': False
        }
        
        if self.font_path:
            wc_params['font_path'] = self.font_path
        else:
             warnings.warn("Korean font not found. Hangul may appear broken.")

        wc = WordCloud(**wc_params)
        
        wordcloud_image = wc.generate(text)
        
        buf = io.BytesIO()
        wordcloud_image.to_image().save(buf, format='PNG')
        buf.seek(0)
        
        return base64.b64encode(buf.read()).decode('utf-8')

    def generate_frequency_plot(self, frequencies, top_n=20):
        top_freq = dict(list(frequencies.items())[:top_n])
        plt.figure(figsize=(10, 8))
            
        plt.barh(list(top_freq.keys()), list(top_freq.values()), color='skyblue')
        plt.xlabel('Frequency')
        plt.title(f'Top {top_n} Most Frequent Words')
        plt.gca().invert_yaxis()
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        
        return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        payload = json.load(sys.stdin)
        text_data = payload.get('text', '')
        custom_stopwords_str = payload.get('customStopwords', '')
        min_word_length = payload.get('minWordLength', 2) # Changed default to 2 for Korean
        max_words = payload.get('maxWords', 100)
        colormap = payload.get('colormap', 'viridis')
        
        if not text_data:
            raise ValueError("Text data is required.")

        generator = WordCloudGenerator()
        
        custom_stopwords = [word.strip() for word in custom_stopwords_str.split(',') if word.strip()]

        processed_text, processed_words = generator.preprocess_text(text_data, custom_stopwords, min_word_length)
        
        if not processed_text.strip():
             raise ValueError("No valid words found after preprocessing.")

        frequencies = generator.calculate_word_frequencies(processed_words, top_n=max_words)
        statistics = generator.analyze_text_statistics(text_data, processed_words)

        settings = {
            'width': 800,
            'height': 400,
            'background_color': 'white',
            'colormap': colormap,
            'max_words': max_words
        }

        wordcloud_img = generator.generate_wordcloud_image(processed_text, settings)
        frequency_plot_img = generator.generate_frequency_plot(frequencies)

        response = {
            "plots": {
                "wordcloud": f"data:image/png;base64,{wordcloud_img}",
                "frequency_bar": f"data:image/png;base64,{frequency_plot_img}",
            },
            "frequencies": frequencies,
            "statistics": statistics
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
