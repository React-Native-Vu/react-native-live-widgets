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
import { renderToWidget, extractPropsAndStyle } from './jsx';

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

function parseDynamicColor(c: any, mode: 'light' | 'dark' | 'tinted' = 'dark'): string | undefined {
  if (!c) return undefined;
  if (typeof c === 'string') return c;
  if (typeof c === 'object') {
    if (mode === 'tinted' && c.tinted) return c.tinted;
    if (mode === 'light' && c.light) return c.light;
    return c.dark || c.light || c.tinted;
  }
  return undefined;
}

function extractShadowStyle(p: any): ViewStyle {
  if (!p) return {};
  const shadowColor = parseDynamicColor(p.shadowColor);
  if (!shadowColor) return {};
  const rad = p.shadowRadius ?? 4;
  return {
    shadowColor,
    shadowOffset: p.shadowOffset
      ? { width: p.shadowOffset.x ?? 0, height: p.shadowOffset.y ?? 2 }
      : { width: 0, height: 2 },
    shadowOpacity: p.shadowOpacity ?? 0.35,
    shadowRadius: rad,
    elevation: Math.min(8, Math.max(1, Math.round(rad))),
  };
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
}: WidgetPreviewProps) => {
  const [activeSize, setActiveSize] = useState<WidgetPreviewSize>(initialSize);

  // Trích xuất LayoutNode từ props hoặc JSX children
  let rootNode: LayoutNode | null = null;
  let rawTarget: any = null;

  if (children) {
    rawTarget = children;
  } else if (layout) {
    if (React.isValidElement(layout) || (layout as any)?.$$typeof) {
      rawTarget = layout;
    } else if ((layout as any).type && typeof (layout as any).type === 'string' && (layout as any).props !== undefined) {
      rawTarget = layout;
    } else {
      const pageConfig = layout as WidgetSinglePageConfig;
      rawTarget =
        (pageConfig as any)[activeSize] ||
        pageConfig.medium ||
        pageConfig.large ||
        pageConfig.small ||
        pageConfig.accessoryRectangular ||
        null;
    }
  }

  if (rawTarget) {
    if (React.isValidElement(rawTarget) || (rawTarget as any)?.$$typeof || typeof (rawTarget as any)?.type === 'function') {
      rootNode = renderToWidget(rawTarget);
    } else {
      rootNode = rawTarget as LayoutNode;
    }
  }

  const dim =
    SIZE_DIMENSIONS[(activeSize as WidgetPreviewSize) || 'medium'] || SIZE_DIMENSIONS.medium;

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
          renderPreviewNode(rootNode, onAction, true, 'column')
        ) : (
          <View style={styles.emptyContainer}>
            <RNText style={styles.emptyText}>Chưa có cấu hình layout cho kích thước {activeSize}</RNText>
          </View>
        )}
      </View>
    </View>
  );
};

/** Alias tương thích */
export const VoltraWidgetPreview = WidgetPreview;

// ─── RECURSIVE NODE RENDERER ─────────────────────────────────────────────────

