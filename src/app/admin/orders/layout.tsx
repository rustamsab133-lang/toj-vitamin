import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "АРМ Оператора | tojvitamin.tj",
  description: "Рабочее место оператора приема заказов и доставки tojvitamin.tj",
  robots: "noindex, nofollow",
};

export default function OperatorOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
