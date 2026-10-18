import * as React from 'react';
import {fireEvent} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {MediaCarousel} from '@/components/ui/MediaCarousel';

it('单图不建立分页状态',async()=>{
 const single=await renderApp(<MediaCarousel testID="single" uris={['https://example.com/1.jpg']} pageLabel={(i,n)=>`${i}/${n}`}/>);
 expect(single.queryByTestId('single-position')).toBeNull();
});

it('多图按水平位置更新可读页码',async()=>{
 const view=await renderApp(<MediaCarousel testID="many" uris={['https://example.com/1.jpg','https://example.com/2.jpg','https://example.com/3.jpg','https://example.com/4.jpg']} pageLabel={(i,n)=>`第 ${i} 张，共 ${n} 张`}/>);
 expect(view.getByTestId('many-position')).toHaveTextContent('第 1 张，共 4 张');
 await fireEvent.scroll(view.getByTestId('many-scroll'),{nativeEvent:{contentOffset:{x:600,y:0},layoutMeasurement:{width:300,height:200}}});
 expect(view.getByTestId('many-position')).toHaveTextContent('第 3 张，共 4 张');
});

it('没有替代文本的媒体保持装饰，不制造读屏噪音',async()=>{
 const view=await renderApp(<MediaCarousel testID="decorative" uris={['https://example.com/1.jpg','https://example.com/2.jpg']} pageLabel={(i,n)=>`${i}/${n}`}/>);
 expect(view.getByTestId('decorative-image-0',{includeHiddenElements:true}).props.accessibilityElementsHidden).toBe(true);
});
