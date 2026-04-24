// app/login.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseHelper from '../lib/DatabaseHelper';
import { useAuth } from '../lib/AuthContext';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('提示', '請填寫 Email 和密碼');
      return;
    }
    setIsLoading(true);
    const result = await DatabaseHelper.loginUser(email, password);
    setIsLoading(false);

    if (result.success && result.user) {
      setUser(result.user);
      if (result.user.is_admin === 1) {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } else {
      Alert.alert('登入失敗', result.message);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/a_table_of_rice.jpg')}
      style={styles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
          {/* Logo 區塊 */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🍚</Text>
            <Text style={styles.logoTitle}>Turkey Rice</Text>
          </View>

          {/* 登入卡片 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>登入帳號</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="密碼"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient colors={['#8a77a5', '#522a6f']} style={styles.loginBtn}>
                {isLoading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.loginBtnText}>登入</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
              <Text style={styles.registerLinkText}>還沒有帳號？<Text style={styles.registerLinkBold}>立即註冊</Text></Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a0a2e' },
  safe: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoCircle: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: (width * 0.4) / 2,
    backgroundColor: 'rgba(145, 79, 189, 0.75)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: { fontSize: 42 },
  logoTitle: { color: '#ffeb3b', fontWeight: 'bold', fontSize: 16, marginTop: 4 },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: { fontSize: 26, fontWeight: 'bold', color: '#522a6f', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 2,
    borderColor: '#c9b8e8',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    color: '#333',
    backgroundColor: '#faf7ff',
  },
  loginBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  loginBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  registerLink: { marginTop: 18, alignItems: 'center' },
  registerLinkText: { color: '#888', fontSize: 15 },
  registerLinkBold: { color: '#522a6f', fontWeight: 'bold' },
});
