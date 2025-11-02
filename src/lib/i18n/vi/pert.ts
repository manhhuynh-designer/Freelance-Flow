// src/lib/i18n/vi/pert.ts
// Bản dịch Tiếng Việt cho PERT Diagram

export const vi_pert = {
  // PERT Diagram Header
  pertDiagram: 'Sơ đồ PERT',
  pertDiagramTitle: 'Sơ đồ PERT',
  
  // Project nodes
  projectStart: 'Khởi đầu dự án',
  projectEnd: 'Kết thúc dự án',
  
  // Toolbar buttons
  calculateCriticalPath: 'Tính đường găng',
  autoLayout: 'Tự động sắp xếp',
  resetDiagram: 'Đặt lại sơ đồ',
  addExistingTasks: 'Thêm task có sẵn',
  createTask: 'Tạo task mới',
  createProject: 'Tạo dự án mới',
  manageProjectTasks: 'Chi tiết dự án và tasks',
  projectDetails: 'Chi tiết dự án',
  
  // Stats labels
  totalDuration: 'Tổng thời gian',
  criticalPathLength: 'Đường găng',
  totalTasks: 'Tổng số task',
  completedTasks: 'Task hoàn thành',
  
  // Project card
  tasks: 'Tasks',
  
  // Time estimates
  optimistic: 'Lạc quan (O)',
  mostLikely: 'Khả năng nhất (M)',
  pessimistic: 'Bi quan (P)',
  expected: 'Kỳ vọng',
  
  // Dependency types
  finishToStart: 'Kết thúc → Bắt đầu (FS)',
  startToStart: 'Bắt đầu → Bắt đầu (SS)',
  finishToFinish: 'Kết thúc → Kết thúc (FF)',
  startToFinish: 'Bắt đầu → Kết thúc (SF)',
  
  // Edge labels
  fs: 'KT-BD',
  ss: 'BD-BD',
  ff: 'KT-KT',
  sf: 'BD-KT',
  
  // Edge tooltips
  dependency: 'Quan hệ phụ thuộc',
  criticalPath: 'Đường găng',
  lagTime: 'Thời gian trễ',
  duration: 'Thời lượng',
  days: 'ngày',
  
  // Dependency type descriptions
  fsDescription: 'Kết thúc → Bắt đầu: Task A phải kết thúc trước khi Task B có thể bắt đầu.',
  ssDescription: 'Bắt đầu → Bắt đầu: Task A phải bắt đầu trước khi Task B có thể bắt đầu.',
  ffDescription: 'Kết thúc → Kết thúc: Task A phải kết thúc trước khi Task B có thể kết thúc.',
  sfDescription: 'Bắt đầu → Kết thúc: Task A phải bắt đầu trước khi Task B có thể kết thúc.',
  doubleClickToEdit: 'Double-click để chỉnh sửa',
  
  // Messages
  noTasksWithPertEstimates: 'Không tìm thấy task nào có ước tính PERT',
  pertCalculationError: 'Lỗi khi tính toán PERT',
  
  // Tooltips
  criticalPathTooltip: 'Tính đường găng - đường dài nhất qua sơ đồ',
  autoLayoutTooltip: 'Tự động sắp xếp các node theo thứ tự logic',
  resetDiagramTooltip: 'Đặt lại vị trí và layout của sơ đồ',
  
  // Dialog
  editTaskEstimates: 'Chỉnh sửa ước tính task',
  enterPertTimesInDays: 'Nhập thời gian lạc quan, khả năng nhất và bi quan (đơn vị: ngày).',
  editDependency: 'Chỉnh sửa quan hệ phụ thuộc',
  dependencyType: 'Loại quan hệ',
  save: 'Lưu',
  cancel: 'Hủy',
  
  // Node menu
  editPert: 'Chỉnh sửa PERT',
  editTask: 'Chỉnh sửa Task',
  removeFromProject: 'Xóa khỏi dự án',
  
  // Validation
  optimisticMustBeLessThanMostLikely: 'Thời gian lạc quan phải nhỏ hơn thời gian khả năng nhất',
  mostLikelyMustBeLessThanPessimistic: 'Thời gian khả năng nhất phải nhỏ hơn thời gian bi quan',
  allTimesMustBePositive: 'Tất cả thời gian phải là số dương',
  
  // Empty states
  noProjectsAvailable: 'Chưa có dự án nào',
  createYourFirstProject: 'Tạo dự án đầu tiên của bạn',
  noTasksInProject: 'Chưa có task nào trong dự án này',
  addTasksToGetStarted: 'Thêm task để bắt đầu',
  
  // Project Details Dialog
  manageProjectTasksTitle: 'Dự án',
  projectName: 'Tên dự án',
  description: 'Mô tả',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  status: 'Trạng thái',
  planning: 'Lên kế hoạch',
  active: 'Đang thực hiện',
  completed: 'Hoàn thành',
  onHold: 'Tạm dừng',
  archived: 'Đã lưu trữ',
  client: 'Khách hàng',
  selectClient: 'Chọn khách hàng',
  noClient: 'Không có khách hàng',
  projectLinks: 'Liên kết dự án',
  addLink: 'Thêm liên kết',
  tasksInProject: 'Tasks trong dự án này',
  taskRemoved: 'Đã xóa task',
  removedFromProject: 'đã xóa khỏi dự án',
  error: 'Lỗi',
  failedToRemoveTask: 'Không thể xóa task',
  close: 'Đóng',
  projectUpdated: 'Đã cập nhật dự án',
  projectUpdatedDesc: 'đã lưu.',
  failedToSaveProject: 'Không thể lưu dự án',
  saveChanges: 'Lưu thay đổi',
  
  // Eisenhower Priority
  eisenhowerPriority: 'Ưu tiên',
  quadrant_do: 'Làm',
  quadrant_decide: 'Quyết định',
  quadrant_delegate: 'Ủy quyền',
  quadrant_delete: 'Loại bỏ',
  clearLabel: 'Xóa',
  
  // Time Estimates
  timeEstimates: 'Ước lượng thời gian',
  pertAnalysis: 'Phân tích PERT',
};
