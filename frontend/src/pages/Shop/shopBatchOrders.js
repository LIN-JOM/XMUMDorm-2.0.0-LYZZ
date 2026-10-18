import { transitions } from './shopLabels.js';

export const nextOrderStatus = status => transitions[status]?.find(value => value !== 'cancelled');

// Keep the selected source status: a background refresh must not silently select a later step.
export function selectedOrderSteps(orders, selection) {
  return orders.filter(order => selection[order.id] === order.status && nextOrderStatus(order.status))
    .map(order => ({ id: order.id, from: order.status, to: nextOrderStatus(order.status) }));
}

export async function advanceOrderSteps(steps, updateStatus, onProgress = () => {}) {
  const results = [];
  // Fixed destinations make retries safe with the existing idempotent status endpoint.
  // Sequential requests also avoid overwhelming the API with up to 1,000 simultaneous writes.
  for (const step of steps) {
    try {
      await updateStatus(step.id, step.to);
      results.push({ ...step, success: true });
    } catch (error) {
      results.push({ ...step, success: false, message: error.message || 'Request failed' });
    }
    onProgress(results.length);
  }
  return results;
}
