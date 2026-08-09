import pandas as pd
import numpy as np
import os

DATA_PATH = "data/raw/"

def parse_timepoint(sample_name):
    parts = sample_name.split("_")
    astronaut_id = parts[0]
    timepoint_str = parts[-1]
    
    if "L-" in timepoint_str:
        days = -int(timepoint_str.replace("L-", ""))
        phase = "pre_flight"
    elif "L+" in timepoint_str:
        days = int(timepoint_str.replace("L+", ""))
        phase = "in_flight"
    elif "FD" in timepoint_str:
        days = int(timepoint_str.replace("FD", ""))
        phase = "in_flight"
    elif "R+" in timepoint_str:
        days = int(timepoint_str.replace("R+", ""))
        phase = "post_return"
    else:
        days = 0
        phase = "unknown"
    
    return astronaut_id, days, phase

def load_metabolic():
    df = pd.read_csv(DATA_PATH + "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv")
    
    value_cols = [c for c in df.columns if c.endswith('_value') or 
                  ('_value_' in c and '_range_' not in c)]
    
    keep = ['Sample Name'] + [c for c in df.columns if '_value' in c and '_range_' not in c]
    df = df[keep].copy()
    
    parsed = df['Sample Name'].apply(parse_timepoint)
    df['astronaut_id'] = parsed.apply(lambda x: x[0])
    df['days_from_launch'] = parsed.apply(lambda x: x[1])
    df['phase'] = parsed.apply(lambda x: x[2])
    
    return df

def load_cardiovascular():
    df = pd.read_csv(DATA_PATH + "LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv")
    
    keep = ['Sample Name'] + [c for c in df.columns if '_concentration_' in c]
    df = df[keep].copy()
    
    parsed = df['Sample Name'].apply(parse_timepoint)
    df['astronaut_id'] = parsed.apply(lambda x: x[0])
    df['days_from_launch'] = parsed.apply(lambda x: x[1])
    df['phase'] = parsed.apply(lambda x: x[2])
    
    return df

def load_immune():
    df = pd.read_csv(DATA_PATH + "LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv")
    
    key_cytokines = [
        'il_6_concentration_picogram_per_milliliter',
        'il_1β_concentration_picogram_per_milliliter', 
        'tnfα_concentration_picogram_per_milliliter',
        'il_10_concentration_picogram_per_milliliter',
        'il_8_concentration_picogram_per_milliliter',
        'ifnγ_concentration_picogram_per_milliliter',
        'vegf_a_concentration_picogram_per_milliliter',
        'mcp_1_concentration_picogram_per_milliliter'
    ]
    
    available = [c for c in key_cytokines if c in df.columns]
    keep = ['Sample Name'] + available
    df = df[keep].copy()
    
    parsed = df['Sample Name'].apply(parse_timepoint)
    df['astronaut_id'] = parsed.apply(lambda x: x[0])
    df['days_from_launch'] = parsed.apply(lambda x: x[1])
    df['phase'] = parsed.apply(lambda x: x[2])
    
    return df

def load_all():
    metabolic = load_metabolic()
    cardio = load_cardiovascular()
    immune = load_immune()
    
    print(f"Metabolic: {metabolic.shape} — astronauts: {metabolic['astronaut_id'].unique()}")
    print(f"Cardiovascular: {cardio.shape} — timepoints: {sorted(cardio['days_from_launch'].unique())}")
    print(f"Immune: {immune.shape} — phases: {immune['phase'].unique()}")
    
    return metabolic, cardio, immune

if __name__ == "__main__":
    m, c, i = load_all()
    print("\nMetabolic sample:")
    print(m[['Sample Name', 'astronaut_id', 'days_from_launch', 'phase']].head(8))