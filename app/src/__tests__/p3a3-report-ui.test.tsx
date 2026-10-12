import * as React from 'react';
import {act,fireEvent,waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {MarketDetailScreen} from '@/features/marketplace/MarketScreens';
import {ErrandDetailScreen} from '@/features/errand/ErrandScreens';
import {getMarketplaceItemDetail} from '../../../shared/api/marketplace';
import {getErrandDetail} from '../../../shared/api/errands';
import {getMe} from '../../../shared/api/users';
import {submitReport} from '../../../shared/api/admin';

const mockSession={isSignedIn:true,handleAuthFailure:jest.fn()};
jest.mock('expo-router',()=>({useRouter:()=>({push:jest.fn(),back:jest.fn(),replace:jest.fn(),canGoBack:()=>false})}));
jest.mock('@/features/auth/session',()=>({useSession:()=>mockSession}));
jest.mock('../../../shared/api/marketplace',()=>({getMarketplaceItemDetail:jest.fn(),toggleMarketplaceWant:jest.fn(),listMarketplaceItems:jest.fn()}));
jest.mock('../../../shared/api/errands',()=>({getErrandDetail:jest.fn(),listErrands:jest.fn(),takeErrand:jest.fn(),doneErrand:jest.fn(),deleteErrand:jest.fn()}));
jest.mock('../../../shared/api/users',()=>({getMe:jest.fn()}));
jest.mock('../../../shared/api/admin',()=>({submitReport:jest.fn()}));

const market=getMarketplaceItemDetail as jest.Mock;
const errand=getErrandDetail as jest.Mock;
const me=getMe as jest.Mock;
const report=submitReport as jest.Mock;

beforeEach(()=>{jest.clearAllMocks();market.mockReset();errand.mockReset();me.mockReset();report.mockReset();mockSession.isSignedIn=true;});

it('二手举报仅在服务端回执后完成，重复举报失败时保留草稿',async()=>{
 market.mockResolvedValue({id:11,title:'Book',description:'Used',price:12,status:'on_sale',sellerInfo:{name:'Seller'},viewer:{want:false},actions:{want:true},images:[],wants_count:2});
 report.mockRejectedValue({status:400});
 const view=await renderApp(<MarketDetailScreen itemId="11"/>,{inScreen:true});
 await waitFor(()=>expect(view.getByTestId('market-detail-report')).toBeTruthy());
 await fireEvent.press(view.getByTestId('market-detail-report'));
 await fireEvent.press(view.getByLabelText('举报原因：请选择'));
 await fireEvent.press(view.getByLabelText('诈骗'));
 await fireEvent.changeText(view.getByDisplayValue(''),'商品与描述不符');
 await act(async()=>{await fireEvent.press(view.getByTestId('report-submit'));});
 await act(async()=>{await fireEvent.press(view.getAllByLabelText('举报',{includeHiddenElements:true})[1]);});
 await waitFor(()=>expect(report).toHaveBeenCalledWith({target_type:'marketplace',target_id:11,reason:'fraud',detail:'商品与描述不符',screenshots:undefined}));
 expect(view.getByText('举报失败，可重试')).toBeTruthy();
 expect(view.getByDisplayValue('商品与描述不符')).toBeTruthy();
});

it('跑腿举报把真实目标交给同一服务端并在写入回执后关闭面板',async()=>{
 errand.mockResolvedValue({id:12,title:'Pickup',description:'Pick up a package',reward:5,type:'delivery',status:'open',owner:{id:3,username:'Owner'},contactInfo:'test contact',taker:null});
 me.mockResolvedValue({id:9,role:'student'});report.mockResolvedValue({id:8});
 const view=await renderApp(<ErrandDetailScreen errandId="12"/>,{inScreen:true});
 await waitFor(()=>expect(view.getByTestId('errand-detail-report')).toBeTruthy());
 await fireEvent.press(view.getByTestId('errand-detail-report'));
 await fireEvent.press(view.getByLabelText('举报原因：请选择'));
 await fireEvent.press(view.getByLabelText('垃圾信息'));
 await act(async()=>{await fireEvent.press(view.getByTestId('report-submit'));});
 await act(async()=>{await fireEvent.press(view.getAllByLabelText('举报',{includeHiddenElements:true})[1]);});
 await waitFor(()=>expect(report).toHaveBeenCalledWith({target_type:'errand',target_id:12,reason:'spam',detail:'',screenshots:undefined}));
 await waitFor(()=>expect(view.queryByTestId('report-submit')).toBeNull());
});
