import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { LiveActivity, UI } from 'react-native-live-activity';

export default function ExampleLiveActivityScreen() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Lắng nghe Push-to-Start Token (iOS 17.2+)
    LiveActivity.getPushToStartToken().then((t) => t && setToken(t));
    const unsubscribe = LiveActivity.onPushToStartTokenChange((newToken) => {
      console.log('Push-to-start token mới:', newToken);
      setToken(newToken);
      // Gửi newToken lên backend server của bạn tại đây
    });

    return () => unsubscribe();
  }, []);

  const handleStartShiftCountdown = async () => {
    const now = Math.floor(Date.now() / 1000);
    const targetTimestamp = now + 900; // 15 phút nữa vào ca

    // Tạo giao diện hoàn toàn bằng JavaScript/TypeScript
    await LiveActivity.start({
      activityId: 'shift_morning_123',
      alertTitle: 'Sắp vào ca làm việc',
      alertBody: 'Còn 15 phút nữa, vui lòng chuẩn bị check-in.',
      
      // 1. Màn hình khóa (Lock Screen) trên iOS & Thông báo Android
      lockScreen: UI.VStack(
        { padding: 14, backgroundColor: '#1A1D24', borderRadius: 18, spacing: 10 },
        // Dòng header: Tên ca + Đồng hồ đếm ngược tự chạy
        UI.HStack(
          { justifyContent: 'spaceBetween' },
          UI.HStack(
            { spacing: 8 },
            UI.Image({ systemName: 'clock.badge.checkmark', tintColor: '#2F80ED', width: 22, height: 22 }),
            UI.Text('Ca sáng (08:00 - 12:00)', { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' })
          ),
          UI.Timer(targetTimestamp, {
            mode: 'countdown',
            color: '#FFA500',
            fontSize: 16,
            fontWeight: 'bold',
          })
        ),
        // Thanh tiến trình tự bò dần về mốc thời gian (không tốn pin)
        UI.Progress({
          startTimestamp: now,
          targetTimestamp: targetTimestamp,
          tintColor: '#2F80ED',
        }),
        // Dòng trạng thái phụ
        UI.Text('Hãy check-in đúng giờ để duy trì chuỗi Streak!', {
          color: '#A0AEC0',
          fontSize: 13,
        })
      ),

      // 2. Dynamic Island trên iPhone 14 Pro / 15 / 16
      dynamicIsland: {
        compactLeading: UI.Image({ systemName: 'clock.fill', tintColor: '#2F80ED', width: 14, height: 14 }),
        compactTrailing: UI.Timer(targetTimestamp, { mode: 'countdown', color: '#FFA500', fontSize: 13 }),
        expanded: {
          leading: UI.Text('Ca sáng', { fontWeight: 'bold', color: '#FFFFFF' }),
          trailing: UI.Timer(targetTimestamp, { mode: 'countdown', color: '#FFA500' }),
          bottom: UI.Text('Nhớ bật vị trí để chấm công', { color: '#CBD5E0', fontSize: 12 }),
        },
      },

      // 3. State Machine: Tự động đổi giao diện khi tới mốc thời gian
      phases: [
        {
          id: 'soon',
          triggerTimestamp: targetTimestamp - 300, // Còn 5 phút
          alertTitle: 'Sắp trễ ca!',
          alertBody: 'Chỉ còn 5 phút nữa là bắt đầu ca làm.',
        },
        {
          id: 'late',
          triggerTimestamp: targetTimestamp, // Đã quá giờ
          alertTitle: 'Đã trễ ca làm việc!',
          alertBody: 'Bạn đã trễ ca. Vui lòng check-in ngay!',
        },
      ],
    });
  };

  const handleEndActivity = async () => {
    await LiveActivity.end('shift_morning_123');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Live Activity & Live Update Demo</Text>
      {Platform.OS === 'ios' && (
        <Text style={styles.tokenText}>
          Push-to-Start Token: {token ? `${token.slice(0, 16)}...` : 'Đang lấy...'}
        </Text>
      )}

      <TouchableOpacity style={styles.buttonStart} onPress={handleStartShiftCountdown}>
        <Text style={styles.buttonText}>🚀 Bật Live Activity (15 phút)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonEnd} onPress={handleEndActivity}>
        <Text style={styles.buttonText}>🛑 Tắt Live Activity</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F7FAFC' },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  tokenText: { fontSize: 12, color: '#718096', textAlign: 'center', marginBottom: 24 },
  buttonStart: { backgroundColor: '#2F80ED', padding: 16, borderRadius: 12, marginBottom: 12 },
  buttonEnd: { backgroundColor: '#E53E3E', padding: 16, borderRadius: 12 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});

