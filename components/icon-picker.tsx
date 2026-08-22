"use client";

import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { useState } from "react";
import { useTheme } from "next-themes";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface IconPickerPorps {
  onChange: (icon: string) => void;
  children: React.ReactNode;
  asChild?: boolean;
  /** Notion'da doğrulanan davranış: seçici "Emoji / Icons / Upload / Remove"
   * sekmeleriyle açılır. Bu component sadece emoji-picker-react'i sarmaladığı
   * için Icons (line-icon) ve Upload sekmeleri şu an desteklenmiyor. Remove,
   * aynı popover içinden çıkarılabilecek şekilde burada uygulanıyor. */
  onRemove?: () => void;
  /** Verilmezse iç state kullanılır. Toolbar, ikon var/yok durumuna göre
   * FARKLI bir trigger elemanı (dolayısıyla farklı bir IconPicker örneği)
   * render ettiği için, "Add icon" ile rastgele ikon atanıp yeniden
   * render tetiklendiğinde iç state kaybolurdu — açık/kapalı durumu bu
   * yüzden Toolbar seviyesinde tutulup buraya dışarıdan veriliyor. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const IconPicker = ({
  onChange,
  children,
  asChild,
  onRemove,
  open: openProp,
  onOpenChange,
}: IconPickerPorps) => {
  const { resolvedTheme } = useTheme();
  // Kontrollü kullanımda (Toolbar) dışarıdaki state, aksi halde kendi state'i —
  // seçimden sonra kapatma her iki durumda da çalışsın.
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const currentTheme = (resolvedTheme || "light") as keyof typeof themeMap;

  const themeMap = {
    dark: Theme.DARK,
    light: Theme.LIGHT,
  };

  const theme = themeMap[currentTheme];

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild={asChild}>{children}</PopoverTrigger>
      <PopoverContent className="w-auto border-none p-0 shadow-none">
        {onRemove && (
          <div className="flex justify-end border-b bg-white px-2 py-1 dark:bg-neutral-800">
            <button
              type="button"
              onClick={onRemove}
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              Remove
            </button>
          </div>
        )}
        <EmojiPicker
          height={350}
          theme={theme}
          // Sayfada gösterilen ikon, işletim sisteminin kendi emoji fontuyla
          // çiziliyor. Seçicinin varsayılanı ise Apple görselleri — seçtiğin
          // emoji ile sayfada gördüğün emoji farklı görünüyordu. NATIVE ile
          // ikisi aynı: seçtiğin şey ne görüyorsan o.
          emojiStyle={EmojiStyle.NATIVE}
          // Masaüstünde ana kullanım klavye: popover açılınca arama kutusu
          // odaklanır, yazıp Enter'la seçilebilir.
          autoFocusSearch
          searchPlaceHolder="Search emoji"
          previewConfig={{ showPreview: false }}
          onEmojiClick={(data) => {
            onChange(data.emoji);
            // Notion'daki gibi seçimden sonra kapanır; ayrıca Toolbar'da
            // ikon var/yok trigger'ı değiştiği için açık kalması titremeye
            // sebep oluyordu.
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
