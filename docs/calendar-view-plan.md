# Kế hoạch thiết kế Calendar View cho Tasks Dashboard

## Phiên bản điều chỉnh sau khi scan codebase

---

## 1. Phân tích hiện trạng (Current State Analysis)

### Đã có sẵn:
- ✅ **Next.js + TypeScript structure**
- ✅ **Component `CalendarView` placeholder** (`src/components/calendar-view.tsx`)
- ✅ **View mode toggle** trong `DashboardContent` (table/calendar)
- ✅ **Types định nghĩa** trong `src/lib/types.ts`
- ✅ **i18n support** (EN/VI) trong `src/lib/i18n.ts`
- ✅ **UI Components** từ shadcn/ui (Calendar, Card, Button)
- ✅ **Task data structure** hoàn chỉnh với dates, status, priority

### Cần implement:
- 🔄 **CalendarView component logic**
- 🔄 **Calendar navigation & view modes**
- 🔄 **Task rendering trong calendar**
- 🔄 **Task interactions** (click, edit)
- 🔄 **i18n keys** cho calendar features

---

## 2. Technical Architecture (Điều chỉnh)

### 2.1 File Structure (Cập nhật với Dialog Components)
```
src/components/
├── calendar-view.tsx              // ✅ Đã có, cần implement với dialog integration
├── calendar/                      // 🆕 Tạo mới
│   ├── CalendarGrid.tsx           // Main calendar grid
│   ├── CalendarCell.tsx           // Individual day cell
│   ├── TaskCard.tsx               // Mini task card (same click behavior as table)
│   └── calendar-utils.ts          // Utility functions
├── task-dialogs/                  // 🆕 Extract từ TaskListItem
│   ├── TaskDetailsDialog.tsx      // Readonly task view dialog  
│   └── TaskEditDialog.tsx         // Edit task dialog
└── ui/calendar.tsx                // ✅ Đã có từ shadcn/ui
```

### 2.2 TypeScript Interfaces (Sử dụng types có sẵn)
```typescript
// Sử dụng từ src/lib/types.ts
import { Task, Client, Category, AppSettings } from '@/lib/types';

// Thêm mới trong types.ts - CHỈ CẦN THIẾT
export type CalendarViewMode = 'week' | 'month'; // Bỏ 'day' view - không cần thiết

export interface CalendarState {
  currentDate: Date;
  viewMode: CalendarViewMode; // Default: 'week'
  selectedDate: Date | null;
}

// ❌ REMOVED: CalendarTask interface - không cần thiết, dùng Task trực tiếp
```

### 2.3 Integration với Dashboard Context
```typescript
// Tận dụng DashboardContext đã có
const {
  tasks,
  clients,
  categories,
  appSettings,
  handleEditTask,
  handleTaskStatusChange,
  handleDeleteTask,
} = useDashboard();
```

---

## 3. Component Design (Tuân thủ design principles)

### 3.1 CalendarView Main Component
```typescript
// Cập nhật src/components/calendar-view.tsx
export function CalendarView({ 
  tasks, 
  // ... other props từ interface có sẵn
}: CalendarViewProps) {
  const [state, setState] = useState<CalendarState>({
    currentDate: new Date(),
    viewMode: 'week', // 🔄 CHANGED: Week View as default
    selectedDate: null,
  });

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Simple calendar header với navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          {/* Simple view toggle */}
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>
        </div>
        
        <CalendarGrid {...gridProps} />
      </CardContent>
    </Card>
  );
}
```

### 3.2 CalendarGrid Component (Week View Default)
```typescript
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  viewMode,
  tasks,
  onTaskClick,
  onDateSelect,
}) => {
  const calendarDays = useMemo(() => {
    // Calendar calculation logic - Week view by default
    return generateCalendarDays(currentDate, viewMode);
  }, [currentDate, viewMode]);

  return (
    <div className="calendar-grid grid gap-1 flex-1" 
         style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
      {/* Weekday headers */}
      {WEEKDAYS.map(day => (
        <div key={day} className="calendar-header-cell">
          {day}
        </div>
      ))}
      
      {/* Calendar cells - adaptive for week/month view */}
      {calendarDays.map(date => (
        <CalendarCell
          key={date.toISOString()}
          date={date}
          tasks={getTasksForDate(tasks, date)}
          onTaskClick={onTaskClick}
          onDateSelect={onDateSelect}
          viewMode={viewMode} // Pass viewMode for adaptive styling
        />
      ))}
    </div>
  );
};
```

