import type { Metadata } from 'next';
import AuthShell from '../../components/auth/AuthShell';
import SignUpForm from '../../components/auth/SignUpForm';

export const metadata: Metadata = { title: 'Sign up · Yougrep' };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start hiring with an agent in every channel">
      <SignUpForm />
    </AuthShell>
  );
}
