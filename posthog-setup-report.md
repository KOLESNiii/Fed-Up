<wizard-report>
# PostHog setup report

PostHog is initialized in `src/lib/posthog.ts` using `BUN_PUBLIC_POSTHOG_PROJECT_TOKEN` and `BUN_PUBLIC_POSTHOG_HOST`, with production build-time define injection in `build.ts`. The React entry point wraps the app in `PostHogProvider` and `PostHogErrorBoundary`.

The app registers the existing anonymous prototype session ID with PostHog at startup. The same ID is also registered as the `anonymous_session_id` super property, so manual captures include it on every event.

## Instrumented Events

| Event | Description |
|---|---|
| `prototype_screen_viewed` | Screen changes in the prototype flow. |
| `navigation_clicked` | Header, settings, desktop nav, and mobile nav clicks. |
| `deadline_mode_started` | Landing page setup/demo CTA clicks. |
| `calendar_source_selected` | Google Calendar or `.ics` import option selection. |
| `ics_calendar_imported` | `.ics` upload parsed, including imported event count. |
| `onboarding_step_completed` | Onboarding forward-step clicks. |
| `onboarding_step_back_clicked` | Onboarding back-step clicks. |
| `onboarding_preference_changed` | Major onboarding preference changes. |
| `onboarding_choice_toggled` | Dietary, allergy, liked food, and disliked ingredient toggles. |
| `onboarding_custom_choice_added` | Custom onboarding preference chips added. |
| `recipe_source_toggled` | Recipe source enable/disable interactions. |
| `onboarding_completed` | Final onboarding completion with preference summary properties. |
| `dashboard_full_plan_clicked` | Dashboard CTA to view the full plan. |
| `dashboard_calendar_clicked` | Dashboard calendar shortcut. |
| `calendar_manage_import_clicked` | Calendar screen import management CTA. |
| `find_alternatives_clicked` | Plan screen alternatives CTA. |
| `recipe_viewed` | Recipe detail opens, with meal ID and source screen. |
| `meal_swap_started` | Plan rescue/swap chooser opened. |
| `meal_swap_cancelled` | Swap chooser closed or original meal kept. |
| `meal_swap_confirmed` | Swap confirmed with original/replacement meal IDs. |
| `discover_recipe_swiped` | Discover card accepted or rejected. |
| `discover_recipe_added_to_plan` | Liked recipe inserted into the plan. |
| `discover_queue_restarted` | Discover suggestions reset. |
| `custom_recipe_added` | User-created recipe saved. |
| `recipe_edit_started` | Recipe edit mode opened. |
| `recipe_edit_cancelled` | Recipe edit cancelled. |
| `recipe_saved` | Recipe edits saved. |
| `recipe_review_submitted` | Recipe review submitted. |
| `recipe_back_to_plan_clicked` | Recipe detail back-to-plan click. |
| `settings_preference_changed` | Major settings preference changes. |
| `settings_choice_toggled` | Settings dietary/allergy/like/dislike toggles. |
| `settings_custom_choice_added` | Custom settings preference chips added. |
| `settings_reimport_clicked` | Settings `.ics` re-import CTA. |
| `settings_saved` | Settings saved back to dashboard. |
| `constraints_submitted` | Legacy React Router setup form submitted. |
| `strategy_selected` | Legacy React Router strategy selected. |
| `rescue_confirmed` | Legacy React Router rescue swap confirmed. |

</wizard-report>
