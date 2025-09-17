
import sys
import json
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import matplotlib.pyplot as plt
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def plot_top_words(model, feature_names, n_top_words, title):
    fig, axes = plt.subplots(2, 5, figsize=(30, 15), sharex=True)
    axes = axes.flatten()
    for topic_idx, topic in enumerate(model.components_):
        top_features_ind = topic.argsort()[: -n_top_words - 1 : -1]
        top_features = [feature_names[i] for i in top_features_ind]
        weights = topic[top_features_ind]

        ax = axes[topic_idx]
        ax.barh(top_features, weights, height=0.7)
        ax.set_title(f"Topic {topic_idx +1}", fontdict={"fontsize": 30})
        ax.invert_yaxis()
        ax.tick_params(axis="both", which="major", labelsize=20)
        for i in "top right left".split():
            ax.spines[i].set_visible(False)

    fig.suptitle(title, fontsize=40)
    plt.subplots_adjust(top=0.90, bottom=0.05, wspace=0.90, hspace=0.3)
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        text_column = payload.get('text_column')
        n_topics = int(payload.get('n_topics', 10))
        n_top_words = int(payload.get('n_top_words', 10))

        if not all([data, text_column]):
            raise ValueError("Missing 'data' or 'text_column'")

        df = pd.DataFrame(data)
        
        if text_column not in df.columns:
            raise ValueError(f"Text column '{text_column}' not found.")
            
        documents = df[text_column].dropna().tolist()
        
        if len(documents) < n_topics:
            raise ValueError("The number of documents must be greater than or equal to the number of topics.")

        # Vectorize the text data
        vectorizer = CountVectorizer(stop_words='english', max_df=0.95, min_df=2)
        X = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()

        # Fit LDA model
        lda = LatentDirichletAllocation(n_components=n_topics, max_iter=5,
                                        learning_method='online',
                                        learning_offset=50.,
                                        random_state=42)
        lda.fit(X)
        
        # Get document-topic distribution
        doc_topic_dist = lda.transform(X)

        # Get top words for each topic
        topics = []
        for topic_idx, topic in enumerate(lda.components_):
            top_features_ind = topic.argsort()[: -n_top_words - 1 : -1]
            top_features = [feature_names[i] for i in top_features_ind]
            weights = topic[top_features_ind]
            topics.append({'topic_id': topic_idx, 'top_words': top_features, 'weights': weights.tolist()})

        # Create plot
        plot_image = plot_top_words(lda, feature_names, n_top_words, "Topics in LDA model")

        response = {
            'results': {
                'topics': topics,
                'doc_topic_distribution': doc_topic_dist.tolist(),
                'n_topics': n_topics,
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