### 3.3 CalendarCell Component với Adaptive Height for Week View
```typescript
export const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  tasks,
  isSelected,
  onTaskClick,
  onDateSelect,
  onViewAllTasks, // New handler for viewing all tasks of a day
  viewMode = 'week', // Default week view
}) => {
  const isToday = isSameDay(date, new Date());
  
  // ✅ ADAPTIVE HEIGHT: Week view gets more space per cell
  const cellHeight = viewMode === 'week' ? 'h-32' : 'h-24'; // Week: 128px, Month: 96px
  const maxVisibleTasks = viewMode === 'week' ? 5 : 3; // Week: 5 tasks, Month: 3 tasks
  
  // ✅ STRATEGY: Sort tasks by priority and time for better display
  const sortedTasks = useMemo(() => {
    return tasks.slice().sort((a, b) => {
      // Priority order: High > Medium > Low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by deadline time
      const timeA = new Date(a.deadline).getTime();
      const timeB = new Date(b.deadline).getTime();
      return timeA - timeB;
    });
  }, [tasks]);
  
  // ✅ DISPLAY STRATEGY: Adaptive for Week vs Month view
  const visibleTasks = sortedTasks.slice(0, maxVisibleTasks);
  const hiddenTasksCount = Math.max(0, sortedTasks.length - maxVisibleTasks);
  
  return (
    <div 
      className={cn(
        "calendar-cell p-1 border rounded-md cursor-pointer relative",
        cellHeight, // Adaptive height: h-32 (week) or h-24 (month)
        "hover:bg-muted/50 transition-colors",
        isSelected && "ring-2 ring-primary",
        isToday && "bg-accent",
        tasks.length > 0 && "has-tasks" // CSS class for styling cells with tasks
      )}
      onClick={() => onDateSelect(date)}
    >
      {/* Date Number */}
      <div className="text-sm font-medium flex justify-between items-center">
        <span>{format(date, 'd')}</span>
        {/* Task count indicator for many tasks */}
        {tasks.length > maxVisibleTasks && (
          <Badge variant="secondary" className="text-xs h-4 px-1">
            {tasks.length}
          </Badge>
        )}
      </div>
      
      {/* Task Cards - More space in week view */}
      <div className="space-y-1 mt-1 overflow-hidden">
        {visibleTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick(task);
            }}
            isCompact={viewMode === 'month'} // More compact in month view
            showTime={viewMode === 'week' || tasks.length <= 2} // Always show time in week view
            style={{
              // Slightly reduce opacity for lower priority tasks
              opacity: index > 2 ? 0.8 : 1,
            }}
          />
        ))}
        
        {/* Overflow Indicator - Clickable */}
        {hiddenTasksCount > 0 && (
          <div 
            className="text-xs text-muted-foreground hover:text-primary cursor-pointer font-medium py-1 px-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors text-center"
            onClick={(e) => {
              e.stopPropagation();
              onViewAllTasks(date, sortedTasks); // ✅ Open day details modal
            }}
          >
            +{hiddenTasksCount} more task{hiddenTasksCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      {/* Visual indicator for task density */}
      {tasks.length > 7 && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full opacity-60" />
      )}
    </div>
  );
};
```

