import { useCallback, useState } from "react";
import { Separator } from "../../components/ui/separator.js";
import { SettingsSectionNav } from "./components/SettingsSectionNav.js";
import { GeneralSection } from "./components/sections/GeneralSection.js";
import { IntegrationsSection } from "./components/sections/IntegrationsSection.js";
import { PreferencesSection } from "./components/sections/PreferencesSection.js";
import type { NavSection, SettingsUser } from "./types.js";
import { getStoredUser } from "./utils.js";

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<NavSection>("general");
  const [user, setUser] = useState<SettingsUser>(getStoredUser());

  const handleUserUpdate = useCallback((updated: SettingsUser) => {
    setUser(updated);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Developer Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your identity, integrations, and account security.
        </p>
      </div>

      <Separator className="bg-slate-100" />

      <div className="flex gap-8 items-start flex-col lg:flex-row">
        <SettingsSectionNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="flex-1 min-w-0 w-full">
          {activeSection === "general" && (
            <GeneralSection user={user} onUserUpdate={handleUserUpdate} />
          )}
          {activeSection === "integrations" && (
            <IntegrationsSection user={user} onUserUpdate={handleUserUpdate} />
          )}
          {activeSection === "preferences" && <PreferencesSection />}
        </div>
      </div>
    </div>
  );
}
