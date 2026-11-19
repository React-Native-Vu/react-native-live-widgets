# 🎭 Maestro End-to-End Test Suite

Bộ kịch bản kiểm thử tự động toàn diện (OS-level E2E UI Tests) cho thư viện **`react-native-live-widgets`**.

---

## 📋 Danh sách 7 Kịch bản & Tính năng kiểm thử:

| STT | File Kịch bản | Tính năng được kiểm chứng |
| :---: | :--- | :--- |
| **01** | [`01_live_activity_lifecycle.yaml`](01_live_activity_lifecycle.yaml) | Vòng đời **Live Activities & Dynamic Island**: Khởi chạy, hiển thị trên Dynamic Island, mở Notification Center màn hình khóa, quay lại app và kết thúc activity. |
| **02** | [`02_interactive_counter.yaml`](02_interactive_counter.yaml) | Tương tác 2 chiều **Interactive Buttons** (`+1`, `-1`, `Reset 0`), đồng bộ trạng thái giữa App và Home Screen Widget qua `useWidgetAction`. |
| **03** | [`03_data_binding_and_api_sync.yaml`](03_data_binding_and_api_sync.yaml) | **Data Binding Engine 2.0** & **Remote API Sync**: Đổi mock data động, nạp remote config khi app bị force-kill, gọi API cập nhật dữ liệu. |
| **04** | [`04_timeline_and_auto_cycle.yaml`](04_timeline_and_auto_cycle.yaml) | **Timeline Entries & Auto-Cycle Scheduler**: Lập lịch đa mốc thời gian (15 mốc timeline) và chế độ tự động xoay vòng dữ liệu ngầm. |
| **05** | [`05_system_permissions_and_tokens.yaml`](05_system_permissions_and_tokens.yaml) | **Quyền Hệ thống & Mã APNs Push Token**: Kiểm tra quyền Live Activity, Frequent Pushes, quét tiến trình ngầm và làm mới Device Token, Push-to-Start Token. |
| **06** | [`06_control_widget_and_lifecycle_suite.yaml`](06_control_widget_and_lifecycle_suite.yaml) | **Control Widgets (iOS 18+ & Android Quick Settings)** & **Alert Updates**: Cấu hình nút Toggle, nút Action trong Control Center và gửi cập nhật ưu tiên cao. |
| **07** | [`07_preset_switching_gallery.yaml`](07_preset_switching_gallery.yaml) | **Widget Gallery & Multi-Slot Layouts**: Đổi giữa các mẫu giao diện (Shift Attendance, Interactive Pro, Workspace) và đồng bộ ra Home Screen. |

---

## 🚀 Cách chạy kiểm thử

### 1. Chạy toàn bộ 7 kịch bản (Full Test Suite):
```bash
cd /Users/tt/works/fastdo/react-native-live-widgets
maestro test .maestro/full_suite.yaml
```

### 2. Hoặc chạy từng kịch bản riêng lẻ:
```bash
# Test riêng Live Activities & Dynamic Island:
maestro test .maestro/01_live_activity_lifecycle.yaml

# Test riêng nút bấm tương tác Counter:
maestro test .maestro/02_interactive_counter.yaml

# Test riêng Data Binding & API Sync:
maestro test .maestro/03_data_binding_and_api_sync.yaml
```
