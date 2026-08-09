import pandas as pd
import os

data_path = "data/raw/"

files = os.listdir(data_path)
print("Files in data folder:")
for f in files:
    print(f" -", f)

print("\n--- Metabolic Panel ---")
cmp = pd.read_csv(data_path + "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv")
print(cmp.shape)
print(cmp.columns.tolist())
print(cmp.head(3))

print("\n--- Cardiovascular Panel ---")
cardio = pd.read_csv(data_path + "LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv")
print(cardio.shape)
print(cardio.columns.tolist())
print(cardio.head(3))

print("\n--- Immune Panel 1 ---")
immune1 = pd.read_csv(data_path + "LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv")
print(immune1.shape)
print(immune1.columns.tolist())
print(immune1.head(3))