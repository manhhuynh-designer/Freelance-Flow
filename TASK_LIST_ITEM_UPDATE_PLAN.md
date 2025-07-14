# Kế Hoạch Update UI cho task-list-item.tsx

## Tổng quan thay đổi
Đã cập nhật `task-list-item.tsx` để tương thích với cấu trúc dữ liệu mới từ `quote-manager.tsx`, `edit-task-form.tsx` và `quote-section-improved.tsx`, đồng thời cải thiện UI để hỗ trợ người dùng xem và truy vấn thông tin tốt hơn.

## Các cải tiến chính

### 1. **Hỗ trợ Row Formula tính toán động**
- ✅ Thêm helper function `calculateRowValue()` để xử lý formula cho từng ô
- ✅ Cập nhật tính toán `totalQuote` và `totalCollabQuote` với hỗ trợ rowFormula
- ✅ Hiển thị giá trị tính toán trong bảng quote thay vì chỉ giá trị thô

### 2. **Enhanced Calculation Results**
- ✅ Thay thế logic calculation cũ bằng hệ thống mới hỗ trợ:
  - Sum, Average, Min, Max calculations
  - Custom formula calculations
  - Proper error handling cho eval expressions
- ✅ Tách biệt calculation results cho main quote và collaborator quote
- ✅ Hiển thị calculation type rõ ràng (Sum, Average, etc.)

### 3. **Quick Preview Feature**
- ✅ Thêm nút expand/collapse trong cột Price Quote
- ✅ Quick preview row hiển thị:
  - Top 3 calculation results
  - Số lượng sections và items
  - Net profit (nếu có collaborator quote)
- ✅ Không làm gián đoạn workflow chính

### 4. **Improved Data Display**
- ✅ Enhanced quote table với hỗ trợ formula values
- ✅ Better type safety với proper TypeScript imports
- ✅ Fixed undefined checks cho briefLink và driveLink arrays
- ✅ Proper formatting cho tất cả number values

### 5. **Code Quality Improvements**
- ✅ Removed duplicate calculation logic
- ✅ Added proper TypeScript types
- ✅ Enhanced error handling
- ✅ Better separation of concerns

## Tính năng mới cho người dùng

### Quick Quote Preview
- **Mục đích**: Xem nhanh thông tin quote quan trọng không cần mở detail dialog
- **Cách dùng**: Click vào mũi tên bên cạnh giá quote trong bảng
- **Hiển thị**: 
  - Calculation results (sum, average, etc.)
  - Thống kê cơ bản (sections, items)
  - Net profit nếu có collaborator

### Enhanced Quote Details
- **Calculation Results**: Hiển thị đầy đủ tất cả calculation types
- **Formula Support**: Tự động tính toán và hiển thị giá trị formula
- **Better Organization**: Phân chia rõ ràng main quote vs collaborator quote

## Compatibility & Performance

### Tương thích ngược
- ✅ Hoàn toàn tương thích với data structure cũ
- ✅ Fallback values cho missing properties
- ✅ Không break existing functionality

### Performance
- ✅ Memoized calculations để tránh re-render không cần thiết
- ✅ Lazy rendering cho quick preview
- ✅ Efficient formula evaluation

## UI/UX Improvements

### Tối giản nhưng thông tin đầy đủ
- **List view**: Tetain tính tối giản với quick preview option
- **Detail view**: Enhanced với calculation results rõ ràng
- **Visual hierarchy**: Clear separation giữa different types of calculations

### Accessibility
- ✅ Proper ARIA labels
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

## Testing Considerations

### Test Cases cần kiểm tra:
1. **Basic quote display** - với và không có calculations
2. **Row formula calculations** - verify math accuracy
3. **Quick preview toggle** - expand/collapse functionality
4. **Multiple calculation types** - sum, average, min, max, custom
5. **Collaborator quotes** - net profit calculation
6. **Edge cases** - empty quotes, invalid formulas, missing data

### Data Validation
1. **Formula syntax** - proper column ID replacement
2. **Number formatting** - locale-specific display
3. **Error handling** - graceful degradation for invalid formulas

## Kết luận

Update này đạt được mục tiêu:
- ✅ **Tương thích đầy đủ** với cấu trúc dữ liệu mới
- ✅ **Giữ tính tối giản** của list view
- ✅ **Cải thiện khả năng truy vấn thông tin** với quick preview
- ✅ **Enhanced calculation display** cho power users
- ✅ **Better error handling** và type safety

UI mới giúp người dùng:
- Xem quick summary không cần mở detail dialog
- Hiểu rõ calculation results
- Track net profit từ collaborator quotes
- Làm việc hiệu quả hơn với complex quotes
