// lib/DatabaseHelper.ts
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Restaurant } from './types';

// 管理員固定帳號
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin1234';

export interface User {
  id: number;
  email: string;
  nickname: string;
  points: number;
  is_admin: number;
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
        console.log('>>> 複製完成');
      }
    } else {
      console.log(`>>> 資料庫已存在，直接開啟`);
    }

    this.db = await SQLite.openDatabaseAsync(dbName);

    // 建立 users 資料表（如果不存在）
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        last_check_in TEXT DEFAULT NULL,
        is_admin INTEGER DEFAULT 0
      )
    `);

    // 建立簽到紀錄資料表
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL
      )
    `);

    // 建立評論資料表
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    return this.db;
  }

// ── 餐廳相關 ──

  public async getAllRestaurants(): Promise<Restaurant[]> {
    const db = await this.initDatabase();
    const result = await db.getAllAsync<any>('SELECT * FROM restaurants');
    return result.map(row => ({
      id: row.id,
      name: row.name.toString(),
      image: row.asset_folder.toString(),
      desc: row.description.toString(),
      time: row.time.toString(),
      addr: row.address.toString(),
      phone: row.phone.toString(),
      price: row.price.toString(),
      is_favorite: row.is_favorite || 0, // 🌟 新增：把 is_favorite 的狀態抓出來
    }));
  }

  // 🌟 新增 1：切換收藏狀態 (使用新版 expo-sqlite 的寫法)
  public async toggleFavorite(id: number, currentStatus: number): Promise<void> {
    const db = await this.initDatabase();
    const newStatus = currentStatus === 1 ? 0 : 1;
    await db.runAsync(
      'UPDATE restaurants SET is_favorite = ? WHERE id = ?',
      [newStatus, id]
    );
  }

  // 🌟 新增 2：取得所有已收藏的店家
  public async getFavoriteRestaurants(): Promise<Restaurant[]> {
    const db = await this.initDatabase();
    const result = await db.getAllAsync<any>('SELECT * FROM restaurants WHERE is_favorite = 1');
    return result.map(row => ({
      id: row.id,
      name: row.name.toString(),
      image: row.asset_folder.toString(),
      desc: row.description.toString(),
      time: row.time.toString(),
      addr: row.address.toString(),
      phone: row.phone.toString(),
      price: row.price.toString(),
      is_favorite: 1, // 既然是從這裡抓出來的，一定是被收藏的 (1)
    }));
  }
  public async getUserPhotos(restaurantId: number): Promise<string[]> {
    const db = await this.initDatabase();
    const result = await db.getAllAsync<{ file_path: string }>(
      'SELECT file_path FROM user_photos WHERE restaurant_id = ? ORDER BY id DESC',
      [restaurantId]
    );
    return result.map(r => r.file_path);
  }

  public async insertUserPhoto(restaurantId: number, path: string): Promise<void> {
    const db = await this.initDatabase();
    await db.runAsync(
      'INSERT INTO user_photos (restaurant_id, file_path) VALUES (?, ?)',
      [restaurantId, path]
    );
  }

  public async deleteUserPhoto(path: string): Promise<void> {
    const db = await this.initDatabase();
    await db.runAsync('DELETE FROM user_photos WHERE file_path = ?', [path]);
  }

  // ── 使用者帳號相關 ──

  public async registerUser(email: string, password: string, nickname: string): Promise<{ success: boolean; message: string }> {
    const db = await this.initDatabase();
    try {
      await db.runAsync(
        'INSERT INTO users (email, password, nickname) VALUES (?, ?, ?)',
        [email.trim().toLowerCase(), password, nickname.trim()]
      );
      return { success: true, message: '註冊成功！' };
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) {
        return { success: false, message: '此 Email 已被註冊' };
      }
      return { success: false, message: '註冊失敗，請稍後再試' };
    }
  }

  public async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
    // 管理員固定帳號判斷
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return {
        success: true,
        user: { id: -1, email: ADMIN_EMAIL, nickname: '管理員', points: 0, is_admin: 1 },
        message: '管理員登入成功'
      };
    }

    const db = await this.initDatabase();
    const user = await db.getFirstAsync<User>(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email.trim().toLowerCase(), password]
    );

    if (user) {
      return { success: true, user, message: '登入成功！' };
    }
    return { success: false, message: 'Email 或密碼錯誤' };
  }

  public async getAllUsers(): Promise<User[]> {
    const db = await this.initDatabase();
    return await db.getAllAsync<User>('SELECT * FROM users ORDER BY points DESC');
  }

  // ── 簽到相關 ──

  public async checkIn(userId: number): Promise<{ success: boolean; message: string; points?: number }> {
    const db = await this.initDatabase();
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const user = await db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return { success: false, message: '找不到使用者' };

    if (user.last_check_in === today) {
      return { success: false, message: '今天已經簽到過了！' };
    }

    await db.runAsync(
      'UPDATE users SET points = points + 10, last_check_in = ? WHERE id = ?',
      [today, userId]
    );
    await db.runAsync(
      'INSERT INTO check_ins (user_id, date) VALUES (?, ?)',
      [userId, today]
    );

    return { success: true, message: '簽到成功！獲得 10 積分 🎉', points: (user.points ?? 0) + 10 };
  }

  public async getUserById(userId: number): Promise<User | null> {
    const db = await this.initDatabase();
    return await db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [userId]) ?? null;
  }
}

export default DatabaseHelper.getInstance();