import os
import logging
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

import re

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


# Verify startup configuration
try:
    _startup_client = get_db_client()
    logger.info("Supabase client initialized successfully.")
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
            hostel_id = row.get("hostel_id")
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

            return {
                "auth_user_id": auth_user_id,
                "email": email,
                "user_code": row.get("user_code") or combined_meta.get("user_code", "OWN-001"),
                "full_name": row.get("full_name") or combined_meta.get("full_name", "Hostel Owner"),
                "phone": row.get("phone") or combined_meta.get("phone", ""),
                "role": (row.get("role") or "").upper(),
                "hostel_id": hostel_id,
                "hostel_name": hostel_name,
                "hostel_location": hostel_location,
                "is_active": bool(row.get("is_active", True)),
                "onboarding_completed": bool(row.get("onboarding_completed", False)),
            }
    except Exception as db_err:
        err_str = str(db_err)
        if "PGRST205" not in err_str and "Could not find the table" not in err_str:
            logger.warning(f"Profile table lookup warning: {err_str}")

    # 2. Fallback to verified Supabase Auth metadata (set via Supabase Admin API)
    if not combined_meta.get("role"):
        return None

    return {
        "auth_user_id": auth_user_id,
        "email": email,
        "user_code": combined_meta.get("user_code", "OWN-001"),
        "full_name": combined_meta.get("full_name", "Rajesh Kumar"),
        "phone": combined_meta.get("phone", ""),
        "role": str(combined_meta.get("role", "")).upper(),
        "hostel_id": combined_meta.get("hostel_id"),
        "hostel_name": combined_meta.get("hostel_name", DEMO_HOSTEL_NAME),
        "hostel_location": combined_meta.get("city", DEMO_HOSTEL_LOCATION),
        "is_active": bool(combined_meta.get("is_active", True)),
        "onboarding_completed": bool(combined_meta.get("onboarding_completed", True)),
    }


def verify_owner_authorization(profile: dict):
    """
    Verify all 5 mandatory checks for Owner CRM access:
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
                "role": profile["role"],
                "hostel_id": profile["hostel_id"],
                "hostel_name": profile["hostel_name"],
                "hostel_location": profile["hostel_location"],
            }
        }), 200

    except Exception as e:
        logger.warning(f"Session check failed: {e}")
        return jsonify({"authenticated": False}), 401


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    """
    Clear the session cookie and log the owner out.
    """
    response = make_response(
        jsonify({"message": "Logged out successfully", "authenticated": False}),
        200,
    )
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


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
                "expected_rent": 0,
                "collected_rent": 0,
                "pending_rent": 0,
                "overdue_rent": 0,
                "monthly_expenses": 0,
            },
            "recent_enquiries": recent_enquiries,
            "alerts": alerts,
            "recent_activity": recent_activity,
        }), 200

    except Exception as e:
        logger.error(f"Error loading owner dashboard: {e}")
        return jsonify({"error": "Unable to load dashboard data at this time."}), 500


# ============================================================================
# 4. PUBLIC ENQUIRY SUBMISSION ENDPOINT (POST /api/enquiries)
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
