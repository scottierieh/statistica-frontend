import sys
import json
import numpy as np
import pandas as pd
import warnings
import math

warnings.filterwarnings('ignore')


def _to_native_type(obj):
    """Convert numpy/pandas objects to native Python types for JSON serialization."""
    if isinstance(obj, dict):
        return {k: _to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native_type(v) for v in obj]
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return _to_native_type(obj.tolist())
    elif pd.isna(obj):
        return None
    return obj


def generate_interpretation(results: dict) -> str:
    """Generates a detailed text interpretation of the brand funnel analysis."""
    insights = results.get('insights')
    if not insights:
        return "Not enough data to generate a full interpretation."

    top_performer = insights.get('top_performer', {})
    market_leader = insights.get('market_leader', {})
    biggest_opportunity = insights.get('biggest_opportunity', {})
    conversion_champion = insights.get('conversion_champion', {})

    interp = f"<strong>Overall Performance:</strong>\n" \
             f"The top performer is <strong>{top_performer.get('brand', 'N/A')}</strong> " \
             f"with funnel efficiency <strong>{top_performer.get('efficiency', 0):.1f}%</strong>.\n" \
             f"Market leader in awareness: <strong>{market_leader.get('awareness', 'N/A')}</strong>, " \
             f"largest usage share: <strong>{market_leader.get('usage', 'N/A')}</strong>.\n\n"

    interp += f"<strong>Conversion Insights:</strong>\n" \
              f"Conversion Champion: <strong>{conversion_champion.get('brand', 'N/A')}</strong> " \
              f"converts <strong>{conversion_champion.get('rate', 0):.1f}%</strong> of aware customers into users.\n\n"

    interp += f"<strong>Strategic Recommendations:</strong>\n" \
              f"Biggest opportunity: <strong>{biggest_opportunity.get('brand', 'N/A')}</strong>, " \
              f"most drop-off at <strong>{biggest_opportunity.get('bottleneck', 'N/A')}</strong> stage."

    return interp.strip()


