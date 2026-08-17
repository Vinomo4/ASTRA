from __future__ import annotations

import plotly.graph_objects as go


def equity_chart(x: list[object], y: list[float]) -> go.Figure:
    figure = go.Figure()
    figure.add_trace(go.Scatter(x=x, y=y, mode="lines", name="Equity"))
    return figure
