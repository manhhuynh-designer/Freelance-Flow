# Kế Hoạch Update Dialog Readonly cho task-list-item.tsx

## Mục tiêu
Cải thiện phần hiển thị thông tin đầy đủ trong dialog readonly để tương thích với cấu trúc dữ liệu mới và tăng trải nghiệm người dùng.

## Phân tích hiện trạng

### Dialog Structure hiện tại:
```tsx
<Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
  <DialogContent className="sm:max-w-[425px] md:max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{task.name}</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    <div className="space-y-6 py-4">
      // Current sections: Description, Links, Collaborator, Dates, Quote Tables, Calculations
    </div>
  </DialogContent>
</Dialog>
```

### Các phần hiện có:
1. **Header**: Task name + basic info
2. **Description**: Text description
3. **Links**: Brief & Drive links
4. **Collaborator**: Assigned collaborator badge
5. **Dates**: Start date to deadline
6. **Quote Tables**: Main quote + collaborator quote
7. **Calculation Results**: Enhanced calculation summary
8. **Actions**: Delete + Edit buttons

## Kế hoạch cải tiến

### 1. **Enhanced Header Section**
```tsx
<DialogHeader>
  <div className="space-y-3">
    <DialogTitle className="text-xl font-bold">{task.name}</DialogTitle>
    
    {/* Status & Priority Indicators */}
    <div className="flex items-center gap-2 flex-wrap">
      <Badge 
        style={{ 
          backgroundColor: settings.statusColors[task.status],
          color: getContrastingTextColor(settings.statusColors[task.status]) 
        }}
        className="flex items-center gap-1"
      >
        <StatusIcon className="h-3 w-3" />
        {statusSetting?.label || T.statuses[status.id]}
        {subStatusLabel && <span className="text-xs opacity-80">({subStatusLabel})</span>}
      </Badge>
      
      {/* Deadline indicator */}
      <Badge variant="outline" className={deadlineColorClass}>
        <Calendar className="h-3 w-3 mr-1" />
        {isValidDeadline ? format(task.deadline, "MMM dd, yyyy") : 'Invalid Date'}
      </Badge>
      
      {/* Client badge */}
      <Badge variant="secondary">
        <Building className="h-3 w-3 mr-1" />
        {client?.name}
      </Badge>
    </div>
    
    {/* Category & Financial Summary */}
    <div className="text-sm text-muted-foreground space-y-1">
      <div className="flex justify-between items-center">
        <span>Category: {category?.name}</span>
        <span className="font-medium text-foreground">
          Total: {totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
        </span>
      </div>
      {collaboratorQuote && totalCollabQuote > 0 && (
        <div className="flex justify-between items-center text-xs">
          <span>Net Profit:</span>
          <span className="font-medium text-green-600">
            {(totalQuote - totalCollabQuote).toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
          </span>
        </div>
      )}
    </div>
  </div>
</DialogHeader>
```

### 2. **Improved Content Layout với Tabs**
```tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="quotes">Quotes</TabsTrigger>
    <TabsTrigger value="calculations">Calculations</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview" className="space-y-4">
    {/* Description, Links, Collaborator, Dates */}
  </TabsContent>
  
  <TabsContent value="quotes" className="space-y-4">
    {/* Quote Tables với improved design */}
  </TabsContent>
  
  <TabsContent value="calculations" className="space-y-4">
    {/* Detailed calculations và analytics */}
  </TabsContent>
</Tabs>
```

