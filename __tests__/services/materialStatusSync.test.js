jest.mock('../../database', () => ({ query: jest.fn() }));

jest.mock('../../services/githubMaterials', () => ({
  isConfigured: jest.fn(() => true),
  getPullRequest: jest.fn(),
}));

const { query } = require('../../database');
const githubMaterials = require('../../services/githubMaterials');
const { syncPendingMaterialStatuses } = require('../../services/materialStatusSync');

beforeEach(() => {
  query.mockReset();
  githubMaterials.isConfigured.mockReturnValue(true);
  githubMaterials.getPullRequest.mockReset();
});

test('已合并的 pending PR 会在后台回收时推进为 merged', async () => {
  query.mockResolvedValueOnce([
    { id: 31, status: 'pending', pr_number: 42, commit_sha: 'a'.repeat(40) },
  ]);
  query.mockResolvedValueOnce({ affectedRows: 1 });
  githubMaterials.getPullRequest.mockResolvedValue({
    state: 'closed',
    merged: true,
    mergeable_state: 'clean',
    labels: [],
    merge_commit_sha: 'b'.repeat(40),
  });

  await expect(syncPendingMaterialStatuses()).resolves.toEqual({
    checked: 1,
    merged: 1,
    rejected: 0,
    errors: 0,
  });
  expect(query).toHaveBeenLastCalledWith(
    'UPDATE materials SET status = ?, commit_sha = ? WHERE id = ?',
    ['merged', 'b'.repeat(40), 31]
  );
});

test('未合并的 PR 保持 pending，不会被误标为已上线', async () => {
  query.mockResolvedValueOnce([
    { id: 32, status: 'pending', pr_number: 43, commit_sha: 'a'.repeat(40) },
  ]);
  githubMaterials.getPullRequest.mockResolvedValue({
    state: 'open',
    merged: false,
    mergeable_state: 'clean',
    labels: [],
  });

  await expect(syncPendingMaterialStatuses()).resolves.toEqual({
    checked: 1,
    merged: 0,
    rejected: 0,
    errors: 0,
  });
  expect(query).toHaveBeenCalledTimes(1);
});
