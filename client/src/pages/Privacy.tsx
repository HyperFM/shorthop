import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Introduction</h2>
          <p>Short Hop is designed to help people move forward using efficient combinations of walking and shared route-based travel.</p>
          <p>User privacy and personal data protection are core principles of the Short Hop platform.</p>
          <p>Short Hop collects only the minimum information required to operate the service. We do not sell personal data, and we do not share user information with advertisers or unrelated third parties.</p>
          <p>Information is used only to operate the platform and provide transportation matching services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-2">Account Information</h3>
              <p>When creating a Short Hop account, users may provide:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>name or display name</li>
                <li>email address</li>
                <li>phone number</li>
                <li>account password</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">Location Information</h3>
              <p>Short Hop uses location data to enable movement matching between walkers and drivers.</p>
              <p>Location information may include current GPS location, route direction, and destination location.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">Daily Route Information (Drivers)</h3>
              <p>Drivers may optionally provide recurring route information such as common travel routes, typical commute times, and preferred travel directions.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">2. Information We Do NOT Collect</h2>
          <p>Short Hop intentionally avoids collecting unnecessary data. We do not collect social media data, personal contact lists, photo libraries, microphone recordings, or unrelated browsing behavior.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">3. Data Sharing Policy</h2>
          <p>Short Hop does not sell user data. Information is not shared with advertising networks, data brokers, or third-party marketing companies.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
          <p>Short Hop takes reasonable steps to protect user data through encrypted connections (HTTPS), secure server infrastructure, limited access controls, and authentication protections.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">5. User Control</h2>
          <p>Users maintain control over their data. Users can update account information, disable route sharing, remove saved routes, or delete their account.</p>
        </section>
      </div>
    </div>
  );
}
