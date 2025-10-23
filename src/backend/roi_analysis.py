
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_interpretation(results):
    if not results or 'summary' not in results:
        return "No data to interpret."

    overall_roi = results['summary']['overall_roi']
    top_performer = results['grouped_analysis'][0] if results['grouped_analysis'] else None

    interpretation = f"The overall Return on Investment (ROI) across all activities is **{overall_roi:.2f}%**. "
    if overall_roi > 0:
        interpretation += "This indicates a profitable venture overall.\n\n"
    else:
        interpretation += "This indicates an overall loss on investment.\n\n"

    if top_performer:
        interpretation += f"The standout performer is **'{top_performer['group']}'**, which generated an ROI of **{top_performer['roi']:.2f}%**. "
        interpretation += f"This channel/campaign is significantly more efficient at converting investment into returns compared to others.\n\n"
        
        worst_performer = results['grouped_analysis'][-1]
        if worst_performer and worst_performer['roi'] < 0:
             interpretation += f"Conversely, **'{worst_performer['group']}'** is the least efficient, with a negative ROI of **{worst_performer['roi']:.2f}%**, indicating a net loss. "

    interpretation += "**Recommendation:** Resources and budget should be shifted towards the highest-performing channels like "
    if top_performer:
        interpretation += f"'{top_performer['group']}'. For underperforming channels, a strategic review is necessary to either optimize the approach or discontinue the investment."

    return interpretation

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        investment_col = payload.get('investment_col')
        return_col = payload.get('return_col')
        group_by_col = payload.get('group_by_col')

        if not all([data, investment_col, return_col, group_by_col]):
            raise ValueError("Missing data, investment_col, return_col, or group_by_col")

        df = pd.DataFrame(data)
        
        # Data Cleaning
        df[investment_col] = pd.to_numeric(df[investment_col], errors='coerce')
        df[return_col] = pd.to_numeric(df[return_col], errors='coerce')
        df.dropna(subset=[investment_col, return_col, group_by_col], inplace=True)
        
        if df.empty:
            raise ValueError("No valid data remaining after cleaning.")

        # Grouped Analysis
        grouped = df.groupby(group_by_col).agg(
            total_investment=(investment_col, 'sum'),
            total_return=(return_col, 'sum')
        ).reset_index()

        grouped = grouped[grouped['total_investment'] > 0] # Avoid division by zero for ROI

        grouped['net_return'] = grouped['total_return'] - grouped['total_investment']
        grouped['roi'] = (grouped['net_return'] / grouped['total_investment']) * 100
        
        grouped.rename(columns={group_by_col: 'group'}, inplace=True)
        grouped_analysis = grouped.sort_values('roi', ascending=False).to_dict('records')

        # Overall Summary
        total_investment_overall = df[investment_col].sum()
        total_return_overall = df[return_col].sum()
        net_return_overall = total_return_overall - total_investment_overall
        overall_roi = (net_return_overall / total_investment_overall) * 100 if total_investment_overall > 0 else 0

        summary = {
            'total_investment': total_investment_overall,
            'total_return': total_return_overall,
            'net_return': net_return_overall,
            'overall_roi': overall_roi
        }

        # Plotting
        plt.figure(figsize=(10, 6))
        plot_df = pd.DataFrame(grouped_analysis).head(15) # Limit to top 15 for readability
        sns.barplot(x='roi', y='group', data=plot_df, palette='viridis')
        plt.title(f'ROI by {group_by_col}')
        plt.xlabel('Return on Investment (ROI) %')
        plt.ylabel(group_by_col)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        results_data = {
            'summary': summary,
            'grouped_analysis': grouped_analysis
        }
        results_data['interpretation'] = get_interpretation(results_data)

        response = {
            'results': results_data,
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
