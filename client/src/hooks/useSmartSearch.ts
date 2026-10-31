/**
 * Smart Search Hooks
 */

import { trpc } from "@/lib/trpc";

export function useCustomerSearch(query: string) {
  return trpc.smart.customer.search.useQuery(
    { q: query },
    { enabled: query.length >= 2, staleTime: 5 * 60 * 1000 }
  );
}

export function useProductSearch(query: string) {
  return trpc.smart.product.search.useQuery(
    { q: query },
    { enabled: query.length >= 2, staleTime: 5 * 60 * 1000 }
  );
}

export function useAccountSearch(query: string) {
  return trpc.smart.account.search.useQuery(
    { q: query },
    { enabled: query.length >= 2, staleTime: 5 * 60 * 1000 }
  );
}

export function useCustomerDetails(id: string) {
  return trpc.smart.customer.getById.useQuery(
    { id },
    { enabled: !!id, staleTime: 10 * 60 * 1000 }
  );
}

export function useDocumentNumber(type: string) {
  return trpc.smart.docNumber.generate.useQuery(
    { type },
    { staleTime: Infinity }
  );
}

export function useWarehouseSearch(query: string) {
  return trpc.smart.warehouse.search.useQuery(
    { q: query },
    { enabled: query.length >= 2, staleTime: 5 * 60 * 1000 }
  );
}

export function useCostCenterSearch(query: string) {
  return trpc.smart.costCenter.search.useQuery(
    { q: query },
    { enabled: query.length >= 2, staleTime: 5 * 60 * 1000 }
  );
}

export function usePaymentMethods() {
  return trpc.smart.paymentMethod.list.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
}

export function useCurrencies() {
  return trpc.smart.currency.list.useQuery(undefined, {
    staleTime: 60 * 60 * 1000,
  });
}
