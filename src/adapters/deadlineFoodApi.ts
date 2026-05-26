import type { DeadlineBootstrap, MealOption, PlanningConstraints } from "@/domain/types";

const DEFAULT_FIREBASE_PROJECT_ID = "drp03-50059";
const DEFAULT_FIREBASE_FUNCTIONS_REGION = "europe-west2";

type DeadlineEndpoint = "bootstrap" | "meals" | "scenario";

const firebaseFunctionNames: Record<DeadlineEndpoint, string> = {
  bootstrap: "deadlineFoodBootstrap",
  meals: "deadlineFoodMeals",
  scenario: "deadlineFoodScenario",
};

const localApiPaths: Record<DeadlineEndpoint, string> = {
  bootstrap: "/api/deadline-food/bootstrap",
  meals: "/api/deadline-food/meals",
  scenario: "/api/deadline-food/scenario",
};

function shouldUseFirebaseBackend(): boolean {
  const backend = process.env.BUN_PUBLIC_DEADLINE_FOOD_API_BACKEND;

  if (backend === "local") return false;
  if (backend === "firebase") return true;

  return process.env.NODE_ENV === "production";
}

function firebaseFunctionsBaseUrl(): string {
  const explicitBaseUrl = process.env.BUN_PUBLIC_FIREBASE_FUNCTIONS_BASE_URL;

  if (explicitBaseUrl) return explicitBaseUrl.replace(/\/$/, "");

  const projectId = process.env.BUN_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_FIREBASE_PROJECT_ID;
  const region = process.env.BUN_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? DEFAULT_FIREBASE_FUNCTIONS_REGION;

  return `https://${region}-${projectId}.cloudfunctions.net`;
}

function endpointUrl(endpoint: DeadlineEndpoint): string {
  if (!shouldUseFirebaseBackend()) {
    return localApiPaths[endpoint];
  }

  return `${firebaseFunctionsBaseUrl()}/${firebaseFunctionNames[endpoint]}`;
}

async function readJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${label} request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(`${label} request returned ${contentType || "an unknown content type"} instead of JSON`);
  }

  return response.json() as Promise<T>;
}

export async function fetchDeadlineBootstrap(): Promise<DeadlineBootstrap> {
  const response = await fetch(endpointUrl("bootstrap"));

  return readJson<DeadlineBootstrap>(response, "Bootstrap");
}

export async function fetchSeededMeals(): Promise<MealOption[]> {
  const response = await fetch(endpointUrl("meals"));

  return readJson<MealOption[]>(response, "Meal catalogue");
}

export async function fetchCanonicalScenario(): Promise<PlanningConstraints> {
  const response = await fetch(endpointUrl("scenario"));

  return readJson<PlanningConstraints>(response, "Scenario");
}
