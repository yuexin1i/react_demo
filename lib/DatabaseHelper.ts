// lib/DatabaseHelper.ts
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { InventoryItem, Restaurant, Reward } from './types';

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin1234';

export interface User {
  id: number;
  email: string;
  nickname: string;
  points: number;
  is_admin: number;
  avatar?: string | null;
  last_check_in?: string | null;
  consecutive_days?: number;
}

class DatabaseHelper {
  private static instance: DatabaseHelper;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseHelper {
    if (!DatabaseHelper.instance) {
      DatabaseHelper.instance = new DatabaseHelper();
    }
    return DatabaseHelper.instance;
  }

  public async initDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;

    const dbName = 'food_data.db';
    const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
    const fileInfo = await FileSystem.getInfoAsync(dbFilePath);

    if (!fileInfo.exists) {
      console.log('>>> 開始複製 data.db 從 assets...');
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true });
      const [{ localUri }] = await Asset.loadAsync(require('../assets/data.db'));
      if (localUri) {
        await FileSystem.copyAsync({ from: localUri, to: dbFilePath });
      }
    }

    this.db = await SQLite.openDatabaseAsync(dbName);

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar TEXT DEFAULT NULL,
        points INTEGER DEFAULT 0,
        last_check_in TEXT DEFAULT NULL,
        consecutive_days INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
      )
    `);

    try { await this.db.runAsync(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL`); } catch (_) {}
    try { await this.db.runAsync(`ALTER TABLE users ADD COLUMN consecutive_days INTEGER DEFAULT 0`); } catch (_) {}

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL
      )
    `);

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        points_required INTEGER NOT NULL,
        icon TEXT NOT NULL,
        max_redeem INTEGER DEFAULT 0
      )
    `);

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        reward_id INTEGER NOT NULL,
        status INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);

    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // 🌟 新增：使用者專屬收藏表 (確保每個人收藏獨立)
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        UNIQUE(user_id, restaurant_id)
      )
    `);

    const rewardsCount = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM rewards');
    if (rewardsCount?.count === 0) {
      await this.db.runAsync(`INSERT INTO rewards (name, points_required, icon, max_redeem) VALUES 
        ('火雞肉飯 折價卷', 150, '🎫', 0),
        ('騎火雞頭像濾鏡', 100, '🦃', 1),
        ('寶石捷 限量 一台', 3000000, '🏎️', 1),
        ('ㄑㄩㄝno名牌包', 500000, '👜', 10),
        ('愛哭的阿罵福利連', 50000, '🧝‍♀️', 100)
      `);
    }

    return this.db;
  }

  // 🌟 修改：所有取得餐廳的方法都加入 userId 判斷
  public async getAllRestaurants(userId: number): Promise<Restaurant[]> {
    const db = await this.initDatabase();
    const result = await db.getAllAsync<any>(
      `SELECT r.id, r.name, r.asset_folder, r.description, r.time, r.address, r.phone, r.price, 
              CASE WHEN uf.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite 
       FROM restaurants r 
       LEFT JOIN user_favorites uf ON r.id = uf.restaurant_id AND uf.user_id = ?`,
       [userId]
    );
    return result.map(row => ({
      id: row.id, name: row.name.toString(), image: row.asset_folder.toString(), desc: row.description.toString(), time: row.time.toString(), addr: row.address.toString(), phone: row.phone.toString(), price: row.price.toString(), is_favorite: row.is_favorite
    }));
  }

  // 🌟 修改：切換收藏寫入獨立表
  public async toggleFavorite(userId: number, restaurantId: number): Promise<void> {
    const db = await this.initDatabase();
    const exists = await db.getFirstAsync('SELECT id FROM user_favorites WHERE user_id = ? AND restaurant_id = ?', [userId, restaurantId]);
    if (exists) {
      await db.runAsync('DELETE FROM user_favorites WHERE user_id = ? AND restaurant_id = ?', [userId, restaurantId]);
    } else {
      await db.runAsync('INSERT INTO user_favorites (user_id, restaurant_id) VALUES (?, ?)', [userId, restaurantId]);
    }
  }

  // 🌟 修改：只抓取該使用者的收藏
  public async getFavoriteRestaurants(userId: number): Promise<Restaurant[]> {
    const db = await this.initDatabase();
    const result = await db.getAllAsync<any>(
      `SELECT r.id, r.name, r.asset_folder, r.description, r.time, r.address, r.phone, r.price, 1 as is_favorite 
       FROM restaurants r 
       JOIN user_favorites uf ON r.id = uf.restaurant_id 
       WHERE uf.user_id = ?`,
       [userId]
    );
    return result.map(row => ({
      id: row.id, name: row.name.toString(), image: row.asset_folder.toString(), desc: row.description.toString(), time: row.time.toString(), addr: row.address.toString(), phone: row.phone.toString(), price: row.price.toString(), is_favorite: 1
    }));
  }

  public async getUserPhotos(restaurantId: number): Promise<string[]> {
    const db = await this.initDatabase();
    const result = await db.getAllAsync<{ file_path: string }>('SELECT file_path FROM user_photos WHERE restaurant_id = ? ORDER BY id DESC', [restaurantId]);
    return result.map(r => r.file_path);
  }
  public async insertUserPhoto(restaurantId: number, path: string): Promise<void> {
    const db = await this.initDatabase();
    await db.runAsync('INSERT INTO user_photos (restaurant_id, file_path) VALUES (?, ?)', [restaurantId, path]);
  }
  public async deleteUserPhoto(path: string): Promise<void> {
    const db = await this.initDatabase();
    await db.runAsync('DELETE FROM user_photos WHERE file_path = ?', [path]);
  }

  public async registerUser(email: string, password: string, nickname: string): Promise<{ success: boolean; message: string }> {
    const db = await this.initDatabase();
    try {
      await db.runAsync('INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)', [email.trim().toLowerCase(), password, nickname.trim()]);
      return { success: true, message: '註冊成功！' };
    } catch (e: any) { return { success: false, message: '此 Email 已被註冊' }; }
  }
  public async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return { success: true, user: { id: -1, email: ADMIN_EMAIL, nickname: '管理員', points: 0, is_admin: 1, avatar: null }, message: '管理員登入成功' };
    }
    const db = await this.initDatabase();
    const user = await db.getFirstAsync<User>('SELECT * FROM users WHERE email = ? AND password = ?', [email.trim().toLowerCase(), password]);
    if (user) return { success: true, user, message: '登入成功！' };
    return { success: false, message: 'Email 或密碼錯誤' };
  }
  public async updateUserProfile(userId: number, nickname: string, avatarUri: string | null): Promise<void> {
    const db = await this.initDatabase();
    if (avatarUri) await db.runAsync('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?', [nickname, avatarUri, userId]);
    else await db.runAsync('UPDATE users SET nickname = ? WHERE id = ?', [nickname, userId]);
  }
  public async getUserById(userId: number): Promise<User | null> {
    const db = await this.initDatabase();
    return await db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [userId]) ?? null;
  }
  public async getAllUsers(): Promise<User[]> {
    const db = await this.initDatabase();
    return await db.getAllAsync<User>('SELECT * FROM users ORDER BY points DESC');
  }

  public async getReviews(restaurantId: number): Promise<{ id: number, nickname: string, content: string, created_at: string }[]> {
    const db = await this.initDatabase();
    return await db.getAllAsync<{ id: number, nickname: string, content: string, created_at: string }>(
      `SELECT r.id, u.nickname, r.content, r.created_at FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.restaurant_id = ? ORDER BY r.id DESC`, [restaurantId]
    );
  }

  public async addReview(userId: number, restaurantId: number, content: string): Promise<{ success: boolean, message: string, pointsEarned: number }> {
      const db = await this.initDatabase();
      const today = new Date().toISOString().split('T')[0];
      
      // 1. 先把留言存進去
      await db.runAsync('INSERT INTO reviews (user_id, restaurant_id, content, created_at) VALUES (?, ?, ?, ?)', [userId, restaurantId, content, today]);
      
      // 2. 🌟 關鍵修改：檢查「這間店」總共有幾則留言了
      const totalReviews = await db.getAllAsync('SELECT id FROM reviews WHERE restaurant_id = ?', [restaurantId]);
      
      // 3. 如果總留言數剛好是 1，代表他是全世界第一個留言的人！
      if (totalReviews.length === 1) {
        await db.runAsync('UPDATE users SET points = ROUND(points + 10, 1) WHERE id = ?', [userId]);
        return { success: true, message: '評論發布成功！恭喜搶到頭香獲得 10 積分 🎉', pointsEarned: 10 };
      } else {
        return { success: true, message: '評論發布成功！(晚來一步，頭香已經被搶走囉)', pointsEarned: 0 };
      }
    }

  // 🌟 修改：防呆小數點精確計算
  public async addPoints(userId: number, pointsToAdd: number): Promise<void> {
    const db = await this.initDatabase();
    await db.runAsync('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?', [pointsToAdd, userId]);
  }

  public async checkIn(userId: number): Promise<{ success: boolean; message: string; pointsEarned: number; consecutiveDays: number }> {
    const db = await this.initDatabase();
    const todayStr = new Date().toISOString().split('T')[0];
    const user = await db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return { success: false, message: '找不到使用者', pointsEarned: 0, consecutiveDays: 0 };
    if (user.last_check_in === todayStr) return { success: false, message: '今天已經簽到過了！', pointsEarned: 0, consecutiveDays: user.consecutive_days || 0 };

    let currentStreak = user.consecutive_days || 0;
    if (user.last_check_in) {
      const lastDate = new Date(user.last_check_in);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) currentStreak += 1;
      else currentStreak = 1;
    } else currentStreak = 1;

    let earnedPoints = 10;
    let isBonus = false;
    if (currentStreak === 7) { earnedPoints += 50; currentStreak = 0; isBonus = true; }

    // 🌟 修改：加上 ROUND 防呆
    await db.runAsync('UPDATE users SET points = ROUND(points + ?, 1), last_check_in = ?, consecutive_days = ? WHERE id = ?', [earnedPoints, todayStr, currentStreak, userId]);
    await db.runAsync('INSERT INTO check_ins (user_id, date) VALUES (?, ?)', [userId, todayStr]);

    return { success: true, message: isBonus ? '連續簽到 7 天！獲得額外大獎 60 積分 🎉' : '簽到成功！獲得 10 積分', pointsEarned: earnedPoints, consecutiveDays: currentStreak };
  }

  public async getRewards(): Promise<Reward[]> {
    const db = await this.initDatabase();
    return await db.getAllAsync<Reward>('SELECT * FROM rewards');
  }

  public async getUserInventory(userId: number): Promise<InventoryItem[]> {
    const db = await this.initDatabase();
    return await db.getAllAsync<InventoryItem>(`
      SELECT inv.id, inv.reward_id, inv.status, inv.created_at, r.name, r.icon 
      FROM user_inventory inv JOIN rewards r ON inv.reward_id = r.id WHERE inv.user_id = ? ORDER BY inv.id DESC
    `, [userId]);
  }

  public async redeemReward(userId: number, rewardId: number, price: number): Promise<{success: boolean, message: string}> {
    const db = await this.initDatabase();
    const user = await this.getUserById(userId);
    if (!user || user.points < price) return { success: false, message: '點數不足' };

    const todayStr = new Date().toISOString().split('T')[0];
    // 🌟 修改：加上 ROUND 防呆
    await db.runAsync('UPDATE users SET points = ROUND(points - ?, 1) WHERE id = ?', [price, userId]);
    await db.runAsync('INSERT INTO user_inventory (user_id, reward_id, created_at) VALUES (?, ?, ?)', [userId, rewardId, todayStr]);
    return { success: true, message: '兌換成功！已放入背包' };
  }

  public async checkHasTurkeyFilter(userId: number): Promise<boolean> {
    const db = await this.initDatabase();
    const item = await db.getFirstAsync<{id: number}>('SELECT id FROM user_inventory WHERE user_id = ? AND reward_id = 2', [userId]);
    return !!item;
  }
}

export default DatabaseHelper.getInstance();