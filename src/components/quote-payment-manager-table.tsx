import React, { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContrastingTextColor } from "@/lib/colors";
import type { Quote, CollaboratorQuote, AppSettings } from "@/lib/types";
import { i18n } from "@/lib/i18n";
import { PaymentProgressBar } from "./payment-progress-bar";
import styles from "./quote-payment-manager-table.module.css";

interface QuotePaymentManagerProps {
  quote?: Quote;
  collaboratorQuotes?: Quote[];
  settings: AppSettings;
  onUpdateQuote?: (quoteId: string, updates: Partial<Quote>) => void;
  onUpdateCollaboratorQuote?: (quoteId: string, updates: Partial<CollaboratorQuote>) => void;
}

const getStatusColor = (status: Quote['status'] | CollaboratorQuote['paymentStatus']): string => {
  switch (status) {
    case 'paid': return '#10b981'; // green
    case 'invoiced': return '#3b82f6'; // blue
    case 'accepted': return '#8b5cf6'; // purple
    case 'sent': return '#f59e0b'; // amber
    case 'rejected': return '#ef4444'; // red
    case 'draft': return '#6b7280'; // gray
    case 'pending': return '#f59e0b'; // amber
    default: return '#6b7280';
  }
};

export function QuotePaymentManager({
  quote,
  collaboratorQuotes = [],
  settings,
  onUpdateQuote,
  onUpdateCollaboratorQuote
}: QuotePaymentManagerProps) {
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const progressBarRef = useRef<HTMLDivElement>(null);

  const T = useMemo(() => {
    const lang = (i18n as any)[settings.language];
    if (!lang) {
      console.warn('Language not found, falling back to vi');
      return { ...i18n.vi };
    }
    return { ...lang };
  }, [settings.language]);

  const handleFieldChange = (quoteId: string, field: string, value: any, isCollaborator: boolean = false) => {
    setEditingValues(prev => ({
      ...prev,
      [`${quoteId}-${field}`]: value
    }));

    // Auto-save after a short delay
    setTimeout(() => {
      const updates = { [field]: value };
      if (isCollaborator && onUpdateCollaboratorQuote) {
        onUpdateCollaboratorQuote(quoteId, updates);
      } else if (!isCollaborator && onUpdateQuote) {
        onUpdateQuote(quoteId, updates);
      }
    }, 500);
  };

  const handleAmountChange = (quoteId: string, newAmount: number, isCollaborator: boolean = false) => {
    handleFieldChange(quoteId, 'amountPaid', newAmount, isCollaborator);
  };

  const getFieldValue = (quoteId: string, field: string, defaultValue: any) => {
    const editingKey = `${quoteId}-${field}`;
    return editingValues[editingKey] !== undefined ? editingValues[editingKey] : defaultValue;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
  };

  const PaymentRow = ({ 
    id, 
    title, 
    total, 
    status, 
    amountPaid = 0,
    paidDate, 
    paymentMethod, 
    paymentNotes,
    isCollaborator = false,
    statusOptions
  }: {
    id: string;
    title: string;
    total: number;
    status: string;
    amountPaid?: number;
    paidDate?: string;
    paymentMethod?: string;
    paymentNotes?: string;
    isCollaborator?: boolean;
    statusOptions: Record<string, string>;
  }) => (
    <TableRow>
      <TableCell className="font-medium">{title}</TableCell>
      <TableCell>
        <Select
          value={getFieldValue(id, 'status', status) || getFieldValue(id, 'paymentStatus', status)}
          onValueChange={(value) => handleFieldChange(id, isCollaborator ? 'paymentStatus' : 'status', value, isCollaborator)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusOptions).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      key === 'paid' && "bg-green-500",
                      key === 'invoiced' && "bg-blue-500", 
                      key === 'accepted' && "bg-purple-500",
                      key === 'sent' && "bg-yellow-500",
                      key === 'rejected' && "bg-red-500",
                      key === 'draft' && "bg-gray-500",
                      key === 'pending' && "bg-yellow-500"
                    )} />
                    {String(label)}
                  </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="space-y-2">
          <PaymentProgressBar
            totalAmount={total}
            amountPaid={getFieldValue(id, 'amountPaid', amountPaid)}
            onAmountChange={(newAmount) => handleAmountChange(id, newAmount, isCollaborator)}
            currency={settings.currency}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(getFieldValue(id, 'amountPaid', amountPaid))} {settings.currency}</span>
            <span>{formatCurrency(total)} {settings.currency}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="date"
          value={getFieldValue(id, 'paidDate', paidDate ? format(new Date(paidDate), 'yyyy-MM-dd') : '')}
          onChange={(e) => handleFieldChange(id, 'paidDate', e.target.value, isCollaborator)}
          className="w-full"
        />
      </TableCell>
      <TableCell>
        <Select
          value={getFieldValue(id, 'paymentMethod', paymentMethod || '')}
          onValueChange={(value) => handleFieldChange(id, 'paymentMethod', value, isCollaborator)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={T.selectPaymentMethod} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">{T.cash}</SelectItem>
            <SelectItem value="bank_transfer">{T.bankTransfer}</SelectItem>
            <SelectItem value="credit_card">{T.creditCard}</SelectItem>
            <SelectItem value="paypal">{T.paypal}</SelectItem>
            <SelectItem value="other">{T.other}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Textarea
          placeholder={T.enterPaymentNotes}
          value={getFieldValue(id, 'paymentNotes', paymentNotes || '')}
          onChange={(e) => handleFieldChange(id, 'paymentNotes', e.target.value, isCollaborator)}
          rows={2}
          className="w-full resize-none"
        />
      </TableCell>
    </TableRow>
  );

  if (!quote && (!collaboratorQuotes || collaboratorQuotes.length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {T.noQuoteData || 'No quote data available.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5" />
        <h4 className="font-semibold text-lg">{T.quoteStatusManagement}</h4>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{T.paymentInformation}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{T.description}</TableHead>
                  <TableHead className="w-[150px]">{T.paymentStatus}</TableHead>
                  <TableHead className="w-[250px]">{T.paymentProgress}</TableHead>
                  <TableHead className="w-[130px]">{T.paymentDate}</TableHead>
                  <TableHead className="w-[150px]">{T.paymentMethod}</TableHead>
                  <TableHead className="min-w-[200px]">{T.paymentNotes}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Main Quote Row */}
                {quote && (
                  <PaymentRow
                    id={quote.id}
                    title={T.priceQuote}
                    total={quote.total}
                    status={quote.status}
                    amountPaid={quote.amountPaid}
                    paidDate={quote.paidDate}
                    paymentMethod={quote.paymentMethod}
                    paymentNotes={quote.paymentNotes}
                    isCollaborator={false}
                    statusOptions={T.quoteStatuses || {}}
                  />
                )}

                {/* Collaborator Quote Rows */}
                {collaboratorQuotes.map((collabQuote, index) => (
                  <PaymentRow
                    key={collabQuote.id}
                    id={collabQuote.id}
                    title={`${T.collaboratorCosts} #${index + 1}`}
                    total={collabQuote.total}
                    status={(collabQuote as any).paymentStatus || 'pending'}
                    amountPaid={(collabQuote as any).amountPaid}
                    paidDate={(collabQuote as any).paidDate}
                    paymentMethod={(collabQuote as any).paymentMethod}
                    paymentNotes={(collabQuote as any).paymentNotes}
                    isCollaborator={true}
                    statusOptions={T.collaboratorPaymentStatuses || {}}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      {(quote || collaboratorQuotes.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{T.paymentSummary || 'Payment Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quote && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{T.totalRevenue || 'Total Revenue'}</p>
                  <p className="text-lg font-semibold">{formatCurrency(quote.total)} {settings.currency}</p>
                  <p className="text-xs text-muted-foreground">
                    {T.paid || 'Paid'}: {formatCurrency(quote.amountPaid || 0)} {settings.currency}
                  </p>
                </div>
              )}
              
              {collaboratorQuotes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{T.totalCosts || 'Total Costs'}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(collaboratorQuotes.reduce((sum, q) => sum + q.total, 0))} {settings.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {T.paid || 'Paid'}: {formatCurrency(collaboratorQuotes.reduce((sum, q) => sum + ((q as any).amountPaid || 0), 0))} {settings.currency}
                  </p>
                </div>
              )}

              {quote && collaboratorQuotes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{T.netProfit || 'Net Profit'}</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(quote.total - collaboratorQuotes.reduce((sum, q) => sum + q.total, 0))} {settings.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {T.actualProfit || 'Actual'}: {formatCurrency((quote.amountPaid || 0) - collaboratorQuotes.reduce((sum, q) => sum + ((q as any).amountPaid || 0), 0))} {settings.currency}
                  </p>
                </div>
              )}

              {quote && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{T.paymentCompletion || 'Completion'}</p>
                  <p className="text-lg font-semibold">
                    {Math.round(((quote.amountPaid || 0) / quote.total) * 100)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      ((quote.amountPaid || 0) / quote.total) >= 1 ? "w-full bg-green-600" :
                      ((quote.amountPaid || 0) / quote.total) >= 0.75 ? "w-3/4 bg-yellow-600" :
                      ((quote.amountPaid || 0) / quote.total) >= 0.5 ? "w-1/2 bg-orange-600" :
                      ((quote.amountPaid || 0) / quote.total) >= 0.25 ? "w-1/4 bg-red-600" :
                      "w-0 bg-gray-400"
                    )} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
