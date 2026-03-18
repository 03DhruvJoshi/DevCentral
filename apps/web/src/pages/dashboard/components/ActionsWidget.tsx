import { useState, useEffect } from "react";
import { GitPullRequest, AlertTriangle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import { Button } from "../../../components/ui/button.js";

import { API_BASE_URL } from "../types.js";

export function ActionsWidget() {
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGitOps = async () => {
      try {
        const token = localStorage.getItem("devcentral_token");
        // Hitting your existing GitOps route!
        const res = await fetch(`${API_BASE_URL}/api/github/repos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setRepos(await res.json());
      } finally {
        setIsLoading(false);
      }
    };
    fetchGitOps();
  }, []);

  return (
    <Card className="flex flex-col h-full border-orange-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" /> Action Center
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          <Loader2 className="animate-spin h-5 w-5 mx-auto" />
        ) : (
          <Button
            variant="outline"
            className="justify-start border-orange-200 hover:bg-orange-50"
          >
            <GitPullRequest className="mr-2 h-4 w-4 text-orange-600" />
            Review code in {repos[0]?.name || "recent repository"}
          </Button>
        )}
        <Button variant="outline" className="justify-start">
          <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" /> Resolve
          SonarQube Gate Failure
        </Button>
      </CardContent>
    </Card>
  );
}
