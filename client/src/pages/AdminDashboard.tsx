import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, FileText, MessageSquare, Phone, Mail, Globe, 
  Calendar, Clock, ChevronRight, ExternalLink, Loader2,
  LogOut, Home
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { getLoginUrl } from "@/const";

type TabType = "leads" | "conversations" | "documents";

export default function AdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("leads");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const { data: leadsData, isLoading: leadsLoading } = trpc.admin.getLeads.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  const { data: conversationsData, isLoading: conversationsLoading } = trpc.admin.getConversations.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  const { data: documentsData, isLoading: documentsLoading } = trpc.admin.getDocuments.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin'
  });

  const { data: conversationMessages } = trpc.admin.getConversationMessages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId && isAuthenticated && user?.role === 'admin' }
  );

  const updateLeadMutation = trpc.admin.updateLead.useMutation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">Please log in to access the admin dashboard.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-primary hover:bg-primary/90">
              Log In
            </Button>
          </a>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <img src="/logo.jpeg" alt="SpecTa Education" className="h-10 object-contain" />
            </Link>
            <span className="text-sm font-medium text-muted-foreground">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.name || 'Admin'}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{leadsData?.leads?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Total Leads</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{conversationsData?.conversations?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Conversations</div>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{documentsData?.documents?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Documents</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === 'leads' ? 'default' : 'outline'}
            onClick={() => setActiveTab('leads')}
          >
            <Users className="w-4 h-4 mr-2" />
            Leads
          </Button>
          <Button 
            variant={activeTab === 'conversations' ? 'default' : 'outline'}
            onClick={() => setActiveTab('conversations')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Conversations
          </Button>
          <Button 
            variant={activeTab === 'documents' ? 'default' : 'outline'}
            onClick={() => setActiveTab('documents')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </Button>
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {activeTab === 'leads' && (
            <div>
              {leadsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : leadsData?.leads?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No leads yet. Leads will appear here when students provide their contact information.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {leadsData?.leads?.map((lead) => (
                    <div key={lead.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{lead.studentName}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {lead.studentPhone && (
                              <a href={`tel:${lead.studentPhone}`} className="flex items-center gap-1 hover:text-foreground">
                                <Phone className="w-4 h-4" />
                                {lead.studentPhone}
                              </a>
                            )}
                            {lead.studentEmail && (
                              <a href={`mailto:${lead.studentEmail}`} className="flex items-center gap-1 hover:text-foreground">
                                <Mail className="w-4 h-4" />
                                {lead.studentEmail}
                              </a>
                            )}
                            {lead.preferredCountry && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-4 h-4" />
                                {lead.preferredCountry}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(lead.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={`https://wa.me/${lead.studentPhone?.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline">
                              <Phone className="w-4 h-4 mr-1" />
                              WhatsApp
                            </Button>
                          </a>
                          <select
                            value={lead.status}
                            onChange={(e) => {
                              updateLeadMutation.mutate({
                                id: lead.id,
                                status: e.target.value as any
                              });
                            }}
                            className="px-3 py-1 text-sm border border-border rounded-md bg-background"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversations' && (
            <div className="grid md:grid-cols-2 divide-x divide-border">
              {/* Conversations List */}
              <div>
                {conversationsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : conversationsData?.conversations?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No conversations yet.
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="divide-y divide-border">
                      {conversationsData?.conversations?.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversationId(conv.id)}
                          className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                            selectedConversationId === conv.id ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {conv.studentName || 'Anonymous'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {conv.preferredCountry || 'No country selected'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(conv.createdAt)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Messages */}
              <div>
                {selectedConversationId ? (
                  <ScrollArea className="h-[500px] p-4">
                    <div className="space-y-4">
                      {conversationMessages?.messages?.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDate(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                    Select a conversation to view messages
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              {documentsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : documentsData?.documents?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No documents uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {documentsData?.documents?.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{doc.fileName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-muted rounded text-xs">{doc.documentType}</span>
                            <span>{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
