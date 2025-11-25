import sys
import json
import pandas as pd
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def calculate_cohort_analysis(df, user_id_col, event_col, funnel_steps):
    """Calculate time-based cohort retention if timestamp exists"""
    time_col = None
    for col in df.columns:
        if 'time' in col.lower() or 'date' in col.lower():
            time_col = col
            break
    
    if not time_col:
        return None
    
    try:
        df[time_col] = pd.to_datetime(df[time_col])
        df = df.sort_values([user_id_col, time_col])
        
        # Get first step for each user
        first_events = df[df[event_col] == funnel_steps[0]].groupby(user_id_col)[time_col].first()
        
        cohort_data = []
        for step in funnel_steps[1:]:
            step_events = df[df[event_col] == step]
            step_completion = step_events.merge(
                first_events.reset_index(), 
                on=user_id_col, 
                how='inner'
            )
            
            if len(step_completion) > 0:
                step_completion['time_to_convert'] = (
                    step_completion[time_col + '_x'] - step_completion[time_col + '_y']
                ).dt.total_seconds() / 3600  # Convert to hours
                
                avg_time = step_completion['time_to_convert'].mean()
                median_time = step_completion['time_to_convert'].median()
                
                cohort_data.append({
                    'step': step,
                    'avg_time_hours': avg_time,
                    'median_time_hours': median_time
                })
        
        return cohort_data if cohort_data else None
    except:
        return None

def calculate_drop_off_analysis(funnel_df):
    """Calculate drop-off rates and identify problem areas"""
    drop_offs = []
    
    for i in range(len(funnel_df) - 1):
        current_users = funnel_df['users'].iloc[i]
        next_users = funnel_df['users'].iloc[i + 1]
        dropped = current_users - next_users
        drop_rate = (dropped / current_users * 100) if current_users > 0 else 0
        
        drop_offs.append({
            'from_step': funnel_df['step'].iloc[i],
            'to_step': funnel_df['step'].iloc[i + 1],
            'dropped_users': int(dropped),
            'drop_rate': float(drop_rate)
        })
    
    return drop_offs

def calculate_segment_analysis(df, user_id_col, event_col, funnel_steps):
    """Analyze funnel performance by user segments if categorical columns exist"""
    # Find potential segment columns (categorical with reasonable number of unique values)
    segment_cols = []
    for col in df.columns:
        if col not in [user_id_col, event_col] and df[col].dtype == 'object':
            unique_count = df[col].nunique()
            if 2 <= unique_count <= 10:  # Reasonable number of segments
                segment_cols.append(col)
    
    if not segment_cols:
        return None
    
    segment_col = segment_cols[0]  # Use first suitable column
    segments_analysis = []
    
    for segment in df[segment_col].unique():
        segment_df = df[df[segment_col] == segment]
        
        # Calculate funnel for this segment
        first_step_users = len(segment_df[segment_df[event_col] == funnel_steps[0]][user_id_col].unique())
        last_step_users = len(segment_df[segment_df[event_col] == funnel_steps[-1]][user_id_col].unique())
        
        overall_conversion = (last_step_users / first_step_users * 100) if first_step_users > 0 else 0
        
        segments_analysis.append({
            'segment': str(segment),
            'segment_type': segment_col,
            'total_users': int(first_step_users),
            'converted_users': int(last_step_users),
            'conversion_rate': float(overall_conversion)
        })
    
    # Sort by conversion rate
    segments_analysis.sort(key=lambda x: x['conversion_rate'], reverse=True)
    
    return segments_analysis

