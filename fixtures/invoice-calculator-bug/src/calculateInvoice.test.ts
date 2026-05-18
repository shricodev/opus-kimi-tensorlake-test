import { describe, it, expect } from "vitest";
import { calculateInvoice } from "./calculateInvoice.js";

describe("calculateInvoice", () => {
  it("calculates subtotal correctly", () => {
    const result = calculateInvoice([
      { quantity: 2, unitPrice: 10, description: "Item A" },
    ], 0, 0);
    expect(result.subtotal).toBe(20);
    expect(result.total).toBe(20);
  });

  it("applies percentage discount before tax", () => {
    const result = calculateInvoice(
      [{ quantity: 1, unitPrice: 100, description: "Item" }],
      0.1,
      0.2
    );
    // discount first => 90, then tax => 90 * 1.2 = 108
    expect(result.total).toBe(108);
  });

  it("applies tax after discount", () => {
    const result = calculateInvoice(
      [{ quantity: 1, unitPrice: 100, description: "Item" }],
      0.2,
      0.1
    );
    // discount first => 80, then tax => 80 * 1.1 = 88
    expect(result.total).toBe(88);
  });

  it("rounds only final total", () => {
    const result = calculateInvoice(
      [{ quantity: 1, unitPrice: 10.555, description: "Item" }],
      0,
      0.2
    );
    // 10.555 * 1.2 = 12.666 -> rounded to 2 decimals = 12.67
    expect(result.total).toBe(12.67);
  });

  it("rejects negative quantity", () => {
    expect(() =>
      calculateInvoice(
        [{ quantity: -1, unitPrice: 10, description: "Item" }],
        0,
        0
      )
    ).toThrow("Quantity must be non-negative");
  });

  it("rejects negative price", () => {
    expect(() =>
      calculateInvoice(
        [{ quantity: 1, unitPrice: -5, description: "Item" }],
        0,
        0
      )
    ).toThrow("Price must be non-negative");
  });

  it("rejects invalid discount", () => {
    expect(() =>
      calculateInvoice(
        [{ quantity: 1, unitPrice: 10, description: "Item" }],
        -0.1,
        0
      )
    ).toThrow("Discount must be between 0 and 1");
    expect(() =>
      calculateInvoice(
        [{ quantity: 1, unitPrice: 10, description: "Item" }],
        1.1,
        0
      )
    ).toThrow("Discount must be between 0 and 1");
  });

  it("rejects negative tax rate", () => {
    expect(() =>
      calculateInvoice(
        [{ quantity: 1, unitPrice: 10, description: "Item" }],
        0,
        -0.1
      )
    ).toThrow("Tax rate must be non-negative");
  });

  it("handles multiple line items", () => {
    const result = calculateInvoice(
      [
        { quantity: 2, unitPrice: 10, description: "A" },
        { quantity: 3, unitPrice: 5, description: "B" },
      ],
      0.1,
      0.2
    );
    // subtotal = 20 + 15 = 35
    // after discount = 35 * 0.9 = 31.5
    // after tax = 31.5 * 1.2 = 37.8
    expect(result.subtotal).toBe(35);
    expect(result.total).toBe(37.8);
  });
});
