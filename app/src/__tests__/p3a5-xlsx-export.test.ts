jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Paths: { document: 'file:///documents' },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import { Platform } from 'react-native';
import { configureApi, resetApiConfiguration } from '../../../shared/api/platform';
import { download } from '../../../shared/api/request';
import { saveAndShareXlsx, safeXlsxFilename } from '@/features/clubs/exportRegistrations';

const filesystem = require('expo-file-system') as { File: jest.Mock; Paths: { document: string } };
const sharing = require('expo-sharing') as { isAvailableAsync: jest.Mock; shareAsync: jest.Mock };

describe('P3A5-04 原生 XLSX 导出', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    resetApiConfiguration();
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    filesystem.File.mockReset();
    sharing.isAvailableAsync.mockReset().mockResolvedValue(true);
    sharing.shareAsync.mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }));

  it('下载沿用 App 注入地址和令牌，而非 Web 历史地址', async () => {
    const blob = { arrayBuffer: jest.fn() } as unknown as Blob;
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: (name: string) => name === 'content-disposition' ? "attachment; filename*=UTF-8''roster.xlsx" : null },
      blob: async () => blob,
    } as Response);
    configureApi({ baseUrl: 'https://app-api.example', getToken: () => 'app-token' });

    await expect(download('/api/clubs/activities/7/registrations/export')).resolves.toEqual({ blob, filename: 'roster.xlsx' });
    expect(fetchMock).toHaveBeenCalledWith('https://app-api.example/api/clubs/activities/7/registrations/export', {
      method: 'GET', headers: { Authorization: 'Bearer app-token' },
    });
  });

  it('原生端只保存安全的 xlsx 文件，并交给系统分享', async () => {
    const file = { uri: 'file:///documents/club-roster.xlsx', create: jest.fn(), write: jest.fn() };
    filesystem.File.mockReturnValue(file);
    const bytes = new Uint8Array([1, 2, 3]);

    await saveAndShareXlsx({ blob: { arrayBuffer: async () => bytes.buffer } as Blob, filename: '../club\\roster.xlsx' });

    expect(filesystem.File).toHaveBeenCalledWith(filesystem.Paths.document, 'club-roster.xlsx');
    expect(file.create).toHaveBeenCalledWith({ intermediates: true, overwrite: true });
    expect(file.write).toHaveBeenCalledWith(bytes);
    expect(sharing.shareAsync).toHaveBeenCalledWith(file.uri, expect.objectContaining({
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    }));
  });

  it('分享宿主不可用时抛错，不制造导出成功状态', async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);

    await expect(saveAndShareXlsx({ blob: {} as Blob, filename: 'roster.xlsx' })).rejects.toThrow('Sharing is unavailable');
    expect(filesystem.File).not.toHaveBeenCalled();
    expect(sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('将不可信响应文件名收敛为安全 .xlsx 名称', () => {
    expect(safeXlsxFilename('../../名单.xlsx')).toBe('名单.xlsx');
    expect(safeXlsxFilename('name.xls')).toBe('name.xlsx');
    expect(safeXlsxFilename('  ')).toBe('registrations.xlsx');
  });
});
