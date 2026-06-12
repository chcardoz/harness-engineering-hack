import type { Metadata } from 'next';
import AuthShell from '../../components/auth/AuthShell';
import SignInForm from '../../components/auth/SignInForm';

export const metadata: Metadata = { title: 'Sign in · Yougrep' };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your recruiter workspace">
      <SignInForm />
    </AuthShell>
  );
}
