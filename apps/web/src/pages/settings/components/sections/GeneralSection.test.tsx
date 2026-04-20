/**
 * Tests for GeneralSection.tsx
 *
 * Branches covered:
 *   Happy path render    — user name, email, and role badge visible
 *   Save profile         — clicking Save Changes calls PATCH endpoint
 *   Save validation      — empty name shows an inline error, no fetch fired
 *   Save success         — success message shown after successful PATCH
 *   Delete dialog        — clicking Delete Account opens the confirmation dialog
 *   Delete guard         — Delete button disabled until "DELETE" is typed
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneralSection } from "./GeneralSection.js";

vi.mock("../../../admin/types.js", () => ({
  API_BASE_URL: "http://localhost:4000",
}));

vi.mock("../../../../lib/auth.js", () => ({
  clearAuthStorage: vi.fn(),
}));

vi.mock("../../utils.js", () => ({
  getAddress: () => "123 Test St",
  getAuthToken: () => "test-token",
  getCurrentUserId: () => "user-abc",
  persistUser: vi.fn(),
}));

const mockFetch = vi.fn();

const BASE_USER = {
  name: "Jane Doe",
  email: "jane@example.com",
  role: "DEV",
};

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("GeneralSection", () => {
  it("renders the user's name, email, and role badge", () => {
    render(<GeneralSection user={BASE_USER} onUserUpdate={vi.fn()} />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Standard Developer")).toBeInTheDocument();
  });

  it("calls the PATCH profile endpoint when Save Changes is clicked", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { ...BASE_USER, name: "Jane Doe" } }),
    });

    const user = userEvent.setup();
    render(<GeneralSection user={BASE_USER} onUserUpdate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/profile"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("shows an error and does not fetch when the name field is cleared", async () => {
    const user = userEvent.setup();
    render(<GeneralSection user={BASE_USER} onUserUpdate={vi.fn()} />);

    const nameInput = screen.getByDisplayValue("Jane Doe");
    await user.triple_click ? user.triple_click(nameInput) : user.click(nameInput);
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/name cannot be empty/i)).toBeInTheDocument(),
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows a success message after profile is saved successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { ...BASE_USER } }),
    });

    const user = userEvent.setup();
    render(<GeneralSection user={BASE_USER} onUserUpdate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/profile updated successfully/i),
      ).toBeInTheDocument(),
    );
  });

  it("opens the delete confirmation dialog when Delete Account is clicked", async () => {
    const user = userEvent.setup();
    render(<GeneralSection user={BASE_USER} onUserUpdate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/this action cannot be undone/i),
      ).toBeInTheDocument(),
    );
  });

  it("keeps the confirm Delete Account button disabled until 'DELETE' is typed", async () => {
    const user = userEvent.setup();
    render(<GeneralSection user={BASE_USER} onUserUpdate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/type delete to confirm/i)).toBeInTheDocument(),
    );

    const confirmBtn = screen.getAllByRole("button", { name: /delete account/i }).find(
      (b) => b.closest("dialog, [role=dialog]"),
    );

    // Before typing: button should be disabled
    // We find the red confirm button by its disabled state + text
    const allDeleteBtns = screen.getAllByRole("button", { name: /delete account/i });
    // The dialog button is the one inside the dialog content
    const dialogBtn = allDeleteBtns[allDeleteBtns.length - 1];
    expect(dialogBtn).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText(/type delete to confirm/i),
      "DELETE",
    );

    expect(dialogBtn).not.toBeDisabled();
    void confirmBtn;
  });
});
