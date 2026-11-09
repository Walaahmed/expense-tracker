import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Field from '../components/Field.jsx';
import { useValidatedForm } from '../useValidatedForm.js';
import { validateAuth } from '../validation.js';

// نفس الكومبوننت للدخول والتسجيل، والفرق بيتحدد بالـ prop اسمها mode
export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();

  const { form, errors, setErrors, bind, check } = useValidatedForm(
    { name: '', email: '', password: '' },
    (f) => validateAuth(f, mode),
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!check(e.currentTarget)) return;
    setSubmitting(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      // مفيش navigate هنا: لما user يتحدد، PublicOnly بيحوّلنا للداشبورد لوحده
    } catch (err) {
      setError(err.message);
      setErrors(err.details || {});
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Spendly
        </div>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isRegister ? 'Start tracking where your money goes.' : 'Log in to see your spending.'}
        </p>

        {error && <div className="alert" role="alert">{error}</div>}

        {isRegister && (
          <Field label="Name" error={errors.name}>
            <input {...bind('name')} autoComplete="name" maxLength={60} />
          </Field>
        )}

        <Field label="Email" error={errors.email}>
          <input {...bind('email')} type="email" autoComplete="email" />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          hint={isRegister ? 'At least 8 characters' : undefined}
        >
          <span className="pw-wrap">
            <input
              {...bind('password')}
              type={showPw ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </span>
        </Field>

        <button className="btn primary" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <p className="muted switch">
          {isRegister ? (
            <>Already have an account? <Link to="/login">Log in</Link></>
          ) : (
            <>New here? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </form>
    </main>
  );
}
