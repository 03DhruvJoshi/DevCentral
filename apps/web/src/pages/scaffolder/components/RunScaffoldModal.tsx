// apps/web/src/features/scaffolder/ScaffolderPage.tsx

import { useState } from "react";

import { Loader2, PlayCircle, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog.js";

import { Label } from "../../../components/ui/label.js";

import { API_BASE_URL } from "./../components/types.js";

function RunScaffoldModal({
  templateId,
  templateName,
}: Readonly<{
  templateId: number | string;
  templateName: string;
}>) {
  const [targetRepoName, setTargetRepoName] = useState("");
  const [isNewRepo, setIsNewRepo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedRepoName = targetRepoName.trim();
  const canSubmit = normalizedRepoName.length > 0 && !isLoading;
  const submitLabel = isNewRepo
    ? "Create and Scaffold Repository"
    : "Scaffold Existing Repository";
  type SubmitEventArg = Parameters<
    NonNullable<React.ComponentProps<"form">["onSubmit"]>
  >[0];

  const runScaffold = async (e: SubmitEventArg) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessUrl(null);

    try {
      if (!normalizedRepoName) {
        setError("Please provide a target repository name.");
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("devcentral_token");
      const res = await fetch(`${API_BASE_URL}/api/scaffolder/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateId,
          targetRepoName: normalizedRepoName,
          isNewRepo,
          description: `Scaffolded from template: ${templateName}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.githubNotConnected) {
          setError(
            "Your GitHub account is not connected. Use the banner above to connect it before scaffolding.",
          );
          return;
        }
        throw new Error(data.error || "Failed to execute scaffold");
      }

      setSuccessUrl(data.url);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to execute scaffold",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute: React.ComponentProps<"form">["onSubmit"] = (e) => {
    if (!e) return;
    void runScaffold(e);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 bg-blue-100 hover:bg-blue-200 text-slate-800 border-blue-200"
        >
          <PlayCircle className="mr-2 h-4 w-4" /> Scaffold
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl sm:max-w-2xl overflow-y-auto p-0 bg-slate-50 border-slate-200">
        <DialogHeader className="px-6 py-5 bg-white border-b border-slate-200">
          <DialogTitle className="text-slate-900">
            Execute Scaffold: {templateName}
          </DialogTitle>
        </DialogHeader>

        {successUrl ? (
          <div className="mx-6 my-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center text-emerald-700">
            <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Success!
            </h3>
            <p className="mb-4 text-sm">
              Your boilerplate has been generated and pushed to GitHub.
            </p>
            <a href={successUrl} target="_blank" rel="noreferrer">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                View on GitHub
              </Button>
            </a>
          </div>
        ) : (
          <form onSubmit={handleExecute} className="space-y-4 px-6 pb-6">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <p className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Unable to run scaffold
                </p>
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                1. Choose target destination
              </p>
              <div className="flex items-start space-x-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input
                  type="radio"
                  name="repoMode"
                  id="newRepoToggle"
                  checked={isNewRepo}
                  onChange={() => setIsNewRepo(true)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="newRepoToggle"
                    className="cursor-pointer text-base font-bold text-slate-900"
                  >
                    Create a new private GitHub repository
                  </Label>
                  <p className="text-sm text-slate-600">
                    A new repo will be created first, then your scaffold files
                    will be committed
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <input
                  type="radio"
                  name="repoMode"
                  id="existingRepoToggle"
                  checked={!isNewRepo}
                  onChange={() => setIsNewRepo(false)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="existingRepoToggle"
                    className="cursor-pointer text-base font-bold text-slate-900"
                  >
                    Use an existing GitHub repository
                  </Label>
                  <p className="text-sm text-slate-600">
                    Files will be created or updated in your existing
                    repository.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                2. Repository details
              </p>
              <Label htmlFor="repoNameInput" className="text-slate-700">
                Target Repository Name
              </Label>
              <Input
                id="repoNameInput"
                placeholder="e.g., payment-microservice"
                value={targetRepoName}
                onChange={(e) => setTargetRepoName(e.target.value)}
                className="bg-white border-slate-200 focus-visible:ring-blue-500"
                required
              />
              <p className="text-xs text-slate-600">
                This should match your GitHub repository name. The variable{" "}
                {"{{projectName}}"} in your YAML is replaced with this value.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">3. Review</p>
              <p className="text-sm text-slate-600">
                Template:{" "}
                <span className="font-medium text-slate-900">
                  {templateName}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                Mode:{" "}
                <span className="font-medium text-slate-900">
                  {isNewRepo
                    ? "Create new repository"
                    : "Update existing repository"}
                </span>
              </p>
              <p className="text-sm text-slate-600">
                Repository:{" "}
                <span className="font-medium text-slate-900">
                  {normalizedRepoName || "Not set"}
                </span>
              </p>
            </div>

            <Button
              type="submit"
              className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running
                  Scaffold...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RunScaffoldModal;
