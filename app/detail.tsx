// app/detail.tsx 完整程式碼
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// 🌟 引入 SafeAreaView
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseHelper from '../lib/DatabaseHelper';
import { DefaultImage, ShopImages } from '../lib/ImageMap';
import { Restaurant } from '../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DetailScreen() {
  const [allShops, setAllShops] = useState<Restaurant[]>([]);
  const [filteredShops, setFilteredShops] = useState<Restaurant[]>([]);
  const [selectedShop, setSelectedShop] = useState<Restaurant | null>(null);
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    DatabaseHelper.getAllRestaurants().then((data) => {
      setAllShops(data);
      setFilteredShops(data);
      if (data.length > 0) setSelectedShop(data[0]);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    scrollX.setValue(0);
    Animated.loop(
      Animated.timing(scrollX, {
        toValue: -SCREEN_WIDTH,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [selectedShop]);

  const handleSearch = () => {
    const results = allShops.filter(s => s.name.includes(keyword));
    setFilteredShops(results);
    setSelectedShop(results.length > 0 ? results[0] : null);
  };

  const getShopPhotos = (folderName?: string) => {
    if (!folderName) return [DefaultImage];
    const parts = folderName.replace(/\/$/, "").split('/');
    const cleanName = parts[parts.length - 1];
    
    if (ShopImages[cleanName] && ShopImages[cleanName].length > 0) {
      return ShopImages[cleanName]; 
    }
    return [DefaultImage]; 
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="white" /></View>;
  }

  const currentPhotos = getShopPhotos(selectedShop?.image);

  return (
    // 🌟 使用 SafeAreaView 並保護底部 (edges=['bottom'])
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        {/* 搜尋列 */}
        <View style={styles.searchRow}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedShop?.id}
              onValueChange={(itemValue) => setSelectedShop(filteredShops.find(s => s.id === itemValue) || null)}
              style={{ color: '#522a6f' }}
            >
              {filteredShops.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
            </Picker>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="搜尋..."
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSearch}
          />
        </View>

        {/* 圖片輪播 */}
        <View style={styles.carouselWrapper}>
          <FlatList
            data={currentPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Image source={item} style={styles.carouselImage} resizeMode="cover" />
            )}
          />
        </View>

        {/* 跑馬燈 */}
        <View style={styles.marqueeContainer}>
          <Animated.View style={[styles.marqueeContent, { transform: [{ translateX: scrollX }] }]}>
            {[0, 1].map((_, copyIndex) => (
              <MaskedView
                key={copyIndex}
                maskElement={
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                    {Array.from(`🕰️ 營業時間：${selectedShop?.time ?? ''}   `).map((char, i) => (
                      <Text key={i} style={styles.marqueeText}>{char}</Text>
                    ))}
                  </View>
                }
              >
                <LinearGradient
                  colors={['#FF9999', '#FFB366', '#FFE066', '#99DD99', '#66B3FF', '#AA88FF', '#FF99CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  {Array.from(`🕰️ 營業時間：${selectedShop?.time ?? ''}   `).map((char, i) => (
                    <Text key={i} style={[styles.marqueeText, { opacity: 0 }]}>{char}</Text>
                  ))}
                </LinearGradient>
              </MaskedView>
            ))}
          </Animated.View>
</View>

        {/* 詳細資訊 */}
        {selectedShop && (
          <View style={styles.infoWrapper}>
            <Text style={styles.shopTitle}>🪧 {selectedShop.name}</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoTextBold}>{selectedShop.desc}</Text>
              <View style={styles.divider} />
              <Text style={styles.infoText}>🕰️ 營業時間: {selectedShop.time}</Text>
              <Text style={styles.infoText}>📍 地址: {selectedShop.addr}</Text>
              <Text style={styles.infoText}>🤙 電話: {selectedShop.phone}</Text>
              <Text style={styles.infoText}>🪙 價格: {selectedShop.price}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.galleryButton}
              onPress={() => router.push({ pathname: '/image-overview', params: { id: selectedShop.id, folderName: selectedShop.image } })}
            >
              <Text style={styles.galleryButtonText}>📸 查看所有圖片 / 上傳照片</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 樣式部分保持不變...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#a599c9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#a599c9' },
  searchRow: { flexDirection: 'row', padding: 10, gap: 10 },
  pickerContainer: { flex: 4, borderWidth: 3, borderColor: '#522a6f', borderRadius: 25, backgroundColor: '#ffebc9', overflow: 'hidden' },
  searchInput: { flex: 3, backgroundColor: '#ffebc9', borderRadius: 25, borderWidth: 2, borderColor: '#522a6f', paddingHorizontal: 15 },
  carouselWrapper: { width: SCREEN_WIDTH - 40, height: 320, alignSelf: 'center', borderWidth: 8, borderColor: '#F3EBDD', borderRadius: 20, overflow: 'hidden', backgroundColor: 'white' },
  carouselImage: { width: SCREEN_WIDTH - 56, height: 320 },
  marqueeContainer: { backgroundColor: '#522a6f', height: 45, marginVertical: 10, overflow: 'hidden', justifyContent: 'center' },
  marqueeContent: { flexDirection: 'row', width: SCREEN_WIDTH * 2 },
  marqueeText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
    textShadowColor: 'black',
    textShadowRadius: 1,
  },
  infoWrapper: { padding: 16 },
  shopTitle: { fontSize: 28, color: '#433829', fontWeight: 'bold', marginBottom: 10 },
  infoCard: { borderWidth: 2, borderColor: '#522a6f', borderRadius: 16, padding: 12, backgroundColor: '#a599c9' },
  infoText: { color: '#fae7a1', fontSize: 18, marginVertical: 2 },
  infoTextBold: { color: '#fae7a1', fontSize: 22, fontWeight: 'bold' },
  divider: { height: 2, backgroundColor: '#522a6f', marginVertical: 8 },
  galleryButton: { backgroundColor: '#522a6f', padding: 15, borderRadius: 12, marginTop: 15, alignItems: 'center' },
  galleryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});