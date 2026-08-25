"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import useMeasure from "react-use-measure";
import {
  Tree,
  NodeRendererProps,
  MoveHandler,
  adjustMoveIndex,
} from "react-arborist";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn, getDocumentLabel } from "@/lib/utils";
import { usePeek } from "@/hooks/usePeek";
import { useLiveTitleDrafts } from "@/hooks/useLiveTitleDrafts";
import { Item } from "./Item";
import { EmptyChildrenRow } from "./EmptyChildrenRow";
import { DatabaseIcon } from "./icons/DatabaseIcon";
import { PageIcon } from "./icons/PageIcon";

// Spec exact: 30px row height, 1px gap between rows, 8px indent step
// Notion yoğunluğu 30px + 1px gap'ten geliyor.
const ROW_HEIGHT = 30;

interface TreeDocument {
  id: string;
  document: Doc<"documents"> | null;
  /** Gerçek bir page değil — "No pages inside" boş-state placeholder'ı. */
  empty?: boolean;
  children: TreeDocument[];
}

const compareDocuments = (a: Doc<"documents">, b: Doc<"documents">) => {
  if (a.order === undefined && b.order === undefined) {
    return b._creationTime - a._creationTime;
  }
  if (a.order === undefined) return -1;
  if (b.order === undefined) return 1;
  return a.order - b.order;
};

/**
 * Flat `documents` listesinden gerçek bir ebeveyn-çocuk ağacı kurar. Eski
 * "tek düzleştirilmiş liste + visited seti" yaklaşımı, çökmüş bir dalın
 * çocuklarını yanlışlıkla köke düz basıyordu (visited'a hiç girmedikleri
 * için "yetim" sanılıyorlardı) — burada her belge SADECE kendi gerçek
 * ebeveyninin `children` dizisine ekleniyor, bu sınıf hata artık yapısal
 * olarak mümkün değil.
 */
function buildTree(
  documents: Doc<"documents">[] | undefined,
  rootId?: Id<"documents">,
): TreeDocument[] | undefined {
  if (!documents) return undefined;

  const byId = new Map(documents.map((d) => [d._id, d]));
  const byParent = new Map<string, Doc<"documents">[]>();
  for (const d of documents) {
    const key = d.parentDocument ?? "root";
    byParent.set(key, [...(byParent.get(key) ?? []), d]);
  }
  for (const siblings of byParent.values()) siblings.sort(compareDocuments);

  const buildNode = (doc: Doc<"documents">): TreeDocument => {
    const children = (byParent.get(doc._id) ?? []).map(buildNode);
    // Notion davranışı: çocuğu olmayan bir sayfa genişletildiğinde
    // "No pages inside" pasif satırı gösterilir. Bunu sağlamak için
    // leaf node'a sentetik bir boş-state child ekliyoruz — arborist
    // sadece verideki children'lar için satır yeri ayırır, o yüzden
    // placeholder gerçek bir child düğümü olmalı. Kapalıyken arborist
    // children render etmez; açıldığında placeholder satırı görünür.
    if (children.length === 0) {
      return {
        id: doc._id,
        document: doc,
        children: [
          {
            id: `empty:${doc._id}`,
            document: null,
            empty: true,
            children: [],
          },
        ],
      };
    }
    return { id: doc._id, document: doc, children };
  };

  if (rootId) {
    return (byParent.get(rootId) ?? []).map(buildNode);
  }

  // Kök seviye: gerçek kök belgeler + ebeveyni artık mevcut olmayan
  // (silinmiş) yetim belgeler kendi başlarına kök sayılır — bkz.
  // documents.remove'un recursive olmaması (CLAUDE.md "Known pre-existing
  // issues"): bir ebeveyn hard-delete edildiğinde çocukları böyle yetim
  // kalabiliyor, bu görünürlüğü kaybetmesinler diye bilerek kök seviyeye
  // düşürülüyor.
  const roots = documents.filter(
    (d) => !d.parentDocument || !byId.has(d.parentDocument),
  );
  roots.sort(compareDocuments);
  return roots.map(buildNode);
}

const NavDrawerFlagContext = createContext(false);

