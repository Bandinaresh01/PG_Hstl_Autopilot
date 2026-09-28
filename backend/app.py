import os
import re
import secrets
import string
import logging
import uuid
from datetime import datetime, timezone
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g, make_response
from flask_cors import CORS
from supabase import create_client, Client

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Configure logging (never log secret keys or raw passwords)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for local Vite dev server and production HTTPS frontend deployments
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5000",
                "http://127.0.0.1:5000",
                re.compile(r"^https://.*\.vercel\.app$"),
                re.compile(r"^https://.*"),
            ],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": "*",
            "expose_headers": ["Content-Type", "Authorization", "Set-Cookie"],
        }
    },
    supports_credentials=True,
)

# Supabase credentials from backend/.env or Cloud Environment (Render/Heroku/AWS)
SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    or ""
).strip()
SUPABASE_SECRET_KEY = (
    os.environ.get("SUPABASE_SECRET_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or ""
).strip()

COOKIE_NAME = "urbannest_access_token"
DEMO_HOSTEL_NAME = "UrbanNest Hostel"
DEMO_HOSTEL_LOCATION = "Hyderabad, Telangana"
DEFAULT_HOSTEL_ID = "020f1800-c239-4a9f-9cf5-2012f4a9415d"
DEMO_HOSTEL_ID = DEFAULT_HOSTEL_ID

_cached_hostel_id = None


def get_default_hostel_id(db: Client = None) -> str:
    """
    Resolve active UrbanNest Hostel UUID dynamically from Supabase hostels table.
    """
    global _cached_hostel_id
    if _cached_hostel_id:
        return _cached_hostel_id
    try:
        client = db or get_db_client()
        res = client.table("hostels").select("id").eq("name", DEMO_HOSTEL_NAME).limit(1).execute()
        if res.data and len(res.data) > 0:
            _cached_hostel_id = res.data[0]["id"]
            return _cached_hostel_id
        res_any = client.table("hostels").select("id").limit(1).execute()
        if res_any.data and len(res_any.data) > 0:
            _cached_hostel_id = res_any.data[0]["id"]
            return _cached_hostel_id
    except Exception as e:
        logger.warning(f"Could not resolve hostel id from db: {e}")
    return DEFAULT_HOSTEL_ID


def get_db_client() -> Client:
    """
    Create a dedicated Supabase client using the backend secret key for database queries.
    Isolated from user auth state mutations.
    """
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env")
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


def get_auth_client() -> Client:
    """
    Create a dedicated Supabase client for user authentication / token verification.
    """
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env")
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


from payments_repo import PaymentRepository
from complaints_repo import ComplaintsMaintenanceRepository
from visitors_repo import get_visitors_repo
from room_service import get_room_service
from tenant_service import get_tenant_service
from booking_service import get_booking_service
from dashboard_service import get_dashboard_service
from announcement_service import get_announcement_service

_payment_repo = None
_complaints_repo = None


def get_payment_repo():
    global _payment_repo
    if _payment_repo is None:
        try:
            db = get_db_client()
        except Exception:
            db = None
        _payment_repo = PaymentRepository(db)
    elif _payment_repo.db is None:
        try:
            _payment_repo.db = get_db_client()
        except Exception:
            pass
    return _payment_repo


def get_complaints_repo():
    global _complaints_repo
    if _complaints_repo is None:
        try:
            db = get_db_client()
        except Exception:
            db = None
        _complaints_repo = ComplaintsMaintenanceRepository(db)
    elif _complaints_repo.db is None:
        try:
            _complaints_repo.db = get_db_client()
        except Exception:
            pass
    return _complaints_repo


# Verify startup configuration
try:
    _startup_client = get_db_client()
    logger.info("Supabase client initialized successfully.")
    # Initialize repositories & domain services
    get_payment_repo()
    get_complaints_repo()
    get_visitors_repo(_startup_client)
    get_room_service(_startup_client)
    get_tenant_service(_startup_client)
    get_booking_service(_startup_client)
    get_announcement_service(_startup_client)
    get_dashboard_service(
        _startup_client,
        get_payment_repo(),
        get_complaints_repo(),
        get_visitors_repo(_startup_client)
    )
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")



# ============================================================================
# HELPER FUNCTIONS: PROFILE RESOLUTION & ENQUIRY PARSING
# ============================================================================

def resolve_user_profile(auth_user) -> dict:
    """
    Resolve the user's application profile and hostel relation.
    First queries `public.profiles` and `public.hostels` in PostgreSQL.
    If the tables have not been migrated yet, falls back to verified server-side
    Supabase Auth metadata (`app_metadata` / `user_metadata`).
    Never trusts any role or identity data sent by the frontend client.
    """
    db = get_db_client()
    auth_user_id = str(auth_user.id)
    email = auth_user.email or ""

    # Server-side metadata stored in Supabase Auth
    app_meta = getattr(auth_user, "app_metadata", {}) or {}
    user_meta = getattr(auth_user, "user_metadata", {}) or {}
    combined_meta = {**user_meta, **app_meta}

    # 1. Try querying public.profiles table
    try:
        prof_res = (
            db.table("profiles")
            .select("*")
            .eq("auth_user_id", auth_user_id)
            .limit(1)
            .execute()
        )
        if prof_res.data and len(prof_res.data) > 0:
            row = prof_res.data[0]
            hostel_id = row.get("hostel_id") or combined_meta.get("hostel_id", DEMO_HOSTEL_ID)
            hostel_name = DEMO_HOSTEL_NAME
            hostel_location = DEMO_HOSTEL_LOCATION

            if hostel_id:
                try:
                    h_res = (
                        db.table("hostels")
                        .select("id, name, location, status")
                        .eq("id", hostel_id)
                        .limit(1)
                        .execute()
                    )
                    if h_res.data:
                        hostel_name = h_res.data[0].get("name") or hostel_name
                        hostel_location = h_res.data[0].get("location") or hostel_location
                except Exception:
                    pass

            role = (row.get("role") or combined_meta.get("role") or "").upper()
            default_onboarding = True if role == "OWNER" else False
            t_room_num = combined_meta.get("room_number", "Room 102")
            t_bed_code = combined_meta.get("bed_code", "Bed A")
            t_room_type = combined_meta.get("room_type", "Double Sharing")
            t_floor = combined_meta.get("floor", "Floor 1")
            t_move_in = combined_meta.get("move_in_date", "2026-06-01")
            t_expected_end = combined_meta.get("expected_end_date", "2027-05-31")
            t_rent = combined_meta.get("monthly_rent", 8500)
            t_emergency = combined_meta.get("emergency_contact", "")

            if role == "TENANT":
                try:
                    t_lookup = db.table("tenants").select("*").eq("profile_id", row.get("id")).limit(1).execute()
                    if not t_lookup.data and email:
                        t_lookup = db.table("tenants").select("*").eq("email", email.lower()).limit(1).execute()
                    if t_lookup.data:
                        t_row = t_lookup.data[0]
                        if t_row.get("monthly_rent"):
                            t_rent = t_row.get("monthly_rent")
                        if t_row.get("move_in_date"):
                            t_move_in = str(t_row.get("move_in_date"))
                        if t_row.get("expected_end_date"):
                            t_expected_end = str(t_row.get("expected_end_date"))
                        if t_row.get("emergency_contact_name"):
                            t_emergency = t_row.get("emergency_contact_name")
                        if t_row.get("room_id"):
                            r_lookup = db.table("rooms").select("room_number, room_type, floor").eq("id", t_row["room_id"]).limit(1).execute()
                            if r_lookup.data:
                                r_data = r_lookup.data[0]
                                raw_r_num = str(r_data.get("room_number", ""))
                                t_room_num = f"Room {raw_r_num}" if not raw_r_num.startswith("Room") else raw_r_num
                                rt = r_data.get("room_type", "")
                                t_room_type = "Single Sharing" if rt == "SINGLE" else ("Triple Sharing" if rt == "TRIPLE" else "Double Sharing")
                                t_floor = f"Floor {r_data.get('floor')}" if r_data.get("floor") else "Floor 1"
                        if t_row.get("bed_id"):
                            b_lookup = db.table("beds").select("bed_code").eq("id", t_row["bed_id"]).limit(1).execute()
                            if b_lookup.data:
                                raw_b_code = str(b_lookup.data[0].get("bed_code", ""))
                                t_bed_code = f"Bed {raw_b_code}" if not raw_b_code.startswith("Bed") else raw_b_code
                except Exception as t_err:
                    logger.debug(f"Tenant profile detail lookup note: {t_err}")

            onboarding_val = row.get("onboarding_completed")
            if onboarding_val is None:
                onboarding_val = combined_meta.get("onboarding_completed", default_onboarding)

            return {
                "id": row.get("id"),
                "auth_user_id": auth_user_id,
                "email": email,
                "user_code": row.get("user_code") or combined_meta.get("user_code", "TEN-1001" if role == "TENANT" else "OWN-001"),
                "full_name": row.get("full_name") or combined_meta.get("full_name", "Hostel Resident" if role == "TENANT" else "Hostel Owner"),
                "phone": row.get("phone") or combined_meta.get("phone", ""),
                "role": role,
                "hostel_id": hostel_id,
                "hostel_name": hostel_name,
                "hostel_location": hostel_location,
                "room_number": t_room_num,
                "bed_code": t_bed_code,
                "room_type": t_room_type,
                "floor": t_floor,
                "move_in_date": t_move_in,
                "expected_end_date": t_expected_end,
                "emergency_contact": t_emergency,
                "monthly_rent": t_rent,
                "is_active": bool(row.get("is_active", combined_meta.get("is_active", True))),
                "onboarding_completed": bool(onboarding_val),
            }
    except Exception as db_err:
        err_str = str(db_err)
        if "PGRST205" not in err_str and "Could not find the table" not in err_str:
            logger.warning(f"Profile table lookup warning: {err_str}")

    # 2. Fallback to verified Supabase Auth metadata (set via Supabase Admin API)
    if not combined_meta.get("role"):
        return None

    role = str(combined_meta.get("role", "")).upper()
    default_onboarding = True if role == "OWNER" else False
    return {
        "id": None,
        "auth_user_id": auth_user_id,
        "email": email,
        "user_code": combined_meta.get("user_code", "TEN-1001" if role == "TENANT" else "OWN-001"),
        "full_name": combined_meta.get("full_name", "Hostel Resident" if role == "TENANT" else "Rajesh Kumar"),
        "phone": combined_meta.get("phone", ""),
        "role": role,
        "hostel_id": combined_meta.get("hostel_id", get_default_hostel_id(db)),
        "hostel_name": combined_meta.get("hostel_name", DEMO_HOSTEL_NAME),
        "hostel_location": combined_meta.get("city", DEMO_HOSTEL_LOCATION),
        "room_number": combined_meta.get("room_number", "Room 204"),
        "bed_code": combined_meta.get("bed_code", "Bed A"),
        "room_type": combined_meta.get("room_type", "Double Sharing"),
        "floor": combined_meta.get("floor", "Floor 2"),
        "move_in_date": combined_meta.get("move_in_date", "2026-09-01"),
        "expected_end_date": combined_meta.get("expected_end_date", "2027-03-01"),
        "emergency_contact": combined_meta.get("emergency_contact", ""),
        "monthly_rent": combined_meta.get("monthly_rent", 8500),
        "is_active": bool(combined_meta.get("is_active", True)),
        "onboarding_completed": bool(combined_meta.get("onboarding_completed", default_onboarding)),
    }


def verify_owner_authorization(profile: dict):
    """
    Verify all mandatory checks for Owner CRM access:
    1. Profile exists
    2. is_active == True
    3. role == 'OWNER'
    4. hostel_id exists
    Returns (is_valid: bool, error_message: str, status_code: int)
    """
    if not profile:
        return False, "No CRM profile found for this user account.", 403

    if not profile.get("is_active", False):
        return False, "This owner account is currently inactive. Access denied.", 403

    role = (profile.get("role") or "").upper()
    if role == "TENANT":
        return (
            False,
            "Access denied. Tenant accounts are not authorized to access the Owner CRM portal.",
            403,
        )

    if role != "OWNER":
        return False, "Access denied. Owner privileges are required.", 403

    if not profile.get("hostel_id"):
        return False, "Access denied. No active hostel is linked to this owner profile.", 403

    return True, None, 200


def verify_tenant_authorization(profile: dict):
    """
    Verify checks for Tenant Portal access:
    1. Profile exists
    2. is_active == True
    3. role == 'TENANT'
    4. hostel_id exists
    Returns (is_valid: bool, error_message: str, status_code: int)
    """
    if not profile:
        return False, "No profile found for this user account.", 403

    if not profile.get("is_active", False):
        return False, "This tenant account is currently inactive. Please contact the hostel office.", 403

    role = (profile.get("role") or "").upper()
    if role == "OWNER":
        return (
            False,
            "This is an Owner account. Please sign in through the Owner Portal at /owner/login.",
            403,
        )

    if role != "TENANT":
        return False, "Access denied. Valid tenant credentials are required.", 403

    if not profile.get("hostel_id"):
        return False, "No active hostel is linked to this tenant profile.", 403

    return True, None, 200


def extract_access_token() -> str:
    """
    Extract the access token from Authorization Bearer header first, or HttpOnly cookie.
    Authorization Bearer header always takes precedence as it is explicitly sent by the active frontend client.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            return token

    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token.strip()

    return ""


def tenant_required(f):
    """
    Reusable decorator protecting all /api/tenant/* endpoints.
    Verifies:
    - Authenticated Supabase user via JWT token
    - Profile exists
    - Account is_active = true
    - Role = TENANT
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_access_token()
        if not token:
            return jsonify({
                "authenticated": False,
                "error": "Authentication required. Please sign in to the Tenant Portal."
            }), 401

        try:
            auth_client = get_auth_client()
            user_res = auth_client.auth.get_user(token)
            if not user_res or not getattr(user_res, "user", None):
                return jsonify({
                    "authenticated": False,
                    "error": "Session expired or invalid. Please sign in again."
                }), 401
        except Exception as e:
            logger.warning(f"Tenant token verification failed: {e}")
            return jsonify({
                "authenticated": False,
                "error": "Invalid or expired session token. Please sign in again."
            }), 401

        profile = resolve_user_profile(user_res.user)
        is_allowed, err_msg, status_code = verify_tenant_authorization(profile)
        if not is_allowed:
            return jsonify({
                "authenticated": True,
                "authorized": False,
                "error": err_msg
            }), status_code

        # Authoritatively resolve the tenant record from public.tenants
        tenant_row = None
        try:
            db = get_db_client()
            prof_id = profile.get("id")
            if prof_id:
                t_res = db.table("tenants").select("*").eq("profile_id", prof_id).limit(1).execute()
                if t_res.data:
                    tenant_row = t_res.data[0]

            if not tenant_row and profile.get("email"):
                t_res = db.table("tenants").select("*").eq("email", profile["email"].lower()).limit(1).execute()
                if t_res.data:
                    tenant_row = t_res.data[0]

            if not tenant_row and profile.get("user_code"):
                t_res = db.table("tenants").select("*").eq("tenant_code", profile["user_code"]).limit(1).execute()
                if t_res.data:
                    tenant_row = t_res.data[0]
        except Exception as te:
            logger.debug(f"Tenants table lookup note: {te}")

        if tenant_row:
            profile["tenant_id"] = tenant_row.get("id")
            if tenant_row.get("room_id"):
                profile["room_id"] = tenant_row.get("room_id")
            if tenant_row.get("bed_id"):
                profile["bed_id"] = tenant_row.get("bed_id")
            if tenant_row.get("monthly_rent"):
                profile["monthly_rent"] = tenant_row.get("monthly_rent")
            tenant_row["room_number"] = profile.get("room_number")
            tenant_row["bed_code"] = profile.get("bed_code")
            tenant_row["room_type"] = profile.get("room_type")
            tenant_row["floor"] = profile.get("floor")

        g.current_tenant = profile
        g.current_tenant_row = tenant_row
        g.auth_user = user_res.user
        return f(*args, **kwargs)

    return decorated_function


def owner_required(f):
    """
    Reusable decorator protecting all /api/owner/* endpoints.
    Verifies:
    - Authenticated Supabase user via JWT token
    - Profile exists
    - Account is_active = true
    - Role = OWNER
    - Hostel relation exists
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_access_token()
        if not token:
            return jsonify({
                "authenticated": False,
                "error": "Authentication required. Please sign in to the Owner Portal."
            }), 401

        try:
            auth_client = get_auth_client()
            user_res = auth_client.auth.get_user(token)
            if not user_res or not getattr(user_res, "user", None):
                return jsonify({
                    "authenticated": False,
                    "error": "Session expired or invalid. Please sign in again."
                }), 401
        except Exception as e:
            logger.warning(f"Token verification failed: {e}")
            return jsonify({
                "authenticated": False,
                "error": "Invalid or expired session token. Please sign in again."
            }), 401

        profile = resolve_user_profile(user_res.user)
        is_allowed, err_msg, status_code = verify_owner_authorization(profile)
        if not is_allowed:
            return jsonify({
                "authenticated": True,
                "authorized": False,
                "error": err_msg
            }), status_code

        g.current_owner = profile
        return f(*args, **kwargs)

    return decorated_function


def parse_enquiry_row(row: dict) -> dict:
    """
    Normalize a raw row from the `enquiries` table so that whether optional fields
    were stored in dedicated columns or formatted into `message`, the dashboard receives
    clean structured attributes (`preferred_room`, `move_in_date`, `occupation`, `status`, etc.).
    """
    raw_message = row.get("message") or ""
    parsed_meta = {}

    if " | " in raw_message or raw_message.startswith(("Email:", "Room:", "Move-in:", "Occupation:", "Notes:")):
        parts = [p.strip() for p in raw_message.split(" | ")]
        for part in parts:
            if part.startswith("Email:"):
                parsed_meta["email"] = part.replace("Email:", "", 1).strip()
            elif part.startswith("Room:"):
                parsed_meta["preferred_room"] = part.replace("Room:", "", 1).strip()
            elif part.startswith("Move-in:"):
                parsed_meta["move_in_date"] = part.replace("Move-in:", "", 1).strip()
            elif part.startswith("Occupation:"):
                parsed_meta["occupation"] = part.replace("Occupation:", "", 1).strip()
            elif part.startswith("Notes:"):
                parsed_meta["notes"] = part.replace("Notes:", "", 1).strip()

    preferred_room = (
        row.get("preferred_room")
        or parsed_meta.get("preferred_room")
        or "General Enquiry"
    )
    move_in_date = (
        row.get("move_in_date")
        or parsed_meta.get("move_in_date")
        or "Flexible"
    )
    occupation = (
        row.get("occupation")
        or parsed_meta.get("occupation")
        or "Not specified"
    )
    email = row.get("email") or parsed_meta.get("email") or ""
    notes = parsed_meta.get("notes") if "notes" in parsed_meta else raw_message
    status = (row.get("status") or "NEW").upper()

    return {
        "id": row.get("id"),
        "name": row.get("name") or "Anonymous Visitor",
        "phone": row.get("phone") or "-",
        "email": email,
        "preferred_room": preferred_room,
        "move_in_date": move_in_date,
        "occupation": occupation,
        "status": status,
        "message": notes,
        "created_at": row.get("created_at"),
    }


# ============================================================================
# 1. HEALTH CHECK ENDPOINT
# ============================================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Verify Flask API and Supabase connection status."""
    try:
        db = get_db_client()
        db.table("hostels").select("id").limit(1).execute()
        return jsonify({
            "status": "ok",
            "service": "hostel-crm-backend",
            "database": "connected",
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            "status": "degraded",
            "service": "hostel-crm-backend",
            "database": "error",
            "error_detail": str(e),
        }), 200


# ============================================================================
# 2. AUTHENTICATION ENDPOINTS (/api/auth/*)
# ============================================================================

@app.route("/api/auth/login", methods=["POST"])
def owner_login():
    """
    Authenticate an owner with Supabase Auth and verify profile & role = OWNER.
    Sets an HttpOnly cookie and returns safe profile metadata.
    """
    try:
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Both email and password are required."}), 400

        auth_client = get_auth_client()
        try:
            auth_res = auth_client.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
        except Exception as auth_err:
            logger.info(f"Failed login attempt for email: {email} ({auth_err})")
            return jsonify({"error": "Invalid email or password. Please check your credentials."}), 401

        if not auth_res or not getattr(auth_res, "user", None) or not getattr(auth_res, "session", None):
            return jsonify({"error": "Invalid email or password."}), 401

        # Verify user profile, active status, role = OWNER, and hostel_id
        profile = resolve_user_profile(auth_res.user)
        is_allowed, err_msg, status_code = verify_owner_authorization(profile)

        if not is_allowed:
            logger.warning(f"Unauthorized portal access attempt by {email}: {err_msg}")
            return jsonify({"error": err_msg}), status_code

        access_token = auth_res.session.access_token

        safe_user = {
            "user_code": profile["user_code"],
            "full_name": profile["full_name"],
            "email": profile["email"],
            "role": profile["role"],
            "hostel_id": profile["hostel_id"],
            "hostel_name": profile["hostel_name"],
            "hostel_location": profile["hostel_location"],
        }

        response = make_response(
            jsonify({
                "authenticated": True,
                "access_token": access_token,
                "user": safe_user,
            }),
            200,
        )

        # Set secure HttpOnly cookie
        response.set_cookie(
            COOKIE_NAME,
            access_token,
            httponly=True,
            samesite="Lax",
            secure=False,  # False on local HTTP dev; True in HTTPS production
            max_age=60 * 60 * 24,  # 24 hours
            path="/",
        )
        logger.info(f"Owner login successful: {email} ({profile['user_code']})")
        return response

    except Exception as e:
        logger.error(f"Unexpected error in /api/auth/login: {e}")
        return jsonify({"error": "An unexpected authentication error occurred. Please try again."}), 500


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    """
    Check current session token and return authenticated user profile.
    """
    token = extract_access_token()
    if not token:
        return jsonify({"authenticated": False}), 401

    try:
        auth_client = get_auth_client()
        user_res = auth_client.auth.get_user(token)
        if not user_res or not getattr(user_res, "user", None):
            return jsonify({"authenticated": False}), 401

        profile = resolve_user_profile(user_res.user)
        if not profile or not profile.get("is_active", False):
            return jsonify({
                "authenticated": False,
                "error": "Account is inactive or profile is missing."
            }), 403

        return jsonify({
            "authenticated": True,
            "user": {
                "user_code": profile["user_code"],
                "full_name": profile["full_name"],
                "email": profile["email"],
                "phone": profile.get("phone", ""),
                "role": profile["role"],
                "hostel_id": profile["hostel_id"],
                "hostel_name": profile["hostel_name"],
                "hostel_location": profile["hostel_location"],
                "room_number": profile.get("room_number", "Room 204"),
                "bed_code": profile.get("bed_code", "Bed A"),
                "onboarding_completed": bool(profile.get("onboarding_completed", True if profile["role"] == "OWNER" else False)),
            }
        }), 200

    except Exception as e:
        logger.warning(f"Session check failed: {e}")
        return jsonify({"authenticated": False}), 401


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    """
    Clear the session cookie and log the user out.
    """
    response = make_response(
        jsonify({"message": "Logged out successfully", "authenticated": False}),
        200,
    )
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


# ============================================================================
# 3. TENANT PORTAL AUTHENTICATION & ONBOARDING (/api/tenant/*)
# ============================================================================

@app.route("/api/tenant/login", methods=["POST"])
def tenant_login():
    """
    Authenticate a tenant resident via Supabase Auth and verify role = TENANT.
    Sets HttpOnly session cookie and returns safe tenant profile with onboarding state.
    """
    try:
        payload = request.get_json(silent=True) or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Both email and password are required."}), 400

        auth_client = get_auth_client()
        try:
            auth_res = auth_client.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
        except Exception as auth_err:
            logger.info(f"Failed tenant login attempt for {email}: {auth_err}")
            return jsonify({"error": "Invalid email or password. Please check your credentials."}), 401

        if not auth_res or not getattr(auth_res, "user", None) or not getattr(auth_res, "session", None):
            return jsonify({"error": "Invalid email or password."}), 401

        profile = resolve_user_profile(auth_res.user)
        is_allowed, err_msg, status_code = verify_tenant_authorization(profile)

        if not is_allowed:
            logger.warning(f"Unauthorized tenant portal access attempt by {email}: {err_msg}")
            return jsonify({"error": err_msg}), status_code

        access_token = auth_res.session.access_token

        safe_user = {
            "user_code": profile["user_code"],
            "full_name": profile["full_name"],
            "email": profile["email"],
            "phone": profile.get("phone", ""),
            "role": "TENANT",
            "hostel_id": profile["hostel_id"],
            "hostel_name": profile["hostel_name"],
            "hostel_location": profile["hostel_location"],
            "room_number": profile.get("room_number", "Room 204"),
            "bed_code": profile.get("bed_code", "Bed A"),
            "move_in_date": profile.get("move_in_date", "2026-09-01"),
            "monthly_rent": profile.get("monthly_rent", 8500),
            "onboarding_completed": bool(profile.get("onboarding_completed", False)),
        }

        response = make_response(
            jsonify({
                "authenticated": True,
                "access_token": access_token,
                "user": safe_user,
            }),
            200,
        )

        response.set_cookie(
            COOKIE_NAME,
            access_token,
            httponly=True,
            samesite="Lax",
            secure=False,
            max_age=60 * 60 * 24,
            path="/",
        )
        logger.info(f"Tenant login successful: {email} ({profile['user_code']})")
        return response

    except Exception as e:
        logger.error(f"Unexpected error in /api/tenant/login: {e}")
        return jsonify({"error": "An unexpected authentication error occurred. Please try again."}), 500


@app.route("/api/tenant/onboarding/complete", methods=["POST"])
@tenant_required
def complete_tenant_onboarding():
    """
    Protected endpoint for first-time tenant onboarding.
    Requires setting a new secure personal password and accepting community rules.
    Updates password in Supabase Auth and marks onboarding_completed = true.
    """
    try:
        tenant = g.current_tenant
        auth_user = g.auth_user
        payload = request.get_json(silent=True) or {}

        new_password = payload.get("new_password") or ""
        confirm_password = payload.get("confirm_password") or ""
        emergency_contact = (payload.get("emergency_contact") or "").strip()
        rules_accepted = payload.get("rules_accepted", False)

        if not rules_accepted:
            return jsonify({
                "error": "You must accept the hostel community rules and guidelines to complete onboarding."
            }), 400

        if not new_password or len(new_password) < 8:
            return jsonify({
                "error": "New password must be at least 8 characters long."
            }), 400

        if new_password != confirm_password:
            return jsonify({
                "error": "New password and confirmation password do not match."
            }), 400

        auth_client = get_auth_client()
        auth_user_id = str(auth_user.id)

        # Update password & user_metadata in Supabase Auth
        existing_meta = getattr(auth_user, "user_metadata", {}) or {}
        updated_meta = {
            **existing_meta,
            "onboarding_completed": True,
        }
        if emergency_contact:
            updated_meta["emergency_contact"] = emergency_contact

        auth_client.auth.admin.update_user_by_id(auth_user_id, {
            "password": new_password,
            "user_metadata": updated_meta,
        })

        # Update profiles table if present
        try:
            db = get_db_client()
            db.table("profiles").update({
                "onboarding_completed": True,
            }).eq("auth_user_id", auth_user_id).execute()
        except Exception:
            pass

        logger.info(f"Tenant {tenant['user_code']} ({tenant['email']}) completed first-time onboarding.")
        return jsonify({
            "success": True,
            "message": "Onboarding completed successfully. Welcome to your Tenant Portal!",
            "onboarding_completed": True,
        }), 200

    except Exception as e:
        logger.error(f"Error completing tenant onboarding: {e}")
        return jsonify({"error": f"Failed to complete onboarding: {str(e)}"}), 500


@app.route("/api/tenant/me", methods=["GET"])
@tenant_required
def get_tenant_me():
    """
    Return profile, stay, and room info for the authenticated tenant resident.
    """
    tenant = g.current_tenant
    t_row = getattr(g, "current_tenant_row", None) or {}
    return jsonify({
        "authenticated": True,
        "tenant": {
            "id": t_row.get("id") or tenant.get("id"),
            "tenant_id": t_row.get("id") or tenant.get("tenant_id") or tenant.get("id"),
            "user_code": tenant.get("user_code"),
            "tenant_code": t_row.get("tenant_code") or tenant.get("user_code"),
            "full_name": t_row.get("full_name") or tenant.get("full_name"),
            "email": tenant.get("email"),
            "phone": t_row.get("phone") or tenant.get("phone", ""),
            "role": "TENANT",
            "hostel_id": tenant.get("hostel_id"),
            "hostel_name": tenant.get("hostel_name"),
            "hostel_location": tenant.get("hostel_location"),
            "room_id": t_row.get("room_id"),
            "bed_id": t_row.get("bed_id"),
            "room_number": t_row.get("room_number") or tenant.get("room_number", "-"),
            "bed_code": t_row.get("bed_code") or tenant.get("bed_code", "-"),
            "room_type": t_row.get("room_type") or tenant.get("room_type", "-"),
            "monthly_rent": t_row.get("monthly_rent") or tenant.get("monthly_rent", 0),
            "security_deposit": t_row.get("security_deposit", 0),
            "status": t_row.get("status", "ACTIVE"),
            "move_in_date": str(t_row.get("move_in_date") or tenant.get("move_in_date", "")),
            "expected_end_date": str(t_row.get("expected_end_date") or tenant.get("expected_end_date", "")),
            "emergency_contact": tenant.get("emergency_contact") or t_row.get("emergency_contact_name", ""),
            "onboarding_completed": bool(tenant.get("onboarding_completed", False)),
        }
    }), 200


@app.route("/api/tenant/me/announcements", methods=["GET"])
@tenant_required
def get_tenant_my_announcements():
    """
    List published announcements visible to the authenticated tenant.
    """
    try:
        hostel_id = g.current_tenant.get("hostel_id") or get_default_hostel_id()
        ann_service = get_announcement_service()
        items = ann_service.get_tenant_announcements(hostel_id)
        return jsonify({
            "announcements": items,
            "count": len(items)
        }), 200
    except Exception as e:
        logger.error(f"Error fetching tenant announcements: {e}")
        return jsonify({"error": "Unable to retrieve announcements at this time."}), 500


def is_valid_uuid(val):
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def get_tenant_filters_for_request():
    """
    Return (tenant_filters: list, hostel_id: str, tenant_row: dict)
    for the current authenticated tenant request.
    Strictly filters for valid UUIDs to prevent PostgreSQL 22P02 errors.
    """
    tenant = getattr(g, "current_tenant", {}) or {}
    t_row = getattr(g, "current_tenant_row", None) or {}
    raw_candidates = [
        t_row.get("id"),
        tenant.get("tenant_id"),
    ]
    filters = []
    for c in raw_candidates:
        if c and is_valid_uuid(c) and str(c) not in filters:
            filters.append(str(c))

    # Fallback to profile id if it's a valid uuid and no tenant record exists yet
    if not filters and is_valid_uuid(tenant.get("id")):
        filters.append(str(tenant["id"]))

    hostel_id = tenant.get("hostel_id") or get_default_hostel_id()
    return filters, hostel_id, t_row


@app.route("/api/tenant/portal/data", methods=["GET"])
@tenant_required
def get_tenant_portal_data():
    """
    Return isolated, personal portal data strictly for the logged-in tenant.
    Never exposes other tenants, hostel accounting, or owner reports.
    """
    tenant = g.current_tenant
    tenant_filters, hostel_id, t_row = get_tenant_filters_for_request()

    repo = get_payment_repo()
    financial_summary = repo.get_tenant_payment_summary(
        tenant_id_filters=tenant_filters,
        hostel_id=hostel_id,
        monthly_rent_fallback=float(t_row.get("monthly_rent") or tenant.get("monthly_rent") or 8500.0)
    )

    c_repo = get_complaints_repo()
    complaints_summary = c_repo.get_tenant_complaint_summary(
        hostel_id=hostel_id,
        tenant_id_filters=tenant_filters,
    )

    v_repo = get_visitors_repo()
    visitors_summary = v_repo.get_tenant_visitor_summary(
        hostel_id=hostel_id,
        tenant_id_filters=tenant_filters,
    )

    # Fetch live published announcements
    ann_service = get_announcement_service()
    published_announcements = ann_service.get_tenant_announcements(hostel_id)
    notices = [
        {
            "id": a.get("id"),
            "title": a.get("title"),
            "body": a.get("message"),
            "category": a.get("category") or "General",
            "priority": a.get("priority", "NORMAL"),
            "publish_at": a.get("publish_at"),
        }
        for a in published_announcements
    ]

    return jsonify({
        "profile": {
            "user_code": tenant["user_code"],
            "full_name": t_row.get("full_name") or tenant["full_name"],
            "email": tenant["email"],
            "phone": t_row.get("phone") or tenant.get("phone", ""),
            "emergency_contact": tenant.get("emergency_contact") or t_row.get("emergency_contact_name", "+91 98765 00001 (Guardian)"),
            "hostel_name": tenant.get("hostel_name", DEMO_HOSTEL_NAME),
            "hostel_location": tenant.get("hostel_location", DEMO_HOSTEL_LOCATION),
        },
        "stay": {
            "room_number": t_row.get("room_number") or tenant.get("room_number", "-"),
            "bed_code": t_row.get("bed_code") or tenant.get("bed_code", "-"),
            "room_type": t_row.get("room_type") or tenant.get("room_type", "-"),
            "floor": tenant.get("floor", "-"),
            "move_in_date": str(t_row.get("move_in_date") or tenant.get("move_in_date", "")),
            "expected_end_date": str(t_row.get("expected_end_date") or tenant.get("expected_end_date", "")),
            "notice_period": "30 Days Notice",
            "wifi_ssid": "UrbanNest-HighSpeed",
            "wifi_pass": "NestResident@2026",
        },
        "financials": {
            "monthly_rent": financial_summary["monthly_rent"],
            "security_deposit": financial_summary["security_deposit"]["amount"],
            "next_due_date": financial_summary["next_due_date"],
            "outstanding_amount": financial_summary["outstanding_amount"],
            "payment_status": financial_summary["payment_status"],
            "security_deposit_status": financial_summary["security_deposit"]["status"],
            "current_due": financial_summary["current_due"],
        },
        "complaints_summary": complaints_summary,
        "active_complaints_count": complaints_summary["open"] + complaints_summary["in_progress"],
        "visitors_summary": visitors_summary,
        "active_visitors_count": visitors_summary["inside"] + visitors_summary["approved"] + visitors_summary["pending"],
        "notices": notices,
        "active_tickets": []
    }), 200


@app.route("/api/tenant/me/payments", methods=["GET"])
@tenant_required
def get_tenant_my_payments():
    """
    List payment records strictly belonging to the authenticated tenant.
    Never exposes other tenants or whole-hostel financials.
    Supports query parameters: ?status=ALL|PAID|PENDING|OVERDUE|PARTIAL|DUE_SOON
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        status_filter = request.args.get("status", "ALL")
        search_query = request.args.get("search", "")

        repo = get_payment_repo()
        payments = repo.get_all(
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
            status_filter=status_filter,
            search_query=search_query,
        )
        return jsonify({
            "payments": payments,
            "count": len(payments),
        }), 200
    except Exception as e:
        logger.error(f"Error fetching tenant payments: {e}")
        return jsonify({"error": "Unable to retrieve payments at this time."}), 500


@app.route("/api/tenant/me/payment-summary", methods=["GET"])
@tenant_required
def get_tenant_my_payment_summary():
    """
    Return high-level financial summary, security deposit, current due, and other charges
    isolated strictly for the authenticated tenant.
    """
    try:
        tenant = g.current_tenant
        tenant_filters, hostel_id, t_row = get_tenant_filters_for_request()
        repo = get_payment_repo()
        summary = repo.get_tenant_payment_summary(
            tenant_id_filters=tenant_filters,
            hostel_id=hostel_id,
            monthly_rent_fallback=float(t_row.get("monthly_rent") or tenant.get("monthly_rent") or 8500.0),
        )
        return jsonify(summary), 200
    except Exception as e:
        logger.error(f"Error fetching tenant payment summary: {e}")
        return jsonify({"error": "Unable to retrieve payment summary at this time."}), 500


@app.route("/api/tenant/me/payments/<payment_id>", methods=["GET"])
@tenant_required
def get_tenant_single_payment(payment_id):
    """
    Retrieve details of a single payment for the logged-in tenant.
    Enforces strict tenant isolation.
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        repo = get_payment_repo()
        payment = repo.get_by_id(
            payment_id=payment_id,
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        if not payment:
            return jsonify({"error": "Payment record not found."}), 404

        return jsonify(payment), 200
    except Exception as e:
        logger.error(f"Error fetching payment {payment_id}: {e}")
        return jsonify({"error": "Unable to retrieve payment details."}), 500


@app.route("/api/tenant/me/complaints", methods=["GET"])
@tenant_required
def get_tenant_my_complaints():
    """
    List complaints strictly belonging to the authenticated tenant.
    Never exposes internal owner_notes or other residents' complaints.
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        repo = get_complaints_repo()
        complaints = repo.get_tenant_complaints(
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        summary = repo.get_tenant_complaint_summary(
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        return jsonify({
            "complaints": complaints,
            "summary": summary,
        }), 200
    except Exception as e:
        logger.error(f"Error fetching tenant complaints: {e}")
        return jsonify({"error": "Unable to retrieve complaints at this time."}), 500


@app.route("/api/tenant/me/complaints", methods=["POST"])
@tenant_required
def create_tenant_my_complaint():
    """
    Submit a new complaint raised by the authenticated resident.
    Server strictly resolves tenant_id, hostel_id from token session.
    Initial status: OPEN.
    """
    try:
        tenant = g.current_tenant
        tenant_filters, hostel_id, t_row = get_tenant_filters_for_request()
        tenant_id = t_row.get("id") or tenant.get("tenant_id") or tenant.get("id")

        payload = request.get_json(silent=True) or {}
        title = (payload.get("title") or "").strip()
        description = (payload.get("description") or "").strip()
        category = (payload.get("category") or "").strip()
        priority = (payload.get("priority") or "MEDIUM").strip().upper()
        location = (payload.get("location") or "").strip()

        if not title:
            return jsonify({"error": "Issue title is required."}), 400
        if not description:
            return jsonify({"error": "Description of the issue is required."}), 400
        if not category:
            return jsonify({"error": "Category is required."}), 400

        repo = get_complaints_repo()
        created = repo.create_tenant_complaint(
            data={
                "title": title,
                "description": description,
                "category": category,
                "priority": priority,
                "location": location,
            },
            hostel_id=hostel_id,
            tenant_id=tenant_id,
            tenant_profile=tenant,
        )

        return jsonify({
            "success": True,
            "message": "Complaint raised successfully. Hostel management has been notified.",
            "complaint": created,
        }), 201

    except Exception as e:
        logger.error(f"Error raising tenant complaint: {e}")
        return jsonify({"error": f"Failed to raise complaint: {str(e)}"}), 500


@app.route("/api/tenant/me/complaints/<complaint_id>", methods=["GET"])
@tenant_required
def get_tenant_single_complaint(complaint_id):
    """
    Retrieve single complaint details for the authenticated tenant.
    Never exposes internal owner_notes. Enforces strict tenant isolation.
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        repo = get_complaints_repo()
        complaint = repo.get_tenant_complaint_by_id(
            complaint_id=complaint_id,
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        if not complaint:
            return jsonify({"error": "Complaint not found or unauthorized access."}), 404

        return jsonify({"complaint": complaint}), 200
    except Exception as e:
        logger.error(f"Error fetching tenant complaint {complaint_id}: {e}")
        return jsonify({"error": "Unable to retrieve complaint details."}), 500


# ============================================================================
# 3B. TENANT VISITOR PASS ENDPOINTS (/api/tenant/me/visitors)
# ============================================================================

@app.route("/api/tenant/me/visitors", methods=["GET"])
@tenant_required
def get_tenant_my_visitors():
    """
    List visitor requests strictly belonging to the authenticated resident.
    Includes live status (PENDING_APPROVAL, APPROVED, CHECKED_IN, CHECKED_OUT, etc.)
    and KPI counters.
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        repo = get_visitors_repo()
        visitors = repo.get_tenant_visitors(
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        summary = repo.get_tenant_visitor_summary(
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        return jsonify({
            "visitors": visitors,
            "summary": summary,
        }), 200
    except Exception as e:
        logger.error(f"Error fetching tenant visitors: {e}")
        return jsonify({"error": "Unable to retrieve visitor passes at this time."}), 500


@app.route("/api/tenant/me/visitors", methods=["POST"])
@tenant_required
def create_tenant_my_visitor():
    """
    Submit a new visitor pass request for host tenant.
    Initial status: PENDING_APPROVAL.
    """
    try:
        tenant = g.current_tenant
        tenant_filters, hostel_id, t_row = get_tenant_filters_for_request()
        tenant_id = t_row.get("id") or tenant.get("tenant_id") or tenant.get("id")

        payload = request.get_json(silent=True) or {}
        visitor_name = (payload.get("visitor_name") or "").strip()
        visitor_phone = (payload.get("visitor_phone") or "").strip()
        visit_date = (payload.get("visit_date") or "").strip()

        if not visitor_name:
            return jsonify({"error": "Visitor name is required."}), 400
        if not visitor_phone:
            return jsonify({"error": "Visitor phone number is required."}), 400
        if not visit_date:
            return jsonify({"error": "Visit date is required."}), 400

        repo = get_visitors_repo()
        created = repo.create_tenant_visitor_request(
            data=payload,
            hostel_id=hostel_id,
            tenant_profile=tenant,
            tenant_id=tenant_id,
        )

        return jsonify({
            "success": True,
            "message": "Visitor pass request submitted! Management will review shortly.",
            "visitor": created,
        }), 201
    except Exception as e:
        logger.error(f"Error submitting visitor request: {e}")
        return jsonify({"error": f"Failed to submit visitor request: {str(e)}"}), 500


@app.route("/api/tenant/me/visitors/<visitor_id>/cancel", methods=["PATCH"])
@tenant_required
def cancel_tenant_my_visitor(visitor_id):
    """
    Cancel an upcoming or pending visitor request before check-in.
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        repo = get_visitors_repo()
        cancelled = repo.cancel_tenant_visitor_request(
            visitor_id=visitor_id,
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        if not cancelled:
            return jsonify({"error": "Visitor request not found or unauthorized."}), 404

        return jsonify({
            "success": True,
            "message": "Visitor pass request cancelled.",
            "visitor": cancelled,
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error cancelling visitor request: {e}")
        return jsonify({"error": "Unable to cancel visitor request."}), 500


@app.route("/api/tenant/me/visitors/<visitor_id>", methods=["GET"])
@tenant_required
def get_tenant_single_visitor(visitor_id):
    """
    Get full digital pass details for tenant's visitor.
    """
    try:
        tenant_filters, hostel_id, _ = get_tenant_filters_for_request()
        repo = get_visitors_repo()
        visitor = repo.get_tenant_visitor_by_id(
            visitor_id=visitor_id,
            hostel_id=hostel_id,
            tenant_id_filters=tenant_filters,
        )
        if not visitor:
            return jsonify({"error": "Visitor record not found."}), 404

        return jsonify({"visitor": visitor}), 200
    except Exception as e:
        logger.error(f"Error fetching visitor pass: {e}")
        return jsonify({"error": "Unable to retrieve pass details."}), 500


# ============================================================================
# 4. OWNER-ONLY TENANT ACCOUNT CREATION (POST /api/owner/tenants/:tenantId/create-account)
# ============================================================================

@app.route("/api/owner/tenants/<tenant_id>/create-account", methods=["POST"])
@owner_required
def create_tenant_account(tenant_id):
    """
    Protected Owner-only endpoint to create a Supabase Auth login account for an approved tenant.
    Verifications:
    - Owner authenticated, role == OWNER
    - Owner belongs to active hostel
    - Tenant email is valid
    - Tenant does not already have an auth account
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        email = (payload.get("email") or "").strip().lower()
        full_name = (payload.get("name") or payload.get("full_name") or "").strip()
        phone = (payload.get("phone") or "").strip()
        room_number = (payload.get("roomNumber") or payload.get("room_number") or "Room 101").strip()
        bed_code = (payload.get("bedCode") or payload.get("bed_code") or "Bed A").strip()
        move_in_date = (payload.get("moveInDate") or payload.get("move_in_date") or "").strip()
        emergency_contact = (payload.get("emergencyContact") or "").strip()
        monthly_rent = payload.get("monthlyRent") or 8500

        if not email or "@" not in email:
            return jsonify({"error": "A valid tenant email address is required to create a login account."}), 400

        if not full_name:
            return jsonify({"error": "Tenant full name is required."}), 400

        auth_client = get_auth_client()

        # Check if auth user with this email already exists
        try:
            users_list = auth_client.auth.admin.list_users()
            existing_users = getattr(users_list, "users", []) if hasattr(users_list, "users") else (users_list if isinstance(users_list, list) else [])
            for u in existing_users:
                if (getattr(u, "email", "") or "").lower() == email:
                    return jsonify({
                        "error": f"A login account already exists for {email}. Cannot create duplicate credentials."
                    }), 409
        except Exception as list_err:
            logger.warning(f"Error checking existing users in list_users: {list_err}")

        # Generate a friendly tenant code: e.g. TEN-1001 or format based on tenant_id
        if tenant_id and tenant_id.startswith("TEN-"):
            clean_digits = "".join(filter(str.isdigit, tenant_id))
            tenant_code = f"TEN-10{clean_digits}" if len(clean_digits) == 2 else f"TEN-{clean_digits}" if len(clean_digits) >= 4 else f"TEN-{tenant_id.replace('TEN-', '')}"
        else:
            tenant_code = f"TEN-{secrets.randbelow(9000) + 1000}"

        # Generate a strong, secure temporary password for demo invitation
        # Format: e.g., Nest@87Kq!p
        alphabet = string.ascii_letters + string.digits
        random_chars = "".join(secrets.choice(alphabet) for _ in range(8))
        temp_password = f"Nest@{random_chars}!"

        # Create user via Supabase Admin API
        user_metadata = {
            "user_code": tenant_code,
            "full_name": full_name,
            "phone": phone,
            "role": "TENANT",
            "hostel_id": owner["hostel_id"],
            "hostel_name": owner.get("hostel_name", DEMO_HOSTEL_NAME),
            "hostel_location": owner.get("hostel_location", DEMO_HOSTEL_LOCATION),
            "room_number": room_number,
            "bed_code": bed_code,
            "move_in_date": move_in_date,
            "emergency_contact": emergency_contact,
            "monthly_rent": monthly_rent,
            "is_active": True,
            "onboarding_completed": False,
        }

        app_metadata = {
            "role": "TENANT",
            "hostel_id": owner["hostel_id"],
        }

        created_res = auth_client.auth.admin.create_user({
            "email": email,
            "password": temp_password,
            "email_confirm": True,
            "user_metadata": user_metadata,
            "app_metadata": app_metadata,
        })

        created_user = getattr(created_res, "user", None) or created_res
        auth_user_id = str(getattr(created_user, "id", ""))

        # Also attempt inserting into public.profiles if table exists
        try:
            db = get_db_client()
            db.table("profiles").insert({
                "auth_user_id": auth_user_id,
                "user_code": tenant_code,
                "full_name": full_name,
                "phone": phone,
                "role": "TENANT",
                "hostel_id": owner["hostel_id"],
                "is_active": True,
                "onboarding_completed": False,
            }).execute()
        except Exception as prof_err:
            logger.info(f"Note: profiles table insert skipped: {prof_err}")

        logger.info(f"Tenant account created successfully: {email} ({tenant_code}) by owner {owner['user_code']}")

        return jsonify({
            "success": True,
            "message": "Tenant account created successfully.",
            "account": {
                "tenant_id": tenant_code,
                "name": full_name,
                "email": email,
                "phone": phone,
                "room_number": room_number,
                "bed_code": bed_code,
                "status": "Active",
                "temporary_password": temp_password,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        }), 201

    except Exception as e:
        logger.error(f"Error creating tenant account: {e}")
        return jsonify({"error": f"Failed to create tenant login: {str(e)}"}), 500


# ============================================================================
# 3. PROTECTED OWNER CRM ENDPOINTS (/api/owner/*)
# ============================================================================

@app.route("/api/owner/dashboard", methods=["GET"])
@owner_required
def get_owner_dashboard():
    """
    Protected Owner Dashboard endpoint.
    Returns real, calculated metrics across rooms, beds, tenants, enquiries,
    bookings, payments, complaints, maintenance, and visitors.
    No hardcoded mock numbers.
    """
    try:
        db = get_db_client()
        owner = g.current_owner
        hostel_id = owner["hostel_id"]

        room_service = get_room_service(db)
        tenant_service = get_tenant_service(db)
        booking_service = get_booking_service(db)

        # Real room & bed statistics
        room_stats = room_service.get_stats(hostel_id)
        # Real tenant statistics
        tenant_stats = tenant_service.get_stats(hostel_id)
        # Real booking statistics
        booking_stats = booking_service.get_stats(hostel_id)

        # Fetch real enquiries from Supabase ordered newest first
        enq_res = (
            db.table("enquiries")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        raw_enquiries = enq_res.data or []
        parsed_enquiries = [parse_enquiry_row(r) for r in raw_enquiries]

        # Count real enquiries by status
        status_counts = {
            "new": 0,
            "interested": 0,
            "visit_scheduled": 0,
            "booked": 0,
            "total": len(parsed_enquiries),
        }
        for enq in parsed_enquiries:
            st = enq["status"]
            if st == "INTERESTED":
                status_counts["interested"] += 1
            elif st in ("VISIT_SCHEDULED", "VISIT SCHEDULED"):
                status_counts["visit_scheduled"] += 1
            elif st == "BOOKED":
                status_counts["booked"] += 1
            else:
                status_counts["new"] += 1

        recent_enquiries = parsed_enquiries[:5]

        # Real data-driven alerts
        alerts = []
        if status_counts["new"] > 0:
            count = status_counts["new"]
            alerts.append({
                "id": "alert-new-enquiries",
                "severity": "warning",
                "title": f"{count} new {'enquiry needs' if count == 1 else 'enquiries need'} follow-up",
                "description": "Prospective tenants have submitted enquiries via the public website.",
                "action_text": "View Enquiries",
                "action_link": "/owner/leads",
            })

        if tenant_stats["upcoming_stay_end_dates_count"] > 0:
            count = tenant_stats["upcoming_stay_end_dates_count"]
            alerts.append({
                "id": "alert-upcoming-moveouts",
                "severity": "info",
                "title": f"{count} tenant {'stay is' if count == 1 else 'stays are'} ending within 30 days",
                "description": "Check tenant departure dates and prepare room turnover.",
                "action_text": "View Tenants",
                "action_link": "/owner/tenants",
            })

        # Real activity feed gathered across recent events
        activity_items = []
        for enq in parsed_enquiries[:4]:
            activity_items.append({
                "id": f"act-enq-{enq['id']}",
                "type": "enquiry",
                "icon": "📩",
                "text": f"New enquiry from {enq['name']}",
                "subtext": f"{enq['preferred_room']} • Move-in {enq['move_in_date']}",
                "created_at": enq.get("created_at") or datetime.now(timezone.utc).isoformat(),
            })

        # Fetch recent payments for activity feed
        try:
            p_res = (
                db.table("payments")
                .select("id, tenant_id, amount_paid, payment_method, created_at, status")
                .eq("hostel_id", hostel_id)
                .order("created_at", desc=True)
                .limit(4)
                .execute()
            )
            for p in (p_res.data or []):
                if float(p.get("amount_paid", 0)) > 0:
                    activity_items.append({
                        "id": f"act-pay-{p['id']}",
                        "type": "payment",
                        "icon": "💳",
                        "text": f"Payment recorded: ₹{float(p['amount_paid']):,.0f}",
                        "subtext": f"Via {p.get('payment_method', 'UPI')} • {p.get('status', 'PAID')}",
                        "created_at": p.get("created_at") or datetime.now(timezone.utc).isoformat(),
                    })
        except Exception:
            pass

        # Fetch recent bookings for activity feed
        try:
            b_res = (
                db.table("bookings")
                .select("id, guest_name, booking_code, booking_status, created_at")
                .eq("hostel_id", hostel_id)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            for b in (b_res.data or []):
                activity_items.append({
                    "id": f"act-book-{b['id']}",
                    "type": "booking",
                    "icon": "📅",
                    "text": f"Booking confirmed: {b.get('guest_name', 'Guest')}",
                    "subtext": f"Code: {b.get('booking_code')} • Status: {b.get('booking_status')}",
                    "created_at": b.get("created_at") or datetime.now(timezone.utc).isoformat(),
                })
        except Exception:
            pass

        # Fetch recent complaints for activity feed
        try:
            comp_res = (
                db.table("complaints")
                .select("id, title, category, priority, created_at")
                .eq("hostel_id", hostel_id)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            for c in (comp_res.data or []):
                activity_items.append({
                    "id": f"act-comp-{c['id']}",
                    "type": "complaint",
                    "icon": "⚠️",
                    "text": f"Complaint: {c.get('title', 'Ticket')}",
                    "subtext": f"{c.get('category', 'Maintenance')} • Priority {c.get('priority')}",
                    "created_at": c.get("created_at") or datetime.now(timezone.utc).isoformat(),
                })
        except Exception:
            pass

        # Sort all activities by created_at descending
        activity_items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
        recent_activity = activity_items[:8]

        # Real aggregated payment & rent financial metrics from unified repository
        repo = get_payment_repo()
        payment_metrics = repo.get_hostel_summary(owner["hostel_id"])

        # Real operational metrics for complaints and maintenance
        c_repo = get_complaints_repo()
        ops_metrics = c_repo.get_dashboard_counts(owner["hostel_id"])

        # Real visitor metrics for gate security
        v_repo = get_visitors_repo()
        visitor_metrics = v_repo.get_dashboard_counts(owner["hostel_id"])

        # Build clean, systematic structured dashboard payload
        dashboard_property = {
            "floors": room_stats.get("floors_count", 0),
            "rooms": room_stats.get("total_rooms", 0),
            "beds": room_stats.get("total_beds", 0),
            "roomsFullyOccupied": room_stats.get("roomsFullyOccupied", 0),
            "roomsPartiallyOccupied": room_stats.get("roomsPartiallyOccupied", 0),
            "roomsVacant": room_stats.get("roomsVacant", 0),
            "roomsMaintenance": room_stats.get("roomsMaintenance", 0),
            "bedsOccupied": room_stats.get("occupied_beds", 0),
            "bedsAvailable": room_stats.get("available_beds", 0),
            "bedsReserved": room_stats.get("reserved_beds", 0),
            "occupancyRate": room_stats.get("occupancy_rate", 0.0),
        }

        floor_summary = room_stats.get("floors", [])

        upcoming_vacancies = tenant_stats.get("upcoming_vacancies", [])[:5]
        full_room_vacancies = tenant_stats.get("full_room_vacancies", [])
        upcoming_move_ins = booking_stats.get("upcoming_move_ins", [])[:5]

        rent_overview = {
            "expected": payment_metrics.get("expected_rent", 0.0),
            "collected": payment_metrics.get("collected_rent", 0.0),
            "pending": payment_metrics.get("pending_rent", 0.0),
            "overdue": payment_metrics.get("overdue_rent", 0.0),
        }

        visitors_overview = {
            "today": visitor_metrics.get("today", 0),
            "currentlyInside": visitor_metrics.get("currentlyInside", 0),
            "thisWeek": visitor_metrics.get("thisWeek", 0),
            "thisMonth": visitor_metrics.get("thisMonth", 0),
            "active": visitor_metrics.get("active", []),
        }

        complaints_overview = {
            "open": ops_metrics.get("openComplaints", 0),
            "highPriority": ops_metrics.get("highPriority", 0),
        }

        maintenance_overview = {
            "inProgress": ops_metrics.get("inProgress", 0),
            "overdue": ops_metrics.get("overdue", 0),
        }

        leads_overview = {
            "new": status_counts.get("new", 0),
            "total": status_counts.get("total", 0),
        }

        return jsonify({
            # New Structured Hierarchy Payload
            "property": dashboard_property,
            "floorSummary": floor_summary,
            "upcomingVacancies": upcoming_vacancies,
            "fullRoomVacancies": full_room_vacancies,
            "upcomingMoveIns": upcoming_move_ins,
            "rent": rent_overview,
            "visitors": visitors_overview,
            "complaints": complaints_overview,
            "maintenance": maintenance_overview,
            "leads": leads_overview,
            "recentActivity": recent_activity,

            # Backward-compatible fields
            "hostel": {
                "id": owner["hostel_id"],
                "name": owner["hostel_name"],
                "location": owner["hostel_location"],
            },
            "owner": {
                "user_code": owner["user_code"],
                "full_name": owner["full_name"],
                "role": owner["role"],
            },
            "summary": {
                "total_rooms": room_stats["total_rooms"],
                "total_beds": room_stats["total_beds"],
                "occupied_beds": room_stats["occupied_beds"],
                "available_beds": room_stats["available_beds"],
                "reserved_beds": room_stats["reserved_beds"],
                "maintenance_beds": room_stats["maintenance_beds"],
                "occupancy_rate": room_stats["occupancy_rate"],
                "current_tenants": tenant_stats["active_tenants"],
                "total_tenants": tenant_stats["total_tenants"],
                "upcoming_move_outs": len(upcoming_vacancies),
                "upcoming_bookings": len(upcoming_move_ins),
            },
            "enquiries": status_counts,
            "financials": payment_metrics,
            "operations": ops_metrics,
            "property_overview": {
                "floors_count": room_stats.get("floors_count", 0),
                "rooms_count": room_stats["total_rooms"],
                "beds_count": room_stats["total_beds"],
                "occupied_beds": room_stats["occupied_beds"],
                "available_beds": room_stats["available_beds"],
                "reserved_beds": room_stats["reserved_beds"],
                "occupancy_rate": room_stats["occupancy_rate"],
                "floor_summaries": floor_summary,
            },
            "upcoming_stay_end_dates": upcoming_vacancies,
            "upcoming_bookings_list": upcoming_move_ins,
            "recent_enquiries": recent_enquiries,
            "alerts": alerts,
        }), 200

    except Exception as e:
        logger.error(f"Error loading owner dashboard: {e}")
        return jsonify({"error": "Unable to load dashboard data at this time."}), 500


# ============================================================================
# ============================================================================
# 3A. PROPERTY, FLOORS, ROOMS & BEDS ENDPOINTS
# ============================================================================

@app.route("/api/owner/property", methods=["GET"])
@owner_required
def get_owner_property():
    """Retrieve complete hostel property configuration, floor summaries, and occupancy."""
    try:
        owner = g.current_owner
        service = get_room_service(get_db_client())
        summary = service.get_property_summary(owner["hostel_id"])
        return jsonify({
            "hostel": {
                "id": owner["hostel_id"],
                "name": owner["hostel_name"],
                "location": owner["hostel_location"],
            },
            "property": summary,
            "summary": summary,
            "floors": summary["floors"],
        }), 200
    except Exception as e:
        logger.error(f"Error fetching property configuration: {e}")
        return jsonify({"error": f"Failed to retrieve property configuration: {str(e)}"}), 500


@app.route("/api/owner/floors", methods=["GET"])
@owner_required
def get_owner_floors():
    """List all floors for the owner's hostel with room and bed counts."""
    try:
        owner = g.current_owner
        service = get_room_service(get_db_client())
        floors = service.get_floors(owner["hostel_id"])
        return jsonify({
            "floors": floors,
            "count": len(floors)
        }), 200
    except Exception as e:
        logger.error(f"Error fetching floors: {e}")
        return jsonify({"error": f"Failed to retrieve floors: {str(e)}"}), 500


@app.route("/api/owner/floors", methods=["POST"])
@owner_required
def create_owner_floor():
    """Add a new floor to the owner's hostel."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        service = get_room_service(get_db_client())
        created = service.create_floor(owner["hostel_id"], payload)
        return jsonify({
            "success": True,
            "message": f"Floor '{created.get('floor_name')}' created successfully.",
            "floor": created
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error creating floor: {e}")
        return jsonify({"error": f"Failed to create floor: {str(e)}"}), 500


@app.route("/api/owner/floors/<floor_id>", methods=["PATCH"])
@owner_required
def update_owner_floor(floor_id):
    """Update floor details (name, order, status)."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        service = get_room_service(get_db_client())
        updated = service.update_floor(owner["hostel_id"], floor_id, payload)
        return jsonify({
            "success": True,
            "message": "Floor updated successfully.",
            "floor": updated
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error updating floor {floor_id}: {e}")
        return jsonify({"error": f"Failed to update floor: {str(e)}"}), 500


@app.route("/api/owner/rooms", methods=["GET"])
@owner_required
def get_owner_rooms():
    """List all rooms for the owner's hostel, optionally filtered by floor_id."""
    try:
        owner = g.current_owner
        floor_id = request.args.get("floor_id")
        service = get_room_service(get_db_client())
        rooms = service.get_rooms(owner["hostel_id"], floor_id=floor_id)
        stats = service.get_stats(owner["hostel_id"])
        return jsonify({
            "rooms": rooms,
            "stats": stats
        }), 200
    except Exception as e:
        logger.error(f"Error fetching rooms: {e}")
        return jsonify({"error": f"Failed to retrieve rooms: {str(e)}"}), 500


@app.route("/api/owner/rooms", methods=["POST"])
@owner_required
def create_owner_room():
    """Create a new room in the owner's hostel and auto-generate its beds."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        service = get_room_service(get_db_client())
        created = service.create_room(owner["hostel_id"], payload)
        return jsonify({
            "success": True,
            "message": f"Room {created['room_number']} created successfully with {created.get('total_beds', 0)} beds.",
            "room": created
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        return jsonify({"error": f"Failed to create room: {str(e)}"}), 500


@app.route("/api/owner/rooms/<room_id>", methods=["GET"])
@owner_required
def get_owner_single_room(room_id):
    """Retrieve details for a single room with its beds and active tenants."""
    try:
        owner = g.current_owner
        service = get_room_service(get_db_client())
        room = service.get_room_by_id(room_id, owner["hostel_id"])
        if not room:
            return jsonify({"error": "Room not found."}), 404
        return jsonify({"room": room}), 200
    except Exception as e:
        logger.error(f"Error fetching room {room_id}: {e}")
        return jsonify({"error": "Failed to retrieve room."}), 500


@app.route("/api/owner/rooms/<room_id>", methods=["PATCH"])
@owner_required
def update_owner_room(room_id):
    """
    Update room configuration (rent, deposit, type, capacity, status).
    Guards against reducing capacity below occupied/reserved beds count.
    Supports propagating updated rent to active room tenants.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        service = get_room_service(get_db_client())
        updated = service.update_room(owner["hostel_id"], room_id, payload)
        return jsonify({
            "success": True,
            "message": f"Room {updated.get('room_number', '')} updated successfully.",
            "room": updated
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error updating room {room_id}: {e}")
        return jsonify({"error": f"Failed to update room: {str(e)}"}), 500


@app.route("/api/owner/rooms/<room_id>/beds", methods=["GET"])
@owner_required
def get_owner_room_beds(room_id):
    """List all beds in a specific room."""
    try:
        owner = g.current_owner
        service = get_room_service(get_db_client())
        room = service.get_room_by_id(room_id, owner["hostel_id"])
        if not room:
            return jsonify({"error": "Room not found."}), 404
        return jsonify({
            "room_id": room["id"],
            "room_number": room["room_number"],
            "beds": room.get("beds", [])
        }), 200
    except Exception as e:
        logger.error(f"Error fetching room beds: {e}")
        return jsonify({"error": f"Failed to retrieve beds: {str(e)}"}), 500


@app.route("/api/owner/rooms/<room_id>/beds", methods=["POST"])
@owner_required
def add_owner_bed_to_room(room_id):
    """Add a bed to an existing room and increase capacity."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        bed_code = payload.get("bed_code")
        service = get_room_service(get_db_client())
        new_bed = service.add_bed(owner["hostel_id"], room_id, bed_code)
        return jsonify({
            "success": True,
            "message": f"Bed {new_bed.get('bed_code')} added successfully.",
            "bed": new_bed
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error adding bed: {e}")
        return jsonify({"error": f"Failed to add bed: {str(e)}"}), 500


@app.route("/api/owner/beds/<bed_id>", methods=["PATCH"])
@owner_required
def update_owner_bed(bed_id):
    """Update status of a bed (e.g. MAINTENANCE, AVAILABLE)."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        status = payload.get("status")
        if not status:
            return jsonify({"error": "Status is required."}), 400
        service = get_room_service(get_db_client())
        updated = service.update_bed_status(owner["hostel_id"], bed_id, status)
        if not updated:
            return jsonify({"error": "Bed not found."}), 404
        return jsonify({
            "success": True,
            "message": f"Bed status updated to {status}.",
            "bed": updated
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error updating bed {bed_id}: {e}")
        return jsonify({"error": f"Failed to update bed: {str(e)}"}), 500


# ============================================================================
# 3B. TENANTS MANAGEMENT ENDPOINTS (/api/owner/tenants)
# ============================================================================

@app.route("/api/owner/tenants", methods=["GET"])
@owner_required
def get_owner_tenants():
    """List all tenants in the owner's hostel."""
    try:
        owner = g.current_owner
        status = request.args.get("status")
        search = request.args.get("search")
        service = get_tenant_service(get_db_client())
        tenants = service.get_tenants(owner["hostel_id"], status=status, search=search)
        stats = service.get_stats(owner["hostel_id"])
        return jsonify({
            "tenants": tenants,
            "stats": stats
        }), 200
    except Exception as e:
        logger.error(f"Error fetching tenants: {e}")
        return jsonify({"error": f"Failed to retrieve tenants: {str(e)}"}), 500


@app.route("/api/owner/tenants", methods=["POST"])
@owner_required
def create_owner_tenant():
    """Add a new tenant to the owner's hostel."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        service = get_tenant_service(get_db_client())
        created = service.create_tenant(owner["hostel_id"], payload)
        return jsonify({
            "success": True,
            "message": f"Tenant {created['full_name']} registered successfully.",
            "tenant": created
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error creating tenant: {e}")
        return jsonify({"error": f"Failed to create tenant: {str(e)}"}), 500


@app.route("/api/owner/tenants/<tenant_id>", methods=["GET"])
@owner_required
def get_owner_single_tenant(tenant_id):
    """Retrieve details for a single tenant."""
    try:
        owner = g.current_owner
        service = get_tenant_service(get_db_client())
        tenant = service.get_tenant_by_id(tenant_id, owner["hostel_id"])
        if not tenant:
            return jsonify({"error": "Tenant not found."}), 404
        return jsonify({"tenant": tenant}), 200
    except Exception as e:
        logger.error(f"Error fetching tenant {tenant_id}: {e}")
        return jsonify({"error": "Failed to retrieve tenant."}), 500


@app.route("/api/owner/tenants/<tenant_id>/assign-bed", methods=["POST"])
@owner_required
def assign_owner_tenant_bed(tenant_id):
    """Assign a tenant to a room and bed, setting bed status to OCCUPIED."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        room_id = payload.get("room_id")
        bed_id = payload.get("bed_id")
        if not room_id or not bed_id:
            return jsonify({"error": "Both room_id and bed_id are required."}), 400
        service = get_tenant_service(get_db_client())
        updated = service.assign_bed(owner["hostel_id"], tenant_id, room_id, bed_id)
        return jsonify({
            "success": True,
            "message": f"Tenant assigned to room and bed successfully.",
            "tenant": updated
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error assigning bed to tenant {tenant_id}: {e}")
        return jsonify({"error": f"Failed to assign bed: {str(e)}"}), 500


@app.route("/api/owner/tenants/<tenant_id>/vacate", methods=["POST"])
@owner_required
def vacate_owner_tenant(tenant_id):
    """Vacate a tenant, releasing their bed to AVAILABLE and updating status to MOVED_OUT."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        move_out_date = payload.get("move_out_date")
        service = get_tenant_service(get_db_client())
        updated = service.vacate_tenant(owner["hostel_id"], tenant_id, move_out_date)
        return jsonify({
            "success": True,
            "message": f"Tenant vacated and bed released to Available.",
            "tenant": updated
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error vacating tenant {tenant_id}: {e}")
        return jsonify({"error": f"Failed to vacate tenant: {str(e)}"}), 500


# ============================================================================
# 3C. BOOKINGS MANAGEMENT ENDPOINTS (/api/owner/bookings)
# ============================================================================

@app.route("/api/owner/bookings", methods=["GET"])
@owner_required
def get_owner_bookings():
    """List bookings for the owner's hostel."""
    try:
        owner = g.current_owner
        status = request.args.get("status")
        service = get_booking_service(get_db_client())
        bookings = service.get_bookings(owner["hostel_id"], status=status)
        stats = service.get_stats(owner["hostel_id"])
        return jsonify({
            "bookings": bookings,
            "stats": stats
        }), 200
    except Exception as e:
        logger.error(f"Error fetching bookings: {e}")
        return jsonify({"error": f"Failed to retrieve bookings: {str(e)}"}), 500


@app.route("/api/owner/bookings", methods=["POST"])
@owner_required
def create_owner_booking():
    """Create a new booking reservation."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        service = get_booking_service(get_db_client())
        created = service.create_booking(owner["hostel_id"], payload)
        return jsonify({
            "success": True,
            "message": f"Booking {created['booking_code']} created successfully.",
            "booking": created
        }), 201
    except Exception as e:
        logger.error(f"Error creating booking: {e}")
        return jsonify({"error": f"Failed to create booking: {str(e)}"}), 500


@app.route("/api/owner/bookings/<booking_id>/status", methods=["PATCH"])
@owner_required
def update_owner_booking_status(booking_id):
    """Update booking confirmation or payment status."""
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        b_status = payload.get("booking_status")
        p_status = payload.get("payment_status")
        if not b_status:
            return jsonify({"error": "booking_status is required."}), 400
        service = get_booking_service(get_db_client())
        updated = service.update_booking_status(owner["hostel_id"], booking_id, b_status, p_status)
        if not updated:
            return jsonify({"error": "Booking not found."}), 404
        return jsonify({
            "success": True,
            "message": f"Booking status updated to {b_status}.",
            "booking": updated
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error updating booking {booking_id}: {e}")
        return jsonify({"error": f"Failed to update booking: {str(e)}"}), 500


@app.route("/api/owner/payments", methods=["GET"])
@owner_required
def get_owner_payments():
    """
    List all payment and charge records for the owner's hostel.
    Supports status filtering (?status=PAID|PENDING|OVERDUE|PARTIAL), tenant filtering, and search.
    Returns authoritative aggregate financial summary.
    """
    try:
        owner = g.current_owner
        status_filter = request.args.get("status", "ALL")
        search_query = request.args.get("search", "")
        tenant_id = request.args.get("tenant_id")
        tenant_filters = [tenant_id] if tenant_id else None

        repo = get_payment_repo()
        payments = repo.get_all(
            hostel_id=owner["hostel_id"],
            tenant_id_filters=tenant_filters,
            status_filter=status_filter,
            search_query=search_query,
        )
        summary = repo.get_hostel_summary(owner["hostel_id"])

        return jsonify({
            "payments": payments,
            "count": len(payments),
            "summary": summary,
        }), 200
    except Exception as e:
        logger.error(f"Error loading owner payments: {e}")
        return jsonify({"error": "Unable to load payment records at this time."}), 500


@app.route("/api/owner/payments", methods=["POST"])
@owner_required
def record_owner_payment():
    """
    Record a new payment or update an existing charge with authoritative server-side calculation.
    Validates amounts, calculates balance_amount = amount_due - amount_paid,
    determines status (PAID | PARTIAL | OVERDUE | DUE_SOON | PENDING).
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        tenant_id = (payload.get("tenant_id") or payload.get("tenantId") or "").strip()
        tenant_name = (payload.get("tenant_name") or payload.get("tenantName") or "").strip()
        amount_due = payload.get("amount_due")
        if amount_due is None:
            amount_due = payload.get("amount")

        if not tenant_id and not tenant_name:
            return jsonify({"error": "Tenant selection or identifier is required."}), 400

        try:
            amount_due_num = float(amount_due or 0.0)
            amount_paid_num = float(payload.get("amount_paid", 0.0) or payload.get("amountPaid", 0.0) or 0.0)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid numeric amounts provided."}), 400

        if amount_due_num < 0 or amount_paid_num < 0:
            return jsonify({"error": "Payment amounts cannot be negative."}), 400

        repo = get_payment_repo()
        saved = repo.create_or_update(
            data={
                "payment_id": payload.get("payment_id") or payload.get("id"),
                "tenant_id": tenant_id,
                "tenant_name": tenant_name,
                "room_number": payload.get("room_number") or payload.get("room") or "Room 101",
                "payment_type": payload.get("payment_type") or payload.get("type") or "Monthly Rent",
                "amount_due": amount_due_num,
                "amount_paid": amount_paid_num,
                "due_date": payload.get("due_date") or payload.get("dueDate") or "2026-10-05",
                "paid_date": payload.get("paid_date") or payload.get("paidDate"),
                "payment_method": payload.get("payment_method") or payload.get("paymentMethod") or "Pending",
                "reference_number": payload.get("reference_number") or payload.get("reference") or "",
                "notes": payload.get("notes") or "",
            },
            hostel_id=owner["hostel_id"]
        )

        return jsonify({
            "success": True,
            "message": f"Payment recorded successfully for {saved.get('tenant_name')}.",
            "payment": saved,
        }), 201

    except Exception as e:
        logger.error(f"Error recording owner payment: {e}")
        return jsonify({"error": f"Failed to record payment: {str(e)}"}), 500


@app.route("/api/owner/payments/<payment_id>", methods=["GET"])
@owner_required
def get_owner_single_payment(payment_id):
    """
    Get full details for a single payment by owner.
    """
    try:
        owner = g.current_owner
        repo = get_payment_repo()
        payment = repo.get_by_id(payment_id=payment_id, hostel_id=owner["hostel_id"])
        if not payment:
            return jsonify({"error": "Payment record not found."}), 404
        return jsonify(payment), 200
    except Exception as e:
        logger.error(f"Error fetching owner payment {payment_id}: {e}")
        return jsonify({"error": "Unable to retrieve payment details."}), 500


# ============================================================================
# 5. OWNER COMPLAINTS & MAINTENANCE ENDPOINTS (/api/owner/complaints, /api/owner/maintenance)
# ============================================================================

@app.route("/api/owner/complaints", methods=["GET"])
@owner_required
def get_owner_complaints():
    """
    List all complaints for the owner's hostel with filters (status, priority, search)
    and summary metrics (open, assigned, in_progress, resolved_today, high_priority).
    """
    try:
        owner = g.current_owner
        status_filter = request.args.get("status", "ALL")
        priority_filter = request.args.get("priority", "ALL")
        search_query = request.args.get("search", "")

        repo = get_complaints_repo()
        result = repo.get_owner_complaints(
            hostel_id=owner["hostel_id"],
            status_filter=status_filter,
            priority_filter=priority_filter,
            search_query=search_query,
        )
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching owner complaints: {e}")
        return jsonify({"error": "Unable to retrieve complaints at this time."}), 500


@app.route("/api/owner/complaints/<complaint_id>", methods=["GET"])
@owner_required
def get_owner_single_complaint(complaint_id):
    """
    Get full details for a single complaint including internal owner notes
    and any linked maintenance tasks.
    """
    try:
        owner = g.current_owner
        repo = get_complaints_repo()
        complaint = repo.get_owner_complaint_by_id(complaint_id, owner["hostel_id"])
        if not complaint:
            return jsonify({"error": "Complaint record not found."}), 404
        return jsonify({"complaint": complaint}), 200
    except Exception as e:
        logger.error(f"Error fetching owner complaint {complaint_id}: {e}")
        return jsonify({"error": "Unable to retrieve complaint details."}), 500


@app.route("/api/owner/complaints/<complaint_id>", methods=["PATCH"])
@owner_required
def update_owner_complaint(complaint_id):
    """
    Owner updates complaint: status, assigned staff, priority,
    internal staff notes, or tenant-visible resolution notes.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        repo = get_complaints_repo()
        updated = repo.update_owner_complaint(
            complaint_id=complaint_id,
            hostel_id=owner["hostel_id"],
            update_data=payload,
        )
        if not updated:
            return jsonify({"error": "Complaint not found or update failed."}), 404

        return jsonify({
            "success": True,
            "message": "Complaint updated successfully.",
            "complaint": updated,
        }), 200
    except Exception as e:
        logger.error(f"Error updating complaint {complaint_id}: {e}")
        return jsonify({"error": f"Failed to update complaint: {str(e)}"}), 500


@app.route("/api/owner/maintenance", methods=["GET"])
@owner_required
def get_owner_maintenance_tasks():
    """
    List all maintenance work orders with filters (status, priority, search)
    and summary metrics (open, scheduled, in_progress, completed, urgent).
    """
    try:
        owner = g.current_owner
        status_filter = request.args.get("status", "ALL")
        priority_filter = request.args.get("priority", "ALL")
        search_query = request.args.get("search", "")

        repo = get_complaints_repo()
        result = repo.get_owner_maintenance_tasks(
            hostel_id=owner["hostel_id"],
            status_filter=status_filter,
            priority_filter=priority_filter,
            search_query=search_query,
        )
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching owner maintenance tasks: {e}")
        return jsonify({"error": "Unable to retrieve maintenance tasks at this time."}), 500


@app.route("/api/owner/maintenance", methods=["POST"])
@owner_required
def create_owner_maintenance_task():
    """
    Create a maintenance task manually or converted from a tenant complaint.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        title = (payload.get("title") or payload.get("issue") or "").strip()
        location = (payload.get("location") or "").strip()

        if not title:
            return jsonify({"error": "Task title/issue description is required."}), 400
        if not location:
            return jsonify({"error": "Hostel area/location is required."}), 400

        repo = get_complaints_repo()
        created = repo.create_owner_maintenance_task(
            data=payload,
            hostel_id=owner["hostel_id"],
        )
        return jsonify({
            "success": True,
            "message": "Maintenance task created successfully.",
            "task": created,
        }), 201
    except Exception as e:
        logger.error(f"Error creating maintenance task: {e}")
        return jsonify({"error": f"Failed to create maintenance task: {str(e)}"}), 500


@app.route("/api/owner/maintenance/<task_id>", methods=["GET"])
@owner_required
def get_owner_single_maintenance_task(task_id):
    """
    Get a single maintenance work order for owner with linked complaint details.
    """
    try:
        owner = g.current_owner
        repo = get_complaints_repo()
        task = repo.get_owner_maintenance_by_id(task_id, owner["hostel_id"])
        if not task:
            return jsonify({"error": "Maintenance task not found."}), 404

        return jsonify({"task": task}), 200
    except Exception as e:
        logger.error(f"Error fetching maintenance task {task_id}: {e}")
        return jsonify({"error": f"Failed to fetch maintenance task: {str(e)}"}), 500


@app.route("/api/owner/maintenance/<task_id>", methods=["PATCH"])
@owner_required
def update_owner_maintenance_task(task_id):
    """
    Update maintenance work order status, dates, notes, and completion.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        repo = get_complaints_repo()
        updated = repo.update_owner_maintenance_task(
            task_id=task_id,
            hostel_id=owner["hostel_id"],
            update_data=payload,
        )
        if not updated:
            return jsonify({"error": "Maintenance task not found or update failed."}), 404

        return jsonify({
            "success": True,
            "message": "Maintenance task updated successfully.",
            "task": updated,
        }), 200
    except Exception as e:
        logger.error(f"Error updating maintenance task {task_id}: {e}")
        return jsonify({"error": f"Failed to update maintenance task: {str(e)}"}), 500


# ============================================================================
# 5B. OWNER VISITOR LOGS & GATE ENTRY/EXIT ENDPOINTS (/api/owner/visitors)
# ============================================================================

@app.route("/api/owner/visitors", methods=["GET"])
@owner_required
def get_owner_visitors():
    """
    List all visitor requests and logs with status/date filters, search, and KPI summary.
    """
    try:
        owner = g.current_owner
        status_filter = request.args.get("status", "ALL")
        date_filter = request.args.get("date", "ALL")
        search_query = request.args.get("search", "")

        repo = get_visitors_repo()
        result = repo.get_owner_visitors(
            hostel_id=owner["hostel_id"],
            status_filter=status_filter,
            date_filter=date_filter,
            search_query=search_query,
        )
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Error fetching owner visitors: {e}")
        return jsonify({"error": "Unable to retrieve visitor logs at this time."}), 500


@app.route("/api/owner/visitors/<visitor_id>", methods=["GET"])
@owner_required
def get_owner_single_visitor(visitor_id):
    """
    Get single visitor record for owner/reception.
    """
    try:
        owner = g.current_owner
        repo = get_visitors_repo()
        visitor = repo.get_owner_visitor_by_id(visitor_id, owner["hostel_id"])
        if not visitor:
            return jsonify({"error": "Visitor record not found."}), 404
        return jsonify({"visitor": visitor}), 200
    except Exception as e:
        logger.error(f"Error fetching owner visitor {visitor_id}: {e}")
        return jsonify({"error": "Unable to retrieve visitor details."}), 500


@app.route("/api/owner/visitors/<visitor_id>/approve", methods=["PATCH"])
@owner_required
def approve_owner_visitor(visitor_id):
    """
    Approve visitor request, issue digital pass code, and record gate instructions.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        approval_notes = payload.get("approval_notes", "")
        owner_notes = payload.get("owner_notes", "")

        repo = get_visitors_repo()
        updated = repo.approve_visitor(
            visitor_id=visitor_id,
            hostel_id=owner["hostel_id"],
            approval_notes=approval_notes,
            owner_notes=owner_notes,
        )
        if not updated:
            return jsonify({"error": "Visitor record not found or approval failed."}), 404

        return jsonify({
            "success": True,
            "message": f"Visitor request approved. Pass Code: {updated.get('pass_code')}",
            "visitor": updated,
        }), 200
    except Exception as e:
        logger.error(f"Error approving visitor {visitor_id}: {e}")
        return jsonify({"error": f"Failed to approve visitor: {str(e)}"}), 500


@app.route("/api/owner/visitors/<visitor_id>/reject", methods=["PATCH"])
@owner_required
def reject_owner_visitor(visitor_id):
    """
    Reject visitor request with reason visible to resident.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}
        rejection_reason = (payload.get("rejection_reason") or "").strip()
        if not rejection_reason:
            return jsonify({"error": "Rejection reason is required."}), 400

        owner_notes = payload.get("owner_notes", "")
        repo = get_visitors_repo()
        updated = repo.reject_visitor(
            visitor_id=visitor_id,
            hostel_id=owner["hostel_id"],
            rejection_reason=rejection_reason,
            owner_notes=owner_notes,
        )
        if not updated:
            return jsonify({"error": "Visitor record not found or rejection failed."}), 404

        return jsonify({
            "success": True,
            "message": "Visitor request rejected.",
            "visitor": updated,
        }), 200
    except Exception as e:
        logger.error(f"Error rejecting visitor {visitor_id}: {e}")
        return jsonify({"error": f"Failed to reject visitor: {str(e)}"}), 500


@app.route("/api/owner/visitors/<visitor_id>/check-in", methods=["POST"])
@owner_required
def check_in_owner_visitor(visitor_id):
    """
    Record visitor arrival at gate/reception desk. Sets status = CHECKED_IN.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        repo = get_visitors_repo()
        updated = repo.check_in_visitor(
            visitor_id=visitor_id,
            hostel_id=owner["hostel_id"],
            check_in_data=payload,
        )
        if not updated:
            return jsonify({"error": "Visitor record not found or check-in failed."}), 404

        return jsonify({
            "success": True,
            "message": f"Visitor {updated.get('visitor_name')} checked in successfully.",
            "visitor": updated,
        }), 200
    except Exception as e:
        logger.error(f"Error checking in visitor {visitor_id}: {e}")
        return jsonify({"error": f"Failed to check in visitor: {str(e)}"}), 500


@app.route("/api/owner/visitors/<visitor_id>/check-out", methods=["POST"])
@owner_required
def check_out_owner_visitor(visitor_id):
    """
    Record visitor departure at gate/reception desk. Sets status = CHECKED_OUT.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        repo = get_visitors_repo()
        updated = repo.check_out_visitor(
            visitor_id=visitor_id,
            hostel_id=owner["hostel_id"],
            check_out_data=payload,
        )
        if not updated:
            return jsonify({"error": "Visitor record not found or check-out failed."}), 404

        return jsonify({
            "success": True,
            "message": f"Visitor {updated.get('visitor_name')} checked out successfully.",
            "visitor": updated,
        }), 200
    except Exception as e:
        logger.error(f"Error checking out visitor {visitor_id}: {e}")
        return jsonify({"error": f"Failed to check out visitor: {str(e)}"}), 500


@app.route("/api/owner/visitors/walk-in", methods=["POST"])
@owner_required
def create_owner_walk_in_visitor():
    """
    Direct registration of walk-in visitor arriving at reception.
    """
    try:
        owner = g.current_owner
        payload = request.get_json(silent=True) or {}

        visitor_name = (payload.get("visitor_name") or "").strip()
        visitor_phone = (payload.get("visitor_phone") or "").strip()
        tenant_name = (payload.get("tenant_name") or "").strip()

        if not visitor_name:
            return jsonify({"error": "Visitor name is required."}), 400
        if not visitor_phone:
            return jsonify({"error": "Visitor phone number is required."}), 400
        if not tenant_name:
            return jsonify({"error": "Host resident name is required."}), 400

        repo = get_visitors_repo()
        created = repo.create_walk_in_visitor(
            data=payload,
            hostel_id=owner["hostel_id"],
        )

        return jsonify({
            "success": True,
            "message": f"Walk-in visitor {created.get('visitor_name')} logged with pass {created.get('pass_code')}.",
            "visitor": created,
        }), 201
    except Exception as e:
        logger.error(f"Error logging walk-in visitor: {e}")
        return jsonify({"error": f"Failed to log walk-in visitor: {str(e)}"}), 500


# ============================================================================
# 5C. OWNER ANNOUNCEMENT ENDPOINTS (/api/owner/announcements)
# ============================================================================

@app.route("/api/owner/announcements", methods=["GET"])
@owner_required
def get_owner_announcements():
    """List all announcements for the owner's hostel."""
    try:
        hostel_id = g.current_owner.get("hostel_id") or get_default_hostel_id()
        status_filter = request.args.get("status", "ALL")
        ann_service = get_announcement_service()
        items = ann_service.get_announcements(hostel_id, status_filter=status_filter)
        return jsonify({
            "announcements": items,
            "count": len(items)
        }), 200
    except Exception as e:
        logger.error(f"Error fetching owner announcements: {e}")
        return jsonify({"error": "Failed to fetch announcements."}), 500


@app.route("/api/owner/announcements", methods=["POST"])
@owner_required
def create_owner_announcement():
    """Create and broadcast or draft a new announcement."""
    try:
        hostel_id = g.current_owner.get("hostel_id") or get_default_hostel_id()
        created_by = g.current_owner.get("id")
        payload = request.get_json(silent=True) or {}
        ann_service = get_announcement_service()
        created = ann_service.create_announcement(
            hostel_id=hostel_id,
            data=payload,
            created_by_profile_id=created_by
        )
        return jsonify({
            "success": True,
            "message": "Announcement created successfully.",
            "announcement": created
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        logger.error(f"Error creating announcement: {e}")
        return jsonify({"error": f"Failed to create announcement: {str(e)}"}), 500


@app.route("/api/owner/announcements/<announcement_id>", methods=["PATCH"])
@owner_required
def update_owner_announcement(announcement_id):
    """Update announcement title, message, status, or schedule."""
    try:
        hostel_id = g.current_owner.get("hostel_id") or get_default_hostel_id()
        payload = request.get_json(silent=True) or {}
        ann_service = get_announcement_service()
        updated = ann_service.update_announcement(
            hostel_id=hostel_id,
            announcement_id=announcement_id,
            updates=payload
        )
        if not updated:
            return jsonify({"error": "Announcement not found."}), 404
        return jsonify({
            "success": True,
            "message": "Announcement updated successfully.",
            "announcement": updated
        }), 200
    except Exception as e:
        logger.error(f"Error updating announcement {announcement_id}: {e}")
        return jsonify({"error": f"Failed to update announcement: {str(e)}"}), 500


@app.route("/api/owner/announcements/<announcement_id>", methods=["DELETE"])
@owner_required
def delete_owner_announcement(announcement_id):
    """Delete an announcement permanently."""
    try:
        hostel_id = g.current_owner.get("hostel_id") or get_default_hostel_id()
        ann_service = get_announcement_service()
        success = ann_service.delete_announcement(
            hostel_id=hostel_id,
            announcement_id=announcement_id
        )
        if not success:
            return jsonify({"error": "Announcement not found or already deleted."}), 404
        return jsonify({
            "success": True,
            "message": "Announcement deleted successfully."
        }), 200
    except Exception as e:
        logger.error(f"Error deleting announcement {announcement_id}: {e}")
        return jsonify({"error": f"Failed to delete announcement: {str(e)}"}), 500

# ============================================================================
# 5B. OWNER ENQUIRIES / LEADS ENDPOINTS
# ============================================================================

@app.route("/api/owner/enquiries", methods=["GET"])
@owner_required
def get_owner_enquiries():
    """List all prospective tenant enquiries/leads with real-time status filtering and search."""
    try:
        db = get_db_client()
        status_filter = (request.args.get("status") or "ALL").strip().upper()
        search_query = (request.args.get("search") or "").strip().lower()

        res = (
            db.table("enquiries")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        raw_enquiries = res.data or []
        parsed = [parse_enquiry_row(r) for r in raw_enquiries]

        # Aggregate counts across all enquiries
        counts = {
            "all": len(parsed),
            "new": 0,
            "interested": 0,
            "visit_scheduled": 0,
            "booked": 0,
            "closed": 0,
        }
        for item in parsed:
            st = (item.get("status") or "NEW").upper()
            if st == "INTERESTED":
                counts["interested"] += 1
            elif st in ("VISIT_SCHEDULED", "VISIT SCHEDULED"):
                counts["visit_scheduled"] += 1
            elif st == "BOOKED":
                counts["booked"] += 1
            elif st == "CLOSED":
                counts["closed"] += 1
            else:
                counts["new"] += 1

        # Apply status filter
        filtered = parsed
        if status_filter != "ALL":
            if status_filter in ("VISIT_SCHEDULED", "VISIT SCHEDULED"):
                filtered = [i for i in filtered if i.get("status") in ("VISIT_SCHEDULED", "VISIT SCHEDULED")]
            else:
                filtered = [i for i in filtered if i.get("status") == status_filter]

        # Apply search filter
        if search_query:
            filtered = [
                i for i in filtered
                if search_query in (i.get("name") or "").lower()
                or search_query in (i.get("phone") or "").lower()
                or search_query in (i.get("email") or "").lower()
                or search_query in (i.get("preferred_room") or "").lower()
                or search_query in (i.get("message") or "").lower()
            ]

        return jsonify({
            "enquiries": filtered,
            "counts": counts,
            "total": len(parsed),
        }), 200

    except Exception as e:
        logger.error(f"Error fetching owner enquiries: {e}")
        return jsonify({"error": f"Failed to retrieve enquiries: {str(e)}"}), 500


@app.route("/api/owner/enquiries/<enquiry_id>/status", methods=["PATCH"])
@owner_required
def update_owner_enquiry_status(enquiry_id):
    """Update the pipeline status of an enquiry (NEW, INTERESTED, VISIT_SCHEDULED, BOOKED, CLOSED)."""
    try:
        payload = request.get_json(silent=True) or {}
        new_status = (payload.get("status") or "").strip().upper()

        valid_statuses = {"NEW", "INTERESTED", "VISIT_SCHEDULED", "BOOKED", "CLOSED"}
        if new_status not in valid_statuses:
            return jsonify({
                "error": f"Invalid status '{new_status}'. Allowed: {', '.join(sorted(valid_statuses))}"
            }), 400

        db = get_db_client()
        update_data = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        res = db.table("enquiries").update(update_data).eq("id", enquiry_id).execute()
        if not res.data:
            return jsonify({"error": "Enquiry not found or update returned empty."}), 404

        updated_row = parse_enquiry_row(res.data[0])
        logger.info(f"Enquiry {enquiry_id} status updated to {new_status}")
        return jsonify({
            "success": True,
            "message": f"Enquiry status updated to {new_status}",
            "enquiry": updated_row,
        }), 200

    except Exception as e:
        logger.error(f"Error updating enquiry {enquiry_id} status: {e}")
        return jsonify({"error": f"Failed to update enquiry status: {str(e)}"}), 500




@app.route("/api/enquiries", methods=["POST"])
def create_enquiry():
    """
    Public endpoint to submit a new hostel room enquiry and save it to Supabase.
    Strictly validates input, normalizes move_in_date to DATE or None,
    links active hostel_id, and returns 201 only on successful DB insertion.
    """
    try:
        payload = request.get_json(silent=True)
        if not payload:
            return jsonify({"error": "Invalid or empty JSON request body"}), 400

        name = (payload.get("name") or "").strip()
        phone = (payload.get("phone") or "").strip()
        email = (payload.get("email") or "").strip()
        preferred_room = (payload.get("preferred_room") or "").strip()
        raw_move_in = (payload.get("move_in_date") or "").strip()
        occupation = (payload.get("occupation") or "").strip()
        message = (payload.get("message") or "").strip()

        if not name:
            return jsonify({"error": "Full Name is required"}), 400
        if not phone:
            return jsonify({"error": "Phone number is required"}), 400

        db = get_db_client()
        hostel_id = get_default_hostel_id(db)

        # Parse move_in_date for PostgreSQL DATE column
        valid_date = None
        if raw_move_in:
            try:
                dt = datetime.strptime(raw_move_in[:10], "%Y-%m-%d").date()
                valid_date = dt.isoformat()
            except Exception:
                if not message:
                    message = f"Preferred Move-in: {raw_move_in}"
                else:
                    message = f"{message} | Preferred Move-in: {raw_move_in}"

        insert_payload = {
            "hostel_id": hostel_id,
            "name": name,
            "phone": phone,
            "email": email or None,
            "preferred_room": preferred_room or None,
            "move_in_date": valid_date,
            "occupation": occupation or None,
            "message": message or None,
            "status": "NEW",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            res = db.table("enquiries").insert(insert_payload).execute()
        except Exception as insert_err:
            err_str = str(insert_err)
            if "PGRST204" in err_str or "Could not find the" in err_str or "column" in err_str:
                logger.warning(f"Enquiry column mismatch in schema cache, falling back to message packing: {err_str}")
                details = []
                if email:
                    details.append(f"Email: {email}")
                if preferred_room:
                    details.append(f"Room: {preferred_room}")
                if raw_move_in:
                    details.append(f"Move-in: {raw_move_in}")
                if occupation:
                    details.append(f"Occupation: {occupation}")
                if message:
                    details.append(f"Notes: {message}")

                fallback_payload = {
                    "name": name,
                    "phone": phone,
                    "message": " | ".join(details) if details else (message or "Website room enquiry"),
                }
                if hostel_id:
                    fallback_payload["hostel_id"] = hostel_id

                try:
                    res = db.table("enquiries").insert(fallback_payload).execute()
                except Exception as fb_err:
                    if "hostel_id" in str(fb_err):
                        fallback_payload.pop("hostel_id", None)
                        res = db.table("enquiries").insert(fallback_payload).execute()
                    else:
                        raise fb_err
            else:
                raise insert_err

        if not res.data or len(res.data) == 0:
            logger.error("Enquiry insert returned empty data")
            return jsonify({"error": "Failed to save enquiry to database"}), 500

        inserted_record = res.data[0]
        logger.info(f"Enquiry successfully created with ID: {inserted_record.get('id')} for {name}")

        return jsonify({
            "message": "Enquiry submitted successfully",
            "data": inserted_record,
        }), 201

    except Exception as e:
        logger.error(f"Unexpected error in create_enquiry: {e}")
        return jsonify({"error": f"Failed to submit enquiry: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)

