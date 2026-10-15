from functools import lru_cache

from app.core.config import settings


@lru_cache
def get_supabase():
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    from supabase import create_client

    return create_client(settings.supabase_url, settings.supabase_service_role_key)
