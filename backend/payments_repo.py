"""
UrbanNest Hostel CRM - Payments Repository & Unified Data Store
Provides persistent, authoritative payment storage, balance calculation,
status computation, and multi-tenant isolation for both Owner CRM and Tenant Portal.
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone, date
from decimal import Decimal

logger = logging.getLogger("payments_repo")

# Baseline date for dynamic due calculation: 2026-09-26
BASE_DATE = date(2026, 9, 26)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
PAYMENTS_FILE = os.path.join(DATA_DIR, "payments.json")

_lock = threading.Lock()


def parse_date_str(d_val) -> date:
    """Safely parse a date string YYYY-MM-DD or return BASE_DATE."""
    if isinstance(d_val, date):
        return d_val
    if not d_val:
        return BASE_DATE
    try:
        # Extract YYYY-MM-DD portion if datetime string
        clean_str = str(d_val).split("T")[0].split(" ")[0].strip()
        parts = [int(p) for p in clean_str.split("-")]
        return date(parts[0], parts[1], parts[2])
    except Exception:
        return BASE_DATE


def compute_payment_status(amount_due, amount_paid, due_date_str, as_of_date: date = None) -> tuple:
    """
    Authoritative server-side payment status and balance determination.
    Rules:
      - balance_amount = max(0.0, amount_due - amount_paid)
      - PAID: fully paid (balance_amount <= 0.0)
      - PARTIAL: some amount paid (amount_paid > 0), but balance remains
      - OVERDUE: unpaid (amount_paid == 0) and due_date < current date
      - DUE_SOON: unpaid (amount_paid == 0) and due_date is within 7 days
      - PENDING: unpaid (amount_paid == 0) and due_date is > 7 days in future
    Returns (status: str, balance_amount: float)
    """
    due_amt = round(float(amount_due or 0.0), 2)
    paid_amt = round(float(amount_paid or 0.0), 2)
    balance = max(0.0, round(due_amt - paid_amt, 2))

    if due_amt > 0 and balance <= 0.0:
        return "PAID", 0.0

    today = as_of_date or BASE_DATE
    d_date = parse_date_str(due_date_str)
    diff_days = (d_date - today).days

    if paid_amt > 0:
        return "PARTIAL", balance

    # If amount_paid == 0
    if diff_days < 0:
        return "OVERDUE", balance
    elif diff_days <= 7:
        return "DUE_SOON", balance
    else:
        return "PENDING", balance


def calculate_timing_label(due_date_str, status: str, as_of_date: date = None) -> dict:
    """Calculate human-readable timing metadata (e.g. '5 days remaining', 'Overdue by 2 days')."""
    today = as_of_date or BASE_DATE
    d_date = parse_date_str(due_date_str)
    diff_days = (d_date - today).days

    if status == "PAID":
        return {
            "label": "Settled & Paid",
            "days_diff": diff_days,
            "is_overdue": False,
            "is_due_soon": False,
            "is_today": False,
        }

    if diff_days < 0:
        overdue_count = abs(diff_days)
        return {
            "label": f"Overdue by {overdue_count} day{'s' if overdue_count != 1 else ''}",
            "days_diff": diff_days,
            "is_overdue": True,
            "is_due_soon": False,
            "is_today": False,
        }

    if diff_days == 0:
        return {
            "label": "Due Today",
            "days_diff": 0,
            "is_overdue": False,
            "is_due_soon": True,
            "is_today": True,
        }

    if diff_days == 1:
        return {
            "label": "Due Tomorrow",
            "days_diff": 1,
            "is_overdue": False,
            "is_due_soon": True,
            "is_today": False,
        }

    if diff_days <= 7:
        return {
            "label": f"{diff_days} days remaining",
            "days_diff": diff_days,
            "is_overdue": False,
            "is_due_soon": True,
            "is_today": False,
        }

    return {
        "label": f"{diff_days} days remaining",
        "days_diff": diff_days,
        "is_overdue": False,
        "is_due_soon": False,
        "is_today": False,
    }


INITIAL_SEED_PAYMENTS = [
    {
        "id": "PAY-8001",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-101",
        "tenant_name": "Rahul Kumar",
        "room_number": "Room 204 (Bed A)",
        "payment_type": "Monthly Rent",
        "amount_due": 8500.0,
        "amount_paid": 0.0,
        "balance_amount": 8500.0,
        "due_date": "2026-09-24",
        "paid_date": None,
        "payment_method": "Pending",
        "reference_number": "",
        "status": "OVERDUE",
        "notes": "September 2026 monthly rent. Tenant notified via WhatsApp.",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-24T00:00:00Z",
    },
    {
        "id": "PAY-8000",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-101",
        "tenant_name": "Rahul Kumar",
        "room_number": "Room 204 (Bed A)",
        "payment_type": "Security Deposit",
        "amount_due": 8500.0,
        "amount_paid": 8500.0,
        "balance_amount": 0.0,
        "due_date": "2026-07-01",
        "paid_date": "2026-07-01",
        "payment_method": "UPI",
        "reference_number": "UPI/7729104812",
        "status": "PAID",
        "notes": "Refundable security deposit held safely until move-out settlement.",
        "created_at": "2026-07-01T00:00:00Z",
        "updated_at": "2026-07-01T00:00:00Z",
    },
    {
        "id": "PAY-8002",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-102",
        "tenant_name": "Priya Reddy",
        "room_number": "Room 302 (Bed A)",
        "payment_type": "Monthly Rent",
        "amount_due": 12000.0,
        "amount_paid": 0.0,
        "balance_amount": 12000.0,
        "due_date": "2026-09-28",
        "paid_date": None,
        "payment_method": "Pending",
        "reference_number": "",
        "status": "DUE_SOON",
        "notes": "Executive single room rent with attached bath.",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-01T00:00:00Z",
    },
    {
        "id": "PAY-8003",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-103",
        "tenant_name": "Arjun Mehta",
        "room_number": "Room 101 (Bed A)",
        "payment_type": "Monthly Rent",
        "amount_due": 7000.0,
        "amount_paid": 0.0,
        "balance_amount": 7000.0,
        "due_date": "2026-09-26",
        "paid_date": None,
        "payment_method": "Pending",
        "reference_number": "",
        "status": "DUE_SOON",
        "notes": "Triple sharing rent due today.",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-01T00:00:00Z",
    },
    {
        "id": "PAY-8004",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-104",
        "tenant_name": "Kavita Nair",
        "room_number": "Room 202 (Bed A)",
        "payment_type": "Security Deposit",
        "amount_due": 8500.0,
        "amount_paid": 8500.0,
        "balance_amount": 0.0,
        "due_date": "2026-09-20",
        "paid_date": "2026-09-20",
        "payment_method": "UPI",
        "reference_number": "UPI/628192837492",
        "status": "PAID",
        "notes": "Initial refundable security deposit paid via Google Pay.",
        "created_at": "2026-09-20T00:00:00Z",
        "updated_at": "2026-09-20T00:00:00Z",
    },
    {
        "id": "PAY-8005",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-105",
        "tenant_name": "Manish Sharma",
        "room_number": "Room 305 (Bed B)",
        "payment_type": "Monthly Rent",
        "amount_due": 5500.0,
        "amount_paid": 0.0,
        "balance_amount": 5500.0,
        "due_date": "2026-09-22",
        "paid_date": None,
        "payment_method": "Pending",
        "reference_number": "",
        "status": "OVERDUE",
        "notes": "Four sharing room rent. Tenant requested grace period.",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-22T00:00:00Z",
    },
    {
        "id": "PAY-8006",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-106",
        "tenant_name": "Sneha Kapoor",
        "room_number": "Room 205 (Bed B)",
        "payment_type": "Monthly Rent",
        "amount_due": 9500.0,
        "amount_paid": 0.0,
        "balance_amount": 9500.0,
        "due_date": "2026-10-05",
        "paid_date": None,
        "payment_method": "Pending",
        "reference_number": "",
        "status": "PENDING",
        "notes": "October month advance rent invoice generated.",
        "created_at": "2026-09-20T00:00:00Z",
        "updated_at": "2026-09-20T00:00:00Z",
    },
    {
        "id": "PAY-8007",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-107",
        "tenant_name": "Rohan Deshmukh",
        "room_number": "Room 104 (Bed C)",
        "payment_type": "Monthly Rent",
        "amount_due": 8500.0,
        "amount_paid": 8500.0,
        "balance_amount": 0.0,
        "due_date": "2026-09-25",
        "paid_date": "2026-09-25",
        "payment_method": "Bank Transfer",
        "reference_number": "IMPS-9812739401",
        "status": "PAID",
        "notes": "Direct bank transfer credited to UrbanNest HDFC account.",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z",
    },
    {
        "id": "PAY-8008",
        "hostel_id": "hstl-urbannest-01",
        "tenant_id": "TEN-108",
        "tenant_name": "Aditya Varma",
        "room_number": "Room 201 (Bed A)",
        "payment_type": "Monthly Rent",
        "amount_due": 8500.0,
        "amount_paid": 8500.0,
        "balance_amount": 0.0,
        "due_date": "2026-09-23",
        "paid_date": "2026-09-23",
        "payment_method": "UPI",
        "reference_number": "UPI/983719284721",
        "status": "PAID",
        "notes": "Rent settled via PhonePe.",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-23T00:00:00Z",
    },
]


class PaymentRepository:
    """Authoritative Payments Data Repository for UrbanNest PG & Hostel."""

    def __init__(self, db_client=None):
        self.db = db_client
        os.makedirs(DATA_DIR, exist_ok=True)
        self._ensure_storage()

    def _ensure_storage(self):
        with _lock:
            if not os.path.exists(PAYMENTS_FILE):
                with open(PAYMENTS_FILE, "w", encoding="utf-8") as f:
                    json.dump(INITIAL_SEED_PAYMENTS, f, indent=2)
                logger.info(f"Initialized payments database with {len(INITIAL_SEED_PAYMENTS)} seed records.")

    def _read_records(self) -> list:
        # 1. Try reading from Supabase PostgreSQL if table exists
        if self.db:
            try:
                res = self.db.table("payments").select("*").execute()
                if res.data is not None and len(res.data) > 0:
                    return res.data
            except Exception as e:
                err_str = str(e)
                if "PGRST205" not in err_str and "Could not find the table" not in err_str:
                    logger.debug(f"Supabase payments table read: {err_str}")

        # 2. Fall back to persistent JSON storage
        with _lock:
            try:
                with open(PAYMENTS_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading {PAYMENTS_FILE}: {e}")
                return list(INITIAL_SEED_PAYMENTS)

    def _write_records(self, records: list):
        with _lock:
            try:
                temp_file = PAYMENTS_FILE + ".tmp"
                with open(temp_file, "w", encoding="utf-8") as f:
                    json.dump(records, f, indent=2)
                os.replace(temp_file, PAYMENTS_FILE)
            except Exception as e:
                logger.error(f"Error writing {PAYMENTS_FILE}: {e}")

    def _try_sync_supabase(self, record: dict):
        if not self.db:
            return
        try:
            self.db.table("payments").upsert(record).execute()
        except Exception:
            # Table not created in Supabase yet, local file persistence is authoritative
            pass

    def get_all(self, hostel_id: str, tenant_id_filters: list = None, status_filter: str = None, search_query: str = None) -> list:
        """
        List payment records.
        If tenant_id_filters provided, strictly filters to match any identifier in the list
        (e.g. ['TEN-101', 'rahul.kumar@gmail.com', 'uuid']).
        """
        records = self._read_records()
        results = []

        # Clean filter tokens if any
        clean_tenant_filters = [str(t).strip().lower() for t in (tenant_id_filters or []) if t]

        for r in records:
            if hostel_id and r.get("hostel_id") != hostel_id:
                continue

            # Strict Tenant Isolation Check
            if clean_tenant_filters:
                r_tid = str(r.get("tenant_id") or "").strip().lower()
                r_tname = str(r.get("tenant_name") or "").strip().lower()
                if not any(f in r_tid or f in r_tname for f in clean_tenant_filters):
                    continue

            # Status Filter
            status = r.get("status", "PENDING")
            if status_filter and status_filter.upper() != "ALL":
                target = status_filter.upper()
                if target == "PAID" and status != "PAID":
                    continue
                elif target == "PENDING" and status not in ("PENDING", "DUE_SOON"):
                    continue
                elif target == "OVERDUE" and status != "OVERDUE":
                    continue
                elif target == "PARTIAL" and status != "PARTIAL":
                    continue
                elif target == "DUE_SOON" and status != "DUE_SOON":
                    continue

            # Search Query
            if search_query:
                q = search_query.strip().lower()
                haystack = " ".join([
                    str(r.get("id", "")),
                    str(r.get("tenant_name", "")),
                    str(r.get("room_number", "")),
                    str(r.get("payment_type", "")),
                    str(r.get("reference_number", "")),
                    str(r.get("notes", "")),
                ]).lower()
                if q not in haystack:
                    continue

            # Decorate with dynamic timing details
            item = dict(r)
            item["timing"] = calculate_timing_label(item.get("due_date"), item.get("status"))
            results.append(item)

        # Sort: Outstanding dues first, then newest due_date first
        def sort_key(p):
            is_pending = 0 if p.get("status") in ("OVERDUE", "DUE_SOON", "PARTIAL", "PENDING") else 1
            due = str(p.get("due_date", "1970-01-01"))
            return (is_pending, due)

        results.sort(key=sort_key)
        return results

    def get_by_id(self, payment_id: str, hostel_id: str = None, tenant_id_filters: list = None) -> dict:
        """Find a single payment with ownership verification."""
        clean_tenant_filters = [str(t).strip().lower() for t in (tenant_id_filters or []) if t]
        records = self._read_records()
        for r in records:
            if r.get("id") == payment_id:
                if hostel_id and r.get("hostel_id") != hostel_id:
                    return None
                if clean_tenant_filters:
                    r_tid = str(r.get("tenant_id") or "").strip().lower()
                    r_tname = str(r.get("tenant_name") or "").strip().lower()
                    if not any(f in r_tid or f in r_tname for f in clean_tenant_filters):
                        return None
                item = dict(r)
                item["timing"] = calculate_timing_label(item.get("due_date"), item.get("status"))
                return item
        return None

    def create_or_update(self, data: dict, hostel_id: str) -> dict:
        """
        Record a payment or charge with authoritative server-side calculation.
        Calculates:
          balance_amount = amount_due - amount_paid
          status = PAID | PARTIAL | OVERDUE | DUE_SOON | PENDING
        """
        records = self._read_records()
        now_iso = datetime.now(timezone.utc).isoformat()

        payment_id = data.get("payment_id") or data.get("id")
        tenant_id = str(data.get("tenant_id") or "").strip()
        tenant_name = str(data.get("tenant_name") or "Resident").strip()
        room_number = str(data.get("room_number") or data.get("room") or "Room 101").strip()
        payment_type = str(data.get("payment_type") or data.get("type") or "Monthly Rent").strip()
        amount_due = round(float(data.get("amount_due") or data.get("amount") or 0.0), 2)
        amount_paid = round(float(data.get("amount_paid") or 0.0), 2)
        due_date = str(data.get("due_date") or data.get("dueDate") or "2026-10-05").strip()
        paid_date = data.get("paid_date") or data.get("paidDate")
        payment_method = str(data.get("payment_method") or "Pending").strip()
        reference_number = str(data.get("reference_number") or data.get("reference") or "").strip()
        notes = str(data.get("notes") or "").strip()

        # If payment_id not provided, check if matching open/pending charge exists for this tenant & type
        existing_idx = None
        if payment_id:
            for idx, r in enumerate(records):
                if r.get("id") == payment_id:
                    existing_idx = idx
                    break
        else:
            # Find an existing unpaid or partial payment of this type for this tenant
            clean_tid = tenant_id.lower()
            clean_tname = tenant_name.lower()
            for idx, r in enumerate(records):
                r_tid = str(r.get("tenant_id", "")).lower()
                r_tname = str(r.get("tenant_name", "")).lower()
                r_type = str(r.get("payment_type", "")).lower()
                if (clean_tid in r_tid or clean_tname in r_tname) and r_type == payment_type.lower():
                    if r.get("status") in ("OVERDUE", "DUE_SOON", "PARTIAL", "PENDING"):
                        existing_idx = idx
                        payment_id = r.get("id")
                        break

        # Compute status and balance
        status, balance = compute_payment_status(amount_due, amount_paid, due_date)

        if existing_idx is not None:
            # Update existing record
            rec = records[existing_idx]
            rec["amount_due"] = amount_due
            rec["amount_paid"] = amount_paid
            rec["balance_amount"] = balance
            rec["due_date"] = due_date
            rec["paid_date"] = paid_date if amount_paid > 0 else rec.get("paid_date")
            rec["payment_method"] = payment_method if amount_paid > 0 else rec.get("payment_method", "Pending")
            rec["reference_number"] = reference_number or rec.get("reference_number", "")
            rec["status"] = status
            if notes:
                rec["notes"] = notes
            rec["updated_at"] = now_iso
            saved_record = rec
        else:
            # Create new payment record
            new_id = payment_id or f"PAY-{round(datetime.now().timestamp() * 1000) % 90000 + 10000}"
            saved_record = {
                "id": new_id,
                "hostel_id": hostel_id,
                "tenant_id": tenant_id,
                "tenant_name": tenant_name,
                "room_number": room_number,
                "payment_type": payment_type,
                "amount_due": amount_due,
                "amount_paid": amount_paid,
                "balance_amount": balance,
                "due_date": due_date,
                "paid_date": paid_date,
                "payment_method": payment_method,
                "reference_number": reference_number,
                "status": status,
                "notes": notes,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            records.insert(0, saved_record)

        self._write_records(records)
        self._try_sync_supabase(saved_record)

        logger.info(f"Payment saved: {saved_record['id']} | Tenant: {tenant_name} ({tenant_id}) | Due: {amount_due} | Paid: {amount_paid} | Balance: {balance} | Status: {status}")
        result = dict(saved_record)
        result["timing"] = calculate_timing_label(result.get("due_date"), result.get("status"))
        return result

    def get_tenant_payment_summary(self, tenant_id_filters: list, hostel_id: str, monthly_rent_fallback: float = 8500.0) -> dict:
        """
        Derive the comprehensive, isolated financial summary for a logged-in tenant.
        Returns:
          monthly_rent, next_due_date, outstanding_amount, payment_status,
          security_deposit, current_due, other_charges
        """
        payments = self.get_all(hostel_id, tenant_id_filters=tenant_id_filters)

        total_outstanding = 0.0
        rent_records = []
        deposit_record = None
        other_charges = []

        for p in payments:
            ptype = p.get("payment_type", "").lower()
            bal = float(p.get("balance_amount") or 0.0)
            status = p.get("status", "PENDING")

            if "deposit" in ptype:
                deposit_record = p
            elif "rent" in ptype:
                rent_records.append(p)
                if bal > 0:
                    total_outstanding += bal
            else:
                if bal > 0:
                    total_outstanding += bal
                    other_charges.append({
                        "id": p.get("id"),
                        "charge_type": p.get("payment_type"),
                        "amount_due": float(p.get("amount_due") or 0.0),
                        "amount_paid": float(p.get("amount_paid") or 0.0),
                        "balance": bal,
                        "due_date": p.get("due_date"),
                        "status": status,
                        "timing": p.get("timing"),
                    })

        # Determine prominent current due (active rent due or most urgent pending charge)
        current_due = None
        unpaid_rent = [r for r in rent_records if float(r.get("balance_amount") or 0.0) > 0]
        if unpaid_rent:
            primary_rent = unpaid_rent[0]
            current_due = {
                "id": primary_rent.get("id"),
                "charge_type": primary_rent.get("payment_type", "Monthly Rent"),
                "amount_due": float(primary_rent.get("amount_due") or 0.0),
                "amount_paid": float(primary_rent.get("amount_paid") or 0.0),
                "balance": float(primary_rent.get("balance_amount") or 0.0),
                "due_date": primary_rent.get("due_date"),
                "status": primary_rent.get("status"),
                "timing": primary_rent.get("timing"),
                "reference_number": primary_rent.get("reference_number", ""),
                "notes": primary_rent.get("notes", ""),
            }
        elif other_charges:
            first_other = other_charges[0]
            current_due = first_other

        # High-level payment status for tenant badge
        if total_outstanding <= 0.001:
            overall_status = "PAID"
        elif any(p.get("status") == "OVERDUE" for p in payments if float(p.get("balance_amount") or 0.0) > 0):
            overall_status = "OVERDUE"
        elif any(p.get("status") == "PARTIAL" for p in payments if float(p.get("balance_amount") or 0.0) > 0):
            overall_status = "PARTIAL"
        elif any(p.get("status") == "DUE_SOON" for p in payments if float(p.get("balance_amount") or 0.0) > 0):
            overall_status = "DUE_SOON"
        else:
            overall_status = "PENDING"

        # Monthly rent figure
        monthly_rent = monthly_rent_fallback
        if rent_records:
            monthly_rent = float(rent_records[0].get("amount_due") or monthly_rent_fallback)

        # Next due date
        next_due_date = "2026-10-05"
        if current_due:
            next_due_date = current_due.get("due_date")
        elif rent_records:
            next_due_date = rent_records[0].get("due_date", "2026-10-05")

        # Security deposit summary card
        deposit_data = {
            "amount": float(deposit_record.get("amount_due") or 8500.0) if deposit_record else 8500.0,
            "status": deposit_record.get("status", "PAID") if deposit_record else "PAID",
            "paid_date": deposit_record.get("paid_date", "2026-07-01") if deposit_record else "2026-07-01",
            "reference": deposit_record.get("reference_number", "UPI/7729104812") if deposit_record else "UPI/7729104812",
        }

        return {
            "monthly_rent": monthly_rent,
            "next_due_date": next_due_date,
            "outstanding_amount": round(total_outstanding, 2),
            "payment_status": overall_status,
            "security_deposit": deposit_data,
            "current_due": current_due,
            "other_charges": other_charges,
        }

    def get_hostel_summary(self, hostel_id: str) -> dict:
        """Calculate aggregated financial metrics for Owner Dashboard."""
        records = self.get_all(hostel_id)
        total_collected = 0.0
        total_pending = 0.0
        total_overdue = 0.0
        total_expected = 0.0

        for r in records:
            due = float(r.get("amount_due") or 0.0)
            paid = float(r.get("amount_paid") or 0.0)
            bal = float(r.get("balance_amount") or 0.0)
            status = r.get("status", "PENDING")

            total_expected += due
            total_collected += paid

            if status == "OVERDUE":
                total_overdue += bal
            elif status in ("PENDING", "DUE_SOON", "PARTIAL"):
                total_pending += bal

        return {
            "expected_rent": round(total_expected, 2),
            "collected_rent": round(total_collected, 2),
            "pending_rent": round(total_pending, 2),
            "overdue_rent": round(total_overdue, 2),
            "total_records": len(records),
        }
