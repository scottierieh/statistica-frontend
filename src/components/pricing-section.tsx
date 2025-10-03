
import React from 'react';
import { Check, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FeatureItemProps {
  text: string;
  hasInfo?: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text, hasInfo }) => (
  <li className="flex items-center space-x-2">
    <Check className="h-4 w-4 text-green-500" />
    <span>{text}</span>
    {hasInfo && <Info className="h-3 w-3 text-muted-foreground" />}
  </li>
);

const PricingSection: React.FC = () => {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Essential Plan */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-bold mb-2">Essential</CardTitle>
              <p className="text-green-500 text-3xl font-bold mb-4">Free</p>
              <Button variant="outline" className="w-full">Get Started</Button>
            </CardHeader>
            <CardContent className="flex-1">
              <h3 className="text-green-500 font-semibold mb-3">What's Included</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <FeatureItem text="Form Library" hasInfo />
                <ul className="pl-4 space-y-1 text-xs">
                  <FeatureItem text="Open-Source on GitHub" />
                  <FeatureItem text="APIs and learning materials (code snippets, online documentation)" />
                  <FeatureItem text="Unlimited Forms" />
                  <FeatureItem text="Unlimited Form Submissions" />
                  <FeatureItem text="Unlimited File Uploads" />
                  <FeatureItem text="All Data on Your Own Servers" />
                  <FeatureItem text="No Watermarks/Nag Screens/Referral Badges" />
                  <FeatureItem text="Native Support for React, Angular, Knockout, and Vue3" />
                  <FeatureItem text="Any Server & Database" />
                  <FeatureItem text="Dynamic JSON-Driven Forms" />
                  <FeatureItem text="20+ Accessible Input Types" />
                </ul>
              </ul>
            </CardContent>
          </Card>

          {/* Basic Plan */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-bold mb-2">Basic</CardTitle>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 bg-gray-200 text-xs rounded-full">License</span>
                <span className="px-2 py-0.5 bg-gray-200 text-xs rounded-full">Renewal</span>
              </div>
              <p className="text-green-500 text-3xl font-bold mb-1">$589</p>
              <p className="text-sm text-gray-500 mb-4">once per developer <br />(includes updates and support for the first 12 mo)</p>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white">Buy Now</Button>
            </CardHeader>
            <CardContent className="flex-1">
              <h3 className="text-green-500 font-semibold mb-3">What's Included</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="font-bold">Everything in Essential, plus...</li>
                <FeatureItem text="Survey Creator" hasInfo />
                <ul className="pl-4 space-y-1 text-xs">
                  <FeatureItem text="Open-Source on GitHub" />
                  <FeatureItem text="APIs and learning materials (code snippets, online documentation)" />
                  <FeatureItem text="Fully Integrates in Your App (Self-Hosted)" />
                  <FeatureItem text="Any Web Application (including SaaS)" />
                  <FeatureItem text="White-Labeled" />
                  <FeatureItem text="Opportunity to Implement User Access Control (integrates with any user management system)" />
                  <FeatureItem text="Unlimited Admins" />
                  <FeatureItem text="Unlimited Form Creators" />
                  <FeatureItem text="Unlimited Forms" />
                </ul>
              </ul>
            </CardContent>
          </Card>

          {/* PRO Plan */}
          <Card className="relative flex flex-col border-2 border-green-500 shadow-lg">
            <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-3 py-1 -mt-3 -mr-3 transform rotate-45 translate-x-1/2 -translate-y-1/2">BEST VALUE</div>
            <CardHeader>
              <CardTitle className="text-2xl font-bold mb-2">PRO</CardTitle>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 bg-gray-200 text-xs rounded-full">License</span>
                <span className="px-2 py-0.5 bg-gray-200 text-xs rounded-full">Renewal</span>
              </div>
              <p className="text-green-500 text-3xl font-bold mb-1">$1069</p>
              <p className="text-sm text-gray-500 mb-4">once per developer <br />(includes updates and support for the first 12 mo)</p>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white">Buy Now</Button>
            </CardHeader>
            <CardContent className="flex-1">
              <h3 className="text-green-500 font-semibold mb-3">What's Included</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="font-bold">Everything in Basic, plus...</li>
                <FeatureItem text="Dashboard" hasInfo />
                <ul className="pl-4 space-y-1 text-xs">
                  <FeatureItem text="Open-Source on GitHub" />
                  <FeatureItem text="All Processed Data on Your Own Servers" />
                  <FeatureItem text="Real-time Data Updates" />
                  <FeatureItem text="Export Form Submission Data in Excel, CSV, and PDF" />
                  <FeatureItem text="Interactive Reports" />
                  <FeatureItem text="All popular Chart Types: Bar Chart, Line Chart, Pie Chart, Plotly Gauge Chart" />
                </ul>
                <FeatureItem text="PDF Generator" hasInfo />
                <ul className="pl-4 space-y-1 text-xs">
                  <FeatureItem text="Open-Source on GitHub" />
                  <FeatureItem text="Generate Editable PDF Forms" />
                </ul>
              </ul>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="flex flex-col bg-blue-500 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold mb-2">Enterprise</CardTitle>
              <p className="text-3xl font-bold mb-1">Starts at $2379</p>
              <p className="text-sm mb-4">Tell us about your project and see what SurveyJS can do for you.</p>
              <Button variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Contact Us</Button>
            </CardHeader>
            <CardContent className="flex-1">
              <h3 className="font-semibold mb-3">What's Included</h3>
              <ul className="space-y-2 text-sm">
                <li className="font-bold">Developer licenses, plus...</li>
                <ul className="pl-4 space-y-1 text-xs">
                  <FeatureItem text="Priority Support" hasInfo />
                  <FeatureItem text="Technical Account Manager" hasInfo />
                  <FeatureItem text="Priority Bug Fixes" hasInfo />
                  <FeatureItem text="Best Practices Sessions" hasInfo />
                  <FeatureItem text="Integration Sessions" hasInfo />
                  <FeatureItem text="Code Review Sessions" hasInfo />
                  <FeatureItem text="On-demand releases" hasInfo />
                </ul>
                <li className="font-bold mt-4">Opportunity to request:</li>
                <ul className="pl-4 space-y-1 text-xs">
                  <FeatureItem text="Add-on Feature Development" hasInfo />
                  <FeatureItem text="Prioritized Implementation of High Demand Roadmap Tasks" hasInfo />
                </ul>
                <li className="mt-4 text-xs"><a href="#" className="underline">See All Features</a></li>
              </ul>
            </CardContent>
          </Card>

        </div>
      </div>
    </section>
  );
};

export default PricingSection;
