import { Loader2, RefreshCw, Layers, CircleDot } from "lucide-react";
import { Card, CardContent } from "../../../../../components/ui/card.js";
import { Button } from "../../../../../components/ui/button.js";

import { token, API_BASE_URL } from "../../types.js";

import { EnvironmentCard, ServiceCard } from "../utilities.js";
import type { GitHubEnvironment } from "../../types.js";

export default function EnvironmentsTab({
  selectedRepo,
  environments,
  setEnvironments,
  isEnvLoading,
  deployments,
  services,
  setIsEnvLoading,
  setGuideService,
}: {
  selectedRepo: { owner: string; name: string };
  environments: Array<GitHubEnvironment>;
  setEnvironments: (envs: Array<GitHubEnvironment>) => void;
  isEnvLoading: boolean;
  setIsEnvLoading: (loading: boolean) => void;
  deployments: any[];
  services: any[];
  setGuideService: (s: any) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2 text-slate-900">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Environments
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Re-fetch
              setIsEnvLoading(true);
              fetch(
                `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/environments`,
                { headers: { Authorization: `Bearer ${token}` } },
              )
                .then((r) => r.json())
                .then(setEnvironments)
                .finally(() => setIsEnvLoading(false));
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>

        {isEnvLoading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading environments...
          </div>
        ) : environments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No GitHub Environments configured.</p>
              <p className="text-xs mt-1">
                Create environments in your repository Settings → Environments,
                or connect Vercel/Render to auto-generate them.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full h-full">
            {environments.map((env, idx) => (
              <div key={env.id} className="flex items-center flex-1 ">
                <div className="flex-1">
                  <EnvironmentCard
                    env={env}
                    deployments={deployments}
                    index={idx}
                    total={environments.length}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-base flex items-center gap-2 text-slate-900">
            <CircleDot className="h-4 w-4 text-muted-foreground" />
            Deployment Services
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onGuide={setGuideService}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
