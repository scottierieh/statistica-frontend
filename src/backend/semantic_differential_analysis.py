
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from matplotlib import font_manager, rc
import sys
import json
import io
import base64

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False


class SemanticDifferentialAnalysis:
    def __init__(self, item_name):
        self.item_name = item_name
        self.scales = []
        self.responses = []
        
    def add_scale(self, scale_id, left_adjective, right_adjective, dimension):
        """
        척도 추가
        
        Parameters:
        - scale_id: 척도 ID
        - left_adjective: 왼쪽 형용사 (1점)
        - right_adjective: 오른쪽 형용사 (7점)
        - dimension: EPA 차원 ('evaluation', 'potency', 'activity')
        """
        self.scales.append({
            'id': scale_id,
            'left': left_adjective,
            'right': right_adjective,
            'dimension': dimension
        })
    
    def add_response(self, respondent_id, ratings):
        """
        응답자 데이터 추가
        
        Parameters:
        - respondent_id: 응답자 ID
        - ratings: dict {scale_id: rating_value} (1-7점)
        """
        response = {'respondent_id': respondent_id}
        response.update(ratings)
        self.responses.append(response)
    
    def add_batch_responses(self, data):
        """일괄 응답 추가"""
        if isinstance(data, pd.DataFrame):
            for _, row in data.iterrows():
                self.add_response(row['respondent_id'], row.to_dict())
        else:
            for item in data:
                self.add_response(item['respondent_id'], item)
    
    def calculate_statistics(self):
        """기술통계 계산"""
        df = pd.DataFrame(self.responses)
        
        stats_dict = {}
        for scale in self.scales:
            scale_id = scale['id']
            if scale_id in df.columns:
                stats_dict[scale_id] = {
                    'scale': f"{scale['left']} - {scale['right']}",
                    'dimension': scale['dimension'],
                    'mean': df[scale_id].mean(),
                    'std': df[scale_id].std(),
                    'median': df[scale_id].median(),
                    'min': df[scale_id].min(),
                    'max': df[scale_id].max()
                }
        
        return pd.DataFrame(stats_dict).T
    
    def calculate_epa_scores(self):
        """EPA 차원별 점수 계산"""
        df = pd.DataFrame(self.responses)
        
        dimensions = {
            'evaluation': [],
            'potency': [],
            'activity': []
        }
        
        for scale in self.scales:
            scale_id = scale['id']
            dimension = scale['dimension']
            if scale_id in df.columns and dimension in dimensions:
                dimensions[dimension].extend(df[scale_id].tolist())
        
        epa_scores = {}
        for dim, values in dimensions.items():
            if values:
                epa_scores[dim] = {
                    'mean': np.mean(values),
                    'std': np.std(values),
                    'count': len(values)
                }
            else:
                epa_scores[dim] = {'mean': 0, 'std': 0, 'count': 0}
        
        return epa_scores
    
    def calculate_profile(self):
        """전체 프로파일 계산 (평균)"""
        df = pd.DataFrame(self.responses)
        
        profile = []
        for scale in self.scales:
            scale_id = scale['id']
            if scale_id in df.columns:
                profile.append({
                    'scale_id': scale_id,
                    'left': scale['left'],
                    'right': scale['right'],
                    'dimension': scale['dimension'],
                    'mean': df[scale_id].mean(),
                    'std': df[scale_id].std()
                })
        
        return pd.DataFrame(profile)
    
    def analyze(self):
        """전체 분석 수행"""
        stats_df = self.calculate_statistics()
        epa_scores = self.calculate_epa_scores()
        profile_df = self.calculate_profile()
        overall_mean = np.mean([scores['mean'] for scores in epa_scores.values() if scores['count'] > 0]) if epa_scores else 0

        return {
            'statistics': stats_df.to_dict('index'),
            'epa_scores': epa_scores,
            'profile': profile_df.to_dict('records'),
            'overall_mean': overall_mean
        }

    def visualize_results_to_base64(self, analysis_results):
        """결과 시각화하고 base64로 변환"""
        profile_df = pd.DataFrame(analysis_results['profile'])
        epa_scores = analysis_results['epa_scores']
        
        fig = plt.figure(figsize=(16, 12))
        gs = fig.add_gridspec(3, 2, hspace=0.3, wspace=0.3)
        
        ax1 = fig.add_subplot(gs[0, :])
        y_pos = np.arange(len(profile_df))
        means = profile_df['mean'].values
        stds = profile_df['std'].values
        
        ax1.axvline(x=4, color='gray', linestyle='--', linewidth=2, alpha=0.5, label='중립점')
        ax1.errorbar(means, y_pos, xerr=stds, fmt='o', markersize=10, 
                    capsize=5, capthick=2, color='#8b5cf6', elinewidth=2)
        
        ax1.set_yticks(y_pos)
        left_labels = [f"{row['left']}" for _, row in profile_df.iterrows()]
        right_labels = [f"{row['right']}" for _, row in profile_df.iterrows()]
        
        ax1.set_yticklabels([f"{left:15s}" for left in left_labels])
        ax1_right = ax1.twinx()
        ax1_right.set_yticks(y_pos)
        ax1_right.set_yticklabels([f"{right:15s}" for right in right_labels])
        
        ax1.set_xlim(0.5, 7.5); ax1.set_xticks(range(1, 8))
        ax1.set_xlabel('점수', fontsize=12, fontweight='bold')
        ax1.set_title(f'{self.item_name} - Semantic Profile', fontsize=14, fontweight='bold')
        ax1.grid(True, axis='x', alpha=0.3); ax1.invert_yaxis(); ax1.legend()
        
        ax2 = fig.add_subplot(gs[1, 0])
        dimensions = ['evaluation', 'potency', 'activity']
        dim_names = ['Evaluation\n(평가)', 'Potency\n(힘)', 'Activity\n(활동)']
        dim_means = [epa_scores[dim]['mean'] for dim in dimensions]
        dim_colors = ['#3b82f6', '#8b5cf6', '#ec4899']
        
        bars = ax2.bar(dim_names, dim_means, color=dim_colors, alpha=0.7, edgecolor='black')
        ax2.axhline(y=4, color='gray', linestyle='--', linewidth=1, alpha=0.5, label='중립점')
        ax2.set_ylabel('평균 점수', fontsize=12, fontweight='bold')
        ax2.set_ylim(0, 7.5); ax2.set_title('EPA 차원별 점수', fontsize=14, fontweight='bold')
        ax2.grid(True, axis='y', alpha=0.3)
        
        for bar, mean in zip(bars, dim_means):
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{mean:.2f}', ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        ax3 = fig.add_subplot(gs[1, 1])
        df = pd.DataFrame(self.responses)
        dimension_data = {dim: [] for dim in dimensions}
        for scale in self.scales:
            if scale['id'] in df.columns and scale['dimension'] in dimension_data:
                dimension_data[scale['dimension']].extend(df[scale['id']].tolist())
        
        box_data = [dimension_data[dim] for dim in dimensions]
        bp = ax3.boxplot(box_data, labels=dim_names, patch_artist=True)
        for patch, color in zip(bp['boxes'], dim_colors):
            patch.set_facecolor(color); patch.set_alpha(0.5)
        
        ax3.axhline(y=4, color='gray', linestyle='--', linewidth=1, alpha=0.5)
        ax3.set_ylabel('점수', fontsize=12, fontweight='bold'); ax3.set_ylim(0, 8)
        ax3.set_title('EPA 차원별 분포', fontsize=14, fontweight='bold'); ax3.grid(True, axis='y', alpha=0.3)
        
        ax4 = fig.add_subplot(gs[2, 0])
        scale_means = profile_df['mean'].values.reshape(-1, 1)
        scale_labels = [f"{row['left'][:8]}..{row['right'][:8]}" for _, row in profile_df.iterrows()]
        
        im = ax4.imshow(scale_means, cmap='RdYlGn', aspect='auto', vmin=1, vmax=7)
        ax4.set_yticks(range(len(scale_labels))); ax4.set_yticklabels(scale_labels, fontsize=9)
        ax4.set_xticks([0]); ax4.set_xticklabels(['평균'])
        ax4.set_title('척도별 평균 점수 (히트맵)', fontsize=14, fontweight='bold')
        for i, mean in enumerate(scale_means):
            ax4.text(0, i, f'{mean[0]:.2f}', ha='center', va='center', fontweight='bold', fontsize=10, color='white' if mean[0] < 3.5 or mean[0] > 5.5 else 'black')
        plt.colorbar(im, ax=ax4, label='점수')
        
        ax5 = fig.add_subplot(gs[2, 1])
        all_responses = []
        for scale in self.scales:
            if scale['id'] in df.columns:
                all_responses.extend(df[scale['id']].tolist())
        
        ax5.hist(all_responses, bins=np.arange(0.5, 8.5, 1), color='#8b5cf6', alpha=0.7, edgecolor='black')
        ax5.axvline(x=4, color='red', linestyle='--', linewidth=2, label='중립점')
        ax5.set_xlabel('점수', fontsize=12, fontweight='bold')
        ax5.set_ylabel('빈도', fontsize=12, fontweight='bold')
        ax5.set_title('전체 응답 분포', fontsize=14, fontweight='bold')
        ax5.set_xticks(range(1, 8)); ax5.grid(True, axis='y', alpha=0.3); ax5.legend()
        
        plt.suptitle(f'{self.item_name} - Semantic Differential Analysis Results', fontsize=16, fontweight='bold')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        payload = json.load(sys.stdin)
        item_name = payload.get('itemName', 'Item')
        scales_data = payload.get('scales')
        responses_data = payload.get('responses')
        
        if not all([scales_data, responses_data]):
             raise ValueError("Missing 'scales' or 'responses' data.")
        
        analyzer = SemanticDifferentialAnalysis(item_name)
        
        for scale in scales_data:
            analyzer.add_scale(scale_id=scale['id'], left_adjective=scale['left_adjective'], right_adjective=scale['right_adjective'], dimension=scale['dimension'])

        analyzer.add_batch_responses(responses_data)
        
        analysis_results = analyzer.analyze()
        plot_base64 = analyzer.visualize_results_to_base64(analysis_results)
        
        # Prepare JSON serializable output
        output = {
            'results': analysis_results,
            'plot': f"data:image/png;base64,{plot_base64}"
        }

        # Custom JSON encoder might be needed if numpy types are still present
        def default_converter(o):
            if isinstance(o, (np.integer, np.int64)): return int(o)
            if isinstance(o, (np.floating, np.float64)):
                if np.isnan(o): return None
                return float(o)
            if isinstance(o, np.ndarray): return o.tolist()
            if isinstance(o, pd.DataFrame): return o.to_dict('records')
            if isinstance(o, pd.Series): return o.to_dict()
            raise TypeError

        print(json.dumps(output, default=default_converter))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
