import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name too long"),
  category_id: z.string().uuid("Invalid category").nullable(),
  type: z.enum(["consumable", "non_consumable"], {
    message: "Type must be consumable or non_consumable",
  }),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  reorder_level: z.number().int().min(0, "Reorder level cannot be negative"),
  unit: z.string().trim().min(1, "Unit is required").max(50, "Unit too long"),
  status: z.enum(["active", "damaged", "lost", "disposed"]).default("active"),
  assigned_to: z.string().uuid("Invalid user").nullable().default(null),
});

export const updateItemSchema = createItemSchema;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100, "Name too long"),
});

export const deleteItemSchema = z.object({
  reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500, "Reason too long"),
});

export const createTransactionSchema = z.object({
  item_id: z.string().uuid("Please select a valid item"),
  action: z.enum(["stock_in", "stock_out", "borrowed", "returned", "damaged", "lost", "disposed", "stock_return"], {
    message: "Invalid action type",
  }),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  remarks: z.string().max(1000, "Remarks too long").nullable(),
});

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required").max(150, "Name too long"),
  role: z.enum(["admin", "employee"]).default("employee"),
});

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(150, "Name too long"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "employee"], {
    message: "Role must be admin or employee",
  }),
});
