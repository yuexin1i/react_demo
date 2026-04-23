// app/_layout.tsx
import { Stack } from 'expo-router';
// 🌟 引入提供者
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        {/* 1. 首頁 */}
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Turkey Rice App',
            headerStyle: { backgroundColor: '#fae7a1' },
            headerShown: false // 通常首頁會隱藏標題列，讓背景圖全螢幕
          }} 
        />
        
        {/* 2. 詳細資訊頁 */}
        <Stack.Screen 
          name="detail" 
          options={{ 
            title: 'Restaurant Info',
            headerStyle: { backgroundColor: '#fff0b8' } 
          }} 
        />
        
        {/* 3. 照片總覽頁 */}
        <Stack.Screen 
          name="image-overview" 
          options={{ 
            title: '所有照片',
            headerStyle: { backgroundColor: '#a599c9' },
            headerTintColor: 'white' 
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}