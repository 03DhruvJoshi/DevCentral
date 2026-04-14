import type { NavSection } from "../types.js";
import { NAV_ITEMS } from "../types.js";

type SettingsSectionNavProps = {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
};

export function SettingsSectionNav({
  activeSection,
  onSectionChange,
}: SettingsSectionNavProps) {
  return (
    <nav className="w-52 shrink-0 space-y-0.5">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSectionChange(id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
            activeSection === id
              ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${activeSection === id ? "text-slate-700" : "text-slate-400"}`}
          />
          {label}
        </button>
      ))}
    </nav>
  );
}
