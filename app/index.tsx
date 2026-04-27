// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import DatabaseHelper from '../lib/DatabaseHelper';

const { width } = Dimensions.get('window');

// 🌟 新增：將火雞框的尺寸抽出來變成共用常數，確保大家空間一樣大
const FRAME_WIDTH = 70; 
const FRAME_HEIGHT = FRAME_WIDTH * (640 / 620); // 約 113.5

// ─── 火雞框架頭像元件 ───────────────────────────────────────────────
function TurkeyAvatarFrame({ avatarUri }: { avatarUri?: string | null }) {
  const circleDiameter = FRAME_WIDTH * 0.35; 
  const circleLeft = FRAME_WIDTH * 0.5 - circleDiameter / 2;
  const circleTop  = FRAME_HEIGHT * 0.22 - circleDiameter / 2;

  return (
    <View style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}>
      {/* Layer 1：頭像 */}
      <View
        style={{
          position: 'absolute',
          left: circleLeft,
          top: circleTop,
          width: circleDiameter,
          height: circleDiameter,
          borderRadius: circleDiameter / 2,
          overflow: 'hidden',
          zIndex: 2,
          backgroundColor: 'rgba(145, 79, 189, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: circleDiameter * 0.55 }}>👤</Text>
        )}
      </View>

      {/* Layer 2：火雞框架圖片 */}
      <Image
        source={require('../assets/turkey_frame.png')}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}
// ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const [hasFilter, setHasFilter] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) router.replace('/login');
      else DatabaseHelper.initDatabase();
    }, 100);
    return () => clearTimeout(timer);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user && user.id !== -1) {
        refreshUser();
        DatabaseHelper.checkHasTurkeyFilter(user.id).then(setHasFilter);
      }
    }, [user])
  );

  if (!user) return null;

  return (
    <ImageBackground source={require('../assets/a_table_of_rice.jpg')} style={styles.background} imageStyle={{ opacity: 0.35 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />

          {/* 簽到入口 */}
          <TouchableOpacity style={styles.actionButtonArea} onPress={() => router.push('/rewards')}>
            {/* 🌟 套用等大的透明容器 */}
            <View style={styles.iconPlaceholder}>
              <View style={styles.calendarCircle}>
                <Ionicons name="calendar" size={24} color="#522a6f" />
              </View>
            </View>
            <Text style={styles.actionText}>簽到</Text>
          </TouchableOpacity>

          {/* 頭像區域 */}
          <TouchableOpacity style={styles.actionButtonArea} onPress={() => router.push('/profile')}>
            {hasFilter ? (
              <TurkeyAvatarFrame avatarUri={user.avatar} />
            ) : (
              // 🌟 沒有火雞框時，普通頭像也套用等大的透明容器，讓排版不跑位
              <View style={styles.iconPlaceholder}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarCircle} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarIcon}>👤</Text>
                  </View>
                )}
              </View>
            )}
            <Text style={styles.actionText}>{user.nickname}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.circleDec}>
          <Text style={styles.titleText}>EVERYTHING{'\n'}EVERYWHERE{'\n'}ALL AT{'\n'}<Text style={{ color: '#ffeb3b' }}>TURKEY RICE</Text></Text>
        </View>

        <View style={{ height: 60 }} />

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
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  
  // 🌟 修改：統一按鈕區域的樣式，強制寬度與火雞框一致
  actionButtonArea: { 
    alignItems: 'center', 
    gap: 4,
    width: FRAME_WIDTH, // 強制寬度一致
  },
  
  // 🌟 新增：與火雞框等寬等高的佔位容器，並將內容置中
  iconPlaceholder: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // 統一文字樣式
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },

  calendarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffebc9',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(145, 79, 189, 0.85)',
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarIcon: { fontSize: 24 },
  
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
    color: 'white',
    fontWeight: 'bold',
    fontSize: 38,
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 45,
  },
  exploreButton: {
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 130,
  },
  buttonText: { color: 'black', fontWeight: 'bold', fontSize: 22 },
});