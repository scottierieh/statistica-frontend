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

    interp = f"**Overall Performance:**\n" \
             f"The top performer is **{top_performer.get('brand', 'N/A')}** " \
             f"with funnel efficiency **{top_performer.get('efficiency', 0):.2f}%**.\n" \
             f"Market leader in awareness: **{market_leader.get('awareness', 'N/A')}**, " \
             f"largest usage share: **{market_leader.get('usage', 'N/A')}**.\n\n"

    interp += f"**Conversion Insights:**\n" \
              f"Conversion Champion: **{conversion_champion.get('brand', 'N/A')}** " \
              f"converts **{conversion_champion.get('rate', 0):.2f}%** of aware customers into users.\n\n"

    interp += f"**Strategic Recommendations:**\n" \
              f"Biggest opportunity: **{biggest_opportunity.get('brand', 'N/A')}**, " \
              f"most drop-off at **{biggest_opportunity.get('bottleneck', 'N/A')}** stage."

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
        rates = rates.replace([np.inf, -np.inf], np.nan).fillna(0)

        # 100% 초과 값 클리핑
        rates = rates.clip(upper=100)

        self.conversion_rates = rates
        return self.conversion_rates

    def calculate_funnel_efficiency(self) -> pd.DataFrame:
        """Calculate overall funnel efficiency"""
        efficiency = pd.DataFrame(index=self.funnel_data.index)
        with np.errstate(divide='ignore', invalid='ignore'):
            efficiency['funnel_efficiency'] = np.divide(self.funnel_data['usage'], self.funnel_data['awareness']) * 100
        efficiency['funnel_efficiency'] = efficiency['funnel_efficiency'].replace([np.inf, -np.inf], np.nan).fillna(0)
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
            valid_rates = [r for r in rates if pd.notna(r) and r > 0]
            variance = np.var(valid_rates) if valid_rates else 0
            cons_score = max(0, 30 - (variance / 100))

            total_score = conv_score + vol_score + cons_score
            results[brand] = {
                'total_score': float(total_score),
                'conversion_component': float(conv_score),
                'consistency_component': float(cons_score),
                'volume_component': float(vol_score)
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
            valid_rates = {k: v for k, v in rates.items() if pd.notna(v) and v > 0}
            if not valid_rates:
                continue
            bottleneck_stage = min(valid_rates, key=valid_rates.get)
            bottleneck_rate = valid_rates[bottleneck_stage]
            bottlenecks.append({
                'brand': brand,
                'bottleneck_stage': bottleneck_stage,
                'conversion_rate': float(bottleneck_rate)
            })
        return pd.DataFrame(bottlenecks).sort_values('conversion_rate') if bottlenecks else pd.DataFrame()

    def calculate_market_share(self) -> list:
        """Calculate market share at each funnel stage - returns list format"""
        results = []
        stages = ['awareness', 'consideration', 'preference', 'usage']
        stage_totals = {stage: max(1, self.funnel_data[stage].sum()) for stage in stages}

        for brand in self.brands:
            if brand not in self.funnel_data.index:
                continue
            brand_data = {'brand': brand}
            for stage in stages:
                total = stage_totals[stage]
                brand_value = self.funnel_data.loc[brand, stage]
                share = (brand_value / total * 100) if total > 0 else 0.0
                brand_data[f'{stage}_share'] = float(share)
            results.append(brand_data)
        return results

    def generate_chart_data(self) -> dict:
        """Generate optimized data structures for charts"""
        stages = ['awareness', 'consideration', 'preference', 'usage']
        
        # Funnel Chart Data
        funnel_chart = []
        for stage in stages:
            row = {'stage': stage.capitalize()}
            for brand in self.brands:
                row[brand] = int(self.funnel_data.loc[brand, stage])
            funnel_chart.append(row)
        
        # Conversion Chart Data
        conversion_chart = []
        for brand in self.brands:
            conversion_chart.append({
                'brand': brand,
                'awareness_to_consideration': float(self.conversion_rates.loc[brand, 'awareness_to_consideration']),
                'consideration_to_preference': float(self.conversion_rates.loc[brand, 'consideration_to_preference']),
                'preference_to_usage': float(self.conversion_rates.loc[brand, 'preference_to_usage']),
                'awareness_to_usage': float(self.conversion_rates.loc[brand, 'awareness_to_usage'])
            })
        
        # Market Share Chart Data (already in list format from calculate_market_share)
        market_share_chart = self.calculate_market_share()
        
        return {
            'funnel_chart': funnel_chart,
            'conversion_chart': conversion_chart,
            'market_share_chart': market_share_chart
        }

    def generate_insights(self) -> dict:
        """Generate key insights from the analysis with descriptions"""
        self.calculate_conversion_rates()
        efficiency_df = self.calculate_funnel_efficiency()
        bottlenecks_df = self.identify_bottlenecks()
        market_share_list = self.calculate_market_share()
        conversion_rates_df = self.conversion_rates.copy().fillna(0)

        # Find market leaders
        awareness_leader = max(market_share_list, key=lambda x: x.get('awareness_share', 0))['brand'] if market_share_list else 'N/A'
        usage_leader = max(market_share_list, key=lambda x: x.get('usage_share', 0))['brand'] if market_share_list else 'N/A'

        insights = {
            'top_performer': {
                'brand': efficiency_df['funnel_efficiency'].idxmax() if not efficiency_df.empty else 'N/A',
                'efficiency': float(efficiency_df['funnel_efficiency'].max()) if not efficiency_df.empty else 0,
                'description': 'Highest conversion efficiency from awareness to usage'
            },
            'market_leader': {
                'awareness': awareness_leader,
                'usage': usage_leader,
                'description': 'Dominant brands in awareness and actual usage'
            },
            'biggest_opportunity': {
                'brand': bottlenecks_df.iloc[0]['brand'] if not bottlenecks_df.empty else 'N/A',
                'bottleneck': bottlenecks_df.iloc[0]['bottleneck_stage'] if not bottlenecks_df.empty else 'N/A',
                'rate': float(bottlenecks_df.iloc[0]['conversion_rate']) if not bottlenecks_df.empty else 0,
                'description': 'Brand with the weakest conversion stage requiring immediate attention'
            },
            'conversion_champion': {
                'brand': conversion_rates_df['awareness_to_usage'].idxmax() if not conversion_rates_df.empty else 'N/A',
                'rate': float(conversion_rates_df['awareness_to_usage'].max()) if not conversion_rates_df.empty else 0,
                'description': 'Best at converting aware customers into actual users'
            }
        }
        return insights

    def calculate_competitive_analysis(self) -> dict:
        """Calculate competitive positioning matrix"""
        results = {}
        for brand in self.brands:
            if brand not in self.funnel_data.index:
                continue
            
            # Calculate relative strength scores
            awareness_rank = self.funnel_data['awareness'].rank(ascending=False).loc[brand]
            usage_rank = self.funnel_data['usage'].rank(ascending=False).loc[brand]
            efficiency_rank = self.calculate_funnel_efficiency()['funnel_efficiency'].rank(ascending=False).loc[brand]
            
            results[brand] = {
                'awareness_rank': int(awareness_rank),
                'usage_rank': int(usage_rank),
                'efficiency_rank': int(efficiency_rank),
                'overall_position': 'Leader' if awareness_rank <= 2 and usage_rank <= 2 else 
                                   'Challenger' if usage_rank <= len(self.brands) / 2 else 
                                   'Follower'
            }
        return results

    def export_results(self) -> dict:
        """Export all analysis results in JSON-serializable format"""
        self.calculate_conversion_rates()
        results = {
            'funnel_data': self.funnel_data.to_dict('index'),
            'conversion_rates': self.conversion_rates.to_dict('index'),
            'market_share': self.calculate_market_share(),  # Now returns list
            'efficiency': self.calculate_funnel_efficiency().to_dict('index'),
            'bottlenecks': self.identify_bottlenecks().to_dict('records'),
            'drop_off': self.calculate_drop_off(),
            'health_scores': self.calculate_health_scores(),
            'insights': self.generate_insights(),
            'chart_data': self.generate_chart_data(),
            'competitive_analysis': self.calculate_competitive_analysis(),
            'total_respondents': self.total_respondents
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

        if not brands or len(brands) == 0:
            raise ValueError("No brands provided")

        if total_respondents <= 0:
            raise ValueError("total_respondents must be greater than 0")

        analysis = BrandFunnelAnalysis(brands, funnel_data, total_respondents)
        results_to_export = analysis.export_results()

        print(json.dumps({'results': results_to_export}))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

