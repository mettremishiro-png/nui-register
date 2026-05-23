import { useMemo, useState } from "react";

const creators = [
  { id: "asami", name: "あさみ", color: "#9333ea" },
  { id: "yurie", name: "ゆりえ", color: "#16a34a" },
  { id: "mikako", name: "みかこ", color: "#18181b" },
];

const creatorItems = {
  asami: [
    { size: "10cm", category: "Tシャツ", price: 600 },
    { size: "10cm", category: "アウター", price: 800 },
  ],
  yurie: [
    { size: "10cm", category: "サロペットセット", price: 1500 },
    { size: "10cm", category: "Tシャツ", price: 700 },
    { size: "10cm", category: "サロペット", price: 900 },
    { size: "10cm", category: "ヘアバンド", price: 500 },
    { size: "15cm", category: "サロペットセット", price: 1800 },
    { size: "15cm", category: "Tシャツ", price: 1000 },
    { size: "15cm", category: "羽根つきTシャツ", price: 1500 },
    { size: "15cm", category: "サロペット", price: 1000 },
  ],
  mikako: [
    { size: "15cm", category: "Tシャツ", price: 1000 },
    { size: "21cm", category: "Tシャツ", price: 1200 },
    { size: "15cm", category: "ジャケット", price: 1200 },
  ],
};

const yen = (num) => `¥${Number(num || 0).toLocaleString()}`;

const shortCategory = (category) => {
  if (category === "Tシャツ") return "T";
  if (category === "アウター") return "A";
  if (category === "トップス") return "TOP";
  if (category === "小物") return "小物";
  if (category === "その他") return "他";
  return category;
};

const shortSize = (size) => {
  if (size === "共通") return "共通";
  return size.replace("cm", "");
};

const makeKey = (creator, item) =>
  `${creator.id}_${item.size}_${item.category}_${item.price}`;