### 3. **Enhanced Overview Tab**
```tsx
<TabsContent value="overview" className="space-y-6">
  {/* Quick Stats Cards */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card className="p-3">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{quote?.sections?.length || 0}</div>
        <div className="text-xs text-muted-foreground">Sections</div>
      </div>
    </Card>
    
    <Card className="p-3">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {quote?.sections?.reduce((acc, s) => acc + (s.items?.length || 0), 0) || 0}
        </div>
        <div className="text-xs text-muted-foreground">Items</div>
      </div>
    </Card>
    
    <Card className="p-3">
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">
          {differenceInDays(new Date(task.deadline), new Date(task.startDate))}
        </div>
        <div className="text-xs text-muted-foreground">Days Duration</div>
      </div>
    </Card>
    
    <Card className="p-3">
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">
          {isValidDeadline ? differenceInDays(new Date(task.deadline), new Date()) : 'N/A'}
        </div>
        <div className="text-xs text-muted-foreground">Days Remaining</div>
      </div>
    </Card>
  </div>

  {/* Description Section */}
  <Card className="p-4">
    <h4 className="font-semibold mb-3 flex items-center gap-2">
      <FileText className="h-4 w-4" />
      {T.description}
    </h4>
    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
      {task.description || <em>{T.noDescription}</em>}
    </div>
  </Card>

  {/* Links & Collaborator */}
  <div className="grid md:grid-cols-2 gap-4">
    {/* Links Card */}
    {((task.briefLink && task.briefLink.length > 0) || (task.driveLink && task.driveLink.length > 0)) && (
      <Card className="p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Link className="h-4 w-4" />
          {T.links}
        </h4>
        <div className="space-y-2">
          {/* Links implementation */}
        </div>
      </Card>
    )}
    
    {/* Collaborator Card */}
    {assignedCollaborator && (
      <Card className="p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          {T.collaborator}
        </h4>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{assignedCollaborator.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{assignedCollaborator.name}</div>
            {assignedCollaborator.specialty && (
              <div className="text-xs text-muted-foreground">{assignedCollaborator.specialty}</div>
            )}
          </div>
        </div>
      </Card>
    )}
  </div>

  {/* Timeline Section */}
  <Card className="p-4">
    <h4 className="font-semibold mb-3 flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      Timeline
    </h4>
    <div className="flex items-center justify-between">
      <div className="text-sm">
        <div className="font-medium">Start Date</div>
        <div className="text-muted-foreground">
          {isValidStartDate ? format(task.startDate, "PPP") : 'Invalid Date'}
        </div>
      </div>
      <div className="flex-1 mx-4">
        <Progress 
          value={isValidDeadline && isValidStartDate ? 
            Math.max(0, Math.min(100, 
              (differenceInDays(new Date(), new Date(task.startDate)) / 
               differenceInDays(new Date(task.deadline), new Date(task.startDate))) * 100
            )) : 0
          } 
          className="h-2" 
        />
      </div>
      <div className="text-sm text-right">
        <div className="font-medium">Deadline</div>
        <div className={cn("text-muted-foreground", deadlineColorClass)}>
          {isValidDeadline ? format(task.deadline, "PPP") : 'Invalid Date'}
        </div>
      </div>
    </div>
  </Card>
</TabsContent>
```

### 4. **Enhanced Quotes Tab**
```tsx
<TabsContent value="quotes" className="space-y-6">
  {/* Main Quote */}
  {quote && quote.sections && quote.sections.length > 0 && (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          {T.priceQuote}
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {quote.sections.length} sections
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => copyQuoteToClipboard(quote)}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Enhanced Quote Table với collapsible sections */}
      <Accordion type="multiple" className="w-full">
        {quote.sections.map((section, index) => (
          <AccordionItem key={section.id || index} value={`section-${index}`}>
            <AccordionTrigger className="text-sm">
              <div className="flex justify-between items-center w-full mr-4">
                <span>{section.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {section.items?.length || 0} items
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {/* Table implementation */}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  )}
  
  {/* Collaborator Quote - similar structure */}
</TabsContent>
```

