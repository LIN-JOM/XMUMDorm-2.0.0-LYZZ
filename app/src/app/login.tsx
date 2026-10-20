/**
 * 登录页：用户确认的双层曲面布局；提交仍沿用 P1-13 的会话与安全令牌链路。
 * 布局见 docs/app/task/login-curve-ui/00-实施计划.md。
 */

import * as React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { Button } from '@/components/ui/Button';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/session';
import { LoginLayout } from '@/features/auth/LoginLayout';

export default function LoginScreen(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const session = useSession();

  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  /** 错误直接存 `AppError`：`K04` 会用 `toErrorCopy` 渲染三段文案（⛔ 页面不写文案） */
  const [error, setError] = React.useState<AppError | null>(null);
  const [identifierError, setIdentifierError] = React.useState<string | undefined>(undefined);

  const submit = async (): Promise<void> => {
    if (submitting) return; // 防重复提交
    if (identifier.trim() === '') {
      setIdentifierError(t('form.error.required'));
      return;
    }
    setIdentifierError(undefined);
    setSubmitting(true);
    setError(null);
    const result = await session.login(identifier, password);
    setSubmitting(false);
    if (result.ok) {
      // 成功后**不弹对话框**（宪法 10.4）：直接回上一屏
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      return;
    }
    setError(result.error);
  };

  return (
    <LoginLayout>
        <Text role="title" emphasis="strong" colorToken="text-primary">
          {t('auth.title')}
        </Text>

        <ErrorSummary testID="login-summary" title={t('auth.failed')} formError={error} />

        {/* 会话过期被送到这里的（`A-01` 的门）：要说清**为什么**，⛔ 不是普通的"未登录" */}
        {session.status === 'expired' ? (
          <InlineNotice testID="login-expired" tone="warning" message={t('auth.expired')} />
        ) : null}

        <Input
          testID="login-identifier"
          label={t('auth.identifier')}
          value={identifier}
          onChangeText={setIdentifier}
          kind="text"
          errorText={identifierError}
          required
        />
        <Input
          testID="login-password"
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          kind="password"
          required
        />

        <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
          <Button
            testID="login-submit"
            label={t('auth.login')}
            variant="primary"
            loading={submitting}
            onPress={() => {
              void submit();
            }}
          />
          {/* 页面清单：A-03/A-04 的入口就是 A-02（本页）—— ⛔ 不做"藏在设置里的注册" */}
          <Button
            testID="login-to-register"
            label={t('auth.toRegister')}
            variant="ghost"
            onPress={() => router.push('/register')}
          />
          <Button
            testID="login-to-reset"
            label={t('auth.toReset')}
            variant="ghost"
            onPress={() => router.push('/reset-password')}
          />
        </View>
    </LoginLayout>
  );
}
