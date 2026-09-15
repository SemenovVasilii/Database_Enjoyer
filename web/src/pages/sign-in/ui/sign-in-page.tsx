import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, Database, KeyRound, Mail } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, useSendOtpMutation, useVerifyOtpMutation } from '@/features/auth';
import { errorMessage } from '@/shared/lib';
import { Button, ThemeSwitch } from '@/shared/ui';

type Step = 'email' | 'code';

export function SignInPage() {
  const accessToken = useSelector(
    (state: { auth: { accessToken: string | null } }) => state.auth.accessToken,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string>();
  const [sendOtp, sendState] = useSendOtpMutation();
  const [verifyOtp, verifyState] = useVerifyOtpMutation();

  if (accessToken) return <Navigate to="/" replace />;

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    setMessage(undefined);
    try {
      await sendOtp({ email: email.trim().toLowerCase() }).unwrap();
      setStep('code');
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setMessage(undefined);
    try {
      const tokens = await verifyOtp({ email: email.trim().toLowerCase(), code }).unwrap();
      dispatch(setCredentials(tokens));
      await navigate({ to: '/' });
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-5 py-6 md:px-8">
      <div className="pointer-events-none absolute -top-48 left-1/3 size-[520px] rounded-full bg-accent/8 blur-3xl" />
      <div className="relative mx-auto flex max-w-6xl justify-between">
        <div className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Database size={20} strokeWidth={1.8} />
          </span>
          DatabaseEnjoyer
        </div>
        <ThemeSwitch />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-84px)] max-w-6xl items-center gap-12 py-10 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="hidden lg:block">
          <span className="inline-flex rounded-full border border-accent/15 bg-accent/8 px-3 py-1.5 text-xs font-semibold text-accent">
            Database workspace
          </span>
          <h1 className="mt-6 max-w-2xl text-5xl leading-[1.06] font-semibold tracking-[-0.04em] text-ink">
            Ваши базы данных в одном рабочем пространстве
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Подключайте PostgreSQL, MySQL и MongoDB, изучайте структуру и выполняйте SQL из
            браузера.
          </p>
          <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
            {[
              ['01', 'Без пароля', 'Одноразовый код приходит на почту.'],
              ['02', 'Личный каталог', 'Подключения видны только владельцу.'],
              ['03', 'Быстрый вход', 'Новый аккаунт создаётся автоматически.'],
            ].map(([number, title, description]) => (
              <div key={number} className="border-t border-line pt-4">
                <span className="font-mono text-[11px] text-accent">{number}</span>
                <h2 className="mt-3 text-sm font-semibold">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel mx-auto w-full max-w-md p-6 sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/8 text-accent">
            {step === 'email' ? <Mail size={21} /> : <KeyRound size={21} />}
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">
            {step === 'email' ? 'Войти по почте' : 'Введите код'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {step === 'email'
              ? 'Введите email — мы отправим шестизначный код для входа.'
              : `Код отправлен на ${email.trim().toLowerCase()}. Он действует 10 минут.`}
          </p>

          {message && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-danger/20 bg-danger/8 px-3.5 py-3 text-xs leading-5 text-danger"
            >
              {message}
            </div>
          )}

          {step === 'email' ? (
            <form className="mt-7" onSubmit={submitEmail}>
              <label className="block text-xs font-medium text-secondary" htmlFor="email">
                Email
              </label>
              <div className="relative mt-2">
                <Mail className="absolute top-2.5 left-3 text-muted" size={15} />
                <input
                  id="email"
                  className="field h-10 pl-9"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                  required
                />
              </div>
              <Button className="mt-5 w-full" type="submit" disabled={sendState.isLoading}>
                {sendState.isLoading ? 'Отправляем…' : 'Получить код'}
              </Button>
            </form>
          ) : (
            <form className="mt-7" onSubmit={submitCode}>
              <label className="block text-xs font-medium text-secondary" htmlFor="code">
                Код подтверждения
              </label>
              <input
                id="code"
                className="field mt-2 h-12 text-center font-mono text-xl tracking-[0.45em]"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                required
                minLength={6}
              />
              <Button className="mt-5 w-full" type="submit" disabled={verifyState.isLoading}>
                <Check size={15} />
                {verifyState.isLoading ? 'Проверяем…' : 'Войти'}
              </Button>
              <button
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-muted transition hover:text-accent"
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setMessage(undefined);
                }}
              >
                <ArrowLeft size={14} />
                Изменить email
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