/**
 * Sürükle-bırak sırasında react-arborist bir satırı render eden component
 * referansının KARARLI kalmasını bekler — her render'da yeniden tanımlanan
 * bir fonksiyon geçersek (ör. DocumentList'in içinde closure olarak) tüm alt
 * ağaç her render'da (her tuş vuruşunda güncellenen canlı başlık taslağı
 * dahil) yeniden mount edilir, bu da sürükleme sırasında state kaybına yol
 * açar. Bu yüzden Node component'i modül seviyesinde, kendi hook'larını
 * (router/params/peek/toggleFavorite) kendisi çağıracak şekilde tanımlı —
 * DocumentList'ten hiçbir prop closure'ı almıyor, sadece navDrawer bayrağını
 * Context'ten okuyor.
 */
function TreeNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<TreeDocument>) {
  const router = useRouter();
  const params = useParams();
  const peek = usePeek();
  const navDrawer = useContext(NavDrawerFlagContext);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const draftTitle = useLiveTitleDrafts((state) => state.drafts[node.id]);

  // Sentetik boş-state satırı: gerçek page değil, sadece pasif açıklama.
  const { document, empty } = node.data;

  if (empty || !document) {
    return <EmptyChildrenRow level={node.level} style={style} />;
  }

  const label = getDocumentLabel(draftTitle ?? document.title, document.type);

  const onRedirect = (event: React.MouseEvent) => {
    // Alt+Click (Notion'da doğrulanan davranış): var olan sayfayı side
    // peek'te açar, normal click mevcut tam navigasyonu korur.
    if (event.altKey) {
      peek.onOpen(document._id, { mode: "side" });
      return;
    }
    router.push(`/documents/${document._id}`);
  };

  const onToggleFavorite = () => {
    const promise = toggleFavorite({ id: document._id });
    promise.catch(() => toast.error("Failed to update favorites."));
  };

  return (
    <div ref={dragHandle} style={style}>
      <Item
        id={document._id}
        onClick={onRedirect}
        label={label}
        icon={document.type === "database" ? DatabaseIcon : PageIcon}
        documentIcon={document.icon}
        active={params.documentId === document._id}
        level={node.level}
        onExpand={() => node.toggle()}
        expanded={node.isOpen}
        isFavorite={document.isFavorite}
        onFavorite={onToggleFavorite}
        navDrawer={navDrawer}
        hasChildren={!node.isLeaf}
        applyIndent={false}
      />
    </div>
  );
}

interface DocumentListProps {
  navDrawer?: boolean;
  /** Verilirse ağaç tüm workspace yerine sadece bu belgenin altındaki
   * alt ağaca daralır (ör. Favorites'te bir sayfayı genişletmek). */
  rootId?: Id<"documents">;
  /** Ana sidebar ağacının DIŞINDA (ör. Favorites içinde) render edilen
   * daralmış bir ağaç için sürüklemeyi kapatır — o bağlamda taşıma hedefi
   * belirsiz olurdu. */
  disableDrag?: boolean;
  height?: number;
}

