import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from redis.exceptions import ConnectionError

import consumer
from consumer import Consumer, generate_notifications
from main import app

def test_event_contract():
    notices = generate_notifications("PujaSuperada", b'{"userId":7,"auctionId":12,"amount":20}')
    assert len(notices) == 1
    assert notices[0]["userId"] == "7"
    assert notices[0]["auctionId"] == "12"
    assert notices[0]["type"] == "OUTBID"
    
    notices = generate_notifications("SubastaCerrada", b'{"winnerId":8,"auctionId":"12"}')
    assert len(notices) == 1
    assert notices[0]["userId"] == "8"
    assert notices[0]["type"] == "AUCTION_WON"
    
    notices = generate_notifications("PujaSuperada", b'{"user_id":"007","auction_id":12}')
    assert len(notices) == 1
    assert notices[0]["userId"] == "007"
    
    notices = generate_notifications("SubastaCerrada", b'{"winnerId":null,"auctionId":12}')
    assert len(notices) == 0
    
    notices = generate_notifications("PrecioActualizado", b'{}')
    assert len(notices) == 0

@pytest.mark.parametrize("body", [b'{', b'[]'])
def test_invalid(body):
    with pytest.raises(ValueError):
        generate_notifications("PujaSuperada", body)

def message(body=b'{"userId":7,"auctionId":12}', routing_key="PujaSuperada"):
    return SimpleNamespace(body=body, routing_key=routing_key, ack=AsyncMock(),
                           reject=AsyncMock(), nack=AsyncMock())

def test_ack_after_persistence():
    async def scenario():
        redis = SimpleNamespace(lpush=AsyncMock())
        msg = message()
        async def ack():
            redis.lpush.assert_awaited_once()
        msg.ack.side_effect = ack
        await Consumer(redis, "unused").receive(msg)
        args = redis.lpush.call_args.args
        assert args[0] == "notificaciones:7"
        assert json.loads(args[1])["userId"] == "7"
        msg.ack.assert_awaited_once()
        msg.nack.assert_not_awaited()
    asyncio.run(scenario())

def test_redis_failure_requeues(monkeypatch):
    async def scenario():
        redis = SimpleNamespace(lpush=AsyncMock(side_effect=ConnectionError()))
        msg = message()
        await Consumer(redis, "unused").receive(msg)
        msg.nack.assert_awaited_once_with(requeue=True)
        msg.ack.assert_not_awaited()
    monkeypatch.setattr(consumer.asyncio, "sleep", AsyncMock())
    asyncio.run(scenario())

def test_invalid_rejected_and_unrelated_ignored():
    async def scenario():
        redis = SimpleNamespace(lpush=AsyncMock())
        worker = Consumer(redis, "unused")
        bad = message(b'{')
        await worker.receive(bad)
        bad.reject.assert_awaited_once_with(requeue=False)
        other = message(b'{}', "PrecioActualizado")
        await worker.receive(other)
        other.ack.assert_awaited_once()
        redis.lpush.assert_not_awaited()
    asyncio.run(scenario())

def test_api_and_dependency_health():
    async def scenario():
        app.state.redis = SimpleNamespace(ping=AsyncMock(return_value=True), lrange=AsyncMock(return_value=[]))
        app.state.consumer = SimpleNamespace(ready=True)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            assert (await client.get("/healthz")).status_code == 200
            assert (await client.get("/notificaciones/7")).json() == []
            app.state.redis.lrange.assert_awaited_with("notificaciones:7", 0, -1)
            app.state.redis.lrange.return_value = ['{"type":"OUTBID"}']
            assert (await client.get("/notificaciones/7")).json() == [{"type": "OUTBID"}]
            assert (await client.get("/notificaciones/0")).status_code == 422
            assert (await client.get("/notificaciones/abc")).status_code == 422
            app.state.consumer.ready = False
            assert (await client.get("/healthz")).status_code == 503
            app.state.consumer.ready = True
            app.state.redis.ping.side_effect = ConnectionError()
            assert (await client.get("/healthz")).status_code == 503
            app.state.redis.lrange.side_effect = ConnectionError()
            assert (await client.get("/notificaciones/7")).status_code == 503
    asyncio.run(scenario())
