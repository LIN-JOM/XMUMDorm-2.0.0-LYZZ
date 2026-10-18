/**
 * 课表页视觉验收用的**本地 fixture 后端**（dev 工具，不进 CI、不被 App 引用）
 *
 * 为什么要它：课表页需要登录态的真实课表才能看到"有课 + 多课程配色"的界面。
 * 本机没有可用账号，所以用一个只服务 `GET /api/schedule/week` 的假后端来截图验收。
 * ⚠️ 截图与文档必须标注"fixture 数据"，⛔ 不得当成真实课表。
 *
 * 用法：
 *   node scripts/dev-timetable-fixture.js            # 监听 4041
 *   # 另开终端，重启 Metro 时带上：
 *   #   环境变量 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:4041
 *   # 模拟器：adb reverse tcp:4041 tcp:4041
 *
 * 数据刻意做成 6 门不同的课 + 1 门课出现两次（验证"同课同色 + 本周安排"）。
 */

const express = require('express');

const PORT = Number(process.env.TIMETABLE_FIXTURE_PORT || 4041);

/** 与后端 `GET /api/schedule/week` 的响应字段一致（camelCase 由 App 侧 normalize） */
function weekPayload(week) {
  return {
    week,
    currentWeek: week,
    semesterStatus: 'during',
    totalWeeks: 20,
    days: {
      1: [
        { course_code: 'G0173', course_name: '大学英语', credit: 3, lecturer: '张三', day_of_week: 1, start_time: '08:00', end_time: '10:00', venue: 'A5#G11' },
        { course_code: 'BSC130', course_name: '数据结构', credit: 4, lecturer: '李四', day_of_week: 1, start_time: '14:00', end_time: '16:00', venue: 'B1#201' },
      ],
      2: [
        { course_code: 'MAT201', course_name: '线性代数', credit: 3, lecturer: '王五', day_of_week: 2, start_time: '10:00', end_time: '12:00', venue: 'C2#305' },
      ],
      3: [
        { course_code: 'PHY110', course_name: '大学物理', credit: 4, lecturer: '赵六', day_of_week: 3, start_time: '08:00', end_time: '10:00', venue: 'D1#101' },
        // 同一门「大学英语」第二次出现：颜色必须与周一那节一致
        { course_code: 'G0173', course_name: '大学英语', credit: 3, lecturer: '张三', day_of_week: 3, start_time: '16:00', end_time: '18:00', venue: 'A5#G11' },
      ],
      4: [
        { course_code: 'CS210', course_name: '操作系统', credit: 3, lecturer: '孙七', day_of_week: 4, start_time: '14:00', end_time: '16:00', venue: 'E3#402' },
      ],
      5: [
        { course_code: 'ENG202', course_name: '学术写作', credit: 2, lecturer: '周八', day_of_week: 5, start_time: '10:00', end_time: '12:00', venue: 'F4#203' },
      ],
    },
  };
}

const app = express();
app.disable('x-powered-by');

app.get('/api/schedule/week', (req, res) => {
  const week = Number(req.query.week);
  res.json({ success: true, data: weekPayload(Number.isFinite(week) && week > 0 ? week : 1) });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `fixture: ${req.method} ${req.path} 未实现（只服务 schedule/week）` });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[timetable-fixture] http://127.0.0.1:${PORT}  GET /api/schedule/week?week=N`);
});
