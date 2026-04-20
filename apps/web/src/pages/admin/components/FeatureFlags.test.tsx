/**
 * Tests for FeatureFlags.tsx
 *
 * Branches covered:
 *   Loading state        — spinner shown while initial fetch is in-flight
 *   Happy path           — flag list renders after successful API response
 *   Maintenance card     — MAINTENANCE_MODE card renders with ACTIVE badge when enabled
 *   Toggle interaction   — clicking ON fires a PUT to the config endpoint
 *   Add flag validation  — empty key shows inline validation error
 *   Add flag submit      — valid key triggers PUT and re-fetch
 *   Error boundary       — 503 response does not crash; loading ends gracefully
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeatureFlags } from "./FeatureFlags.js";

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

const mockFetch = vi.fn();

const CONFIGS = [
  {
    key: "MAINTENANCE_MODE",
    value: "false",
    description: null,
    updatedAt: new Date().toISOString(),
  },
  {
    key: "MY_FEATURE",
    value: "true",
    description: "A test feature flag",
    updatedAt: new Date().toISOString(),
  },
];

function configsResponse(data = CONFIGS) {
  return { ok: true, json: async () => data };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("FeatureFlags", () => {
  it("shows a loading spinner while the initial fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<FeatureFlags />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders flag list after successful API response", async () => {
    mockFetch.mockResolvedValue(configsResponse());
    render(<FeatureFlags />);

    await waitFor(() =>
      expect(screen.getByText("MY_FEATURE")).toBeInTheDocument(),
    );
    expect(screen.getByText("A test feature flag")).toBeInTheDocument();
  });

  it("renders Maintenance Mode card and shows ACTIVE badge when enabled", async () => {
    const activeConfigs = CONFIGS.map((c) =>
      c.key === "MAINTENANCE_MODE" ? { ...c, value: "true" } : c,
    );
    mockFetch.mockResolvedValue(configsResponse(activeConfigs));
    render(<FeatureFlags />);

    await waitFor(() =>
      expect(screen.getByText("Maintenance Mode")).toBeInTheDocument(),
    );
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("shows validation error when Add Flag is submitted with an empty key", async () => {
    mockFetch.mockResolvedValue(configsResponse());
    const user = userEvent.setup();
    render(<FeatureFlags />);

    await waitFor(() =>
      expect(screen.getByText("MY_FEATURE")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /add flag/i }));
    await waitFor(() =>
      expect(screen.getByText(/key is required/i)).toBeInTheDocument(),
    );
  });

  it("fires a PUT to the config endpoint when the toggle is clicked for a flag", async () => {
    mockFetch.mockResolvedValue(configsResponse());
    const user = userEvent.setup();
    render(<FeatureFlags />);

    await waitFor(() =>
      expect(screen.getByText("MY_FEATURE")).toBeInTheDocument(),
    );

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    mockFetch.mockResolvedValue(configsResponse());

    // MY_FEATURE is enabled (value=true), click the OFF button to toggle
    const offBtn = screen.getByLabelText("Toggle MY_FEATURE off");
    await user.click(offBtn);

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/config/MY_FEATURE"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("adds a custom flag via PUT when a valid key is entered", async () => {
    mockFetch.mockResolvedValue(configsResponse());
    const user = userEvent.setup();
    render(<FeatureFlags />);

    await waitFor(() =>
      expect(screen.getByText("MY_FEATURE")).toBeInTheDocument(),
    );

    const keyInput = screen.getByPlaceholderText(/MY_CUSTOM_FLAG/i);
    await user.type(keyInput, "NEW_FLAG");

    mockFetch.mockResolvedValue(configsResponse());
    await user.click(screen.getByRole("button", { name: /add flag/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/config/NEW_FLAG"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });

  it("does not crash when the API returns 503; stops the loading spinner", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    render(<FeatureFlags />);

    await waitFor(() =>
      expect(document.querySelector(".animate-spin")).not.toBeInTheDocument(),
    );
    // Empty state renders instead of crashing
    expect(screen.getByText(/no feature flags configured/i)).toBeInTheDocument();
  });
});
