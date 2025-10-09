#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np

def safe_float(value):
    """Convert to float, handling NaN and Infinity"""
    if pd.isna(value) or np.isinf(value):
        return 0.0
    return float(value)

def safe_divide(numerator, denominator):
    """Safely divide, returning 0 if denominator is 0"""
    if denominator == 0 or pd.isna(denominator):
        return 0.0
    result = numerator / denominator
    return safe_float(result)

class BrandFunnelAnalysis:
    def __init__(self, brands, funnel_data):
        self.brands = brands
        self.data = pd.DataFrame(funnel_data).T
        
    def get_funnel_data(self):
        """Return funnel data as dict with brands as keys"""
        return self.data.to_dict('index')
    
    def calculate_conversion_rates(self):
        """Calculate conversion rates between stages"""
        results = {}
        for brand in self.brands:
            if brand not in self.data.index:
                continue
                
            aware = self.data.loc[brand, 'awareness']
            consider = self.data.loc[brand, 'consideration']
            prefer = self.data.loc[brand, 'preference']
            usage = self.data.loc[brand, 'usage']
            
            results[brand] = {
                'awareness_to_consideration': safe_divide(consider, aware) * 100,
                'consideration_to_preference': safe_divide(prefer, consider) * 100,
                'preference_to_usage': safe_divide(usage, prefer) * 100,
                'awareness_to_usage': safe_divide(usage, aware) * 100
            }
        
        return results
    
    def calculate_market_share(self):
        """Calculate market share at each stage"""
        results = {}
        stages = ['awareness', 'consideration', 'preference', 'usage']
        
        for stage in stages:
            total = self.data[stage].sum()
            share_dict = {}
            for brand in self.brands:
                if brand in self.data.index:
                    share_dict[brand] = safe_divide(self.data.loc[brand, stage], total) * 100
                else:
                    share_dict[brand] = 0.0
            results[f'{stage}_share'] = share_dict
        
        return results
    
    def calculate_efficiency(self):
        """Calculate funnel efficiency"""
        results = {}
        for brand in self.brands:
            if brand not in self.data.index:
                continue
                
            aware = self.data.loc[brand, 'awareness']
            usage = self.data.loc[brand, 'usage']
            
            eff = safe_divide(usage, aware) * 100
            
            results[brand] = {
                'funnel_efficiency': eff,
                'drop_off_rate': 100 - eff
            }
        
        return results
    
    def identify_bottlenecks(self):
        """Find bottleneck stages"""
        conversion_rates = self.calculate_conversion_rates()
        bottlenecks = []
        
        for brand in self.brands:
            if brand not in conversion_rates:
                continue
                
            rates = {
                'Awareness → Consideration': conversion_rates[brand]['awareness_to_consideration'],
                'Consideration → Preference': conversion_rates[brand]['consideration_to_preference'],
                'Preference → Usage': conversion_rates[brand]['preference_to_usage']
            }
            
            bottleneck_stage = min(rates.keys(), key=lambda k: rates[k])
            
            bottlenecks.append({
                'brand': brand,
                'bottleneck_stage': bottleneck_stage,
                'conversion_rate': safe_float(rates[bottleneck_stage])
            })
        
        return sorted(bottlenecks, key=lambda x: x['conversion_rate'])
    
    def calculate_drop_off(self):
        """Calculate drop-off at each stage"""
        results = {}
        stages = ['awareness', 'consideration', 'preference', 'usage']
        
        for brand in self.brands:
            if brand not in self.data.index:
                continue
                
            brand_drop = {}
            for i in range(len(stages) - 1):
                current = self.data.loc[brand, stages[i]]
                next_stage = self.data.loc[brand, stages[i + 1]]
                
                drop_count = int(current - next_stage)
                drop_rate = safe_divide(drop_count, current) * 100
                
                brand_drop[f'{stages[i]}_to_{stages[i + 1]}'] = {
                    'count': drop_count,
                    'rate': safe_float(drop_rate)
                }
            
            results[brand] = brand_drop
        
        return results
    
    def calculate_health_scores(self):
        """Calculate overall health score"""
        results = {}
        conversion_rates = self.calculate_conversion_rates()
        
        max_awareness = self.data['awareness'].max()
        
        for brand in self.brands:
            if brand not in self.data.index or brand not in conversion_rates:
                continue
            
            # Conversion component (40 points)
            conv_score = min(conversion_rates[brand]['awareness_to_usage'] * 0.4, 40)
            
            # Volume component (30 points)
            vol_score = safe_divide(self.data.loc[brand, 'awareness'], max_awareness) * 30
            
            # Consistency component (30 points)
            rates = [
                conversion_rates[brand]['awareness_to_consideration'],
                conversion_rates[brand]['consideration_to_preference'],
                conversion_rates[brand]['preference_to_usage']
            ]
            variance = np.var(rates) if len(rates) > 0 else 0
            cons_score = max(0, 30 - (variance / 100))
            
            total = conv_score + vol_score + cons_score
            
            results[brand] = {
                'total_score': safe_float(total),
                'conversion_component': safe_float(conv_score),
                'consistency_component': safe_float(cons_score),
                'volume_component': safe_float(vol_score)
            }
        
        return results
    
    def generate_insights(self):
        """Generate insights"""
        efficiency = self.calculate_efficiency()
        conversion_rates = self.calculate_conversion_rates()
        bottlenecks = self.identify_bottlenecks()
        
        if not efficiency or not conversion_rates:
            return {}
        
        # Top performer
        top_brand = max(efficiency.keys(), key=lambda k: efficiency[k]['funnel_efficiency'])
        
        # Market leader
        awareness_leader = self.data['awareness'].idxmax()
        usage_leader = self.data['usage'].idxmax()
        
        # Conversion champion
        conv_champion = max(conversion_rates.keys(), 
                          key=lambda k: conversion_rates[k]['awareness_to_usage'])
        
        return {
            'top_performer': {
                'brand': top_brand,
                'efficiency': safe_float(efficiency[top_brand]['funnel_efficiency']),
                'description': f"{top_brand} has the highest funnel efficiency"
            },
            'market_leader': {
                'awareness': awareness_leader,
                'usage': usage_leader,
                'description': f"Market leader in awareness: {awareness_leader}, in usage: {usage_leader}"
            },
            'biggest_opportunity': {
                'brand': bottlenecks[0]['brand'],
                'bottleneck': bottlenecks[0]['bottleneck_stage'],
                'rate': bottlenecks[0]['conversion_rate'],
                'description': f"{bottlenecks[0]['brand']} has opportunity at {bottlenecks[0]['bottleneck_stage']}"
            },
            'conversion_champion': {
                'brand': conv_champion,
                'rate': safe_float(conversion_rates[conv_champion]['awareness_to_usage']),
                'description': f"{conv_champion} has the best conversion rate"
            }
        }

def main():
    try:
        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        
        brands = payload.get('brands', [])
        funnel_data = payload.get('funnel_data', {})
        
        if not brands or not funnel_data:
            raise ValueError("Missing brands or funnel_data")
        
        # Analyze
        analysis = BrandFunnelAnalysis(brands, funnel_data)
        
        results = {
            'funnel_data': analysis.get_funnel_data(),
            'conversion_rates': analysis.calculate_conversion_rates(),
            'market_share': analysis.calculate_market_share(),
            'efficiency': analysis.calculate_efficiency(),
            'bottlenecks': analysis.identify_bottlenecks(),
            'drop_off': analysis.calculate_drop_off(),
            'health_scores': analysis.calculate_health_scores(),
            'insights': analysis.generate_insights()
        }
        
        response = {'results': results}
        print(json.dumps(response, ensure_ascii=False))
        
    except Exception as e:
        error_response = {'error': str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

    