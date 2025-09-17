import React, { useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Calendar as CalendarIcon, CreditCard, StickyNote, Banknote } from "lucide-react";
import type { Quote, AppSettings, PaymentEntry, Task } from "@/lib/types";
import { i18n } from "@/lib/i18n";

interface QuotePaymentManagerProps {
  quote?: Quote;
  settings: AppSettings;
  totalFromPrice?: number;
  onUpdateQuote?: (quoteId: string, updates: Partial<Quote>) => void;
  taskStatus?: Task['status'];
}

//

export function QuotePaymentManager({ quote, settings, totalFromPrice, onUpdateQuote, taskStatus }: QuotePaymentManagerProps) {

  const T = useMemo(() => {
    const lang = (i18n as any)[settings.language];
    if (!lang) {
      console.warn('Language not found, falling back to vi');
      return { ...i18n.vi };
    }
    return { ...lang };
  }, [settings.language]);

  // Totals with default payment status handling
  const grandTotal = useMemo(() => (typeof totalFromPrice === 'number' ? totalFromPrice : quote?.total || 0), [totalFromPrice, quote?.total]);
  const payments = useMemo<PaymentEntry[]>(() => {
    // If quote has no payments array, initialize with default "Chưa thanh toán" entry
    if (!quote?.payments || quote.payments.length === 0) {
      return [{
        id: 'default-payment',
        status: 'scheduled', // Mặc định là "Chưa thanh toán" 
        date: undefined,
        method: undefined,
        notes: '',
        amountType: 'percent',
        percent: 100 // 100% of quote but marked as scheduled (unpaid)
      }];
    }
    return quote.payments;
  }, [quote?.payments]);
  const amountPaid = useMemo(() => {
    // Only count payments marked as 'paid'
    return payments.reduce((s, p) => {
      if (!p || p.status !== 'paid') return s;
      if (p.amountType === 'percent') {
        const pct = Math.max(0, Math.min(100, p.percent ?? 0));
        return s + (grandTotal * pct / 100);
      }
      return s + (p.amount || 0);
    }, 0);
  }, [payments, grandTotal]);

  const normalizePatch = (patch: Partial<PaymentEntry>): Partial<PaymentEntry> => {
    // Ensure exclusivity
    if (patch.amountType === 'percent') {
      return { ...patch, amount: undefined };
    }
    if (patch.amountType === 'absolute') {
      return { ...patch, percent: undefined };
    }
    return patch;
  };

  const updatePayment = (index: number, rawPatch: Partial<PaymentEntry>) => {
    if (!quote || !onUpdateQuote) return;
    
    // If updating the default payment entry, initialize payments array
    let list = [...(quote.payments || [])];
    if (list.length === 0) {
      list = [{
        id: 'default-payment',
        status: 'scheduled',
        date: undefined,
        method: undefined,
        notes: '',
        amountType: 'percent',
        percent: 100
      }];
    }
    
    const patch = normalizePatch(rawPatch);
    list[index] = { ...list[index], ...patch } as PaymentEntry;
    const newAmountPaid = list.reduce((s, p) => {
      if (!p || p.status !== 'paid') return s; // Only count paid entries
      if (p.amountType === 'percent') {
        const pct = Math.max(0, Math.min(100, p.percent ?? 0));
        return s + (grandTotal * pct / 100);
      }
      return s + (p.amount || 0);
    }, 0);
    onUpdateQuote(quote.id, { payments: list, amountPaid: newAmountPaid });
  };

  // Parse user input for amount: supports '50%' or '500000' or '1,200,000'
  const parseAmountInput = (input: string): Partial<PaymentEntry> => {
    const raw = (input || '').trim();
    if (!raw) {
      return { amount: undefined, percent: undefined };
    }
    // Detect percent when a % exists anywhere in the string
    if (raw.includes('%')) {
      const numeric = parseFloat(raw.replace(/%/g, '').trim());
      const pct = isNaN(numeric) ? undefined : Math.max(0, Math.min(100, numeric));
      return { amountType: 'percent', percent: pct, amount: undefined };
    }
    // Otherwise treat as absolute currency; strip non-number separators (keep dot for decimals)
    const cleaned = raw.replace(/[^0-9.\-]/g, '');
    const num = parseFloat(cleaned);
    const amt = isNaN(num) ? undefined : Math.max(0, num);
    return { amountType: 'absolute', amount: amt, percent: undefined };
  };

  const addPayment = () => {
    if (!quote || !onUpdateQuote) return;
  const list = [...(quote.payments || [])];
  list.push({ id: `pay-${Date.now()}`, status: 'scheduled', date: undefined, method: undefined, notes: '', amountType: 'absolute', amount: 0 });
    onUpdateQuote(quote.id, { payments: list });
  };

  const removePayment = (index: number) => {
    if (!quote || !onUpdateQuote) return;
    const list = [...(quote.payments || [])];
    list.splice(index, 1);
    // Recompute paid total considering only entries with status 'paid'
    const newAmountPaid = list.reduce((s, p) => {
      if (!p || p.status !== 'paid') return s;
      if (p.amountType === 'percent') {
        const pct = Math.max(0, Math.min(100, p.percent ?? 0));
        return s + (grandTotal * pct / 100);
      }
      return s + (p.amount || 0);
    }, 0);
    onUpdateQuote(quote.id, { payments: list, amountPaid: newAmountPaid });
  };

  if (!quote) {
    return <div className="text-center py-8 text-muted-foreground">{T.noQuoteData || 'No quote data available.'}</div>;
  }

  const computedProgress = grandTotal > 0 ? Math.min(100, Math.round((amountPaid / grandTotal) * 100)) : 0;
  // Do not force 100% when taskStatus === 'done'; reflect actual payments
  const progress = computedProgress;

  return (
    <div className="space-y-4">
      {/* Payment Info Table (compact) */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-12 items-center gap-3 border-b pb-3 text-muted-foreground">
            <div className="col-span-3 flex items-center gap-2 text-xs font-medium"><CheckCircle2 className="w-3 h-3" />{T.paymentStatus}</div>
            <div className="col-span-3 flex items-center gap-2 text-xs font-medium"><CalendarIcon className="w-3 h-3" />{T.paymentDate}</div>
            <div className="col-span-3 flex items-center gap-2 text-xs font-medium"><CreditCard className="w-3 h-3" />{T.paymentMethod}</div>
            <div className="col-span-1 flex items-center gap-2 text-xs font-medium"><StickyNote className="w-3 h-3" />{T.paymentNotes}</div>
            <div className="col-span-2 flex items-center justify-end gap-2 text-xs font-medium"><Banknote className="w-3 h-3" />{T.amount}</div>
          </div>

          {(payments.length ? payments : [{} as PaymentEntry]).map((p, idx) => (
            <div key={p.id || `row-${idx}`} className="grid grid-cols-12 items-center gap-3 py-4 border-b last:border-b-0">
              {/* Status: paid or scheduled */}
              <div className="col-span-3">
                <Select
                  value={p.status || ''}
                  onValueChange={(v) => updatePayment(idx, { status: v as PaymentEntry['status'] })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={T.paymentStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">{(T.quoteStatuses as any)?.paid || 'Paid'}</SelectItem>
                    <SelectItem value="scheduled">{T.scheduled || 'Scheduled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="col-span-3">
                <Input
                  type="date"
                  value={p.date ? format(new Date(p.date), 'yyyy-MM-dd') : ''}
                  onChange={(e) => updatePayment(idx, { date: e.target.value })}
                  className="h-12"
                />
              </div>

              {/* Method */}
              <div className="col-span-3">
                <Select
                  value={p.method || ''}
                  onValueChange={(v) => updatePayment(idx, { method: v as PaymentEntry['method'] })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={T.selectPaymentMethod} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">{T.bankTransfer}</SelectItem>
                    <SelectItem value="cash">{T.cash}</SelectItem>
                    <SelectItem value="credit_card">{T.creditCard}</SelectItem>
                    <SelectItem value="paypal">{T.paypal}</SelectItem>
                    <SelectItem value="other">{T.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="col-span-1">
                <Input
                  placeholder={T.enterPaymentNotes}
                  value={p.notes || ''}
                  onChange={(e) => updatePayment(idx, { notes: e.target.value })}
                  className="h-12"
                />
              </div>

              {/* Amount (auto-detect currency or %) */}
              <div className="col-span-2 flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={`e.g., 50% or 500000`}
                  value={
                    (p.amountType === 'percent' || (p.percent != null && (p.amount == null)))
                      ? (p.percent != null ? `${p.percent}%` : '')
                      : (p.amount != null ? String(p.amount) : '')
                  }
                  onChange={(e) => {
                    const patch = parseAmountInput(e.target.value);
                    updatePayment(idx, patch);
                  }}
                  className="h-12 text-right"
                />
              </div>

              {/* Remove */}
              <div className="col-span-12 flex justify-end mt-2 md:mt-0">
                {payments.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => removePayment(idx)} aria-label="Remove">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="pt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={addPayment} aria-label="Add payment">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary (static progress) */}
      <Card className="border-2">
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-3">
              <div className="font-semibold">{T.paymentSummary}</div>
              <div className="text-sm text-muted-foreground">{T.totalAmount}</div>
              <div className="text-lg font-bold">{(grandTotal || 0).toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</div>
            </div>
            <div className="col-span-9">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">{T.amountPaid}:</span>
                <span className="font-medium">{(amountPaid || 0).toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{progress}%</span>
                <span>
                  {(Math.max(0, grandTotal - (amountPaid || 0)).toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US'))} {settings.currency} {T.remainingAmount || 'remaining'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
