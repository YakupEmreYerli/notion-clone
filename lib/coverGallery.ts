// Notion'un "Gallery" sekmesindeki gibi kategorilere ayrılmış hazır kapak
// görselleri. Tamamı açık erişim müze koleksiyonlarından: The Met Open Access
// (CC0) ve Cleveland Museum of Art Open Access (CC0). Görseller ilgili kurumun
// kendi CDN'inden gösteriliyor, indirilip barındırılmıyor.
//
// Seçim kuralları (lib/coverGallery.ts kapak bandı için küratörlük edilmiştir):
//  - Sadece kamu malı (public domain / CC0) eserler.
//  - Sadece yatay format (en/boy oranı ~1.2–3.2). Dikey eserler geniş kapak
//    bandına kırpıldığında bozuk göründüğü için galeriye alınmaz.
//  - Her URL eklenmeden önce HTTP 200 ile tek tek doğrulanmıştır. Yeni görsel
//    eklerken aynı doğrulamayı yap — 404/403 veren bağlantı galeriye girmemeli.
//
// Met tarafında "original" türevi, Cleveland tarafında "_print" türevi
// kullanılır — küçük "web-large"/"_web" türevleri tam genişlik bir kapak
// bandında belirgin şekilde bulanık görünüyordu (bkz. met()/cma() altındaki
// not). next/image bu daha büyük kaynakları sunucu tarafında zaten yeniden
// boyutlandırıp sıkıştırıyor, tarayıcıya ham dosya gitmiyor.

export interface GalleryImage {
  url: string;
  label: string;
  detail?: string;
}

export interface GalleryCategory {
  name: string;
  images: GalleryImage[];
}

// "web-large" küçük — bu koleksiyondaki 55 görselin 47'sinde en uzun kenar
// ~600px'e sabit, tam genişlik bir kapak bandında (~1400px+) belirgin
// şekilde bulanık/piksel piksel görünüyordu. "original" türevi aynı
// department+file için gerçek yüksek çözünürlük veriyor (ör. DP130155.jpg:
// 600x403 → 3859x2594) — next/image zaten sunucu tarafında yeniden
// boyutlandırıp sıkıştırdığı için tarayıcıya ham dosya gitmiyor.
const met = (department: string, file: string) =>
  `https://images.metmuseum.org/CRDImages/${department}/original/${file}`;

