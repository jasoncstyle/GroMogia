import { PRODUCT_NAME } from "@/lib/brand";

export default function MarketingPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-24">
      <main className="text-center">
        <p className="text-lg font-semibold tracking-tight">{PRODUCT_NAME}</p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Coming soon</h1>
      </main>
    </div>
  );
}
