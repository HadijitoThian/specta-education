import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, ArrowLeft, Share2, BookOpen, Star, MessageCircle, Send, User } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";

// Star Rating Component
function StarRating({ rating, onRate, interactive = false, size = "md" }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(star)}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hovered || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: post, isLoading, error } = trpc.blog.getPublishedPost.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Comment form state
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentRating, setCommentRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments and rating
  const { data: comments, refetch: refetchComments } = trpc.blogComments.getByPost.useQuery(
    { postId: post?.id ?? 0 },
    { enabled: !!post?.id }
  );

  const { data: ratingSummary, refetch: refetchRating } = trpc.blogComments.getRating.useQuery(
    { postId: post?.id ?? 0 },
    { enabled: !!post?.id }
  );

  const submitComment = trpc.blogComments.submit.useMutation({
    onSuccess: () => {
      toast.success("Komentar berhasil dikirim! / Comment submitted successfully!");
      setCommentName("");
      setCommentEmail("");
      setCommentContent("");
      setCommentRating(0);
      setIsSubmitting(false);
      refetchComments();
      refetchRating();
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengirim komentar / Failed to submit comment");
      setIsSubmitting(false);
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentEmail.trim() || !commentContent.trim()) {
      toast.error("Mohon isi semua field / Please fill in all fields");
      return;
    }
    if (!post?.id) return;
    setIsSubmitting(true);
    submitComment.mutate({
      postId: post.id,
      name: commentName.trim(),
      email: commentEmail.trim(),
      content: commentContent.trim(),
      rating: commentRating > 0 ? commentRating : undefined,
    });
  };

  // Update page title for SEO
  useEffect(() => {
    if (post) {
      document.title = post.metaTitle || `${post.title} - SpecTa Education Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && post.metaDescription) {
        metaDesc.setAttribute("content", post.metaDescription);
      }
    }
    return () => {
      document.title = "SpecTa Education Blog - Study Abroad Tips";
    };
  }, [post]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCommentDate = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const estimateReadTime = (content: string) => {
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: post?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link disalin! / Link copied!");
    }
  };

  // Memoize comment count
  const commentCount = useMemo(() => comments?.length ?? 0, [comments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container max-w-4xl py-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Artikel Tidak Ditemukan</h2>
          <p className="text-gray-500 mb-6">Article not found or has been removed.</p>
          <Link href="/blog">
            <Button className="bg-red-600 hover:bg-red-700">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Article Header */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-8 md:py-12">
        <div className="container max-w-4xl">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="mb-6 text-gray-500 hover:text-red-600">
              <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Blog
            </Button>
          </Link>

          <div className="flex items-center gap-2 mb-4">
            {post.categoryName && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                {post.categoryName}
              </Badge>
            )}
            {post.tags?.map(tag => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-lg text-gray-600 mb-6">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {estimateReadTime(post.content)} min read
              </span>
              {ratingSummary && ratingSummary.totalRatings > 0 && (
                <span className="flex items-center gap-1.5">
                  <StarRating rating={Math.round(ratingSummary.averageRating)} size="sm" />
                  <span className="font-medium text-yellow-600">{ratingSummary.averageRating.toFixed(1)}</span>
                  <span>({ratingSummary.totalRatings})</span>
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {commentCount} komentar
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {post.featuredImage && (
        <section className="container max-w-4xl mb-8">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-auto rounded-xl shadow-lg"
          />
        </section>
      )}

      {/* Article Content */}
      <article className="container max-w-4xl pb-8">
        <div
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-img:rounded-lg prose-img:shadow-md prose-blockquote:border-l-red-500 prose-blockquote:bg-red-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA Section */}
        <div className="mt-12 p-8 bg-gradient-to-r from-red-50 to-red-100 rounded-2xl border border-red-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Siap Memulai Perjalanan Studi ke Luar Negeri?
          </h3>
          <p className="text-gray-600 mb-4">
            Ready to start your study abroad journey? Konsultasi gratis dengan konsultan SpecTa Education sekarang!
          </p>
          <div className="flex gap-3">
            <Link href="/#contact">
              <Button className="bg-red-600 hover:bg-red-700">
                Konsultasi Gratis
              </Button>
            </Link>
            <Link href="/specta-play">
              <Button variant="outline">
                Coba Tes Aptitude Gratis
              </Button>
            </Link>
          </div>
        </div>
      </article>

      {/* Comments & Ratings Section */}
      <section className="container max-w-4xl pb-16">
        <div className="border-t border-gray-200 pt-10">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Komentar & Rating
              </h2>
              {commentCount > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {commentCount}
                </Badge>
              )}
            </div>
            {ratingSummary && ratingSummary.totalRatings > 0 && (
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-200">
                <StarRating rating={Math.round(ratingSummary.averageRating)} size="sm" />
                <span className="font-bold text-yellow-700">{ratingSummary.averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({ratingSummary.totalRatings} rating)</span>
              </div>
            )}
          </div>

          {/* Comment Form */}
          <Card className="mb-8 border-2 border-dashed border-gray-200 hover:border-red-300 transition-colors">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Tinggalkan Komentar / Leave a Comment
              </h3>
              <form onSubmit={handleSubmitComment} className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating Artikel (opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    <StarRating
                      rating={commentRating}
                      onRate={setCommentRating}
                      interactive
                      size="lg"
                    />
                    {commentRating > 0 && (
                      <span className="text-sm text-gray-500">
                        {commentRating === 1 && "Kurang"}
                        {commentRating === 2 && "Cukup"}
                        {commentRating === 3 && "Baik"}
                        {commentRating === 4 && "Sangat Baik"}
                        {commentRating === 5 && "Luar Biasa!"}
                      </span>
                    )}
                    {commentRating > 0 && (
                      <button
                        type="button"
                        onClick={() => setCommentRating(0)}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama *
                    </label>
                    <Input
                      placeholder="Nama Anda"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Email tidak akan ditampilkan</p>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Komentar *
                  </label>
                  <Textarea
                    placeholder="Tulis komentar Anda di sini... / Write your comment here..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    required
                    maxLength={5000}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{commentContent.length}/5000</p>
                </div>

                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isSubmitting || !commentName.trim() || !commentEmail.trim() || !commentContent.trim()}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mengirim...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Kirim Komentar
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Comments List */}
          {comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id} className="border border-gray-100 hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {comment.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{comment.name}</span>
                            {comment.rating && (
                              <StarRating rating={comment.rating} size="sm" />
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatCommentDate(comment.createdAt)}
                          </span>
                        </div>
                        {/* Content */}
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Belum ada komentar</p>
              <p className="text-sm text-gray-400 mt-1">Jadilah yang pertama berkomentar!</p>
            </div>
          )}
        </div>

        {/* Back to Blog */}
        <div className="mt-8 text-center">
          <Link href="/blog">
            <Button variant="ghost" className="text-gray-500 hover:text-red-600">
              <ArrowLeft className="w-4 h-4 mr-1" /> Lihat Semua Artikel
            </Button>
          </Link>
        </div>
      </section>

      {/* Schema.org Article structured data with aggregate rating */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.metaDescription || post.excerpt,
            image: post.featuredImage,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: {
              "@type": "Organization",
              name: "SpecTa Education",
            },
            publisher: {
              "@type": "Organization",
              name: "SpecTa Education",
              url: "https://www.spectaeducation.com",
            },
            ...(ratingSummary && ratingSummary.totalRatings > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: ratingSummary.averageRating.toFixed(1),
                    bestRating: "5",
                    ratingCount: ratingSummary.totalRatings,
                  },
                }
              : {}),
            ...(commentCount > 0
              ? {
                  commentCount: commentCount,
                }
              : {}),
          }),
        }}
      />
    </div>
  );
}
