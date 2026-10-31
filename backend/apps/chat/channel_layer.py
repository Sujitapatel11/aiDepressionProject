import logging
import ssl
from channels.layers import BaseChannelLayer, InMemoryChannelLayer
from channels_redis.core import RedisChannelLayer
import redis.exceptions

logger = logging.getLogger(__name__)


class ResilientChannelLayer(BaseChannelLayer):
    """
    High-availability Channels ChannelLayer.
    Primary: RedisChannelLayer (connecting to REDIS_URL, e.g. Upstash with TLS).
    Fallback: InMemoryChannelLayer (automatic, zero-downtime fallback if Redis
              encounters ConnectionError, TimeoutError, quota limits, or is unreachable).
    Prevents WebSocket disconnections and Code 4000 dropouts on Render free tier.
    """

    def __init__(self, **kwargs):
        in_mem_kwargs = {
            k: v for k, v in kwargs.items()
            if k in ('expiry', 'capacity', 'channel_capacity')
        }
        super().__init__(**in_mem_kwargs)
        self._in_memory = InMemoryChannelLayer(**in_mem_kwargs)
        self._redis = None
        self._redis_broken = False

        hosts = kwargs.get('hosts', [])
        if hosts:
            first = hosts[0]
            addr = first.get('address', '') if isinstance(first, dict) else str(first)
            # Only instantiate Redis if address is a real external host, not localhost/empty
            if addr and '127.0.0.1' not in addr and 'localhost' not in addr:
                try:
                    self._redis = RedisChannelLayer(**kwargs)
                except Exception as exc:
                    logger.warning("Could not initialize RedisChannelLayer: %s. Using InMemory fallback.", exc)
                    self._redis = None
                    self._redis_broken = True

    async def new_channel(self, prefix='specific.'):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.new_channel(prefix)
            except (redis.exceptions.RedisError, Exception) as exc:
                logger.warning("Redis failure in new_channel: %s. Falling back to InMemory.", exc)
                self._redis_broken = True
        return await self._in_memory.new_channel(prefix)

    async def send(self, channel, message):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.send(channel, message)
            except (redis.exceptions.RedisError, Exception) as exc:
                logger.warning("Redis failure in send: %s. Falling back to InMemory.", exc)
                self._redis_broken = True
        return await self._in_memory.send(channel, message)

    async def receive(self, channel):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.receive(channel)
            except (redis.exceptions.RedisError, Exception) as exc:
                logger.warning("Redis failure in receive: %s. Falling back to InMemory.", exc)
                self._redis_broken = True
        return await self._in_memory.receive(channel)

    async def group_add(self, group, channel):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.group_add(group, channel)
            except (redis.exceptions.RedisError, Exception) as exc:
                logger.warning("Redis failure in group_add: %s. Falling back to InMemory.", exc)
                self._redis_broken = True
        return await self._in_memory.group_add(group, channel)

    async def group_discard(self, group, channel):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.group_discard(group, channel)
            except (redis.exceptions.RedisError, Exception) as exc:
                logger.warning("Redis failure in group_discard: %s. Falling back to InMemory.", exc)
                self._redis_broken = True
        return await self._in_memory.group_discard(group, channel)

    async def group_send(self, group, message):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.group_send(group, message)
            except (redis.exceptions.RedisError, Exception) as exc:
                logger.warning("Redis failure in group_send: %s. Falling back to InMemory.", exc)
                self._redis_broken = True
        return await self._in_memory.group_send(group, message)

    async def flush(self):
        if self._redis and not self._redis_broken:
            try:
                return await self._redis.flush()
            except (redis.exceptions.RedisError, Exception):
                self._redis_broken = True
        return await self._in_memory.flush()
