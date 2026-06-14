import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Edit, Trash2, Eye, FileText, Sparkles, RefreshCw,
  ArrowLeft, Globe, Tag, FolderOpen, Send, Save, Loader2
} from "lucide-react";

type ViewMode = "list" | "editor";

export default function BlogManager() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<"draft" | "published" | "archived" | undefined>();
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showProducerDialog, setShowProducerDialog] = useState(false);
  const [prodTopic, setProdTopic] = useState("");
  const [prodKeyword, setProdKeyword] = useState("");

  // Editor state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Category/Tag form state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagSlug, setNewTagSlug] = useState("");

  // AI state
  const [aiTopic, setAiTopic] = useState("");
  const [aiKeyword, setAiKeyword] = useState("");
  const [aiTone, setAiTone] = useState("professional and informative");
  const [aiLanguage, setAiLanguage] = useState("bilingual (Indonesian primary, English secondary)");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [showRefineInput, setShowRefineInput] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: postsData, isLoading } = trpc.blog.listPosts.useQuery({
    status: statusFilter,
    limit: 50,
  });
  const { data: categories } = trpc.blog.listCategories.useQuery();
  const { data: tags } = trpc.blog.listTags.useQuery();

  // Mutations
  const createPost = trpc.blog.createPost.useMutation({
    onSuccess: () => {
      toast.success("Article created!");
      utils.blog.listPosts.invalidate();
      resetEditor();
      setViewMode("list");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePost = trpc.blog.updatePost.useMutation({
    onSuccess: () => {
      toast.success("Article updated!");
      utils.blog.listPosts.invalidate();
      resetEditor();
      setViewMode("list");
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePost = trpc.blog.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Article deleted!");
      utils.blog.listPosts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createCategory = trpc.blog.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created!");
      utils.blog.listCategories.invalidate();
      setShowCategoryDialog(false);
      setNewCategoryName("");
      setNewCategorySlug("");
      setNewCategoryDesc("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCategory = trpc.blog.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted!");
      utils.blog.listCategories.invalidate();
    },
  });

  const createTag = trpc.blog.createTag.useMutation({
    onSuccess: () => {
      toast.success("Tag created!");
      utils.blog.listTags.invalidate();
      setShowTagDialog(false);
      setNewTagName("");
      setNewTagSlug("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTag = trpc.blog.deleteTag.useMutation({
    onSuccess: () => {
      toast.success("Tag deleted!");
      utils.blog.listTags.invalidate();
    },
  });

  // GEO Producer: generates + saves a review-ready draft in one step.
  const { data: topicSuggestions } = trpc.blog.suggestTopics.useQuery(undefined, {
    enabled: showProducerDialog,
    retry: false,
  });
  const produceArticle = trpc.blog.produceArticle.useMutation({
    onSuccess: (post) => {
      toast.success(`Draft created: "${post.title}". Review it before publishing.`);
      utils.blog.listPosts.invalidate();
      setShowProducerDialog(false);
      setProdTopic("");
      setProdKeyword("");
      setStatusFilter("draft");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateArticle = trpc.blog.generateArticle.useMutation({
    onSuccess: (data) => {
      setTitle(data.title);
      setSlug(data.slug);
      setExcerpt(data.excerpt);
      setContent(data.content);
      setMetaTitle(data.metaTitle);
      setMetaDescription(data.metaDescription);
      setIsGenerating(false);
      setShowAIDialog(false);
      setViewMode("editor");
      toast.success("Article generated! Review and edit before publishing.");
    },
    onError: (e) => {
      setIsGenerating(false);
      toast.error(e.message);
    },
  });

  const refineArticle = trpc.blog.refineArticle.useMutation({
    onSuccess: (data) => {
      setTitle(data.title);
      setContent(data.content);
      setMetaTitle(data.metaTitle);
      setMetaDescription(data.metaDescription);
      setIsRefining(false);
      setShowRefineInput(false);
      setRefineFeedback("");
      toast.success("Article refined!");
    },
    onError: (e) => {
      setIsRefining(false);
      toast.error(e.message);
    },
  });

  const resetEditor = () => {
    setEditingPostId(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setFeaturedImage("");
    setMetaTitle("");
    setMetaDescription("");
    setTargetKeyword("");
    setCategoryId(undefined);
    setSelectedTagIds([]);
    setShowRefineInput(false);
    setRefineFeedback("");
  };

  const handleEditPost = async (postId: number) => {
    const post = postsData?.posts.find(p => p.id === postId);
    if (!post) return;
    setEditingPostId(postId);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt || "");
    setContent(post.content);
    setFeaturedImage(post.featuredImage || "");
    setMetaTitle(post.metaTitle || "");
    setMetaDescription(post.metaDescription || "");
    setTargetKeyword(post.targetKeyword || "");
    setCategoryId(post.categoryId || undefined);
    setViewMode("editor");
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleSave = (status: "draft" | "published") => {
    const data = {
      title,
      slug: slug || generateSlug(title),
      excerpt: excerpt || undefined,
      content,
      featuredImage: featuredImage || undefined,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      targetKeyword: targetKeyword || undefined,
      categoryId: categoryId || undefined,
      status,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    if (editingPostId) {
      updatePost.mutate({ id: editingPostId, ...data });
    } else {
      createPost.mutate(data);
    }
  };

  const handleAIGenerate = () => {
    if (!aiTopic) return;
    setIsGenerating(true);
    generateArticle.mutate({
      topic: aiTopic,
      targetKeyword: aiKeyword || undefined,
      tone: aiTone,
      language: aiLanguage,
    });
  };

  const handleRefine = () => {
    if (!refineFeedback || !content) return;
    setIsRefining(true);
    refineArticle.mutate({
      currentContent: content,
      currentTitle: title,
      feedback: refineFeedback,
    });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  // ==========================================
  // LIST VIEW
  // ==========================================
  if (viewMode === "list") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Blog Manager</h2>
            <p className="text-sm text-gray-500">
              {postsData?.total || 0} articles total
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setShowCategoryDialog(true)}>
              <FolderOpen className="w-4 h-4 mr-1" /> Categories
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowTagDialog(true)}>
              <Tag className="w-4 h-4 mr-1" /> Tags
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAIDialog(true)} className="text-purple-600 border-purple-300 hover:bg-purple-50">
              <Sparkles className="w-4 h-4 mr-1" /> Generate with AI
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowProducerDialog(true)} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
              <Globe className="w-4 h-4 mr-1" /> GEO Producer
            </Button>
            <Button size="sm" onClick={() => { resetEditor(); setViewMode("editor"); }} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-1" /> New Article
            </Button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {[
            { label: "All", value: undefined },
            { label: "Draft", value: "draft" as const },
            { label: "Published", value: "published" as const },
            { label: "Archived", value: "archived" as const },
          ].map(f => (
            <Button
              key={f.label}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className={statusFilter === f.value ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Posts Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : !postsData?.posts.length ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No articles yet. Create your first one!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Title</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Category</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Keyword</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-600">Date</th>
                      <th className="text-right p-3 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {postsData.posts.map(post => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900 line-clamp-1">{post.title}</div>
                          <div className="text-xs text-gray-400">/{post.slug}</div>
                        </td>
                        <td className="p-3">
                          {post.categoryId ? (
                            <Badge variant="secondary" className="text-xs">
                              {categories?.find(c => c.id === post.categoryId)?.name || "-"}
                            </Badge>
                          ) : "-"}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={post.status === "published" ? "default" : "secondary"}
                            className={
                              post.status === "published" ? "bg-green-100 text-green-700" :
                              post.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {post.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-gray-500">{post.targetKeyword || "-"}</td>
                        <td className="p-3 text-sm text-gray-500">{formatDate(post.createdAt)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {post.status === "published" && (
                              <Button size="sm" variant="ghost" onClick={() => window.open(`/blog/${post.slug}`, "_blank")}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleEditPost(post.id)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => {
                                if (confirm("Delete this article?")) deletePost.mutate({ id: post.id });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input placeholder="Category name" value={newCategoryName} onChange={e => { setNewCategoryName(e.target.value); setNewCategorySlug(generateSlug(e.target.value)); }} />
                <Input placeholder="Slug" value={newCategorySlug} onChange={e => setNewCategorySlug(e.target.value)} />
                <Input placeholder="Description (optional)" value={newCategoryDesc} onChange={e => setNewCategoryDesc(e.target.value)} />
                <Button size="sm" onClick={() => createCategory.mutate({ name: newCategoryName, slug: newCategorySlug, description: newCategoryDesc || undefined })} disabled={!newCategoryName || !newCategorySlug}>
                  <Plus className="w-4 h-4 mr-1" /> Add Category
                </Button>
              </div>
              <div className="border-t pt-3 space-y-2">
                {categories?.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      <span className="text-xs text-gray-400 ml-2">/{cat.slug}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteCategory.mutate({ id: cat.id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {!categories?.length && <p className="text-sm text-gray-400 text-center">No categories yet</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tag Dialog */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Tag name" value={newTagName} onChange={e => { setNewTagName(e.target.value); setNewTagSlug(generateSlug(e.target.value)); }} className="flex-1" />
                <Button size="sm" onClick={() => createTag.mutate({ name: newTagName, slug: newTagSlug })} disabled={!newTagName}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags?.map(tag => (
                  <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
                    {tag.name}
                    <button onClick={() => deleteTag.mutate({ id: tag.id })} className="ml-1 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {!tags?.length && <p className="text-sm text-gray-400">No tags yet</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Generate Dialog */}
        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" /> Generate Article with AI
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Topic / Topik Artikel *</label>
                <Textarea
                  placeholder="e.g., Panduan lengkap kuliah di Australia untuk mahasiswa Indonesia 2026"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Target SEO Keyword</label>
                <Input
                  placeholder="e.g., study in australia"
                  value={aiKeyword}
                  onChange={e => setAiKeyword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tone</label>
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional and informative">Professional & Informative</SelectItem>
                    <SelectItem value="friendly and conversational">Friendly & Conversational</SelectItem>
                    <SelectItem value="persuasive and engaging">Persuasive & Engaging</SelectItem>
                    <SelectItem value="academic and detailed">Academic & Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Language</label>
                <Select value={aiLanguage} onValueChange={setAiLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bilingual (Indonesian primary, English secondary)">Bilingual (ID primary)</SelectItem>
                    <SelectItem value="Indonesian only">Indonesian Only</SelectItem>
                    <SelectItem value="English only">English Only</SelectItem>
                    <SelectItem value="bilingual (English primary, Indonesian secondary)">Bilingual (EN primary)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>Cancel</Button>
              <Button onClick={handleAIGenerate} disabled={isGenerating || !aiTopic} className="bg-purple-600 hover:bg-purple-700">
                {isGenerating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GEO Producer Dialog — one-click generate + save review-ready draft */}
        <Dialog open={showProducerDialog} onOpenChange={setShowProducerDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-500" /> GEO Article Producer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Writes a search- and AI-assistant-optimized article (key takeaways, FAQ, internal links + Article schema) and saves it as a <strong>draft</strong> for you to review before publishing.
              </p>
              <div>
                <label className="text-sm font-medium mb-1 block">Topic *</label>
                <Textarea
                  placeholder="Pick a suggested topic below, or type your own"
                  value={prodTopic}
                  onChange={e => setProdTopic(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Target Keyword (optional)</label>
                <Input placeholder="e.g., kuliah di Australia" value={prodKeyword} onChange={e => setProdKeyword(e.target.value)} />
              </div>
              {topicSuggestions?.all?.length ? (
                <div>
                  <label className="text-xs font-medium mb-1 block text-gray-500">Suggested topics (next-up first)</label>
                  <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                    {topicSuggestions.all.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => { setProdTopic(t.topic); setProdKeyword(t.keyword); }}
                        className={`text-left text-sm px-2 py-1.5 rounded border hover:bg-emerald-50 ${prodTopic === t.topic ? "border-emerald-400 bg-emerald-50" : "border-gray-200"}`}
                      >
                        {topicSuggestions.next?.topic === t.topic && <Badge className="bg-emerald-100 text-emerald-700 mr-1 text-[10px]">next</Badge>}
                        {t.topic}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProducerDialog(false)}>Cancel</Button>
              <Button onClick={() => produceArticle.mutate({ topic: prodTopic, targetKeyword: prodKeyword || undefined })} disabled={produceArticle.isPending || !prodTopic} className="bg-emerald-600 hover:bg-emerald-700">
                {produceArticle.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Producing...</> : <><Globe className="w-4 h-4 mr-1" /> Produce Draft</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ==========================================
  // EDITOR VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { resetEditor(); setViewMode("list"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-bold">
            {editingPostId ? "Edit Article" : "New Article"}
          </h2>
        </div>
        <div className="flex gap-2">
          {content && (
            <Button
              size="sm"
              variant="outline"
              className="text-purple-600 border-purple-300"
              onClick={() => setShowRefineInput(!showRefineInput)}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> AI Refine
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={createPost.isPending || updatePost.isPending}
          >
            <Save className="w-4 h-4 mr-1" /> Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave("published")}
            disabled={createPost.isPending || updatePost.isPending || !title || !content}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-1" /> Publish
          </Button>
        </div>
      </div>

      {/* AI Refine Bar */}
      {showRefineInput && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Make it shorter, add more statistics, change tone to friendly..."
                value={refineFeedback}
                onChange={e => setRefineFeedback(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleRefine}
                disabled={isRefining || !refineFeedback}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input
                  placeholder="Article title"
                  value={title}
                  onChange={e => {
                    setTitle(e.target.value);
                    if (!editingPostId) setSlug(generateSlug(e.target.value));
                  }}
                  className="text-lg font-semibold"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Globe className="w-3 h-3" /> /blog/
                  <Input
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    className="text-sm"
                    placeholder="url-slug"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Excerpt</label>
                <Textarea
                  placeholder="Brief summary for preview cards (2-3 sentences)"
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Content (HTML) *</label>
                <Textarea
                  placeholder="Article content in HTML..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content Preview */}
          {content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block text-gray-500">Meta Title</label>
                <Input
                  placeholder="SEO title (max 60 chars)"
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  className="text-sm"
                />
                <span className="text-xs text-gray-400">{metaTitle.length}/60</span>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-gray-500">Meta Description</label>
                <Textarea
                  placeholder="SEO description (max 155 chars)"
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <span className="text-xs text-gray-400">{metaDescription.length}/155</span>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-gray-500">Target Keyword</label>
                <Input
                  placeholder="e.g., study in australia"
                  value={targetKeyword}
                  onChange={e => setTargetKeyword(e.target.value)}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Category & Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Category & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block text-gray-500">Category</label>
                <Select value={categoryId?.toString() || "none"} onValueChange={v => setCategoryId(v === "none" ? undefined : parseInt(v))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-gray-500">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {tags?.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${selectedTagIds.includes(tag.id) ? "bg-red-600" : ""}`}
                      onClick={() => {
                        setSelectedTagIds(prev =>
                          prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                        );
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {!tags?.length && <p className="text-xs text-gray-400">No tags available</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Featured Image</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Image URL"
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                className="text-sm"
              />
              {featuredImage && (
                <img src={featuredImage} alt="Preview" className="mt-2 rounded-lg w-full h-32 object-cover" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
