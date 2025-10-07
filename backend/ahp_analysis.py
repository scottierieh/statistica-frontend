import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib import font_manager, rc

# 한글 폰트 설정 (Windows)
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False


class AHPAnalysis:
    def __init__(self):
        self.criteria = []
        self.alternatives = []
        self.criteria_matrix = None
        self.alternative_matrices = {}
        
    def set_criteria(self, criteria_list):
        """평가 기준 설정"""
        self.criteria = criteria_list
        n = len(criteria_list)
        self.criteria_matrix = np.ones((n, n))
        
    def set_alternatives(self, alternatives_list):
        """대안 설정"""
        self.alternatives = alternatives_list
        n = len(alternatives_list)
        for criterion in self.criteria:
            self.alternative_matrices[criterion] = np.ones((n, n))
    
    def input_criteria_comparison(self):
        """기준 간 쌍대비교 입력"""
        print("\n=== 기준 간 쌍대비교 ===")
        print("척도: 1(동등), 3(약간 중요), 5(중요), 7(매우 중요), 9(절대 중요)")
        print("역수 사용: 오른쪽이 더 중요하면 1/3, 1/5 등 입력\n")
        
        n = len(self.criteria)
        for i in range(n):
            for j in range(i + 1, n):
                while True:
                    try:
                        print(f"\n'{self.criteria[i]}' vs '{self.criteria[j]}'")
                        value = float(input("중요도 입력 (왼쪽 기준): "))
                        if value > 0:
                            self.criteria_matrix[i][j] = value
                            self.criteria_matrix[j][i] = 1 / value
                            break
                        else:
                            print("양수를 입력해주세요.")
                    except ValueError:
                        print("올바른 숫자를 입력해주세요.")
    
    def input_alternative_comparison(self, criterion):
        """특정 기준에서 대안 간 쌍대비교 입력"""
        print(f"\n=== '{criterion}' 기준에서 대안 비교 ===")
        
        n = len(self.alternatives)
        matrix = self.alternative_matrices[criterion]
        
        for i in range(n):
            for j in range(i + 1, n):
                while True:
                    try:
                        print(f"\n'{self.alternatives[i]}' vs '{self.alternatives[j]}'")
                        value = float(input("중요도 입력 (왼쪽 대안): "))
                        if value > 0:
                            matrix[i][j] = value
                            matrix[j][i] = 1 / value
                            break
                        else:
                            print("양수를 입력해주세요.")
                    except ValueError:
                        print("올바른 숫자를 입력해주세요.")
    
    def calculate_weights(self, matrix):
        """가중치 계산 (고유벡터 방법)"""
        col_sums = matrix.sum(axis=0)
        normalized_matrix = matrix / col_sums
        weights = normalized_matrix.mean(axis=1)
        return weights
    
    def calculate_consistency_ratio(self, matrix, weights):
        """일관성 비율(CR) 계산"""
        n = len(weights)
        weighted_sum = matrix @ weights
        lambda_max = (weighted_sum / weights).mean()
        
        CI = (lambda_max - n) / (n - 1)
        
        # 무작위 지수(RI)
        RI_dict = {1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 
                   6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}
        RI = RI_dict.get(n, 1.49)
        
        CR = CI / RI if RI != 0 else 0
        return CR, lambda_max
    
    def analyze(self):
        """전체 AHP 분석 수행"""
        # 기준 가중치 계산
        criteria_weights = self.calculate_weights(self.criteria_matrix)
        cr_criteria, lambda_criteria = self.calculate_consistency_ratio(
            self.criteria_matrix, criteria_weights)
        
        print("\n" + "="*50)
        print("기준별 가중치")
        print("="*50)
        for i, criterion in enumerate(self.criteria):
            print(f"{criterion}: {criteria_weights[i]:.4f} ({criteria_weights[i]*100:.2f}%)")
        print(f"\n일관성 비율(CR): {cr_criteria:.4f}")
        if cr_criteria < 0.1:
            print("✓ 일관성이 허용 범위 내에 있습니다.")
        else:
            print("✗ 일관성이 낮습니다. 비교를 재검토하세요.")
        
        # 각 기준별 대안 가중치 계산
        alternative_weights_by_criterion = {}
        
        print("\n" + "="*50)
        print("기준별 대안 가중치")
        print("="*50)
        
        for criterion in self.criteria:
            weights = self.calculate_weights(self.alternative_matrices[criterion])
            alternative_weights_by_criterion[criterion] = weights
            
            cr, _ = self.calculate_consistency_ratio(
                self.alternative_matrices[criterion], weights)
            
            print(f"\n[{criterion}]")
            for i, alt in enumerate(self.alternatives):
                print(f"  {alt}: {weights[i]:.4f} ({weights[i]*100:.2f}%)")
            print(f"  일관성 비율(CR): {cr:.4f}")
        
        # 최종 점수 계산
        final_scores = np.zeros(len(self.alternatives))
        for i, criterion in enumerate(self.criteria):
            final_scores += criteria_weights[i] * alternative_weights_by_criterion[criterion]
        
        print("\n" + "="*50)
        print("최종 순위")
        print("="*50)
        
        ranking = sorted(enumerate(final_scores), key=lambda x: x[1], reverse=True)
        for rank, (idx, score) in enumerate(ranking, 1):
            medal = "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else "  "
            print(f"{medal} {rank}위: {self.alternatives[idx]} - {score:.4f} ({score*100:.2f}%)")
        
        return {
            'criteria_weights': criteria_weights,
            'alternative_weights_by_criterion': alternative_weights_by_criterion,
            'final_scores': final_scores,
            'ranking': ranking
        }
    
    def visualize_results(self, results):
        """결과 시각화"""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('AHP 분석 결과', fontsize=16, fontweight='bold')
        
        # 1. 기준별 가중치
        ax1 = axes[0, 0]
        criteria_weights = results['criteria_weights']
        colors = plt.cm.Blues(np.linspace(0.4, 0.8, len(self.criteria)))
        bars1 = ax1.bar(self.criteria, criteria_weights, color=colors)
        ax1.set_title('기준별 가중치', fontweight='bold')
        ax1.set_ylabel('가중치')
        ax1.set_ylim(0, max(criteria_weights) * 1.2)
        
        for bar in bars1:
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height*100:.1f}%', ha='center', va='bottom')
        
        # 2. 최종 점수
        ax2 = axes[0, 1]
        final_scores = results['final_scores']
        colors = plt.cm.Purples(np.linspace(0.4, 0.8, len(self.alternatives)))
        bars2 = ax2.bar(self.alternatives, final_scores, color=colors)
        ax2.set_title('대안별 최종 점수', fontweight='bold')
        ax2.set_ylabel('점수')
        ax2.set_ylim(0, max(final_scores) * 1.2)
        
        for bar in bars2:
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height*100:.1f}%', ha='center', va='bottom')
        
        # 3. 히트맵 - 기준별 대안 가중치
        ax3 = axes[1, 0]
        heatmap_data = []
        for criterion in self.criteria:
            heatmap_data.append(results['alternative_weights_by_criterion'][criterion])
        
        im = ax3.imshow(heatmap_data, cmap='Blues', aspect='auto')
        ax3.set_xticks(np.arange(len(self.alternatives)))
        ax3.set_yticks(np.arange(len(self.criteria)))
        ax3.set_xticklabels(self.alternatives)
        ax3.set_yticklabels(self.criteria)
        ax3.set_title('기준별 대안 가중치 히트맵', fontweight='bold')
        
        for i in range(len(self.criteria)):
            for j in range(len(self.alternatives)):
                text = ax3.text(j, i, f'{heatmap_data[i][j]*100:.1f}%',
                               ha="center", va="center", color="black", fontsize=9)
        
        plt.colorbar(im, ax=ax3, label='가중치')
        
        # 4. 순위 차트
        ax4 = axes[1, 1]
        ranking = results['ranking']
        ranked_alternatives = [self.alternatives[idx] for idx, _ in ranking]
        ranked_scores = [score for _, score in ranking]
        
        colors = ['gold' if i == 0 else 'silver' if i == 1 else 'chocolate' if i == 2 else 'lightblue' 
                  for i in range(len(ranked_alternatives))]
        bars4 = ax4.barh(ranked_alternatives[::-1], ranked_scores[::-1], color=colors[::-1])
        ax4.set_title('최종 순위', fontweight='bold')
        ax4.set_xlabel('점수')
        
        for i, bar in enumerate(bars4):
            width = bar.get_width()
            ax4.text(width, bar.get_y() + bar.get_height()/2.,
                    f'{width*100:.1f}%', ha='left', va='center', fontweight='bold')
        
        plt.tight_layout()
        plt.show()
    
    def sensitivity_analysis(self, results, criterion_to_vary):
        """민감도 분석"""
        print(f"\n=== '{criterion_to_vary}' 기준의 민감도 분석 ===")
        
        criterion_idx = self.criteria.index(criterion_to_vary)
        original_weight = results['criteria_weights'][criterion_idx]
        
        # 가중치 변화 범위
        weight_range = np.linspace(0.1, 0.9, 20)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        fig.suptitle(f"'{criterion_to_vary}' 기준의 민감도 분석", fontsize=14, fontweight='bold')
        
        # 각 대안의 점수 변화 추적
        score_changes = {alt: [] for alt in self.alternatives}
        
        for new_weight in weight_range:
            # 가중치 재조정
            adjusted_weights = results['criteria_weights'].copy()
            remaining_weight = 1 - new_weight
            total_other_weights = sum([w for i, w in enumerate(adjusted_weights) if i != criterion_idx])
            
            for i in range(len(adjusted_weights)):
                if i == criterion_idx:
                    adjusted_weights[i] = new_weight
                else:
                    adjusted_weights[i] = (adjusted_weights[i] / total_other_weights) * remaining_weight
            
            # 새로운 최종 점수 계산
            new_final_scores = np.zeros(len(self.alternatives))
            for i, criterion in enumerate(self.criteria):
                new_final_scores += adjusted_weights[i] * results['alternative_weights_by_criterion'][criterion]
            
            # 점수 기록
            for i, alt in enumerate(self.alternatives):
                score_changes[alt].append(new_final_scores[i])
        
        # 민감도 그래프 1: 점수 변화
        for alt in self.alternatives:
            ax1.plot(weight_range * 100, np.array(score_changes[alt]) * 100, 
                    marker='o', label=alt, linewidth=2)
        
        ax1.axvline(original_weight * 100, color='red', linestyle='--', 
                   label=f'현재 가중치 ({original_weight*100:.1f}%)')
        ax1.set_xlabel(f"'{criterion_to_vary}' 가중치 (%)")
        ax1.set_ylabel('대안별 최종 점수 (%)')
        ax1.set_title('가중치 변화에 따른 점수 변화')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 민감도 그래프 2: 순위 변화
        ranks = []
        for weight_idx in range(len(weight_range)):
            scores_at_weight = [score_changes[alt][weight_idx] for alt in self.alternatives]
            current_ranks = [sorted(scores_at_weight, reverse=True).index(score) + 1 
                           for score in scores_at_weight]
            ranks.append(current_ranks)
        
        ranks = np.array(ranks).T
        
        for i, alt in enumerate(self.alternatives):
            ax2.plot(weight_range * 100, ranks[i], marker='s', label=alt, linewidth=2)
        
        ax2.axvline(original_weight * 100, color='red', linestyle='--', 
                   label=f'현재 가중치 ({original_weight*100:.1f}%)')
        ax2.set_xlabel(f"'{criterion_to_vary}' 가중치 (%)")
        ax2.set_ylabel('순위')
        ax2.set_title('가중치 변화에 따른 순위 변화')
        ax2.set_yticks(range(1, len(self.alternatives) + 1))
        ax2.invert_yaxis()
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()


