import { Clock, MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MealOption } from "@/domain/types";
import { formatPence } from "./format";
import { MealTag } from "./MealTag";

export function FallbackMealCard({ meal }: { meal: MealOption }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white">
      <CardHeader className="gap-2">
        <CardTitle className="text-lg">{meal.name}</CardTitle>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="size-4" />
          {meal.provider} near {meal.location}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">{formatPence(meal.pricePence)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-4" />
            {meal.prepMinutes} min collection
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {meal.dietaryTags.map(tag => (
            <MealTag key={tag} tone="good">
              {tag}
            </MealTag>
          ))}
          {meal.suitabilityTags.map(tag => (
            <MealTag key={tag}>{tag}</MealTag>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
