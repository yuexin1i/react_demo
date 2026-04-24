// app/index.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import DatabaseHelper from '../lib/DatabaseHelper';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/login');
      } else {
        DatabaseHelper.initDatabase();
      }
    }, 100); // 稍微延遲，等 layout 掛載完成

    return () => clearTimeout(timer);
  }, [user]);

  if (!user) return null;

  return (
    <ImageBackground
      source={require('../assets/a_table_of_rice.jpg')}
      style={styles.background}
      imageStyle={{ opacity: 0.35 }}
    >
      <SafeAreaView style={styles.container}>
        {/* 右上角頭像 + 名稱 */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.avatarArea} onPress={() => router.push('/profile')}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <Text style={styles.avatarName}>{user.nickname}</Text>
          </TouchableOpacity>
        </View>

        {/* 中間主視覺 */}
        <View style={styles.circleDec}>
          <Text style={styles.titleText}>
            EVERYTHING{'\n'}EVERYWHERE{'\n'}ALL AT{'\n'}
            <Text style={{ color: '#ffeb3b' }}>TURKEY RICE</Text>
          </Text>
        </View>

        <View style={{ height: 60 }} />

        {/* 🌟 將目的地改回 /detail */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/detail')}>
          <LinearGradient colors={['#cde873', '#8a77a5']} style={styles.exploreButton}>
            <Text style={styles.buttonText}>⚔️ HUNT FOR Turkey Rice ⚔️</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: 'black' },
  container: { flex: 1, alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  avatarArea: { alignItems: 'center', gap: 4 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(145, 79, 189, 0.85)',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: { fontSize: 24 },
  avatarName: { color: 'white', fontSize: 12, fontWeight: 'bold', textShadowColor: 'black', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  circleDec: {
    marginTop: 'auto',
    marginBottom: 0,
    width: width * 0.85,
    height: width * 0.85,
    backgroundColor: 'rgba(145, 79, 189, 0.7)',
    borderColor: 'white',
    borderWidth: 10,
    borderRadius: (width * 0.85) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  titleText: {
    color: 'white', fontWeight: 'bold', fontSize: 38,
    textAlign: 'center', letterSpacing: 2, lineHeight: 45,
  },
  exploreButton: {
    borderRadius: 50, borderWidth: 4, borderColor: 'white',
    paddingHorizontal: 40, paddingVertical: 18,
    marginBottom: 40,
  },
  buttonText: { color: 'black', fontWeight: 'bold', fontSize: 22 },
});
