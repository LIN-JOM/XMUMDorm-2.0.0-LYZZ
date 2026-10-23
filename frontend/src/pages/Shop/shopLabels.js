export const categories = { offers: ['限时优惠', 'Offers'], water: ['瓶装矿泉水', 'Water'], drinks: ['饮料', 'Drinks'], noodles: ['方便面', 'Noodles'], eggs: ['鸡蛋', 'Eggs'], groceries: ['杂货', 'Groceries'], snacks: ['零食', 'Snacks'] };
export const statuses = { pending_verification: ['待商家接单', 'Awaiting merchant acceptance'], confirmed: ['已确认', 'Confirmed'], preparing: ['备货中', 'Preparing'], delivering: ['配送中', 'Delivering'], completed: ['已完成', 'Completed'], cancelled: ['已取消', 'Cancelled'] };
export const transitions = { pending_verification: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['delivering', 'cancelled'], delivering: ['completed'], completed: [], cancelled: [] };
export const money = cents => `RM ${(cents / 100).toFixed(2)}`;
export const localized = (value, key, isZh) => value?.[`${key}_${isZh ? 'zh' : 'en'}`] || '';
