import { useState, useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SPECTA_LOGO_URL = "/files/migrated/QxrYSewOYzAuPIEN.jpeg";

// ==========================================
// TYPES
// ==========================================
type BlockType = "header" | "text" | "button" | "image" | "divider" | "footer";

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  props: Record<string, string>;
}

interface EmailBlockEditorProps {
  initialHtml?: string;
  subject: string;
  onSubjectChange: (subject: string) => void;
  onHtmlChange: (html: string) => void;
  campaignName?: string;
  stepNumber?: number;
  totalSteps?: number;
}

// ==========================================
// DEFAULT BLOCKS
// ==========================================
function createDefaultBlocks(): EmailBlock[] {
  return [
    {
      id: "block-header-" + Date.now(),
      type: "header",
      content: "",
      props: {},
    },
    {
      id: "block-text-" + Date.now() + "-1",
      type: "text",
      content: "<p>Hi {{name}},</p><p>Write your email content here...</p>",
      props: {},
    },
    {
      id: "block-button-" + Date.now(),
      type: "button",
      content: "Learn More",
      props: { url: "https://spectaeducation.com", color: "#E53E3E" },
    },
    {
      id: "block-footer-" + Date.now(),
      type: "footer",
      content: "",
      props: {},
    },
  ];
}

// ==========================================
// BLOCK PALETTE
// ==========================================
const BLOCK_TEMPLATES: { type: BlockType; label: string; icon: string }[] = [
  { type: "header", label: "Header", icon: "🏷️" },
  { type: "text", label: "Text", icon: "📝" },
  { type: "button", label: "Button", icon: "🔘" },
  { type: "image", label: "Image", icon: "🖼️" },
  { type: "divider", label: "Divider", icon: "➖" },
  { type: "footer", label: "Footer", icon: "📋" },
];

