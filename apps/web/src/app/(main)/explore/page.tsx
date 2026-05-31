import { ExploreClient } from './explore-client';
import { parseExploreFilters } from '@/lib/explore-url';

type Params = Record<string, string | string[] | undefined>;

function pickString(params: Params, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Explore page. Like the home feed we no longer block the RSC render on an
 * upstream search request — tab switching needs to feel instant. We still
 * parse the initial `q`/filters from the URL so a deep-linked search renders
 * with the right form state on the client.
 */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const initialQ = pickString(params, 'q')?.trim() ?? '';
  const initialFilters = parseExploreFilters(params);
  return <ExploreClient initialQ={initialQ} initialFilters={initialFilters} />;
}
