import { PRODUCT_NAME } from "@/lib/brand";

export const metadata = {
  title: `Sign up · ${PRODUCT_NAME}`,
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
