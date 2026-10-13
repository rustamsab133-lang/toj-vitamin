'use client';

import { AdminLogin } from '../components/AdminLogin';

export default function AdminLoginPage() {
  return <AdminLogin onAuth={() => window.location.replace('/admin')} />;
}
