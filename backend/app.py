import os
import re
import secrets
import string
import logging
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
                re.compile(r"^https://.*"),
            ],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
    supports_credentials=True,
)

# Supabase credentials from backend/.env
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "").strip()

COOKIE_NAME = "urbannest_access_token"
DEMO_HOSTEL_ID = "11111111-1111-1111-1111-111111111111"
DEMO_HOSTEL_NAME = "UrbanNest Hostel"
DEMO_HOSTEL_LOCATION = "Hyderabad, Telangana"


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
    return _payment_repo


def get_complaints_repo():
    global _complaints_repo
    if _complaints_repo is None:
        try:
            db = get_db_client()
        except Exception:
            db = None
        _complaints_repo = ComplaintsMaintenanceRepository(db)
    return _complaints_repo


# Verify startup configuration
try:
    _startup_client = get_db_client()
    logger.info("Supabase client initialized successfully.")
    # Initialize repositories
    get_payment_repo()
    get_complaints_repo()
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
            onboarding_val = row.get("onboarding_completed")
            if onboarding_val is None:
                onboarding_val = combined_meta.get("onboarding_completed", default_onboarding)

            return {
                "auth_user_id": auth_user_id,
                "email": email,
                "user_code": row.get("user_code") or combined_meta.get("user_code", "TEN-1001" if role == "TENANT" else "OWN-001"),
                "full_name": row.get("full_name") or combined_meta.get("full_name", "Hostel Resident" if role == "TENANT" else "Hostel Owner"),
                "phone": row.get("phone") or combined_meta.get("phone", ""),
                "role": role,
                "hostel_id": hostel_id,
                "hostel_name": hostel_name,
                "hostel_location": hostel_location,
                "room_number": combined_meta.get("room_number", "Room 204"),
                "bed_code": combined_meta.get("bed_code", "Bed A"),
                "room_type": combined_meta.get("room_type", "Double Sharing"),
                "floor": combined_meta.get("floor", "Floor 2"),
                "move_in_date": combined_meta.get("move_in_date", "2026-09-01"),
                "expected_end_date": combined_meta.get("expected_end_date", "2027-03-01"),
                "emergency_contact": combined_meta.get("emergency_contact", ""),
                "monthly_rent": combined_meta.get("monthly_rent", 8500),
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
        "auth_user_id": auth_user_id,
        "email": email,
        "user_code": combined_meta.get("user_code", "TEN-1001" if role == "TENANT" else "OWN-001"),
        "full_name": combined_meta.get("full_name", "Hostel Resident" if role == "TENANT" else "Rajesh Kumar"),
        "phone": combined_meta.get("phone", ""),
        "role": role,
        "hostel_id": combined_meta.get("hostel_id", DEMO_HOSTEL_ID),
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
    Extract the access token from HttpOnly cookie first, or Authorization Bearer header.
    """
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token.strip()

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()

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

        g.current_tenant = profile
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
        db.table("enquiries").select("id").limit(1).execute()
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


@app.route("/api/tenant/portal/data", methods=["GET"])
@tenant_required
def get_tenant_portal_data():
    """
    Return isolated, personal portal data strictly for the logged-in tenant.
    Never exposes other tenants, hostel accounting, or owner reports.
    """
    tenant = g.current_tenant
    tenant_filters = [
        tenant.get("user_code"),
        tenant.get("email"),
        tenant.get("auth_user_id"),
    ]
    repo = get_payment_repo()
    financial_summary = repo.get_tenant_payment_summary(
        tenant_id_filters=tenant_filters,
        hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
        monthly_rent_fallback=float(tenant.get("monthly_rent") or 8500.0)
    )

    c_repo = get_complaints_repo()
    complaints_summary = c_repo.get_tenant_complaint_summary(
        hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
        tenant_id_filters=tenant_filters,
    )

    return jsonify({
        "profile": {
            "user_code": tenant["user_code"],
            "full_name": tenant["full_name"],
            "email": tenant["email"],
            "phone": tenant.get("phone", ""),
            "emergency_contact": tenant.get("emergency_contact", "+91 98765 00001 (Guardian)"),
            "hostel_name": tenant.get("hostel_name", DEMO_HOSTEL_NAME),
            "hostel_location": tenant.get("hostel_location", DEMO_HOSTEL_LOCATION),
        },
        "stay": {
            "room_number": tenant.get("room_number", "Room 204"),
            "bed_code": tenant.get("bed_code", "Bed A"),
            "room_type": tenant.get("room_type", "Double Sharing"),
            "floor": tenant.get("floor", "Floor 2"),
            "move_in_date": tenant.get("move_in_date", "2026-07-01"),
            "expected_end_date": tenant.get("expected_end_date", "2026-10-05"),
            "notice_period": "30 Days Notice Served",
            "wifi_ssid": "UrbanNest-HighSpeed-F2",
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
        "notices": [
            {
                "id": "not-1",
                "title": "Dining & Meal Schedule",
                "body": "Breakfast: 7:30 AM - 9:30 AM | Lunch: 12:30 PM - 2:30 PM | Dinner: 7:45 PM - 10:00 PM.",
                "category": "Food"
            },
            {
                "id": "not-2",
                "title": "Hostel Gate Timings",
                "body": "Main gate closes at 10:30 PM daily. Late entry passes require prior notification via warden portal.",
                "category": "Security"
            },
            {
                "id": "not-3",
                "title": "High-Speed Wi-Fi 6 Upgrade",
                "body": "Floor 1-3 fiber routers upgraded to 300 Mbps symmetrical bandwidth.",
                "category": "Facility"
            }
        ],
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
        tenant = g.current_tenant
        tenant_filters = [
            tenant.get("user_code"),
            tenant.get("email"),
            tenant.get("auth_user_id"),
        ]
        status_filter = request.args.get("status", "ALL")
        search_query = request.args.get("search", "")

        repo = get_payment_repo()
        payments = repo.get_all(
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
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
        tenant_filters = [
            tenant.get("user_code"),
            tenant.get("email"),
            tenant.get("auth_user_id"),
        ]
        repo = get_payment_repo()
        summary = repo.get_tenant_payment_summary(
            tenant_id_filters=tenant_filters,
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
            monthly_rent_fallback=float(tenant.get("monthly_rent") or 8500.0),
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
        tenant = g.current_tenant
        tenant_filters = [
            tenant.get("user_code"),
            tenant.get("email"),
            tenant.get("auth_user_id"),
        ]
        repo = get_payment_repo()
        payment = repo.get_by_id(
            payment_id=payment_id,
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
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
        tenant = g.current_tenant
        tenant_filters = [
            tenant.get("user_code"),
            tenant.get("email"),
            tenant.get("auth_user_id"),
        ]
        repo = get_complaints_repo()
        complaints = repo.get_tenant_complaints(
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
            tenant_id_filters=tenant_filters,
        )
        summary = repo.get_tenant_complaint_summary(
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
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
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
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
        tenant = g.current_tenant
        tenant_filters = [
            tenant.get("user_code"),
            tenant.get("email"),
            tenant.get("auth_user_id"),
        ]
        repo = get_complaints_repo()
        complaint = repo.get_tenant_complaint_by_id(
            complaint_id=complaint_id,
            hostel_id=tenant.get("hostel_id", DEMO_HOSTEL_ID),
            tenant_id_filters=tenant_filters,
        )
        if not complaint:
            return jsonify({"error": "Complaint not found or unauthorized access."}), 404

        return jsonify({"complaint": complaint}), 200
    except Exception as e:
        logger.error(f"Error fetching tenant complaint {complaint_id}: {e}")
        return jsonify({"error": "Unable to retrieve complaint details."}), 500


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
    Returns real enquiry counts and recent enquiries from Supabase `enquiries`,
    along with zero-initialized placeholders for modules not yet built.
    """
    try:
        db = get_db_client()
        owner = g.current_owner

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

        # Top 5 most recent enquiries for dashboard table
        recent_enquiries = parsed_enquiries[:5]

        # Real data-driven alerts (only when real conditions exist)
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

        # Real activity feed derived from actual enquiries
        recent_activity = [
            {
                "id": f"act-{enq['id']}",
                "type": "enquiry",
                "text": f"New enquiry received from {enq['name']}",
                "subtext": f"{enq['preferred_room']} • Move-in: {enq['move_in_date']}",
                "created_at": enq["created_at"],
            }
            for enq in recent_enquiries
        ]

        # Real aggregated payment & rent financial metrics from unified repository
        repo = get_payment_repo()
        payment_metrics = repo.get_hostel_summary(owner["hostel_id"])

        # Real operational metrics for complaints and maintenance
        c_repo = get_complaints_repo()
        ops_metrics = c_repo.get_dashboard_counts(owner["hostel_id"])

        return jsonify({
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
                "total_beds": 0,
                "occupied_beds": 0,
                "available_beds": 0,
                "current_tenants": 0,
            },
            "enquiries": status_counts,
            "financials": {
                "expected_rent": payment_metrics["expected_rent"],
                "collected_rent": payment_metrics["collected_rent"],
                "pending_rent": payment_metrics["pending_rent"],
                "overdue_rent": payment_metrics["overdue_rent"],
                "monthly_expenses": 0,
            },
            "operations": {
                "open_complaints": ops_metrics["open_complaints"],
                "maintenance_attention": ops_metrics["maintenance_attention"],
            },
            "recent_enquiries": recent_enquiries,
            "alerts": alerts,
            "recent_activity": recent_activity,
        }), 200

    except Exception as e:
        logger.error(f"Error loading owner dashboard: {e}")
        return jsonify({"error": "Unable to load dashboard data at this time."}), 500


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
# 6. PUBLIC ENQUIRY SUBMISSION ENDPOINT (POST /api/enquiries)
# ============================================================================

