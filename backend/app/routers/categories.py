from fastapi import APIRouter

from app.core.supabase_client import get_supabase
from app.schemas.models import CategoryOut
from app.services.catalog_data import DEMO_CATEGORIES

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
def list_categories():
    supabase = get_supabase()
    if supabase:
        return supabase.table("categories").select("*").execute().data or []
    return DEMO_CATEGORIES
