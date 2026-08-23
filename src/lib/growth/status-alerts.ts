export type StatusAlertTone = "ok" | "wait" | "problem"

export type StatusAlertTopic = "workspace" | "website" | "stripe" | "tracking"

export type StatusAlertItem = {
  id: StatusAlertTopic
  tone: StatusAlertTone
  title: string
  body: string
}

export type StatusAlertFacts = {
  signedIn: boolean
  organizationReady: boolean
  missingServices: string[]
  websiteUrl: string
  websiteRead: boolean
  stripeConnected: boolean
  paymentCount: number
  recordedVisitCount: number
  topics?: StatusAlertTopic[]
}

const ALL_TOPICS: StatusAlertTopic[] = [
  "workspace",
  "website",
  "stripe",
  "tracking",
]

export function websiteWasRead(inferredSummary?: string | null): boolean {
  return /it read \d+ connected website page/i.test(inferredSummary ?? "")
}

export function buildStatusAlerts(facts: StatusAlertFacts): StatusAlertItem[] {
  const topics = facts.topics ?? ALL_TOPICS
  const alerts: StatusAlertItem[] = []

  if (topics.includes("workspace")) {
    if (facts.missingServices.length > 0) {
      alerts.push({
        id: "workspace",
        tone: "problem",
        title: "This workspace is not ready yet",
        body: `Add ${facts.missingServices.join(" and ")} in the Vercel project, then redeploy. Do not install those on your computer.`,
      })
    } else if (facts.signedIn && facts.organizationReady) {
      alerts.push({
        id: "workspace",
        tone: "ok",
        title: "This workspace is working",
        body: "You are signed in and GroovGro can load this organization's data.",
      })
    } else {
      alerts.push({
        id: "workspace",
        tone: "problem",
        title: "No organization is loaded",
        body: "Sign in so GroovGro can open a workspace.",
      })
    }
  }

  if (topics.includes("website") && facts.websiteUrl) {
    if (facts.websiteRead) {
      alerts.push({
        id: "website",
        tone: "ok",
        title: "Website is connected",
        body: "GroovGro has the public address and has read the pages. The live site was not changed.",
      })
    } else {
      alerts.push({
        id: "website",
        tone: "wait",
        title: "Website address is saved",
        body: "GroovGro has the address, but it has not read the pages yet. Open Business and click Review connected data.",
      })
    }
  }

  if (topics.includes("stripe") && facts.stripeConnected) {
    if (facts.paymentCount > 0) {
      alerts.push({
        id: "stripe",
        tone: "ok",
        title: "Stripe is connected",
        body: "Payments are arriving. GroovGro is reading a copy. It does not charge cards.",
      })
    } else {
      alerts.push({
        id: "stripe",
        tone: "wait",
        title: "Stripe is connected",
        body: "The connection is on. No payments have arrived this month yet.",
      })
    }
  }

  if (topics.includes("tracking") && facts.recordedVisitCount > 0) {
    alerts.push({
      id: "tracking",
      tone: "ok",
      title: "Website tracking is working",
      body: "GroovGro has recorded visits or campaign clicks from the connected site.",
    })
  }

  return alerts
}
