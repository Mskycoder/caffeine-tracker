import { HistoryDrinkList } from '../components/HistoryDrinkList';

/**
 * History page showing all historical drinks with date filtering.
 *
 * Thin composition layer rendering HistoryDrinkList (date-grouped drink list
 * with filter chips for Today, Yesterday, Last 7 Days, Last 30 Days, All Time).
 */
export function HistoryPage() {
  return <HistoryDrinkList />;
}