### 3.4 TaskCard Mini Component với Enhanced Display
```typescript
export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  isCompact = false,
  showTime = false,
  style,
}) => {
  const statusColor = getStatusColor(task.status);
  const priorityIcon = getPriorityIcon(task.priority);
  
  return (
    <div
      className={cn(
        "task-card-mini rounded px-2 py-1 text-xs cursor-pointer relative",
        "border-l-2 hover:shadow-sm transition-all",
        isCompact ? "truncate" : "",
        // Priority-based styling
        task.priority === 'high' && "ring-1 ring-red-200 bg-red-50/50",
        task.priority === 'medium' && "ring-1 ring-yellow-200 bg-yellow-50/50",
      )}
      style={{
        borderLeftColor: statusColor,
        backgroundColor: `${statusColor}15`, // Slightly more visible
        ...style,
      }}
      onClick={onClick} // ✅ Triggers same dialog system as Table View
      title={`${task.name} - ${task.client?.name || 'No client'}`} // Tooltip
    >
      <div className="flex items-center gap-1">
        {/* Priority indicator */}
        {task.priority === 'high' && (
          <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
        )}
        
        {/* Task name */}
        <div className="font-medium truncate flex-1">
          {task.name}
        </div>
        
        {/* Status indicator dot */}
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      
      {/* Time display when requested and available */}
      {showTime && task.deadline && (
        <div className="text-muted-foreground text-xs mt-0.5">
          {format(new Date(task.deadline), 'HH:mm')}
        </div>
      )}
      
      {/* Client info for important tasks */}
      {!isCompact && task.client && (
        <div className="text-muted-foreground text-xs truncate">
          {task.client.name}
        </div>
      )}
    </div>
  );
};
```

### 3.5 ❌ REMOVED: DayDetailsModal - Over-engineered

**Lý do loại bỏ:**
- Thêm quá nhiều complexity cho use case đơn giản
- User có thể scroll trong calendar cell hoặc click từng task
- Dialog chồng dialog gây confusing UX
- Mobile touch experience phức tạp không cần thiết

