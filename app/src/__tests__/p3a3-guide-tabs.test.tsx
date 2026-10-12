import * as React from 'react';
import {fireEvent,waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {GuidesListScreen} from '@/features/guides/GuidesScreens';
import {getHandbookTabs,listHandbookArticles} from '../../../shared/api/handbook';
import {getQueryClient} from '@/shared/queryClient';

jest.mock('expo-router',()=>({useRouter:()=>({push:jest.fn(),back:jest.fn(),replace:jest.fn(),canGoBack:()=>false})}));
jest.mock('../../../shared/api/handbook',()=>({getHandbookTabs:jest.fn(),listHandbookArticles:jest.fn(),getHandbookArticleDetail:jest.fn(),listHandbookComments:jest.fn(),toggleHandbookLike:jest.fn(),createHandbookComment:jest.fn()}));

const tabs=getHandbookTabs as jest.Mock;
const articles=listHandbookArticles as jest.Mock;
beforeEach(()=>{getQueryClient().clear();tabs.mockReset();articles.mockReset();articles.mockResolvedValue({list:[],hasMore:false});});

it('指南以本地全部加真实动态分类导航，并把稳定 slug 传给列表',async()=>{
 tabs.mockResolvedValue([{id:1,slug:'arrival',name_zh:'入学准备',name_en:'Arrival'},{id:2,slug:'long',name_zh:'非常非常长的分类名称也应可横向访问',name_en:'A deliberately long category'}]);
 const view=await renderApp(<GuidesListScreen/>);
 await waitFor(()=>expect(view.getByTestId('guides-tabs')).toBeTruthy());
 expect(view.getByTestId('top-tab-all').props.accessibilityLabel).toContain('全部');
 expect(view.getByTestId('top-tab-long').props.accessibilityLabel).toContain('非常非常长的分类名称也应可横向访问');
 await fireEvent.press(view.getByTestId('top-tab-arrival'));
 await waitFor(()=>expect(articles).toHaveBeenLastCalledWith({page:1,pageSize:10,tab:'arrival'}));
});

it('分类接口为空时不留下空导航条',async()=>{
 tabs.mockResolvedValue([]);
 const view=await renderApp(<GuidesListScreen/>);
 await waitFor(()=>expect(articles).toHaveBeenCalledWith({page:1,pageSize:10}));
 expect(view.queryByTestId('guides-tabs')).toBeNull();
});
