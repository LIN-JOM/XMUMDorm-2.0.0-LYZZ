let nextOrderStatus, selectedOrderSteps, advanceOrderSteps;
beforeAll(async () => {
  ({nextOrderStatus, selectedOrderSteps, advanceOrderSteps} = await import('../../frontend/src/pages/Shop/shopBatchOrders.js'));
});
test('each actionable state advances exactly one step, never cancels', () => {
  expect(['pending_verification','confirmed','preparing','delivering'].map(nextOrderStatus))
    .toEqual(['confirmed','preparing','delivering','completed']);
  for (const value of ['completed','cancelled','unknown']) expect(nextOrderStatus(value)).toBeUndefined();
});
test('refresh excludes orders whose selected state changed and unselected/new orders', () => {
  expect(selectedOrderSteps([{id:1,status:'preparing'},{id:2,status:'confirmed'},{id:3,status:'confirmed'},{id:4,status:'completed'}],
    {1:'confirmed',2:'confirmed',4:'completed'})).toEqual([{id:2,from:'confirmed',to:'preparing'}]);
});
test('partial errors preserve individual results and continue the remaining orders', async () => {
  const update=jest.fn().mockRejectedValueOnce(new Error('Receipt required')).mockResolvedValueOnce({});
  const progress=jest.fn();
  const result=await advanceOrderSteps([{id:1,to:'confirmed'},{id:2,to:'preparing'}],update,progress);
  expect(result).toEqual([{id:1,to:'confirmed',success:false,message:'Receipt required'},{id:2,to:'preparing',success:true}]);
  expect(progress.mock.calls).toEqual([[1],[2]]);
});
test('retry after an ambiguous network result sends the same destination, not the next step', async () => {
  const steps=[{id:1,from:'confirmed',to:'preparing'}];
  const update=jest.fn().mockRejectedValueOnce(new Error('Network interrupted')).mockResolvedValue({});
  await advanceOrderSteps(steps,update);
  await advanceOrderSteps(steps,update);
  expect(update.mock.calls).toEqual([[1,'preparing'],[1,'preparing']]);
});
test('empty selection sends no writes', async () => {
  const update=jest.fn();
  expect(await advanceOrderSteps([],update)).toEqual([]);
  expect(update).not.toHaveBeenCalled();
});
test('requests are sequential rather than firing all writes concurrently', async () => {
  let finishFirst;
  const update=jest.fn().mockImplementationOnce(()=>new Promise(resolve=>{finishFirst=resolve;})).mockResolvedValue({});
  const pending=advanceOrderSteps([{id:1,to:'preparing'},{id:2,to:'delivering'}],update);
  expect(update).toHaveBeenCalledTimes(1);
  finishFirst({});
  await pending;
  expect(update).toHaveBeenCalledTimes(2);
});
