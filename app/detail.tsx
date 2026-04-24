// app/detail.tsx
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { Picker } from '@react-native-picker/picker'; // 🌟 記得匯入 Picker
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatabaseHelper from '../lib/DatabaseHelper';
import { DefaultImage, ShopImages } from '../lib/ImageMap';
import { Restaurant } from '../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DetailScreen() {
  const { id } = useLocalSearchParams(); 
  const [allShops, setAllShops] = useState<Restaurant[]>([]); // 🌟 用來給 Picker 用的清單
  const [selectedShop, setSelectedShop] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const scrollX = useRef(new Animated.Value(0)).current;

  // 🌟 初始化讀取資料
  useEffect(() => {
    DatabaseHelper.getAllRestaurants().then((data) => {
      setAllShops(data);
      if (id) {
        // 如果是從搜尋/收藏頁面帶 ID 過來，顯示指定店家
        const shop = data.find(s => s.id === Number(id));
        setSelectedShop(shop || null);
      } else if (data.length > 0) {
        // 如果是從首頁直接過來(沒帶ID)，預設顯示第一間店
        setSelectedShop(data[0]);
      }
      setIsLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (selectedShop) {
      scrollX.setValue(0);
      Animated.loop(
        Animated.timing(scrollX, {
          toValue: -SCREEN_WIDTH,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [selectedShop]);

  const toggleFavorite = async () => {
    if (!selectedShop) return;
    try {
      await DatabaseHelper.toggleFavorite(selectedShop.id, selectedShop.is_favorite || 0);
      setSelectedShop({
        ...selectedShop,
        is_favorite: selectedShop.is_favorite === 1 ? 0 : 1
      });
    } catch (e) {
      Alert.alert('錯誤', '無法更新收藏狀態');
    }
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

  const checkIsOpen = (hoursString?: string): boolean => {
    if (!hoursString || hoursString === '暫無資訊') return false;
    const now = new Date();
    const currentWeekday = now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    const todayChar = dayNames[currentWeekday];
    
    const restMatch = hoursString.match(/星期([^，,]*?)休息/);
    if (restMatch && restMatch[1].includes(todayChar)) return false;

    const timeRegex = /(\d{1,2}):(\d{2})\s*[-–~]\s*(\d{1,2}):(\d{2})/g;
    let match;
    let hasTimeRange = false;
    let isOpen = false;

    while ((match = timeRegex.exec(hoursString)) !== null) {
      hasTimeRange = true;
      const startMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      const endMins = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
      if (startMins > endMins) {
        if (currentMins >= startMins || currentMins <= endMins) isOpen = true;
      } else {
        if (currentMins >= startMins && currentMins <= endMins) isOpen = true;
      }
    }
    if (hasTimeRange) return isOpen;
    return true;
  };

  const handleOpenMap = async (address?: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('錯誤', '無法開啟地圖應用程式');
  };

  const handleCallPhone = async (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const url = `tel:${cleanPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('錯誤', '無法撥打電話');
  };

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="white" /></View>;
  if (!selectedShop) return <View style={styles.loadingContainer}><Text style={{color: 'white', fontSize: 18}}>找不到店家資訊</Text></View>;

  const currentPhotos = getShopPhotos(selectedShop.image);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 🌟 頂部導覽列：包含下拉選單與跳轉搜尋的按鈕 */}
      <View style={styles.headerBar}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedShop?.id}
            onValueChange={(itemValue) => {
              const shop = allShops.find(s => s.id === itemValue);
              if (shop) setSelectedShop(shop);
            }}
            style={{ color: '#522a6f' }}
            dropdownIconColor="#522a6f"
          >
            {allShops.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
          </Picker>
        </View>

        <TouchableOpacity onPress={() => router.push('/keep')} style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#522a6f" />
        </TouchableOpacity>
      </View>

      <ScrollView>
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
        <View style={styles.infoWrapper}>
          <View style={styles.titleRow}>
            <Text style={styles.shopTitle}>🪧 {selectedShop.name}</Text>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
              <Ionicons 
                name={selectedShop.is_favorite === 1 ? "heart" : "heart-outline"} 
                size={36} 
                color={selectedShop.is_favorite === 1 ? "#E53935" : "#433829"} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTextBold}>{selectedShop.desc}</Text>
            <View style={styles.divider} />
            <View style={[styles.statusBadge, { backgroundColor: checkIsOpen(selectedShop.time) ? '#4CAF50' : '#E53935' }]}>
              <Text style={styles.statusText}>{checkIsOpen(selectedShop.time) ? '營業中' : '休息中'}</Text>
            </View>
            <Text style={styles.infoText}>🕰️ 營業時間: {selectedShop.time}</Text>
            <Text style={styles.infoText}>📍 地址: {selectedShop.addr}</Text>
            <Text style={styles.infoText}>🤙 電話: {selectedShop.phone}</Text>
            <Text style={styles.infoText}>🪙 價格: {selectedShop.price}</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenMap(selectedShop.addr)}>
              <Text style={styles.actionButtonText}>🗺️ 開啟導航</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleCallPhone(selectedShop.phone)}>
              <Text style={styles.actionButtonText}>📞 撥打電話</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={() => router.push({ pathname: '/image-overview', params: { id: selectedShop.id, folderName: selectedShop.image } })}
          >
            <Text style={styles.galleryButtonText}>📸 查看所有圖片 / 上傳照片</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#a599c9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#a599c9' },
  
  // 🌟 修改的 Header 樣式
  headerBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 12, alignItems: 'center' },
  pickerContainer: { flex: 1, borderWidth: 3, borderColor: '#522a6f', borderRadius: 25, backgroundColor: '#ffebc9', height: 50, justifyContent: 'center', overflow: 'hidden' },
  searchButton: { backgroundColor: '#ffebc9', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#522a6f' },
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  favoriteButton: { padding: 4 },
  
  carouselWrapper: { width: SCREEN_WIDTH - 40, height: 320, alignSelf: 'center', borderWidth: 8, borderColor: '#F3EBDD', borderRadius: 20, overflow: 'hidden', backgroundColor: 'white' },
  carouselImage: { width: SCREEN_WIDTH - 56, height: 320 },
  marqueeContainer: { backgroundColor: '#522a6f', height: 45, marginVertical: 10, overflow: 'hidden', justifyContent: 'center' },
  marqueeContent: { flexDirection: 'row', width: SCREEN_WIDTH * 2 },
  marqueeText: { fontSize: 18, fontWeight: 'bold', letterSpacing: 3, textShadowColor: 'black', textShadowRadius: 1 },
  infoWrapper: { padding: 16 },
  shopTitle: { fontSize: 28, color: '#433829', fontWeight: 'bold', flex: 1 },
  infoCard: { borderWidth: 2, borderColor: '#522a6f', borderRadius: 16, padding: 14, backgroundColor: '#a599c9' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1 },
  statusText: { color: 'white', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  infoText: { color: '#fae7a1', fontSize: 18, marginVertical: 3 },
  infoTextBold: { color: '#fae7a1', fontSize: 22, fontWeight: 'bold' },
  divider: { height: 2, backgroundColor: '#522a6f', marginVertical: 10 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
  actionButton: { flex: 1, backgroundColor: '#522a6f', padding: 14, borderRadius: 12, alignItems: 'center', elevation: 3 },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  galleryButton: { backgroundColor: '#522a6f', padding: 15, borderRadius: 12, marginTop: 15, alignItems: 'center', elevation: 3 },
  galleryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});