export const DocumentList = ({
  navDrawer,
  rootId,
  disableDrag,
  height,
}: DocumentListProps) => {
  const update = useMutation(api.documents.update);
  const reorder = useMutation(api.documents.reorder);
  const documents = useQuery(api.documents.getSearch);
  const [measureRef, bounds] = useMeasure();
  const [isScrolled, setIsScrolled] = useState(false);

  // Genişletme durumu localStorage'da saklanır — F5'te "nasıl bırakıldıysa
  // öyle" kalır. react-arborist `openByDefault` varsayılanı true olduğu için
  // her yenilemede tüm dallar açık geliyordu; burada açık/kapalı map'ini
  // kalıcı tutup sadece o map'i `initialOpenState` olarak veriyoruz.
  const openStorageKey = useMemo(
    () => (rootId ? `zotion:sidebar-open:${rootId}` : "zotion:sidebar-open"),
    [rootId],
  );

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(openStorageKey);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const handleToggle = (id: string) => {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? false) };
      try {
        window.localStorage.setItem(openStorageKey, JSON.stringify(next));
      } catch {
        // localStorage kısıtlıysa sessizce geç — sadece bu oturumda geçerli olur.
      }
      return next;
    });
  };

  const treeData = useMemo(
    () => buildTree(documents, rootId),
    [documents, rootId],
  );

  const onMove: MoveHandler<TreeDocument> = ({
    dragIds,
    dragNodes,
    parentId,
    index,
  }) => {
    if (dragIds.length !== 1 || !documents) return;

    const id = dragIds[0] as Id<"documents">;

    // "No pages inside" placeholder satırının nest-bölgesine bırakıldığında
    // react-arborist `parentId` olarak sentetik id (örn. "empty:<parentId>")
    // verir. Bu id gerçek bir belge değil — `documents.update` bunu
    // `ctx.db.get` ile bulamayıp "Target page not found." fırlatırdı
    // ("Server Error Called by client"). Placeholder "şu sayfanın içi" demek
    // olduğundan, sentetik id'yi gerçek ebeveynin id'sine çeviriyoruz.
    const rawParentId = parentId ?? undefined;
    const resolvedParentId =
      typeof rawParentId === "string" && rawParentId.startsWith("empty:")
        ? rawParentId.slice("empty:".length)
        : rawParentId;
    const newParentId = resolvedParentId as Id<"documents"> | undefined;
    const previousParent = dragNodes[0]?.data.document?.parentDocument;

    const siblingIds = documents
      .filter((d) => (d.parentDocument ?? undefined) === newParentId)
      .sort(compareDocuments)
      .map((d) => d._id);
    const newOrder = adjustMoveIndex({ index, dragIds, siblingIds });

    // Döngü/yetkisiz taşıma koruması documents.update'teki
    // assertValidReparent'ta yapılıyor — burada sadece çağırıp olası hatayı
    // toast ile yüzeye çıkarıyoruz.
    const reparent = newParentId
      ? update({ id, parentDocument: newParentId })
      : update({ id, unparent: true });

    const promise = reparent.then(() =>
      reorder({ id, parentDocument: newParentId, newOrder }),
    );

    if (previousParent === newParentId) {
      // Aynı ebeveyn içinde sıradan sıralama — Notion'da toast göstermeyen
      // davranışla birebir aynı.
      promise.catch(() => toast.error("Failed to reorder page."));
      return;
    }

    // Farklı ebeveyne taşıma da sessiz — sonuç sidebar'da zaten görünüyor.
    // Hata mesajı sunucudan geliyor (döngüsel taşıma vb.), o korunuyor.
    promise.catch((error) =>
      toast.error(
        error instanceof Error ? error.message : "Failed to move page.",
      ),
    );
  };

  if (treeData === undefined) {
    return (
      <>
        <Item.Skeleton />
        <Item.Skeleton />
        <Item.Skeleton />
      </>
    );
  }

  // react-window (react-arborist'in altında) sayısal, 0'dan büyük bir
  // height bekliyor — react-use-measure ilk render'da 0 döndürüyor, o an
  // için 1px'e düşüp bir sonraki ölçümde gerçek yüksekliğe geçiyoruz.
  const resolvedHeight = height ?? (bounds.height || 1);

  return (
    <NavDrawerFlagContext.Provider value={!!navDrawer}>
      <div ref={measureRef} className="relative h-full w-full">
        <div
          className={cn(
            "sidebar-scroll-shadow pointer-events-none absolute inset-x-0 top-0 z-10 h-2 opacity-0 transition-opacity duration-100",
            isScrolled && "opacity-100",
          )}
        />
        <Tree<TreeDocument>
          data={treeData}
          width={bounds.width || undefined}
          height={resolvedHeight}
          rowHeight={ROW_HEIGHT}
          indent={8}
          idAccessor="id"
          childrenAccessor="children"
          className="sidebar-scroll"
          disableEdit
          disableDrag={disableDrag}
          disableMultiSelection
          openByDefault={false}
          initialOpenState={openMap}
          onToggle={handleToggle}
          onMove={onMove}
          onScroll={({ scrollOffset }) => setIsScrolled(scrollOffset > 0)}
        >
          {TreeNode}
        </Tree>
      </div>
    </NavDrawerFlagContext.Provider>
  );
};
