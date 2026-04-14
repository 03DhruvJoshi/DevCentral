import type { ComponentType } from "react";
import { Link2, SlidersHorizontal, User } from "lucide-react";

export type SettingsUser = Record<string, unknown>;

export type NavSection = "general" | "integrations" | "preferences";

export const NAV_ITEMS: {
  id: NavSection;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "general", label: "General", Icon: User },
  { id: "integrations", label: "Integrations", Icon: Link2 },
  { id: "preferences", label: "Preferences", Icon: SlidersHorizontal },
];
