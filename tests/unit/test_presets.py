# tests/unit/test_presets.py
import pytest

from src.data_engine.storage_manager import StorageManager


class TestStrategyPresetPersistence:
    @pytest.fixture
    def temp_storage(self, tmp_path) -> StorageManager:
        db_file = tmp_path / "test_presets.duckdb"
        return StorageManager(db_path=str(db_file))

    def test_save_and_retrieve_preset(self, temp_storage: StorageManager):
        params = {"channel_period": 25, "adx_threshold": 30.0}
        preset = temp_storage.save_strategy_preset(
            preset_name="BTC_Aggressive",
            strategy_id="regime_volatility_breakout",
            strategy_params=params,
            risk_fraction=0.02,
            atr_multiplier_sl=1.5,
            atr_multiplier_tp=5.0,
            description="Aggressive breakout setup",
        )

        assert preset["preset_name"] == "BTC_Aggressive"
        assert preset["strategy_id"] == "regime_volatility_breakout"
        assert preset["strategy_params"]["channel_period"] == 25
        assert preset["risk_fraction"] == 0.02

        retrieved = temp_storage.get_strategy_preset("BTC_Aggressive")
        assert retrieved is not None
        assert retrieved["preset_name"] == "BTC_Aggressive"
        assert retrieved["strategy_params"]["adx_threshold"] == 30.0

    def test_list_and_delete_presets(self, temp_storage: StorageManager):
        temp_storage.save_strategy_preset(
            preset_name="Preset_1",
            strategy_id="trend_following_ema",
            strategy_params={"fast_ema": 10},
            risk_fraction=0.01,
            atr_multiplier_sl=2.0,
            atr_multiplier_tp=4.0,
        )
        temp_storage.save_strategy_preset(
            preset_name="Preset_2",
            strategy_id="regime_volatility_breakout",
            strategy_params={"channel_period": 30},
            risk_fraction=0.015,
            atr_multiplier_sl=2.5,
            atr_multiplier_tp=4.5,
        )

        all_presets = temp_storage.list_strategy_presets()
        assert len(all_presets) == 2

        temp_storage.delete_strategy_preset("Preset_1")
        remaining = temp_storage.list_strategy_presets()
        assert len(remaining) == 1
        assert remaining[0]["preset_name"] == "Preset_2"
