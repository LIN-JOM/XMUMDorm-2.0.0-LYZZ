-- description: Store treehole declarations without assigning authorship to historical posts.
-- depends: 013_posts_title
SET @post_attribution_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE posts ADD COLUMN content_origin ENUM(''original'',''repost'') NULL DEFAULT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='posts' AND COLUMN_NAME='content_origin');
PREPARE post_attribution_stmt FROM @post_attribution_ddl; EXECUTE post_attribution_stmt; DEALLOCATE PREPARE post_attribution_stmt;
SET @post_attribution_ddl = (SELECT IF(COUNT(*)=0, 'ALTER TABLE posts ADD COLUMN repost_source VARCHAR(100) NULL DEFAULT NULL', 'SELECT 1') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='posts' AND COLUMN_NAME='repost_source');
PREPARE post_attribution_stmt FROM @post_attribution_ddl; EXECUTE post_attribution_stmt; DEALLOCATE PREPARE post_attribution_stmt;
