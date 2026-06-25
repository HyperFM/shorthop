import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const DEFAULT_POLICY = `ShortHop Privacy Policy & Terms of Service

Last Updated: March 2026

Introduction

ShortHop ("the Platform," "we," "our," or "us") is a cooperative micro-ride-matching platform operating in Lexington, Kentucky. ShortHop connects riders ("Hoppers") with independent drivers ("Drivers") who share portions of their existing commute routes.

By creating an account, accessing, or using ShortHop, you ("User," "you," or "your") agree to these Terms of Service, this Privacy Policy, and all applicable laws. If you do not agree, do not use the Platform.

⸻

1. Nature of the Service

ShortHop is a technology platform that facilitates ride-matching between independent users. ShortHop:
• Does not provide transportation services.
• Does not employ, contract, or supervise Drivers.
• Does not guarantee the availability, reliability, safety, or quality of any ride.

All transportation arrangements occur directly between Users. ShortHop is a community-based ride-matching service, not a commercial transportation company, taxi service, or TNC.

⸻

2. User Accounts & Eligibility

To use ShortHop, you must:
• Be at least 18 years old
• Provide accurate information during registration
• Maintain the security of your account credentials
• Not impersonate others or create multiple accounts
• Not use the Platform for unlawful purposes

ShortHop may suspend, disable, or delete accounts at its discretion.

⸻

3. Driver Requirements & Verification

Users who wish to offer rides must:
• Provide vehicle details (make, model, color, license plate)
• Upload a valid driver's license photo
• Upload a selfie for identity verification
• Accept the Driver Agreement

Important:
• ShortHop does not conduct background checks, insurance verification, or vehicle inspections.
• Drivers are solely responsible for complying with all laws, holding a valid license, maintaining insurance, and ensuring vehicle safety.
• ShortHop's approval process does not certify safety, legality, or fitness to drive.

⸻

4. Assumption of Risk

BY USING THE PLATFORM, YOU ACKNOWLEDGE THAT SHARED RIDES INVOLVE RISKS, INCLUDING BUT NOT LIMITED TO:
• Traffic accidents, injuries, or fatalities
• Unsafe or reckless drivers
• Vehicle mechanical failures
• Theft, assault, or harassment
• Exposure to communicable diseases
• Property damage or loss

YOU ASSUME ALL RISKS. ShortHop and its affiliates are not liable for injuries, damages, losses, or claims from ride participation.

⸻

5. Limitation of Liability

To the maximum extent permitted by law:
• ShortHop is not liable for any damages from Platform use or ride participation.
• ShortHop is not liable for actions of Drivers or Hoppers.
• Total liability is limited to the amount paid to ShortHop in the prior 12 months.

⸻

6. Indemnification

You agree to defend, indemnify, and hold harmless ShortHop and its affiliates from claims, damages, losses, or expenses arising from:
• Your use of the Platform
• Violation of these Terms
• Any ride you participate in
• Disputes with other Users

⸻

7. Insurance & Financial Responsibility
• ShortHop does not provide insurance.
• Drivers are responsible for insurance and compliance.
• Hoppers are responsible for assessing vehicle safety and maintaining personal insurance.

⸻

8. Information We Collect

Account Information: username, password, role selection (Driver or Hopper)
Driver Verification Info: vehicle details, driver's license, selfie
Location Information: GPS coordinates, route direction, destination
Usage Information: ride history, community posts, ratings, notifications

⸻

9. Information We Do NOT Collect

ShortHop does not collect:
• Social media data
• Contact lists
• Photo libraries (beyond verification photos)
• Microphone or camera recordings
• Banking info, Social Security numbers, unrelated browsing

⸻

10. Data Sharing & Third Parties

ShortHop does not sell user data.
We may share limited information:
• Between matched Users to facilitate rides
• For legal requirements or law enforcement if necessary
• For safety concerns in imminent harm situations

⸻

11. Data Security

We use encryption, secure servers, and access controls. No system is 100% secure; absolute security cannot be guaranteed.

⸻

12. User Conduct & Community Standards

Users must:
• Treat others respectfully
• Avoid harassment, discrimination, or illegal activity
• Not impersonate or misrepresent
• Report safety concerns via the app

ShortHop may suspend or ban violators.

⸻

13. Reporting & Safety

Users can report issues via the in-app system. For emergencies, call 911. ShortHop is not an emergency response service.

⸻

14. Intellectual Property

ShortHop's name, logo, platform design, and content are exclusive property. Users may not copy or distribute without permission.

⸻

15. Dispute Resolution
• Disputes between Users must be resolved directly.
• Legal disputes with ShortHop are governed by Kentucky law, filed in Fayette County courts.

⸻

16. Disclaimer of Warranties

The Platform is provided "as is." ShortHop disclaims warranties, including uninterrupted service, accuracy, reliability, and security.

⸻

17. Modification of Terms

ShortHop may update Terms and Privacy Policy at any time. Continued use constitutes acceptance.

⸻

18. Termination

Accounts may be terminated or suspended at any time, with or without notice.

⸻

19. Contact

For questions or reporting concerns, use the in-app contact or reporting system.

⸻

20. Verified Badge & Trust System

ShortHop offers an optional verification program to help build trust and safety within the community. Users may choose to complete ID verification to receive a "Verified" badge displayed on their profile.

Verification includes:
• Uploading a valid government-issued ID
• Uploading a selfie for identity confirmation

Key Points:
• Verification is optional; users can participate in ShortHop without it.
• The "Verified" badge does not guarantee safety, driving skill, or insurance coverage. It simply confirms that the person's identity has been reviewed by ShortHop.
• ShortHop does not conduct background checks, insurance verification, or vehicle inspections as part of verification.
• Users should continue to exercise personal judgment and caution when interacting with other Users, even if they are verified.

Benefits of Verification:
• Provides other Users with confidence that your profile represents a real person
• May improve trust for ride-matching and community interactions
• Supports a safer, more accountable ShortHop community


By using ShortHop, you agree to these Terms & Privacy Policy.

ShortHop is a product of Hyper LLC. All rights reserved.`;