**Giải pháp đơn giản hơn:**
- Khi quá nhiều tasks: cell hiển thị scroll indicator  
- User có thể scroll trong cell để xem thêm tasks
- Click task → mở dialog trực tiếp (không qua intermediate modal)
```

### 3.6 Calendar View với Day Details Integration
```typescript
export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  // Essential props only
  onEditTask,
  onTaskStatusChange,
  onDeleteTask,
  // ...other essential props
}) => {
  // ✅ SAME state management as TaskListItem
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);

  // ✅ SAME dialog flow as Table View
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsOpen(true); // Open readonly dialog first
  };

  const handleEditFromDetails = () => {
    setIsTaskDetailsOpen(false);
    setIsTaskEditOpen(true); // Switch to edit dialog
  };

  const handleCloseEditDialog = (updated?: boolean) => {
    setIsTaskEditOpen(false);
    setSelectedTask(null);
    // Same cleanup as Table View
  };

  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Simple calendar header */}
        <div className="flex items-center justify-between mb-4">
          {/* Navigation controls */}
        </div>
        
        {/* Calendar grid */}
        <CalendarGrid 
          currentDate={currentDate}
          viewMode={viewMode}
          tasks={tasks}
          onTaskClick={handleTaskClick} // ✅ Connect to dialog system
          onDateSelect={handleDateSelect}
        />
        
        {/* ✅ EXISTING: Task dialog system - SAME AS TABLE VIEW */}
        {selectedTask && (
          <>
            <TaskDetailsDialog
              task={selectedTask}
              // ... same props as table view
              isOpen={isTaskDetailsOpen}
              onOpenChange={setIsTaskDetailsOpen}
              onEdit={handleEditFromDetails}
              onStatusChange={onTaskStatusChange}
              onDelete={onDeleteTask}
            />
            
            <TaskEditDialog
              task={selectedTask}
              // ... same props as table view
              isOpen={isTaskEditOpen}
              onOpenChange={handleCloseEditDialog}
              onSubmit={onEditTask}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

### 3.6 Extract Dialog Components từ TaskListItem
```typescript
// 🔄 Refactor existing TaskListItem dialogs thành reusable components

// src/components/task-dialogs/TaskDetailsDialog.tsx
export const TaskDetailsDialog: React.FC<TaskDetailsDialogProps> = ({
  task,
  quotes,
  collaboratorQuotes,
  clients,
  collaborators,
  categories,
  settings,
  isOpen,
  onOpenChange,
  onEdit,
  onStatusChange,
  onDelete,
}) => {
  // ✅ Extract exact dialog content from TaskListItem
  // Same readonly view with task details, quotes, etc.
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-5xl h-[80vh] min-h-[600px] max-h-[90vh] flex flex-col">
        {/* ✅ Same content as existing isDetailsOpen dialog */}
        <TaskDetailsContent 
          task={task}
          quotes={quotes}
          collaboratorQuotes={collaboratorQuotes}
          clients={clients}
          collaborators={collaborators}
          categories={categories}
          settings={settings}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
};

// src/components/task-dialogs/TaskEditDialog.tsx  
export const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  task,
  // ...props
  isOpen,
  onOpenChange,
  onSubmit,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "flex flex-col",
          // Same sizing logic as existing edit dialog
        )}
      >
        {/* ✅ Same EditTaskForm as existing */}
        <EditTaskForm
          taskToEdit={task}
          onSubmit={onSubmit}
          setOpen={onOpenChange}
          // ...all existing props
        />
      </DialogContent>
    </Dialog>
  );
};
```

---

## 4. CSS Styling (Tuân thủ UI principles)

### 4.1 Calendar Grid Styling
```css
.calendar-grid {
  /* Consistent spacing & padding */
  min-height: 400px;
  gap: 1px;
  background: hsl(var(--border));
  border-radius: var(--radius);
  overflow: hidden;
}

.calendar-cell {
  /* Rounded corners */
  background: hsl(var(--background));
  border-radius: calc(var(--radius) - 1px);
  
  /* Subtle shadows */
  transition: box-shadow 0.2s ease;
}

.calendar-cell:hover {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.task-card-mini {
  /* Card-based UI */
  background: hsl(var(--muted) / 0.5);
  border-radius: calc(var(--radius) - 2px);
  
  /* Primary color usage cho border */
  border-left-width: 3px;
}

/* Responsive design */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 0.5px;
  }
  
  .calendar-cell {
    height: 80px;
    padding: 2px;
  }
  
  .task-card-mini {
    font-size: 10px;
    padding: 1px 4px;
  }
}
```

---

## 5. Internationalization

### 5.1 Thêm keys vào i18n.ts
```typescript
// Thêm vào src/lib/i18n.ts
export const en = {
  // ...existing keys...
  calendarView: 'Calendar View',
  tableView: 'Table View',
  monthView: 'Month',
  weekView: 'Week',
  dayView: 'Day',
  today: 'Today',
  previous: 'Previous',
  next: 'Next',
  navigation: 'Navigation',
  calendarFilters: 'Calendar Filters',
  moreTasks: 'more tasks',
  selectDate: 'Select date',
};

export const vi = {
  // ...existing keys...
  calendarView: 'Xem theo lịch',
  tableView: 'Xem theo bảng',
  monthView: 'Tháng',
  weekView: 'Tuần', 
  dayView: 'Ngày',
  today: 'Hôm nay',
  previous: 'Trước',
  next: 'Sau',
  navigation: 'Điều hướng',
  calendarFilters: 'Bộ lọc lịch',
  moreTasks: 'task khác',
  selectDate: 'Chọn ngày',
};
```

---

## 6. Filter Card Design cho Calendar View

### 6.1 Adaptive Filter Layout
Calendar View cần filter card khác với Table View để tối ưu trải nghiệm:

#### **Thay đổi khi ở Calendar View:**
1. **Ẩn Sort By** - Calendar tự động sort theo date
2. **Simplify Date Range** - Ưu tiên calendar navigation 
3. **Emphasize Status & Category** - Quan trọng hơn trong visual view
4. **Add Calendar Controls** - Navigation và view mode trong filter card

### 6.2 Backward Compatibility Strategy
**🔒 Đảm bảo không phá vỡ logic hiện tại:**

```typescript
// Trong DashboardContent component
const FiltersComponent = ({ inSheet = false }: { inSheet?: boolean }) => {
  // ✅ PRESERVED: Tất cả filter logic hiện tại được giữ nguyên
  const {
    selectedStatuses,
    categoryFilter, 
    clientFilter,
    startDateFilter,
    endDateFilter,
    sortFilter,
    handleStatusFilterChange,
    handleStatusDoubleClick,
    handleCategoryChange,
    handleClientChange,
    handleSortChange,
    handleDateRangeChange,
    handleClearFilters,
    // ...all existing handlers preserved
  } = useExistingFilterLogic(); // Tách logic hiện tại thành hook

  // 🆕 NEW: Conditional rendering based on view mode
  if (currentViewMode === 'calendar') {
    return (
      <CalendarFiltersComponent 
        inSheet={inSheet}
        // ✅ REUSE: Same filter handlers, just different UI
        selectedStatuses={selectedStatuses}
        categoryFilter={categoryFilter}
        clientFilter={clientFilter}
        onStatusChange={handleStatusFilterChange}
        onStatusDoubleClick={handleStatusDoubleClick}
        onCategoryChange={handleCategoryChange}
        onClientChange={handleClientChange}
        onClearFilters={handleClearFilters}
        // ❌ EXCLUDED: sortFilter, startDateFilter, endDateFilter
        // These are not shown in calendar UI but still work in background
      />
    );
  }
  
  // ✅ PRESERVED: Original table filters unchanged
  return (
    <TableFiltersComponent 
      inSheet={inSheet}
      // All existing props and logic preserved
      selectedStatuses={selectedStatuses}
      categoryFilter={categoryFilter}
      clientFilter={clientFilter}
      startDateFilter={startDateFilter}
      endDateFilter={endDateFilter}
      sortFilter={sortFilter}
      onStatusChange={handleStatusFilterChange}
      onStatusDoubleClick={handleStatusDoubleClick}
      onCategoryChange={handleCategoryChange}
      onClientChange={handleClientChange}
      onSortChange={handleSortChange}
      onDateRangeChange={handleDateRangeChange}
      onClearFilters={handleClearFilters}
    />
  );
};
```

### 6.3 ❌ SIMPLIFIED: Calendar Filter Component 

**Removed duplication:** Calendar navigation is already in the calendar header, no need to duplicate in filters.

```typescript
const CalendarFiltersComponent = ({ 
  inSheet = false,
  // ✅ REUSE existing filter state & handlers (ONLY essential ones)
  selectedStatuses,
  categoryFilter,
  clientFilter,
  onStatusChange,
  onCategoryChange,
  onClientChange,
  onClearFilters,
}: CalendarFiltersProps) => (
  <div className={cn("grid gap-4", inSheet ? "grid-cols-3" : "md:grid-cols-4")}>
    
    {/* Status Filter - ✅ SAME as table view */}
    <div className="flex flex-col justify-between">
      <label className="text-sm font-medium text-muted-foreground block mb-2">{T.status}</label>
      {/* Same status filter UI as table view */}
    </div>

    {/* Category Filter - ✅ SAME as table view */}
    <div className="flex flex-col justify-between">
      <label className="text-sm font-medium text-muted-foreground block mb-2">{T.category}</label>
      {/* Same category filter UI as table view */}
    </div>

    {/* Client Filter - ✅ SAME as table view */}
    <div className="flex flex-col justify-between">
      <label className="text-sm font-medium text-muted-foreground block mb-2">{T.client}</label>
      {/* Same client filter UI as table view */}
    </div>

    {/* Clear Filters - ✅ SAME as table view */}
    <div className="flex items-end">
      <Button onClick={onClearFilters} variant="outline" size="sm" className="w-full">
        <XCircle className="mr-2 h-4 w-4" />
        {T.clearFilters}
      </Button>
    </div>
  </div>
);
```

---

## 6.4 User Flow Diagram cho Calendar View

### 🎯 **User Journey: Calendar View Experience**

```
📱 ENTRY POINTS
├── Dashboard Home
├── Direct URL (/dashboard?view=calendar)
└── Saved View Mode (localStorage)

👤 USER OPENS CALENDAR VIEW
├── 📋 Filter Card adapts to Calendar Mode
│   ├── ✅ Keep: Status, Category, Client filters  
│   ├── ➕ Add: Calendar Navigation (Prev/Today/Next)
│   └── ❌ Hide: Sort By, Date Range (still work in background)
│
├── 📅 Calendar Grid displays
│   ├── Current month view (default)
│   ├── Tasks grouped by deadline date
│   └── Mini task cards with status colors
│
└── 🎛️ View Mode Toggle shows Calendar selected

🖱️ USER INTERACTIONS

1️⃣ FILTER TASKS
├── Click Status Color → Filter by status ✅ (same logic)
├── Select Category → Filter by category ✅ (same logic) 
├── Select Client → Filter by client ✅ (same logic)
└── Clear Filters → Reset all ✅ (same logic)

2️⃣ NAVIGATE CALENDAR
├── Click "Previous" → Go to previous month
├── Click "Today" → Jump to current month
├── Click "Next" → Go to next month
└── Click Date Cell → Select date (future: create task)

3️⃣ INTERACT WITH TASKS
├── Click Task Card → Open Edit Task Dialog ✅ (existing)
├── Hover Task Card → Show tooltip with details
└── See "3+ more" → Click to view full day tasks

4️⃣ SWITCH VIEWS
├── Click "Table View" → Switch to Table (filters preserved)
├── Click "Calendar View" → Stay in Calendar
└── Mobile: Use Sheet filters

📊 DATA FLOW
```
User Action → Filter Logic → Filtered Tasks → Calendar Display
     ↓              ↓            ↓              ↓
  Click Filter → Same Handler → Background → Visual Update
  Navigate Cal → New Handler  → Date Change → Grid Refresh  
  Click Task   → Edit Handler → Task Dialog → Form Opens
```

### 🔄 **State Management Flow**

```typescript
// Current State (Preserved)
const filteredTasks = useMemo(() => {
  // ✅ ALL existing filter logic unchanged
  let sourceTasks = view === 'active' ? ... : ...;
  
  // Status, Category, Client filtering - SAME
  const filtered = sourceTasks.filter((task: Task) => {
    const statusMatch = selectedStatuses.includes(task.status);
    const categoryMatch = !categoryFilter || task.categoryId === categoryFilter;
    const clientMatch = !clientFilter || task.clientId === clientFilter;
    const dateMatch = ... // Date range still works but hidden in calendar UI
    return statusMatch && categoryMatch && clientMatch && dateMatch;
  });
  
  // Sort still works but hidden in calendar UI
  return filtered.slice().sort(...);
}, [tasks, selectedStatuses, categoryFilter, clientFilter, ...]);

// New Calendar State (Added)
const [calendarDate, setCalendarDate] = useState(new Date());
const [calendarViewMode, setCalendarViewMode] = useState('month');

// Calendar-specific filtering
const calendarTasks = useMemo(() => {
  return filteredTasks.filter(task => {
    const taskDate = new Date(task.deadline);
    // Show tasks in current calendar month
    return taskDate.getMonth() === calendarDate.getMonth() &&
           taskDate.getFullYear() === calendarDate.getFullYear();
  });
}, [filteredTasks, calendarDate]);
```

### 📱 **Mobile User Flow**

```
📱 Mobile Experience:
├── Tap "Filters" Button → Sheet opens from bottom
├── Sheet shows Calendar-specific filters
├── Tap Calendar Navigation buttons → Navigate months
├── Tap View Toggle → Switch Table/Calendar
├── Tap Task Card → Edit dialog (fullscreen on mobile)
└── Swipe Calendar → Navigate months (future enhancement)
```

---

## 6.5 Conditional Filter Rendering
```typescript
// ✅ ZERO IMPACT on existing functionality
const FiltersComponent = ({ inSheet = false }: { inSheet?: boolean }) => {
  // All existing filter logic extracted to reusable hook
  const filterLogic = useFilterLogic(); // Contains all current handlers
  
  // 🔄 Conditional rendering - NEW, but doesn't break anything
  if (currentViewMode === 'calendar') {
    return (
      <CalendarFiltersComponent 
        inSheet={inSheet}
        {...filterLogic} // ✅ Reuse ALL existing logic
        currentDate={calendarDate}
        onCalendarNavigation={handleCalendarNavigation} // ➕ Only new handler
      />
    );
  }
  
  // ✅ Original table filters - UNCHANGED
  return <TableFiltersComponent inSheet={inSheet} {...filterLogic} />;
};

// ✅ No changes to existing filter handlers
const useFilterLogic = () => {
  // All current logic moved here, unchanged:
  // handleStatusFilterChange, handleCategoryChange, etc.
  return {
    selectedStatuses,
    categoryFilter,
    clientFilter,
    startDateFilter, // Still available for table view
    endDateFilter,   // Still available for table view  
    sortFilter,      // Still available for table view
    handleStatusFilterChange,
    handleStatusDoubleClick,
    handleCategoryChange,
    handleClientChange,
    handleSortChange,        // Hidden in calendar but still works
    handleDateRangeChange,   // Hidden in calendar but still works
    handleClearFilters,
  };
};
```

---

## 📊 Visual User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        📱 DASHBOARD ENTRY                               │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    🎛️ VIEW MODE SELECTION                              │
│  ┌─────────────────┐                    ┌─────────────────┐             │
│  │   📋 Table      │◄──────────────────►│   📅 Calendar   │             │
│  │   (Current)     │                    │   (New)         │             │
│  └─────────────────┘                    └─────────────────┘             │
└─────────────────────────┬───────────────────────┬─────────────────────────┘
                          │                       │
            ✅ EXISTING   │                       │  🆕 NEW IMPLEMENTATION
                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      🎯 FILTER CARD ADAPTS                             │
├─────────────────────────────────┬───────────────────────────────────────┤
│         📋 TABLE FILTERS        │         📅 CALENDAR FILTERS          │
│                                 │                                       │
│  ✅ Status (Color Swatches)     │  ✅ Status (Same Logic)              │
│  ✅ Category (Dropdown)         │  ✅ Category (Same Logic)            │
│  ✅ Client (Dropdown)           │  ✅ Client (Same Logic)              │
│  ✅ Date Range (Calendar)       │  ➕ Navigation (Prev/Today/Next)     │
│  ✅ Sort By (Dropdown)          │  ❌ Hidden: Date Range, Sort By      │
│  ✅ Clear Filters (Button)      │  ✅ Clear Filters (Same Logic)       │
│                                 │                                       │
│  📊 Grid: 5 columns             │  📊 Grid: 4 columns                  │
└─────────────────────────────────┼───────────────────────────────────────┤
                                  │                                       │
                                  ▼                                       │
┌─────────────────────────────────────────────────────────────────────────┤
│                    📅 CALENDAR GRID DISPLAY                            │
│                                                                         │
│  ┌───┬───┬───┬───┬───┬───┬───┐                                         │
│  │ M │ T │ W │ T │ F │ S │ S │  ← Weekday Headers                     │
│  ├───┼───┼───┼───┼───┼───┼───┤                                         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │                                         │
│  │   │[T]│   │[T]│   │   │   │  ← Task Cards (filtered)               │
│  ├───┼───┼───┼───┼───┼───┼───┤                                         │
│  │ 8 │ 9 │10 │11 │12 │13 │14 │                                         │
│  │[T]│   │[T]│   │+2 │   │[T]│  ← +2 more tasks indicator             │
│  └───┴───┴───┴───┴───┴───┴───┘                                         │
│                                                                         │
│  Legend: [T] = Task Card, +2 = More tasks indicator                    │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    🖱️ USER INTERACTIONS                                │
│                                                                         │
│  1️⃣ FILTER ACTIONS (Same as Table View)                               │
│     ├── Click Status Color → Filter by status                          │
│     ├── Select Category → Filter tasks                                 │
│     ├── Select Client → Filter tasks                                   │
│     └── Clear Filters → Reset all                                      │
│                                                                         │
│  2️⃣ CALENDAR NAVIGATION (New)                                         │
│     ├── Click "Previous" → Previous month                              │
│     ├── Click "Today" → Current month                                  │
│     ├── Click "Next" → Next month                                      │
│     └── Click Date Cell → Select date                                  │
│                                                                         │
│  3️⃣ TASK INTERACTIONS (Same as Table View - Enhanced)              │
│     ├── Click Task Card → Open Readonly Task Details Dialog ✅        │
│     ├── In Details Dialog: Click "Edit" → Open Edit Dialog ✅         │
│     ├── In Details Dialog: Change Status → Update task ✅             │
│     ├── In Details Dialog: Delete → Delete confirmation ✅            │
│     ├── Hover Task → Show tooltip                                     │
│     └── Click "+2 more" → Show day details                             │
│                                                                         │
│  4️⃣ VIEW SWITCHING (Enhanced)                                         │
│     ├── Table ←→ Calendar (filters preserved)                          │
│     └── View preference saved in localStorage                          │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      📱 MOBILE ADAPTATIONS                             │
│                                                                         │
│  📲 Sheet Filters (Bottom)                                             │
│  ├── Calendar-specific filter layout                                   │
│  ├── Touch-friendly navigation buttons                                 │
│  └── Compact view toggle                                               │
│                                                                         │
│  📅 Calendar Grid (Responsive)                                         │
│  ├── Smaller cells (h-20 → h-16)                                       │
│  ├── Fewer task cards per cell (3 → 2)                                 │
│  └── Touch gestures for navigation                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 🔄 **Data Flow Architecture**

```
🗃️ EXISTING DATA LAYER (Unchanged)
┌─────────────────────────────────────────────────────────────────┐
│  DashboardContext                                               │
│  ├── tasks[] (all tasks)                                       │
│  ├── filteredTasks[] (status/category/client filtered)         │
│  ├── handleEditTask() ✅                                       │
│  ├── handleTaskStatusChange() ✅                               │
│  └── handleDeleteTask() ✅                                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
🎯 FILTER LAYER (Enhanced but Backward Compatible)
┌─────────────────────────────────────────────────────────────────┐
│  useFilterLogic() Hook                                          │
│  ├── selectedStatuses ✅ (works in both views)                 │
│  ├── categoryFilter ✅ (works in both views)                   │
│  ├── clientFilter ✅ (works in both views)                     │
│  ├── startDateFilter ✅ (hidden in calendar, works in table)   │
│  ├── endDateFilter ✅ (hidden in calendar, works in table)     │
│  ├── sortFilter ✅ (hidden in calendar, works in table)        │
│  └── All handlers ✅ (reused, zero changes)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
📋 TABLE VIEW             📅 CALENDAR VIEW
┌─────────────────┐      ┌─────────────────┐
│ TableFilters    │      │ CalendarFilters │
│ (All filters)   │      │ (Subset + Nav)  │
│                 │      │                 │
│ TableView       │      │ CalendarView    │
│ (List/Grid)     │      │ (Calendar Grid) │
└─────────────────┘      └─────────────────┘
        ▲                         ▲
        │                         │
        └─────────┬─────────────────┘
                  │
                  ▼
            💾 PERSISTENCE
    ┌─────────────────────────┐
    │ localStorage            │
    │ ├── filters ✅         │
    │ ├── viewMode ✅        │
    │ └── calendarDate 🆕    │
    └─────────────────────────┘
```

---

## ❌ REMOVED: Complex Calendar View Mode Toggle & Mobile Filters

**Over-engineered components removed:**
- Separate CalendarViewModeToggle component (already in header)
- Complex mobile filter sheet with duplicate controls  
- Multiple conditional render logic for mobile calendar controls

**Simple approach:**
- View mode toggle integrated into calendar header
- Same filter components for mobile (responsive design)
- No duplicate navigation or mode controls
```

---

## 📋 SUMMARY: Removed Over-Engineering

### ❌ **Features Removed for Simplicity:**

1. **Complex Component Architecture:**
   - `CalendarHeader.tsx` - merged into main component
   - `ViewModeToggle.tsx` - integrated inline  
   - `shared-dialog-content.tsx` - unnecessary abstraction
   - Separate `TaskItemInDay` component

2. **Over-Engineered Interactions:**
   - `DayDetailsModal` - intermediate modal complexity
   - 3-tier task display strategy
   - Complex density-based styling and behavior
   - Multiple interaction flows for different task counts

3. **Premature Optimizations:**
   - Virtual scrolling for calendar
   - Lazy loading components
   - Complex memoization strategies
   - Advanced animation systems

4. **Unnecessary Features:**
   - Day view mode (Week + Month sufficient)
   - Drag & drop functionality (YAGNI)
   - Swipe gestures (browser inconsistencies)
   - Complex priority styling functions
   - Task density visual indicators

5. **Duplicate UI Elements:**
   - Calendar navigation in filters (already in header)
   - Separate view mode toggles
   - Multiple conditional mobile layouts

### ✅ **Simplified Approach:**

- **2 view modes:** Week (default) + Month only
- **Direct interactions:** Click task → Task dialog (same as table)
- **Simple components:** CalendarGrid, CalendarCell, TaskCard + extracted dialogs
- **Consistent UX:** Same dialog flow as Table View
- **Clean architecture:** Minimal abstractions, clear responsibilities
- **Focus on essentials:** Core calendar functionality without bloat

**Result:** A maintainable, performant calendar view that integrates seamlessly with existing table functionality without unnecessary complexity.
