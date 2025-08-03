"use client";

import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Underline, Strikethrough, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Toolbar = ({ editor, T }: { editor: Editor | null, T: any }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="border-b border-input p-1 flex items-center gap-1 flex-wrap">
            <Button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" title={T?.bold || 'Bold'}> <Bold className="h-4 w-4" /> </Button>
            <Button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" title={T?.italic || 'Italic'}> <Italic className="h-4 w-4" /> </Button>
            <Button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().chain().focus().toggleUnderline().run()} variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" title={T?.underline || 'Underline'}> <Underline className="h-4 w-4" /> </Button>
            <Button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" title={T?.strikethrough || 'Strikethrough'}> <Strikethrough className="h-4 w-4" /> </Button>
            <Button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().chain().focus().toggleBulletList().run()} variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" title={T?.bulletList || 'Bullet List'}> <List className="h-4 w-4" /> </Button>
        </div>
    );
};

export interface RichTextEditorProps {
    content: string;
    onChange: (richText: string) => void;
    T?: any; // i18n object
    placeholder?: string;
}

export function RichTextEditor({ content, onChange, T, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ 
                heading: false,
                blockquote: false,
                codeBlock: false,
                hardBreak: false,
                horizontalRule: false,
             }),
            TiptapUnderline,
            Link.configure({
                autolink: true,
                openOnClick: true,
                linkOnPaste: true,
            })
        ],
        content: content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        immediatelyRender: false,
        editorProps: {
            attributes: { 
                class: 'tiptap-content min-h-[150px] w-full bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
            },
        },
    });
    
    // Set placeholder dynamically
    React.useEffect(() => {
        if (editor && placeholder) {
            editor.extensionManager.extensions.find(ext => ext.name === 'placeholder')?.options.update({
                placeholder: placeholder,
            });
        }
    }, [editor, placeholder]);
    
    return (
        <div className="w-full rounded-md border-2 border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <Toolbar editor={editor} T={T} />
            <EditorContent editor={editor} />
        </div>
    );
}