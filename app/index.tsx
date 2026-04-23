// app/index.tsx 完整程式碼
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// 🌟 引入新的 SafeAreaView
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseHelper from '../lib/DatabaseHelper';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  useEffect(() => {
    DatabaseHelper.initDatabase();
  }, []);

  return (
    <ImageBackground 
      source={require('../assets/a_table_of_rice.jpg')} 
      style={styles.background}
      imageStyle={{ opacity: 0.35 }} 
    >
      {/* 🌟 使用新的 SafeAreaView 讓內容不被瀏海擋住 */}
      <SafeAreaView style={styles.container}>
        <View style={styles.circleDec}>
          <Text style={styles.titleText}>
            EVERYTHING{'\n'}EVERYWHERE{'\n'}ALL AT{'\n'}
            <Text style={{color: '#ffeb3b'}}>TURKEY RICE</Text>
          </Text>
        </View>
        
        <View style={{ height: 60 }} />

        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/detail')}>
          <LinearGradient
            colors={['#cde873', '#8a77a5']}
            style={styles.exploreButton}
          >
            <Text style={styles.buttonText}>⚔️ HUNT FOR Turkey Rice ⚔️</Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: 'black' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circleDec: {
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
  },
  buttonText: { color: 'black', fontWeight: 'bold', fontSize: 22 },
});