import { useState, useEffect } from "react";

import { GitPullRequest, Loader2, ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.js";

import { type Repository, type Release, token, API_BASE_URL } from "./types.js";

export default function GitOpsReleases(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [releases, setReleases] = useState<Release[]>([]);
  const [isReleasesLoading, setIsReleasesLoading] = useState(false);

  useEffect(() => {
    if (!selectedRepo) return;

    async function fetchReleases() {
      setIsReleasesLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo?.owner}/${selectedRepo?.name}/releases`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch releases");
        const data = await res.json();
        setReleases(data);
      } catch (err) {
        console.error(err);
        setReleases([]);
      } finally {
        setIsReleasesLoading(false);
      }
    }

    fetchReleases();
  }, [selectedRepo]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-purple-600" />
          Releases
        </CardTitle>
        <CardDescription>
          Showing recent Releases for <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isReleasesLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Fetching Releases...
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <GitPullRequest className="h-10 w-10 mx-auto mb-2 opacity-20" />
            No Releases found for this repository.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release #</TableHead>
                <TableHead>Release</TableHead>
                <TableHead>Tag Name</TableHead>
                <TableHead>Draft</TableHead>
                <TableHead>Prerelease</TableHead>

                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release, index) => (
                <TableRow key={release.id}>
                  <TableCell className="font-mono text-xs">
                    #{releases.length - index}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {release.name || release.tag_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {release.tag_name}
                  </TableCell>
                  <TableCell>
                    {release.draft ? (
                      <Badge variant="outline">Draft</Badge>
                    ) : (
                      <Badge variant="secondary">Published</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {release.prerelease ? (
                      <Badge variant="outline">Prerelease</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {release.html_url ? (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={release.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </a>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
