import { createProduct } from '../../../shared/api/canteen';
import { request } from '../../../shared/api/request';
jest.mock('../../../shared/api/request', () => ({ request: jest.fn() }));
const originalFormData = globalThis.FormData;
const originalFile = Object.getOwnPropertyDescriptor(globalThis, 'File');
const originalBlob = Object.getOwnPropertyDescriptor(globalThis, 'Blob');
const parts: Array<[string, unknown, unknown]> = [];
class FakeFormData { append(key: string, value: unknown, filename?: unknown) { parts.push([key, value, filename]); } }
beforeEach(() => {
  parts.length = 0; jest.clearAllMocks();
  Object.defineProperty(globalThis, 'FormData', { configurable: true, value: FakeFormData });
  Object.defineProperty(globalThis, 'File', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'Blob', { configurable: true, value: undefined });
  jest.mocked(request).mockResolvedValue({ id: 17 });
});
afterEach(() => {
  Object.defineProperty(globalThis, 'FormData', { configurable: true, value: originalFormData });
  if (originalFile) Object.defineProperty(globalThis, 'File', originalFile); else Reflect.deleteProperty(globalThis, 'File');
  if (originalBlob) Object.defineProperty(globalThis, 'Blob', originalBlob); else Reflect.deleteProperty(globalThis, 'Blob');
});
it('uploads a native file while File and Blob are unavailable', async () => {
  const image = { uri: 'file:///rice.jpg', type: 'image/jpeg', name: 'rice.jpg' };
  await createProduct({ category_id: 2, name: 'Rice', images: [image] });
  expect(parts).toContainEqual(['images', image, undefined]);
  expect(request).toHaveBeenCalledWith('/api/canteen/products', expect.objectContaining({ method: 'POST' }));
});
it('keeps browser File uploads and filenames intact', async () => {
  class BrowserFile { name = 'rice.png'; }
  Object.defineProperty(globalThis, 'File', { configurable: true, value: BrowserFile });
  const image = new BrowserFile();
  await createProduct({ category_id: 2, name: 'Rice', images: [image] });
  expect(parts).toContainEqual(['images', image, 'rice.png']);
});
it('rejects unsupported native descriptors before starting the request', async () => {
  await expect(createProduct({ category_id: 2, name: 'Rice', images: [{ uri: 'file:///rice.exe', type: 'application/octet-stream', name: 'rice.exe' }] })).rejects.toMatchObject({ kind: 'validation' });
  expect(request).not.toHaveBeenCalled();
});
