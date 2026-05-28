import type { RecipeIngredient } from "./types";

const numberPattern = /^(?<quantity>\d+(?:\.\d+)?|\d+\/\d+)\s*(?<unit>g|kg|ml|l|tbsp|tsp|cup|cups|slice|slices|wrap|wraps|egg|eggs|portion|portions|pack|packs)?\s+(?<name>.+)$/i;

const singularUnits = new Map([
  ["cups", "cup"],
  ["slices", "slice"],
  ["wraps", "wrap"],
  ["eggs", "egg"],
  ["portions", "portion"],
  ["packs", "pack"],
]);
const countableUnits = new Set(["slice", "wrap", "egg", "portion", "pack"]);

function parseQuantity(value: string) {
  if (value.includes("/")) {
    const [numerator = 1, denominator = 1] = value.split("/").map(Number);
    return denominator ? numerator / denominator : 1;
  }

  return Number(value) || 1;
}

function normaliseUnit(value: string | undefined) {
  const unit = value?.toLowerCase() ?? "serving";
  return singularUnits.get(unit) ?? unit;
}

export function ingredientName(ingredient: RecipeIngredient | string) {
  return typeof ingredient === "string" ? ingredient : ingredient.name;
}

export function ingredientSearchTerm(ingredient: RecipeIngredient | string) {
  return ingredientName(ingredient).trim();
}

export function formatIngredient(ingredient: RecipeIngredient | string) {
  if (typeof ingredient === "string") {
    return ingredient;
  }

  const quantity = Number.isInteger(ingredient.quantity) ? ingredient.quantity.toString() : ingredient.quantity.toFixed(1);

  if (ingredient.unit === "serving") {
    return ingredient.quantity === 1 ? ingredient.name : `${quantity} servings ${ingredient.name}`;
  }

  if (["g", "kg", "ml", "l"].includes(ingredient.unit)) {
    return `${quantity}${ingredient.unit} ${ingredient.name}`;
  }

  if (ingredient.name.toLowerCase() === ingredient.unit) {
    return `${quantity} ${ingredient.quantity === 1 ? ingredient.unit : `${ingredient.unit}s`}`;
  }

  return `${quantity} ${ingredient.quantity === 1 ? ingredient.unit : `${ingredient.unit}s`} ${ingredient.name}`;
}

export function parseIngredients(value: string): RecipeIngredient[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(numberPattern);

      if (!match?.groups) {
        return { name: item, quantity: 1, unit: "serving" };
      }

      let name = match.groups.name?.trim() ?? item;
      const quantity = match.groups.quantity ?? "1";
      let unit = normaliseUnit(match.groups.unit);

      if (!match.groups.unit && countableUnits.has(normaliseUnit(name))) {
        unit = normaliseUnit(name);
        name = unit;
      }

      return {
        name,
        quantity: parseQuantity(quantity),
        unit,
      };
    });
}

export function formatIngredientsForEditing(ingredients: RecipeIngredient[]) {
  return ingredients.map(formatIngredient).join(", ");
}
