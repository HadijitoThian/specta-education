import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Image, Wand2, Send, Clock, CheckCircle2, XCircle,
  Instagram, Facebook, Video, Sparkles, Calendar, RefreshCw,
  Trash2, Eye, Download, ChevronDown, ChevronUp, Settings,
  PlusCircle, FileImage, Zap, BarChart3, Globe, MessageSquare, Bot, User2, CornerDownLeft
} from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  tiktok: <Video className="w-4 h-4" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  facebook: "bg-blue-600",
  tiktok: "bg-black",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const TONES = ["professional", "casual", "inspirational", "urgent", "friendly", "educational"];
const CONTENT_TYPES = [
  { value: "scholarship_alert", label: "Scholarship Alert" },
  { value: "student_success", label: "Student Success Story" },
  { value: "university_spotlight", label: "University Spotlight" },
  { value: "tips_advice", label: "Study Abroad Tips" },
  { value: "event_promo", label: "Event Promotion" },
  { value: "general_promo", label: "General Promotion" },
];

export default function SocialMediaManager() {
  const [activeTab, setActiveTab] = useState<"create" | "scheduled" | "history" | "accounts" | "chat">("create");

  // Create post state
  const [brief, setBrief] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Array<"instagram" | "facebook" | "tiktok">>(["instagram", "facebook"]);
  const [tone, setTone] = useState("professional");
  const [contentType, setContentType] = useState<"image" | "reel" | "text">("image");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: postsData, refetch: refetchPosts } = trpc.socialMedia.getPosts.useQuery();
  const { data: accountsData, refetch: refetchAccounts } = trpc.socialMedia.getAccounts.useQuery();

  // Chat mutation
  const chatMutation = trpc.socialMedia.chat.useMutation({
    onError: (e) => {
      toast.error("Chat error: " + e.message);
      setChatLoading(false);
    },
  });

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Mutations
  const generateCaptionMutation = trpc.socialMedia.generateCaption.useMutation({
    onSuccess: (data) => {
      setGeneratedCaption(data.caption);
      setGeneratedHashtags(data.hashtags);
      toast.success("Caption generated!");
    },
    onError: (e) => toast.error("Failed to generate caption: " + e.message),
  });

  const generateImageMutation = trpc.socialMedia.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImageUrl(data.url || "");
      toast.success("Image generated!");
    },
    onError: (e) => toast.error("Failed to generate image: " + e.message),
  });

  const createPostMutation = trpc.socialMedia.createPost.useMutation({
    onSuccess: (_data) => {
      toast.success(publishNow ? "Post published!" : "Post scheduled!");
      refetchPosts();
      // Reset form
      setBrief("");
      setGeneratedCaption("");
      setGeneratedHashtags("");
      setGeneratedImageUrl("");
      setScheduledAt("");
    },
    onError: (e) => toast.error("Failed to create post: " + e.message),
  });

  const deletePostMutation = trpc.socialMedia.deletePost.useMutation({
    onSuccess: () => { toast.success("Post deleted"); refetchPosts(); },
  });

  // connectAccount placeholder - will be enabled once Meta credentials are provided

  const handleGenerateCaption = () => {
    if (!brief.trim()) { toast.error("Please enter a brief first"); return; }
    setGeneratingCaption(true);
    generateCaptionMutation.mutate(
      { brief, platform: (selectedPlatforms[0] || "instagram") as "instagram" | "facebook" | "tiktok", tone },
      { onSettled: () => setGeneratingCaption(false) }
    );
  };

  const handleGenerateImage = () => {
    if (!brief.trim()) { toast.error("Please enter a brief first"); return; }
    setGeneratingImage(true);
    generateImageMutation.mutate(
      { brief },
      { onSettled: () => setGeneratingImage(false) }
    );
  };

  const handleCreatePost = () => {
    if (!generatedCaption && !generatedImageUrl) {
      toast.error("Please generate a caption or image first");
      return;
    }
    if (!publishNow && !scheduledAt) {
      toast.error("Please set a schedule time or choose to publish now");
      return;
    }
    setPosting(true);
    createPostMutation.mutate(
      {
        brief,
        caption: generatedCaption,
        hashtags: generatedHashtags,
        imageUrl: generatedImageUrl || undefined,
        platforms: selectedPlatforms,
        contentType: "image" as const,
        publishNow,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      },
      { onSettled: () => setPosting(false) }
    );
  };

  const togglePlatform = (p: "instagram" | "facebook" | "tiktok") => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const posts = postsData || [];
  const accounts = accountsData || [];
  const scheduledPosts = posts.filter(p => p.status === "scheduled");
  const publishedPosts = posts.filter(p => p.status === "published");
  const draftPosts = posts.filter(p => p.status === "draft" || p.status === "failed");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-red-500" />
              Social Media Manager
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">AI-powered content creation & scheduling for SpecTa Education</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-gray-900">{scheduledPosts.length}</div>
                <div className="text-gray-500">Scheduled</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{publishedPosts.length}</div>
                <div className="text-gray-500">Published</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900">{accounts.filter(a => a.isActive).length}</div>
                <div className="text-gray-500">Connected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: "create", label: "Create Post", icon: <PlusCircle className="w-4 h-4" /> },
            { id: "scheduled", label: `Scheduled (${scheduledPosts.length})`, icon: <Clock className="w-4 h-4" /> },
            { id: "history", label: "History", icon: <BarChart3 className="w-4 h-4" /> },
            { id: "accounts", label: "Accounts", icon: <Settings className="w-4 h-4" /> },
            { id: "chat", label: "AI Strategy Chat", icon: <MessageSquare className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-red-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* CREATE POST TAB */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Content Generator */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-red-500" />
                    AI Content Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Brief */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Post Brief</label>
                    <Textarea
                      placeholder="e.g. Promote our Australia scholarship program for 2025 intake. Highlight LPDP and AAS scholarships. Target Indonesian students aged 18-25."
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Content Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONTENT_TYPES.map(ct => (
                        <button
                          key={ct.value}
                          onClick={() => setContentType(ct.value as "image" | "reel" | "text")}
                          className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                            contentType === ct.value
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 hover:border-gray-300 text-gray-600"
                          }`}
                        >
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map(t => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                            tone === t
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 hover:border-gray-300 text-gray-600"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Platform Selector */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Platforms</label>
                    <div className="flex gap-2">
                      {(["instagram", "facebook", "tiktok"] as Array<"instagram" | "facebook" | "tiktok">).map(p => (
                        <button
                          key={p}
                          onClick={() => togglePlatform(p)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                            selectedPlatforms.includes(p)
                              ? `${PLATFORM_COLORS[p]} text-white shadow-sm`
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {PLATFORM_ICONS[p]}
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleGenerateCaption}
                      disabled={generatingCaption || !brief.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {generatingCaption ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      Generate Caption
                    </Button>
                    <Button
                      onClick={handleGenerateImage}
                      disabled={generatingImage || !brief.trim()}
                      variant="outline"
                      className="flex-1"
                    >
                      {generatingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Image className="w-4 h-4 mr-2" />}
                      Generate Image
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Caption */}
              {generatedCaption && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Generated Caption
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={generatedCaption}
                      onChange={e => setGeneratedCaption(e.target.value)}
                      rows={5}
                      className="bg-white text-sm resize-none"
                    />
                    {generatedHashtags && (
                      <div className="mt-2">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Hashtags</label>
                        <Input
                          value={generatedHashtags}
                          onChange={e => setGeneratedHashtags(e.target.value)}
                          className="bg-white text-xs text-blue-600"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Preview & Publish */}
            <div className="space-y-4">
              {/* Image Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-red-500" />
                    Post Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedImageUrl ? (
                    <div className="relative">
                      <img
                        src={generatedImageUrl}
                        alt="Generated post"
                        className="w-full rounded-lg object-cover max-h-80"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <a
                          href={generatedImageUrl}
                          download="specta-post.jpg"
                          target="_blank"
                          rel="noreferrer"
                          className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow text-gray-700"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setGeneratedImageUrl("")}
                          className="bg-white/90 hover:bg-white p-1.5 rounded-lg shadow text-red-500"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex flex-col items-center justify-center text-gray-400">
                      <Image className="w-10 h-10 mb-2 opacity-40" />
                      <p className="text-sm">No image yet</p>
                      <p className="text-xs mt-1">Click "Generate Image" to create one</p>
                    </div>
                  )}

                  {/* Caption preview */}
                  {generatedCaption && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{generatedCaption}</p>
                      {generatedHashtags && (
                        <p className="text-xs text-blue-500 mt-1 line-clamp-2">{generatedHashtags}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Publish Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="w-4 h-4 text-red-500" />
                    Publish Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Publish Now vs Schedule */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPublishNow(true)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        publishNow ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Zap className="w-4 h-4 inline mr-1" />
                      Publish Now
                    </button>
                    <button
                      onClick={() => setPublishNow(false)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        !publishNow ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Schedule
                    </button>
                  </div>

                  {!publishNow && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Schedule Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={e => setScheduledAt(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}

                  {/* Platform status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">Posting to</label>
                    {selectedPlatforms.map(p => {
                      const account = accounts.find(a => a.platform === p && a.isActive);
                      return (
                        <div key={p} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 capitalize text-sm">
                            {PLATFORM_ICONS[p]}
                            {p}
                          </div>
                          {account ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">Connected</Badge>
                          ) : p === "tiktok" ? (
                            <Badge className="bg-yellow-100 text-yellow-700 text-xs">Download only</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">Not connected</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={handleCreatePost}
                    disabled={posting || (!generatedCaption && !generatedImageUrl)}
                    className="w-full bg-red-600 hover:bg-red-700"
                    size="lg"
                  >
                    {posting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
                    ) : publishNow ? (
                      <><Send className="w-4 h-4 mr-2" />Publish Now</>
                    ) : (
                      <><Calendar className="w-4 h-4 mr-2" />Schedule Post</>
                    )}
                  </Button>

                  {selectedPlatforms.includes("tiktok") && (
                    <p className="text-xs text-gray-500 text-center">
                      TikTok: content will be prepared for manual upload
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* SCHEDULED TAB */}
        {activeTab === "scheduled" && (
          <div className="space-y-4">
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No scheduled posts</p>
                <p className="text-sm mt-1">Create a post and schedule it for later</p>
                <Button className="mt-4 bg-red-600 hover:bg-red-700" onClick={() => setActiveTab("create")}>
                  <PlusCircle className="w-4 h-4 mr-2" />Create Post
                </Button>
              </div>
            ) : (
              scheduledPosts.map(post => <PostCard key={post.id} post={post} onDelete={() => deletePostMutation.mutate({ id: post.id })} expanded={expandedPost === post.id} onToggle={() => setExpandedPost(expandedPost === post.id ? null : post.id)} />)
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No posts yet</p>
              </div>
            ) : (
              posts.map(post => <PostCard key={post.id} post={post} onDelete={() => deletePostMutation.mutate({ id: post.id })} expanded={expandedPost === post.id} onToggle={() => setExpandedPost(expandedPost === post.id ? null : post.id)} />)
            )}
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === "accounts" && (
          <div className="max-w-2xl space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected Social Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["facebook", "instagram", "tiktok"].map(platform => {
                  const account = accounts.find(a => a.platform === platform);
                  return (
                    <div key={platform} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${PLATFORM_COLORS[platform]} flex items-center justify-center text-white`}>
                          {PLATFORM_ICONS[platform]}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{platform}</p>
                          <p className="text-xs text-gray-500">
                            {account ? `Connected as ${account.accountName}` : platform === "tiktok" ? "Manual upload only" : "Not connected — add credentials below"}
                          </p>
                        </div>
                      </div>
                      {account ? (
                        <Badge className="bg-green-100 text-green-700">Connected</Badge>
                      ) : platform === "tiktok" ? (
                        <Badge className="bg-gray-100 text-gray-600">Manual</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Connect Facebook & Instagram</p>
                    <p className="text-sm text-blue-700 mt-1">
                      To enable direct posting, you need to provide your Meta App credentials.
                      Once you have your <strong>Meta App ID</strong>, <strong>App Secret</strong>, and <strong>Page Access Token</strong>,
                      share them with your developer and they will be added securely as environment variables.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Get credentials at: <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">developers.facebook.com</a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI STRATEGY CHAT TAB */}
        {activeTab === "chat" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: "500px" }}>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700 rounded-t-2xl">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">SpecTa Social AI</p>
                  <p className="text-xs text-red-100">Your social media strategist — captions, hashtags, content ideas &amp; more</p>
                </div>
                {chatMessages.length > 0 && (
                  <button
                    onClick={() => setChatMessages([])}
                    className="ml-auto text-xs text-red-200 hover:text-white transition-colors"
                  >
                    Clear chat
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-base">Halo! Saya SpecTa Social AI 👋</p>
                      <p className="text-sm text-gray-500 mt-1 max-w-sm">Saya siap bantu kamu bikin konten sosmed yang engaging. Tanya apa saja!</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-2">
                      {[
                        "Buatkan caption Instagram untuk promo beasiswa Australia 🇦🇺",
                        "Apa hashtag terbaik untuk konten study abroad di Indonesia?",
                        "Ide konten Reels untuk minggu ini dong",
                        "Bantu saya buat content calendar untuk bulan ini",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setChatInput(suggestion)}
                          className="text-left text-xs px-3 py-2.5 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user" ? "bg-red-100" : "bg-gray-100"
                    }`}>
                      {msg.role === "user"
                        ? <User2 className="w-4 h-4 text-red-600" />
                        : <Bot className="w-4 h-4 text-gray-600" />}
                    </div>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-red-600 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1 items-center h-5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (chatInput.trim() && !chatLoading) {
                          const userMsg = chatInput.trim();
                          const newMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
                          setChatMessages(newMessages);
                          setChatInput("");
                          setChatLoading(true);
                          chatMutation.mutate(
                            { messages: newMessages },
                            {
                              onSuccess: (data) => {
                                setChatMessages(prev => [...prev, { role: "assistant" as const, content: data.reply }]);
                                setChatLoading(false);
                              },
                              onSettled: () => setChatLoading(false),
                            }
                          );
                        }
                      }
                    }}
                    placeholder="Tanya apa saja tentang konten sosmed... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                    className="flex-1 resize-none text-sm min-h-[44px] max-h-[120px]"
                    rows={1}
                  />
                  <Button
                    onClick={() => {
                      if (chatInput.trim() && !chatLoading) {
                        const userMsg = chatInput.trim();
                        const newMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
                        setChatMessages(newMessages);
                        setChatInput("");
                        setChatLoading(true);
                        chatMutation.mutate(
                          { messages: newMessages },
                          {
                            onSuccess: (data) => {
                              setChatMessages(prev => [...prev, { role: "assistant" as const, content: data.reply }]);
                              setChatLoading(false);
                            },
                            onSettled: () => setChatLoading(false),
                          }
                        );
                      }
                    }}
                    disabled={!chatInput.trim() || chatLoading}
                    className="bg-red-600 hover:bg-red-700 text-white h-11 px-4 flex-shrink-0"
                  >
                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 ml-1">Shift+Enter untuk baris baru · Enter untuk kirim</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, onDelete, expanded, onToggle }: {
  post: any;
  onDelete: () => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const platforms: string[] = (() => {
    try { return JSON.parse(post.platforms || "[]"); } catch { return []; }
  })();

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={STATUS_COLORS[post.status] || "bg-gray-100 text-gray-700"}>
                {post.status}
              </Badge>
              {platforms.map((p: string) => (
                <span key={p} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white ${PLATFORM_COLORS[p] || "bg-gray-500"}`}>
                  {PLATFORM_ICONS[p]}
                  {p}
                </span>
              ))}
              {post.scheduledAt && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(post.scheduledAt).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{post.caption || post.brief}</p>
          </div>
          {post.imageUrl && (
            <img src={post.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={onToggle} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Less" : "More"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {post.caption && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Caption</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.caption}</p>
              </div>
            )}
            {post.hashtags && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Hashtags</p>
                <p className="text-xs text-blue-600">{post.hashtags}</p>
              </div>
            )}
            {post.imageUrl && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Image</p>
                <img src={post.imageUrl} alt="" className="rounded-lg max-h-48 object-cover" />
              </div>
            )}
            {post.errorMessage && (
              <div className="p-2 bg-red-50 rounded text-xs text-red-600">
                Error: {post.errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