def main():
    """메인 실행 함수"""
    ahp = AHPAnalysis()
    
    # 예제: 자동차 선택
    print("="*50)
    print("AHP 분석 프로그램")
    print("="*50)
    
    # 평가 기준 설정
    criteria = ['성능', '가격', '연비', '디자인']
    ahp.set_criteria(criteria)
    print(f"\n평가 기준: {', '.join(criteria)}")
    
    # 대안 설정
    alternatives = ['자동차 A', '자동차 B', '자동차 C']
    ahp.set_alternatives(alternatives)
    print(f"대안: {', '.join(alternatives)}")
    
    # 기준 간 비교 입력
    ahp.input_criteria_comparison()
    
    # 각 기준별 대안 비교 입력
    for criterion in criteria:
        ahp.input_alternative_comparison(criterion)
    
    # 분석 수행
    results = ahp.analyze()
    
    # 결과 시각화
    ahp.visualize_results(results)
    
    # 민감도 분석
    print("\n민감도 분석을 수행할 기준을 선택하세요:")
    for i, criterion in enumerate(criteria, 1):
        print(f"{i}. {criterion}")
    
    choice = int(input("\n번호 입력: ")) - 1
    if 0 <= choice < len(criteria):
        ahp.sensitivity_analysis(results, criteria[choice])


if __name__ == "__main__":
    main()
