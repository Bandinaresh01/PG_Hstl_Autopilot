"""
UrbanNest Hostel CRM - Payments Repository & Supabase Data Store
Provides persistent, authoritative payment storage, balance calculation,
status computation, and multi-tenant isolation for both Owner CRM and Tenant Portal.
"""

import logging
import uuid
from datetime import datetime, timezone, date
from decimal import Decimal

logger = logging.getLogger("payments_repo")


def compute_payment_status(amount_due: float, amount_paid: float, due_date_str: str) -> tuple:
    """
    Authoritative server-side payment status and balance determination.
    Rules:
      - balance_amount = max(0.0, amount_due - amount_paid)
      - PAID: fully paid (balance_amount <= 0.0)
      - PARTIAL: some amount paid (amount_paid > 0), but balance remains
      - OVERDUE: balance remains and due_date < current date
      - PENDING: balance remains and due_date >= current date
    """
    due = float(amount_due or 0.0)
    paid = float(amount_paid or 0.0)
    balance = max(0.0, round(due - paid, 2))

    if balance <= 0.0:
        return "PAID", 0.0

    today = date.today()
    is_past_due = False
    if due_date_str:
        try:
            d_date = datetime.strptime(str(due_date_str).split("T")[0], "%Y-%m-%d").date()
            if d_date < today:
                is_past_due = True
        except Exception:
            pass

    if is_past_due:
        return "OVERDUE", balance
    if paid > 0:
        return "PARTIAL", balance
    return "PENDING", balance


