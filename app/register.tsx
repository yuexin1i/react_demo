// app/register.tsx
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

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !nickname) {
      Alert.alert('提示', '請填寫所有欄位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '兩次密碼不一致');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密碼至少需要 6 個字元');
      return;
    }

    setIsLoading(true);
    const result = await DatabaseHelper.registerUser(email, password, nickname);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('🎉 註冊成功！', '請登入你的帳號', [
        { text: '去登入', onPress: () => router.replace('/login') }
      ]);
    } else {
      Alert.alert('註冊失敗', result.message);
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
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🍚</Text>
            <Text style={styles.logoTitle}>Turkey Rice</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>建立帳號</Text>

            <TextInput
              style={styles.input}
              placeholder="暱稱"
              placeholderTextColor="#aaa"
              value={nickname}
              onChangeText={setNickname}
            />
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
              placeholder="密碼（至少 6 個字元）"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="確認密碼"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient colors={['#cde873', '#8a77a5']} style={styles.registerBtn}>
                {isLoading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.registerBtnText}>註冊</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkText}>已有帳號？<Text style={styles.backLinkBold}>返回登入</Text></Text>
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
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: (width * 0.35) / 2,
    backgroundColor: 'rgba(145, 79, 189, 0.75)',
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: { fontSize: 36 },
  logoTitle: { color: '#ffeb3b', fontWeight: 'bold', fontSize: 14, marginTop: 4 },
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
  registerBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  registerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  backLink: { marginTop: 18, alignItems: 'center' },
  backLinkText: { color: '#888', fontSize: 15 },
  backLinkBold: { color: '#522a6f', fontWeight: 'bold' },
});
