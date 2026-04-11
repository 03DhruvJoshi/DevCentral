import { useState, useEffect, useMemo } from "react";
import { Tag, Loader2, ExternalLink, Calendar } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import {
  TableControls,
  TruncatedText,
  PaginationControls,
} from "./TableControls.js";
import { type Repository, type Release, token, API_BASE_URL } from "./types.js";

export default function GitOpsReleases(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!selectedRepo) return;
    setSearch("");
    setPage(1);

    async function fetchReleases() {
      setIsLoading(true);
      try {
        const url = `${API_BASE_URL}/api/github/repos/${selectedRepo.owner}/${selectedRepo.name}/releases?per_page=50`;
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
        setIsLoading(false);
      }
    }

    fetchReleases();
  }, [selectedRepo]);

  const filtered = useMemo(() => {
    return releases.filter((r) => {
      const name = r.name || r.tag_name;
      const matchesSearch =
        search === "" ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        r.tag_name.toLowerCase().includes(search.toLowerCase());
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "draft" && r.draft) ||
        (typeFilter === "prerelease" && r.prerelease) ||
        (typeFilter === "published" && !r.draft && !r.prerelease);
      return matchesSearch && matchesType;
    });
  }, [releases, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-orange-600" />
          Releases
        </CardTitle>
        <CardDescription>
          Showing releases for <strong>{selectedRepo.name}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            Fetching Releases...
          </div>
        ) : (
          <>
            <TableControls
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name or tag..."
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
              onPageChange={setPage}
              extraFilters={
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="prerelease">Pre-release</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {paginated.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <Tag className="h-10 w-10 mx-auto mb-2 opacity-20" />
                {releases.length === 0
                  ? "No releases found for this repository."
                  : "No results match your filters."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Release Name</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((release, index) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-mono text-xs">
                        #{filtered.length - ((page - 1) * rowsPerPage + index)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[260px]">
                        <TruncatedText
                          text={release.name || release.tag_name}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {release.tag_name}
                      </TableCell>
                      <TableCell>
                        {release.draft ? (
                          <Badge variant="outline">Draft</Badge>
                        ) : release.prerelease ? (
                          <Badge
                            variant="outline"
                            className="border-yellow-500 text-yellow-700"
                          >
                            Pre-release
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            Published
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(release.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {release.html_url && (
                          <Button asChild size="sm" variant="outline">
                            <a
                              href={release.html_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <PaginationControls
              rowsPerPage={rowsPerPage}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filtered.length}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
