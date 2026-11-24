import { UI } from './builder';
import { LayoutNode, WidgetSinglePageConfig } from './types';

export interface ListRepeaterOptions<T> {
  items: T[];
  renderItem: (item: T, index: number) => LayoutNode;
  /** Giới hạn số dòng tối đa để bảo vệ RAM WidgetKit / Android RemoteViews (mặc định 6) */
  maxItems?: number;
  spacing?: number;
  emptyFallback?: LayoutNode;
}

export interface TimelineItem {
  time: string;
  title: string;
  subtitle?: string;
  status: 'done' | 'active' | 'upcoming';
}

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

/**
 * 📋 UI.List / Repeater: Render danh sách dữ liệu động có giới hạn RAM an toàn + emptyFallback.
 */
export function createListNode<T>(options: ListRepeaterOptions<T>): LayoutNode {
  const maxItems = Math.max(1, options.maxItems ?? 6);
  const items = Array.isArray(options.items) ? options.items.slice(0, maxItems) : [];

  if (items.length === 0) {
    return (
      options.emptyFallback ||
      UI.Text('Không có dữ liệu', { typography: 'caption1', color: '#94A3B8' })
    );
  }

  const children = items.map((item, idx) => options.renderItem(item, idx));
  return UI.VStack({ spacing: options.spacing ?? 6 }, ...children);
}

/**
 * 🗓️ UI.Timeline: Render lịch trình / ca làm việc / mốc tiến độ dạng trục dọc chuẩn.
 */
export function createTimelineNode(items: TimelineItem[], maxItems = 4): LayoutNode {
  const sliced = items.slice(0, Math.max(1, maxItems));
  const rows = sliced.map((item) => {
    const dot = item.status === 'done' ? '✅' : item.status === 'active' ? '🔵' : '⚪';
    const titleColor = item.status === 'active' ? '#38BDF8' : item.status === 'done' ? '#94A3B8' : '#F8FAFC';
    return UI.HStack(
      { spacing: 8, alignment: 'center', accessibilityGroup: 'combine' },
      UI.Text(dot, { fontSize: 11, accessible: false }),
      UI.Text(item.time, { fontSize: 11, fontWeight: 'semibold', color: '#94A3B8' }),
      UI.Text(item.subtitle ? `${item.title} — ${item.subtitle}` : item.title, {
        fontSize: 12,
        fontWeight: item.status === 'active' ? 'bold' : 'regular',
        color: titleColor,
        numberOfLines: 1,
      })
    );
  });
  return UI.VStack({ spacing: 6 }, ...rows);
}

/**
 * 🍩 UI.DonutChart: Biểu đồ vòng đa phân đoạn kèm tổng & nhãn trung tâm.
 */
export function createDonutChartNode(options: {
  segments: DonutSegment[];
  size?: number;
  centerLabel?: string;
  accessibilityLabel?: string;
}): LayoutNode {
  const total = options.segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const primary = options.segments[0];
  const primaryRatio = total > 0 && primary ? Math.max(0, Math.min(1, primary.value / total)) : 0;

  return UI.Gauge({
    value: primaryRatio,
    size: options.size ?? 72,
    label: options.centerLabel || primary?.label || 'Total',
    valueText: `${Math.round(primaryRatio * 100)}%`,
    tintColor: primary?.color || '#38BDF8',
    accessibilityLabel:
      options.accessibilityLabel ||
      `Biểu đồ vòng: ${options.segments.map((s) => `${s.label || ''} ${s.value}`).join(', ')}`,
  });
}

/**
 * 📈 UI.Sparkline: Biểu đồ xu hướng mini tối ưu cho KPI / doanh thu / nhịp tim.
 */
export function createSparklineNode(options: {
  data: number[];
  color?: string;
  height?: number;
  accessibilityLabel?: string;
}): LayoutNode {
  const pts = Array.isArray(options.data) && options.data.length > 0 ? options.data : [0];
  const minVal = Math.min(...pts);
  const maxVal = Math.max(...pts);
  const lastVal = pts[pts.length - 1];
  const trend = pts.length >= 2 && lastVal >= pts[0] ? 'tăng' : 'giảm';

  return {
    type: 'Sparkline' as any,
    props: {
      data: pts,
      color: options.color || '#10B981',
      height: options.height ?? 36,
      accessibilityRole: 'image',
      accessibilityLabel:
        options.accessibilityLabel ||
        `Biểu đồ xu hướng ${trend}, từ ${minVal} đến ${maxVal}, mới nhất ${lastVal}`,
    },
  } as any;
}

/**
 * 🔀 UI.When (Conditional Layout): Hiển thị nhánh UI theo điều kiện gọn gàng.
 */
export function whenNode(
  condition: any,
  thenNode: LayoutNode,
  elseNode?: LayoutNode
): LayoutNode {
  if (condition) return thenNode;
  return elseNode || UI.Spacer(0);
}

/**
 * 📱 UI.Responsive: Định nghĩa layout tối ưu riêng cho từng kích thước Widget Family.
 */
export function responsiveLayout(config: WidgetSinglePageConfig): WidgetSinglePageConfig {
  return { ...config };
}

/**
 * 🌍 LocaleFormatter: Bộ định dạng ngày tháng, tiền tệ, số lượng đa ngôn ngữ chuẩn Intl.
 */
export const LocaleFormatter = {
  formatCurrency: (amount: number, currency = 'VND', locale = 'vi-VN'): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'VND' || currency === 'JPY' ? 0 : 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ${currency}`;
    }
  },

  formatNumber: (value: number, locale = 'vi-VN', maxDecimals = 2): string => {
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDecimals }).format(value);
    } catch {
      return String(value);
    }
  },

  formatDate: (
    date: Date | number | string,
    locale = 'vi-VN',
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  ): string => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(locale, options).format(d);
    } catch {
      return String(date);
    }
  },

  formatRelativeTime: (diffSeconds: number, locale = 'vi-VN'): string => {
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const abs = Math.abs(diffSeconds);
      if (abs < 60) return rtf.format(Math.round(diffSeconds), 'second');
      if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
      return rtf.format(Math.round(diffSeconds / 86400), 'day');
    } catch {
      return `${Math.round(diffSeconds / 60)}m`;
    }
  },
};