@app.route("/api/enquiries", methods=["POST"])
def create_enquiry():
    """
    Public endpoint to submit a new hostel room enquiry and save it to Supabase.
    """
    try:
        payload = request.get_json(silent=True)
        if not payload:
            return jsonify({"error": "Invalid or empty JSON request body"}), 400

        name = (payload.get("name") or "").strip()
        phone = (payload.get("phone") or "").strip()
        email = (payload.get("email") or "").strip()
        preferred_room = (payload.get("preferred_room") or "").strip()
        move_in_date = (payload.get("move_in_date") or "").strip()
        occupation = (payload.get("occupation") or "").strip()
        message = (payload.get("message") or "").strip()

        if not name:
            return jsonify({"error": "Full Name is required"}), 400
        if not phone:
            return jsonify({"error": "Phone number is required"}), 400

        db = get_db_client()

        full_payload = {
            "name": name,
            "phone": phone,
            "email": email,
            "preferred_room": preferred_room,
            "move_in_date": move_in_date,
            "occupation": occupation,
            "message": message,
        }

        try:
            res = db.table("enquiries").insert(full_payload).execute()
            inserted_record = res.data[0] if res.data else full_payload
            logger.info(f"Enquiry successfully inserted for: {name} (phone: {phone})")
        except Exception as insert_err:
            err_str = str(insert_err)
            if "Could not find the" in err_str or "PGRST204" in err_str:
                details = []
                if email:
                    details.append(f"Email: {email}")
                if preferred_room:
                    details.append(f"Room: {preferred_room}")
                if move_in_date:
                    details.append(f"Move-in: {move_in_date}")
                if occupation:
                    details.append(f"Occupation: {occupation}")
                if message:
                    details.append(f"Notes: {message}")

                fallback_payload = {
                    "name": name,
                    "phone": phone,
                    "message": " | ".join(details) if details else message,
                }
                res = db.table("enquiries").insert(fallback_payload).execute()
                inserted_record = res.data[0] if res.data else fallback_payload
                logger.info(f"Enquiry successfully inserted (fallback) for: {name}")
            else:
                logger.error(f"Supabase insert failed: {err_str}")
                return jsonify({"error": "Failed to save enquiry to database"}), 500

        return jsonify({
            "message": "Enquiry submitted successfully",
            "data": inserted_record,
        }), 201

    except Exception as e:
        logger.error(f"Unexpected error in create_enquiry: {e}")
        return jsonify({"error": "An unexpected server error occurred. Please try again."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
