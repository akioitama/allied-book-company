from fastapi import APIRouter, Depends

from app.core.supabase_client import get_supabase
from app.dependencies import get_current_user
from app.schemas.models import MembershipJoinIn

router = APIRouter()


@router.post("/join")
def join_membership(
    body: MembershipJoinIn,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    user_id = user.get("sub")
    if not supabase:
        return {
            "ok": True,
            "demo": True,
            "tier": body.tier,
            "user_id": user_id,
            "message": "Joined Cartographer's Circle (demo)",
        }

    existing = (
        supabase.table("memberships")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return {"ok": True, "tier": body.tier, "already_member": True}

    supabase.table("memberships").insert(
        {"user_id": user_id, "tier": body.tier}
    ).execute()
    return {"ok": True, "tier": body.tier, "already_member": False}
