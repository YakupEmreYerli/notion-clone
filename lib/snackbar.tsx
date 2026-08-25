import { toast } from "sonner";

// Notion'ın snackbar'ı: sayfanın altında ortalanmış, TERS renkli (açık
// temada koyu, koyu temada açık) bir hap. İçinde tek bir eylem bağlantısı
// olabilir ("Restore").
//
// Ölçüler kullanıcının paylaştığı Notion DOM'undan alındı: 8px radius,
// 11px/16px padding, 14px metin, büyük gölge.
//
// Bu, uygulamadaki TEK başarı bildirimi biçimi. Geri kalan her yerde
// başarı sessizdir; toast yalnızca hata için çıkar. Sebep: başarılı bir
// işlemin sonucu zaten ekranda görünüyor, üstüne bildirim koymak gürültü
// (bkz. docs/memory/decisions.md).

type SnackbarAction = {
  label: string;
  onClick: () => void;
};

export function snackbar(message: string, action?: SnackbarAction) {
  toast(message, {
    action,
    // `unstyled` sonner'ın kendi hap stilini kapatır; aşağısı tamamen bizim.
    unstyled: true,
    classNames: {
      // `!` şart: `toaster-provider.tsx` her toast'a `bg-popover!
      // text-popover-foreground!` dayatıyor, onsuz bu hap açık zeminli ve
      // metni okunmaz koyulukta çıkıyor.
      toast:
        "bg-foreground! text-background! flex items-center rounded-lg border-0! px-4 py-[11px] text-sm shadow-lg",
      // Eylem yazısı hapla tam kontrast DEĞİL: Notion'da da ikincil ağırlıkta
      // duruyor, tam beyaz göz alıyor. Hover'da tam kontrasta çıkar.
      actionButton:
        "text-background/75! hover:text-background! bg-transparent! ms-1 rounded px-2 py-0.5 font-medium hover:bg-background/15!",
    },
  });
}
