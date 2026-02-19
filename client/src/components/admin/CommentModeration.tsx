import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle, Check, X, Star, Clock, Trash2, Eye,
  ChevronLeft, ChevronRight, AlertCircle
} from "lucide-react";

export default function CommentModeration() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.blogComments.listAll.useQuery({
    limit,
    offset: page * limit,
  });

  const updateStatus = trpc.blogComments.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const action = variables.status === "approved" ? "approved" : variables.status === "rejected" ? "rejected" : "updated";
      toast.success(`Comment ${action}!`);
      utils.blogComments.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteComment = trpc.blogComments.delete.useMutation({
    onSuccess: () => {
      toast.success("Comment deleted!");
      utils.blogComments.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  const comments = data ?? [];
  const total = comments.length;
  const totalPages = Math.ceil(total / limit);
  const pendingCount = comments.filter((c: typeof comments[number]) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-red-600" />
            Comment Moderation
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {total} total comments
            {pendingCount > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">
                ({pendingCount} pending review)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">
            <span className="font-semibold">{pendingCount} comments</span> are waiting for your review. 
            Approve them to make them visible on the blog.
          </p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No comments yet</p>
            <p className="text-sm text-gray-400 mt-1">Comments will appear here when readers leave them on blog articles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comments.map((comment: typeof comments[number]) => (
            <Card key={comment.id} className={`border ${comment.status === "pending" ? "border-yellow-200 bg-yellow-50/30" : "border-gray-100"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {comment.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{comment.name}</span>
                        <span className="text-xs text-gray-400">{comment.email}</span>
                        <Badge className={`text-xs ${statusColor(comment.status)}`}>
                          {comment.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                          {comment.status === "approved" && <Check className="w-3 h-3 mr-1" />}
                          {comment.status === "rejected" && <X className="w-3 h-3 mr-1" />}
                          {comment.status}
                        </Badge>
                        {comment.rating && (
                          <span className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= comment.rating! ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                    </div>

                    {/* Post reference */}
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Post ID: <span className="font-medium text-gray-600">#{comment.postId}</span>
                    </p>

                    {/* Comment content */}
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                      {comment.content}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {comment.status !== "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50 h-7 text-xs"
                          onClick={() => updateStatus.mutate({ id: comment.id, status: "approved" })}
                          disabled={updateStatus.isPending}
                        >
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      {comment.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 h-7 text-xs"
                          onClick={() => updateStatus.mutate({ id: comment.id, status: "rejected" })}
                          disabled={updateStatus.isPending}
                        >
                          <X className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50 h-7 text-xs"
                        onClick={() => {
                          if (confirm("Delete this comment permanently?")) {
                            deleteComment.mutate({ id: comment.id });
                          }
                        }}
                        disabled={deleteComment.isPending}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
