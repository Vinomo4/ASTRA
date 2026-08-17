from __future__ import annotations

import pandas as pd


class Preprocessor:
    def clean(self, frame: pd.DataFrame) -> pd.DataFrame:
        cleaned = frame.copy()
        if "timestamp" in cleaned.columns:
            cleaned["timestamp"] = pd.to_datetime(cleaned["timestamp"], utc=True, errors="coerce")
            cleaned = cleaned.dropna(subset=["timestamp"]).sort_values("timestamp")
            cleaned = cleaned.drop_duplicates(subset=["timestamp", "symbol"], keep="last")
        return cleaned.reset_index(drop=True)
