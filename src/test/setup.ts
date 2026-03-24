import "@testing-library/jest-dom/vitest";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret";
}
