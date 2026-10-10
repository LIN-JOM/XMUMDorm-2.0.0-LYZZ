# Moodle 模拟响应夹具

日期：2026-10-10。来源版本：Moodle `MOODLE_405_STABLE`（4.5）。

这些样本由官方字段定义构造，**不是 XMUM 实站抓取数据**。
课程、章节、模块、事件、名称和凭据标记均为虚构值。
站点版本、插件输出、真实 AJAX 与 WebView 会话仍需设备验证。

`courses.json` 保留分页、课程可见性与非白名单字段，用于校验课程投影。
`state.json` 模拟 JSON 字符串解码后的 course/section/cm；机器类型来自 module。
`events.json` 使用 instance 作为 cmid、timesort 作为 Unix 秒，并保留独立分页游标。
隐藏对象与敏感 URL 是有意加入的回归输入。

sourceURLs：

- [课程列表接口](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/course/externallib.php#L3635)定义 courses 与 nextoffset。
- [课程导出器](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/course/classes/external/course_summary_exporter.php#L63)定义课程摘要字段。
- [state 接口](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/course/format/classes/external/get_state.php#L35)返回 JSON 字符串。
- [course state](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/course/format/classes/output/local/state/course.php#L58)定义课程 ID 与章节索引。
- [section state](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/course/format/classes/output/local/state/section.php#L71)定义章节与 cmlist。
- [cm state](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/course/format/classes/output/local/state/cm.php#L67)定义 module 机器类型与限制态。
- [事件分页](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/calendar/classes/external/events_exporter.php#L61)定义 firstid 与 lastid。
- [事件字段](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/calendar/classes/external/event_exporter_base.php#L64)定义 instance 与 timesort。

投影边界：只接受 HTTPS、同源 `l.xmu.edu.my` 的 URL，保留常用数值导航 query。
其他 query、fragment 和凭据字段不进入标准对象。
原始可见性缺失按隐藏处理；模块仅在 uservisible 明确为真时保留安全链接。
accessvisible 描述是否对所有人均可用，不替代当前用户的 uservisible 权限。
事件优先使用官方 url，其次使用安全 action.url；不把删去定位参数的 viewurl 当作模块链接。
