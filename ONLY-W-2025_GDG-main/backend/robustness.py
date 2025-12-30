import numpy as np
from scipy import stats

def test_linearity(x, y, threshold=0.5):
    """Test if relationship is linear using residual correlation."""
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
    """Compute correlation using appropriate method (Pearson vs Spearman)."""
    x = np.array(x, dtype=float)
    y = np.array(y, dtype=float)
    mask = ~(np.isnan(x) | np.isnan(y))
    x, y = x[mask], y[mask]

    if len(x) < 5:
        return {
            'corr': 0.0, 'method': 'INSUFFICIENT', 
            'linearity': 'UNKNOWN', 'p_value': 1.0
        }

    if np.std(x) == 0 or np.std(y) == 0:
        return {
            'corr': 0.0, 'method': 'ZERO_VARIANCE', 
            'linearity': 'N/A', 'p_value': 1.0
        }

    linearity_result = test_linearity(x, y)
    linearity = linearity_result['linearity']

    try:
        if linearity == 'LINEAR':
            corr, p_val = stats.pearsonr(x, y)
            return {
                'corr': corr, 'method': 'PEARSON', 
                'linearity': 'LINEAR', 'p_value': p_val
            }
        else:
            corr, p_val = stats.spearmanr(x, y)
            return {
                'corr': corr, 'method': 'SPEARMAN', 
                'linearity': 'NON_LINEAR', 'p_value': p_val
            }
    except:
        return {
            'corr': 0.0, 'method': 'ERROR', 
            'linearity': linearity, 'p_value': 1.0
        }


def compute_weighted_robustness_score(baseline, stressed):
    """
    Compute weighted robustness score.
    baseline and stressed are dicts of {feature: corr_value}
    """
    if not baseline:
        return {'score': 100.0, 'weighted_drift': 0.0}

    # Extract absolute correlations for weighting
    abs_corrs = {f: abs(baseline[f]) if isinstance(baseline[f], (int, float)) 
                 else abs(baseline[f].get('corr', 0)) for f in baseline}

    total = sum(abs_corrs.values())
    if total == 0:
        return {'score': 100.0, 'weighted_drift': 0.0}

    weights = {f: abs_corrs[f] / total for f in abs_corrs}
    weighted_drift = 0.0

    for feature in baseline:
        if feature not in stressed:
            weighted_drift += weights[feature]
            continue

        base_val = baseline[feature]
        stressed_val = stressed[feature]

        # Handle both dict and float values
        base_corr = base_val if isinstance(base_val, (int, float)) else base_val.get('corr', 0)
        stressed_corr = stressed_val if isinstance(stressed_val, (int, float)) else stressed_val.get('corr', 0)

        base_method = 'UNKNOWN' if isinstance(base_val, (int, float)) else base_val.get('method', 'UNKNOWN')
        stressed_method = 'UNKNOWN' if isinstance(stressed_val, (int, float)) else stressed_val.get('method', 'UNKNOWN')

        # Calculate drift
        drift = abs(base_corr - stressed_corr)
        weighted_drift += weights[feature] * drift

        # Sign flip penalty
        if base_corr * stressed_corr < 0:
            weighted_drift += weights[feature] * 0.75

        # Method change penalty
        if base_method != stressed_method and base_method != 'UNKNOWN':
            weighted_drift += weights[feature] * 0.5

    score = 100 * (1 - weighted_drift)
    score = max(0.0, min(100.0, score))

    return {'score': score, 'weighted_drift': weighted_drift}