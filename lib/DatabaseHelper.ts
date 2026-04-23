// DatabaseHelper.ts
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Restaurant } from './types';

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
      // 確保 SQLite 資料夾存在
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true });
      // 從打包好的 assets 中取得 db
      const [{ localUri }] = await Asset.loadAsync(require('../assets/data.db'));
      if (localUri) {
        await FileSystem.copyAsync({
          from: localUri,
          to: dbFilePath,
        });
        console.log('>>> 複製完成');
      }
    } else {
      console.log(`>>> 資料庫已存在，直接開啟`);
    }

    this.db = await SQLite.openDatabaseAsync(dbName);
    return this.db;
  }

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
}

export default DatabaseHelper.getInstance();