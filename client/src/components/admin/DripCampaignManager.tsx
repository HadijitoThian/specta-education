import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

type ViewMode = "list" | "detail";

const TRIGGER_LABELS: Record<string, string> = {
  aptitude_test: "Aptitude Test (SpecTa Play)",
  contact_form: "Contact Form",
  scholarship_form: "Scholarship Form",
  quiz: "Country Quiz",
  manual: "Manual Enrollment",
  pro_purchase: "Pro Test Purchase",
};

export default function DripCampaignManager() {

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);

  // Form state for new campaign
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    triggerSource: "manual" as string,
  });

  // Form state for new step
  const [newStep, setNewStep] = useState({
    subject: "",
    htmlContent: "",
    delayDays: 3,
    stepOrder: 1,
  });

  // Form state for manual enrollment
  const [enrollForm, setEnrollForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  // Queries
  const campaignsQuery = trpc.dripCampaign.listCampaigns.useQuery();
  const stepsQuery = trpc.dripCampaign.listSteps.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );
  const enrollmentsQuery = trpc.dripCampaign.listEnrollments.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );
  const analyticsQuery = trpc.dripCampaign.getCampaignAnalytics.useQuery(
    { campaignId: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );
  const campaignQuery = trpc.dripCampaign.getCampaign.useQuery(
    { id: selectedCampaignId! },
    { enabled: !!selectedCampaignId }
  );

  // Mutations
  const utils = trpc.useUtils();
  const createCampaignMutation = trpc.dripCampaign.createCampaign.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listCampaigns.invalidate();
      setShowCreateDialog(false);
      setNewCampaign({ name: "", description: "", triggerSource: "manual" });
      toast.success("Campaign created successfully");
    },
  });

  const updateCampaignMutation = trpc.dripCampaign.updateCampaign.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listCampaigns.invalidate();
      utils.dripCampaign.getCampaign.invalidate();
      toast.success("Campaign updated");
    },
  });

  const deleteCampaignMutation = trpc.dripCampaign.deleteCampaign.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listCampaigns.invalidate();
      setViewMode("list");
      setSelectedCampaignId(null);
      toast.success("Campaign deleted");
    },
  });

  const createStepMutation = trpc.dripCampaign.createStep.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listSteps.invalidate();
      utils.dripCampaign.listCampaigns.invalidate();
      setShowStepDialog(false);
      setNewStep({ subject: "", htmlContent: "", delayDays: 3, stepOrder: 1 });
      toast.success("Email step added");
    },
  });

  const updateStepMutation = trpc.dripCampaign.updateStep.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listSteps.invalidate();
      toast.success("Step updated");
    },
  });

  const deleteStepMutation = trpc.dripCampaign.deleteStep.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listSteps.invalidate();
      utils.dripCampaign.listCampaigns.invalidate();
      toast.success("Step deleted");
    },
  });

  const enrollContactMutation = trpc.dripCampaign.enrollContact.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listEnrollments.invalidate();
      utils.dripCampaign.listCampaigns.invalidate();
      setShowEnrollDialog(false);
      setEnrollForm({ contactName: "", contactEmail: "", contactPhone: "" });
      toast.success("Contact enrolled successfully");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateEnrollmentStatusMutation = trpc.dripCampaign.updateEnrollmentStatus.useMutation({
    onSuccess: () => {
      utils.dripCampaign.listEnrollments.invalidate();
      utils.dripCampaign.listCampaigns.invalidate();
      toast.success("Enrollment updated");
    },
  });

  const triggerProcessingMutation = trpc.dripCampaign.triggerProcessing.useMutation({
    onSuccess: (result) => {
      toast.success(`Processing complete: ${result.sent} sent, ${result.errors} errors`);
    },
  });

  const bulkEnrollMutation = trpc.dripCampaign.bulkEnrollAllLeads.useMutation({
    onSuccess: (result) => {
      utils.dripCampaign.listEnrollments.invalidate();
      utils.dripCampaign.listCampaigns.invalidate();
      utils.dripCampaign.getCampaignAnalytics.invalidate();
      toast.success(`Bulk enrollment complete: ${result.enrolled} enrolled, ${result.skipped} already enrolled (${result.total} total leads)`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ==========================================
  // LIST VIEW
  // ==========================================
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
            <p className="text-gray-500 text-sm mt-1">Automated email sequences to nurture leads and drive conversions</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerProcessingMutation.mutate()}
              disabled={triggerProcessingMutation.isPending}
            >
              {triggerProcessingMutation.isPending ? "Processing..." : "⚡ Process Now"}
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">+ New Campaign</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Email Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Campaign Name</Label>
                    <Input
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="e.g., Pro Test Upsell"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newCampaign.description}
                      onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                      placeholder="What this campaign does..."
                    />
                  </div>
                  <div>
                    <Label>Trigger Source</Label>
                    <Select value={newCampaign.triggerSource} onValueChange={(v) => setNewCampaign({ ...newCampaign, triggerSource: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Contacts from this source will be auto-enrolled</p>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={() => createCampaignMutation.mutate({
                      name: newCampaign.name,
                      description: newCampaign.description,
                      triggerSource: newCampaign.triggerSource as any,
                    })}
                    disabled={!newCampaign.name || createCampaignMutation.isPending}
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Campaign Cards */}
        {campaignsQuery.isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
        ) : !campaignsQuery.data?.length ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No campaigns yet</p>
            <p className="text-sm">Create your first email campaign to start nurturing leads automatically</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaignsQuery.data.map((campaign) => (
              <Card
                key={campaign.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedCampaignId(campaign.id);
                  setViewMode("detail");
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <Badge variant={campaign.isActive ? "default" : "secondary"}>
                          {campaign.isActive ? "Active" : "Paused"}
                        </Badge>
                        <Badge variant="outline">{TRIGGER_LABELS[campaign.triggerSource] || campaign.triggerSource}</Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-gray-500 text-sm mb-3">{campaign.description}</p>
                      )}
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Steps:</span>{" "}
                          <span className="font-medium">{campaign.stepCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Enrolled:</span>{" "}
                          <span className="font-medium">{campaign.totalEnrolled}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Active:</span>{" "}
                          <span className="font-medium text-green-600">{campaign.activeEnrolled}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Emails Sent:</span>{" "}
                          <span className="font-medium">{campaign.totalSent}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Open Rate:</span>{" "}
                          <span className="font-medium">{campaign.openRate}%</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View →</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // DETAIL VIEW
  // ==========================================
  const campaign = campaignQuery.data;
  const steps = stepsQuery.data || [];
  const enrollments = enrollmentsQuery.data || [];
  const analytics = analyticsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setViewMode("list"); setSelectedCampaignId(null); }}>
            ← Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{campaign?.name || "Loading..."}</h2>
            <p className="text-gray-500 text-sm">{campaign?.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-500">Active</Label>
                <Switch
                  checked={campaign.isActive}
                  onCheckedChange={(checked) => updateCampaignMutation.mutate({ id: campaign.id, isActive: checked })}
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Delete this campaign and all its data?")) {
                    deleteCampaignMutation.mutate({ id: campaign.id });
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Enrolled", value: analytics.totalEnrolled, color: "text-blue-600" },
            { label: "Active", value: analytics.active, color: "text-green-600" },
            { label: "Completed", value: analytics.completed, color: "text-purple-600" },
            { label: "Unsubscribed", value: analytics.unsubscribed, color: "text-red-600" },
            { label: "Emails Sent", value: analytics.totalSent, color: "text-indigo-600" },
            { label: "Opened", value: analytics.totalOpened, color: "text-teal-600" },
            { label: "Clicked", value: analytics.totalClicked, color: "text-orange-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Email Steps Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Email Sequence</CardTitle>
          <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => setNewStep({
                  subject: "",
                  htmlContent: "",
                  delayDays: 3,
                  stepOrder: steps.length + 1,
                })}
              >
                + Add Step
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Email Step</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Step Order</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newStep.stepOrder}
                      onChange={(e) => setNewStep({ ...newStep, stepOrder: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div>
                    <Label>Delay (days after enrollment)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newStep.delayDays}
                      onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={newStep.subject}
                    onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })}
                    placeholder='e.g., "{{name}}, sudah lihat hasil tes kamu?"'
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {"{{name}}"}, {"{{email}}"} for personalization</p>
                </div>
                <div>
                  <Label>Email HTML Content</Label>
                  <Textarea
                    value={newStep.htmlContent}
                    onChange={(e) => setNewStep({ ...newStep, htmlContent: e.target.value })}
                    placeholder="Full HTML email body..."
                    rows={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {"{{name}}"}, {"{{email}}"}, {"{{unsubscribe_url}}"}. Unsubscribe link is auto-added if using the template.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    if (!selectedCampaignId) return;
                    createStepMutation.mutate({
                      campaignId: selectedCampaignId,
                      ...newStep,
                    });
                  }}
                  disabled={!newStep.subject || !newStep.htmlContent || createStepMutation.isPending}
                >
                  {createStepMutation.isPending ? "Adding..." : "Add Step"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No email steps yet. Add your first email to the sequence.</p>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {step.stepOrder}
                    </div>
                    {index < steps.length - 1 && <div className="w-0.5 h-8 bg-blue-200 mt-1" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{step.subject}</h4>
                      <Badge variant={step.isActive ? "default" : "secondary"} className="text-xs">
                        {step.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Sent {step.delayDays} day{step.delayDays !== 1 ? "s" : ""} after enrollment
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateStepMutation.mutate({ id: step.id, isActive: !step.isActive })}
                    >
                      {step.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm("Delete this email step?")) {
                          deleteStepMutation.mutate({ id: step.id });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollments Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">
            Enrolled Contacts ({enrollments.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (selectedCampaignId && confirm("This will enroll ALL leads from all sources (contact forms, scholarship forms, quizzes, aptitude tests) into this campaign. Already enrolled contacts will be skipped. Continue?")) {
                  bulkEnrollMutation.mutate({ campaignId: selectedCampaignId });
                }
              }}
              disabled={bulkEnrollMutation.isPending}
            >
              {bulkEnrollMutation.isPending ? "Enrolling..." : "📢 Enroll All Leads"}
            </Button>
            <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">+ Enroll Manually</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={enrollForm.contactName}
                    onChange={(e) => setEnrollForm({ ...enrollForm, contactName: e.target.value })}
                    placeholder="Student name"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={enrollForm.contactEmail}
                    onChange={(e) => setEnrollForm({ ...enrollForm, contactEmail: e.target.value })}
                    placeholder="student@email.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={enrollForm.contactPhone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, contactPhone: e.target.value })}
                    placeholder="+62..."
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    if (!selectedCampaignId) return;
                    enrollContactMutation.mutate({
                      campaignId: selectedCampaignId,
                      contactName: enrollForm.contactName,
                      contactEmail: enrollForm.contactEmail,
                      contactPhone: enrollForm.contactPhone || undefined,
                    });
                  }}
                  disabled={!enrollForm.contactName || !enrollForm.contactEmail || enrollContactMutation.isPending}
                >
                  {enrollContactMutation.isPending ? "Enrolling..." : "Enroll"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No contacts enrolled yet. Contacts will be auto-enrolled when they submit forms matching the trigger source.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-gray-500">Name</th>
                    <th className="pb-2 font-medium text-gray-500">Email</th>
                    <th className="pb-2 font-medium text-gray-500">Step</th>
                    <th className="pb-2 font-medium text-gray-500">Status</th>
                    <th className="pb-2 font-medium text-gray-500">Next Email</th>
                    <th className="pb-2 font-medium text-gray-500">Enrolled</th>
                    <th className="pb-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{enrollment.contactName}</td>
                      <td className="py-2 text-gray-600">{enrollment.contactEmail}</td>
                      <td className="py-2">
                        <Badge variant="outline">{enrollment.currentStepOrder}/{steps.length}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={
                          enrollment.status === "active" ? "default" :
                          enrollment.status === "completed" ? "secondary" :
                          enrollment.status === "unsubscribed" ? "destructive" : "outline"
                        }>
                          {enrollment.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-gray-600 text-xs">
                        {enrollment.nextSendAt
                          ? new Date(enrollment.nextSendAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="py-2 text-gray-600 text-xs">
                        {new Date(enrollment.enrolledAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2">
                        {enrollment.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => updateEnrollmentStatusMutation.mutate({ id: enrollment.id, status: "paused" })}
                          >
                            Pause
                          </Button>
                        )}
                        {enrollment.status === "paused" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => updateEnrollmentStatusMutation.mutate({ id: enrollment.id, status: "active" })}
                          >
                            Resume
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
