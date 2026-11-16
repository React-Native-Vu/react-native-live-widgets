import React, { useState } from 'react';
import {
  View,
  Text as RNText,
  Image as RNImage,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle as RNTextStyle,
} from 'react-native';
import {
  LayoutNode,
  WidgetSinglePageConfig,
  VStackNode,
  HStackNode,
  TextNode,
  ButtonNode,
  BadgeNode,
  ProgressNode,
  TimerNode,
  ImageNode,
} from './types';
import { renderToWidget } from './jsx';

export type WidgetPreviewSize = 'small' | 'medium' | 'large' | 'lockScreen' | 'dynamicIsland';

export interface WidgetPreviewProps {
  /**
   * Kích thước tiện ích cần xem trước:
   * - 'small' (158 × 158 dp)
   * - 'medium' (338 × 158 dp)
   * - 'large' (338 × 354 dp)
   * - 'lockScreen' (350 × 80 dp)
   * - 'dynamicIsland' (350 × 160 dp)
   * Mặc định là 'medium'.
   */
  size?: WidgetPreviewSize;
  /** Cây LayoutNode hoặc đối tượng chứa { small, medium, large } */
  layout?: LayoutNode | WidgetSinglePageConfig;
  /** Cú pháp JSX trực tiếp truyền vào bên trong thẻ `<WidgetPreview>` */
  children?: React.ReactNode;
  /** Bắt sự kiện khi người dùng bấm vào các nút tương tác trên Widget xem trước */
  onAction?: (actionId: string) => void;
  /** Hiển thị nhãn kích thước chuẩn ở góc (mặc định true) */
  showBadge?: boolean;
  /** Cho phép bấm thanh tab nhỏ ở trên để chuyển nhanh qua lại giữa các kích thước (mặc định false) */
  interactiveSizeSwitch?: boolean;
  /** Style tùy biến cho wrapper bên ngoài */
  style?: ViewStyle;
}

const SIZE_DIMENSIONS: Record<WidgetPreviewSize, { width: number; height: number; label: string }> = {
  small: { width: 158, height: 158, label: 'Small • 158×158' },
  medium: { width: 338, height: 158, label: 'Medium • 338×158' },
  large: { width: 338, height: 354, label: 'Large • 338×354' },
  lockScreen: { width: 350, height: 80, label: 'Lock Screen • 350×80' },
  dynamicIsland: { width: 350, height: 160, label: 'Dynamic Island' },
};

function parseDynamicColor(c: any): string | undefined {
  if (!c) return undefined;
  if (typeof c === 'string') return c;
  if (typeof c === 'object') return c.dark || c.light;
  return undefined;
}

/**
 * 📱 Bộ Component xem trước tiện ích trực tiếp trong ứng dụng React Native (In-App Widget Preview).
 * Cho phép lập trình viên và người dùng trải nghiệm giao diện & bấm thử tương tác của Widget
 * ngay trong màn hình App mà không cần ra ngoài Home Screen.
 *
 * Cách dùng 1 (Truyền layout prop):
 * ```tsx
 * <WidgetPreview size="medium" layout={myLayout} onAction={(act) => alert(act)} />
 * ```
 *
 * Cách dùng 2 (Truyền JSX children trực tiếp):
 * ```tsx
 * <WidgetPreview size="medium">
 *   <VStack padding={16} backgroundColor="#0F172A" borderRadius={16}>
 *     <HStack justifyContent="spaceBetween">
 *       <Text fontSize={14} fontWeight="bold" color="#FFFFFF">Vào ca sáng</Text>
 *       <Badge text="07:54" backgroundColor="#064E3B" textColor="#6EE7B7" />
 *     </HStack>
 *     <Button title="Làm mới" actionId="refresh" />
 *   </VStack>
 * </WidgetPreview>
 * ```
 */