function renderPreviewNode(
  node: any,
  onAction?: (actionId: string) => void,
  isRoot: boolean = false,
  parentDirection: 'row' | 'column' = 'column'
): React.ReactNode {
  if (!node) return null;

  if (React.isValidElement(node) || (node as any)?.$$typeof || typeof (node as any)?.type === 'function') {
    const converted = renderToWidget(node);
    if (!converted) return null;
    return renderPreviewNode(converted, onAction, isRoot, parentDirection);
  }

  switch (node.type) {
    case 'VStack': {
      const vnode = node as VStackNode;
      const p = extractPropsAndStyle(vnode.props);
      const bg = p.gradient?.colors?.[0]
        ? parseDynamicColor(p.gradient.colors[0])
        : parseDynamicColor(p.backgroundColor) || 'transparent';

      const containerStyle: ViewStyle = {
        flexDirection: 'column',
        padding: p.padding ?? (p.paddingHorizontal || p.paddingVertical ? undefined : 0),
        paddingHorizontal: p.paddingHorizontal,
        paddingVertical: p.paddingVertical,
        backgroundColor: bg,
        borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
        borderWidth: p.borderWidth,
        borderColor: parseDynamicColor(p.borderColor),
        borderStyle: p.borderStyle || 'solid',
        rowGap: p.spacing ?? 0,
        alignItems:
          p.alignment === 'center'
            ? 'center'
            : p.alignment === 'trailing' || p.alignment === 'end'
            ? 'flex-end'
            : 'flex-start',
        justifyContent:
          p.justifyContent === 'center'
            ? 'center'
            : p.justifyContent === 'spaceBetween'
            ? 'space-between'
            : p.justifyContent === 'spaceAround'
            ? 'space-around'
            : p.justifyContent === 'spaceEvenly'
            ? 'space-evenly'
            : p.justifyContent === 'flexEnd'
            ? 'flex-end'
            : 'flex-start',
        ...extractShadowStyle(p),
      };

      if (isRoot) {
        containerStyle.width = '100%';
        containerStyle.height = '100%';
        containerStyle.flex = 1;
      } else if (parentDirection === 'row') {
        if (p.flex !== undefined) {
          containerStyle.flex = p.flex;
        }
      } else {
        containerStyle.alignSelf = 'stretch';
      }

      return (
        <View style={containerStyle}>
          {vnode.children?.map((child, idx) => (
            <React.Fragment key={idx}>
              {renderPreviewNode(child, onAction, false, 'column')}
            </React.Fragment>
          ))}
        </View>
      );
    }

    case 'HStack': {
      const hnode = node as HStackNode;
      const p = extractPropsAndStyle(hnode.props);
      const isRtl = p.direction === 'rtl' || p.isRTL;
      const bg = p.gradient?.colors?.[0]
        ? parseDynamicColor(p.gradient.colors[0])
        : parseDynamicColor(p.backgroundColor) || 'transparent';

      const containerStyle: ViewStyle = {
        flexDirection: isRtl ? 'row-reverse' : 'row',
        padding: p.padding,
        paddingHorizontal: p.paddingHorizontal,
        paddingVertical: p.paddingVertical,
        backgroundColor: bg,
        borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
        borderWidth: p.borderWidth,
        borderColor: parseDynamicColor(p.borderColor),
        borderStyle: p.borderStyle || 'solid',
        columnGap: p.spacing ?? 0,
        alignItems:
          p.alignment === 'center'
            ? 'center'
            : p.alignment === 'trailing' || p.alignment === 'bottom'
            ? 'flex-end'
            : p.alignment === 'top'
            ? 'flex-start'
            : 'center',
        justifyContent:
          p.justifyContent === 'center'
            ? 'center'
            : p.justifyContent === 'spaceBetween'
            ? 'space-between'
            : p.justifyContent === 'spaceAround'
            ? 'space-around'
            : p.justifyContent === 'spaceEvenly'
            ? 'space-evenly'
            : p.justifyContent === 'flexEnd'
            ? 'flex-end'
            : 'flex-start',
        ...extractShadowStyle(p),
      };

      if (isRoot) {
        containerStyle.width = '100%';
        containerStyle.height = '100%';
      } else if (parentDirection === 'column') {
        containerStyle.alignSelf = 'stretch';
      } else if (p.flex !== undefined) {
        containerStyle.flex = p.flex;
      }

      return (
        <View style={containerStyle}>
          {hnode.children?.map((child, idx) => (
            <React.Fragment key={idx}>
              {renderPreviewNode(child, onAction, false, 'row')}
            </React.Fragment>
          ))}
        </View>
      );
    }

    case 'ZStack': {
      const znode = node as any;
      const p = extractPropsAndStyle(znode.props);
      return (
        <View
          style={{
            position: 'relative',
            width: isRoot ? '100%' : undefined,
            height: isRoot ? '100%' : undefined,
            alignSelf: isRoot ? undefined : 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: parseDynamicColor(p.backgroundColor) || 'transparent',
            borderRadius: p.borderRadius ?? p.cornerRadius ?? 0,
          }}
        >
          {znode.children?.map((child: any, idx: number) => (
            <View
              key={idx}
              style={
                idx === 0
                  ? { width: '100%', height: '100%' }
                  : { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }
              }
            >
              {renderPreviewNode(child, onAction, false, parentDirection)}
            </View>
          ))}
        </View>
      );
    }

    case 'Grid': {
      const gnode = node as any;
      const p = extractPropsAndStyle(gnode.props);
      const cols = p.columns ?? 2;
      return (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: p.spacing ?? 6,
            width: '100%',
            alignSelf: 'stretch',
          }}
        >
          {gnode.children?.map((child: any, idx: number) => (
            <View key={idx} style={{ flexBasis: `${Math.floor(100 / cols) - 3}%` }}>
              {renderPreviewNode(child, onAction, false, 'column')}
            </View>
          ))}
        </View>
      );
    }

    case 'Text': {
      const tnode = node as TextNode;
      const p = extractPropsAndStyle(tnode.props);
      const isRtl = p.direction === 'rtl' || p.isRTL;
      const shadowColor = parseDynamicColor(p.shadowColor);

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
        fontFamily: p.fontDesign === 'monospaced' ? 'monospace' : undefined,
        textAlign: p.textAlign ?? (isRtl ? 'right' : 'left'),
        lineHeight: p.lineHeight,
        letterSpacing: p.letterSpacing,
        textShadowColor: shadowColor,
        textShadowOffset: p.shadowOffset
          ? { width: p.shadowOffset.x ?? 0, height: p.shadowOffset.y ?? 1 }
          : undefined,
        textShadowRadius: p.shadowRadius,
      };
      return (
        <RNText
          numberOfLines={p.numberOfLines}
          style={[
            textStyle,
            parentDirection === 'row' ? { flexShrink: 1 } : undefined,
          ]}
        >
          {p.text}
        </RNText>
      );
    }

    case 'Button': {
      const bnode = node as ButtonNode;
      const p = bnode.props;
      const bg = p.gradient?.colors?.[0]
        ? parseDynamicColor(p.gradient.colors[0])
        : parseDynamicColor(p.backgroundColor) || '#2563EB';

      const btnStyle: ViewStyle = {
        backgroundColor: bg,
        borderRadius: p.borderRadius ?? p.cornerRadius ?? 8,
        borderWidth: p.borderWidth,
        borderColor: parseDynamicColor(p.borderColor),
        borderStyle: p.borderStyle || 'solid',
        paddingHorizontal: p.paddingHorizontal ?? p.padding ?? 12,
        paddingVertical: p.paddingVertical ?? p.padding ?? 6,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: p.fullWidth ? 'stretch' : 'auto',
        width: p.fullWidth ? '100%' : undefined,
        ...extractShadowStyle(p),
      };
      const textStyle: RNTextStyle = {
        color: parseDynamicColor(p.textColor) || '#FFFFFF',
        fontSize: p.fontSize ?? 12,
        fontWeight: (p.fontWeight as any) ?? '600',
        fontFamily: p.fontDesign === 'monospaced' ? 'monospace' : undefined,
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
          <RNText numberOfLines={1} style={textStyle}>
            {p.title}
          </RNText>
        </TouchableOpacity>
      );
    }

    case 'Badge': {
      const bnode = node as BadgeNode;
      const p = bnode.props;
      return (
        <View
          style={{
            backgroundColor: parseDynamicColor(p.backgroundColor) || '#064E3B',
            borderRadius: p.borderRadius ?? p.cornerRadius ?? 6,
            paddingHorizontal: p.paddingHorizontal ?? 6,
            paddingVertical: p.paddingVertical ?? 2,
            flexShrink: 0,
            alignSelf: 'center',
          }}
        >
          <RNText
            numberOfLines={1}
            style={{
              color: parseDynamicColor(p.textColor) || '#6EE7B7',
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
          <View style={{ flexDirection: 'row', gap: 4, width: '100%', height, alignSelf: 'stretch' }}>
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
        <View style={{ width: '100%', height, backgroundColor: track, borderRadius: height / 2, alignSelf: 'stretch' }}>
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
        <RNText
          style={[
            { color: parseDynamicColor(p.color) || '#2563EB', fontSize: p.fontSize ?? 14, fontWeight: 'bold' },
            parentDirection === 'row' ? { flexShrink: 0 } : undefined,
          ]}
        >
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
      const snode = node as any;
      const p = snode.props || {};
      const minLen = p?.minLength ?? 4;
      return (
        <View
          style={
            parentDirection === 'row'
              ? { minWidth: minLen, flex: 1 }
              : { minHeight: minLen, flex: 1 }
          }
        />
      );
    }

    case 'Divider': {
      const p = (node as any).props || {};
      const color = parseDynamicColor(p.color) || '#334155';
      return (
        <View
          style={
            parentDirection === 'row'
              ? { width: 1, height: '100%', backgroundColor: color }
              : { width: '100%', height: 1, backgroundColor: color, alignSelf: 'stretch' }
          }
        />
      );
    }

    case 'Link': {
      const lnode = node as any;
      const p = lnode.props || {};
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (p.url && onAction) onAction(p.url);
          }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          {lnode.children?.map((child: any, idx: number) => (
            <React.Fragment key={idx}>
              {renderPreviewNode(child, onAction, false, parentDirection)}
            </React.Fragment>
          ))}
        </TouchableOpacity>
      );
    }

    case 'Equalizer': {
      const enode = node as any;
      const p = enode.props || {};
      const tint = parseDynamicColor(p.color) || '#38BDF8';
      return (
        <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 16 }}>
          {[12, 16, 8, 14].map((h, i) => (
            <View key={i} style={{ width: 3, height: h, backgroundColor: tint, borderRadius: 1.5 }} />
          ))}
        </View>
      );
    }

    case 'Gauge': {
      const gnode = node as any;
      const p = gnode.props || {};
      const val = Math.round((p.value ?? 0.75) * 100);
      const tint = parseDynamicColor(p.tintColor) || '#10B981';
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <RNText style={{ color: tint, fontSize: 13, fontWeight: 'bold' }}>{val}%</RNText>
        </View>
      );
    }

    case 'Chart': {
      const cnode = node as any;
      const p = cnode.props || {};
      const values: number[] = Array.isArray(p.values) ? p.values : [20, 45, 60, 80, 50];
      const maxVal = Math.max(...values, 1);
      const tint = parseDynamicColor(p.color) || '#38BDF8';
      return (
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 28, width: '100%', alignSelf: 'stretch' }}>
          {values.map((v, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(15, (v / maxVal) * 100)}%`,
                backgroundColor: tint,
                borderRadius: 2,
              }}
            />
          ))}
        </View>
      );
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
