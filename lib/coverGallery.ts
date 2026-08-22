// Notion'un "Gallery" sekmesindeki gibi kategorilere ayrılmış hazır kapak
// görselleri. Hepsi gerçek, açık erişimli müze/kurum kaynaklarından —
// The Met'in Open Access koleksiyonu (kamu malı sanat eserleri) ve NASA'nın
// açık görsel arşivi (images-api.nasa.gov, kamu malı). Görseller ilgili
// kurumun kendi CDN'inden doğrudan gösteriliyor, indirilip barındırılmıyor.
// The Met'te API'nin primaryImageSmall karşılığı olan web-large, NASA'da ise
// medium türevi kullanılır; böylece galeri tam çözünürlüklü orijinalleri çekmez.

export interface GalleryImage {
  url: string;
  label: string;
  detail?: string;
}

export interface GalleryCategory {
  name: string;
  images: GalleryImage[];
}

const met = (department: string, file: string) =>
  `https://images.metmuseum.org/CRDImages/${department}/web-large/${file}`;

const nasa = (id: string) =>
  `https://images-assets.nasa.gov/image/${id}/${id}~medium.jpg`;

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    name: "The Met Museum — Japanese Prints",
    images: [
      { url: met("as", "DP130155.jpg"), label: "Katsushika Hokusai", detail: "Under the Wave off Kanagawa, ca. 1830–32" },
      { url: met("as", "DP141025.jpg"), label: "Katsushika Hokusai", detail: "Hodogaya on the Tōkaidō, ca. 1830–32" },
      { url: met("as", "DP120489.jpg"), label: "Utagawa Hiroshige", detail: "Toto, Ryogoku, 1858" },
      { url: met("as", "DP120490.jpg"), label: "Utagawa Hiroshige", detail: "View of Mount Fuji from Koshigaya, 1858" },
      { url: met("as", "DP120497.jpg"), label: "Utagawa Hiroshige", detail: "The Sea at Miura in Sagami Province, 1858" },
      { url: met("as", "DP120496.jpg"), label: "Utagawa Hiroshige", detail: "View of Fuji from the Mountains of Izu, 1858" },
      { url: met("as", "DP120491.jpg"), label: "Utagawa Hiroshige", detail: "View of Mount Fuji from Seven-ri Beach, 1858" },
      { url: met("as", "DP122118.jpg"), label: "Utagawa Hiroshige", detail: "Night Rain at Karasaki, ca. 1835" },
    ],
  },
  {
    name: "The Met Museum — Hudson River School",
    images: [
      { url: met("ad", "DP-12550-001.jpg"), label: "Thomas Cole", detail: "View from Mount Holyoke (The Oxbow), 1836" },
      { url: met("ad", "DT82.jpg"), label: "Albert Bierstadt", detail: "The Rocky Mountains, Lander's Peak, 1863" },
      { url: met("ad", "DT78.jpg"), label: "Frederic Edwin Church", detail: "Heart of the Andes, 1859" },
      { url: met("ad", "DT84.jpg"), label: "John Frederick Kensett", detail: "Lake George, 1869" },
      { url: met("ad", "ap74.20.jpg"), label: "John Frederick Kensett", detail: "Lake George, Free Study, 1872" },
      { url: met("ad", "ap25.110.5.jpg"), label: "John Frederick Kensett", detail: "Summer Day on Conesus Lake, 1870" },
      { url: met("ad", "co.ap.95.13.1_1.jpg"), label: "Asher Brown Durand", detail: "In the Woods, 1855" },
      { url: met("ad", "DT75.jpg"), label: "Asher Brown Durand", detail: "The Beeches, 1845" },
    ],
  },
  {
    name: "The Met Museum — Impressionist Paintings",
    images: [
      { url: met("ep", "DP-42549-001.jpg"), label: "Vincent van Gogh", detail: "Wheat Field with Cypresses, 1889" },
      { url: met("ep", "DP130999.jpg"), label: "Vincent van Gogh", detail: "Cypresses, 1889" },
      { url: met("ep", "DP346474.jpg"), label: "Vincent van Gogh", detail: "Irises, 1890" },
      { url: met("ep", "DT1947.jpg"), label: "Vincent van Gogh", detail: "Shoes, 1888" },
      { url: met("ep", "DP-43276-001.jpg"), label: "Edgar Degas", detail: "Dancer with a Fan, ca. 1880" },
      { url: met("ep", "DP-20101-001.jpg"), label: "Edgar Degas", detail: "The Dance Class, 1874" },
      { url: met("ep", "DP-35674-001.jpg"), label: "Auguste Renoir", detail: "Madame Charpentier and Her Children, 1878" },
      { url: met("ep", "DP375450_cropped.jpg"), label: "Georges Seurat", detail: "Circus Sideshow, 1887–88" },
      { url: met("ep", "DP341200.jpg"), label: "Gustave Caillebotte", detail: "Chrysanthemums in the Garden, 1893" },
    ],
  },
  {
    name: "The Met Museum — Art & Nature",
    images: [
      { url: met("ep", "DT1567.jpg"), label: "Vincent van Gogh", detail: "Wheat Field with Cypresses, 1889" },
      { url: met("ep", "DT2152.jpg"), label: "Claude Monet", detail: "Bridge over a Pond of Water Lilies, 1899" },
      { url: met("ep", "DT1904.jpg"), label: "Paul Cézanne", detail: "The Card Players, 1890–92" },
      { url: met("ep", "DT1861.jpg"), label: "Édouard Manet", detail: "Boating, 1874" },
      { url: met("ep", "DT47.jpg"), label: "Winslow Homer", detail: "The Gulf Stream, 1899" },
      { url: met("as", "DP251139.jpg"), label: "Kiyohara Yukinobu", detail: "Quail and Millet, late 17th century" },
      { url: met("as", "DP251140.jpg"), label: "Japanese Art", detail: "Hanging scroll" },
      { url: met("as", "DP251120.jpg"), label: "Japanese Art", detail: "Landscape study" },
    ],
  },
  {
    name: "NASA — Space & Astronauts",
    images: [
      { url: nasa("201102240008HQ"), label: "NASA", detail: "Space Shuttle Discovery Launch" },
      { url: nasa("jsc2018e078340"), label: "NASA", detail: "Astronauts Practice Spacewalking" },
      { url: nasa("sl4-143-4707"), label: "NASA", detail: "Skylab Space Station in Earth Orbit" },
      { url: nasa("KSC-20190719-PH_FJM01_0035"), label: "NASA", detail: "Apollo 11 50th Anniversary" },
      { url: nasa("iss066e038422"), label: "NASA", detail: "Astronaut on the Space Station" },
      { url: nasa("KSC-20221116-PH-KLS01_0001"), label: "NASA", detail: "Artemis I Launch" },
      { url: nasa("AFRC2022-0229-0014"), label: "NASA", detail: "Aircraft Research" },
      { url: nasa("jsc2020e016587"), label: "NASA", detail: "Earth Observation from Orbit" },
    ],
  },
  {
    name: "NASA — Earth, Nebulae & Galaxies",
    images: [
      { url: nasa("PIA04921"), label: "NASA", detail: "Andromeda Galaxy" },
      { url: nasa("PIA14417"), label: "NASA", detail: "Dumbbell Nebula" },
      { url: nasa("PIA18913"), label: "NASA", detail: "Milky Way Untangled" },
      { url: nasa("PIA02241"), label: "NASA", detail: "Saturn Rings" },
      { url: nasa("PIA12348"), label: "NASA", detail: "Earth from the International Space Station" },
      { url: nasa("PIA14293"), label: "NASA", detail: "Earth at Night" },
      { url: nasa("PIA17171"), label: "NASA", detail: "Earth and Moon" },
      { url: nasa("PIA18033"), label: "NASA", detail: "A Colorful Nebula" },
    ],
  },
];
