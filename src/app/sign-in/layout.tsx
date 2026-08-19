import { PRODUCT_NAME } from "@/lib/brand";

export const metadata = {
  title: `Sign in · ${PRODUCT_NAME}`,
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
