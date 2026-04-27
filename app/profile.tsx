// app/profile.tsx
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import DatabaseHelper from '../lib/DatabaseHelper';

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('提示', '暱稱不能為空');
      return;
    }
    if (!user) return;
    setIsSaving(true);
    await DatabaseHelper.updateUserProfile(user.id, nickname.trim(), avatarUri);
    const updated = await DatabaseHelper.getUserById(user.id);
    if (updated) setUser(updated);
    setIsSaving(false);
    Alert.alert('✅ 儲存成功', '個人資料已更新');
  };

  const handleLogout = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '登出',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  if (!user) return null;

  const displayAvatar = avatarUri ?? user.avatar ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>

          {/* 頭像 */}
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarDefault}>
                <Text style={styles.avatarDefaultIcon}>👤</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={{ color: 'white', fontSize: 14 }}>✏️</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.emailText}>{user.email}</Text>
          <Text style={styles.pointsText}>🪙 積分：{user.points ?? 0}</Text>

          {/* 暱稱編輯 */}
          <View style={styles.section}>
            <Text style={styles.label}>暱稱</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="請輸入暱稱"
              placeholderTextColor="#aaa"
            />
          </View>

          {/* 儲存按鈕 */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{isSaving ? '儲存中...' : '💾 儲存變更'}</Text>
          </TouchableOpacity>

          {/* 登出按鈕 */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutBtnText}>🚪 登出</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3eeff' },
  container: { alignItems: 'center', padding: 28, paddingTop: 40 },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#522a6f' },
  avatarDefault: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#c9b8e8', borderWidth: 4, borderColor: '#522a6f',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarDefaultIcon: { fontSize: 52 },
  avatarEditBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: '#522a6f', borderRadius: 16,
    width: 32, height: 32, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white',
  },
  emailText: { color: '#888', fontSize: 15, marginBottom: 6 },
  pointsText: { color: '#522a6f', fontSize: 18, fontWeight: 'bold', marginBottom: 28 },
  section: { width: '100%', marginBottom: 20 },
  label: { fontSize: 15, color: '#522a6f', fontWeight: 'bold', marginBottom: 8 },
  input: {
    borderWidth: 2, borderColor: '#c9b8e8', borderRadius: 14,
    padding: 14, fontSize: 16, color: '#333', backgroundColor: 'white',
  },
  saveBtn: {
    width: '100%', backgroundColor: '#522a6f',
    borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 17 },
  logoutBtn: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: 14, padding: 16, alignItems: 'center',
    marginTop: 16, borderWidth: 2, borderColor: '#e57373',
  },
  logoutBtnText: { color: '#e57373', fontWeight: 'bold', fontSize: 17 },
});
