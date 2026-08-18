import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KNOWN_PROVIDERS } from "@/modules/integrations/types";

export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          GroMogia stores canonical business data. Vendors plug in through
          adapters. Nothing is tightly coupled to one email, ads, or website
          host.
        </p>
      </div>
      <div className="grid gap-3">
        {KNOWN_PROVIDERS.map((provider) => (
          <Card key={provider.key}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{provider.name}</CardTitle>
                <Badge variant="outline">Disconnected</Badge>
              </div>
              <CardDescription>
                Capabilities: {provider.capabilities.join(", ")}. Connect in
                Phase 2+ using OAuth or official APIs. Tokens will be stored
                encrypted, never in git.
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
