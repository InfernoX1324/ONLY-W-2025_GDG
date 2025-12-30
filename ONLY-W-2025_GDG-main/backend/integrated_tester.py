
import os
import json
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import sys
from scipy import stats


def compute_safe_limit(levels, scores, safe_ratio=0.90): #aaaaaaaaaaaaaaaaaaaaaaa
    """
    Returns max level where robustness stays above safe_ratio of baseline
    """
    baseline = scores[0]
    threshold = safe_ratio * baseline

    for lvl, s in zip(levels, scores):
        if s < threshold:
            return lvl

    return levels[-1]

def detect_dominant_feature(correlations):
    """
    Detects if a feature dominates based on correlation strength
    """
    abs_corr = {k: abs(v) for k, v in correlations.items()}

    mean_corr = np.mean(list(abs_corr.values()))
    std_corr = np.std(list(abs_corr.values()))

    threshold = mean_corr + std_corr

    dominant = [
        feat for feat, val in abs_corr.items()
        if val > threshold
    ]

    if dominant:
        top_feat = max(dominant, key=lambda f: abs_corr[f])
        return {
            "feature": top_feat,
            "influence": round(abs_corr[top_feat], 3),
            "threshold": round(threshold, 3)
        }

    return None


def test_linearity(x, y, threshold=0.5):
    x = np.array(x, dtype=float)
    y = np.array(y, dtype=float)
    mask = ~(np.isnan(x) | np.isnan(y))
    x_clean, y_clean = x[mask], y[mask]

    if len(x_clean) < 5:
        return {'linearity': 'LINEAR', 'residual_corr': 0.0}

    try:
        slope, intercept = np.polyfit(x_clean, y_clean, 1)
        residuals = y_clean - (slope * x_clean + intercept)
        resid_corr, _ = stats.pearsonr(x_clean, residuals)
        linearity = 'NON_LINEAR' if abs(resid_corr) > threshold else 'LINEAR'
        return {'linearity': linearity, 'residual_corr': resid_corr}
    except:
        return {'linearity': 'LINEAR', 'residual_corr': 0.0}

def compute_smart_correlation(x, y):
    x = np.array(x, dtype=float)
    y = np.array(y, dtype=float)
    mask = ~(np.isnan(x) | np.isnan(y))
    x, y = x[mask], y[mask]

    if len(x) < 5:
        return {'corr': 0.0, 'method': 'INSUFFICIENT', 'linearity': 'UNKNOWN', 'p_value': 1.0}

    if np.std(x) == 0 or np.std(y) == 0:
        return {'corr': 0.0, 'method': 'ZERO_VARIANCE', 'linearity': 'N/A', 'p_value': 1.0}

    linearity_result = test_linearity(x, y)
    linearity = linearity_result['linearity']

    try:
        if linearity == 'LINEAR':
            corr, p_val = stats.pearsonr(x, y)
            return {'corr': corr, 'method': 'PEARSON', 'linearity': 'LINEAR', 'p_value': p_val}
        else:
            corr, p_val = stats.spearmanr(x, y)
            return {'corr': corr, 'method': 'SPEARMAN', 'linearity': 'NON_LINEAR', 'p_value': p_val}
    except:
        return {'corr': 0.0, 'method': 'ERROR', 'linearity': linearity, 'p_value': 1.0}

def compute_weighted_robustness_score(baseline, stressed):
    if not baseline:
        return {'score': 100.0}

    # Extract absolute correlations for weighting
    abs_corrs = {f: abs(baseline[f]) for f in baseline}
    total = sum(abs_corrs.values())
    
    # If all baseline correlations are zero, return perfect score
    if total == 0:
        return {'score': 100.0}

    # Calculate weights based on absolute correlation values
    weights = {f: abs_corrs[f] / total for f in abs_corrs}
    weighted_drift = 0.0

    for feature in baseline:
        if feature not in stressed:
            # Missing feature penalty
            weighted_drift += weights[feature]
            continue

        base_corr = baseline[feature]
        stressed_corr = stressed[feature]

        # Calculate drift
        drift = abs(base_corr - stressed_corr)
        weighted_drift += weights[feature] * drift

        # Sign flip penalty (correlation changed from positive to negative or vice versa)
        if base_corr * stressed_corr < 0:
            weighted_drift += weights[feature] * 0.75

    score = 100 * (1 - weighted_drift)
    score = max(0.0, min(100.0, score))
    return {'score': round(score, 2)}

def inject_noise(df, target_col, level):
    noisy = df.copy()
    for col in df.columns:
        if col != target_col:
            sigma = df[col].std()
            if sigma > 0:
                noise = np.random.normal(0, level * sigma, len(df))
                noisy[col] += noise
    return noisy

def inject_missingness(df, target_col, level):
    miss = df.copy()
    for col in df.columns:
        if col != target_col:
            mask = np.random.rand(len(df)) < level
            miss.loc[mask, col] = np.nan
    return miss.fillna(miss.mean())

def compute_correlations(df, target_col):
    corrs = {}
    for col in df.columns:
        if col != target_col:
            corrs[col] = compute_smart_correlation(df[col], df[target_col])['corr']
    return corrs