class PaymentRepository:
    def __init__(self, db_client=None):
        self.db = db_client

    def get_all(
        self,
        hostel_id: str,
        tenant_id_filters: list = None,
        status_filter: str = None,
        search_query: str = None,
    ) -> list:
        """
        List payment records directly from Supabase public.payments.
        Strictly scopes by hostel_id and optional tenant_id_filters.
        """
        if not self.db:
            return []

        try:
            query = self.db.table("payments").select("*").eq("hostel_id", hostel_id)

            if tenant_id_filters and len(tenant_id_filters) > 0:
                # If single tenant filter, use .eq
                if len(tenant_id_filters) == 1:
                    query = query.eq("tenant_id", tenant_id_filters[0])
                else:
                    query = query.in_("tenant_id", tenant_id_filters)

            if status_filter and status_filter.upper() != "ALL":
                query = query.eq("status", status_filter.upper())

            res = query.order("due_date", desc=True).execute()
            records = res.data or []

            # Fetch tenant metadata to enrich payments with tenant_name and room_number
            t_res = self.db.table("tenants").select("id, tenant_code, full_name, room_id").eq("hostel_id", hostel_id).execute()
            tenant_map = {str(t["id"]): t for t in (t_res.data or [])}

            r_res = self.db.table("rooms").select("id, room_number").eq("hostel_id", hostel_id).execute()
            room_map = {str(r["id"]): r.get("room_number") for r in (r_res.data or [])}

            enriched = []
            for p in records:
                p_copy = dict(p)
                t_obj = tenant_map.get(str(p_copy.get("tenant_id")))
                if t_obj:
                    p_copy["tenant_name"] = t_obj.get("full_name") or "-"
                    p_copy["tenant_code"] = t_obj.get("tenant_code") or "-"
                    r_id = str(t_obj.get("room_id")) if t_obj.get("room_id") else None
                    p_copy["room_number"] = room_map.get(r_id, "-")
                else:
                    p_copy["tenant_name"] = p_copy.get("tenant_name") or "Resident"
                    p_copy["room_number"] = p_copy.get("room_number") or "-"

                # Compute balance and real-time status
                status, balance = compute_payment_status(
                    p_copy.get("amount_due"),
                    p_copy.get("amount_paid"),
                    p_copy.get("due_date"),
                )
                p_copy["balance_amount"] = balance
                p_copy["status"] = status

                # Search filter
                if search_query:
                    sq = search_query.lower().strip()
                    name = str(p_copy.get("tenant_name", "")).lower()
                    inv = str(p_copy.get("reference_number", "")).lower()
                    code = str(p_copy.get("tenant_code", "")).lower()
                    ptype = str(p_copy.get("payment_type", "")).lower()
                    if sq not in name and sq not in inv and sq not in code and sq not in ptype:
                        continue

                enriched.append(p_copy)

            return enriched

        except Exception as e:
            logger.error(f"Error fetching payments from Supabase: {e}")
            return []

    def get_by_id(self, payment_id: str, hostel_id: str = None) -> dict:
        """
        Get a single payment record by UUID or reference number.
        """
        if not self.db:
            return None

        try:
            query = self.db.table("payments").select("*")
            if hostel_id:
                query = query.eq("hostel_id", hostel_id)

            res = query.eq("id", payment_id).execute()
            if res.data and len(res.data) > 0:
                p = res.data[0]
                status, balance = compute_payment_status(p.get("amount_due"), p.get("amount_paid"), p.get("due_date"))
                p["balance_amount"] = balance
                p["status"] = status
                return p

            # Try by reference_number
            res_ref = query.eq("reference_number", payment_id).execute()
            if res_ref.data and len(res_ref.data) > 0:
                p = res_ref.data[0]
                status, balance = compute_payment_status(p.get("amount_due"), p.get("amount_paid"), p.get("due_date"))
                p["balance_amount"] = balance
                p["status"] = status
                return p

            return None
        except Exception as e:
            logger.error(f"Error fetching payment {payment_id}: {e}")
            return None

    def create_or_update(self, record: dict, hostel_id: str) -> dict:
        """
        Record or update a payment transaction in Supabase public.payments.
        """
        if not self.db:
            raise RuntimeError("Database client not available")

        amount_due = float(record.get("amount_due") or record.get("amount") or 0.0)
        amount_paid = float(record.get("amount_paid") or 0.0)
        due_date = record.get("due_date") or date.today().isoformat()
        status, balance = compute_payment_status(amount_due, amount_paid, due_date)

        reference_number = record.get("reference_number") or f"INV-{uuid.uuid4().hex[:6].upper()}"

        payment_payload = {
            "hostel_id": hostel_id,
            "tenant_id": record.get("tenant_id"),
            "booking_id": record.get("booking_id") or None,
            "payment_type": record.get("payment_type") or "MONTHLY_RENT",
            "amount_due": amount_due,
            "amount_paid": amount_paid,
            "balance_amount": balance,
            "due_date": due_date,
            "paid_date": record.get("paid_date") or (date.today().isoformat() if amount_paid > 0 else None),
            "payment_method": record.get("payment_method") or "UPI",
            "reference_number": reference_number,
            "status": status,
            "notes": record.get("notes") or None,
        }

        # Check if updating existing record
        payment_id = record.get("id")
        if payment_id:
            res = (
                self.db.table("payments")
                .update(payment_payload)
                .eq("id", payment_id)
                .eq("hostel_id", hostel_id)
                .execute()
            )
        else:
            res = self.db.table("payments").insert(payment_payload).execute()

        if not res.data or len(res.data) == 0:
            raise RuntimeError("Failed to save payment record in Supabase")

        return res.data[0]

    def get_tenant_summary(self, tenant_id: str, hostel_id: str = None) -> dict:
        """
        Calculate total due, total paid, and outstanding balance for a specific tenant.
        """
        payments = self.get_all(hostel_id=hostel_id, tenant_id_filters=[tenant_id])
        total_due = sum(float(p.get("amount_due", 0.0)) for p in payments)
        total_paid = sum(float(p.get("amount_paid", 0.0)) for p in payments)
        outstanding = max(0.0, round(total_due - total_paid, 2))

        overdue_amount = sum(
            float(p.get("balance_amount", 0.0))
            for p in payments
            if p.get("status") == "OVERDUE"
        )

        return {
            "total_due": total_due,
            "total_paid": total_paid,
            "outstanding_balance": outstanding,
            "overdue_amount": overdue_amount,
            "payment_count": len(payments),
        }

    def get_hostel_summary(self, hostel_id: str) -> dict:
        """
        Calculate aggregate payment metrics for owner dashboard.
        """
        payments = self.get_all(hostel_id=hostel_id)
        if not payments:
            return {
                "expected_rent": 0.0,
                "collected_rent": 0.0,
                "pending_rent": 0.0,
                "overdue_rent": 0.0,
                "total_due": 0.0,
                "total_collected": 0.0,
                "total_pending": 0.0,
                "total_overdue": 0.0,
            }

        total_due = sum(float(p.get("amount_due", 0.0)) for p in payments)
        collected = sum(float(p.get("amount_paid", 0.0)) for p in payments)
        pending = sum(
            float(p.get("balance_amount", 0.0))
            for p in payments
            if p.get("status") in ("PENDING", "PARTIAL")
        )
        overdue = sum(
            float(p.get("balance_amount", 0.0))
            for p in payments
            if p.get("status") == "OVERDUE"
        )

        return {
            "expected_rent": total_due,
            "collected_rent": collected,
            "pending_rent": pending,
            "overdue_rent": overdue,
            "total_due": total_due,
            "total_collected": collected,
            "total_pending": pending,
            "total_overdue": overdue,
        }

    def get_tenant_payment_summary(self, tenant_id_filters: list, hostel_id: str, monthly_rent_fallback: float = 8500.0) -> dict:
        """
        Calculate detailed payment summary for tenant dashboard cards.
        """
        payments = self.get_all(hostel_id=hostel_id, tenant_id_filters=tenant_id_filters)
        total_due = sum(float(p.get("amount_due", 0.0)) for p in payments)
        total_paid = sum(float(p.get("amount_paid", 0.0)) for p in payments)
        outstanding = max(0.0, round(total_due - total_paid, 2))

        # Check deposit payment
        deposit_payments = [p for p in payments if p.get("payment_type") == "SECURITY_DEPOSIT"]
        deposit_amount = deposit_payments[0]["amount_due"] if deposit_payments else monthly_rent_fallback
        deposit_paid = (
            deposit_payments[0].get("status") == "PAID"
            if deposit_payments
            else False
        )

        overdue_payments = [p for p in payments if p.get("status") == "OVERDUE"]
        pending_payments = [p for p in payments if p.get("status") in ("PENDING", "PARTIAL")]

        next_due_date = "2026-10-05"
        if pending_payments:
            next_due_date = pending_payments[0].get("due_date") or next_due_date
        elif overdue_payments:
            next_due_date = overdue_payments[0].get("due_date") or next_due_date

        payment_status = "PAID"
        if overdue_payments:
            payment_status = "OVERDUE"
        elif pending_payments:
            payment_status = "PENDING"

        return {
            "monthly_rent": monthly_rent_fallback,
            "security_deposit": {
                "amount": deposit_amount,
                "status": "PAID" if deposit_paid else "PENDING",
            },
            "next_due_date": next_due_date,
            "outstanding_amount": outstanding,
            "payment_status": payment_status,
            "current_due": outstanding,
        }

