/**
 * Tests for RunScaffoldModal.tsx
 *
 * Branches covered:
 *   Trigger render      — "Scaffold" button is visible
 *   Dialog open         — clicking the trigger renders the form
 *   Submit disabled     — submit button disabled when repo name is empty
 *   githubNotConnected  — error shown when API returns githubNotConnected flag
 *   Success state       — "View on GitHub" link appears after successful scaffold
 *   Generic error       — arbitrary API error message shown in error banner
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RunScaffoldModal from "./RunScaffoldModal.js";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("./../components/types.js", async () => {
  const actual = await vi.importActual<
    typeof import("./../components/types.js")
  >("./../components/types.js");
  return { ...actual, API_BASE_URL: "http://localhost:4000" };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  localStorage.setItem("devcentral_token", "test-token");
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /scaffold/i }));
  await waitFor(() =>
    expect(
      screen.getByText(/choose target destination/i),
    ).toBeInTheDocument(),
  );
}

describe("RunScaffoldModal", () => {
  it("renders the Scaffold trigger button", () => {
    render(<RunScaffoldModal templateId={1} templateName="My Template" />);
    expect(
      screen.getByRole("button", { name: /scaffold/i }),
    ).toBeInTheDocument();
  });

  it("opens the dialog with the 3-step form when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<RunScaffoldModal templateId={1} templateName="My Template" />);

    await openDialog(user);

    expect(
      screen.getByText(/repository details/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/target repository name/i),
    ).toBeInTheDocument();
  });

  it("keeps the submit button disabled when the repo name input is empty", async () => {
    const user = userEvent.setup();
    render(<RunScaffoldModal templateId={1} templateName="My Template" />);

    await openDialog(user);

    const submitBtn = screen.getByRole("button", {
      name: /create and scaffold/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("shows the GitHub-not-connected error when the API returns githubNotConnected", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ githubNotConnected: true }),
    });

    const user = userEvent.setup();
    render(<RunScaffoldModal templateId={1} templateName="My Template" />);

    await openDialog(user);

    await user.type(
      screen.getByLabelText(/target repository name/i),
      "my-service",
    );
    await user.click(
      screen.getByRole("button", { name: /create and scaffold/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/github account is not connected/i),
      ).toBeInTheDocument();
    });
  });

  it("renders 'View on GitHub' after a successful scaffold execution", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://github.com/user/my-service",
      }),
    });

    const user = userEvent.setup();
    render(<RunScaffoldModal templateId={1} templateName="My Template" />);

    await openDialog(user);

    await user.type(
      screen.getByLabelText(/target repository name/i),
      "my-service",
    );
    await user.click(
      screen.getByRole("button", { name: /create and scaffold/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /view on github/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows a generic error banner when the scaffold API returns an error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Template execution failed" }),
    });

    const user = userEvent.setup();
    render(<RunScaffoldModal templateId={1} templateName="My Template" />);

    await openDialog(user);

    await user.type(
      screen.getByLabelText(/target repository name/i),
      "my-repo",
    );
    await user.click(
      screen.getByRole("button", { name: /create and scaffold/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/template execution failed/i),
      ).toBeInTheDocument();
    });
  });
});
