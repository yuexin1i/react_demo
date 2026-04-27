// app/rewards.tsx
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Animated, Easing, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import DatabaseHelper from '../lib/DatabaseHelper';
import { InventoryItem, Reward } from '../lib/types';

export default function RewardsScreen() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'store' | 'bag'>('store');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  
  const popAnim = React.useRef(new Animated.Value(0)).current;

    useFocusEffect(
    useCallback(() => {
      // 🌟 把它們包在一個 async 函式裡，確保「依序執行」避免資料庫打架
      const fetchAllData = async () => {
        if (user && user.id !== -1) {
          await ensureRewardSettings(); 
          await refreshUser();
          await loadData();
        }
      };
      
      fetchAllData();
    }, [user]) // 加入 user 依賴
  );

// 🌟 修正：改用 ? 傳參，避免 Android SQLite 語法解析崩潰 (NullPointerException)
  const ensureRewardSettings = async () => {
    const db = await DatabaseHelper.initDatabase();
    await db.runAsync('UPDATE rewards SET max_redeem = 1 WHERE name LIKE "%寶石捷%" OR name LIKE "%濾鏡%"');
    
    // 自動補齊新商品 
    const hasBag = await db.getFirstAsync('SELECT id FROM rewards WHERE name = ?', ['ㄑㄩㄝno名牌包']);
    if (!hasBag) {
      await db.runAsync('INSERT INTO rewards (name, points_required, icon, max_redeem) VALUES (?, ?, ?, ?)', ['ㄑㄩㄝno名牌包', 500000, '👜', 10]);
    }
    
    const hasFrieren = await db.getFirstAsync('SELECT id FROM rewards WHERE name = ?', ['愛哭的阿罵福利連']);
    if (!hasFrieren) {
      await db.runAsync('INSERT INTO rewards (name, points_required, icon, max_redeem) VALUES (?, ?, ?, ?)', ['愛哭的阿罵福利連', 50000, '🧝‍♀️', 100]);
    }
    
    // 補完後重新抓取一次資料
    setRewards(await DatabaseHelper.getRewards());
  };

  const loadData = async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const dbUser = await DatabaseHelper.getUserById(user.id);
    if (dbUser) {
      setHasCheckedIn(dbUser.last_check_in === todayStr);
      setStreak(dbUser.consecutive_days || 0);
    }
    setRewards(await DatabaseHelper.getRewards());
    setInventory(await DatabaseHelper.getUserInventory(user.id));
  };

  // 🌟 修正 2：修正資料表名稱為 user_inventory
  const clearInventory = async () => {
    if (!user) return;
    Alert.alert('重置確認', '確定要清空背包中所有的內容嗎？這將無法復原。', [
      { text: '取消', style: 'cancel' },
      { text: '確定清空', style: 'destructive', onPress: async () => {
          try {
            const db = await DatabaseHelper.initDatabase();
            // 修正：使用的是 user_inventory 表
            await db.runAsync('DELETE FROM user_inventory WHERE user_id = ?', [user.id]);
            await loadData();
            Alert.alert('已重置', '背包已清空，現在可以重新測試兌換流程了！');
          } catch (e) {
            Alert.alert('錯誤', '清空失敗');
            console.error(e);
          }
        } 
      }
    ]);
  };

  const handleCheckIn = async () => {
    if (!user) return;
    const res = await DatabaseHelper.checkIn(user.id);
    if (res.success) {
      setHasCheckedIn(true);
      setStreak(res.consecutiveDays);
      await refreshUser();
      Animated.sequence([
        Animated.timing(popAnim, { toValue: 1, duration: 300, easing: Easing.back(2), useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(popAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start();
    } else {
      Alert.alert('提示', res.message);
    }
  };

const handleRedeem = (reward: Reward) => {
    if (!user) return;
    
    // 🌟 新增：計算背包裡已經有幾個這個商品
    if (reward.max_redeem > 0) {
      const ownedCount = inventory.filter(item => item.reward_id === reward.id).length;
      if (ownedCount >= reward.max_redeem) {
        return Alert.alert('提示', `此商品限量 ${reward.max_redeem} 個，您已經達到兌換上限囉！`);
      }
    }

    Alert.alert('確認兌換', `確定花費 ${reward.points_required} 點兌換「${reward.name}」嗎？`, [
      { text: '取消', style: 'cancel' },
      { text: '兌換', onPress: async () => {
          const res = await DatabaseHelper.redeemReward(user.id, reward.id, reward.points_required);
          if (res.success) {
            await refreshUser();
            await loadData();
            Alert.alert('成功', `已獲得 ${reward.name}！`);
          } else {
            Alert.alert('失敗', res.message);
          }
        } 
      }
    ]);
  };

const renderReward = ({ item }: { item: Reward }) => {
    const canAfford = (user?.points || 0) >= item.points_required;
    
    // 🌟 新增：計算已經擁有幾個，以及是否已達上限
    const ownedCount = inventory.filter(i => i.reward_id === item.id).length;
    const isSoldOut = item.max_redeem > 0 && ownedCount >= item.max_redeem;
    
    const disabled = !canAfford || isSoldOut;

    return (
      <View style={styles.card}>
        <Text style={styles.cardIcon}>{item.icon}</Text>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardPrice}>🪙 {item.points_required} 點</Text>
        
        {/* 🌟 顯示目前已經擁有的數量 */}
        <Text style={{fontSize: 12, color: '#888', marginBottom: 8}}>
          {item.max_redeem > 0 ? `限量: ${ownedCount} / ${item.max_redeem}` : '不限數量'}
        </Text>

        <TouchableOpacity 
          style={[styles.actionBtn, disabled ? styles.btnDisabled : styles.btnActive]} 
          onPress={() => handleRedeem(item)}
          disabled={disabled}
        >
          <Text style={styles.btnText}>
            {isSoldOut ? '已達上限' : canAfford ? '立即兌換' : '點數不足'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInventory = ({ item }: { item: InventoryItem }) => (
    <View style={styles.invCard}>
      <Text style={styles.invIcon}>{item.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.invName}>{item.name}</Text>
        <Text style={styles.invDate}>兌換日期: {item.created_at}</Text>
      </View>
      <Text style={item.status === 1 ? styles.statusUsed : styles.statusFresh}>
        {item.status === 1 ? '已使用' : '可使用'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.sectionA}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.pointsText}>目前積分：🪙 {((user?.points || 0)).toFixed(1)} 點</Text>
          <TouchableOpacity 
            onLongPress={async () => {
              if(user) {
                const db = await DatabaseHelper.initDatabase();
                await db.runAsync('UPDATE users SET points = points + 1000000 WHERE id = ?', [user.id]);
                await refreshUser();
                Alert.alert("測試模式", "已手動增加 100 萬點！");
              }
            }}
            delayLongPress={2000}
          >
            <Text style={{ color: 'rgba(255,255,255,0.2)', marginLeft: 10 }}>[TEST]</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={[styles.checkInBtn, hasCheckedIn && styles.checkInBtnDisabled]} onPress={handleCheckIn} disabled={hasCheckedIn}>
          <Text style={styles.checkInText}>{hasCheckedIn ? '今日已簽到 ✅' : '📅 點我簽到 (+10點)'}</Text>
        </TouchableOpacity>
        <Text style={styles.streakLabel}>🔥 連續簽到 {streak} 天</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'store' && styles.tabActive]} onPress={() => setActiveTab('store')}>
          <Text style={[styles.tabText, activeTab === 'store' && styles.tabTextActive]}>🛒 點數商城</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'bag' && styles.tabActive]} onPress={() => setActiveTab('bag')}>
          <Text style={[styles.tabText, activeTab === 'bag' && styles.tabTextActive]}>🎒 我的背包</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'store' ? (
        <FlatList 
          key="store-list"
          data={rewards} 
          numColumns={2} 
          keyExtractor={(item) => item.id.toString()} 
          renderItem={renderReward} 
          contentContainerStyle={styles.listContainer} 
        />
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity onLongPress={clearInventory} delayLongPress={2000}>
            <Text style={{ textAlign: 'center', color: '#888', marginVertical: 5, fontSize: 12 }}>--- 背包清單 (長按此處重置) ---</Text>
          </TouchableOpacity>
          <FlatList
            key="bag-list"
            data={inventory}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderInventory}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.emptyText}>背包空空如也</Text>}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F1' },
  sectionA: { backgroundColor: '#522a6f', padding: 20, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  pointsText: { color: '#ffebc9', fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  checkInBtn: { backgroundColor: '#ffeb3b', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  checkInBtnDisabled: { backgroundColor: '#a599c9' },
  checkInText: { color: '#522a6f', fontSize: 18, fontWeight: 'bold' },
  streakLabel: { color: 'white', marginTop: 15, fontSize: 14 },
  tabRow: { flexDirection: 'row', margin: 15, backgroundColor: '#e0d8e8', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: 'white' },
  tabText: { color: '#888', fontWeight: 'bold' },
  tabTextActive: { color: '#522a6f' },
  listContainer: { paddingHorizontal: 10, paddingBottom: 20 },
  card: { flex: 1, backgroundColor: 'white', margin: 8, borderRadius: 16, padding: 15, alignItems: 'center', elevation: 2 },
  cardIcon: { fontSize: 40, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#433829', textAlign: 'center', height: 40 },
  cardPrice: { fontSize: 14, color: '#E53935', fontWeight: 'bold', marginVertical: 8 },
  actionBtn: { width: '100%', paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  btnActive: { backgroundColor: '#522a6f' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: 'white', fontWeight: 'bold' },
  invCard: { flexDirection: 'row', backgroundColor: 'white', marginHorizontal: 8, marginBottom: 10, padding: 15, borderRadius: 12, alignItems: 'center' },
  invIcon: { fontSize: 30, marginRight: 15 },
  invName: { fontSize: 16, fontWeight: 'bold' },
  invDate: { fontSize: 12, color: '#888' },
  statusFresh: { color: '#4CAF50', fontWeight: 'bold' },
  statusUsed: { color: '#aaa', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' }
});