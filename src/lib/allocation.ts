export interface AllocationCandidate {
  listingId: string;
  sellerId: string;
  sellerName?: string;
  availableStock: number;
  unitPrice: number;
}

export interface AllocatedSlice {
  listingId: string;
  sellerId: string;
  sellerName?: string;
  allocatedQuantity: number;
  unitPrice: number;
  sellerAmount: number;
}

export interface AllocationResult {
  allocations: AllocatedSlice[];
  totalQuantity: number;
  totalAmount: number;
  isFullyAllocated: boolean;
  unallocatedQuantity: number;
}

/**
 * Capacity-Aware Equal Order Allocation Algorithm
 * Reference: skill.md Section 9, 30 & plan.md Phase 15, 16, 28
 *
 * Distributes requested product quantity equally among eligible sellers.
 * If any seller's stock is lower than their equal share, caps that seller
 * and redistributes the remainder to the other sellers deterministically.
 */
export function calculateOrderAllocation(
  requestedQuantity: number,
  candidates: AllocationCandidate[],
  defaultProductPrice: number
): AllocationResult {
  if (requestedQuantity <= 0 || candidates.length === 0) {
    return {
      allocations: [],
      totalQuantity: 0,
      totalAmount: 0,
      isFullyAllocated: false,
      unallocatedQuantity: requestedQuantity,
    };
  }

  // Filter sellers with available capacity
  const activeSellers = candidates
    .filter((s) => s.availableStock > 0)
    .map((s) => ({
      ...s,
      unitPrice: s.unitPrice > 0 ? s.unitPrice : defaultProductPrice,
      allocated: 0,
      cap: s.availableStock,
    }));

  if (activeSellers.length === 0) {
    return {
      allocations: [],
      totalQuantity: 0,
      totalAmount: 0,
      isFullyAllocated: false,
      unallocatedQuantity: requestedQuantity,
    };
  }

  let remaining = requestedQuantity;

  // Capacity-aware iterative redistribution
  while (remaining > 0) {
    const eligible = activeSellers.filter((s) => s.allocated < s.cap);
    if (eligible.length === 0) break;

    const baseShare = Math.floor(remaining / eligible.length);
    const remainder = remaining % eligible.length;

    if (baseShare === 0) {
      // Distribute remaining 1-by-1 deterministically to eligible sellers
      for (let i = 0; i < remainder; i++) {
        eligible[i].allocated += 1;
        remaining -= 1;
      }
      break;
    }

    let progressMade = false;
    for (let i = 0; i < eligible.length; i++) {
      const seller = eligible[i];
      const extra = i < remainder ? 1 : 0;
      const targetAllocation = baseShare + extra;
      const spaceLeft = seller.cap - seller.allocated;

      const take = Math.min(targetAllocation, spaceLeft);
      if (take > 0) {
        seller.allocated += take;
        remaining -= take;
        progressMade = true;
      }
    }

    if (!progressMade) {
      break;
    }
  }

  const slices: AllocatedSlice[] = activeSellers
    .filter((s) => s.allocated > 0)
    .map((s) => ({
      listingId: s.listingId,
      sellerId: s.sellerId,
      sellerName: s.sellerName,
      allocatedQuantity: s.allocated,
      unitPrice: s.unitPrice,
      sellerAmount: s.allocated * s.unitPrice,
    }));

  const totalAllocated = slices.reduce((sum, s) => sum + s.allocatedQuantity, 0);
  const totalAmount = slices.reduce((sum, s) => sum + s.sellerAmount, 0);

  return {
    allocations: slices,
    totalQuantity: totalAllocated,
    totalAmount: Math.round(totalAmount * 100) / 100,
    isFullyAllocated: remaining === 0,
    unallocatedQuantity: remaining,
  };
}
