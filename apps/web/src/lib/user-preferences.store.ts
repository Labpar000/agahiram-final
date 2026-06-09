import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  defaultCityId: string | null;
  defaultProvinceId: string | null;
  setDefaultCity: (cityId: string, provinceId: string) => void;
  clearDefaultCity: () => void;
}

export const useUserPreferences = create<UserPreferences>()(
  persist(
    (set) => ({
      defaultCityId: null,
      defaultProvinceId: null,
      setDefaultCity: (cityId, provinceId) =>
        set({ defaultCityId: cityId, defaultProvinceId: provinceId }),
      clearDefaultCity: () => set({ defaultCityId: null, defaultProvinceId: null }),
    }),
    { name: 'agahiram-user-preferences' },
  ),
);
