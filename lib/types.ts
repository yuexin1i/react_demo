// types.ts
export interface Restaurant {
  id: number;
  name: string;
  image: string;
  desc: string;
  time: string;
  addr: string;
  phone: string;
  price: string;
  is_favorite?: number;
}

// 🌟 新增：獎品型別
export interface Reward {
  id: number;
  name: string;
  points_required: number;
  icon: string;
  max_redeem: number; // 0=無限次，1=限兌換一次
}

// 🌟 新增：背包物品型別
export interface InventoryItem {
  id: number;
  reward_id: number;
  name: string;
  icon: string;
  status: number; // 0=未使用, 1=已使用
  created_at: string;
}