"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  DollarSign, 
  HelpCircle,
  Clock
} from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import type { FixedCost } from '@/lib/types';
import { format } from 'date-fns';

interface FixedCostsCardProps {
  dateRange: { from?: Date; to?: Date };
  currency?: string;
  locale?: string;
  // When true, render the management UI directly (no internal Dialog)
  embedded?: boolean;
  // When true, hide the clickable summary card block
  hideSummary?: boolean;
  // If provided and not embedded, open the internal Dialog by default
  defaultOpen?: boolean;
}

export function FixedCostsCard({ dateRange, currency = 'USD', locale, embedded = false, hideSummary = false, defaultOpen = false }: FixedCostsCardProps) {
  const { appData, setAppData } = useDashboard();
  const T = i18n[appData?.appSettings?.language || 'en'];
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(!!defaultOpen);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as 'once' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true
  });

  const fixedCosts = appData?.fixedCosts || [];

  // Calculate total fixed costs for the selected date range
  const totalFixedCosts = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return 0;

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    return fixedCosts.reduce((total, cost) => {
      if (!cost.isActive) return total;

      const startDate = new Date(cost.startDate);
      const endDate = cost.endDate ? new Date(cost.endDate) : null;

      // Check if cost applies to the selected range
      if (startDate > toDate || (endDate && endDate < fromDate)) {
        return total;
      }

      let costForRange = 0;
      
      switch (cost.frequency) {
        case 'once':
          // One-time cost applies if start date is in range
          if (startDate >= fromDate && startDate <= toDate) {
            costForRange = cost.amount;
          }
          break;
        case 'weekly':
          // Calculate how many weeks in the range
          const weeksInRange = Math.ceil(rangeDays / 7);
          costForRange = cost.amount * weeksInRange;
          break;
        case 'monthly':
          // Calculate how many months in the range
          const monthsInRange = Math.ceil(rangeDays / 30.44); // Average days per month
          costForRange = cost.amount * monthsInRange;
          break;
        case 'yearly':
          // Calculate how many years in the range
          const yearsInRange = Math.ceil(rangeDays / 365.25); // Average days per year
          costForRange = cost.amount * yearsInRange;
          break;
      }

      return total + costForRange;
    }, 0);
  }, [fixedCosts, dateRange]);

  const resolvedLocale = locale || (currency === 'VND' ? 'vi-VN' : 'en-US');
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(resolvedLocale, { 
      style: 'currency', 
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  const frequencyLabels = {
    once: 'One time',
    weekly: 'Weekly', 
    monthly: 'Monthly',
    yearly: 'Yearly'
  };

  const handleAddCost = () => {
    setEditingCost(null);
    setFormData({
      name: '',
      amount: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true
    });
    setIsDialogOpen(true);
  };

  const handleEditCost = (cost: FixedCost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      amount: cost.amount.toString(),
      frequency: cost.frequency,
      startDate: cost.startDate.split('T')[0],
      endDate: cost.endDate ? cost.endDate.split('T')[0] : '',
      isActive: cost.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCost = (costId: string) => {
    const updatedCosts = fixedCosts.filter(cost => cost.id !== costId);
    setAppData(prev => ({ ...prev, fixedCosts: updatedCosts }));
    toast({
      title: 'Success',
      description: 'Fixed cost deleted successfully',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.amount.trim()) {
      toast({
        variant: "destructive",
        title: T.error || 'Error',
        description: 'Please fill in all required fields',
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive", 
        title: T.error || 'Error',
        description: 'Please enter a valid amount',
      });
      return;
    }

    const now = new Date().toISOString();
    const costData: FixedCost = {
      id: editingCost?.id || `fixed-cost-${Date.now()}`,
      name: formData.name.trim(),
      amount,
      frequency: formData.frequency,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      isActive: formData.isActive,
      createdAt: editingCost?.createdAt || now,
      updatedAt: now
    };

    let updatedCosts;
    if (editingCost) {
      updatedCosts = fixedCosts.map(cost => 
        cost.id === editingCost.id ? costData : cost
      );
    } else {
      updatedCosts = [...fixedCosts, costData];
    }

    setAppData(prev => ({ ...prev, fixedCosts: updatedCosts }));
    setIsDialogOpen(false);
    
    toast({
      title: T.success || 'Success',
      description: editingCost 
        ? 'Fixed cost updated successfully'
        : 'Fixed cost added successfully',
    });
  };

  const manageContent = (
            <div className="space-y-6">
              {/* Add/Edit Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingCost ? 'Edit Fixed Cost' : 'Add Fixed Cost'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter cost name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="amount">Amount ({currency}) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select 
                          value={formData.frequency} 
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, frequency: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">{frequencyLabels.once}</SelectItem>
                            <SelectItem value="weekly">{frequencyLabels.weekly}</SelectItem>
                            <SelectItem value="monthly">{frequencyLabels.monthly}</SelectItem>
                            <SelectItem value="yearly">{frequencyLabels.yearly}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date (Optional)</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                          className="rounded"
                          aria-label="Mark cost as active"
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <div className="flex gap-2">
                        {editingCost && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setEditingCost(null);
                              setFormData({
                                name: '',
                                amount: '',
                                frequency: 'monthly',
                                startDate: new Date().toISOString().split('T')[0],
                                endDate: '',
                                isActive: true
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button type="submit">
                          {editingCost ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Fixed Costs Table */}
              {fixedCosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Fixed Costs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fixedCosts.map((cost) => (
                          <TableRow key={cost.id}>
                            <TableCell className="font-medium">{cost.name}</TableCell>
                            <TableCell>{formatCurrency(cost.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {frequencyLabels[cost.frequency]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(cost.startDate), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              {cost.endDate ? format(new Date(cost.endDate), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={cost.isActive ? 'default' : 'secondary'}>
                                {cost.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCost(cost)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCost(cost.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {fixedCosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No fixed costs added yet</p>
                  <Button onClick={handleAddCost} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first fixed cost
                  </Button>
                </div>
              )}
            </div>
  );

  return (
    <TooltipProvider>
      {!embedded && !hideSummary && (
        <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" />
              Fixed Costs
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Chi phí cố định được tính theo thời gian đã chọn
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => setIsDialogOpen(true)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Total Fixed Costs
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Clock className="w-3 h-3 text-purple-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Tính toán cho khoảng thời gian đã chọn
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <Settings className="w-4 h-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-purple-800 dark:text-purple-200 break-all">
                {formatCurrency(totalFixedCosts)}
              </h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                {fixedCosts.length} {fixedCosts.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {embedded ? (
        manageContent
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Manage Fixed Costs
              </DialogTitle>
            </DialogHeader>
            {manageContent}
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}
