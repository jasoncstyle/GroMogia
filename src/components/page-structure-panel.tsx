import {
  describePageStructureGroupHeading,
  describePageStructureHeading,
  type InternalLinkView,
  type SchemaFactView,
} from "@/lib/growth/page-structure";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PageStructurePanel({
  links,
  schemaFacts,
  pagesRead,
}: {
  links: InternalLinkView[]
  schemaFacts: SchemaFactView[]
  pagesRead: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {describePageStructureHeading(links.length, schemaFacts.length)}
        </CardTitle>
        <CardDescription>
          GroovGro compared pages it already read. If one page&apos;s stored
          text mentions another page&apos;s title, it suggests a link. Schema
          types are estimates from the page group. GroovGro will not add links or schema
          to the live website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pagesRead ? (
          <p className="text-sm text-muted-foreground">
            Read the connected website first. GroovGro will not guess links
            or schema.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {describePageStructureGroupHeading("links", links.length)}
              </p>
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No stored page mentions another page&apos;s title strongly
                  enough to suggest a link.
                </p>
              ) : (
                links.map((link) => (
                  <div
                    key={`${link.fromPageId}-${link.toPageId}`}
                    className="space-y-1"
                  >
                    <p className="text-sm font-medium">
                      From {link.fromTitle} consider linking to {link.toTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {link.fromUrl} → {link.toUrl}
                    </p>
                    <p className="text-sm text-muted-foreground">{link.reason}</p>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {describePageStructureGroupHeading("schema", schemaFacts.length)}
              </p>
              {schemaFacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  GroovGro has not stored schema estimates from the pages it
                  already read.
                </p>
              ) : (
                schemaFacts.map((fact) => (
                  <div key={fact.pageId} className="space-y-1">
                    <p className="text-sm font-medium">
                      {fact.pageTitle}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Estimate · {fact.schemaType}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{fact.pageUrl}</p>
                    <p className="text-sm text-muted-foreground">{fact.why}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
