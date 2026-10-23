const { createPreviewGateway, hashPreviewToken } = require('../../services/previewGateway');

const origin = 'http://localhost:5173';
const rawToken = 'preview-token-for-alice';
const tokenEntries = `alice:${hashPreviewToken(rawToken)}`;

test('网关没有 PREVIEW_DATABASE_URL 时保持关闭，不会回退到应用数据库 URL', () => {
  const gateway = createPreviewGateway({
    previewDatabaseUrl: '',
    tokenEntries,
    allowedOrigins: origin,
    createPool: jest.fn(),
  });

  expect(gateway.enabled).toBe(false);
  expect(gateway.authorize({ token: rawToken, origin })).toMatchObject({ ok: false, code: 'PREVIEW_DISABLED' });
});

test('只接受来源白名单中的有效个人令牌', () => {
  const gateway = createPreviewGateway({
    previewDatabaseUrl: 'mysql://preview:secret@db.example/preview',
    tokenEntries,
    allowedOrigins: origin,
    createPool: jest.fn(),
  });

  expect(gateway.authorize({ token: rawToken, origin })).toEqual({ ok: true, clientId: 'alice' });
  expect(gateway.authorize({ token: 'wrong-token', origin })).toMatchObject({ ok: false, code: 'PREVIEW_UNAUTHORIZED' });
  expect(gateway.authorize({ token: rawToken, origin: 'https://untrusted.example' })).toMatchObject({ ok: false, code: 'PREVIEW_ORIGIN_DENIED' });
});

test('课程查询使用固定的参数化 SELECT，且分页上限为 100', async () => {
  const execute = jest.fn(async () => [[{ courseId: 7, name: '数据结构', lecturer: '', courseCode: 'BSC103', materialCount: 1 }]]);
  const createPool = jest.fn(() => ({ execute }));
  const gateway = createPreviewGateway({
    previewDatabaseUrl: 'mysql://preview:secret@db.example/preview',
    tokenEntries,
    allowedOrigins: origin,
    createPool,
  });

  await expect(gateway.listCourses({ q: '数据', limit: 999 })).resolves.toEqual([
    { courseId: 7, name: '数据结构', lecturer: '', courseCode: 'BSC103', materialCount: 1 },
  ]);
  expect(createPool).toHaveBeenCalledTimes(1);
  expect(execute).toHaveBeenCalledWith(
    expect.stringContaining('LIMIT 100'),
    ['%数据%', '%数据%', '%数据%']
  );
  expect(execute.mock.calls[0][0]).toContain("m.status = 'merged'");
});

test('资料查询只执行固定 SELECT，返回前端所需的分页数据与公开文件地址', async () => {
  const execute = jest
    .fn()
    .mockResolvedValueOnce([[{ total: 1 }]])
    .mockResolvedValueOnce([[
      {
        id: 8,
        path: 'c7/lecture/课件.pdf',
        title: '第 1 讲',
        tags: '算法, 基础',
        name: '课件.pdf',
        fileName: '课件.pdf',
        size: 1234,
      },
    ]]);
  const gateway = createPreviewGateway({
    previewDatabaseUrl: 'mysql://preview:secret@db.example/preview',
    tokenEntries,
    allowedOrigins: origin,
    materialsBaseUrl: 'https://cdn.example/materials@main',
    createPool: jest.fn(() => ({ execute })),
  });

  await expect(gateway.listMaterials({ courseId: 7, page: 1, pageSize: 999, sort: 'name' })).resolves.toEqual({
    configured: true,
    baseUrl: 'https://cdn.example/materials@main',
    total: 1,
    page: 1,
    pageSize: 100,
    items: [expect.objectContaining({
      path: 'c7/lecture/课件.pdf',
      tags: ['算法', '基础'],
      cdnUrl: 'https://cdn.example/materials@main/c7/lecture/%E8%AF%BE%E4%BB%B6.pdf',
      downloadUrl: 'https://cdn.example/materials@main/c7/lecture/%E8%AF%BE%E4%BB%B6.pdf',
    })],
  });
  expect(execute).toHaveBeenNthCalledWith(1, expect.stringContaining('SELECT COUNT(*) AS total'), [7]);
  expect(execute).toHaveBeenNthCalledWith(2, expect.stringContaining('ORDER BY m.title ASC, m.id ASC'), [7]);
  expect(execute.mock.calls.flatMap(([, params]) => params)).not.toContain('SELECT');
});
