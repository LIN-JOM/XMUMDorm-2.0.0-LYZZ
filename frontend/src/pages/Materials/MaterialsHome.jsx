/**
 * 学习资料首页 —— **课程为中心**
 *
 * 主轴是课程列表（课 → 资料），符合学习场景「先找课，再找资料」。
 * 下方附「最新资料」便于新内容被发现。
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Clock, Search, GraduationCap } from 'lucide-react';
import { isMaterialsPreviewMode, listCourses, listMaterials } from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import MaterialCard from '../../components/materials/MaterialCard';
import './Materials.css';

export default function MaterialsHome() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  const [q, setQ] = useState('');

  // 课程搜索做防抖，避免每个字符都请求
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const {
    data: courseData,
    isLoading: coursesLoading,
    isError: coursesError,
  } = useQuery({
    queryKey: QK.materialsCourses(debouncedQ),
    queryFn: () => listCourses({ q: debouncedQ, limit: 200 }),
    staleTime: 60 * 1000,
  });

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: QK.materialsList({ sort: 'recent', pageSize: 12 }),
    queryFn: () => listMaterials({ sort: 'recent', pageSize: 12 }),
    staleTime: 60 * 1000,
  });

  // 课程字典由后端按 `q` 过滤（课程名 / 讲师同一份数据），前端不再做二次过滤 ——
  // 之前页面并排放了两个搜索框，实际过滤的是同一组字段，重复且容易让人以为各有分工。
  const courses = (courseData && courseData.courses) || [];

  const recentItems = (recent && recent.items) || [];
  const configured = !recent || recent.configured !== false;

  return (
    <div className="mat-page">
      <div className="mat-wrap">
        <header className="mat-hero">
          <div className="mat-hero-row">
            <div>
              <h1 className="mat-title">
                <BookOpen size={22} /> {isZh ? '学习资料' : 'Study Materials'}
              </h1>
              <div className="mat-sub">
                {isZh
                  ? '按课程聚合的笔记、课件、试题与答案。资料存放在公开资料库，可在线阅读、可下载。'
                  : 'Notes, slides, past papers and answers grouped by course.'}
              </div>
            </div>
            <div className="mat-toolbar" style={{ marginTop: 0 }}>
              {isLoggedIn && !isMaterialsPreviewMode && (
                <Link className="mat-btn mat-btn--primary" to="/materials/upload">
                  {isZh ? '上传资料' : 'Upload'}
                </Link>
              )}
              {!isMaterialsPreviewMode && (
                <Link className="mat-btn" to="/materials/me">
                  {isZh ? '我上传的' : 'My uploads'}
                </Link>
              )}
            </div>
          </div>
        </header>

        {!configured && (
          <div className="mat-banner mat-banner--warn">
            {isZh
              ? '学习资料库尚未配置（服务端缺少 GITHUB_MATERIALS_* 环境变量），暂时读不到任何资料。请联系管理员。'
              : 'Materials repository is not configured on the server yet.'}
          </div>
        )}
        {isMaterialsPreviewMode && (
          <div className="mat-banner mat-banner--warn">
            {isZh
              ? '当前为生产数据只读预览：可浏览和下载资料，上传、收藏及下载计数均已关闭。'
              : 'Read-only production preview: browsing and downloads are available; uploads, saves and download tracking are disabled.'}
          </div>
        )}
        {recent && recent.stale && (
          <div className="mat-banner mat-banner--warn">
            {isZh ? '资料库暂时不可达，以下为本地缓存快照。' : 'Repository unreachable; showing cached snapshot.'}
          </div>
        )}

        {/* ---------------- 课程 ---------------- */}
        <section className="mat-glass mat-section">
          <div className="mat-section-title">
            <GraduationCap size={17} /> {isZh ? '按课程浏览' : 'Browse by course'}
          </div>

          <div className="mat-toolbar" style={{ marginTop: 0 }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search
                size={15}
                aria-hidden
                style={{ position: 'absolute', left: 11, top: 12, color: 'rgba(15,23,42,.4)' }}
              />
              <input
                className="mat-input mat-search"
                style={{ paddingLeft: 32, width: '100%' }}
                placeholder={isZh ? '搜索课程名或讲师…' : 'Search course or lecturer…'}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {coursesLoading && <div className="mat-state">{isZh ? '加载中…' : 'Loading…'}</div>}

          {coursesError && (
            <div className="mat-banner mat-banner--error">
              {isZh
                ? '课程字典读取失败。若刚部署，请确认已执行数据库迁移 `069_materials.sql`。'
                : 'Failed to load course catalog.'}
            </div>
          )}

          {!coursesLoading && !coursesError && courses.length === 0 && (
            <div className="mat-state">
              {debouncedQ
                ? (isZh ? '没有匹配的课程' : 'No matching courses')
                : (isZh ? '还没有任何课程资料。上传第一份资料就会创建课程。' : 'No courses yet.')}
            </div>
          )}

          <div className="mat-course-grid">
            {courses.map((c) => {
              const count = c.materialCount ?? 0;
              return (
                <Link
                  key={c.courseId}
                  className="mat-course-row"
                  to={`/materials/course/${c.courseId}`}
                  title={c.name}
                >
                  <span className="mat-course-name">{c.name}</span>
                  <span className="mat-course-lecturer">{c.lecturer || '—'}</span>
                  <span className="mat-course-count">
                    {isZh ? `${count} 份` : `${count} ${count === 1 ? 'file' : 'files'}`}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------------- 最新资料 ---------------- */}
        <section className="mat-glass mat-section">
          <div className="mat-section-title">
            <Clock size={17} /> {isZh ? '最新上传' : 'Recently added'}
          </div>

          {recentLoading && <div className="mat-state">{isZh ? '加载中…' : 'Loading…'}</div>}

          {!recentLoading && recentItems.length === 0 && (
            <div className="mat-state">{isZh ? '还没有资料' : 'No materials yet'}</div>
          )}

          <div className="mat-list">
            {recentItems.map((it) => (
              <MaterialCard key={it.path} item={it} isZh={isZh} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
