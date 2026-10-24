// 画布 / 几何常量（对应 dsh-pet src/shared/constants.ts，MIT License 移植）。
// 与素材链的 360×360 方形裁剪强耦合（dsh-pet 原版是 640×360 横幅，坐标同源换算）。

/** 素材画幅边长（px）：方形 360×360 */
export const CANVAS = 360;

/** 点击/拖拽命中矩形（素材 360×360 像素坐标）。
 *  按首批 11 段素材的角色并集（x 37..328、y 7..349）外扩少许取整——
 *  命中层按此矩形铺设（百分比定位），指针只认身体区域，"抓哪里是哪里"。
 *  换素材批次后按新并集更新这里。 */
export const HIT_BOX = { x0: 45, y0: 15, x1: 315, y1: 352 };

/** 拖拽判定阈值（px）：位移超过它才算拖拽，否则松手算点击 */
export const DRAG_THRESHOLD = 5;

/** 触屏长按菜单时长（ms）；手指移动超过 8px 即取消长按 */
export const LONGPRESS_MS = 500;
export const LONGPRESS_CANCEL_PX = 8;

/** 拖拽结束后的点击抑制窗口（ms）：刚拖完的 click 不算点击回应 */
export const JUST_DRAGGED_MS = 100;
