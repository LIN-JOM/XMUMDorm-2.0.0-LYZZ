import { normalizeToolsTodayTodos } from '@/features/todos/useTodayTodos';

it('keeps only the first three valid todos in server order', () => {
  expect(normalizeToolsTodayTodos({ total: 5, active: 4, completed: 1, topItems: [
    { id: 3, title: 'First' }, { id: 8, title: 'Second' },
    { id: 2, title: 'Third' }, { id: 9, title: 'Fourth' },
  ] })).toEqual({ total: 5, active: 4, completed: 1, top: [
    { id: 3, title: 'First' }, { id: 8, title: 'Second' }, { id: 2, title: 'Third' },
  ] });
});

it('deduplicates before filling the three-item summary', () => {
  expect(normalizeToolsTodayTodos({ topItems: [
    { id: 3, title: 'First' }, { id: 3, title: 'Repeated' },
    { id: 8, title: 'Second' }, { id: 2, title: 'Third' },
  ] }).top).toEqual([
    { id: 3, title: 'First' }, { id: 8, title: 'Second' }, { id: 2, title: 'Third' },
  ]);
});

it('excludes explicitly completed rows while accepting the endpoint without completion flags', () => {
  expect(normalizeToolsTodayTodos({ topItems: [
    { id: 1, title: 'Done', is_completed: true },
    { id: 2, title: 'Also done', is_completed: 1 },
    { id: 3, title: 'Canonical done', completed: true },
    { id: 4, title: 'Pending', is_completed: false },
    { id: 5, title: 'Endpoint row' },
  ] }).top).toEqual([{ id: 4, title: 'Pending' }, { id: 5, title: 'Endpoint row' }]);
});

it('discards invalid identities and empty titles without changing the count', () => {
  expect(normalizeToolsTodayTodos({ total: 8, active: 7, completed: 1, topItems: [
    null, { id: 0, title: 'Zero' }, { id: 1.5, title: 'Fraction' },
    { id: Number.MAX_SAFE_INTEGER + 1, title: 'Unsafe' },
    { id: '7', title: 'String id' }, { id: 7, title: '  ' },
    { id: 8, title: 'Kept' },
  ] })).toEqual({ total: 8, active: 7, completed: 1, top: [{ id: 8, title: 'Kept' }] });
});

it('returns a bounded empty summary for malformed input', () => {
  expect(normalizeToolsTodayTodos(null)).toEqual({ total: 0, active: 0, completed: 0, top: [] });
  expect(normalizeToolsTodayTodos({ total: Infinity, active: -1, completed: 2.7, topItems: 'bad' }))
    .toEqual({ total: 0, active: 0, completed: 2, top: [] });
});
