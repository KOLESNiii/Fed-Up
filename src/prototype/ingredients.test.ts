import { describe, expect, test } from "bun:test";

import { formatIngredient, parseIngredients } from "./ingredients";

describe("recipe ingredient helpers", () => {
  test("parses quantities and units from recipe input", () => {
    expect(parseIngredients("50g oats, 150ml oat milk, 1 wrap, tomato")).toEqual([
      { name: "oats", quantity: 50, unit: "g" },
      { name: "oat milk", quantity: 150, unit: "ml" },
      { name: "wrap", quantity: 1, unit: "wrap" },
      { name: "tomato", quantity: 1, unit: "serving" },
    ]);
  });

  test("formats stored ingredients for display", () => {
    expect(formatIngredient({ name: "oats", quantity: 50, unit: "g" })).toBe("50g oats");
    expect(formatIngredient({ name: "wrap", quantity: 1, unit: "wrap" })).toBe("1 wrap");
    expect(formatIngredient({ name: "bread", quantity: 2, unit: "slice" })).toBe("2 slices bread");
  });
});
