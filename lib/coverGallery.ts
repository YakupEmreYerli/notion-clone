// Notion'un "Gallery" sekmesindeki gibi kategorilere ayrılmış hazır kapak
// görselleri. Kaynaklar açık erişim müze/kamu koleksiyonları ile Texturelabs'in
// kullanım lisanslı dokularıdır. Met ve Cleveland görselleri kurum CDN'lerinden;
// Notion'ın güncel kataloğuyla eşleşen ekler Notion'ın page-cover CDN'inden gelir.
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
  background?: string;
}

export interface GalleryCategory {
  name: string;
  images: GalleryImage[];
  sourceUrl?: string;
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

const notion = (file: string) =>
  `https://app.notion.com/images/page-cover/${file}`;

const notionCategory = (
  name: string,
  sourceUrl: string,
  images: [file: string, label: string][],
): GalleryCategory => ({
  name,
  sourceUrl,
  images: images.map(([file, label]) => ({ url: notion(file), label })),
});

const COVER_COLORS = [
  ["#f87171", "Red"],
  ["#fb923c", "Orange"],
  ["#fbbf24", "Yellow"],
  ["#a3e635", "Lime"],
  ["#34d399", "Green"],
  ["#22d3ee", "Cyan"],
  ["#60a5fa", "Blue"],
  ["#a78bfa", "Purple"],
  ["#f472b6", "Pink"],
  ["#94a3b8", "Slate"],
  ["#1e293b", "Dark slate"],
  ["#ffffff", "White"],
  ["linear-gradient(135deg, #f87171, #fb923c)", "Red orange gradient"],
  ["linear-gradient(135deg, #fbbf24, #a3e635)", "Yellow lime gradient"],
  ["linear-gradient(135deg, #34d399, #22d3ee)", "Green cyan gradient"],
  ["linear-gradient(135deg, #60a5fa, #a78bfa)", "Blue purple gradient"],
  ["linear-gradient(135deg, #f472b6, #fb923c)", "Pink orange gradient"],
  ["linear-gradient(135deg, #a78bfa, #60a5fa)", "Purple blue gradient"],
  ["linear-gradient(135deg, #1e293b, #475569)", "Slate gradient"],
  ["linear-gradient(135deg, #f87171, #a78bfa)", "Red purple gradient"],
] as const;

export const LEGACY_COLOR_CATEGORY: GalleryCategory = {
  name: "More colors & gradients",
  images: COVER_COLORS.map(([url, label]) => ({
    url,
    label,
    background: url,
  })),
};

export const COVER_COLOR_CATEGORY = notionCategory(
  "Color & Gradient",
  "https://cargocollective.com/superfamousimages/36-Gradients",
  [
    ["solid_red.png", "Red"],
    ["solid_yellow.png", "Yellow"],
    ["solid_blue.png", "Blue"],
    ["solid_beige.png", "Beige"],
    ["gradients_8.png", "Gradient 8"],
    ["gradients_4.png", "Gradient 4"],
    ["gradients_2.png", "Gradient 2"],
    ["gradients_11.jpg", "Gradient 11"],
    ["gradients_10.jpg", "Gradient 10"],
    ["gradients_5.png", "Gradient 5"],
    ["gradients_3.png", "Gradient 3"],
  ],
);

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
    name: "Hudson River Okulu — Amerikan Manzarası",
    images: [
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
];

export const NOTION_GALLERY_CATEGORIES: GalleryCategory[] = [
  notionCategory("Texturelabs", "https://texturelabs.org/", [
    ["texturelabs_glass_132S.jpg", "Frosted Glass"],
    ["texturelabs_metal_126S.jpg", "Army Green Painted Metal"],
    ["texturelabs_metal_261S.jpg", "Aqua Color Old Paint"],
    ["texturelabs_glass_125S.jpg", "Hazy Glass"],
    ["texturelabs_fabric_169S.jpg", "Abstract Paint Canvas"],
    ["texturelabs_glass_124S.jpg", "Hazy Frosted Glass"],
    ["texturelabs_metal_212S.jpg", "Oxidized Rusted Metal"],
    ["texturelabs_metal_285S.jpg", "Matte Aged Copper"],
    ["texturelabs_water_135S.jpg", "Ice Surface"],
    ["texturelabs_concrete_146S.jpg", "Weathered Concrete"],
    ["texturelabs_wood_244S.jpg", "Black Painted Age Wood"],
    ["texturelabs_paper_253S.jpg", "Blue Vintage Paper"],
  ]),
  notionCategory(
    "The MET Museum - Hudson River School",
    "https://www.metmuseum.org/art/collection",
    [
      ["hudsonRiverSchool_lakeGeorge.jpg", "John Frederick Kensett"],
      ["hudsonRiverSchool_rockyMountainsLandersPeak.jpg", "Albert Bierstadt"],
      ["hudsonRiverSchool_thanatopsis.jpg", "Asher Brown Durand"],
      ["hudsonRiverSchool_springLandscape.jpg", "Thomas Doughty Church"],
      ["hudsonRiverSchool_catskillEarlyAutumn.jpg", "Thomas Cole"],
      ["hudsonRiverSchool_aegeanSea.jpg", "Frederic Edwin Church"],
      ["hudsonRiverSchool_passingOffOfTheStorm.jpg", "John Frederick Kensett"],
    ],
  ),
  notionCategory("National Museum of Asian Art", "https://asia.si.edu/", [
    [
      "nationalMuseumOfAsianArt_sparrowsFeedingTheirYoung.jpg",
      "Sparrows Feeding Their Young",
    ],
    [
      "nationalMuseumOfAsianArt_landscapeWithGibbonsAndCranes.jpg",
      "Landscape with Gibbons and Cranes",
    ],
    [
      "nationalMuseumOfAsianArt_mountainMistSpringMorning.jpg",
      "Mountain Mist, Spring Morning",
    ],
    [
      "nationalMuseumOfAsianArt_gardenSceneMelonsEggPlantsFlowersAndTwoWeasels.jpg",
      "Garden Scene: Melons, Egg-Plants, Flowers, and Two Weasels",
    ],
  ]),
  notionCategory(
    "USDA Pomological Watercolors",
    "https://commons.wikimedia.org/wiki/Category:USDA_Pomological_Watercolors",
    [
      ["usda_cherries.png", "Cherries"],
      ["usda_pear.png", "Pear"],
      ["usda_apple.png", "Apple"],
      ["usda_oranges.png", "Oranges"],
    ],
  ),
  notionCategory("Artemis II", "https://www.nasa.gov/mission/artemis-ii/", [
    ["artemis_ii_1.jpg", "Crescent Earth"],
    ["artemis_ii_2.jpg", "Near Side and Far Side of the Moon"],
    ["artemis_ii_3.jpg", "Shadows at the Edge of Lunar Day"],
    ["artemis_ii_4.jpg", "Shadows Across Vavilov Crater"],
    ["artemis_ii_5.jpg", "Earthset"],
    ["artemis_ii_6.jpg", "Artemis II in Eclipse"],
    ["artemis_ii_7.jpg", "The Edge of Darkness"],
    ["artemis_ii_8.jpg", "Craters of Time"],
  ]),
  notionCategory("James Webb Telescope", "https://webbtelescope.org/", [
    ["webb1.jpg", "Cosmic Cliffs in Carina"],
    ["webb2.jpg", "Stephan's Quintet"],
    ["webb3.jpg", "Southern Ring Nebula"],
    ["webb4.jpg", "Deep Field"],
  ]),
  notionCategory("NASA Archive", "https://www.flickr.com/photos/nasacommons/", [
    ["nasa_the_blue_marble.jpg", "The Blue Marble"],
    ["nasa_transonic_tunnel.jpg", "Transonic Tunnel"],
    ["nasa_multi-axis_gimbal_rig.jpg", "Multi-Axis Gimbal Rig"],
    ["nasa_eva_during_skylab_3.jpg", "EVA During Skylab 3"],
    ["nasa_eagle_in_lunar_orbit.jpg", "Eagle In Lunar Orbit"],
    ["nasa_buzz_aldrin_on_the_moon.jpg", "Buzz Aldrin on the Moon"],
    ["nasa_ibm_type_704.jpg", "IBM Type 704"],
    ["nasa_wrights_first_flight.jpg", "Wright's First Flight"],
    ["nasa_great_sandy_desert_australia.jpg", "Great Sandy Desert, Australia"],
    ["nasa_space_shuttle_columbia.jpg", "Space Shuttle Columbia"],
    ["nasa_robert_stewart_spacewalk.jpg", "Robert Stewart Spacewalk"],
    ["nasa_space_shuttle_challenger.jpg", "Space Shuttle Challenger"],
    ["nasa_robert_stewart_spacewalk_2.jpg", "Robert Stewart Spacewalk 2"],
    [
      "nasa_space_shuttle_columbia_and_sunrise.jpg",
      "Space Shuttle Columbia and Sunrise",
    ],
    ["nasa_tim_peake_spacewalk.jpg", "Tim Peake Spacewalk"],
    ["nasa_bruce_mccandless_spacewalk.jpg", "Bruce McCandless Spacewalk"],
    ["nasa_new_york_city_grid.jpg", "New York City Grid"],
    ["nasa_fingerprints_of_water_on_the_sand.jpg", "Water on the Sand"],
    ["nasa_carina_nebula.jpg", "Carina Nebula"],
    ["nasa_orion_nebula.jpg", "Orion Nebula"],
    [
      "nasa_reduced_gravity_walking_simulator.jpg",
      "Reduced Gravity Walking Simulator",
    ],
    ["nasa_earth_grid.jpg", "Earth Grid"],
  ]),
  notionCategory(
    "The MET Museum – Patterns",
    "https://www.metmuseum.org/art/collection",
    [
      ["met_william_morris_1877_willow.jpg", "William Morris"],
      ["met_william_morris_1875.jpg", "William Morris"],
      ["met_william_morris_1878.jpg", "William Morris"],
      ["met_silk_kashan_carpet.jpg", "Silk Kashan Carpet"],
    ],
  ),
  notionCategory("Rijksmuseum", "https://www.rijksmuseum.nl/en/rijksstudio", [
    ["rijksmuseum_vermeer_the_milkmaid.jpg", "Johannes Vermeer"],
    ["rijksmuseum_jansz_1649.jpg", "Pieter Jansz"],
    ["rijksmuseum_rembrandt_1642.jpg", "Rembrandt van Rijn"],
    ["rijksmuseum_jansz_1636.jpg", "Pieter Jansz"],
    ["rijksmuseum_jansz_1641.jpg", "Pieter Jansz"],
    ["rijksmuseum_jan_lievens_1627.jpg", "Jan Lievens"],
    ["rijksmuseum_jansz_1637.jpg", "Pieter Jansz"],
    ["rijksmuseum_mignons_1660.jpg", "Abraham Mignon"],
    ["rijksmuseum_avercamp_1620.jpg", "Hendrick Avercamp"],
    ["rijksmuseum_avercamp_1608.jpg", "Hendrick Avercamp"],
    ["rijksmuseum_claesz_1628.jpg", "Pieter Claesz"],
  ]),
  notionCategory(
    "The MET Museum – Japanese Prints",
    "https://www.metmuseum.org/art/collection",
    [
      ["woodcuts_1.jpg", "Katsushika Hokusai"],
      ["woodcuts_2.jpg", "Katsushika Hokusai"],
      ["woodcuts_3.jpg", "Katsushika Hokusai"],
      ["woodcuts_4.jpg", "Keisai Eisen"],
      ["woodcuts_5.jpg", "Kobayashi Kiyochika"],
      ["woodcuts_6.jpg", "Katsushika Hokusai"],
      ["woodcuts_7.jpg", "Katsushika Hokusai"],
      ["woodcuts_8.jpg", "Katsushika Hokusai"],
      ["woodcuts_9.jpg", "Katsushika Hokusai"],
      ["woodcuts_10.jpg", "Katsushika Hokusai"],
      ["woodcuts_11.jpg", "Ito Jakuchu"],
      ["woodcuts_13.jpg", "Utagawa Hiroshige"],
      ["woodcuts_14.jpg", "Katsushika Hokusai"],
      ["woodcuts_15.jpg", "Katsushika Hokusai"],
      ["woodcuts_16.jpg", "Katsushika Hokusai"],
      ["woodcuts_sekka_1.jpg", "Kamisaka Sekka"],
      ["woodcuts_sekka_2.jpg", "Kamisaka Sekka"],
      ["woodcuts_sekka_3.jpg", "Kamisaka Sekka"],
    ],
  ),
  notionCategory("The MET Museum", "https://www.metmuseum.org/art/collection", [
    ["met_vincent_van_gogh_ginoux.jpg", "Vincent van Gogh"],
    ["met_winslow_homer_maine_coast.jpg", "Winslow Homer"],
    ["met_frederic_edwin_church_1871.jpg", "Frederic Edwin Church"],
    ["met_joseph_hidley_1870.jpg", "Joseph Hidley"],
    ["met_jules_tavernier_1878.jpg", "Jules Tavernier"],
    ["met_henry_lerolle_1885.jpg", "Henry Lerolle"],
    ["met_georges_seurat_1884.jpg", "Georges Seurat"],
    ["met_john_singer_sargent_morocco.jpg", "John Singer Sargent"],
    ["met_paul_signac.jpg", "Paul Signac"],
    ["met_vincent_van_gogh_oleanders.jpg", "Vincent van Gogh"],
    ["met_emanuel_leutze.jpg", "Emanuel Leutze"],
    ["met_fitz_henry_lane.jpg", "Fitz Henry Lane"],
    ["met_vincent_van_gogh_cradle.jpg", "Vincent van Gogh"],
    ["met_camille_pissarro_1896.jpg", "Camille Pissarro"],
    ["met_gerome_1890.jpg", "Jean-Léon Gérôme"],
    ["met_arnold_bocklin_1880.jpg", "Arnold Böcklin"],
    ["met_henri_tl_1892.jpg", "Henri de Toulouse-Lautrec"],
    ["met_horace_pippin.jpg", "Horace Pippin"],
    ["met_jean_beraud.jpg", "Jean Béraud"],
    ["met_cezanne_1890.jpg", "Paul Cézanne"],
    ["met_edgar_degas_1874.jpg", "Edgar Degas"],
    ["met_henri_rousseau_1907.jpg", "Henri Rousseau"],
    ["met_vincent_van_gogh_irises.jpg", "Vincent van Gogh"],
    ["met_terracotta_funerary_plaque.jpg", "Terracotta funerary plaque"],
    ["met_william_turner_1835.jpg", "William Turner"],
    ["met_the_unicorn_in_captivity.jpg", "The Unicorn in Captivity"],
    ["met_goya_1789.jpg", "Goya"],
    ["met_bruegel_1565.jpg", "Pieter Bruegel the Elder"],
    ["met_canaletto_1720.jpg", "Canaletto"],
    ["met_klimt_1912.jpg", "Gustav Klimt"],
  ]),
];
