import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowRight, Search, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Blog() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const limit = 12;

  const { data, isLoading } = trpc.blog.getPublishedPosts.useQuery({
    categorySlug: selectedCategory,
    limit,
    offset: page * limit,
  });

  const { data: categories } = trpc.blog.listCategories.useQuery();

  const filteredPosts = data?.posts?.filter(post =>
    !searchTerm || 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil((data?.total || 0) / limit);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-red-600 to-red-700 text-white py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }} />
        </div>
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="w-8 h-8" />
              <span className="text-red-200 font-medium uppercase tracking-wider text-sm">SpecTa Education Blog</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Panduan Studi ke Luar Negeri
            </h1>
            <p className="text-lg md:text-xl text-red-100 mb-8">
              Tips, panduan, dan informasi terbaru seputar kuliah di luar negeri, persiapan IELTS, dan beasiswa.
            </p>
            <p className="text-sm text-red-200">
              Your Guide to Studying Abroad — Tips, Guides & Latest Info
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari artikel... / Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={!selectedCategory ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedCategory(undefined); setPage(0); }}
                className={!selectedCategory ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Semua
              </Button>
              {categories?.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.slug ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedCategory(cat.slug); setPage(0); }}
                  className={selectedCategory === cat.slug ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="container pb-16">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-20 mb-3" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Belum ada artikel</h3>
              <p className="text-gray-400">No articles published yet. Check back soon!</p>
            </div>
          ) : (
            <>
              {/* Featured Post (first post) */}
              {page === 0 && filteredPosts.length > 0 && (
                <Link href={`/blog/${filteredPosts[0].slug}`}>
                  <Card className="overflow-hidden mb-8 hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="md:flex">
                      {filteredPosts[0].featuredImage && (
                        <div className="md:w-1/2">
                          <img
                            src={filteredPosts[0].featuredImage}
                            alt={filteredPosts[0].title}
                            className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardContent className={`p-6 md:p-8 flex flex-col justify-center ${filteredPosts[0].featuredImage ? "md:w-1/2" : "w-full"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          {filteredPosts[0].categoryName && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              {filteredPosts[0].categoryName}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-400">Artikel Terbaru</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                          {filteredPosts[0].title}
                        </h2>
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {filteredPosts[0].excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(filteredPosts[0].publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {estimateReadTime(filteredPosts[0].content)} min read
                          </span>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-red-600 font-medium group-hover:gap-2 transition-all">
                          Baca Selengkapnya <ArrowRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              )}

              {/* Rest of posts in grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.slice(page === 0 ? 1 : 0).map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group h-full">
                      {post.featuredImage && (
                        <div className="overflow-hidden">
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          {post.categoryName && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                              {post.categoryName}
                            </Badge>
                          )}
                          {post.tags?.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.publishedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {estimateReadTime(post.content)} min
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Button
                      key={i}
                      variant={page === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i)}
                      className={page === i ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
