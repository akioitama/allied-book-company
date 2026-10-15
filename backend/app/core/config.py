from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    cors_origins: str = "http://localhost:3000"
    demo_mode: bool = True

    # Optional — unauthenticated Google Books works at low volume; key helps under load
    google_books_api_key: str = ""
    admin_api_key: str = ""
    redis_url: str = ""  # optional shared cover cache, e.g. redis://localhost:6379/0

    # Background cover synchronization (see app/services/cover_pipeline.py)
    cover_sync_enabled: bool = True
    cover_sync_interval_hours: float = 6.0
    # Books that failed every provider are retried after this many days.
    cover_retry_days: int = 7
    # Branded JPEG when no free-source cover exists (eliminates placeholders).
    cover_generate_fallback: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
