import { serve } from "bun";
import index from "./index.html";
import { deadlineBootstrap } from "./data/seededScenario";
import { seededMeals } from "./data/seededMeals";
import {
  estimateIngredientNutrition,
  totalNutritionFromEstimates,
  type OpenFoodFactsProduct,
} from "./prototype/nutrition";
import type { RecipeIngredient } from "./prototype/types";

const sessionRetentionDays = 90;
const anonymousSessions = new Map<string, { settings: unknown; updatedAt: string; expiresAt: string }>();
const sessionIdPattern = /^[A-Za-z0-9_-]{16,80}$/;
const openFoodFactsUserAgent = "DeadlineFoodPrototype/0.1";
const freshIngredientSearchHints = new Set([
  "banana",
  "berries",
  "broccoli",
  "carrot",
  "courgette",
  "cucumber",
  "pepper",
  "peppers",
  "salad",
  "spinach",
  "tomato",
  "vegetables",
]);

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[];
};

function isRecipeIngredient(value: unknown): value is RecipeIngredient {
  const candidate = value as RecipeIngredient;
  return (
    typeof candidate?.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.quantity === "number" &&
    Number.isFinite(candidate.quantity) &&
    candidate.quantity > 0 &&
    typeof candidate.unit === "string" &&
    candidate.unit.trim().length > 0
  );
}

function sessionResponse(sessionId: string, settings: unknown | null, expiresAt: string | null) {
  return Response.json({
    sessionId,
    settings,
    retentionDays: sessionRetentionDays,
    expiresAt,
  });
}

function expiresAtFromNow() {
  return new Date(Date.now() + sessionRetentionDays * 24 * 60 * 60 * 1000).toISOString();
}

function openFoodFactsSearchTerm(ingredient: RecipeIngredient) {
  const name = ingredient.name.trim();
  return freshIngredientSearchHints.has(name.toLowerCase()) ? `${name} fresh` : name;
}

async function fetchOpenFoodFactsProducts(ingredient: RecipeIngredient) {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", openFoodFactsSearchTerm(ingredient));
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "5");
  url.searchParams.set("fields", "product_name,nutriments,code");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": openFoodFactsUserAgent,
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json().catch(() => null) as OpenFoodFactsSearchResponse | null;
  return payload?.products ?? [];
}

const server = serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/deadline-food/bootstrap": {
      async GET() {
        return Response.json(deadlineBootstrap);
      },
    },

    "/api/deadline-food/meals": {
      async GET() {
        return Response.json(seededMeals);
      },
    },

    "/api/deadline-food/scenario": {
      async GET() {
        return Response.json(deadlineBootstrap.canonicalConstraints);
      },
    },

    "/api/deadline-food/nutrition/openfoodfacts": {
      async POST(req) {
        const payload = await req.json().catch(() => null) as { ingredients?: unknown } | null;
        const ingredients = Array.isArray(payload?.ingredients) ? payload.ingredients.filter(isRecipeIngredient) : [];

        if (ingredients.length === 0) {
          return Response.json({ error: "At least one ingredient with a quantity is required." }, { status: 400 });
        }

        if (ingredients.length > 12) {
          return Response.json({ error: "A maximum of 12 ingredients can be checked at once." }, { status: 400 });
        }

        const lookups = await Promise.all(
          ingredients.map(async ingredient => {
            const products = await fetchOpenFoodFactsProducts(ingredient);
            return products
              .map((product) => estimateIngredientNutrition(ingredient, product))
              .find((estimate) => estimate !== null) ?? null;
          }),
        );
        const estimates = lookups.filter((estimate): estimate is NonNullable<typeof estimate> => estimate !== null);
        const missingIngredients = ingredients
          .filter((ingredient) => !estimates.some((estimate) => estimate.ingredient.name === ingredient.name))
          .map((ingredient) => ingredient.name);

        if (estimates.length === 0) {
          return Response.json({ error: "OpenFoodFacts did not return usable nutrition data for these ingredients." }, { status: 502 });
        }

        return Response.json(totalNutritionFromEstimates(estimates, missingIngredients));
      },
    },

    "/api/deadline-food/session": {
      async GET(req) {
        const sessionId = new URL(req.url).searchParams.get("sessionId");

        if (!sessionIdPattern.test(sessionId ?? "")) {
          return Response.json({ error: "A valid anonymous session ID is required." }, { status: 400 });
        }

        const session = anonymousSessions.get(sessionId as string);

        if (session !== undefined) {
          session.expiresAt = expiresAtFromNow();
          session.updatedAt = new Date().toISOString();
        }

        return sessionResponse(sessionId as string, session?.settings ?? null, session?.expiresAt ?? null);
      },
      async PUT(req) {
        const payload = await req.json().catch(() => null) as { sessionId?: unknown; settings?: unknown } | null;
        const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId : "";

        if (!sessionIdPattern.test(sessionId)) {
          return Response.json({ error: "A valid anonymous session ID is required." }, { status: 400 });
        }

        if (payload?.settings === null || typeof payload?.settings !== "object") {
          return Response.json({ error: "Session settings are required." }, { status: 400 });
        }

        const expiresAt = expiresAtFromNow();
        anonymousSessions.set(sessionId, {
          settings: payload.settings,
          updatedAt: new Date().toISOString(),
          expiresAt,
        });

        return sessionResponse(sessionId, payload.settings, expiresAt);
      },
    },

    "/api/hello": {
      async GET() {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT() {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
