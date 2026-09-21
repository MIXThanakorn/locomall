import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderAllocation } from "../src/lib/allocation.ts";

const candidates = (stocks) => stocks.map((availableStock, index) => ({
  listingId: String(index + 1), sellerId: `seller-${index + 1}`, availableStock, unitPrice: 20,
}));

test("allocates 30 equally across three sellers", () => {
  const result = calculateOrderAllocation(30, candidates([100, 100, 100]), 20);
  assert.deepEqual(result.allocations.map(x => x.allocatedQuantity), [10, 10, 10]);
  assert.equal(result.isFullyAllocated, true);
});

test("redistributes capacity shortage without losing units", () => {
  const result = calculateOrderAllocation(30, candidates([5, 100, 100]), 20);
  assert.deepEqual(result.allocations.map(x => x.allocatedQuantity), [5, 13, 12]);
  assert.equal(result.totalQuantity, 30);
});

test("reports shortage instead of over-allocating", () => {
  const result = calculateOrderAllocation(30, candidates([3, 4, 5]), 20);
  assert.equal(result.totalQuantity, 12);
  assert.equal(result.unallocatedQuantity, 18);
  assert.equal(result.isFullyAllocated, false);
});
