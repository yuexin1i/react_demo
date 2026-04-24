// app/_layout.tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <Stack>
          {/* 登入頁 */}
          <Stack.Screen
            name="login"
            options={{ headerShown: false }}
          />

          {/* 註冊頁 */}
          <Stack.Screen
            name="register"
            options={{ headerShown: false }}
          />

          {/* 首頁 */}
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />

          {/* 詳細資訊頁 */}
          <Stack.Screen
            name="detail"
            options={{
              title: 'Restaurant Info',
              headerStyle: { backgroundColor: '#fff0b8' },
            }}
          />

          {/* 搜尋與收藏清單頁 */}
          <Stack.Screen
            name="keep"
            options={{ headerShown: false }} 
          />

          {/* 照片總覽頁 */}
          <Stack.Screen
            name="image-overview"
            options={{
              title: '所有照片',
              headerStyle: { backgroundColor: '#a599c9' },
              headerTintColor: 'white',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
