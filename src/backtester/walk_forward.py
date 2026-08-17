from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class WalkForwardWindow:
    train_start: int
    train_end: int
    test_start: int
    test_end: int


def build_walk_forward_windows(
    length: int, train_size: int, test_size: int
) -> list[WalkForwardWindow]:
    windows: list[WalkForwardWindow] = []
    cursor = 0
    while cursor + train_size + test_size <= length:
        windows.append(
            WalkForwardWindow(
                train_start=cursor,
                train_end=cursor + train_size,
                test_start=cursor + train_size,
                test_end=cursor + train_size + test_size,
            )
        )
        cursor += test_size
    return windows
