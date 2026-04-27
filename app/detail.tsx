// app/detail.tsx
import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import DatabaseHelper from '../lib/DatabaseHelper';
import { DefaultImage, ShopImages } from '../lib/ImageMap';
import { Restaurant } from '../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


interface Review {
  id: number;
  nickname: string;
  content: string;
  created_at: string;
}

export default function DetailScreen() {
  const { id } = useLocalSearchParams(); 
  const { user, refreshUser } = useAuth(); 
  
  const [allShops, setAllShops] = useState<Restaurant[]>([]); 
  const [selectedShop, setSelectedShop] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      if (user) {
        // 🌟 傳入 user.id 來獲取該帳號專屬的愛心狀態
        DatabaseHelper.getAllRestaurants(user.id).then((data) => {
          setAllShops(data);
          
          // 🌟 使用 callback 取得當前的 selectedShop，避免被 refreshUser 重置
          setSelectedShop((prevShop) => {
            // 1. 如果已經透過 Picker 選了某間店，就維持那間店（並用最新的 data 更新它，確保愛心狀態正確）
            if (prevShop) {
              return data.find(s => s.id === prevShop.id) || data[0];
            }
            // 2. 如果是剛跳轉進這個畫面，依照路由的 id 來選
            if (id) {
              return data.find(s => s.id === Number(id)) || null;
            }
            // 3. 預設選第一間
            return data.length > 0 ? data[0] : null;
          });

          setIsLoading(false);
        });
      }
    }, [id, user]);

  useEffect(() => {
    if (selectedShop) {
      loadReviews(selectedShop.id);
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

  const loadReviews = async (restaurantId: number) => {
    const data = await DatabaseHelper.getReviews(restaurantId);
    setReviews(data);
  };

  const handleSubmitReview = async () => {
    if (!newReviewText.trim()) return Alert.alert('提示', '請輸入評論內容！');
    if (!user || !selectedShop) return;

    const res = await DatabaseHelper.addReview(user.id, selectedShop.id, newReviewText.trim());
    if (res.success) {
      setNewReviewText(''); 
      await loadReviews(selectedShop.id); 
      if (res.pointsEarned > 0) await refreshUser();
      Alert.alert('提示', res.message);
    }
  };

  // 🌟 修改：更新收藏也必須帶入 user.id
  const toggleFavorite = async () => {
    if (!selectedShop || !user) return;
    try {
      await DatabaseHelper.toggleFavorite(user.id, selectedShop.id);
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
    if (ShopImages[cleanName] && ShopImages[cleanName].length > 0) return ShopImages[cleanName]; 
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
    let match; let hasTimeRange = false; let isOpen = false;
    while ((match = timeRegex.exec(hoursString)) !== null) {
      hasTimeRange = true;
      const startMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      const endMins = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
      if (startMins > endMins) { if (currentMins >= startMins || currentMins <= endMins) isOpen = true; } 
      else { if (currentMins >= startMins && currentMins <= endMins) isOpen = true; }
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
    try {
      // 🔪 刪除 canOpenURL 檢查，直接強制開啟！
      await Linking.openURL(url);
    } catch (error) {
      // 萬一裝置真的沒有撥號器（例如某些平板），再跳出錯誤
      Alert.alert('提示', '無法開啟撥號介面');
      console.log('Phone call error:', error);
    }
  };
  
  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="white" /></View>;
  if (!selectedShop) return <View style={styles.loadingContainer}><Text style={{color: 'white', fontSize: 18}}>找不到店家資訊</Text></View>;

  const currentPhotos = getShopPhotos(selectedShop.image);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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

        <View style={styles.infoWrapper}>
          <View style={styles.titleRow}>
            <Text style={styles.shopTitle}>🪧 {selectedShop.name}</Text>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
              <Ionicons name={selectedShop.is_favorite === 1 ? "heart" : "heart-outline"} size={36} color={selectedShop.is_favorite === 1 ? "#E53935" : "#433829"} />
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

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>💬 饕客評論區 ({reviews.length})</Text>
          <View style={styles.reviewInputContainer}>
            <TextInput style={styles.reviewInput} placeholder="這家雞肉飯好吃嗎？留言賺點數！" placeholderTextColor="#888" value={newReviewText} onChangeText={setNewReviewText} multiline />
            <TouchableOpacity style={styles.reviewSubmitBtn} onPress={handleSubmitReview}>
              <Text style={styles.reviewSubmitText}>送出</Text>
            </TouchableOpacity>
          </View>
          {/* 🌟 判斷：只有當這間店真的完全沒有人留言時，才顯示提示 */}
          {reviews.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#522a6f', marginTop: 10 }}>
              目前還沒有評論，快來搶頭香賺 10 點！
            </Text>
          )}
          
          {reviews.map((rev) => (
            <View key={rev.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>👤 {rev.nickname}</Text>
                <Text style={styles.reviewDate}>{rev.created_at}</Text>
              </View>
              
              {/* 留言的內文 */}
              <Text style={styles.reviewContent}>{rev.content}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#a599c9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#a599c9' },
  headerBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 12, alignItems: 'center' },
  pickerContainer: { flex: 1, borderWidth: 3, borderColor: '#522a6f', borderRadius: 25, backgroundColor: '#ffebc9', height: 50, justifyContent: 'center', overflow: 'hidden' },
  searchButton: { backgroundColor: '#ffebc9', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#522a6f' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  favoriteButton: { padding: 2 },
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
  galleryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  reviewSection: { marginTop: 10, paddingHorizontal: 16 },
  reviewSectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffebc9', marginBottom: 15 },
  reviewInputContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  reviewInput: { flex: 1, backgroundColor: '#F9F7F1', borderRadius: 12, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, borderWidth: 2, borderColor: '#522a6f', fontSize: 16, minHeight: 50 },
  reviewSubmitBtn: { backgroundColor: '#ffebc9', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 12, borderWidth: 2, borderColor: '#522a6f' },
  reviewSubmitText: { color: '#522a6f', fontWeight: 'bold', fontSize: 16 },
  reviewItem: { backgroundColor: '#F9F7F1', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#522a6f', elevation: 2 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  reviewAuthor: { fontWeight: 'bold', color: '#522a6f', fontSize: 16 },
  reviewDate: { color: '#888', fontSize: 12 },
  reviewContent: { color: '#433829', fontSize: 16, lineHeight: 22 }
});