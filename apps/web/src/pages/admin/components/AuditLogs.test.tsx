/**
 * Tests for AuditLogs.tsx
 *
 * Branches covered:
 *   Heading          — "System Audit Trail" card title rendered
 *   Loading state    — spinner shown while initial fetch in-flight
 *   Log rows         — actorEmail entries appear in the table after load
 *   Action filter    — selecting a filter triggers a re-fetch with the action param
 *   Email search     — typing debounces and triggers a re-fetch with user param
 *   Export CSV       — Export CSV button calls the export endpoint
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditLogs } from "./AuditLogs.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("../types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

const LOG_ROWS = [
  {
    id: "l1",
    action: "USER_UPDATED",
    actorEmail: "admin@test.com",
    targetId: "u1",
    details: null,
    role: "ADMIN",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "l2",
    action: "TEMPLATE_DEPLOYED",
    actorEmail: "dev@test.com",
    targetId: "t1",
    details: null,
    role: "DEV",
    createdAt: "2024-01-14T09:00:00Z",
  },
];

function logsResponse(logs = LOG_ROWS) {
  return {
    ok: true,
    json: async () => ({
      logs,
      pagination: { total: logs.length, page: 1, limit: 20, totalPages: 1 },
    }),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

describe("AuditLogs", () => {
  it("renders the 'System Audit Trail' card title", async () => {
    mockFetch.mockResolvedValue(logsResponse());
    render(<AuditLogs />);

    await waitFor(() =>
      expect(screen.getByText(/system audit trail/i)).toBeInTheDocument(),
    );
  });

  it("shows a loading spinner while the initial fetch is in-flight", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<AuditLogs />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders log actorEmail values in the table after data loads", async () => {
    mockFetch.mockResolvedValue(logsResponse());
    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText("admin@test.com")).toBeInTheDocument();
      expect(screen.getByText("dev@test.com")).toBeInTheDocument();
    });
  });

  it("triggers a re-fetch with the selected action when the Action Type filter changes", async () => {
    mockFetch.mockResolvedValue(logsResponse());
    const user = userEvent.setup();
    render(<AuditLogs />);

    await waitFor(() =>
      expect(screen.getByText("admin@test.com")).toBeInTheDocument(),
    );

    const actionSelect = screen.getByDisplayValue("All Actions");
    await user.selectOptions(actionSelect, "USER_UPDATED");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("action=USER_UPDATED"),
        expect.any(Object),
      );
    });
  });

  it("triggers a debounced re-fetch when the email search input changes", async () => {
    mockFetch.mockResolvedValue(logsResponse());
    const user = userEvent.setup();
    render(<AuditLogs />);

    await waitFor(() =>
      expect(screen.getByText("admin@test.com")).toBeInTheDocument(),
    );

    const emailInput = screen.getByPlaceholderText(/filter by email/i);
    await user.type(emailInput, "alice");

    // Debounce is 500 ms — wait for the fetch to be called with the user param
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("user=alice"),
          expect.any(Object),
        );
      },
      { timeout: 1500 },
    );
  });

  it("calls the export endpoint when Export CSV is clicked", async () => {
    mockFetch.mockResolvedValue(logsResponse());
    const blobMock = new Blob(["csv"], { type: "text/csv" });
    mockFetch.mockResolvedValueOnce(logsResponse());
    mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => blobMock });

    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const user = userEvent.setup();
    render(<AuditLogs />);

    await waitFor(() =>
      expect(screen.getByText("admin@test.com")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/audit-logs/export"),
        expect.any(Object),
      );
    });
  });
});
