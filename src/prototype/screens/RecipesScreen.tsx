import { Plus, RefreshCcw, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Meal, NutritionSource } from "../types";
import { AppButton, Field } from "../components/primitives";
import { formatIngredient, parseIngredients } from "../ingredients";
import { fetchOpenFoodFactsNutrition } from "../nutritionApi";
import { money, nutritionSourceSummary } from "../utils";
import type { TrackPrototypeEvent } from "../analytics";

type CreateForm = {
  name: string;
  minutes: number;
  price: number;
  ingredients: string;
  tags: string;
  allergens: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutritionSource?: NutritionSource;
  instructions: string;
  note: string;
};

const defaultForm: CreateForm = {
  name: "",
  minutes: 10,
  price: 2.5,
  ingredients: "",
  tags: "",
  allergens: "",
  calories: 500,
  protein: 20,
  carbs: 60,
  fat: 15,
  nutritionSource: undefined,
  instructions: "",
  note: "",
};

export function RecipesScreen({
  customRecipes,
  setCustomRecipes,
  onSelectMeal,
  track,
}: {
  customRecipes: Meal[];
  setCustomRecipes: (recipes: Meal[]) => void;
  onSelectMeal: (mealId: string) => void;
  track: TrackPrototypeEvent;
}) {
  const [form, setForm] = useState<CreateForm>(defaultForm);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionStatus, setNutritionStatus] = useState<string | null>(null);

  async function estimateNutrition() {
    const ingredients = parseIngredients(form.ingredients);

    if (ingredients.length === 0) {
      setNutritionStatus("Add at least one ingredient with a quantity first.");
      return;
    }

    setNutritionLoading(true);
    setNutritionStatus(null);

    try {
      const nutrition = await fetchOpenFoodFactsNutrition(ingredients);
      setForm((prev) => ({
        ...prev,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        nutritionSource: nutrition.source,
      }));
      const missing = nutrition.source?.missingIngredients ?? [];
      setNutritionStatus(missing.length > 0 ? `Couldn't find: ${missing.join(", ")}` : "All ingredients matched");
      track("recipe_nutrition_refreshed", {
        provider: nutrition.source?.provider,
        ingredient_count: ingredients.length,
        matched_count: nutrition.source?.matchedIngredients?.length ?? 0,
        missing_count: missing.length,
      });
    } catch (error) {
      setNutritionStatus(error instanceof Error ? error.message : "Nutrition data could not be loaded.");
    } finally {
      setNutritionLoading(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) return;

    const ingredients = parseIngredients(form.ingredients);
    const tags = form.tags.split(",").map((v) => v.trim()).filter(Boolean);
    const allergens = form.allergens.split(",").map((v) => v.trim()).filter(Boolean);
    const instructions = form.instructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const nextRecipe = {
      id: `custom-${Date.now()}`,
      name: form.name.trim(),
      type: "cook",
      mealSlots: ["lunch", "dinner"],
      time: Number(form.minutes) || 0,
      price: Number(form.price) || 0,
      ingredients,
      tags,
      allergens,
      nutrition: {
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0,
        fat: Number(form.fat) || 0,
        source: form.nutritionSource,
      },
      rating: 0,
      reviews: [],
      instructions: instructions.length > 0
        ? instructions
        : ["Prepare the ingredients.", "Cook or assemble the meal.", "Taste and adjust seasoning."],
      source: "My recipes",
      note: form.note.trim() || "Added by you",
      image: "🍽️",
    } satisfies Meal;

    setCustomRecipes([nextRecipe, ...customRecipes]);
    track("custom_recipe_added", {
      meal_id: nextRecipe.id,
      minutes: nextRecipe.time,
      price: nextRecipe.price,
      ingredient_count: nextRecipe.ingredients.length,
      tag_count: nextRecipe.tags.length,
    });
    setForm(defaultForm);
    setNutritionStatus(null);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-3xl font-bold">My recipes</h1>
        <p className="mt-2 text-stone-600">Add quick meals Autopilot can use in future plans.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[430px_1fr]">
        <Card className="gap-0 rounded-lg border-stone-200 bg-white p-6">
          <form onSubmit={submit}>
            <h2 className="text-xl font-bold">New recipe</h2>
            <div className="mt-5 space-y-4">
              <Field label="Recipe name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="e.g. Microwave bean burrito" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Time (mins)" type="number" value={form.minutes} onChange={(minutes) => setForm({ ...form, minutes: +minutes })} />
                <Field label="Cost / portion (£)" type="number" step="0.05" value={form.price} onChange={(price) => setForm({ ...form, price: +price })} />
              </div>
              <Field label="Ingredients with quantities" value={form.ingredients} onChange={(ingredients) => setForm({ ...form, ingredients })} placeholder="120g beans, 1 wrap, 50g tomato" />
              <Field label="Tags" value={form.tags} onChange={(tags) => setForm({ ...form, tags })} placeholder="vegetarian, microwave" />
              <Field label="Allergens" value={form.allergens} onChange={(allergens) => setForm({ ...form, allergens })} placeholder="gluten, dairy" />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 p-3">
                <div>
                  <p className="text-sm font-semibold">Nutrition data</p>
                  <p className="mt-1 text-xs text-stone-500">{nutritionStatus ?? nutritionSourceSummary(form.nutritionSource)}</p>
                </div>
                <AppButton type="button" variant="secondary" onClick={estimateNutrition} disabled={nutritionLoading}>
                  <RefreshCcw size={16} /> {nutritionLoading ? "Checking..." : "Pull from OpenFoodFacts"}
                </AppButton>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Calories" type="number" value={form.calories} onChange={(calories) => setForm({ ...form, calories: +calories })} />
                <Field label="Protein (g)" type="number" value={form.protein} onChange={(protein) => setForm({ ...form, protein: +protein })} />
                <Field label="Carbs (g)" type="number" value={form.carbs} onChange={(carbs) => setForm({ ...form, carbs: +carbs })} />
                <Field label="Fat (g)" type="number" value={form.fat} onChange={(fat) => setForm({ ...form, fat: +fat })} />
              </div>
              <label className="block">
                <span className="text-sm font-semibold">Method</span>
                <Textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="mt-2 min-h-36 rounded-lg border-stone-200 bg-white"
                  placeholder={"Step 1\nStep 2\nStep 3"}
                />
              </label>
              <Field label="Notes" value={form.note} onChange={(note) => setForm({ ...form, note })} placeholder="Any tips or variations" />
            </div>
            <AppButton type="submit" className="mt-6 w-full">
              <Plus size={16} /> Add recipe
            </AppButton>
          </form>
        </Card>
        <Card className="gap-0 rounded-lg border-stone-200 bg-white p-5">
          <h2 className="font-bold">Saved recipes</h2>
          <div className="mt-4 space-y-3">
            {customRecipes.length === 0 ? (
              <div className="rounded-lg bg-stone-50 p-8 text-center text-stone-500">
                <UtensilsCrossed className="mx-auto mb-3" />
                Your own quick recipes appear here.
              </div>
            ) : (
              customRecipes.map((recipe) => (
                <button key={recipe.id} type="button" onClick={() => onSelectMeal(recipe.id)} className="w-full rounded-lg bg-stone-50 p-4 text-left transition hover:bg-emerald-50">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">
                      {recipe.image} {recipe.name}
                    </p>
                    <p className="font-medium text-emerald-700">{money(recipe.price)}</p>
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {recipe.time} minutes · {recipe.ingredients.map(formatIngredient).join(", ")}
                  </p>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
