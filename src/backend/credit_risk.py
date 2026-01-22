import sys
import json
import numpy as np
import QuantLib as ql
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def calculate_cva_dva(
    valuation_date, spot_price, strike_price, volatility, risk_free_rate,
    maturity_date, option_type, hazard_rate_cp, recovery_rate_cp,
    hazard_rate_own, recovery_rate_own, time_steps, num_paths
):
    ql.Settings.instance().evaluationDate = valuation_date
    day_count = ql.Actual365Fixed()

    # Option setup
    underlying = ql.SimpleQuote(spot_price)
    payoff = ql.PlainVanillaPayoff(
        ql.Option.Call if option_type == 'call' else ql.Option.Put, strike_price
    )
    exercise = ql.EuropeanExercise(maturity_date)
    option = ql.VanillaOption(payoff, exercise)

    # Market data
    risk_free_ts = ql.YieldTermStructureHandle(
        ql.FlatForward(valuation_date, risk_free_rate, day_count)
    )
    dividend_ts = ql.YieldTermStructureHandle(
        ql.FlatForward(valuation_date, 0.0, day_count) # No dividends
    )
    volatility_ts = ql.BlackVolTermStructureHandle(
        ql.BlackConstantVol(valuation_date, ql.NullCalendar(), volatility, day_count)
    )

    # Black-Scholes-Merton process
    process = ql.BlackScholesMertonProcess(
        ql.QuoteHandle(underlying), dividend_ts, risk_free_ts, volatility_ts
    )

    # Simulation setup
    maturity_in_years = day_count.yearFraction(valuation_date, maturity_date)
    time_grid = ql.TimeGrid(maturity_in_years, time_steps)
    rng = ql.UniformRandomGenerator(seed=42)
    path_generator = ql.GaussianPathGenerator(process, time_grid, rng, False)
    
    # Pricing engine
    engine = ql.AnalyticEuropeanEngine(process)
    option.setPricingEngine(engine)

    # Exposure simulation
    ee = np.zeros(time_steps + 1)
    ene = np.zeros(time_steps + 1)

    for i in range(num_paths):
        path = path_generator.next().value()
        for j, t in enumerate(time_grid):
            ql.Settings.instance().evaluationDate = valuation_date + int(t * 365)
            underlying.setValue(path[j])
            
            try:
                npv = option.NPV()
                ee[j] += max(npv, 0)
                ene[j] += max(-npv, 0)
            except Exception:
                # If pricing fails (e.g., at expiry), use intrinsic value
                intrinsic = max(path[j] - strike_price, 0) if option_type == 'call' else max(strike_price - path[j], 0)
                ee[j] += max(intrinsic, 0)
                ene[j] += max(-intrinsic, 0)

    ee /= num_paths
    ene /= num_paths
    
    # Restore evaluation date
    ql.Settings.instance().evaluationDate = valuation_date

    # Credit curves
    cp_hazard_curve = ql.FlatHazardRate(valuation_date, ql.QuoteHandle(ql.SimpleQuote(hazard_rate_cp)), day_count)
    own_hazard_curve = ql.FlatHazardRate(valuation_date, ql.QuoteHandle(ql.SimpleQuote(hazard_rate_own)), day_count)

    # CVA/DVA calculation
    cva = 0
    dva = 0
    discount_factors = np.array([risk_free_ts.discount(t) for t in time_grid])

    for i in range(1, len(time_grid)):
        t_prev = time_grid[i-1]
        t_curr = time_grid[i]
        
        # Average exposure over the interval
        avg_ee = (ee[i] + ee[i-1]) / 2
        avg_ene = (ene[i] + ene[i-1]) / 2
        
        # Marginal default probabilities
        pd_cp = cp_hazard_curve.defaultProbability(t_prev, t_curr)
        pd_own = own_hazard_curve.defaultProbability(t_prev, t_curr)
        
        # Discounted expected loss for this period
        df = (discount_factors[i] + discount_factors[i-1]) / 2
        
        cva += (1 - recovery_rate_cp) * avg_ee * pd_cp * df
        dva += (1 - recovery_rate_own) * avg_ene * pd_own * df
        
    return cva, dva, ee.tolist(), ene.tolist(), list(time_grid)

def main():
    try:
        payload = json.load(sys.stdin)
        
        valuation_date = ql.Date(22, 1, 2026) # Fixed for consistency
        maturity_years = payload.get('maturity_years', 1)
        maturity_date = valuation_date + ql.Period(int(maturity_years * 365), ql.Days)

        cva, dva, ee, ene, time_grid = calculate_cva_dva(
            valuation_date=valuation_date,
            spot_price=payload.get('spot_price', 100),
            strike_price=payload.get('strike_price', 100),
            volatility=payload.get('volatility', 0.2),
            risk_free_rate=payload.get('risk_free_rate', 0.05),
            maturity_date=maturity_date,
            option_type=payload.get('option_type', 'call'),
            hazard_rate_cp=payload.get('hazard_rate_cp', 0.02),
            recovery_rate_cp=payload.get('recovery_rate_cp', 0.4),
            hazard_rate_own=payload.get('hazard_rate_own', 0.01),
            recovery_rate_own=payload.get('recovery_rate_own', 0.4),
            time_steps=payload.get('time_steps', 52),
            num_paths=payload.get('num_paths', 1000)
        )
        
        # Calculate base NPV
        option = ql.VanillaOption(
            ql.PlainVanillaPayoff(ql.Option.Call if payload.get('option_type', 'call') == 'call' else ql.Option.Put, payload.get('strike_price', 100)),
            ql.EuropeanExercise(maturity_date)
        )
        process = ql.BlackScholesMertonProcess(
            ql.QuoteHandle(ql.SimpleQuote(payload.get('spot_price', 100))),
            ql.YieldTermStructureHandle(ql.FlatForward(valuation_date, 0.0, ql.Actual365Fixed())),
            ql.YieldTermStructureHandle(ql.FlatForward(valuation_date, payload.get('risk_free_rate', 0.05), ql.Actual365Fixed())),
            ql.BlackVolTermStructureHandle(ql.BlackConstantVol(valuation_date, ql.NullCalendar(), payload.get('volatility', 0.2), ql.Actual365Fixed()))
        )
        engine = ql.AnalyticEuropeanEngine(process)
        option.setPricingEngine(engine)
        base_npv = option.NPV()
        
        response = {
            'results': {
                'cva': cva,
                'dva': dva,
                'xva': cva - dva,
                'base_npv': base_npv,
                'adjusted_npv': base_npv - (cva - dva),
                'ee_profile': ee,
                'ene_profile': ene,
                'time_grid': time_grid
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
