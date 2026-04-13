import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Пульт управления | tojvitamin.tj",
  description: "Панель администратора tojvitamin.tj",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
