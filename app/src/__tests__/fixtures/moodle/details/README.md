# Moodle 4.5 详情合成夹具来源

这些页面是按 `MOODLE_405_STABLE` 节点构造的合成数据，不是校园实站采样。
不包含真实姓名、课程、学校凭据或会话数据。

| 内容 | 官方结构 |
| --- | --- |
| 公告列表 | `discussion-list-item`、`th.topic a`、`author-info` |
| 讨论正文 | `article[data-post-id]`、subject、独立 `post-content-ID` |
| 作业状态 | `submissionstatustable`、submitted/draft/reopened、graded/notgraded |
| 文件夹 | `.foldertree .fp-filename a` |
| 资源文件 | `.resourceworkaround a`，再读取同源 HEAD |

源码链接：

- [公告列表](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/forum/templates/discussion_list.mustache#L183)
- [讨论文章](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/forum/templates/forum_discussion_post.mustache#L28)
- [讨论作者](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/forum/classes/local/exporters/post.php#L652)
- [帖子时间](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/lib/moodlelib.php#L1745)
- [帖子原链接](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/forum/classes/local/factories/url.php#L183)
- [作业状态](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/assign/classes/output/renderer.php#L591)
- [活动简介](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/lib/templates/activity_header.mustache#L69)
- [文件夹树](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/folder/templates/tree.mustache#L40)
- [文件夹 URL](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/folder/renderer.php#L139)
- [资源兜底链接](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/resource/locallib.php#L154)
- [文件响应头](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/lib/filelib.php#L2078)

测试用 jsdom 执行真实生成的脚本与 DOM。网络响应只替换为合成内容。
HEAD 只读取 MIME、文件名、字节数、修改时间，不读 Cookie、Location 或全部 headers。
GET/HEAD 都使用 same-origin、same-origin credentials、manual redirect。
发现任何重定向就终止，不跟到文件服务或其他站点。

站点主题差异、教师/学生角色差异和受限文件响应尚无校园设备证据。
作者没有可识别 profile 节点时保持未知；不猜本地化日期或提交状态。