def generate_insights(funnel_df, drop_offs, time_analysis, segment_analysis):
    """Generate AI-like insights about the funnel"""
    insights = []
    
    # Overall conversion insight
    if len(funnel_df) > 0:
        initial = funnel_df['users'].iloc[0]
        final = funnel_df['users'].iloc[-1]
        overall_rate = (final / initial * 100) if initial > 0 else 0
        
        insights.append({
            'type': 'overview',
            'message': f"Overall funnel conversion: {overall_rate:.1f}% ({final:,} out of {initial:,} users completed the entire journey)",
            'severity': 'info'
        })
    
    # Identify biggest drop-off
    if drop_offs:
        max_drop = max(drop_offs, key=lambda x: x['drop_rate'])
        if max_drop['drop_rate'] > 50:
            insights.append({
                'type': 'warning',
                'message': f"Critical drop-off: {max_drop['drop_rate']:.1f}% of users drop between '{max_drop['from_step']}' and '{max_drop['to_step']}'",
                'severity': 'critical'
            })
        elif max_drop['drop_rate'] > 30:
            insights.append({
                'type': 'warning',
                'message': f"Significant drop-off: {max_drop['drop_rate']:.1f}% between '{max_drop['from_step']}' and '{max_drop['to_step']}'",
                'severity': 'warning'
            })
    
    # Time to convert insights
    if time_analysis:
        for step_time in time_analysis:
            if step_time['median_time_hours'] > 24:
                insights.append({
                    'type': 'time',
                    'message': f"Users take {step_time['median_time_hours']:.1f} hours (median) to reach '{step_time['step']}' - consider engagement tactics",
                    'severity': 'info'
                })
    
    # Segment performance
    if segment_analysis and len(segment_analysis) > 1:
        best = segment_analysis[0]
        worst = segment_analysis[-1]
        diff = best['conversion_rate'] - worst['conversion_rate']
        
        if diff > 20:
            insights.append({
                'type': 'segment',
                'message': f"'{best['segment']}' segment converts {diff:.1f}% better than '{worst['segment']}' - investigate what drives this difference",
                'severity': 'opportunity'
            })
    
    return insights

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        user_id_col = payload.get('user_id_col')
        event_col = payload.get('event_col')
        funnel_steps = payload.get('funnel_steps')

        if not all([data, user_id_col, event_col, funnel_steps]):
            raise ValueError("Missing required parameters")

        df = pd.DataFrame(data)
        
        if user_id_col not in df.columns or event_col not in df.columns:
            raise ValueError("Specified columns not in dataframe")

        funnel_counts = []
        user_sets = []

        # Get the set of users for the first step
        first_step_users = set(df[df[event_col] == funnel_steps[0]][user_id_col].unique())
        user_sets.append(first_step_users)
        funnel_counts.append(len(first_step_users))

        # For subsequent steps, find users who are also in the previous step's user set
        for i in range(1, len(funnel_steps)):
            previous_users = user_sets[i-1]
            current_step_users = set(df[df[event_col] == funnel_steps[i]][user_id_col].unique())
            
            # Users must have completed the previous step to be included in the current step
            retained_users = previous_users.intersection(current_step_users)
            user_sets.append(retained_users)
            funnel_counts.append(len(retained_users))

        funnel_df = pd.DataFrame({
            "step": funnel_steps,
            "users": funnel_counts
        })

        if not funnel_df.empty and funnel_df['users'].iloc[0] > 0:
            initial_users = funnel_df['users'].iloc[0]
            funnel_df['conversion_rate_from_start'] = funnel_df['users'] / initial_users
            
            # Calculate step-to-step conversion
            step_conversion = [1.0]  # First step is always 100% of itself
            for i in range(1, len(funnel_df)):
                prev_users = funnel_df['users'].iloc[i-1]
                curr_users = funnel_df['users'].iloc[i]
                rate = curr_users / prev_users if prev_users > 0 else 0
                step_conversion.append(rate)
            funnel_df['conversion_rate_from_previous'] = step_conversion
        else:
            funnel_df['conversion_rate_from_start'] = 0
            funnel_df['conversion_rate_from_previous'] = 0

        # Calculate additional analyses
        drop_offs = calculate_drop_off_analysis(funnel_df)
        time_analysis = calculate_cohort_analysis(df, user_id_col, event_col, funnel_steps)
        segment_analysis = calculate_segment_analysis(df, user_id_col, event_col, funnel_steps)
        insights = generate_insights(funnel_df, drop_offs, time_analysis, segment_analysis)

        response = {
            "results": funnel_df.to_dict('records'),
            "drop_offs": drop_offs,
            "time_analysis": time_analysis,
            "segment_analysis": segment_analysis,
            "insights": insights
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(json.dumps({"error": str(e), "details": error_details}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    