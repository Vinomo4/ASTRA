from __future__ import annotations

import numpy as np
import pandas as pd


def bootstrap_equity_curve(returns: pd.Series, n_paths: int = 1000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    samples = [
        rng.choice(returns.to_numpy(), size=len(returns), replace=True) for _ in range(n_paths)
    ]
    cumulative = [np.cumprod(1 + sample) for sample in samples]
    return pd.DataFrame(cumulative)
