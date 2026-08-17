from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/backtest")
async def backtest_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await websocket.send_json({"event": "connected", "status": "ready"})
        while True:
            await websocket.receive_text()
            await websocket.send_json({"event": "heartbeat"})
    except WebSocketDisconnect:
        return