export const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  size: initialSize = 'medium',
  layout,
  children,
  onAction,
  showBadge = true,
  interactiveSizeSwitch = false,
  style,
}) => {
  const [activeSize, setActiveSize] = useState<WidgetPreviewSize>(initialSize);

  // Trích xuất LayoutNode từ props hoặc JSX children
  let rootNode: LayoutNode | null = null;

  if (children) {
    rootNode = renderToWidget(children);
  } else if (layout) {
    if ((layout as any).type) {
      rootNode = layout as LayoutNode;
    } else {
      const pageConfig = layout as WidgetSinglePageConfig;
      rootNode =
        (pageConfig as any)[activeSize] ||
        pageConfig.medium ||
        pageConfig.large ||
        pageConfig.small ||
        pageConfig.accessoryRectangular ||
        null;
    }
  }

  const dim = SIZE_DIMENSIONS[activeSize];

  return (
    <View style={[styles.container, style]}>
      {interactiveSizeSwitch && (
        <View style={styles.tabBar}>
          {(['small', 'medium', 'large'] as WidgetPreviewSize[]).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setActiveSize(s)}
              style={[styles.tabItem, activeSize === s && styles.tabItemActive]}
            >
              <RNText style={[styles.tabText, activeSize === s && styles.tabTextActive]}>
                {s.toUpperCase()}
              </RNText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showBadge && (
        <View style={styles.badgeRow}>
          <View style={styles.specBadge}>
            <RNText style={styles.specBadgeText}>{dim.label}</RNText>
          </View>
        </View>
      )}

      {/* Khung mô phỏng Widget iOS Continuous Curve */}
      <View
        style={[
          styles.widgetFrame,
          {
            width: dim.width,
            height: dim.height,
          },
        ]}
      >
        {rootNode ? (
          renderPreviewNode(rootNode, onAction)
        ) : (
          <View style={styles.emptyContainer}>
            <RNText style={styles.emptyText}>Chưa có cấu hình layout cho size này</RNText>
          </View>
        )}
      </View>
    </View>
  );
};

/** Alias tương thích */
export const VoltraWidgetPreview = WidgetPreview;

// ─── RECURSIVE NODE RENDERER ─────────────────────────────────────────────────

function renderPreviewNode(node: LayoutNode, onAction?: (actionId: string) => void): React.ReactNode {
  if (!node) return null;

  switch (node.type) {
    case 'VStack': {
      const vnode = node as VStackNode;
      const p = vnode.props || {};
      const containerStyle: ViewStyle = {
        flexDirection: 'column',
        padding: p.padding ?? (p.paddingHorizontal || p.paddingVertical ? undefined : 0),
        paddingHorizontal: p.paddingHorizontal,
        paddingVertical: p.paddingVertical,
        backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
        borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
        borderWidth: p.borderWidth,
        borderColor: parseDynamicColor(p.borderColor),
        alignItems:
          p.alignment === 'center'
            ? 'center'
            : p.alignment === 'trailing'
            ? 'flex-end'
            : 'flex-start',
        justifyContent:
          p.justifyContent === 'center'
            ? 'center'
            : p.justifyContent === 'spaceBetween'
            ? 'space-between'
            : p.justifyContent === 'flexEnd'
            ? 'flex-end'
            : 'flex-start',
        width: '100%',
        height: '100%',
      };

      return (
        <View style={containerStyle}>
          {vnode.children?.map((child, idx) => (
            <React.Fragment key={idx}>{renderPreviewNode(child, onAction)}</React.Fragment>
          ))}
        </View>
      );
    }

    case 'HStack': {
      const hnode = node as HStackNode;
      const p = hnode.props || {};
      const containerStyle: ViewStyle = {
        flexDirection: 'row',
        padding: p.padding,
        paddingHorizontal: p.paddingHorizontal,
        paddingVertical: p.paddingVertical,
        backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
        borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
        borderWidth: p.borderWidth,
        borderColor: parseDynamicColor(p.borderColor),
        alignItems:
          p.alignment === 'center'
            ? 'center'
            : p.alignment === 'trailing'
            ? 'flex-end'
            : 'flex-start',
        justifyContent:
          p.justifyContent === 'center'
            ? 'center'
            : p.justifyContent === 'spaceBetween'
            ? 'space-between'
            : p.justifyContent === 'flexEnd'
            ? 'flex-end'
            : 'flex-start',
        width: '100%',
      };

      return (
        <View style={containerStyle}>
          {hnode.children?.map((child, idx) => (
            <React.Fragment key={idx}>{renderPreviewNode(child, onAction)}</React.Fragment>
          ))}
        </View>
      );
    }

    case 'Text': {
      const tnode = node as TextNode;
      const p = tnode.props || {};
      const textStyle: RNTextStyle = {
        color: parseDynamicColor(p.color) || '#FFFFFF',
        fontSize: p.fontSize ?? 14,
        fontWeight:
          p.fontWeight === 'bold' || p.fontWeight === 'heavy'
            ? 'bold'
            : p.fontWeight === 'semibold'
            ? '600'
            : p.fontWeight === 'medium'
            ? '500'
            : 'normal',
      };
      return (
        <RNText numberOfLines={p.numberOfLines} style={textStyle}>
          {p.text}
        </RNText>
      );
    }

    case 'Button': {
      const bnode = node as ButtonNode;
      const p = bnode.props;
      const btnStyle: ViewStyle = {
        backgroundColor: parseDynamicColor(p.backgroundColor) || '#2563EB',
        borderRadius: p.borderRadius ?? p.cornerRadius ?? 8,
        paddingHorizontal: p.paddingHorizontal ?? p.padding ?? 12,
        paddingVertical: p.paddingVertical ?? p.padding ?? 6,
        alignItems: 'center',
        justifyContent: 'center',
        width: p.fullWidth ? '100%' : undefined,
      };
      const textStyle: RNTextStyle = {
        color: parseDynamicColor(p.textColor) || '#FFFFFF',
        fontSize: p.fontSize ?? 12,
        fontWeight: (p.fontWeight as any) ?? '600',
      };

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (p.actionId && onAction) {
              onAction(p.actionId);
            }
          }}
          style={btnStyle}
        >
          <RNText style={textStyle}>{p.title}</RNText>
        </TouchableOpacity>
      );
    }

    case 'Badge': {
      const bnode = node as BadgeNode;
      const p = bnode.props;
      return (
        <View
          style={{
            backgroundColor: p.backgroundColor || '#064E3B',
            borderRadius: p.borderRadius ?? p.cornerRadius ?? 6,
            paddingHorizontal: p.paddingHorizontal ?? 6,
            paddingVertical: p.paddingVertical ?? 2,
          }}
        >
          <RNText
            style={{
              color: p.textColor || '#6EE7B7',
              fontSize: p.fontSize ?? 10,
              fontWeight: '600',
            }}
          >
            {p.text}
          </RNText>
        </View>
      );
    }

    case 'Progress': {
      const pnode = node as ProgressNode;
      const p = pnode.props || {};
      const val = Math.max(0, Math.min(1, p.value ?? 0.5));
      const height = p.height ?? 6;
      const tint = parseDynamicColor(p.tintColor) || '#2563EB';
      const track = parseDynamicColor(p.trackColor) || '#334155';

      if (p.style === 'segmented' && (p.segments ?? 4) > 1) {
        const segs = p.segments ?? 4;
        const filled = Math.round(val * segs);
        return (
          <View style={{ flexDirection: 'row', gap: 4, width: '100%', height }}>
            {Array.from({ length: segs }).map((_, idx) => (
              <View
                key={idx}
                style={{
                  flex: 1,
                  height,
                  backgroundColor: idx < filled ? tint : track,
                  borderRadius: height / 2,
                }}
              />
            ))}
          </View>
        );
      }

      return (
        <View style={{ width: '100%', height, backgroundColor: track, borderRadius: height / 2 }}>
          <View
            style={{
              width: `${val * 100}%`,
              height,
              backgroundColor: tint,
              borderRadius: height / 2,
            }}
          />
        </View>
      );
    }

    case 'Timer': {
      const tnode = node as TimerNode;
      const p = tnode.props || {};
      return (
        <RNText style={{ color: p.color || '#2563EB', fontSize: p.fontSize ?? 14, fontWeight: 'bold' }}>
          {p.prefix || ''}1:29:55{p.suffix || ''}
        </RNText>
      );
    }

    case 'Image': {
      const inode = node as ImageNode;
      const p = inode.props || {};
      const width = p.width ?? 32;
      const height = p.height ?? 32;
      const uri = p.url || (p.base64 ? `data:image/png;base64,${p.base64}` : null);

      if (uri) {
        return (
          <RNImage
            source={{ uri }}
            style={{
              width,
              height,
              borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
            }}
          />
        );
      }
      return (
        <View
          style={{
            width,
            height,
            backgroundColor: '#334155',
            borderRadius: p.borderRadius ?? p.cornerRadius ?? 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RNText style={{ color: '#94A3B8', fontSize: 10 }}>IMG</RNText>
        </View>
      );
    }

    case 'Spacer': {
      return <View style={{ flex: 1 }} />;
    }

    case 'Divider': {
      return <View style={{ width: '100%', height: 1, backgroundColor: '#334155' }} />;
    }

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badgeRow: {
    marginBottom: 6,
  },
  specBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  specBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  widgetFrame: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
});