function renderPolicyContent(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    if (line === "⸻") {
      elements.push(<hr key={i} className="border-border/40 my-4" />);
      continue;
    }

    if (line === "ShortHop Privacy Policy & Terms of Service") {
      continue;
    }

    if (line.startsWith("Last Updated:")) {
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-foreground">{line}</h2>
      );
      continue;
    }

    if (line === "Introduction" || line === "Important:" || line === "Key Points:" || line === "Benefits of Verification:" || line === "Verification includes:") {
      elements.push(
        <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-foreground">{line}</h3>
      );
      continue;
    }

    if (line.startsWith("•")) {
      elements.push(
        <li key={i} className="ml-6 text-foreground/80 dark:text-foreground/70 text-sm leading-relaxed list-disc">{line.substring(1).trim()}</li>
      );
      continue;
    }

    if (line.startsWith("BY USING") || line.startsWith("YOU ASSUME") || line.startsWith("YOU VOLUNTARILY")) {
      elements.push(
        <p key={i} className="text-sm font-bold text-foreground uppercase leading-relaxed">{line}</p>
      );
      continue;
    }

    elements.push(
      <p key={i} className="text-sm text-foreground/80 dark:text-foreground/70 leading-relaxed">{line}</p>
    );
  }

  return elements;
}

export default function Privacy() {
  const [, navigate] = useLocation();

  const { data: policyData } = useQuery<{ content: string; updatedAt: string }>({
    queryKey: ["/api/policy"],
  });

  const content = policyData?.content || DEFAULT_POLICY;
  const lastUpdated = policyData?.updatedAt
    ? new Date(policyData.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "March 2026";

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="page-privacy">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-back-from-privacy"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground" data-testid="text-privacy-title">Privacy Policy & Terms of Service</h1>
            <p className="text-xs text-foreground/50 dark:text-foreground/60" data-testid="text-privacy-updated">Last Updated: {lastUpdated}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-1">
          {renderPolicyContent(content)}
        </div>
      </div>
    </div>
  );
}
