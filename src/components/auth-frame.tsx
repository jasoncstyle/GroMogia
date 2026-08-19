import { PRODUCT_NAME } from "@/lib/brand";

export function AuthFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-lg font-semibold tracking-tight">{PRODUCT_NAME}</p>
        <p className="text-sm text-muted-foreground">
          Connect the business. Understand the business. Grow the business.
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </div>
  );
}