function createBlock(type: BlockType): EmailBlock {
  const id = `block-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  switch (type) {
    case "header":
      return { id, type, content: "", props: {} };
    case "text":
      return { id, type, content: "<p>Enter your text here...</p>", props: {} };
    case "button":
      return { id, type, content: "Click Here", props: { url: "#", color: "#E53E3E" } };
    case "image":
      return { id, type, content: "", props: { url: "", alt: "Image" } };
    case "divider":
      return { id, type, content: "", props: {} };
    case "footer":
      return { id, type, content: "", props: {} };
  }
}

// ==========================================
// SORTABLE BLOCK ITEM
// ==========================================
function SortableBlockItem({
  block,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (block: EmailBlock) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const blockLabel = BLOCK_TEMPLATES.find((t) => t.type === block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border rounded-lg transition-all ${
        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b text-xs">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600" title="Drag to reorder">
          ⠿
        </button>
        <span className="text-gray-500 font-medium">{blockLabel?.icon} {blockLabel?.label}</span>
        <div className="ml-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-400 hover:text-red-500 text-xs px-1"
            title="Remove block"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-3">
        <BlockContent block={block} onUpdate={onUpdate} isSelected={isSelected} />
      </div>
    </div>
  );
}

// ==========================================
// BLOCK CONTENT EDITORS
// ==========================================
function BlockContent({
  block,
  onUpdate,
  isSelected,
}: {
  block: EmailBlock;
  onUpdate: (block: EmailBlock) => void;
  isSelected: boolean;
}) {
  switch (block.type) {
    case "header":
      return (
        <div className="text-center text-sm text-gray-500 py-2">
          <img src={SPECTA_LOGO_URL} alt="SpecTa Education" className="h-10 mx-auto mb-1" />
          <span className="text-xs text-gray-400">SpecTa Education Header (auto-generated)</span>
        </div>
      );

    case "text":
      return isSelected ? (
        <RichTextBlockEditor
          content={block.content}
          onChange={(content) => onUpdate({ ...block, content })}
        />
      ) : (
        <div
          className="text-sm text-gray-700 prose prose-sm max-w-none min-h-[40px]"
          dangerouslySetInnerHTML={{ __html: block.content || "<p class='text-gray-400'>Click to edit...</p>" }}
        />
      );

    case "button":
      return (
        <div className="space-y-2">
          <div className="text-center">
            <span
              className="inline-block px-6 py-2 rounded text-white text-sm font-medium"
              style={{ backgroundColor: block.props.color || "#E53E3E" }}
            >
              {block.content || "Button Text"}
            </span>
          </div>
          {isSelected && (
            <div className="flex gap-2 mt-2">
              <Input
                value={block.content}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                placeholder="Button text"
                className="text-xs h-8"
              />
              <Input
                value={block.props.url || ""}
                onChange={(e) => onUpdate({ ...block, props: { ...block.props, url: e.target.value } })}
                placeholder="URL"
                className="text-xs h-8"
              />
              <Input
                type="color"
                value={block.props.color || "#E53E3E"}
                onChange={(e) => onUpdate({ ...block, props: { ...block.props, color: e.target.value } })}
                className="w-10 h-8 p-0.5"
              />
            </div>
          )}
        </div>
      );

    case "image":
      return (
        <div className="space-y-2">
          {block.props.url ? (
            <img src={block.props.url} alt={block.props.alt || "Image"} className="max-w-full mx-auto rounded" style={{ maxHeight: 200 }} />
          ) : (
            <div className="bg-gray-100 rounded p-6 text-center text-gray-400 text-sm">
              🖼️ Add image URL below
            </div>
          )}
          {isSelected && (
            <div className="flex gap-2">
              <Input
                value={block.props.url || ""}
                onChange={(e) => onUpdate({ ...block, props: { ...block.props, url: e.target.value } })}
                placeholder="Image URL"
                className="text-xs h-8"
              />
              <Input
                value={block.props.alt || ""}
                onChange={(e) => onUpdate({ ...block, props: { ...block.props, alt: e.target.value } })}
                placeholder="Alt text"
                className="text-xs h-8 w-32"
              />
            </div>
          )}
        </div>
      );

    case "divider":
      return <hr className="border-gray-300 my-2" />;

    case "footer":
      return (
        <div className="text-center text-xs text-gray-400 py-2">
          <p>© {new Date().getFullYear()} SpecTa Education. All rights reserved.</p>
          <p className="mt-1">
            <a href="{{unsubscribe_url}}" className="text-blue-500 underline">Unsubscribe</a> from this email
          </p>
        </div>
      );
  }
}

// ==========================================
// RICH TEXT EDITOR (TipTap)
// ==========================================
function RichTextBlockEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      TextStyle,
      Placeholder.configure({ placeholder: "Start typing..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[60px] p-2",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 p-1.5 bg-gray-50 border-b">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <u>U</u>
        </ToolbarButton>
        <span className="w-px bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <span className="w-px bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          1.
        </ToolbarButton>
        <span className="w-px bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          ≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          ≡
        </ToolbarButton>
        <span className="w-px bg-gray-300 mx-1" />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("Enter URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Add Link"
        >
          🔗
        </ToolbarButton>
        <input
          type="color"
          className="w-6 h-6 rounded cursor-pointer border-0 p-0"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          title="Text Color"
        />
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "hover:bg-gray-200 text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

// ==========================================
// BLOCKS TO EMAIL HTML CONVERTER
// ==========================================
function blocksToEmailHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map((block) => {
    switch (block.type) {
      case "header":
        return `<tr><td style="padding: 24px 30px; text-align: center; background-color: #ffffff; border-bottom: 2px solid #E53E3E;">
          <img src="${SPECTA_LOGO_URL}" alt="SpecTa Education" style="height: 50px; width: auto;" />
        </td></tr>`;

      case "text":
        return `<tr><td style="padding: 20px 30px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #333333;">
          ${block.content}
        </td></tr>`;

      case "button":
        return `<tr><td style="padding: 20px 30px; text-align: center;">
          <a href="${block.props.url || "#"}" style="display: inline-block; padding: 12px 32px; background-color: ${block.props.color || "#E53E3E"}; color: #ffffff; text-decoration: none; border-radius: 6px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold;">
            ${block.content || "Click Here"}
          </a>
        </td></tr>`;

      case "image":
        if (!block.props.url) return "";
        return `<tr><td style="padding: 20px 30px; text-align: center;">
          <img src="${block.props.url}" alt="${block.props.alt || "Image"}" style="max-width: 100%; height: auto; border-radius: 8px;" />
        </td></tr>`;

      case "divider":
        return `<tr><td style="padding: 10px 30px;">
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
        </td></tr>`;

      case "footer":
        return `<tr><td style="padding: 20px 30px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #9ca3af; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} SpecTa Education. All rights reserved.</p>
          <p style="margin: 0;"><a href="{{unsubscribe_url}}" style="color: #3b82f6; text-decoration: underline;">Unsubscribe</a> from this email</p>
        </td></tr>`;

      default:
        return "";
    }
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${rows.join("\n          ")}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ==========================================
// PARSE HTML BACK TO BLOCKS (best effort)
// ==========================================
function parseHtmlToBlocks(html: string): EmailBlock[] | null {
  if (!html || html.trim().length < 20) return null;

  // If it's already our table-based format, try to parse blocks
  // Otherwise, wrap the whole thing in a text block
  const blocks: EmailBlock[] = [
    { id: `block-header-${Date.now()}`, type: "header", content: "", props: {} },
  ];

  // Strip the outer table wrapper and extract inner content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const innerHtml = bodyMatch ? bodyMatch[1] : html;

  // Simple approach: wrap the content as a text block
  // Remove any existing header/footer patterns
  let cleanContent = innerHtml
    .replace(/<table[^>]*>[\s\S]*?<img[^>]*specta[^>]*>[\s\S]*?<\/table>/gi, "")
    .replace(/©[\s\S]*?Unsubscribe[\s\S]*?email/gi, "")
    .replace(/<table[^>]*role="presentation"[^>]*>/gi, "")
    .replace(/<\/table>/gi, "")
    .replace(/<tr>/gi, "")
    .replace(/<\/tr>/gi, "")
    .replace(/<td[^>]*>/gi, "")
    .replace(/<\/td>/gi, "")
    .trim();

  if (cleanContent) {
    blocks.push({
      id: `block-text-${Date.now()}-imported`,
      type: "text",
      content: cleanContent,
      props: {},
    });
  }

  blocks.push({ id: `block-footer-${Date.now()}`, type: "footer", content: "", props: {} });

  return blocks;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function EmailBlockEditor({
  initialHtml,
  subject,
  onSubjectChange,
  onHtmlChange,
  campaignName,
  stepNumber,
  totalSteps,
}: EmailBlockEditorProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    if (initialHtml) {
      const parsed = parseHtmlToBlocks(initialHtml);
      return parsed || createDefaultBlocks();
    }
    return createDefaultBlocks();
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRefinePrompt, setAiRefinePrompt] = useState("");
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Update parent HTML whenever blocks change
  useEffect(() => {
    const html = blocksToEmailHtml(blocks);
    onHtmlChange(html);
  }, [blocks]);

  // Update preview iframe
  useEffect(() => {
    const html = blocksToEmailHtml(blocks);
    if (previewIframeRef.current) {
      const doc = previewIframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [blocks, previewMode]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const addBlock = useCallback((type: BlockType) => {
    const newBlock = createBlock(type);
    // Insert before footer if footer exists, otherwise at end
    setBlocks((prev) => {
      const footerIndex = prev.findIndex((b) => b.type === "footer");
      if (footerIndex >= 0) {
        const updated = [...prev];
        updated.splice(footerIndex, 0, newBlock);
        return updated;
      }
      return [...prev, newBlock];
    });
    setSelectedBlockId(newBlock.id);
  }, []);

  const updateBlock = useCallback((updated: EmailBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlockId(null);
  }, []);

  // AI mutations
  const generateEmailMutation = trpc.dripCampaign.generateEmailContent.useMutation({
    onSuccess: (result) => {
      onSubjectChange(result.subject);
      // Parse AI HTML into blocks
      const parsed = parseHtmlToBlocks(result.htmlContent);
      if (parsed) {
        setBlocks(parsed);
      } else {
        // Fallback: put everything in a text block
        setBlocks([
          { id: `block-header-${Date.now()}`, type: "header", content: "", props: {} },
          { id: `block-text-${Date.now()}`, type: "text", content: result.htmlContent, props: {} },
          { id: `block-footer-${Date.now()}`, type: "footer", content: "", props: {} },
        ]);
      }
      toast.success("AI generated email content! Review and edit as needed.");
      setShowAiPanel(false);
      setAiPrompt("");
    },
    onError: (err) => {
      toast.error(`AI generation failed: ${err.message}`);
    },
  });

  const refineEmailMutation = trpc.dripCampaign.refineEmailContent.useMutation({
    onSuccess: (result) => {
      if (result.subject) onSubjectChange(result.subject);
      const parsed = parseHtmlToBlocks(result.htmlContent);
      if (parsed) {
        setBlocks(parsed);
      } else {
        setBlocks((prev) => {
          const headerBlock = prev.find((b) => b.type === "header") || { id: `block-header-${Date.now()}`, type: "header" as const, content: "", props: {} };
          const footerBlock = prev.find((b) => b.type === "footer") || { id: `block-footer-${Date.now()}`, type: "footer" as const, content: "", props: {} };
          return [
            headerBlock,
            { id: `block-text-${Date.now()}`, type: "text", content: result.htmlContent, props: {} },
            footerBlock,
          ];
        });
      }
      toast.success("AI refined the email content!");
      setAiRefinePrompt("");
    },
    onError: (err) => {
      toast.error(`AI refinement failed: ${err.message}`);
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Subject Line */}
      <div className="mb-4">
        <Label className="text-sm font-semibold">Subject Line</Label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder='e.g., "{{name}}, sudah lihat hasil tes kamu?"'
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">Use {"{{name}}"}, {"{{email}}"} for personalization</p>
      </div>

      {/* AI Panel */}
      <div className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-purple-800">✨ AI Assistant</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
              onClick={() => setShowAiPanel(!showAiPanel)}
            >
              {showAiPanel ? "Hide" : "Generate / Refine"}
            </Button>
          </div>
        </div>
        {showAiPanel && (
          <div className="space-y-3 mt-3">
            {/* Generate from scratch */}
            <div>
              <Label className="text-xs text-purple-700">Generate new email from prompt</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Welcome email for new students with 20% discount offer"
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => generateEmailMutation.mutate({
                    prompt: aiPrompt,
                    campaignName,
                    stepNumber,
                    totalSteps,
                  })}
                  disabled={aiPrompt.length < 5 || generateEmailMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {generateEmailMutation.isPending ? "⏳" : "✨ Generate"}
                </Button>
              </div>
            </div>
            {/* Refine existing */}
            <div>
              <Label className="text-xs text-blue-700">Refine current email</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={aiRefinePrompt}
                  onChange={(e) => setAiRefinePrompt(e.target.value)}
                  placeholder="e.g., Make it shorter, add urgency, change tone to casual"
                  className="flex-1 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refineEmailMutation.mutate({
                    currentHtml: blocksToEmailHtml(blocks),
                    currentSubject: subject,
                    feedback: aiRefinePrompt,
                    campaignName,
                  })}
                  disabled={aiRefinePrompt.length < 3 || refineEmailMutation.isPending}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {refineEmailMutation.isPending ? "⏳" : "🔄 Refine"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Editor Area */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Block Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Block Palette */}
          <div className="flex gap-1 mb-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium self-center mr-1">Add:</span>
            {BLOCK_TEMPLATES.map((template) => (
              <button
                key={template.type}
                onClick={() => addBlock(template.type)}
                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors"
                title={`Add ${template.label} block`}
              >
                {template.icon} {template.label}
              </button>
            ))}
          </div>

          {/* Blocks List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(block.id === selectedBlockId ? null : block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    onUpdate={updateBlock}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-[340px] flex flex-col shrink-0">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold text-gray-500">Live Preview</Label>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`px-2 py-1 text-xs rounded ${
                  previewMode === "desktop" ? "bg-white shadow text-gray-900" : "text-gray-500"
                }`}
              >
                🖥️ Desktop
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`px-2 py-1 text-xs rounded ${
                  previewMode === "mobile" ? "bg-white shadow text-gray-900" : "text-gray-500"
                }`}
              >
                📱 Mobile
              </button>
            </div>
          </div>
          <div className="flex-1 border rounded-lg bg-gray-100 overflow-hidden flex items-start justify-center p-2">
            <iframe
              ref={previewIframeRef}
              title="Email Preview"
              className="bg-white rounded shadow-sm border"
              style={{
                width: previewMode === "desktop" ? 320 : 200,
                height: "100%",
                minHeight: 400,
                transform: previewMode === "desktop" ? "scale(0.53)" : "scale(0.53)",
                transformOrigin: "top center",
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
