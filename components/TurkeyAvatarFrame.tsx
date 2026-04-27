// components/TurkeyAvatarFrame.tsx
import React from 'react';
import { Image, Text, View } from 'react-native';

// 輸出尺寸常數，讓其他地方(如小遊戲)可以參考
export const FRAME_WIDTH = 70; 
export const FRAME_HEIGHT = FRAME_WIDTH * (640 / 620); // 約 113.5

export default function TurkeyAvatarFrame({ avatarUri }: { avatarUri?: string | null }) {
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