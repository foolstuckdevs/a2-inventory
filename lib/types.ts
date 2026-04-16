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
        };
        Update: {
          name?: string;
          category_id?: string | null;
          type?: "consumable" | "non_consumable";
          quantity?: number;
          reorder_level?: number;
          unit?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          item_id: string;
          user_id: string | null;
          action: "stock_in" | "stock_out" | "borrowed" | "returned";
          quantity: number;
          remarks: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id?: string | null;
          action: "stock_in" | "stock_out" | "borrowed" | "returned";
          quantity?: number;
          remarks?: string | null;
        };
        Update: {
          item_id?: string;
          action?: "stock_in" | "stock_out" | "borrowed" | "returned";
          quantity?: number;
          remarks?: string | null;
        };
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Item = Database["public"]["Tables"]["items"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export type ItemWithCategory = Item & { categories: Category | null };
export type TransactionWithDetails = Transaction & {
  items: Item | null;
  profiles: Profile | null;
};
