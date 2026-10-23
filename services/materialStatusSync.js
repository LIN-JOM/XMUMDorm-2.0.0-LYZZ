/**
 * 学习资料 PR 状态回收。
 *
 * GitHub 合并是异步的，不能把用户是否停留在上传页作为本站状态更新的前提。
 */

const { query } = require('../database');
const { inlineLimit } = require('../utils/sqlLimit');
const githubMaterials = require('./githubMaterials');

async function syncMaterialStatus(row) {
  let status = row.status;
  let github = null;

  if (!row.pr_number || status !== 'pending' || !githubMaterials.isConfigured()) {
    return { status, github };
  }

  const pr = await githubMaterials.getPullRequest(row.pr_number);
  github = {
    state: pr.state,
    merged: Boolean(pr.merged),
    mergeableState: pr.mergeable_state,
    labels: (pr.labels || []).map((label) => (typeof label === 'string' ? label : label.name)),
  };

  if (pr.merged) {
    status = 'merged';
    await query('UPDATE materials SET status = ?, commit_sha = ? WHERE id = ?', [
      status,
      pr.merge_commit_sha || row.commit_sha,
      row.id,
    ]);
  } else if (pr.state === 'closed') {
    status = 'rejected';
    await query('UPDATE materials SET status = ?, reject_reason = ? WHERE id = ?', [
      status,
      'PR 被关闭',
      row.id,
    ]);
  }

  return { status, github };
}

/**
 * 由服务端定时回收已结束的 PR，避免上传页面关闭后资料永久停在 pending。
 * ponytail: 每轮最多检查 25 个 PR；若积压量需要更低延迟，应接入 GitHub webhook。
 */
async function syncPendingMaterialStatuses({ limit = 25 } = {}) {
  if (!githubMaterials.isConfigured()) {
    return { checked: 0, merged: 0, rejected: 0, errors: 0 };
  }

  const rows = await query(
    `SELECT id, status, pr_number, commit_sha
       FROM materials
      WHERE status = 'pending' AND pr_number IS NOT NULL AND deleted_at IS NULL
      ORDER BY updated_at ASC, id ASC
      LIMIT ${inlineLimit(limit, { fallback: 25, max: 25 })}`
  );
  const summary = { checked: 0, merged: 0, rejected: 0, errors: 0 };

  for (const row of Array.isArray(rows) ? rows : []) {
    summary.checked += 1;
    try {
      const { status } = await syncMaterialStatus(row);
      if (status === 'merged') summary.merged += 1;
      if (status === 'rejected') summary.rejected += 1;
    } catch (error) {
      summary.errors += 1;
      console.warn(`[materials] 回收 PR #${row.pr_number} 状态失败:`, error.message || error);
    }
  }

  return summary;
}

module.exports = { syncMaterialStatus, syncPendingMaterialStatuses };