export default function App() {
  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState("");
  const [history, setHistory] = useState([]);
  const [eventName, setEventName] = useState(
    localStorage.getItem("nui_event_name") || ""
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const totalQty = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const change = Math.max((Number(paid) || 0) - total, 0);

  const creatorTotals = useMemo(() => {
    return creators.map((creator) => {
      const rows = cart.filter((item) => item.creatorId === creator.id);
      return {
        ...creator,
        qty: rows.reduce((sum, item) => sum + item.qty, 0),
        total: rows.reduce((sum, item) => sum + item.price * item.qty, 0),
      };
    });
  }, [cart]);

  const addItem = (creator, item) => {
    const key = makeKey(creator, item);
    setCart((prev) => {
      const exists = prev.find((row) => row.key === key);
      if (exists) {
        return prev.map((row) =>
          row.key === key ? { ...row, qty: row.qty + 1 } : row
        );
      }
      return [
        ...prev,
        {
          key,
          creatorId: creator.id,
          creator: creator.name,
          color: creator.color,
          ...item,
          qty: 1,
        },
      ];
    });
  };

  const changeQty = (key, diff) => {
    setCart((prev) =>
      prev
        .map((row) =>
          row.key === key ? { ...row, qty: Math.max(0, row.qty + diff) } : row
        )
        .filter((row) => row.qty > 0)
    );
  };

  const removeItem = (key) => {
    setCart((prev) => prev.filter((row) => row.key !== key));
  };

  const clearCart = () => {
    setCart([]);
    setPaid("");
  };

  const saveEventName = (value) => {
    setEventName(value);
    localStorage.setItem("nui_event_name", value);
  };

  const addPaidDigit = (digit) => {
    setPaid((prev) => {
      if (digit === "C") return "";
      if (digit === "BS") return prev.slice(0, -1);
      if (prev === "0" && digit !== "00") return digit;
      return `${prev}${digit}`;
    });
  };

  const completeSale = () => {
    if (cart.length === 0) return;
    const sale = {
      id: Date.now(),
      eventName,
      time: new Date().toLocaleString("ja-JP"),
      total,
      totalQty,
      paid: Number(paid) || 0,
      change,
      items: cart,
    };
    setHistory((prev) => [sale, ...prev]);
    clearCart();
  };

  const exportCSV = () => {
    const header = [
      "イベント名",
      "会計日時",
      "作家",
      "サイズ",
      "カテゴリ",
      "単価",
      "数量",
      "小計",
      "会計合計",
      "お預かり",
      "お釣り",
    ];

    const rows = history.flatMap((sale) =>
      sale.items.map((item) => [
        sale.eventName,
        sale.time,
        item.creator,
        item.size,
        item.category,
        item.price,
        item.qty,
        item.price * item.qty,
        sale.total,
        sale.paid,
        sale.change,
      ])
    );

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventName || "nui-register"}_sales.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.label}>ぬい服即売会用</div>
          <h1 style={styles.title}>高速会計レジ</h1>
        </div>
        <div style={styles.eventBox}>
          <label style={styles.smallLabel}>イベント名</label>
          <input
            value={eventName}
            onChange={(e) => saveEventName(e.target.value)}
            placeholder="例：arteVarie / ぬいFes"
            style={styles.eventInput}
          />
        </div>
      </header>

      <div style={styles.layout}>
        <main style={styles.main}>
          {creators.map((creator) => (
            <section key={creator.id} style={styles.creatorSection}>
              <h2 style={{ ...styles.creatorTitle, color: creator.color }}>
                {creator.name}
              </h2>
              <div style={styles.buttonGrid}>
                {creatorItems[creator.id].map((item) => (
                  <button
                    key={makeKey(creator, item)}
                    onClick={() => addItem(creator, item)}
                    style={{ ...styles.itemButton, background: creator.color }}
                  >
                    <div style={styles.buttonMain}>{shortSize(item.size)} {shortCategory(item.category)}</div>
                    <div style={styles.buttonPrice}>{yen(item.price)}</div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </main>

        <aside style={styles.side}>
          

          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>会計中</h2>

            {cart.length === 0 ? (
              <div style={styles.empty}>左のボタンを押すとここに入ります</div>
            ) : (
              cart.map((item) => (
                <div key={item.key} style={styles.cartRow}>
                  <div>
                    <span style={{ ...styles.creatorChip, background: item.color }}>
                      {item.creator}
                    </span>
                    <div style={styles.cartName}>
                      {item.size} / {item.category}
                    </div>
                    <div style={styles.cartSub}>
                      {yen(item.price)} × {item.qty} = {yen(item.price * item.qty)}
                    </div>
                  </div>
                  <div style={styles.qtyBox}>
                    <button style={styles.qtyButton} onClick={() => changeQty(item.key, -1)}>
                      −
                    </button>
                    <strong style={styles.qtyNum}>{item.qty}</strong>
                    <button style={styles.qtyButton} onClick={() => changeQty(item.key, 1)}>
                      ＋
                    </button>
                    <button style={styles.deleteButton} onClick={() => removeItem(item.key)}>
                      削除
                    </button>
                  </div>
                </div>
              ))
            )}


            <div style={styles.changeBox}>
              <div style={styles.smallLabel}>合計 / {totalQty}点</div>
              <div style={styles.total}>{yen(total)}</div>
            </div>

            <label style={styles.smallLabel}>お預かり金額</label>
            <div style={styles.paidDisplay}>{paid ? yen(paid) : "¥0"}</div>
            <div style={styles.keypad}>
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "BS"].map((key) => (
                <button
                  key={key}
                  style={key === "BS" ? styles.keypadSubButton : styles.keypadButton}
                  onClick={() => addPaidDigit(key)}
                >
                  {key === "BS" ? "←" : key}
                </button>
              ))}
              <button style={styles.keypadClearButton} onClick={() => addPaidDigit("C")}>
                C
              </button>
            </div>

            <div style={styles.changeBox}>
              <div style={styles.smallLabel}>合計 / {totalQty}点</div>
              <div style={styles.total}>{yen(total)}</div>
              <div style={{ height: 10 }} />
              <div style={styles.smallLabel}>お釣り</div>
              <div style={styles.change}>{yen(change)}</div>
            </div>

            <div style={styles.actionGrid}>
              <button style={styles.clearButton} onClick={clearCart}>
                クリア
              </button>
              <button style={styles.doneButton} onClick={completeSale}>
                会計完了
              </button>
            </div>
          </section>

          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>作家別売上（会計中）</h2>
            {creatorTotals.map((creator) => (
              <div key={creator.id} style={styles.summaryRow}>
                <span>{creator.name}：{creator.qty}点</span>
                <strong>{yen(creator.total)}</strong>
              </div>
            ))}
          </section>

          <section style={styles.panel}>
            <div style={styles.historyHeader}>
              <h2 style={styles.panelTitle}>履歴</h2>
              <button style={styles.csvButton} onClick={exportCSV} disabled={history.length === 0}>
                CSV保存
              </button>
            </div>
            {history.length === 0 ? (
              <div style={styles.empty}>会計完了すると履歴が残ります</div>
            ) : (
              history.slice(0, 10).map((sale) => (
                <div key={sale.id} style={styles.historyRow}>
                  <div>
                    <strong>{sale.time}</strong>
                    <div style={styles.cartSub}>{sale.totalQty}点 / お預かり {yen(sale.paid)}</div>
                  </div>
                  <strong>{yen(sale.total)}</strong>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#18181b",
    padding: 16,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#18181b",
  },
  header: {
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    flexWrap: "wrap",
  },
  label: { color: "#71717a", fontWeight: 700, fontSize: 13 },
  title: { margin: 0, fontSize: 36, lineHeight: 1.1 },
  eventBox: { minWidth: 260, flex: "1 1 300px" },
  smallLabel: { fontSize: 13, color: "#71717a", fontWeight: 800 },
  eventInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 14,
    padding: 12,
    fontSize: 18,
    fontWeight: 700,
    marginTop: 4,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 420px",
    gap: 16,
    alignItems: "start",
  },
  main: { display: "grid", gap: 16 },
  creatorSection: {
    background: "white",
    borderRadius: 24,
    padding: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  creatorTitle: { margin: "0 0 10px", fontSize: 24 },
  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
    gap: 8,
  },
  itemButton: {
    color: "white",
    border: 0,
    borderRadius: 14,
    padding: 10,
    textAlign: "center",
    cursor: "pointer",
    minHeight: 74,
    boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
  },
  buttonMain: { fontSize: 21, fontWeight: 950, lineHeight: 1.1 },
  buttonPrice: { fontSize: 20, fontWeight: 950, marginTop: 6 },
  side: {
    display: "grid",
    gap: 12,
    position: "sticky",
    top: 12,
  },
  panel: {
    background: "white",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  panelDark: {
    background: "#18181b",
    color: "white",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },
  totalLabel: { color: "#d4d4d8", fontWeight: 700 },
  total: { fontSize: 52, fontWeight: 950, lineHeight: 1.1 },
  panelTitle: { margin: "0 0 10px", fontSize: 20 },
  empty: {
    padding: 16,
    border: "2px dashed #d4d4d8",
    borderRadius: 16,
    color: "#71717a",
    textAlign: "center",
    fontWeight: 700,
  },
  cartRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    background: "#18181b",
    color: "white",
    marginBottom: 8,
  },
  creatorChip: {
    color: "white",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 900,
  },
  cartName: { fontSize: 18, fontWeight: 900, marginTop: 4 },
  cartSub: { color: "#d4d4d8", fontSize: 13, fontWeight: 700 },
  qtyBox: { display: "flex", alignItems: "center", gap: 6 },
  qtyButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "1px solid #d4d4d8",
    background: "white",
    color: "black",
    fontSize: 22,
    fontWeight: 900,
    cursor: "pointer",
  },
  qtyNum: { width: 26, textAlign: "center", fontSize: 20 },
  deleteButton: {
    border: 0,
    borderRadius: 999,
    padding: "9px 12px",
    background: "#18181b",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  paidGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 },
  moneyButton: {
    border: 0,
    borderRadius: 14,
    padding: 12,
    fontSize: 17,
    fontWeight: 900,
    background: "#e4e4e7",
    cursor: "pointer",
  },
  paidDisplay: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d4d4d8",
    borderRadius: 16,
    padding: 12,
    fontSize: 28,
    fontWeight: 950,
    margin: "4px 0 8px",
    background: "#fafafa",
    textAlign: "right",
  },
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 10,
  },
  keypadButton: {
    border: 0,
    borderRadius: 14,
    padding: 14,
    background: "#18181b",
    fontSize: 24,
    fontWeight: 950,
    cursor: "pointer",
  },
  keypadSubButton: {
    border: 0,
    borderRadius: 14,
    padding: 14,
    background: "#18181b",
    color: "white",
    fontSize: 24,
    fontWeight: 950,
    cursor: "pointer",
  },
  keypadClearButton: {
    gridColumn: "1 / 4",
    border: 0,
    borderRadius: 14,
    padding: 12,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 20,
    fontWeight: 950,
    cursor: "pointer",
  },
  changeBox: { background: "#fef3c7", borderRadius: 16, padding: 12, marginBottom: 12 },
  change: { fontSize: 34, fontWeight: 950 },
  actionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  clearButton: {
    border: 0,
    borderRadius: 16,
    padding: 16,
    background: "#e4e4e7",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
  },
  doneButton: {
    border: 0,
    borderRadius: 16,
    padding: 16,
    background: "#2563eb",
    color: "white",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #e4e4e7",
    fontWeight: 800,
  },
  historyHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  csvButton: {
    border: 0,
    borderRadius: 999,
    padding: "8px 12px",
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 900,
    cursor: "pointer",
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    background: "#18181b",
    marginBottom: 8,
  },
};
