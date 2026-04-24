// app/keep.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseHelper from '../lib/DatabaseHelper';
import { DefaultImage, ShopImages } from '../lib/ImageMap';
import { Restaurant } from '../lib/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.6; 

export default function KeepScreen() {
  const [allShops, setAllShops] = useState<Restaurant[]>([]);
  const [filteredShops, setFilteredShops] = useState<Restaurant[]>([]);
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const sheetAnimation = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await DatabaseHelper.getAllRestaurants();
    const favData = await DatabaseHelper.getFavoriteRestaurants();
    setAllShops(data);
    setFilteredShops([]); // 🌟 預設清空搜尋結果，不要列出所有店家
    setFavorites(favData);
  };

  const handleSearch = (text: string) => {
    setKeyword(text);
    if (text.trim() === '') {
      setFilteredShops([]); // 🌟 空白時不顯示
    } else {
      setFilteredShops(allShops.filter(s => s.name.includes(text)));
    }
  };

  const toggleBottomSheet = () => {
    const toValue = isSheetOpen ? 0 : 1;
    Animated.spring(sheetAnimation, {
      toValue,
      useNativeDriver: true,
      friction: 8,
    }).start();
    setIsSheetOpen(!isSheetOpen);
  };

  const getCoverImage = (folderName?: string) => {
    if (!folderName) return DefaultImage;
    const cleanName = folderName.replace(/\/$/, "").split('/').pop();
    if (cleanName && ShopImages[cleanName] && ShopImages[cleanName].length > 0) {
      return ShopImages[cleanName][0]; 
    }
    return DefaultImage;
  };

  const translateY = sheetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [BOTTOM_SHEET_HEIGHT, 0] 
  });

  const renderShopItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity 
      style={styles.shopCard}
      onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })}
    >
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
      
      {/* 🌟 頂部搜尋列與返回按鈕 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#522a6f" />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#522a6f" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋雞肉飯店家..."
            value={keyword}
            onChangeText={handleSearch}
            placeholderTextColor="#a599c9"
          />
        </View>
      </View>

      {/* 🌟 搜尋結果列表 (設定 maxHeight 限制高度，大約等於兩條資料高度) */}
      {filteredShops.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <FlatList
            data={filteredShops}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderShopItem}
            nestedScrollEnabled={true} // 允許內部滑動
          />
        </View>
      )}

      {/* 底部上拉收藏選單 (Bottom Sheet) */}
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
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderShopItem}
            />
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F1' },
  
  // 🌟 搜尋列與返回按鈕排版
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, marginBottom: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffebc9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#522a6f', marginRight: 10 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebc9', borderRadius: 25, borderWidth: 2, borderColor: '#522a6f', paddingHorizontal: 15, height: 44 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#522a6f' },
  
  // 🌟 限制搜尋結果高度
  searchResultsContainer: { maxHeight: 200 }, 
  
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 12, borderWidth: 2, borderColor: '#EFEBE9', elevation: 2 },
  shopImage: { width: 60, height: 60, borderRadius: 10, marginRight: 12 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 18, fontWeight: 'bold', color: '#433829', marginBottom: 4 },
  shopDesc: { fontSize: 14, color: '#888' },
  
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: BOTTOM_SHEET_HEIGHT + 60, backgroundColor: '#F3EBDD', borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, shadowRadius: 5 },
  sheetHeader: { height: 60, alignItems: 'center', paddingVertical: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#a599c9' },
  dragHandle: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3, marginBottom: 8 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, marginLeft: 10 },
  sheetContent: { flex: 1, paddingTop: 10, backgroundColor: '#F3EBDD' },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16, color: '#888' }
});