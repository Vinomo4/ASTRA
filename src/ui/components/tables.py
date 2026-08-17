from __future__ import annotations

import pandas as pd


def show_dataframe(frame: pd.DataFrame) -> None:
    import streamlit as st

    st.dataframe(frame, use_container_width=True)
