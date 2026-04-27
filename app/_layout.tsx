// app/_layout.tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/AuthContext';

// app/_layout.tsx

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        {/* 全域維持黑色，讓其他頁面（如 detail）預設為黑色 */}
        <Stack screenOptions={{ headerTintColor: 'black' }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          
          <Stack.Screen
            name="detail"
            options={{ 
              title: 'Restaurant Info', 
              headerStyle: { backgroundColor: '#fff0b8' } 
            }}
          />

          <Stack.Screen name="keep" options={{ headerShown: false }} />

          <Stack.Screen
            name="image-overview"
            options={{ 
              title: '所有照片', 
              headerStyle: { backgroundColor: '#a599c9' }, 
              headerTintColor: 'black' 
            }}
          />

          {/* 🌟 個人資料頁面：標題與箭頭改為白色 */}
          <Stack.Screen
            name="profile"
            options={{
              title: '個人資料',
              headerStyle: { backgroundColor: '#522a6f' },
              headerTintColor: 'white', // 修改這裡
              gestureEnabled: false,
            }}
          />

          {/* 🌟 任務與獎勵頁面：標題與箭頭改為白色 */}
          <Stack.Screen 
            name="rewards" 
            options={{ 
              title: '任務與獎勵', 
              headerStyle: { backgroundColor: '#522a6f' }, 
              headerTintColor: 'white' // 修改這裡
            }} 
          />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}