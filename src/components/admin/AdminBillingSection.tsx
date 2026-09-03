import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  adminGetBillingOverview,
  adminGetPayments,
  adminGetPaymentDetail,
} from "@/lib/payments/payments";
import { adminGetSubscriptions } from "@/lib/payments/subscriptions";
import { adminRequestRefund } from "@/lib/payments/refunds";
import { adminGetReconciliation, type ReconciliationReport } from "@/lib/payments/reconciliation";
import type {
  AdminBillingOverviewData,
  AdminPaymentRow,
  AdminSubscriptionRow,
  PaymentDetailData,
  PaymentRefundRecord,
} from "@/lib/payments/types";
import {
  Receipt,
  CreditCard,
  DollarSign,
  Users,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  RotateCcw,
  Loader2,
  ExternalLink,
  ChevronRight,
  Tag,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminBillingSection() {
  const { t, lang, dir } = useTranslation();

  const [subTab, setSubTab] = useState<
    "overview" | "payments" | "subscriptions" | "reconciliation"
  >("overview");

  // Overview State
  const [overview, setOverview] = useState<AdminBillingOverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Payments State
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentPurposeFilter, setPaymentPurposeFilter] = useState("all");

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("all");

  // Reconciliation State
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [loadingReconciliation, setLoadingReconciliation] = useState(false);

  // Detail & Refund Modals
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [refundModal, setRefundModal] = useState<{
    paymentId: string;
    maxMinor: number;
    amountSar: string;
    reason: string;
    adminNote: string;
    submitting: boolean;
  } | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    const { data } = await adminGetBillingOverview();
    if (data) setOverview(data);
    setLoadingOverview(false);
  }, []);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    const { data } = await adminGetPayments(
      paymentSearch,
      paymentStatusFilter,
      paymentPurposeFilter,
    );
    setPayments(data);
    setLoadingPayments(false);
  }, [paymentSearch, paymentStatusFilter, paymentPurposeFilter]);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    const { data } = await adminGetSubscriptions(subSearch, subStatusFilter);
    setSubscriptions(data);
    setLoadingSubscriptions(false);
  }, [subSearch, subStatusFilter]);

  const loadReconciliation = useCallback(async () => {
    setLoadingReconciliation(true);
    const { data } = await adminGetReconciliation();
    if (data) setReconciliation(data);
    setLoadingReconciliation(false);
  }, []);

  useEffect(() => {
    if (subTab === "overview") void loadOverview();
    if (subTab === "payments") void loadPayments();
    if (subTab === "subscriptions") void loadSubscriptions();
    if (subTab === "reconciliation") void loadReconciliation();
  }, [subTab, loadOverview, loadPayments, loadSubscriptions, loadReconciliation]);

  const handleOpenPaymentDetail = async (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setLoadingDetail(true);
    const { data } = await adminGetPaymentDetail(paymentId);
    setPaymentDetail(data);
    setLoadingDetail(false);
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModal) return;

    const amountNum = parseFloat(refundModal.amountSar);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error(lang === "ar" ? "يرجى إدخال مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    const amountMinor = Math.round(amountNum * 100);
    if (amountMinor > refundModal.maxMinor) {
      toast.error(
        lang === "ar"
          ? `المبلغ يتجاوز الرصيد المتاح (${refundModal.maxMinor / 100} ر.س)`
          : `Amount exceeds available refundable balance (${refundModal.maxMinor / 100} SAR)`,
      );
      return;
    }

    setRefundModal((prev) => (prev ? { ...prev, submitting: true } : null));

    const { data, error } = await adminRequestRefund({
      paymentId: refundModal.paymentId,
      amountMinor,
      reason: refundModal.reason,
      adminNote: refundModal.adminNote,
    });

    if (error || !data) {
      toast.error(error || "Failed to submit refund request");
      setRefundModal((prev) => (prev ? { ...prev, submitting: false } : null));
      return;
    }

    toast.success(t("adminRefundSuccess"));
    setRefundModal(null);
    if (selectedPaymentId) {
      void handleOpenPaymentDetail(selectedPaymentId);
    }
    void loadOverview();
    void loadPayments();
  };

  return (
    <div className="space-y-6" dir={dir}>
      {/* Subtabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: "overview", label: t("adminBillingOverview"), icon: Receipt },
          { id: "payments", label: t("adminPaymentsQueue"), icon: DollarSign },
          { id: "subscriptions", label: t("adminSubscriptionsQueue"), icon: Crown },
          { id: "reconciliation", label: t("adminReconciliationQueue"), icon: ShieldCheck },
        ].map((tItem) => {
          const Icon = tItem.icon;
          const isSelected = subTab === tItem.id;
          return (
            <button
              key={tItem.id}
              type="button"
              onClick={() =>
                setSubTab(tItem.id as "overview" | "payments" | "subscriptions" | "reconciliation")
              }
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW SUBTAB */}
      {subTab === "overview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{t("adminBillingOverview")}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOverview}
              disabled={loadingOverview}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingOverview ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("adminPaidRevenue")}
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-primary">
                {((overview?.paid_revenue_minor || 0) / 100).toFixed(2)} SAR
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ar"
                  ? "الإيرادات المحصلة فعلياً (0 ر.س إذا لم تتم عمليات مدفوعة)"
                  : "Collected revenue (0 SAR when no paid transactions exist)"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("adminTotalPayments")}
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                {overview?.total_payments || 0}
              </div>
              <div className="text-[11px] text-muted-foreground flex gap-2 font-mono">
                <span className="text-emerald-500">{overview?.paid_payments || 0} paid</span>
                <span>·</span>
                <span className="text-amber-500">{overview?.pending_payments || 0} pending</span>
                <span>·</span>
                <span className="text-red-400">{overview?.failed_payments || 0} failed</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("adminActiveSubscriptions")}
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-500">
                {overview?.active_subscriptions || 0}
              </div>
              <div className="text-[11px] text-muted-foreground flex gap-2 font-mono">
                <span className="text-purple-400">
                  {overview?.trialing_subscriptions || 0} trialing
                </span>
                <span>·</span>
                <span className="text-amber-500">
                  {overview?.past_due_subscriptions || 0} past-due
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("adminReconciliationAlerts")}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono ${
                  (overview?.reconciliation_issues || 0) > 0 ? "text-amber-500" : "text-emerald-500"
                }`}
              >
                {overview?.reconciliation_issues || 0}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {(overview?.reconciliation_issues || 0) === 0
                  ? t("adminReconciliationHealthy")
                  : "Attention needed on order/payment synchronization"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. PAYMENTS QUEUE SUBTAB */}
      {subTab === "payments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadPayments()}
                placeholder="Search payment ID, order #, or customer..."
                className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-4 rtl:pl-4 rtl:pr-9 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="created">Created / Pending</option>
                <option value="failed">Failed</option>
                <option value="partially_refunded">Partially Refunded</option>
                <option value="refunded">Refunded</option>
              </select>

              <select
                value={paymentPurposeFilter}
                onChange={(e) => setPaymentPurposeFilter(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none"
              >
                <option value="all">All Purposes</option>
                <option value="pro_nfc_bundle">Pro + NFC Bundle</option>
                <option value="subscription_initial">Subscription Initial</option>
                <option value="physical_card_order">Physical Card Order</option>
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={loadPayments}
                disabled={loadingPayments}
                className="h-9 text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingPayments ? "animate-spin" : ""}`} />
                <span>Search</span>
              </Button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="border-b border-border bg-muted/60 text-[10px] font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">{t("adminPaymentDate")}</th>
                    <th className="px-4 py-3">{t("adminPaymentCustomer")}</th>
                    <th className="px-4 py-3">{t("adminPaymentPurpose")}</th>
                    <th className="px-4 py-3">{t("adminPaymentAmount")}</th>
                    <th className="px-4 py-3">{t("adminPaymentStatus")}</th>
                    <th className="px-4 py-3">{t("adminOrderNumber")}</th>
                    <th className="px-4 py-3 text-right rtl:text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingPayments ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading payments ledger...</span>
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No payments found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                          <div className="text-[10px] font-mono text-muted-foreground/60">
                            {p.id.slice(0, 8)}…
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{p.customer_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.customer_email}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {p.purpose === "pro_nfc_bundle"
                            ? "Pro + NFC Bundle"
                            : p.purpose === "subscription_initial"
                              ? "Pro Annual Subscription"
                              : p.purpose === "physical_card_order"
                                ? "JustTap NFC Card"
                                : p.purpose}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {(p.amount_minor / 100).toFixed(2)} {p.currency}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === "paid"
                                ? "bg-emerald-500/20 text-emerald-600"
                                : p.status === "refunded" || p.status === "partially_refunded"
                                  ? "bg-purple-500/20 text-purple-600"
                                  : p.status === "failed"
                                    ? "bg-red-500/20 text-red-600"
                                    : "bg-amber-500/20 text-amber-600"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {p.order_number || "—"}
                        </td>
                        <td className="px-4 py-3 text-right rtl:text-left">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPaymentDetail(p.id)}
                            className="text-xs h-7 px-2.5 text-primary hover:text-primary/80"
                          >
                            <span>Details</span>
                            <ChevronRight className="h-3 w-3 ml-1 rtl:rotate-180" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBSCRIPTIONS QUEUE SUBTAB */}
      {subTab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadSubscriptions()}
                placeholder="Search subscription ID or customer..."
                className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-4 rtl:pl-4 rtl:pr-9 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none"
              >
                <option value="all">All Subscriptions</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="pending">Pending</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={loadSubscriptions}
                disabled={loadingSubscriptions}
                className="h-9 text-xs gap-1.5"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingSubscriptions ? "animate-spin" : ""}`}
                />
                <span>Filter</span>
              </Button>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="border-b border-border bg-muted/60 text-[10px] font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Subscription</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Current Period</th>
                    <th className="px-4 py-3">Renewal Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingSubscriptions ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading subscriptions...</span>
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-primary font-bold">
                          {s.id.slice(0, 13)}…
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{s.customer_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {s.customer_email}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold uppercase text-foreground">
                          {s.plan_name || s.plan_id}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.status === "active"
                                ? "bg-emerald-500/20 text-emerald-600"
                                : s.status === "trialing"
                                  ? "bg-purple-500/20 text-purple-600"
                                  : s.status === "past_due"
                                    ? "bg-amber-500/20 text-amber-600"
                                    : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {s.current_period_start
                            ? `${new Date(s.current_period_start).toLocaleDateString()} – ${s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">
                          {s.next_charge_at ? new Date(s.next_charge_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. RECONCILIATION SUBTAB */}
      {subTab === "reconciliation" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Internal Financial Reconciliation
              </h3>
              <p className="text-xs text-muted-foreground">
                Automated consistency checks across physical orders, payments, and subscriptions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadReconciliation}
              disabled={loadingReconciliation}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingReconciliation ? "animate-spin" : ""}`} />
              <span>Run Diagnostics</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Unpaid Completed Orders
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {reconciliation?.unpaid_completed_orders.length || 0}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Completed orders where payment_status is not 'paid'.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Unassigned Completed Orders
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {reconciliation?.unassigned_completed_orders.length || 0}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Completed orders without an active NFC token snapshot.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                Active Subscriptions Unpaid
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {reconciliation?.active_sub_unpaid_payments.length || 0}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active subscriptions without confirmed payment records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT DETAIL MODAL / DRAWER */}
      {selectedPaymentId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Payment Ledger Detail</h3>
                <p className="text-xs font-mono text-muted-foreground">{selectedPaymentId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentId(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                <span>Loading payment details...</span>
              </div>
            ) : paymentDetail ? (
              <div className="space-y-6 text-xs">
                {/* Core Payment Facts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">Amount</div>
                    <div className="font-mono font-bold text-sm text-primary">
                      {(paymentDetail.payment.amount_minor / 100).toFixed(2)}{" "}
                      {paymentDetail.payment.currency}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">Status</div>
                    <div className="font-bold uppercase text-xs">
                      {paymentDetail.payment.status}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">Purpose</div>
                    <div className="font-semibold text-xs truncate">
                      {paymentDetail.payment.purpose}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">Refundable</div>
                    <div className="font-mono font-bold text-emerald-500 text-sm">
                      {(paymentDetail.payment.remaining_refundable_minor / 100).toFixed(2)} SAR
                    </div>
                  </div>
                </div>

                {/* Customer Snapshot */}
                {paymentDetail.customer && (
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      Customer Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-semibold text-foreground">
                          {paymentDetail.customer.full_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        <span className="font-mono text-foreground">
                          {paymentDetail.customer.email}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tier: </span>
                        <span className="font-bold uppercase text-primary">
                          {paymentDetail.customer.plan_tier}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Relation if any */}
                {paymentDetail.order && (
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      Linked Physical Order
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                      <div>Order: {paymentDetail.order.order_number}</div>
                      <div>Product: {paymentDetail.order.product_variant}</div>
                      <div>Fulfillment: {paymentDetail.order.fulfillment_status}</div>
                      <div>NFC: {paymentDetail.order.nfc_token ? "Linked" : "Unassigned"}</div>
                    </div>
                  </div>
                )}

                {/* Refund Action Button */}
                {paymentDetail.payment.remaining_refundable_minor > 0 &&
                  (paymentDetail.payment.status === "paid" ||
                    paymentDetail.payment.status === "partially_refunded") && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          setRefundModal({
                            paymentId: selectedPaymentId,
                            maxMinor: paymentDetail.payment.remaining_refundable_minor,
                            amountSar: (
                              paymentDetail.payment.remaining_refundable_minor / 100
                            ).toFixed(2),
                            reason: "",
                            adminNote: "",
                            submitting: false,
                          })
                        }
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{t("adminRefundBtn")}</span>
                      </Button>
                    </div>
                  )}

                {/* Refunds History */}
                {paymentDetail.refunds && paymentDetail.refunds.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      Refund History ({paymentDetail.refunds.length})
                    </h4>
                    <div className="space-y-2">
                      {paymentDetail.refunds.map((rf: PaymentRefundRecord) => (
                        <div
                          key={rf.id}
                          className="p-3 rounded-xl border border-border bg-muted/30 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-mono font-bold text-purple-400">
                              {(rf.amount_minor / 100).toFixed(2)} {rf.currency} ({rf.type})
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {rf.reason || "No reason specified"} ·{" "}
                              {new Date(rf.requested_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400">
                            {rf.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-foreground">{t("adminRefundTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("adminRefundDesc")}</p>

            <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground">
                  {t("adminRefundRemaining")
                    .replace("{amount}", (refundModal.maxMinor / 100).toFixed(2))
                    .replace("{currency}", "SAR")}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="refundAmount" className="text-xs font-medium text-foreground">
                  {t("adminRefundAmount")} *
                </Label>
                <Input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  max={refundModal.maxMinor / 100}
                  value={refundModal.amountSar}
                  onChange={(e) =>
                    setRefundModal((prev) => (prev ? { ...prev, amountSar: e.target.value } : null))
                  }
                  required
                  className="bg-background border-border text-foreground font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="refundReason" className="text-xs font-medium text-foreground">
                  {t("adminRefundReason")}
                </Label>
                <Input
                  id="refundReason"
                  value={refundModal.reason}
                  onChange={(e) =>
                    setRefundModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                  }
                  placeholder="e.g. Customer requested cancellation"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="refundNote" className="text-xs font-medium text-foreground">
                  {t("adminRefundNote")}
                </Label>
                <Input
                  id="refundNote"
                  value={refundModal.adminNote}
                  onChange={(e) =>
                    setRefundModal((prev) => (prev ? { ...prev, adminNote: e.target.value } : null))
                  }
                  placeholder="Internal notes..."
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRefundModal(null)}
                  disabled={refundModal.submitting}
                  className="text-xs"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={refundModal.submitting}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {refundModal.submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      <span>{t("pleaseWait")}</span>
                    </>
                  ) : (
                    <span>{t("adminRefundSubmit")}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
