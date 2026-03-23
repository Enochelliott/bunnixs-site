import { AuthProvider } from '@/contexts/AuthContext';

export default function RootProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
