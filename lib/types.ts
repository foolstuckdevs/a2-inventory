export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: "admin" | "employee";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: "admin" | "employee";
          created_at?: string;
        };
        Update: {
          full_name?: string;
          role?: "admin" | "employee";
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      items: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          type: "consumable" | "non_consumable";
          quantity: number;
          reorder_level: number;
          unit: string;
          status: "active" | "damaged" | "lost" | "disposed";
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          type: "consumable" | "non_consumable";
          quantity?: number;
          reorder_level?: number;
          unit?: string;
          status?: "active" | "damaged" | "lost" | "disposed";
          assigned_to?: string | null;
        };
        Update: {
          name?: string;
          category_id?: string | null;
          type?: "consumable" | "non_consumable";
          quantity?: number;
          reorder_level?: number;
          unit?: string;
          status?: "active" | "damaged" | "lost" | "disposed";
          assigned_to?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          item_id: string;
          user_id: string | null;
          action: "stock_in" | "stock_out" | "borrowed" | "returned" | "damaged" | "lost" | "disposed" | "stock_return";
          quantity: number;
          remarks: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id?: string | null;
          action: "stock_in" | "stock_out" | "borrowed" | "returned" | "damaged" | "lost" | "disposed" | "stock_return";
          quantity?: number;
          remarks?: string | null;
        };
        Update: {
          item_id?: string;
          action?: "stock_in" | "stock_out" | "borrowed" | "returned" | "damaged" | "lost" | "disposed" | "stock_return";
          quantity?: number;
          remarks?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          item_id: string | null;
          title: string;
          message: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id?: string | null;
          title: string;
          message: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          item_id?: string | null;
          title?: string;
          message?: string;
          read_at?: string | null;
        };
      };
      item_deletion_logs: {
        Row: {
          id: string;
          item_id: string;
          item_name: string;
          deleted_by: string | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          item_name: string;
          deleted_by?: string | null;
          reason: string;
          created_at?: string;
        };
        Update: {
          reason?: string;
        };
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export type ItemWithCategory = Item & { categories: Category | null; profiles: Profile | null };
export type TransactionWithDetails = Transaction & {
  items: Item | null;
  profiles: Profile | null;
};
export type CategoryOption = Pick<Category, "id" | "name">;
export type ProfileOption = Pick<Profile, "id" | "full_name">;
export type UserListItem = Pick<Profile, "id" | "full_name" | "role">;
export type NotificationWithItem = Notification & {
  items: Pick<Item, "id" | "name"> | null;
};
