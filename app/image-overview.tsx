// app/image-overview.tsx
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ImageView from "react-native-image-viewing"; // 🌟 請確保有安裝此套件
import DatabaseHelper from '../lib/DatabaseHelper';
import { ShopImages } from '../lib/ImageMap';

// 🌟 新增：計算每個項目的精確寬度
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// 螢幕總寬 - 容器 padding (左右各 8 = 16) - 每個項目的 margin (2 個項目左右各 6 = 24)
const ITEM_WIDTH = (SCREEN_WIDTH - 40) / 2; 

export default function ImageOverviewScreen() {
  const { id, folderName } = useLocalSearchParams(); 
  const restaurantId = Number(id); 

  let cleanName = '';
  if (typeof folderName === 'string') {
    const parts = folderName.replace(/\/$/, "").split('/');
    cleanName = parts[parts.length - 1];
  }

  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (restaurantId) {
      loadPhotos();
    }
  }, [restaurantId]);

  const loadPhotos = async () => {
    const photos = await DatabaseHelper.getUserPhotos(restaurantId);
    setUserPhotos(photos);
  };

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    }

    if (!result.canceled && result.assets[0].uri) {
      await DatabaseHelper.insertUserPhoto(restaurantId, result.assets[0].uri);
      loadPhotos();
    }
  };

  const showPickOptions = () => {
    Alert.alert("新增照片", "請選擇來源", [
      { text: "從相簿選取", onPress: () => pickImage(false) },
      { text: "開啟相機拍照", onPress: () => pickImage(true) },
      { text: "取消", style: "cancel" }
    ]);
  };

  const handleLongPress = (path: string) => {
    Alert.alert("刪除照片", "確定要刪除嗎？", [
      { text: "取消", style: "cancel" },
      { text: "刪除", style: "destructive", onPress: async () => {
          await DatabaseHelper.deleteUserPhoto(path);
          loadPhotos();
        } 
      }
    ]);
  };

  const officialPhotos = (cleanName && ShopImages[cleanName]) ? ShopImages[cleanName] : [];
  
  // 合併資料流 (排除掉 CAMERA_BUTTON 用於 Viewer)
  const data = ['CAMERA_BUTTON', ...userPhotos, ...officialPhotos];
  
  // 轉換成 ImageView 需要的格式
  const viewerImages = data
    .filter(item => item !== 'CAMERA_BUTTON')
    .map(item => typeof item === 'string' ? { uri: item } : Image.resolveAssetSource(item));

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        numColumns={2}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => {
          if (item === 'CAMERA_BUTTON') {
            return (
              <TouchableOpacity style={styles.cameraBox} onPress={showPickOptions}>
                <Text style={{ fontSize: 40, color: 'white' }}>📷</Text>
              </TouchableOpacity>
            );
          }

          const isUserPhoto = typeof item === 'string';
          const imageSource = isUserPhoto ? { uri: item } : item;

          return (
            <TouchableOpacity 
              onPress={() => {
                setCurrentImageIndex(index - 1); // 扣除按鈕的 index
                setIsViewerVisible(true);
              }}
              onLongPress={() => isUserPhoto ? handleLongPress(item) : null}
              style={styles.imageBox}
            >
              <Image source={imageSource} style={styles.image} />
            </TouchableOpacity>
          );
        }}
      />

      {/* 🌟 支援手勢縮放與左右滑動的圖片檢視器 */}
      <ImageView
        images={viewerImages}
        imageIndex={currentImageIndex}
        visible={isViewerVisible}
        onRequestClose={() => setIsViewerVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
      />
    </View>
  );
}

// 🌟 修改：將 flex: 1 替換為精準計算好的 width: ITEM_WIDTH
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF', padding: 8 },
  cameraBox: { width: ITEM_WIDTH, margin: 6, aspectRatio: 1, backgroundColor: '#ccc', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  imageBox: { width: ITEM_WIDTH, margin: 6, aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});