const { resolveDeliveryZone } = require('../../services/shop');

describe('resolveDeliveryZone', () => {
  const zones = [
    { id: 'ly1', name_zh: 'LY1', name_en: 'LY1', fee_cents: 250 },
    { id: 'ly2', name_zh: 'LY2', name_en: 'LY2', fee_cents: 400 },
  ];

  test('matches the entered dorm building and ignores the selected id', () => {
    expect(resolveDeliveryZone(zones, ' ly1 ')).toEqual(zones[0]);
    expect(resolveDeliveryZone(zones, 'LY2')).toEqual(zones[1]);
  });

  test('does not require a student-selected zone when merchant has no zones configured', () => {
    expect(resolveDeliveryZone([], 'LY1')).toBeNull();
  });

  test('rejects a building outside the merchant service areas', () => {
    expect(() => resolveDeliveryZone(zones, 'OTHER')).toThrow(/配送地区名称一致/);
  });
});
