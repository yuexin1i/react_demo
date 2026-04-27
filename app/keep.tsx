// app/keep.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TurkeyAvatarFrame, { FRAME_HEIGHT, FRAME_WIDTH } from '../components/TurkeyAvatarFrame';
import { useAuth } from '../lib/AuthContext';
import DatabaseHelper from '../lib/DatabaseHelper';
import { DefaultImage, ShopImages } from '../lib/ImageMap';
import { Restaurant } from '../lib/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.6; 

export default function KeepScreen() {
  const { user, refreshUser } = useAuth(); // 🌟 引入 refreshUser 同步畫面點數
  const [allShops, setAllShops] = useState<Restaurant[]>([]);
  const [filteredShops, setFilteredShops] = useState<Restaurant[]>([]);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const sheetAnimation = useRef(new Animated.Value(0)).current;

  const [gameArea, setGameArea] = useState({ width: 0, height: 0 }); 
  const [turkeys, setTurkeys] = useState<any[]>([]); 
  const [gameScore, setGameScore] = useState(0); 
  const [dailyPoints, setDailyPoints] = useState(0); 

  useFocusEffect(
    useCallback(() => {
      if (user && user.id !== -1) {
        loadData();
      }
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;
    // 🌟 傳入 user.id 獲取專屬收藏
    const data = await DatabaseHelper.getAllRestaurants(user.id);
    const favData = await DatabaseHelper.getFavoriteRestaurants(user.id);
    setAllShops(data);
    setFilteredShops([]); 
    setFavorites(favData);
  };

  useEffect(() => {
    const loadGameData = async () => {
      if (!user) return;
      const today = new Date().toDateString(); 
      // 🌟 將 AsyncStorage 的 Key 加上 user.id，實現獨立積分紀錄
      const dateKey = `turkeyGameDate_${user.id}`;
      const pointsKey = `turkeyDailyPoints_${user.id}`;
      const scoreKey = `turkeyScore_${user.id}`;

      const storedDate = await AsyncStorage.getItem(dateKey);
      
      if (storedDate === today) {
        const storedPoints = await AsyncStorage.getItem(pointsKey);
        const storedScore = await AsyncStorage.getItem(scoreKey);
        if (storedPoints) setDailyPoints(parseFloat(storedPoints));
        if (storedScore) setGameScore(parseInt(storedScore, 10));
      } else {
        await AsyncStorage.setItem(dateKey, today);
        await AsyncStorage.setItem(pointsKey, '0');
        await AsyncStorage.setItem(scoreKey, '0');
        setDailyPoints(0);
        setGameScore(0);
      }
    };
    loadGameData();
  }, [user]);

  useEffect(() => {
    if (dailyPoints >= 0.5 || gameArea.width === 0) return;

    const spawnInterval = setInterval(() => {
      setTurkeys(prev => {
        if (prev.length >= 3) return prev; 
        const isTrueTurkey = Math.random() > 0.5; 
        const isFlipped = Math.random() > 0.5; 
        
        let x = 0, y = 0, attempts = 0;
        do {
          x = Math.random() * (gameArea.width - FRAME_WIDTH);
          y = Math.random() * (gameArea.height - FRAME_HEIGHT - 60);
          attempts++;
        } while (attempts < 10 && (x + FRAME_WIDTH > gameArea.width - 180) && (y < 120));

        const newTurkey = { id: Date.now().toString() + Math.random().toString(), isTrueTurkey, isFlipped, x, y };

        setTimeout(() => {
          setTurkeys(current => current.filter(t => t.id !== newTurkey.id));
        }, 1500);

        return [...prev, newTurkey];
      });
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [dailyPoints, gameArea]);

  const handleCatchTurkey = async (id: string, isTrueTurkey: boolean) => {
    setTurkeys(prev => prev.filter(t => t.id !== id));
    if (dailyPoints >= 0.5 || !user) return; 

    let newScore = gameScore + (isTrueTurkey ? 1 : -1);
    if (newScore < 0) newScore = 0; 

    let newDailyPoints = dailyPoints;

    if (newScore >= 10) {
      newScore -= 10;
      newDailyPoints += 0.1;
      
      // 🌟 寫入資料庫並立即刷新畫面點數
      await DatabaseHelper.addPoints(user.id, 0.1);
      await refreshUser(); 
    }

    if (newDailyPoints >= 0.5) {
      newDailyPoints = 0.5;
      newScore = 0; 
    }

    setGameScore(newScore);
    setDailyPoints(Number(newDailyPoints.toFixed(1))); 

    // 🌟 存入專屬的金鑰
    await AsyncStorage.setItem(`turkeyScore_${user.id}`, newScore.toString());
    await AsyncStorage.setItem(`turkeyDailyPoints_${user.id}`, newDailyPoints.toString());
  };

  const handleSearch = (text: string) => { 
    setKeyword(text); 
    if (text.trim() === '') setFilteredShops([]); 
    else setFilteredShops(allShops.filter(s => s.name.includes(text))); 
  };

  const toggleBottomSheet = () => { 
    const toValue = isSheetOpen ? 0 : 1; 
    Animated.spring(sheetAnimation, { toValue, useNativeDriver: true, friction: 8 }).start(); 
    setIsSheetOpen(!isSheetOpen); 
  };

  const getCoverImage = (folderName?: string) => { 
    if (!folderName) return DefaultImage; 
    const cleanName = folderName.replace(/\/$/, "").split('/').pop(); 
    if (cleanName && ShopImages[cleanName] && ShopImages[cleanName].length > 0) return ShopImages[cleanName][0]; 
    return DefaultImage; 
  };

  const translateY = sheetAnimation.interpolate({ inputRange: [0, 1], outputRange: [BOTTOM_SHEET_HEIGHT, 0] });

  const renderShopItem = ({ item }: { item: Restaurant }) => ( 
    <TouchableOpacity style={styles.shopCard} onPress={() => router.push({ pathname: '/detail', params: { id: item.id, source: 'keep' } })}> 
      <Image source={getCoverImage(item.image)} style={styles.shopImage} /> 
      <View style={styles.shopInfo}> 
        <Text style={styles.shopName}>{item.name}</Text> 
        <Text style={styles.shopDesc} numberOfLines={1}>{item.addr}</Text> 
      </View> 
      {item.is_favorite === 1 && <Ionicons name="heart" size={24} color="#E53935" />} 
    </TouchableOpacity> 
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#522a6f" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#522a6f" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="搜尋雞肉飯店家..." value={keyword} onChangeText={handleSearch} placeholderTextColor="#a599c9" />
        </View>
      </View>

      {filteredShops.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <FlatList data={filteredShops} keyExtractor={(item) => item.id.toString()} renderItem={renderShopItem} nestedScrollEnabled={true} />
        </View>
      )}

      <View style={styles.gameAreaContainer} onLayout={(e) => setGameArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <View style={styles.scoreboard}>
          <Text style={styles.scoreText}>今日點數: {dailyPoints} / 0.5</Text>
          <Text style={styles.scoreText}>目前分數: {gameScore} / 10</Text>
          {dailyPoints >= 0.5 && <Text style={styles.limitText}>✅ 今日已達上限</Text>}
        </View>

        {turkeys.map(t => (
          <TouchableOpacity key={t.id} activeOpacity={0.7} style={{ position: 'absolute', left: t.x, top: t.y, transform: [{ scaleX: t.isFlipped ? -1 : 1 }] }} onPress={() => handleCatchTurkey(t.id, t.isTrueTurkey)}>
            {t.isTrueTurkey ? (
              <Image source={require('../assets/turkey.png')} style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }} resizeMode="contain" />
            ) : (
              <TurkeyAvatarFrame avatarUri={user?.avatar} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
        <TouchableOpacity style={styles.sheetHeader} activeOpacity={0.8} onPress={toggleBottomSheet}>
          <View style={styles.dragHandle} />
          <View style={styles.sheetTitleRow}>
            <Ionicons name="heart" size={24} color="#E53935" />
            <Text style={styles.sheetTitle}>我的收藏店家清單 ({favorites.length})</Text>
            <Ionicons name={isSheetOpen ? "chevron-down" : "chevron-up"} size={24} color="#522a6f" />
          </View>
        </TouchableOpacity>

        <View style={styles.sheetContent}>
          {favorites.length === 0 ? (
            <Text style={styles.emptyText}>目前還沒有收藏任何店家喔！</Text>
          ) : (
            <FlatList data={favorites} keyExtractor={(item) => item.id.toString()} renderItem={renderShopItem} />
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F1' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, marginBottom: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffebc9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#522a6f', marginRight: 10 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebc9', borderRadius: 25, borderWidth: 2, borderColor: '#522a6f', paddingHorizontal: 15, height: 44 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#522a6f' },
  searchResultsContainer: { maxHeight: 200 }, 
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 12, borderWidth: 2, borderColor: '#EFEBE9', elevation: 2 },
  shopImage: { width: 60, height: 60, borderRadius: 10, marginRight: 12 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 18, fontWeight: 'bold', color: '#433829', marginBottom: 4 },
  shopDesc: { fontSize: 14, color: '#888' },
  gameAreaContainer: { flex: 1, overflow: 'hidden' },
  scoreboard: { position: 'absolute', top: 10, right: 16, backgroundColor: 'rgba(255, 235, 201, 0.85)', padding: 10, borderRadius: 12, borderWidth: 2, borderColor: '#522a6f', zIndex: 10 },
  scoreText: { color: '#522a6f', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  limitText: { color: '#E53935', fontWeight: 'bold', fontSize: 14, marginTop: 4 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BOTTOM_SHEET_HEIGHT + 60, backgroundColor: '#F3EBDD', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, shadowRadius: 5 },
  sheetHeader: { height: 60, alignItems: 'center', paddingVertical: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#a599c9' },
  dragHandle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3, marginBottom: 8 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, marginLeft: 10 },
  sheetContent: { flex: 1, paddingTop: 10, backgroundColor: '#F3EBDD' },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16, color: '#888' }
});