def run_analysis(csv_path, target_col):
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(os.path.dirname(__file__), '..', 'analysis.json')

    # Validate target column is provided
    if not target_col or target_col.strip().lower() in ['null', 'none', '']:
        raise ValueError("Target column is required. Please select a target column from the dropdown.")

    # Strip whitespace from target column name
    target_col = target_col.strip() if target_col else target_col

    df = pd.read_csv(csv_path)
    # Strip whitespace from column names to ensure matching
    df.columns = df.columns.str.strip()
    df = df.apply(pd.to_numeric, errors='coerce').dropna(how='all')
    num_df = df.select_dtypes([np.number])

    # Find the actual column name in the dataframe (case-insensitive matching)
    actual_target_col = None
    target_lower = target_col.lower()
    for col in num_df.columns:
        if col.lower() == target_lower:
            actual_target_col = col
            break
    
    if actual_target_col is None:
        # Try exact match as fallback (after stripping, should match)
        if target_col in num_df.columns:
            actual_target_col = target_col
        else:
            raise ValueError(f"Target '{target_col}' not found. Columns: {list(num_df.columns)}")
    
    # Use the actual column name from dataframe (preserves original case/format)
    target_col = actual_target_col

    zero_var = num_df.columns[num_df.var() == 0]
    num_df = num_df.drop(columns=zero_var)

    baseline = compute_correlations(num_df, target_col)
    dominant_info = detect_dominant_feature(baseline)

    levels = [0.01, 0.05, 0.1, 0.2, 0.3]
    n_res, m_res, b_res = [], [], []

    for l in levels:
        n_df = inject_noise(num_df, target_col, l)
        n_res.append(compute_weighted_robustness_score(baseline, compute_correlations(n_df, target_col))['score'])

        m_df = inject_missingness(num_df, target_col, l)
        m_res.append(compute_weighted_robustness_score(baseline, compute_correlations(m_df, target_col))['score'])

        b_df = num_df.copy()
        b_df[target_col] += np.random.normal(0, l * num_df[target_col].std() * 10, len(b_df))
        b_res.append(compute_weighted_robustness_score(baseline, compute_correlations(b_df, target_col))['score'])
#aaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    lvls = np.linspace(0, 0.3, 100)
    n_res1, m_res1, b_res1 = [], [], []

    for l in levels:
        n_df1 = inject_noise(num_df, target_col, l)
        n_res1.append(compute_weighted_robustness_score(baseline, compute_correlations(n_df1, target_col))['score'])

        m_df1 = inject_missingness(num_df, target_col, l)
        m_res1.append(compute_weighted_robustness_score(baseline, compute_correlations(m_df1, target_col))['score'])

        b_df1 = num_df.copy()
        b_df1[target_col] += np.random.normal(0, l * num_df[target_col].std() * 10, len(b_df1))
        b_res1.append(compute_weighted_robustness_score(baseline, compute_correlations(b_df1, target_col))['score'])
    safe_noise = compute_safe_limit(lvls, n_res1)
    safe_missing = compute_safe_limit(lvls, m_res1)
    safe_bias = compute_safe_limit(lvls, b_res1)
#aaaaaaaaaaaaaaaaaaaaaaaa
    plt.figure(figsize=(12, 6))
    plt.style.use('dark_background')
    plt.plot([l*100 for l in levels], n_res, 'o-', label='Noise', linewidth=2)
    plt.plot([l*100 for l in levels], m_res, 's-', label='Missing Data', linewidth=2)
    plt.plot([l*100 for l in levels], b_res, '^-', label='Bias/Drift', linewidth=2)
    plt.title(f'Robustness Test - Target: {target_col}')
    plt.xlabel('Stress Level (%)')
    plt.ylabel('Robustness Score')
    plt.legend()
    plt.grid(alpha=0.3)
    plt.savefig(os.path.join(output_dir, 'stress_plot.png'), dpi=150)
    plt.close()
#AAAAAAAAAAAAAAAAAAAAAA
    try:
        results = {
            "status": "success",

            # overall score (you can keep your logic or change it)
            "score": round(np.mean(n_res + m_res + b_res), 2),

            "noise_score": round(np.mean(n_res), 2),
            "missing_score": round(np.mean(m_res), 2),
            "bias_score": round(np.mean(b_res), 2),

            "dominant_feature": dominant_info,

            "safe_limits": {
                "max_noise_percent": round(safe_noise * 100, 1),
                "max_missing_percent": round(safe_missing * 100, 1),
                "max_bias_factor": round(1 + safe_bias, 2)
            },

            # keep actual column name
            "target_detected": str(target_col)
        }

        with open(json_path, "w") as f:
            json.dump(results, f, indent=4)

        print(f'Analysis complete: {results["score"]}/100')

    except Exception as e:
        with open(json_path, "w") as f:
            json.dump({
                "status": "error",
                "reason": str(e)
            }, f, indent=4)

#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
if __name__ == '__main__':
    csv_path, target_col = sys.argv[1], sys.argv[2]
    run_analysis(csv_path, target_col)