### 5. **Enhanced Calculations Tab**
```tsx
<TabsContent value="calculations" className="space-y-6">
  {/* Financial Summary */}
  <Card className="p-4">
    <h4 className="font-semibold mb-4 flex items-center gap-2">
      <TrendingUp className="h-4 w-4" />
      Financial Summary
    </h4>
    
    <div className="grid md:grid-cols-2 gap-6">
      {/* Main Quote Calculations */}
      <div className="space-y-3">
        <h5 className="font-medium text-sm text-muted-foreground">Main Quote</h5>
        {calculationResults.map(calc => (
          <div key={calc.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
            <div>
              <div className="font-medium text-sm">{calc.name}</div>
              <div className="text-xs text-muted-foreground">{calc.calculation}</div>
            </div>
            <div className="font-bold">
              {typeof calc.result === 'number' 
                ? calc.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')
                : calc.result
              }
            </div>
          </div>
        ))}
        
        <Separator />
        <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">
            {totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
          </span>
        </div>
      </div>
      
      {/* Collaborator Quote Calculations */}
      {collaboratorCalculationResults.length > 0 && (
        <div className="space-y-3">
          <h5 className="font-medium text-sm text-muted-foreground">Collaborator Costs</h5>
          {/* Similar structure */}
        </div>
      )}
    </div>
    
    {/* Profit Analysis */}
    {collaboratorQuote && totalCollabQuote > 0 && (
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h5 className="font-medium text-green-800 mb-2">Profit Analysis</h5>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-green-600">
              {(totalQuote - totalCollabQuote).toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
            </div>
            <div className="text-green-700">Net Profit</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-green-600">
              {totalQuote > 0 ? ((totalQuote - totalCollabQuote) / totalQuote * 100).toFixed(1) : 0}%
            </div>
            <div className="text-green-700">Margin</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-green-600">
              {totalCollabQuote > 0 ? (totalQuote / totalCollabQuote).toFixed(1) : 0}x
            </div>
            <div className="text-green-700">Markup</div>
          </div>
        </div>
      </div>
    )}
  </Card>
  
  {/* Column Analytics */}
  <Card className="p-4">
    <h4 className="font-semibold mb-4">Column Analytics</h4>
    {/* Detailed breakdown of each custom column */}
  </Card>
</TabsContent>
```

### 6. **Enhanced Footer Actions**
```tsx
<DialogFooter className="flex justify-between items-center pt-4 border-t">
  <div className="flex gap-2">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => copyQuoteToClipboard(quote)}
      disabled={!quote}
    >
      <Copy className="h-4 w-4 mr-2" />
      Copy Quote
    </Button>
    
    {quote && (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => {/* Export to PDF/Excel */}}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    )}
  </div>
  
  <div className="flex gap-2">
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          {T.deleteTask}
        </Button>
      </AlertDialogTrigger>
      {/* AlertDialog content */}
    </AlertDialog>
    
    <Button 
      onClick={() => { setIsDetailsOpen(false); setIsEditDialogOpen(true); }}
      size="sm"
    >
      <Pencil className="h-4 w-4 mr-2" />
      {T.editTask}
    </Button>
  </div>
</DialogFooter>
```

## Required Dependencies

```tsx
import { 
  Tabs, TabsContent, TabsList, TabsTrigger,
  Card, CardContent, CardHeader, CardTitle,
  Avatar, AvatarFallback, AvatarImage,
  Progress,
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
  DialogFooter
} from "@/components/ui/...";

import { 
  Calendar, Building, FileText, Link, Users, Calculator, 
  TrendingUp, Download, BarChart3 
} from "lucide-react";
```

## Implementation Benefits

### User Experience
1. **Better Information Architecture**: Tabbed layout organizes content logically
2. **Visual Hierarchy**: Cards và badges create clear information structure
3. **Quick Insights**: Stats cards provide immediate understanding
4. **Interactive Elements**: Collapsible sections, progress bars
5. **Professional Look**: Modern UI components

### Developer Benefits
1. **Modular Code**: Each tab can be separate component
2. **Reusable Components**: Cards và sections can be abstracted
3. **Better Maintainability**: Clear separation of concerns
4. **Type Safety**: Full TypeScript support

### Business Value
1. **Enhanced Analytics**: Profit analysis, margin calculations
2. **Better Decision Making**: Visual data presentation
3. **Improved Workflow**: Quick access to key information
4. **Professional Presentation**: Client-ready quote display

## Implementation Priority

### Phase 1 - Core Structure
1. ✅ Basic tabbed layout
2. ✅ Enhanced header với badges
3. ✅ Overview tab với cards

### Phase 2 - Enhanced Content
1. ✅ Improved quote display với accordion
2. ✅ Calculation analytics
3. ✅ Timeline visualization

### Phase 3 - Advanced Features
1. ✅ Export functionality
2. ✅ Profit analysis
3. ✅ Column analytics
4. ✅ Advanced interactions

## Conclusion

Kế hoạch này sẽ transform dialog readonly từ simple information display thành comprehensive project dashboard, providing users với all information they need trong organized, visually appealing format while maintaining performance và usability.
