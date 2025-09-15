
import sys
import json
import pandas as pd
import numpy as np
from lifelines import KaplanMeierFitter
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
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        duration_col = payload.get('durationCol')
        event_col = payload.get('eventCol')
        group_col = payload.get('groupCol')

        if not all([data, duration_col, event_col]):
            raise ValueError("Missing 'data', 'durationCol', or 'eventCol'")

        df = pd.DataFrame(data)

        # --- Kaplan-Meier Fitter ---
        kmf = KaplanMeierFitter()
        
        plt.figure(figsize=(10, 6))
        ax = plt.subplot(111)

        if group_col:
            groups = df[group_col].unique()
            for group in groups:
                group_df = df[df[group_col] == group]
                kmf.fit(group_df[duration_col], event_observed=group_df[event_col], label=str(group))
                kmf.plot_survival_function(ax=ax)
        else:
            kmf.fit(df[duration_col], event_observed=df[event_col], label='Overall Survival')
            kmf.plot_survival_function(ax=ax)
        
        plt.title('Kaplan-Meier Survival Curve')
        plt.xlabel('Time')
        plt.ylabel('Survival Probability')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        survival_table = kmf.survival_function_.reset_index().rename(columns={'timeline': 'Time'})
        
        results = {
            'survival_table': survival_table.to_dict('records'),
            'median_survival_time': kmf.median_survival_time_,
            'confidence_interval': kmf.confidence_interval_survival_function_.reset_index().to_dict('records'),
        }

        response = {
            'results': results,
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
