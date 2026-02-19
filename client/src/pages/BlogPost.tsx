import { trpc } from "@/lib/trpc";
import { useRoute, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowLeft, Share2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export default function BlogPost() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";

  const { data: post, isLoading, error } = trpc.blog.getPublishedPost.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Update page title for SEO
  useEffect(() => {
    if (post) {
      document.title = post.metaTitle || `${post.title} - SpecTa Education Blog`;
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && post.metaDescription) {
        metaDesc.setAttribute("content", post.metaDescription);
      }
    }
    return () => {
      document.title = "SpecTa Education - Study Abroad Consultant Jakarta | IELTS Preparation";
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {estimateReadTime(post.content)} min read
              </span>
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
      <article className="container max-w-4xl pb-16">
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

        {/* Back to Blog */}
        <div className="mt-8 text-center">
          <Link href="/blog">
            <Button variant="ghost" className="text-gray-500 hover:text-red-600">
              <ArrowLeft className="w-4 h-4 mr-1" /> Lihat Semua Artikel
            </Button>
          </Link>
        </div>
      </article>

      {/* Schema.org Article structured data */}
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
          }),
        }}
      />
    </div>
  );
}
