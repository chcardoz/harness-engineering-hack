import type { Metadata } from 'next';
import AuthShell from '../../components/auth/AuthShell';
import CreateOrgForm from '../../components/auth/CreateOrgForm';

export const metadata: Metadata = { title: 'Create your company · Yougrep' };

export default function OnboardingPage() {
  return (
    <AuthShell
      title="Name your company"
      subtitle="This becomes your public job board at /c/your-company"
    >
      <CreateOrgForm />
    </AuthShell>
  );
}
