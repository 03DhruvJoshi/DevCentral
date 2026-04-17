import "@testing-library/jest-dom";

// jsdom does not implement ResizeObserver; provide a no-op polyfill so
// components that use it (DashboardPage) don't throw on mount.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
