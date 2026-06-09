'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Filters } from '../types';
import { apiClient } from '@/lib/api';

/** Resolve display names when URL only has IDs (deep links). */
export function useResolvedSearchFilters(filters: Filters): Filters {
  const [resolved, setResolved] = useState(filters);

  const needsCategory = filters.categoryId && !filters.categoryName;
  const needsCity = filters.cityId && !filters.cityName;
  const needsProvince = filters.provinceId && !filters.provinceName;
  const needsNeighborhood = filters.neighborhoodId && !filters.neighborhoodName && filters.cityId;

  const categoryQuery = useQuery({
    queryKey: ['categories', filters.categoryId, 'label'],
    queryFn: async () => {
      const r = await apiClient.get<{ id: string; name: string }>(
        `/categories/${filters.categoryId}`,
      );
      return r.data;
    },
    enabled: !!needsCategory,
    staleTime: 300_000,
  });

  const cityQuery = useQuery({
    queryKey: ['locations', 'cities', filters.cityId, 'label'],
    queryFn: async () => {
      const r = await apiClient.get<{
        id: string;
        name: string;
        province?: { id: string; name: string };
      }>(`/locations/cities/${filters.cityId}`);
      return r.data;
    },
    enabled: !!needsCity,
    staleTime: 300_000,
  });

  useEffect(() => {
    setResolved(filters);
  }, [filters]);

  useEffect(() => {
    if (!categoryQuery.data) return;
    setResolved((prev) => ({
      ...prev,
      categoryName: categoryQuery.data?.name ?? prev.categoryName,
    }));
  }, [categoryQuery.data]);

  useEffect(() => {
    if (!cityQuery.data) return;
    setResolved((prev) => ({
      ...prev,
      cityName: cityQuery.data?.name ?? prev.cityName,
      provinceId: prev.provinceId ?? cityQuery.data?.province?.id,
      provinceName: prev.provinceName ?? cityQuery.data?.province?.name,
    }));
  }, [cityQuery.data]);

  const neighborhoodQuery = useQuery({
    queryKey: ['locations', 'neighborhoods', filters.cityId, filters.neighborhoodId, 'label'],
    queryFn: async () => {
      const r = await apiClient.get<Array<{ id: string; name: string }>>(
        `/locations/cities/${filters.cityId}/neighborhoods`,
      );
      return r.data?.find((n) => n.id === filters.neighborhoodId) ?? null;
    },
    enabled: !!needsNeighborhood,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!neighborhoodQuery.data) return;
    setResolved((prev) => ({
      ...prev,
      neighborhoodName: neighborhoodQuery.data?.name ?? prev.neighborhoodName,
    }));
  }, [neighborhoodQuery.data]);

  useEffect(() => {
    if (!needsProvince || filters.provinceName) return;
    void (async () => {
      const r = await apiClient.get<Array<{ id: string; name: string }>>('/locations/provinces');
      const match = r.data?.find((p) => p.id === filters.provinceId);
      if (match) {
        setResolved((prev) => ({ ...prev, provinceName: match.name }));
      }
    })();
  }, [needsProvince, filters.provinceId, filters.provinceName]);

  return resolved;
}
