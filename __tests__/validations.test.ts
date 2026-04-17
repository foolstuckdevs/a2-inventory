import { describe, it, expect } from "vitest";
import {
  createItemSchema,
  createCategorySchema,
  createTransactionSchema,
  createUserSchema,
  deleteItemSchema,
  updateProfileSchema,
  updateUserRoleSchema,
} from "@/lib/validations";

describe("createItemSchema", () => {
  it("accepts valid item data", () => {
    const result = createItemSchema.safeParse({
      name: "Printer Paper",
      category_id: null,
      type: "consumable",
      quantity: 10,
      reorder_level: 5,
      unit: "pcs",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createItemSchema.safeParse({
      name: "",
      category_id: null,
      type: "consumable",
      quantity: 0,
      reorder_level: 5,
      unit: "pcs",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = createItemSchema.safeParse({
      name: "Paper",
      category_id: null,
      type: "consumable",
      quantity: -5,
      reorder_level: 5,
      unit: "pcs",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createItemSchema.safeParse({
      name: "Paper",
      category_id: null,
      type: "invalid_type",
      quantity: 0,
      reorder_level: 5,
      unit: "pcs",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category_id format", () => {
    const result = createItemSchema.safeParse({
      name: "Paper",
      category_id: "not-a-uuid",
      type: "consumable",
      quantity: 0,
      reorder_level: 5,
      unit: "pcs",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("accepts valid category", () => {
    const result = createCategorySchema.safeParse({ name: "Office Supplies" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 chars", () => {
    const result = createCategorySchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("createTransactionSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid transaction", () => {
    const result = createTransactionSchema.safeParse({
      item_id: validUUID,
      action: "stock_in",
      quantity: 5,
      remarks: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = createTransactionSchema.safeParse({
      item_id: validUUID,
      action: "stock_in",
      quantity: 0,
      remarks: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid action", () => {
    const result = createTransactionSchema.safeParse({
      item_id: validUUID,
      action: "steal",
      quantity: 1,
      remarks: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing item_id", () => {
    const result = createTransactionSchema.safeParse({
      item_id: "",
      action: "stock_in",
      quantity: 1,
      remarks: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid action types", () => {
    for (const action of ["stock_in", "stock_out", "borrowed", "returned", "damaged", "lost", "disposed"]) {
      const result = createTransactionSchema.safeParse({
        item_id: validUUID,
        action,
        quantity: 1,
        remarks: null,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("deleteItemSchema", () => {
  it("accepts a meaningful reason", () => {
    const result = deleteItemSchema.safeParse({
      reason: "Duplicate record created by mistake",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short reasons", () => {
    const result = deleteItemSchema.safeParse({ reason: "No" });
    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("accepts valid user data", () => {
    const result = createUserSchema.safeParse({
      email: "john@example.com",
      password: "secret123",
      full_name: "John Doe",
      role: "employee",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
      full_name: "John Doe",
      role: "employee",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = createUserSchema.safeParse({
      email: "john@example.com",
      password: "12345",
      full_name: "John Doe",
      role: "employee",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      email: "john@example.com",
      password: "secret123",
      full_name: "John Doe",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts valid name", () => {
    const result = updateProfileSchema.safeParse({ full_name: "Jane Doe" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateProfileSchema.safeParse({ full_name: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateUserRoleSchema", () => {
  it("accepts admin", () => {
    expect(updateUserRoleSchema.safeParse({ role: "admin" }).success).toBe(true);
  });

  it("accepts employee", () => {
    expect(updateUserRoleSchema.safeParse({ role: "employee" }).success).toBe(true);
  });

  it("rejects invalid role", () => {
    expect(updateUserRoleSchema.safeParse({ role: "manager" }).success).toBe(false);
  });
});
