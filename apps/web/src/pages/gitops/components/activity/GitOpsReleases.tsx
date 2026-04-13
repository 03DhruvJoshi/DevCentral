import { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Loader2,
  ExternalLink,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";
import { Button } from "../../../../components/ui/button.js";
import {
  TableControls,
  TruncatedText,
  PaginationControls,
} from "../TableControls.js";
import {
  type Repository,
  type Release,
  token,
  API_BASE_URL,
} from "../types.js";

type SortKey = "name" | "tag" | "type" | "created";
type SortDir = "asc" | "desc";

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== col)
    return <ChevronsUpDown className="h-3 w-3 ml-1 text-slate-400 inline" />;
  return sortDir === "asc" ? (
    <ChevronUp className="h-3 w-3 ml-1 text-slate-700 inline" />
  ) : (
    <ChevronDown className="h-3 w-3 ml-1 text-slate-700 inline" />
  );
}

function ReleaseTypePill({
  draft,
  prerelease,
}: {
  draft: boolean;
  prerelease: boolean;
}) {
  if (draft)
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Draft
      </span>
    );
  if (prerelease)
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Pre-release
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Published
    </span>
  );
}

export default function GitOpsReleases(props: { selectedRepo: Repository }) {
  const { selectedRepo } = props;
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "name":
          av = (a.name || a.tag_name).toLowerCase();
          bv = (b.name || b.tag_name).toLowerCase();
          break;
        case "tag":
          av = a.tag_name.toLowerCase();
          bv = b.tag_name.toLowerCase();
          break;
        case "type": {
          const typeOrder = (r: Release) =>
            r.draft ? 0 : r.prerelease ? 1 : 2;
          av = typeOrder(a);
          bv = typeOrder(b);
          break;
        }
        case "created":
          av = a.created_at;
          bv = b.created_at;
          break;
        default:
          return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const thClass = "text-xs font-bold text-slate-500 uppercase tracking-wide";

  return (
    <Card className="border-slate-300">
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
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="prerelease">Pre-release</option>
                </select>
              }
            />

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-lg bg-slate-50 border border-dashed border-slate-300">
                <Tag className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  {releases.length === 0
                    ? "No releases found for this repository."
                    : "No results match your filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="max-h-[34rem] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                      <tr className="border-b border-slate-200 hover:bg-transparent">
                        <th className={`w-10 px-4 py-3 text-left ${thClass}`}>
                          #
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("name")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Release Name{" "}
                            <SortIcon
                              col="name"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("tag")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Tag{" "}
                            <SortIcon
                              col="tag"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("type")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Type{" "}
                            <SortIcon
                              col="type"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-left ${thClass}`}>
                          <button
                            onClick={() => toggleSort("created")}
                            className="flex items-center hover:text-slate-700 transition-colors"
                          >
                            Created{" "}
                            <SortIcon
                              col="created"
                              sortKey={sortKey}
                              sortDir={sortDir}
                            />
                          </button>
                        </th>
                        <th className={`px-4 py-3 text-right ${thClass}`}>
                          Link
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginated.map((release, index) => (
                        <tr
                          key={release.id}
                          className="border-0 transition-colors hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            #
                            {sorted.length - ((page - 1) * rowsPerPage + index)}
                          </td>
                          <td className="max-w-[260px] px-4 py-3 font-medium">
                            <TruncatedText
                              text={release.name || release.tag_name}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {release.tag_name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <ReleaseTypePill
                              draft={release.draft}
                              prerelease={release.prerelease}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                release.created_at,
                              ).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {release.html_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200"
                                asChild
                              >
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <PaginationControls
              rowsPerPage={rowsPerPage}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={sorted.length}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
