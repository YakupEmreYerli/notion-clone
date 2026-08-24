"use client";

/**
 * Kök layout'un kendisi çökerse devreye girer; bu yüzden kendi <html>/<body>
 * ağacını render etmek zorundadır ve uygulama sağlayıcılarına (tema, Convex)
 * güvenemez — bilinçli olarak stil bağımlılığı yok.
 */
const GlobalError = ({ reset }: { error: Error; reset: () => void }) => {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 500 }}>
          Something went wrong
        </h2>
        <button
          onClick={reset}
          style={{
            border: "1px solid currentColor",
            borderRadius: "6px",
            padding: "6px 14px",
            cursor: "pointer",
            background: "transparent",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
};

export default GlobalError;
