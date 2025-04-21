import { useState } from 'react';
import Layout from '@/components/layout/layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, HelpCircle, FileText, LifeBuoy, Mail, MessageCircle, Phone, Video } from 'lucide-react';

export default function HelpSupportPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Support ticket submitted",
      description: "We've received your ticket and will respond shortly.",
    });
    // Reset form
    (e.target as HTMLFormElement).reset();
  };

  const faqs = [
    {
      question: "How do I create a new incident ticket?",
      answer: "Navigate to the Incidents page from the sidebar menu, then click on the 'Create Incident' button in the top right. Fill out the required information including title, description, and severity, then click 'Submit'."
    },
    {
      question: "How do I assign a service request to another team member?",
      answer: "Open the service request you want to assign, click on the 'Edit' button, and select a team member from the 'Assigned To' dropdown menu. Save your changes to update the assignment."
    },
    {
      question: "What is the difference between an incident and a service request?",
      answer: "An incident represents an unplanned interruption or reduction in quality of an IT service, while a service request is a formal request from a user for something to be provided, such as a new laptop or software installation."
    },
    {
      question: "How do I track SLAs for my incidents?",
      answer: "SLA tracking is automatically enabled for all incidents. You can view the SLA status on the incident details page, including time remaining before breach and current SLA compliance percentage."
    },
    {
      question: "How do I set up monitoring for my system?",
      answer: "Go to the Monitoring page and click on 'Monitoring Setup Wizard' to configure Prometheus for your environment. Follow the step-by-step guide to establish connections to your systems and set alert thresholds."
    },
    {
      question: "How do I create a change request?",
      answer: "Navigate to the Change Requests page from the sidebar menu and click on 'Create Change Request'. Fill out the required information including title, description, and change type, then submit for approval."
    },
    {
      question: "How do I generate reports on my IT service performance?",
      answer: "Go to the Reports page, select the time period and metrics you're interested in, then click 'Generate Report'. You can export reports as PDF or CSV files for further analysis."
    }
  ];

  const filteredFaqs = searchQuery 
    ? faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground mt-2">
            Get help with using BuopsoIT and find answers to common questions
          </p>
        </div>
      </div>

      <Tabs defaultValue="faqs" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faqs">
            <HelpCircle className="mr-2 h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="documentation">
            <FileText className="mr-2 h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="contact">
            <LifeBuoy className="mr-2 h-4 w-4" />
            Contact Support
          </TabsTrigger>
        </TabsList>

        {/* FAQs Section */}
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find quick answers to common questions about BuopsoIT
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search FAQs..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No results found. Try a different search term.
                  </p>
                )}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Section */}
        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>
                Comprehensive guides and reference material for BuopsoIT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Getting Started Guide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Learn the basics of setting up and using BuopsoIT
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Administrator Guide</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      System configuration and tenant management
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Incident Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Best practices for managing and resolving incidents
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Service Request Workflows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      End-to-end guide for handling service requests
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Change Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Managing changes from request to implementation
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Monitoring & Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Setting up and configuring monitoring systems
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Support Section */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Get in touch with our support team for assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Mail className="mr-2 h-5 w-5 text-primary" />
                      Email Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Send us an email and we'll respond within 24 hours
                    </p>
                    <a href="mailto:support@buopsoit.com" className="text-primary hover:underline">
                      support@buopsoit.com
                    </a>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <Phone className="mr-2 h-5 w-5 text-primary" />
                      Phone Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Call us for urgent matters during business hours
                    </p>
                    <a href="tel:+18005551234" className="text-primary hover:underline">
                      +1 (800) 555-1234
                    </a>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                      <MessageCircle className="mr-2 h-5 w-5 text-primary" />
                      Live Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Chat with our support team in real-time
                    </p>
                    <Button variant="outline" className="w-full">
                      Start Chat
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Submit a Support Ticket</CardTitle>
                  <CardDescription>
                    Fill out the form below to create a new support ticket
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitTicket} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Name</label>
                        <Input id="name" name="name" required />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <Input id="email" name="email" type="email" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                      <Input id="subject" name="subject" required />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">Message</label>
                      <Textarea id="message" name="message" rows={5} required />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Button type="submit" className="w-full md:w-auto">Submit Ticket</Button>
                      <Button type="button" variant="outline" className="w-full md:w-auto">
                        <Video className="mr-2 h-4 w-4" />
                        Schedule Video Call
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}