class BrandFunnelAnalysis:
    """Brand Funnel Analysis class"""

    def __init__(self, brands: list, funnel_data: dict, total_respondents: int):
        self.brands = brands
        self.funnel_data = pd.DataFrame.from_dict(funnel_data, orient='index').reindex(brands).fillna(0).astype(int)
        self.total_respondents = total_respondents
        self.conversion_rates = pd.DataFrame()

    def calculate_conversion_rates(self):
        """Calculate conversion rates between funnel stages, with validation"""
        if self.funnel_data.empty:
            return pd.DataFrame()

        df = self.funnel_data.copy()
        rates = pd.DataFrame(index=df.index)

        with np.errstate(divide='ignore', invalid='ignore'):
            rates['awareness_to_consideration'] = np.divide(df['consideration'], df['awareness']) * 100
            rates['consideration_to_preference'] = np.divide(df['preference'], df['consideration']) * 100
            rates['preference_to_usage'] = np.divide(df['usage'], df['preference']) * 100
            rates['awareness_to_usage'] = np.divide(df['usage'], df['awareness']) * 100

        # 무한대, NaN 처리
        rates = rates.replace([np.inf, -np.inf], np.nan)

        # 100% 초과 값 클리핑
        rates_clipped = rates.clip(upper=100)

        # 경고 표시 컬럼 추가
        for col in rates.columns:
            flag_col = f"{col}_flag"
            rates_clipped[flag_col] = np.where(rates[col] > 100, "⚠️ >100%", "")

        self.conversion_rates = rates_clipped
        return self.conversion_rates

    def calculate_funnel_efficiency(self) -> pd.DataFrame:
        """Calculate overall funnel efficiency"""
        efficiency = pd.DataFrame(index=self.funnel_data.index)
        with np.errstate(divide='ignore', invalid='ignore'):
            efficiency['funnel_efficiency'] = np.divide(self.funnel_data['usage'], self.funnel_data['awareness']) * 100
        efficiency['drop_off_rate'] = 100 - efficiency['funnel_efficiency']
        return efficiency.sort_values('funnel_efficiency', ascending=False)

    def calculate_drop_off(self) -> dict:
        """Calculate drop-off between funnel stages"""
        results = {}
        stages = ['awareness', 'consideration', 'preference', 'usage']

        for brand in self.brands:
            if brand not in self.funnel_data.index:
                continue

            brand_drop = {}
            for i in range(len(stages) - 1):
                current_stage = stages[i]
                next_stage = stages[i + 1]
                current_val = self.funnel_data.loc[brand, current_stage]
                next_val = self.funnel_data.loc[brand, next_stage]
                drop_count = max(0, int(current_val - next_val))
                drop_rate = (drop_count / current_val * 100) if current_val > 0 else 0.0
                drop_rate = max(0.0, min(100.0, drop_rate))
                brand_drop[f'{current_stage}_to_{next_stage}'] = {
                    'count': drop_count,
                    'rate': float(drop_rate)
                }
            results[brand] = brand_drop
        return results

    def calculate_health_scores(self) -> dict:
        """Calculate brand health scores"""
        results = {}
        max_awareness = max(1, self.funnel_data['awareness'].max())

        for brand in self.brands:
            if brand not in self.conversion_rates.index:
                continue

            conv_rate = self.conversion_rates.loc[brand, 'awareness_to_usage']
            conv_score = min((conv_rate or 0) * 0.4, 40)
            vol_score = (self.funnel_data.loc[brand, 'awareness'] / max_awareness) * 30

            rates = [
                self.conversion_rates.loc[brand, 'awareness_to_consideration'],
                self.conversion_rates.loc[brand, 'consideration_to_preference'],
                self.conversion_rates.loc[brand, 'preference_to_usage']
            ]
            valid_rates = [r for r in rates if pd.notna(r)]
            variance = np.var(valid_rates) if valid_rates else 0
            cons_score = max(0, 30 - (variance / 100))

            total_score = conv_score + vol_score + cons_score
            results[brand] = {
                'total_score': total_score,
                'conversion_component': conv_score,
                'consistency_component': cons_score,
                'volume_component': vol_score
            }
        return results

    def identify_bottlenecks(self) -> pd.DataFrame:
        """Identify bottleneck stages for each brand"""
        bottlenecks = []
        for brand in self.funnel_data.index:
            rates = {
                'Awareness → Consideration': self.conversion_rates.loc[brand, 'awareness_to_consideration'],
                'Consideration → Preference': self.conversion_rates.loc[brand, 'consideration_to_preference'],
                'Preference → Usage': self.conversion_rates.loc[brand, 'preference_to_usage']
            }
            valid_rates = {k: v for k, v in rates.items() if pd.notna(v)}
            if not valid_rates:
                continue
            bottleneck_stage = min(valid_rates, key=valid_rates.get)
            bottleneck_rate = valid_rates[bottleneck_stage]
            bottlenecks.append({
                'brand': brand,
                'bottleneck_stage': bottleneck_stage,
                'conversion_rate': bottleneck_rate
            })
        return pd.DataFrame(bottlenecks).sort_values('conversion_rate')

    def calculate_market_share(self) -> dict:
        """Calculate market share at each funnel stage"""
        results = {}
        stages = ['awareness', 'consideration', 'preference', 'usage']
        stage_totals = {stage: self.funnel_data[stage].sum() for stage in stages}

        for brand in self.brands:
            if brand not in self.funnel_data.index:
                continue
            brand_shares = {}
            for stage in stages:
                total = stage_totals[stage]
                brand_value = self.funnel_data.loc[brand, stage]
                share = (brand_value / total * 100) if total > 0 else 0.0
                brand_shares[f'{stage}_share'] = float(share)
            results[brand] = brand_shares
        return results

    def generate_insights(self) -> dict:
        """Generate key insights from the analysis"""
        self.calculate_conversion_rates()
        efficiency_df = self.calculate_funnel_efficiency()
        bottlenecks_df = self.identify_bottlenecks()
        market_share_dict = self.calculate_market_share()
        conversion_rates_df = self.conversion_rates.copy().fillna(0)

        insights = {
            'top_performer': {
                'brand': efficiency_df['funnel_efficiency'].idxmax() if not efficiency_df.empty else 'N/A',
                'efficiency': float(efficiency_df['funnel_efficiency'].max()) if not efficiency_df.empty else 0
            },
            'market_leader': {
                'awareness': max(market_share_dict.items(), key=lambda x: x[1].get('awareness_share', 0))[0] if market_share_dict else 'N/A',
                'usage': max(market_share_dict.items(), key=lambda x: x[1].get('usage_share', 0))[0] if market_share_dict else 'N/A'
            },
            'biggest_opportunity': {
                'brand': bottlenecks_df.iloc[0]['brand'] if not bottlenecks_df.empty else 'N/A',
                'bottleneck': bottlenecks_df.iloc[0]['bottleneck_stage'] if not bottlenecks_df.empty else 'N/A',
                'rate': float(bottlenecks_df.iloc[0]['conversion_rate']) if not bottlenecks_df.empty else 0
            },
            'conversion_champion': {
                'brand': conversion_rates_df['awareness_to_usage'].idxmax() if not conversion_rates_df.empty else 'N/A',
                'rate': float(conversion_rates_df['awareness_to_usage'].max()) if not conversion_rates_df.empty else 0
            }
        }
        return insights

    def export_results(self) -> dict:
        """Export all analysis results in JSON-serializable format"""
        self.calculate_conversion_rates()
        results = {
            'funnel_data': self.funnel_data.to_dict('index'),
            'conversion_rates': self.conversion_rates.where(pd.notnull(self.conversion_rates), None).to_dict('index'),
            'market_share': self.calculate_market_share(),
            'efficiency': self.calculate_funnel_efficiency().where(pd.notnull(self.calculate_funnel_efficiency()), None).to_dict('index'),
            'bottlenecks': self.identify_bottlenecks().to_dict('records'),
            'drop_off': self.calculate_drop_off(),
            'health_scores': self.calculate_health_scores(),
            'insights': self.generate_insights()
        }
        results['interpretation'] = generate_interpretation(results)
        return _to_native_type(results)


def main():
    try:
        payload = json.load(sys.stdin)
        brands = payload.get('brands')
        funnel_data = payload.get('funnel_data')
        total_respondents = payload.get('total_respondents')

        if not all([brands, funnel_data, total_respondents is not None]):
            raise ValueError("Missing 'brands', 'funnel_data', or 'total_respondents'")

        analysis = BrandFunnelAnalysis(brands, funnel_data, total_respondents)
        results_to_export = analysis.export_results()

        print(json.dumps({'results': results_to_export}))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
