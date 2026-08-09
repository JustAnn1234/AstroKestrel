import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def build_trajectory(astronaut_id, system, risk_df):
    astronaut_data = risk_df[
        (risk_df['astronaut_id'] == astronaut_id) &
        (risk_df['system'] == system)
    ].copy()

    if len(astronaut_data) < 2:
        return None

    astronaut_data = astronaut_data.sort_values('days_from_launch')

    return astronaut_data[['days_from_launch', 'risk_score']].reset_index(drop=True)

def extrapolate_mars_mission(trajectory_df, mission_duration=180):
    if trajectory_df is None or len(trajectory_df) < 2:
        return None

    days = trajectory_df['days_from_launch'].values
    scores = trajectory_df['risk_score'].values

    coeffs = np.polyfit(days, scores, deg=min(2, len(days) - 1))
    poly = np.poly1d(coeffs)

    future_days = np.arange(0, mission_duration + 1, 10)
    projected_scores = np.clip(poly(future_days), 0, 1)

    return pd.DataFrame({
        'mission_day': future_days,
        'projected_risk': projected_scores.round(3)
    })

def find_critical_threshold_day(projection_df, threshold=0.75):
    if projection_df is None:
        return None

    critical = projection_df[projection_df['projected_risk'] >= threshold]
    if critical.empty:
        return None

    return int(critical.iloc[0]['mission_day'])

def run_mars_mission_forecast(anomaly_results_df):
    astronauts = anomaly_results_df['astronaut_id'].unique()
    systems = anomaly_results_df['system'].unique()

    forecast_summary = []

    print("\n=== MARS MISSION RISK PROJECTIONS (180-day mission) ===")
    print("=" * 65)

    for astronaut in astronauts:
        print(f"\nAstronaut {astronaut}:")
        astronaut_forecasts = {}

        for system in systems:
            trajectory = build_trajectory(astronaut, system, anomaly_results_df)
            projection = extrapolate_mars_mission(trajectory)

            if projection is None:
                continue

            critical_day = find_critical_threshold_day(projection)
            peak_risk = projection['projected_risk'].max()
            day_30_risk = projection[projection['mission_day'] <= 30].iloc[-1]['projected_risk']
            day_90_risk = projection[projection['mission_day'] <= 90].iloc[-1]['projected_risk']
            day_180_risk = projection.iloc[-1]['projected_risk']

            astronaut_forecasts[system] = projection

            status = "⚠ CRITICAL THRESHOLD BREACHED" if critical_day else "✓ Within tolerance"
            critical_str = f"Day {critical_day}" if critical_day else "Never"

            print(f"  {system.capitalize():<20} "
                  f"Day 30: {day_30_risk:.2f} | "
                  f"Day 90: {day_90_risk:.2f} | "
                  f"Day 180: {day_180_risk:.2f} | "
                  f"Critical: {critical_str}")

            forecast_summary.append({
                'astronaut_id': astronaut,
                'system': system,
                'day_30_risk': day_30_risk,
                'day_90_risk': day_90_risk,
                'day_180_risk': day_180_risk,
                'peak_risk': round(peak_risk, 3),
                'critical_threshold_day': critical_day,
                'breaches_critical': critical_day is not None
            })

    return pd.DataFrame(forecast_summary)

def generate_mission_warning(forecast_df):
    print("\n=== MISSION COMMANDER FORECAST WARNINGS ===")
    critical_forecasts = forecast_df[forecast_df['breaches_critical'] == True]

    if critical_forecasts.empty:
        print("No systems projected to breach critical threshold during 180-day mission.")
        return

    for _, row in critical_forecasts.sort_values('critical_threshold_day').iterrows():
        print(f"\n  🚨 {row['astronaut_id']} — {row['system'].capitalize()} system")
        print(f"     Projected to reach CRITICAL risk on Mission Day {row['critical_threshold_day']}")
        print(f"     Trajectory: Day 30 ({row['day_30_risk']:.2f}) → "
              f"Day 90 ({row['day_90_risk']:.2f}) → "
              f"Day 180 ({row['day_180_risk']:.2f})")
        print(f"     Recommendation: Begin preventive intervention before Day "
              f"{max(1, row['critical_threshold_day'] - 14)}")

if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.data_loader import load_all
    from ml.anomaly import run_anomaly_analysis

    metabolic, cardio, immune = load_all()
    anomaly_results = run_anomaly_analysis(metabolic, cardio, immune)

    forecast_df = run_mars_mission_forecast(anomaly_results)
    generate_mission_warning(forecast_df)

    print("\n=== FORECAST SUMMARY TABLE ===")
    print(forecast_df.to_string())