"use client";

import { useCallback, useMemo } from "react";
import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  blockTypeSelectItems,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbarProps,
  useBlockNoteEditor,
} from "@blocknote/react";
import { Baseline, Ellipsis, MessageSquarePlus, Smile } from "lucide-react";

const AI_SKILLS = ["Improve writing", "Proofread", "Explain", "Reformat"];

/**
 * Notion tarzı kompakt, dikey seçim menüsü. BlockNote'un varsayılan yatay
 * FormattingToolbar'ının yerine geçer; pozisyonlama, viewport clamping,
 * scroll/escape/dış tık kapatma davranışı FormattingToolbarController'dan
 * (floating-ui tabanlı) miras kalır — burada sadece içerik/yerleşim değişir.
 */
export const TextSelectionMenu = (_props: FormattingToolbarProps) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const handleClearFormatting = useCallback(() => {
    editor.focus();
    const activeStyles = editor.getActiveStyles();
    if (Object.keys(activeStyles).length > 0) {
      editor.removeStyles(activeStyles);
    }
  }, [editor]);

  // BlockNote'un varsayılan dictionary'sinde paragraph label'ı "Paragraph" —
  // Notion referansındaki "Normal Text" ile eşleştirmek için tek satır relabel.
  const blockTypeItems = useMemo(
    () =>
      blockTypeSelectItems(editor.dictionary).map((item) =>
        item.type === "paragraph" ? { ...item, name: "Normal Text" } : item,
      ),
    [editor.dictionary],
  );

  return (
    <div className="zsm-menu" role="toolbar" aria-label="Text formatting">
      <div className="zsm-blocktype-row">
        <BlockTypeSelect items={blockTypeItems} />
      </div>

      <div className="zsm-divider" />

      <div className="zsm-icon-row">
        <ColorStyleButton />
        <BasicTextStyleButton basicTextStyle="bold" />
        <BasicTextStyleButton basicTextStyle="italic" />
        <BasicTextStyleButton basicTextStyle="underline" />
      </div>
      <div className="zsm-icon-row">
        <CreateLinkButton />
        <BasicTextStyleButton basicTextStyle="strike" />
        <BasicTextStyleButton basicTextStyle="code" />
        <button
          type="button"
          className="zsm-icon-btn"
          title="Clear formatting"
          aria-label="Clear formatting"
          onClick={handleClearFormatting}
        >
          <Baseline className="zsm-icon" size={20} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="zsm-icon-btn"
          disabled
          title="More formatting options (coming soon)"
          aria-label="More formatting options"
        >
          <Ellipsis
            className="zsm-icon zsm-more-icon"
            size={16}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="zsm-divider" />

      <div className="zsm-comment-row">
        <button
          type="button"
          className="zsm-row-btn"
          disabled
          title="Comments are not available yet"
        >
          <MessageSquarePlus className="zsm-icon" size={20} strokeWidth={1.75} />
          <span>Comment</span>
        </button>
        <button
          type="button"
          className="zsm-icon-btn"
          disabled
          title="Coming soon"
          aria-label="Add reaction"
        >
          <Smile className="zsm-icon" size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div className="zsm-divider" />

      <div className="zsm-ai-section">
        <span className="zsm-label">Skills</span>
        {AI_SKILLS.map((skill) => (
          <button
            key={skill}
            type="button"
            className="zsm-row-btn zsm-ai-skill"
            disabled
            title="AI is not connected yet"
          >
            {skill}
          </button>
        ))}
        <button
          type="button"
          className="zsm-ai-input"
          disabled
          title="AI is not connected yet"
        >
          <span className="zsm-ai-input-label">Edit with AI</span>
          <span className="zsm-shortcut">Alt+⇧+E</span>
        </button>
      </div>
    </div>
  );
};

export default TextSelectionMenu;