const cma = (path: string) => `https://openaccess-cdn.clevelandart.org/${path}`;

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    name: "Japon Baskıları — Hokusai ve Hiroshige",
    images: [
      { url: met("as", "DP130155.jpg"), label: "Katsushika Hokusai", detail: "Kanagawa Açıklarında Büyük Dalga, 1830–32" },
      { url: met("as", "DP141025.jpg"), label: "Katsushika Hokusai", detail: "Tōkaidō Yolunda Hodogaya, 1830–32" },
      { url: met("as", "DP120489.jpg"), label: "Utagawa Hiroshige", detail: "Tōto, Ryōgoku, 1858" },
      { url: met("as", "DP120490.jpg"), label: "Utagawa Hiroshige", detail: "Koshigaya'dan Fuji Dağı, 1858" },
      { url: met("as", "DP120497.jpg"), label: "Utagawa Hiroshige", detail: "Sagami'de Miura Denizi, 1858" },
      { url: met("as", "DP120496.jpg"), label: "Utagawa Hiroshige", detail: "İzu Dağlarından Fuji, 1858" },
      { url: met("as", "DP120491.jpg"), label: "Utagawa Hiroshige", detail: "Yedi-ri Sahilinden Fuji Dağı, 1858" },
      { url: met("as", "DP122118.jpg"), label: "Utagawa Hiroshige", detail: "Karasaki'de Gece Yağmuru, 1835" },
    ],
  },
  {
    name: "Ukiyo-e — Mevsimler ve Kar",
    images: [
      { url: met("as", "DP124460.jpg"), label: "Utagawa Kunisada", detail: "Landscape in the Mist, mid-19th century" },
      { url: met("as", "DP141240.jpg"), label: "Katsushika Hokusai", detail: "Snow on the Sumida River (Sumida), from the series, Snow, Moon, and Flowers…, ca. 1833" },
      { url: met("as", "DP135541.jpg"), label: "Utagawa Toyokuni II", detail: "Night Rain at Ōyama, from the series 'Eight Famous Views of Kanagawa', ca. 1830" },
      { url: met("as", "DP124461.jpg"), label: "Utagawa Kunisada", detail: "Rain of the Fifth Month (Samidare), 19th century" },
      { url: met("as", "DP141239.jpg"), label: "Katsushika Hokusai", detail: "Old View of the Boat-bridge at Sano in Kōzuke Province (Kōzuke Sano funabas…, ca. 1830" },
      { url: met("as", "DP141015.jpg"), label: "Katsushika Hokusai", detail: "Morning after the Snow at Koishikawa in Edo (Koishikawa yuki no ashita), fr…, ca. 1830–32" },
      { url: met("as", "DP142281.jpg"), label: "Katsushika Isai", detail: "Winter Farming Scene; (verso) Autumn Farming Scene" },
    ],
  },
  {
    name: "Hudson River Okulu — Amerikan Manzarası",
    images: [
      { url: met("ad", "DP-12550-001.jpg"), label: "Thomas Cole", detail: "Mount Holyoke'tan Görünüm (The Oxbow), 1836" },
      { url: met("ad", "DT82.jpg"), label: "Albert Bierstadt", detail: "Kayalık Dağlar, Lander's Peak, 1863" },
      { url: met("ad", "DT78.jpg"), label: "Frederic Edwin Church", detail: "And Dağlarının Kalbi, 1859" },
      { url: met("ad", "DT84.jpg"), label: "John Frederick Kensett", detail: "Lake George, 1869" },
      { url: met("ad", "ap74.20.jpg"), label: "John Frederick Kensett", detail: "Lake George, Etüt, 1872" },
      { url: met("ad", "ap25.110.5.jpg"), label: "John Frederick Kensett", detail: "Conesus Gölünde Yaz Günü, 1870" },
      { url: met("ad", "DT75.jpg"), label: "Asher Brown Durand", detail: "Kayın Ağaçları, 1845" },
    ],
  },
  {
    name: "İzlenimcilik",
    images: [
      { url: met("ep", "DP-42549-001.jpg"), label: "Vincent van Gogh", detail: "Selvili Buğday Tarlası, 1889" },
      { url: met("ep", "DP130999.jpg"), label: "Vincent van Gogh", detail: "Selviler, 1889" },
      { url: met("ep", "DP346474.jpg"), label: "Vincent van Gogh", detail: "Süsenler, 1890" },
      { url: met("ep", "DP-43276-001.jpg"), label: "Edgar Degas", detail: "Yelpazeli Dansçı, 1880" },
      { url: met("ep", "DP-20101-001.jpg"), label: "Edgar Degas", detail: "Dans Dersi, 1874" },
      { url: met("ep", "DP-35674-001.jpg"), label: "Auguste Renoir", detail: "Madame Charpentier ve Çocukları, 1878" },
      { url: met("ep", "DP375450_cropped.jpg"), label: "Georges Seurat", detail: "Sirk Gösterisi, 1887–88" },
      { url: met("ep", "DP341200.jpg"), label: "Gustave Caillebotte", detail: "Bahçede Krizantemler, 1893" },
    ],
  },
  {
    name: "İzlenimcilik Sonrası",
    images: [
      { url: met("ep", "DP-25465-001.jpg"), label: "Edouard Manet", detail: "The Monet Family in Their Garden at Argenteuil, 1874" },
      { url: met("ep", "DT1042.jpg"), label: "Camille Pissarro", detail: "The Garden of the Tuileries on a Spring Morning, 1899" },
      { url: met("ep", "DP130325.jpg"), label: "Alfred Sisley", detail: "View of Marly-le-Roi from Coeur-Volant, 1876" },
      { url: met("ep", "DP323410.jpg"), label: "Alfred Sisley", detail: "The Seine at Bougival, 1876" },
      { url: met("ep", "DT1859.jpg"), label: "Camille Pissarro", detail: "Jalais Hill, Pontoise, 1867" },
      { url: met("ep", "DT1947.jpg"), label: "Vincent van Gogh", detail: "Shoes, 1888" },
    ],
  },
  {
    name: "Avrupa Manzara Resmi",
    images: [
      { url: met("ep", "DP148490.jpg"), label: "Nicolas Poussin", detail: "Blind Orion Searching for the Rising Sun, 1658" },
      { url: met("ep", "DT1967.jpg"), label: "Gustave Courbet", detail: "Young Ladies of the Village, 1851–52" },
      { url: met("ep", "DP213831.jpg"), label: "Andrea Mantegna", detail: "The Adoration of the Shepherds, shortly after 1450" },
      { url: met("ep", "DT2013.jpg"), label: "Camille Corot", detail: "Hagar in the Wilderness, 1835" },
      { url: cma("1917.1335/1917.1335_print.jpg"), label: "Thomas Cole", detail: "View of Schroon Mountain, Essex County, New York, After a Storm, 1838" },
      { url: cma("1967.5/1967.5_print.jpg"), label: "John Frederick Kensett", detail: "An October Day in the White Mountains, 1854" },
      { url: cma("2010.19/2010.19_print.jpg"), label: "Jean Achille Benouville", detail: "Landscape with Rider on White Horse, 1846" },
      { url: cma("2015.518/2015.518_print.jpg"), label: "Kano Motonobu", detail: "Landscape, mid-1500s" },
    ],
  },
  {
    name: "Klasik Fotoğraf",
    images: [
      { url: met("ph", "DT1173.jpg"), label: "Carleton E. Watkins", detail: "View on the Columbia, Cascades, 1867" },
      { url: met("ph", "DT1150.jpg"), label: "Marie-Charles-Isidore Choiselat", detail: "[Landscape], 1844" },
      { url: met("ph", "DT1171.jpg"), label: "Carleton E. Watkins", detail: "The Town on the Hill, New Almaden, 1863" },
      { url: met("ph", "DP73321.jpg"), label: "European Views", detail: "The Mansion House, 1850s–1910s" },
    ],
  },
  {
    name: "Halı ve Tekstil Desenleri",
    images: [
      { url: cma("1952.511/1952.511_print.jpg"), label: "Spain, Alcaraz?, Mudejar, 15th century", detail: "Spanish Carpet with a Turkish Pattern, c. 1450–1500" },
      { url: cma("1928.205/1928.205_print.jpg"), label: "Imperial Manufactory", detail: "Fragments of a Carpet, 1600–1650" },
      { url: cma("1950.558/1950.558_print.jpg"), label: "Iran or Iraq, Seljuk period", detail: "Fragment with gold leaf lions, 1000s–1100s" },
      { url: met("is", "DP148549.jpg"), label: "The Met", detail: "Carpet, ca. 1800" },
      { url: met("is", "DP168735.jpg"), label: "The Met", detail: "Mamluk Carpet, early 16th century" },
      { url: met("is", "DP227051.jpg"), label: "The Met", detail: "Silk Kashan Carpet, 16th century" },
    ],
  },
];
