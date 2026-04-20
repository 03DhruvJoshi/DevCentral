/**
 * Tests for GitOpsRepos.tsx
 *
 * Branches covered:
 *   Loading state        — select disabled while fetch is in-flight
 *   Happy path           — repo names appear in the select after load
 *   Repo selection       — changing select calls setSelectedRepo with the right repo
 *   Error state          — error alert rendered when API returns 503
 *   View on GitHub link  — link rendered when a repo is selected
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GitOpsRepos from "./GitOpsRepos.js";

vi.mock("./types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

const mockFetch = vi.fn();

const REPOS = [
  { id: 1, name: "webapp", owner: "acme", url: "https://github.com/acme/webapp", private: false },
  { id: 2, name: "api", owner: "acme", url: "https://github.com/acme/api", private: true },
];

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("GitOpsRepos", () => {
  it("renders the select as disabled while the fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<GitOpsRepos selectedRepo={null} setSelectedRepo={vi.fn()} />);

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("shows repo names in the select after a successful fetch", async () => {
    const setSelectedRepo = vi.fn();
    mockFetch.mockResolvedValue(ok(REPOS));

    render(
      <GitOpsRepos selectedRepo={null} setSelectedRepo={setSelectedRepo} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("option", { name: /webapp/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole("option", { name: /api/ })).toBeInTheDocument();
  });

  it("calls setSelectedRepo with the chosen repo when the select changes", async () => {
    const setSelectedRepo = vi.fn();
    mockFetch.mockResolvedValue(ok(REPOS));

    const user = userEvent.setup();
    render(
      <GitOpsRepos selectedRepo={REPOS[0]} setSelectedRepo={setSelectedRepo} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("option", { name: /webapp/ })).toBeInTheDocument(),
    );

    await user.selectOptions(screen.getByRole("combobox"), "2");

    expect(setSelectedRepo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, name: "api" }),
    );
  });

  it("renders an error alert when the API returns 503", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Failed to fetch repos" }),
    });

    render(<GitOpsRepos selectedRepo={null} setSelectedRepo={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );
    expect(screen.getByText(/failed to fetch repos/i)).toBeInTheDocument();
  });

  it("renders a 'View on GitHub' link when a repo is already selected", async () => {
    mockFetch.mockResolvedValue(ok(REPOS));

    render(
      <GitOpsRepos selectedRepo={REPOS[0]} setSelectedRepo={vi.fn()} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /view on github/i })).toBeInTheDocument(),
    );
  });
});
